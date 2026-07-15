import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Nama pelanggan wajib diisi' }, { status: 400 })
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        points: parseInt(body.points) || 0,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Customer PUT error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Note: If you want soft delete, you can add a field in model, but model Customer doesn't have isActive.
    // So we do a hard delete. First, we need to check if there are transactions referencing this customer.
    // Let's set customerId to null in referencing transactions, or handle cascade.
    // In our schema: customer Relation has fields: [customerId], references: [id]
    // Let's set customerId to null on referencing transactions first, then delete customer.
    await prisma.transaction.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    })

    await prisma.customerDebt.deleteMany({
      where: { customerId: id }
    })

    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
