import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getWIBStartOfDay,
  getWIBEndOfDay,
  getWIBStartOfWeek,
  getWIBEndOfWeek,
  getWIBStartOfMonth,
  getWIBEndOfMonth,
  parseWIBDateStart,
  parseWIBDateEnd,
} from '@/lib/date-wib'

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
        where.createdAt = {
          gte: getWIBStartOfDay(now),
          lte: getWIBEndOfDay(now),
        }
      } else if (groupBy === 'week') {
        where.createdAt = {
          gte: getWIBStartOfWeek(now),
          lte: getWIBEndOfWeek(now),
        }
      } else if (groupBy === 'month') {
        where.createdAt = {
          gte: getWIBStartOfMonth(now),
          lte: getWIBEndOfMonth(now),
        }
      }
    } else {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = parseWIBDateStart(dateFrom)
      if (dateTo) where.createdAt.lte = parseWIBDateEnd(dateTo)
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
          dateKey = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', month: 'long', year: 'numeric' })
        } else if (groupBy === 'week') {
          const monday = getWIBStartOfWeek(d)
          dateKey = monday.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })
        } else {
          dateKey = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' })
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = { date: dateKey, totalSales: 0, totalProfit: 0, count: 0, items: 0 }
        }

        grouped[dateKey].totalSales += tx.total
        grouped[dateKey].count += 1

        tx.items.forEach((item) => {
          const itemHpp =
            typeof item.buyPrice === 'number' && item.buyPrice > 0
              ? item.buyPrice
              : item.product?.buyPrice || 0
          const profit = (item.price - itemHpp) * item.quantity
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
          const buyPrice =
            typeof item.buyPrice === 'number' && item.buyPrice > 0
              ? item.buyPrice
              : item.product?.buyPrice || 0
          summary.totalCapital += buyPrice * item.quantity
          summary.totalProfit += (item.price - buyPrice) * item.quantity
        })
      })

      // Top products
      const productSales: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {}
      transactions.forEach((tx) => {
        tx.items.forEach((item) => {
          const itemHpp =
            typeof item.buyPrice === 'number' && item.buyPrice > 0
              ? item.buyPrice
              : item.product?.buyPrice || 0
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0, profit: 0 }
          }
          productSales[item.productId].quantity += item.quantity
          productSales[item.productId].revenue += item.subtotal
          productSales[item.productId].profit += (item.price - itemHpp) * item.quantity
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
          const profit = t.items.reduce((sum, item) => {
            const itemHpp =
              typeof item.buyPrice === 'number' && item.buyPrice > 0
                ? item.buyPrice
                : item.product?.buyPrice || 0
            return sum + (item.price - itemHpp) * item.quantity
          }, 0)
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
        include: {
          category: true,
          _count: {
            select: {
              digitalAccounts: {
                where: { status: 'AVAILABLE' },
              },
            },
          },
        },
        orderBy: [{ manageStock: 'desc' }, { stock: 'asc' }],
      })

      const movementWhere: any = {}
      if (dateFrom || dateTo) {
        movementWhere.createdAt = {}
        if (dateFrom) movementWhere.createdAt.gte = parseWIBDateStart(dateFrom)
        if (dateTo) movementWhere.createdAt.lte = parseWIBDateEnd(dateTo)
      }

      const movements = await prisma.stockMovement.findMany({
        where: movementWhere,
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      const managedProducts = products.filter((p) => p.manageStock)
      const totalDigitalAccounts = products.reduce((sum, p) => sum + (p._count?.digitalAccounts || 0), 0)
      const totalStockValue = managedProducts.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0)
      const totalSellValue = managedProducts.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0)
      const lowStock = managedProducts.filter((p) => p.stock <= p.minStock && p.stock > 0).length
      const outOfStock = managedProducts.filter((p) => p.stock <= 0).length

      return NextResponse.json({
        summary: {
          totalProducts: products.length,
          managedCount: managedProducts.length,
          totalDigitalAccounts,
          totalStockValue,
          totalSellValue,
          lowStock,
          outOfStock,
        },
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          manageStock: p.manageStock,
          availableAccounts: p._count?.digitalAccounts ?? p.stock,
          minStock: p.minStock,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          stockValue: (p.manageStock ? p.stock : 0) * p.buyPrice,
          unit: p.unit || 'unit',
          image: p.image || p.category?.image || null,
          category: p.category?.name || '-',
          categoryIcon: p.category?.icon || '📦',
          categoryColor: p.category?.color || '#3B82F6',
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
