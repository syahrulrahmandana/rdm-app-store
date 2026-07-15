import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfPeriod = new Date(now)
    startOfPeriod.setDate(startOfPeriod.getDate() - period)

    // Today's stats
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startOfToday },
        status: 'COMPLETED',
      },
    })

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0)

    // Total products
    const totalProducts = await prisma.product.count({ where: { isActive: true } })

    // Low stock products
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.product.fields?.minStock as any || 0 },
      },
    })

    // Get all products and filter low stock in JS
    const allProducts = await prisma.product.findMany({ where: { isActive: true } })
    const lowStockList = allProducts
      .filter((p) => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        sku: p.sku,
      }))

    // Total customers
    const totalCustomers = await prisma.customer.count()

    // Sales chart data
    const periodTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startOfPeriod },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' },
    })

    const salesByDay: Record<string, { total: number; count: number }> = {}
    for (let i = 0; i < period; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - (period - 1 - i))
      const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      salesByDay[key] = { total: 0, count: 0 }
    }

    periodTransactions.forEach((t) => {
      const key = new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
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

    // Top products
    const topProductsData = await prisma.transactionItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    const topProducts = topProductsData.map((p) => ({
      name: p.productName,
      sold: p._sum.quantity || 0,
      revenue: p._sum.subtotal || 0,
    }))

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    })

    // Payment method stats
    const paymentStats = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: { status: 'COMPLETED', createdAt: { gte: startOfPeriod } },
      _count: true,
      _sum: { total: true },
    })

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
