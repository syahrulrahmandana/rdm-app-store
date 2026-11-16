import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateBusinessAdvisor, getGeminiApiKey } from '@/lib/gemini-service'
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
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const groupBy = searchParams.get('groupBy') || 'day'

    const where: any = { status: 'COMPLETED' }

    let periodLabel = 'Hari Ini'
    if (!dateFrom && !dateTo) {
      const now = new Date()
      if (groupBy === 'day') {
        where.createdAt = {
          gte: getWIBStartOfDay(now),
          lte: getWIBEndOfDay(now),
        }
        periodLabel = 'Hari Ini (WIB)'
      } else if (groupBy === 'week') {
        where.createdAt = {
          gte: getWIBStartOfWeek(now),
          lte: getWIBEndOfWeek(now),
        }
        periodLabel = 'Minggu Ini'
      } else if (groupBy === 'month') {
        where.createdAt = {
          gte: getWIBStartOfMonth(now),
          lte: getWIBEndOfMonth(now),
        }
        periodLabel = 'Bulan Ini'
      }
    } else {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = parseWIBDateStart(dateFrom)
      if (dateTo) where.createdAt.lte = parseWIBDateEnd(dateTo)
      periodLabel = `${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, buyPrice: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = transactions.length
    const totalItems = transactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0)

    let totalCapital = 0
    let totalProfit = 0
    const productSales: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {}

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const itemHpp =
          typeof item.buyPrice === 'number' && item.buyPrice > 0
            ? item.buyPrice
            : item.product?.buyPrice || 0
        const profit = (item.price - itemHpp) * item.quantity
        totalCapital += itemHpp * item.quantity
        totalProfit += profit

        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0, profit: 0 }
        }
        productSales[item.productId].quantity += item.quantity
        productSales[item.productId].revenue += item.subtotal
        productSales[item.productId].profit += profit
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const paymentMethodsMap: Record<string, { method: string; count: number; total: number }> = {}
    transactions.forEach((tx) => {
      if (!paymentMethodsMap[tx.paymentMethod]) {
        paymentMethodsMap[tx.paymentMethod] = { method: tx.paymentMethod, count: 0, total: 0 }
      }
      paymentMethodsMap[tx.paymentMethod].count += 1
      paymentMethodsMap[tx.paymentMethod].total += tx.total
    })

    const profitMargin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0

    const apiKey = await getGeminiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API Key belum disetel di pengaturan toko.' },
        { status: 400 }
      )
    }

    const advisor = await generateBusinessAdvisor(
      {
        periodLabel,
        totalSales,
        totalProfit,
        profitMargin,
        totalTransactions,
        totalItems,
        totalCapital,
        topProducts,
        paymentMethods: Object.values(paymentMethodsMap),
      },
      apiKey
    )

    if (!advisor) {
      return NextResponse.json(
        { error: 'Gagal menghasilkan analisis bisnis dengan Gemini AI.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      periodLabel,
      metrics: {
        totalSales,
        totalProfit,
        profitMargin,
        totalTransactions,
        totalItems,
        totalCapital,
      },
      advisor,
    })
  } catch (error: any) {
    console.error('Business Advisor Error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses analisis bisnis' },
      { status: 500 }
    )
  }
}
