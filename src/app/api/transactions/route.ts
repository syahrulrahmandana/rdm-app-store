import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReceiptNo } from '@/lib/utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statusParam = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const paymentMethod = searchParams.get('paymentMethod')

    const where: any = {}
    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam
    } else if (!statusParam) {
      where.status = 'COMPLETED'
    }

    if (search) {
      where.OR = [
        { receiptNo: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { note: { contains: search } },
      ]
    }

    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) }
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      where.createdAt = { ...where.createdAt, lte: endDate }
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true, sku: true } } } },
          user: { select: { name: true } },
          customer: { select: { name: true } },
          digitalAccounts: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Transactions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const productIds = body.items.map((i: any) => i.productId).filter(Boolean)

    // Ambil data store prefix dan snapshot produk secara paralel
    const [store, dbProducts] = await Promise.all([
      prisma.store.findFirst({ select: { receiptPrefix: true } }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, buyPrice: true, manageStock: true },
      }),
    ])

    const receiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')
    const productMap = new Map(dbProducts.map((p) => [p.id, p]))

    // Pastikan userId valid dan terdaftar di database (mencegah error Foreign Key 'system' saat session browser loading)
    let validUserId = body.userId
    let userExists = null
    if (validUserId && validUserId !== 'system') {
      userExists = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      })
    }

    if (!userExists) {
      try {
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
          userExists = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
          })
        }
      } catch (e) { }
    }

    if (!userExists) {
      const defaultUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { role: 'asc' },
        select: { id: true },
      })
      validUserId = defaultUser?.id
    } else {
      validUserId = userExists.id
    }

    if (!validUserId) {
      return NextResponse.json({ error: 'Tidak ditemukan user aktif untuk mencatat transaksi' }, { status: 400 })
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        receiptNo,
        userId: validUserId,
        customerId: body.customerId || null,
        subtotal: body.subtotal,
        discount: body.discount || 0,
        discountType: body.discountType || 'nominal',
        tax: body.tax || 0,
        total: body.total,
        paymentMethod: body.paymentMethod || 'CASH',
        paymentAmount: body.paymentAmount,
        changeAmount: body.changeAmount || 0,
        note: body.note || null,
        status: 'COMPLETED',
        items: {
          create: body.items.map((item: any) => {
            const currentBuyPrice =
              productMap.get(item.productId)?.buyPrice ??
              (typeof item.buyPrice === 'number' ? item.buyPrice : 0)
            return {
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity,
              price: item.price,
              buyPrice: currentBuyPrice, // Snapshot HPP terkunci di detik transaksi
              discount: item.discount || 0,
              subtotal: (item.price - (item.discount || 0)) * item.quantity,
            }
          }),
        },
      },
      include: {
        items: true,
        user: { select: { name: true } },
        customer: { select: { name: true } },
      },
    })

    // Update stock for each item
    for (const item of body.items) {
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { manageStock: true }
      })

      if (prod?.manageStock) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })

        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            note: `Penjualan #${receiptNo}`,
            reference: transaction.id,
            userId: validUserId,
          },
        })
      }
    }

    // Add customer points
    if (body.customerId) {
      const pointsEarned = Math.floor(body.total / 10000)
      if (pointsEarned > 0) {
        await prisma.customer.update({
          where: { id: body.customerId },
          data: { points: { increment: pointsEarned } },
        })
      }
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Transaction POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
