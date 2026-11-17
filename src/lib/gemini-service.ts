import { prisma } from './db'

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const store = await prisma.store.findFirst({ select: { geminiApiKey: true } })
    if (store?.geminiApiKey && store.geminiApiKey.trim()) {
      return store.geminiApiKey.trim()
    }
  } catch (e) {}

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim()
  }

  return null
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
]

/**
 * Universal Gemini API caller with auto-fallback candidate models and abort timeout
 */
export async function callGemini(
  prompt: string,
  apiKey: string,
  jsonMode: boolean = true
): Promise<string | null> {
  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 14000)

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      }

      if (jsonMode) {
        body.generationConfig.response_mime_type = 'application/json'
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      })

      clearTimeout(timeoutId)

      if (!res.ok) continue

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text && text.trim()) return text.trim()
    } catch (e) {
      clearTimeout(timeoutId)
    }
  }

  return null
}

export interface ParsedAccountItem {
  accountData: string
  email?: string
  password?: string
  pin?: string
  notes?: string
}

/**
 * FEATURE 1: AI Smart Batch Account Parser
 * Extracts and cleans bulk unformatted supplier dumps into clean digital accounts
 */
export async function parseAccountsWithGemini(
  rawText: string,
  productName?: string,
  apiKey?: string | null
): Promise<{ accounts: ParsedAccountItem[]; totalCount: number } | null> {
  const key = apiKey || (await getGeminiApiKey())
  if (!key || !rawText || !rawText.trim()) return null

  const prompt = `Anda adalah AI parser akun digital (layanan streaming, editing, AI, VPN, dsb).
Tugas Anda: Dari teks mentah (dump) supplier berikut, ekstrak dan bersihkan SETIAP akun menjadi format terstruktur yang siap dijual.

Nama Produk / Aplikasi: "${productName || 'Akun Digital'}"
Teks Mentah dari Supplier:
"""
${rawText}
"""

Aturan Parsing:
1. Abaikan nomor urut (1., 2., [1]), tanda bullet, catatan basa-basi supplier, atau baris kosong.
2. Setiap akun WAJIB memiliki "accountData" dalam format standar gabungan pemisah pip:
   - Format: email|password (atau email|password|pin jika ada PIN).
   - Pastikan HAPUS kata label seperti "email:", "pass:", "pin:", dsb. Contoh hasil: "rullhhh@gmail.com|pass123|1234"
3. Jika terdapat informasi profil, tanggal masa aktif, atau instruksi (misal "Profil 1", "Anti-Hold", "Exp 30 hari"), simpan ke field "notes".
4. Output WAJIB JSON persis seperti ini:
{
  "accounts": [
    {
      "accountData": "email@example.com|password123|1234",
      "email": "email@example.com",
      "password": "password123",
      "pin": "1234",
      "notes": "Profil 1 (Anti-Hold)"
    }
  ],
  "totalCount": 1
}`

  const responseText = await callGemini(prompt, key, true)
  if (!responseText) return null

  try {
    const parsed = JSON.parse(responseText)
    if (Array.isArray(parsed.accounts)) {
      return {
        accounts: parsed.accounts.filter((a: any) => a.accountData && String(a.accountData).trim()),
        totalCount: parsed.accounts.length,
      }
    }
  } catch (e) {}

  return null
}

export interface BusinessAdvisorResult {
  healthStatus: 'Sangat Sehat' | 'Sehat' | 'Perlu Perhatian' | 'Kritis'
  healthScore: number
  executiveSummary: string
  strengths: string[]
  risks: string[]
  topProductInsights: string[]
  actionableStrategies: Array<{
    title: string
    action: string
    impact: 'Tinggi' | 'Sedang'
  }>
}

/**
 * FEATURE 2: AI Business Advisor
 * Analyzes financial, product, and sales velocity data to produce strategic actionable intelligence
 */
