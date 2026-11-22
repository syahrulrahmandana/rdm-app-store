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
1. Perhatikan DURASI secara SANGAT KETAT dan DINAMIS (Mendukung Format ID & EN):
   - Hari: "7day" / "7days" / "7hari" / "7 hari" / "seminggu" = 7 Hari. HANYA COCOKKAN ke varian 7 Hari!
   - 14 Hari: "14day" / "14days" / "14hari" / "14 hari" / "2 minggu" = 14 Hari. HANYA COCOKKAN ke varian 14 Hari!
   - 3 Hari: "3day" / "3days" / "3hari" / "3 hari" = 3 Hari.
   - Bulan: "sebulan" = "1 bulan" = "30 hari" = "1b" = "1bln" = "30hari" = "1m" = "1month" = 1 Bulan.
   - Multi Bulan: "2 bulan" / "2m", "3 bulan" / "3m", "6 bulan" / "6m" = Cocokkan ke durasi bulan yang tepat (3 bulan != 1 bulan!).
   - Tahun: "setahun" = "1 tahun" = "12 bulan" = "1th" = "1thn" = "365 hari" = "1y" = "1year" = 1 Tahun.
   - JANGAN SEKALI-KALI mencocokkan "7 day / 7 hari" ke varian "14 day" atau "1 bulan"!
   - JANGAN SEKALI-KALI mencocokkan "14 day / 14 hari" ke varian "7 day" atau "1 bulan"!
   - JANGAN SEKALI-KALI tertukar antara "1 tahun / setahun" dengan "1 bulan"!
2. Perhatikan VARIAN & TIPE DEVICE:
   - "tv" / "tv only" / "smart tv" = Varian TV / Private TV
   - "mobile" / "hp" = Varian Mobile
   - "alldev" / "all device" = Varian Semua Device
   - "yt" / "yutub" = YouTube
   - "famplan" = Family Plan / Fam
   - "indplan" = Individu / Individual Plan
   - "am" = Alight Motion (JANGAN cocokkan "am" di dalam kata "famplan" ke Alight Motion!)
   - "capcut" / "cpct" = CapCut
   - "gpt" / "chatgpt" = ChatGPT
   - "1p1u" = 1 Profil 1 User / Private
   - "sharing" / "share" = Akun sharing bersama
   - "private" / "priv" = Akun private
3. Perhatikan NOMINAL HARGA:
   - Jika di catatan / bukti transfer ada nominal uang (misal Rp 8.500 atau 8.5k atau 8500), prioritaskan produk yang harga jualnya cocok atau paling mendekati nominal tersebut.
4. Kembalikan HANYA format JSON valid tanpa markdown tambahan:
{
  "matchedId": "string ID produk yang cocok, atau null jika tidak ada yang cocok",
  "confidence": 0.95,
  "reasoning": "penjelasan singkat mengapa produk ini dipilih"
}`

    // Model candidate list: model Gemini Flash terbaru
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ]

    for (const modelName of candidateModels) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4500) // Timeout 4.5 detik per model

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`

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
          const errDetail = await response.text()
          console.warn(`[Gemini Matcher] Model ${modelName} returned HTTP ${response.status}: ${errDetail}`)
          continue // Coba model berikutnya
        }

        const data = await response.json()
        const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!contentText) continue

        const parsed = JSON.parse(contentText)
        if (!parsed || !parsed.matchedId) {
          continue
        }

        const matched = products.find((p) => p.id === parsed.matchedId)
        if (!matched) continue

        return {
          matchedProduct: matched,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          reasoning: parsed.reasoning || `Matched by Gemini AI (${modelName})`,
        }
      } catch (err: any) {
        clearTimeout(timeoutId)
        console.warn(`[Gemini Matcher] Failed with model ${modelName}:`, err.message || err)
      }
    }

    return null
  } catch (error: any) {
    console.warn('[Gemini Matcher Error]:', error.message || error)
    return null
  }
}

export interface PaymentAnalysis {
  isValidProof: boolean
  amount: number | null
  sourceMethod: string | null // GOPAY, DANA, BCA, BRI, MANDIRI, BNI, OVO, SHOPEEPAY, SEABANK, dsb
  destinationType: string | null // QRIS, BANK_TRANSFER, EWALLET
  destinationName: string | null
  status: string // BERHASIL, MENUNGGU, GAGAL
  senderName?: string | null
  notes?: string | null
  confidence: number
  summary: string // Misal: "GOPAY ➔ QRIS (RULLHHH DIGITAL MARKET)"
}

/**
 * Gemini Vision Payment Proof Analyzer
 * Membaca gambar bukti transfer untuk mengekstrak nominal, metode asal (DANA/BCA/GoPay),
 * dan tujuan transfer (QRIS/Rekening Toko).
 */
