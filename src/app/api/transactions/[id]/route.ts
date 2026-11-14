import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        user: { select: { name: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status harus diisi' }, { status: 400 })
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        customer: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Status transaksi berhasil diubah menjadi ${status}`,
      transaction: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
  }
}