export async function generateBusinessAdvisor(
  reportData: {
    periodLabel: string
    totalSales: number
    totalProfit: number
    profitMargin: number
    totalTransactions: number
    totalItems: number
    totalCapital: number
    topProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>
    paymentMethods: Array<{ method: string; count: number; total: number }>
  },
  apiKey?: string | null
): Promise<BusinessAdvisorResult | null> {
  const key = apiKey || (await getGeminiApiKey())
  if (!key) return null

  const prompt = `Anda adalah Senior Financial & Growth Advisor untuk toko produk & akun digital "RDM APP STORE".
Tolong lakukan evaluasi mendalam dan berikan saran strategis berbasis data berbahasa Indonesia yang langsung bisa diterapkan oleh pemilik toko.

Ringkasan Finansial:
- Periode Laporan: ${reportData.periodLabel}
- Total Omset (Penjualan): Rp ${reportData.totalSales.toLocaleString('id-ID')}
- Total Laba Kotor (Profit): Rp ${reportData.totalProfit.toLocaleString('id-ID')}
- Margin Keuntungan: ${reportData.profitMargin}%
- Total Transaksi: ${reportData.totalTransactions} transaksi
- Total Item Terjual: ${reportData.totalItems} item
- Modal Keluar (HPP): Rp ${reportData.totalCapital.toLocaleString('id-ID')}

Top Produk Terlaris:
${JSON.stringify(reportData.topProducts.slice(0, 10), null, 2)}

Distribusi Metode Pembayaran:
${JSON.stringify(reportData.paymentMethods, null, 2)}

Instruksi Output JSON:
{
  "healthStatus": "Sangat Sehat",
  "healthScore": 88,
  "executiveSummary": "Penjelasan ringkas kondisi bisnis saat ini...",
  "strengths": [
    "Kekuatan utama toko...",
    "Kekuatan 2..."
  ],
  "risks": [
    "Risiko atau potensi kebocoran margin yang perlu diwaspadai..."
  ],
  "topProductInsights": [
    "Insight produk bintang dan saran bundling/upsell..."
  ],
  "actionableStrategies": [
    {
      "title": "Promo Bundling ChatGPT & Canva",
      "action": "Buat paket hemat di grup reseller untuk mendongkrak margin...",
      "impact": "Tinggi"
    }
  ]
}`

  const responseText = await callGemini(prompt, key, true)
  if (!responseText) return null

  try {
    return JSON.parse(responseText) as BusinessAdvisorResult
  } catch (e) {}

  return null
}

export interface RestockPredictionItem {
  productId: string
  productName: string
  sku: string
  currentStock: number
  manageStock: boolean
  soldLast7Days: number
  dailyBurnRate: number
  daysUntilDepleted: number
  urgency: 'CRITICAL' | 'WARNING' | 'SAFE'
  urgencyLabel: string
  recommendedRestockQty: number
  aiAdvice: string
}

/**
 * FEATURE 3: AI Smart Restock Predictor
 * Computes burn rate and predicts when stock will run out with AI recommendations
 * Now covers ALL products (both digital vault accounts and manual/standard stock items)
 */
