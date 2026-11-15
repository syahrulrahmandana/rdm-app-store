/**
 * Gemini AI Product Matcher
 * Uses Gemini Flash to intelligently parse customer/admin notes and match them
 * with the exact catalog product (understanding synonyms, duration, typos, and variants).
 */

export interface ProductCandidate {
  id: string
  name: string
  sellPrice: number
  category?: string | null
}

export interface MatchResult {
  matchedProduct: ProductCandidate | null
  confidence: number
  reasoning: string
}

export async function predictProductWithGemini(
  note: string,
  products: ProductCandidate[],
  apiKey?: string | null,
  isReseller: boolean = false
): Promise<MatchResult | null> {
  if (!apiKey || !apiKey.trim() || !note || !note.trim() || !products.length) {
    return null
  }

  try {
    // Saring kandidat produk untuk menghemat token dan meningkatkan akurasi
    const candidatesList = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.sellPrice,
      category: p.category || '-',
    }))

    const prompt = `Anda adalah asisten AI toko digital premium (akun streaming, aplikasi editing, voucher).
Tugas Anda: Dari catatan pesanan berikut, tentukan ID produk yang PALING COCOK dari daftar katalog toko.

CATATAN PESANAN DARI CHAT WA:
"${note}"
${isReseller ? '(Pesanan ini dari grup reseller)' : ''}

DAFTAR KATALOG PRODUK TOKO:
${JSON.stringify(candidatesList, null, 2)}

ATURAN WAJIB:
1. Perhatikan DURASI secara cermat:
   - "1 bulan" = "30 hari" = "1b" = "1bln" = "30hari"
   - "2 bulan" = "60 hari" = "2b" = "2bln"
   - "7 hari" = "1 minggu" = "1mgg" = "7hari"
   - "1 tahun" = "12 bulan" = "1th" = "1thn" = "365 hari"
   JANGAN tertukar antara "1 bulan" (30 hari) dengan "7 hari" (1 minggu)!
2. Perhatikan VARIAN & SINGKATAN:
   - "yt" / "yutub" = YouTube
   - "famplan" = Family Plan / Fam
   - "indplan" = Individu / Individual Plan
   - "am" = Alight Motion (JANGAN cocokkan "am" di dalam kata "famplan" ke Alight Motion!)
   - "capcut" / "cpct" = CapCut
   - "gpt" / "chatgpt" = ChatGPT
   - "1p1u" = 1 Profil 1 User / Private
   - "sharing" / "share" = Akun sharing bersama
   - "private" / "priv" = Akun private
3. Kembalikan HANYA format JSON valid tanpa markdown tambahan:
{
  "matchedId": "string ID produk yang cocok, atau null jika tidak ada yang cocok",
  "confidence": 0.95,
  "reasoning": "penjelasan singkat mengapa produk ini dipilih"
}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500) // Timeout 3.5 detik

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[Gemini Matcher] HTTP ${response.status}: ${await response.text()}`)
      return null
    }

    const data = await response.json()
    const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!contentText) return null

    const parsed = JSON.parse(contentText)
    if (!parsed || !parsed.matchedId) {
      return null
    }

    const matched = products.find((p) => p.id === parsed.matchedId)
    if (!matched) return null

    return {
      matchedProduct: matched,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      reasoning: parsed.reasoning || 'Matched by Gemini AI',
    }
  } catch (error: any) {
    console.warn('[Gemini Matcher Error]:', error.message || error)
    return null
  }
}