export async function analyzePaymentProofWithGemini(
  imageBase64: string,
  apiKey: string
): Promise<PaymentAnalysis | null> {
  if (!apiKey || !apiKey.trim() || !imageBase64 || !imageBase64.trim()) {
    return null
  }

  const prompt = `Anda adalah asisten AI kasir toko digital yang bertugas menganalisis gambar bukti transfer pembayaran.
Tolong baca dan ekstrak data dari gambar struk/bukti transfer ini dengan sangat teliti:

Ekstrak informasi dalam format JSON persis seperti ini:
{
  "isValidProof": true,
  "amount": 8500,
  "sourceMethod": "GOPAY",
  "destinationType": "QRIS",
  "destinationName": "RULLHHH DIGITAL MARKET",
  "status": "BERHASIL",
  "senderName": "nama pengirim jika ada",
  "notes": "catatan jika ada di struk",
  "confidence": 0.95
}

Keterangan aturan:
- isValidProof: true jika ini adalah gambar bukti transfer / struk pembayaran bank/e-wallet asli, false jika bukan.
- amount: angka murni nominal uang yang berhasil dibayar/ditransfer (tanpa Rp atau titik).
- sourceMethod: Bank atau E-Wallet asal pengirim (DANA, GOPAY, OVO, SHOPEEPAY, BCA, BRI, MANDIRI, BNI, SEABANK, BANK_TRANSFER, atau LAINNYA).
- destinationType: QRIS, BANK_TRANSFER, atau EWALLET.
- destinationName: Nama merchant / toko / rekening penerima (misal "RULLHHH DIGITAL MARKET").
- status: BERHASIL, MENUNGGU, atau GAGAL.`

  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ]

  for (const modelName of candidateModels) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6500)

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                { text: prompt },
              ],
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
        continue
      }

      const data = await response.json()
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!contentText) continue

      const parsed = JSON.parse(contentText)
      if (!parsed || typeof parsed !== 'object') continue

      const source = (parsed.sourceMethod || 'LAINNYA').toUpperCase()
      const destType = (parsed.destinationType || 'QRIS').toUpperCase()
      const destName = parsed.destinationName ? ` (${parsed.destinationName})` : ''
      const summary = `${source} ➔ ${destType}${destName}`

      return {
        isValidProof: Boolean(parsed.isValidProof),
        amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : null,
        sourceMethod: source,
        destinationType: destType,
        destinationName: parsed.destinationName || null,
        status: parsed.status || 'BERHASIL',
        senderName: parsed.senderName || null,
        notes: parsed.notes || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
        summary,
      }
    } catch (e) {
      clearTimeout(timeoutId)
    }
  }

  return null
}

/**
 * Helper: Parse teks respon AI / OCR menjadi objek PaymentAnalysis terstruktur
 */
