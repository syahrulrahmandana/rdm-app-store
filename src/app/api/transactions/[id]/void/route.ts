import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason, userId } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Alasan pembatalan harus diisi' },
        { status: 400 }
      )
    }

    // 1. Dapatkan transaksi dan item di dalamnya
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    if (transaction.status === 'VOIDED') {
      return NextResponse.json(
        { error: 'Transaksi sudah dibatalkan sebelumnya' },
        { status: 400 }
      )
    }

    // 2. Batalkan transaksi dalam Prisma $transaction
    await prisma.$transaction(async (tx) => {
      // Update status transaksi menjadi VOIDED dan tambahkan alasan di note
      await tx.transaction.update({
        where: { id },
        data: {
          status: 'VOIDED',
          note: transaction.note
            ? `${transaction.note} (DIBATALKAN: ${reason})`
            : `DIBATALKAN: ${reason}`,
        },
      })

      // Kembalikan stok produk dan catat di StockMovement jika manageStock = true
      for (const item of transaction.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { manageStock: true }
        })

        if (prod?.manageStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'IN', // Stok masuk kembali
              quantity: item.quantity,
              note: `Pembatalan Transaksi #${transaction.receiptNo}. Alasan: ${reason}`,
              userId: userId || transaction.userId,
            },
          })
        }
      }

      // Kurangi poin pelanggan jika ada pelanggan terkait
      if (transaction.customerId) {
        const pointsEarned = Math.floor(transaction.total / 10000)
        if (pointsEarned > 0) {
          const customer = await tx.customer.findUnique({
            where: { id: transaction.customerId },
            select: { points: true },
          })
          if (customer) {
            const newPoints = Math.max(0, customer.points - pointsEarned)
            await tx.customer.update({
              where: { id: transaction.customerId },
              data: { points: newPoints },
            })
          }
        }
      }
    })

    return NextResponse.json({ message: 'Transaksi berhasil dibatalkan' })
  } catch (error) {
    console.error('Void transaction error:', error)
    return NextResponse.json(
      { error: 'Gagal membatalkan transaksi' },
      { status: 500 }
    )
  }
}
