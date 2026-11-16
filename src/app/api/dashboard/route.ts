import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWIBStartOfDay } from '@/lib/date-wib'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')

    const now = new Date()
    const startOfToday = getWIBStartOfDay(now)
    const startOfPeriod = new Date(startOfToday.getTime() - (period - 1) * 24 * 60 * 60 * 1000)

    // Eksekusi semua query dashboard secara paralel menggunakan Promise.all untuk kecepatan maksimal
    const [
      todayTransactions,
      allProducts,
      totalCustomers,
      periodTransactions,
      topProductsData,
      recentTransactions,
      paymentStats,
    ] = await Promise.all([
      // 1. Transaksi hari ini
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: startOfToday },
          status: 'COMPLETED',
        },
      }),

      // 2. Semua produk aktif (menghitung total & stok menipis sekaligus dalam 1 query)
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          stock: true,
          minStock: true,
          sku: true,
        },
      }),

      // 3. Total pelanggan
      prisma.customer.count(),

      // 4. Transaksi periode grafik
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: startOfPeriod },
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 5. Top produk
      prisma.transactionItem.groupBy({
        by: ['productId', 'productName'],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // 6. Transaksi terbaru
      prisma.transaction.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true } } },
      }),

      // 7. Statistik metode pembayaran
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: { status: 'COMPLETED', createdAt: { gte: startOfPeriod } },
        _count: true,
        _sum: { total: true },
      }),
    ])

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0)
    const totalProducts = allProducts.length

    const lowStockList = allProducts
      .filter((p) => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)

    const salesByDay: Record<string, { total: number; count: number }> = {}
    for (let i = 0; i < period; i++) {
      const d = new Date(startOfPeriod.getTime() + i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })
      salesByDay[key] = { total: 0, count: 0 }
    }

    periodTransactions.forEach((t) => {
      const key = new Date(t.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })
      if (salesByDay[key]) {
        salesByDay[key].total += t.total
        salesByDay[key].count += 1
      }
    })

    const salesChart = Object.entries(salesByDay).map(([date, data]) => ({
      date,
      total: Math.round(data.total),
      count: data.count,
    }))

    const topProducts = topProductsData.map((p) => ({
      name: p.productName,
      sold: p._sum.quantity || 0,
      revenue: p._sum.subtotal || 0,
    }))

    const paymentMethodStats = paymentStats.map((p) => ({
      method: p.paymentMethod,
      count: p._count,
      total: p._sum.total || 0,
    }))

    return NextResponse.json({
      todaySales: todayTransactions.length,
      todayRevenue,
      todayTransactions: todayTransactions.length,
      totalProducts,
      lowStockProducts: lowStockList.length,
      totalCustomers,
      salesChart,
      topProducts,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        receiptNo: t.receiptNo,
        total: t.total,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        userName: t.user.name,
      })),
      lowStockList,
      paymentMethodStats,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
