import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.company || !body.name) {
      return NextResponse.json({ error: 'Nama perusahaan dan perwakilan wajib diisi' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name,
        company: body.company,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Supplier PUT error:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Note: To delete supplier safely, we check if there are purchases referencing it.
    // In our schema: Purchase has supplierId relation.
    // Let's delete referencing purchase items and purchases first, or set them to null.
    // Let's delete purchase items first
    const purchases = await prisma.purchase.findMany({
      where: { supplierId: id },
      select: { id: true },
    })
    const purchaseIds = purchases.map((p) => p.id)

    await prisma.purchaseItem.deleteMany({
      where: { purchaseId: { in: purchaseIds } },
    })

    await prisma.purchase.deleteMany({
      where: { supplierId: id },
    })

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Supplier DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
