import { NextRequest, NextResponse } from 'next/server'
import { parseAccountsWithGemini, getGeminiApiKey } from '@/lib/gemini-service'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawText, productId, productName } = body

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Teks mentah akun dari supplier tidak boleh kosong' },
        { status: 400 }
      )
    }

    let finalProductName = productName || ''
    if (!finalProductName && productId) {
      const prod = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      })
      if (prod) finalProductName = prod.name
    }

    const apiKey = await getGeminiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API Key belum disetel di pengaturan toko.' },
        { status: 400 }
      )
    }

    const result = await parseAccountsWithGemini(rawText, finalProductName, apiKey)

    if (!result || !result.accounts.length) {
      return NextResponse.json(
        { error: 'AI tidak dapat mendeteksi akun valid dari teks yang diberikan. Pastikan ada data email/password.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      productName: finalProductName,
      accounts: result.accounts,
      totalCount: result.totalCount,
    })
  } catch (error: any) {
    console.error('AI Parse Accounts Error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses parsing akun dengan AI' },
      { status: 500 }
    )
  }
}
