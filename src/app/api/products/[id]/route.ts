import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updatedBuyPrice = parseFloat(body.buyPrice) || 0

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode || null,
        categoryId: body.categoryId || null,
        buyPrice: updatedBuyPrice,
        sellPrice: parseFloat(body.sellPrice) || 0,
        stock: parseInt(body.stock) ?? undefined,
        minStock: parseInt(body.minStock) || 5,
        unit: body.unit || 'pcs',
        image: body.image || null,
        snk: body.snk !== undefined ? (body.snk ? String(body.snk).trim() : null) : undefined,
        isActive: body.isActive ?? true,
        manageStock: body.manageStock ?? true,
      },
      include: { category: true },
    })

    // Jika harga beli diisi (misal produk baru dari bot yang modalnya baru disetel),
    // hanya isi transaksi produk ini yang HPP-nya masih 0 (belum pernah dikunci).
    // Transaksi lama yang sudah punya modal terkunci TIDAK AKAN diubah!
    if (updatedBuyPrice > 0) {
      await prisma.transactionItem.updateMany({
        where: {
          productId: id,
          buyPrice: 0,
        },
        data: {
          buyPrice: updatedBuyPrice,
        },
      })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU atau barcode sudah digunakan' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
