import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { predictRestockUrgency, getGeminiApiKey } from '@/lib/gemini-service'

export async function GET(request: NextRequest) {
  try {
    const daysWindow = 7
    const sinceDate = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000)

    // 1. Ambil produk yang mengaktifkan manageStock
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            digitalAccounts: { where: { status: 'AVAILABLE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // 2. Ambil total terjual per produk selama 7 hari terakhir
    const recentSoldItems = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          status: 'COMPLETED',
          createdAt: { gte: sinceDate },
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    })

    const salesMap: Record<string, number> = {}
    recentSoldItems.forEach((item) => {
      salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity
    })

    const payload = products.map((p) => {
      const liveStock = p.manageStock ? p._count.digitalAccounts : p.stock
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: liveStock,
        manageStock: p.manageStock,
        soldCount: salesMap[p.id] || 0,
        daysWindow,
      }
    })

    const apiKey = await getGeminiApiKey()
    const prediction = await predictRestockUrgency(payload, apiKey)

    return NextResponse.json({
      success: true,
      daysWindow,
      totalManagedProducts: payload.filter((p) => p.manageStock).length,
      ...prediction,
    })
  } catch (error: any) {
    console.error('Restock Predictor Error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses prediksi stok' },
      { status: 500 }
    )
  }
}