function parseOCRText(raw: string): PaymentAnalysis | null {
  if (!raw || !raw.trim()) return null
  const text = raw.replace(/-=-n--/g, '\n')

  // 1. Coba deteksi jika respon mengandung format JSON
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.amount || parsed.sourceMethod) {
        const source = (parsed.sourceMethod || 'LAINNYA').toUpperCase()
        const destType = (parsed.destinationType || 'QRIS').toUpperCase()
        const destName = parsed.destinationName ? ` (${parsed.destinationName})` : ''
        const summary = `${source} ➔ ${destType}${destName} (GPT-4o)`
        return {
          isValidProof: parsed.isValidProof ?? true,
          amount:
            typeof parsed.amount === 'number'
              ? parsed.amount
              : parseInt(String(parsed.amount).replace(/\D/g, ''), 10) || null,
          sourceMethod: source,
          destinationType: destType,
          destinationName: parsed.destinationName || null,
          status: (parsed.status || 'BERHASIL').toUpperCase(),
          senderName: parsed.senderName || null,
          notes: parsed.notes || null,
          confidence: 0.95,
          summary,
        }
      }
    }
  } catch (e) {}

  // 2. Parser teks berbasis Regex (Mendukung respon point/markdown dari model AI)
  let amount: number | null = null
  const amtMatch =
    text.match(
      /(?:nominal|jumlah|total|sebesar|transfer)[^\d\n\r]*?(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,8})/i
    ) || text.match(/(?:rp\.?\s*)(\d{1,3}(?:\.\d{3})+|\d{4,8})/i)
  if (amtMatch) {
    amount = parseInt(amtMatch[1].replace(/\./g, ''), 10)
  }

  let sourceMethod = 'LAINNYA'
  const lower = text.toLowerCase()
  if (lower.includes('gopay')) sourceMethod = 'GOPAY'
  else if (lower.includes('dana')) sourceMethod = 'DANA'
  else if (lower.includes('ovo')) sourceMethod = 'OVO'
  else if (lower.includes('shopeepay') || lower.includes('spay')) sourceMethod = 'SHOPEEPAY'
  else if (lower.includes('bca')) sourceMethod = 'BCA'
  else if (lower.includes('bri')) sourceMethod = 'BRI'
  else if (lower.includes('mandiri')) sourceMethod = 'MANDIRI'
  else if (lower.includes('bni')) sourceMethod = 'BNI'
  else if (lower.includes('seabank')) sourceMethod = 'SEABANK'

  let destinationName: string | null = null
  const destMatch = text.match(
    /(?:penerima|merchant|toko|rekening tujuan)[^\:\n]*?\:\s*\*?([^\*\n\r]+)/i
  )
  if (destMatch) {
    destinationName = destMatch[1].replace(/[*_~`]/g, '').trim()
  }

  let status = 'BERHASIL'
  if (/gagal|dibatalkan|kadaluarsa|failed/i.test(text)) status = 'GAGAL'
  else if (/menunggu|pending|diproses/i.test(text)) status = 'MENUNGGU'

  const destType = 'QRIS'
  const destName = destinationName ? ` (${destinationName})` : ''
  const summary = `${sourceMethod} ➔ ${destType}${destName} (GPT-4o)`

  return {
    isValidProof: Boolean(amount || sourceMethod !== 'LAINNYA'),
    amount,
    sourceMethod,
    destinationType: destType,
    destinationName: destinationName || 'RULLHHH DIGITAL MARKET',
    status,
    senderName: null,
    notes: null,
    confidence: 0.95,
    summary,
  }
}

/**
 * OpenAI GPT-4o-Mini Text & Vision AI Analyzer via ONLym-Api
 * Mengunggah gambar ke temporary host lalu menganalisis bukti struk dengan model GPT-4o-Mini
 */
export async function analyzePaymentProofWithGPT4oMini(
  imageBase64: string,
  apiKey?: string | null
): Promise<PaymentAnalysis | null> {
  const finalApiKey = apiKey?.trim() || process.env.ONLYM_API_KEY || 'ONLym-ad4f16'
  if (!imageBase64 || !imageBase64.trim()) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 7500) // Timeout 7.5 detik

  try {
    // 1. Upload buffer gambar ke tmpfiles.org untuk mendapatkan direct public URL
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'proof.jpg')

    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!uploadRes.ok) {
      clearTimeout(timeoutId)
      return null
    }

    const uploadData = await uploadRes.json()
    const rawUrl = uploadData?.data?.url
    if (!rawUrl) {
      clearTimeout(timeoutId)
      return null
    }

    const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')

    // 2. Kirim URL gambar ke endpoint GPT-4o-Mini
    const prompt =
      'Tolong analisis gambar struk bukti transfer pembayaran ini secara akurat. ' +
      'Ekstrak: 1. Nama Bank/E-Wallet asal, 2. Nominal Transfer, 3. Nama Penerima, 4. Status Transaksi.'

    const apiUrl = `https://onlym.my.id/ai/gpt-4o-mini?q=${encodeURIComponent(
      prompt
    )}&url=${encodeURIComponent(directUrl)}&apikey=${encodeURIComponent(finalApiKey)}`

    const aiRes = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!aiRes.ok) return null

    const aiData = await aiRes.json()
    if (!aiData?.status || !aiData?.result) return null

    const parsed = parseOCRText(aiData.result)
    return parsed
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn('[GPT-4o-Mini Vision Error]:', err.message || err)
    return null
  }
}

/**
 * Multi-Engine AI Payment Proof Analyzer
 * Mencoba GPT-4o-Mini (ONLym API) terlebih dahulu, lalu otomatis beralih ke Gemini Vision jika gagal.
 */
export async function analyzePaymentProofWithAI(
  imageBase64: string,
  geminiApiKey?: string | null,
  onlymApiKey?: string | null
): Promise<PaymentAnalysis | null> {
  if (!imageBase64 || !imageBase64.trim()) return null

  // Engine 1: GPT-4o-Mini Vision via ONLym
  try {
    const gptResult = await analyzePaymentProofWithGPT4oMini(imageBase64, onlymApiKey)
    if (gptResult && gptResult.isValidProof && gptResult.amount) {
      console.log(
        `[AI Vision Engine: GPT-4o-Mini] Sukses membaca struk: ${gptResult.summary} (Nominal: Rp ${gptResult.amount})`
      )
      return gptResult
    }
  } catch (err: any) {
    console.warn('[GPT-4o-Mini Failed, Fallback to Gemini]:', err.message || err)
  }

  // Engine 2: Google Gemini Flash Vision
  if (geminiApiKey && geminiApiKey.trim()) {
    try {
      const geminiResult = await analyzePaymentProofWithGemini(imageBase64, geminiApiKey)
      if (geminiResult && geminiResult.isValidProof) {
        console.log(
          `[AI Vision Engine: Gemini Flash] Sukses membaca struk: ${geminiResult.summary} (Nominal: Rp ${geminiResult.amount})`
        )
        return geminiResult
      }
    } catch (gErr: any) {
      console.warn('[Gemini Vision Failed]:', gErr.message || gErr)
    }
  }

  return null
}
