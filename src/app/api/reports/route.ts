import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || '' // sales, profit, stock, purchase
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month

    const where: any = { status: 'COMPLETED' }

    if (!dateFrom && !dateTo) {
      const now = new Date()
      if (groupBy === 'day') {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setHours(23, 59, 59, 999)
        where.createdAt = { gte: start, lte: end }
      } else if (groupBy === 'week') {
        const start = new Date(now)
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)

        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        where.createdAt = { gte: start, lte: end }
      } else if (groupBy === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        start.setHours(0, 0, 0, 0)

        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        where.createdAt = { gte: start, lte: end }
      }
    } else {
      if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) }
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt = { ...where.createdAt, lte: end }
      }
    }

    if (type === 'sales' || type === '' ) {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true, buyPrice: true, sellPrice: true } } } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Group by date
      const grouped: Record<string, { date: string; totalSales: number; totalProfit: number; count: number; items: number }> = {}

      transactions.forEach((tx) => {
        let dateKey: string
        const d = new Date(tx.createdAt)
        if (groupBy === 'month') {
          dateKey = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        } else if (groupBy === 'week') {
          const weekStart = new Date(d)
          weekStart.setDate(d.getDate() - d.getDay())
          dateKey = weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        } else {
          dateKey = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = { date: dateKey, totalSales: 0, totalProfit: 0, count: 0, items: 0 }
        }

        grouped[dateKey].totalSales += tx.total
        grouped[dateKey].count += 1

        tx.items.forEach((item) => {
          const profit = (item.price - (item.product?.buyPrice || 0)) * item.quantity
          grouped[dateKey].totalProfit += profit
          grouped[dateKey].items += item.quantity
        })
      })

      const summary = {
        totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
        totalTransactions: transactions.length,
        totalItems: transactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0),
        totalProfit: 0,
        totalCapital: 0,
      }

      transactions.forEach((tx) => {
        tx.items.forEach((item) => {
          const buyPrice = item.product?.buyPrice || 0
          summary.totalCapital += buyPrice * item.quantity
          summary.totalProfit += (item.price - buyPrice) * item.quantity
        })
      })

      // Top products
      const productSales: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {}
      transactions.forEach((tx) => {
        tx.items.forEach((item) => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0, profit: 0 }
          }
          productSales[item.productId].quantity += item.quantity
          productSales[item.productId].revenue += item.subtotal
          productSales[item.productId].profit += (item.price - (item.product?.buyPrice || 0)) * item.quantity
        })
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20)

      // Payment methods
      const paymentMethods: Record<string, { method: string; count: number; total: number }> = {}
      transactions.forEach((tx) => {
        if (!paymentMethods[tx.paymentMethod]) {
          paymentMethods[tx.paymentMethod] = { method: tx.paymentMethod, count: 0, total: 0 }
        }
        paymentMethods[tx.paymentMethod].count += 1
        paymentMethods[tx.paymentMethod].total += tx.total
      })

      return NextResponse.json({
        summary,
        chartData: Object.values(grouped),
        topProducts,
        paymentMethods: Object.values(paymentMethods),
        transactions: transactions.slice(0, 100).map((t) => {
          const profit = t.items.reduce((sum, item) => sum + (item.price - (item.product?.buyPrice || 0)) * item.quantity, 0)
          return {
            id: t.id,
            receiptNo: t.receiptNo,
            total: t.total,
            profit,
            paymentMethod: t.paymentMethod,
            itemCount: t.items.reduce((sum, item) => sum + item.quantity, 0), // Use total quantity of all items
            userName: t.user.name,
            createdAt: t.createdAt,
          }
        }),
      })
    }

    if (type === 'stock') {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { stock: 'asc' },
      })

      const movements = await prisma.stockMovement.findMany({
        where: where.createdAt ? { createdAt: where.createdAt } : {},
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0)
      const totalSellValue = products.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0)
      const lowStock = products.filter((p) => p.stock <= p.minStock).length
      const outOfStock = products.filter((p) => p.stock <= 0).length

      return NextResponse.json({
        summary: { totalProducts: products.length, totalStockValue, totalSellValue, lowStock, outOfStock },
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          minStock: p.minStock,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          stockValue: p.stock * p.buyPrice,
          category: p.category?.name || '-',
        })),
        movements,
      })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
  }
}
