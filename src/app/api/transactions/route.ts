import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReceiptNo } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const paymentMethod = searchParams.get('paymentMethod')

    const where: any = { status: 'COMPLETED' }

    if (search) {
      where.receiptNo = { contains: search }
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
    const store = await prisma.store.findFirst()
    const receiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        receiptNo,
        userId: body.userId,
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
          create: body.items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            subtotal: (item.price - (item.discount || 0)) * item.quantity,
          })),
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
            userId: body.userId,
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
