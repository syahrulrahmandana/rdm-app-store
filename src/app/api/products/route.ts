import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortDir = searchParams.get('sortDir') || 'desc'

    const where: any = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode || null,
        categoryId: body.categoryId || null,
        buyPrice: parseFloat(body.buyPrice) || 0,
        sellPrice: parseFloat(body.sellPrice) || 0,
        stock: parseInt(body.stock) || 0,
        minStock: parseInt(body.minStock) || 5,
        unit: body.unit || 'pcs',
        image: body.image || null,
        manageStock: body.manageStock !== undefined ? body.manageStock : true,
      },
      include: { category: true },
    })

    // Create stock movement for initial stock
    if (product.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: product.stock,
          note: 'Stok awal produk',
          userId: body.userId || 'system',
        },
      })
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Products POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU atau barcode sudah digunakan' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