export async function predictRestockUrgency(
  products: Array<{
    id: string
    name: string
    sku: string
    stock: number
    manageStock: boolean
    soldCount: number
    daysWindow: number
  }>,
  apiKey?: string | null
): Promise<{ items: RestockPredictionItem[]; criticalCount: number; warningCount: number } | null> {
  if (!products || !products.length) {
    return { items: [], criticalCount: 0, warningCount: 0 }
  }

  // Hitung metrik per produk (SEMUA produk, baik manageStock maupun manual/bebas stok)
  const items: RestockPredictionItem[] = products.map((p) => {
    const window = Math.max(1, p.daysWindow || 7)
    const dailyRate = Math.round((p.soldCount / window) * 10) / 10

    let days = 999
    let urgency: 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE'
    let urgencyLabel = 'Stok Aman'
    let aiAdvice = ''

    if (p.stock <= 0) {
      days = 0
      urgency = 'CRITICAL'
      if (p.soldCount > 0) {
        urgencyLabel = `🔥 Habis & Laris (${p.soldCount} Terjual)`
        aiAdvice = `Sangat mendesak! Produk ini sangat laris (${p.soldCount} pcs terjual baru-baru ini) tapi stok saat ini 0. Segera restock agar tidak kehilangan potensi omset!`
      } else {
        urgencyLabel = 'Habis (0 Stok)'
        aiAdvice = p.manageStock
          ? 'Stok brankas akun kosong! Segera masukkan akun baru ke brankas.'
          : 'Stok produk habis (0). Segera isi stok atau perbarui jumlah stok produk.'
      }
    } else if (dailyRate > 0) {
      days = Math.round((p.stock / dailyRate) * 10) / 10
      if (days <= 1.5) {
        urgency = 'CRITICAL'
        urgencyLabel = `🔥 Segera Habis (~${days} Hari)`
        aiAdvice = `Laju penjualan tinggi: ${dailyRate} unit/hari dengan sisa stok ${p.stock}. Segera restock sebelum kehabisan!`
      } else if (days <= 3.5) {
        urgency = 'WARNING'
        urgencyLabel = `Menipis (~${days} Hari)`
        aiAdvice = `Penjualan aktif (${dailyRate} unit/hari). Stok diprediksi habis dalam 2-3 hari.`
      } else if (days <= 7) {
        urgency = 'WARNING'
        urgencyLabel = `Waspada (~${days} Hari)`
        aiAdvice = `Stok tersisa untuk ~${Math.round(days)} hari ke depan. Jadwalkan restock berkala.`
      } else {
        urgency = 'SAFE'
        urgencyLabel = `Aman (~${Math.round(days)} Hari)`
        aiAdvice = `Stok aman untuk ~${Math.round(days)} hari ke depan dengan penjualan ${dailyRate} unit/hari.`
      }
    } else {
      // dailyRate === 0 (Belum ada penjualan baru di periode window)
      if (p.stock <= 3) {
        urgency = 'WARNING'
        urgencyLabel = `Stok Rendah (${p.stock} Unit)`
        aiAdvice = `Stok sangat sedikit (${p.stock} unit). Persiapkan persediaan tambahan untuk antisipasi pesanan masuk.`
      } else {
        urgency = 'SAFE'
        urgencyLabel = `Aman (${p.stock} Tersedia)`
        aiAdvice = `Stok aman (${p.stock} unit). Belum ada penjualan baru dalam ${window} hari terakhir.`
      }
    }

    const safeRate = dailyRate > 0 ? dailyRate : 0.5
    const recommendedRestock = Math.max(10, Math.ceil(safeRate * 14))

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      currentStock: p.stock,
      manageStock: p.manageStock,
      soldLast7Days: p.soldCount,
      dailyBurnRate: dailyRate,
      daysUntilDepleted: days,
      urgency,
      urgencyLabel,
      recommendedRestockQty: recommendedRestock,
      aiAdvice,
    }
  })

  // URUTAN PRIORITAS CERDAS:
  // Produk yang PALING LARIS dan SEGERA BUTUH STOK (stok habis / menipis) SELALU DITAMPILKAN DI PALING ATAS!
  items.sort((a, b) => {
    function getTier(x: RestockPredictionItem) {
      // Tier 1: Habis / Segera Habis (< 1.5 hari) DAN Laris (ada penjualan aktif) -> PRIORITAS TERTINGGI!
      if (x.urgency === 'CRITICAL' && x.soldLast7Days > 0) return 1
      // Tier 2: Menipis (2-7 hari) DAN Laris (ada penjualan aktif)
      if (x.urgency === 'WARNING' && x.soldLast7Days > 0) return 2
      // Tier 3: Aman (> 7 hari) tapi ada penjualan aktif
      if (x.urgency === 'SAFE' && x.soldLast7Days > 0) return 3
      // Tier 4: Habis (0 stok), tapi belum ada penjualan baru dalam 7 hari terakhir (dormant)
      if (x.urgency === 'CRITICAL' && x.soldLast7Days === 0) return 4
      // Tier 5: Stok menipis, tapi belum ada penjualan
      if (x.urgency === 'WARNING' && x.soldLast7Days === 0) return 5
      // Tier 6: Aman, belum ada penjualan
      return 6
    }

    const tierA = getTier(a)
    const tierB = getTier(b)

    if (tierA !== tierB) {
      return tierA - tierB
    }

    // Tier 1 (Habis & Laris): Urutkan dari yang PALING BANYAK TERJUAL (terlaris paling atas)
    if (tierA === 1) {
      if (b.soldLast7Days !== a.soldLast7Days) {
        return b.soldLast7Days - a.soldLast7Days
      }
      return b.dailyBurnRate - a.dailyBurnRate
    }

    // Tier 2 (Menipis & Laris): Urutkan dari sisa hari tercepat, lalu penjualan terbanyak
    if (tierA === 2) {
      if (a.daysUntilDepleted !== b.daysUntilDepleted) {
        return a.daysUntilDepleted - b.daysUntilDepleted
      }
      return b.soldLast7Days - a.soldLast7Days
    }

    // Tier 3 (Aman & Laris): Penjualan terbanyak
    if (tierA === 3) {
      return b.soldLast7Days - a.soldLast7Days
    }

    // Tier 4 (Habis tapi 0 penjualan 7 hari): Urutkan A-Z
    if (tierA === 4) {
      return a.productName.localeCompare(b.productName)
    }

    return a.productName.localeCompare(b.productName)
  })

  const criticalCount = items.filter((i) => i.urgency === 'CRITICAL').length
  const warningCount = items.filter((i) => i.urgency === 'WARNING').length

  return { items, criticalCount, warningCount }
}
