import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReceiptNo } from '@/lib/utils'
import {
  predictProductWithGemini,
  analyzePaymentProofWithGemini,
  PaymentAnalysis,
} from '@/lib/gemini-matcher'

// Helper: Ekstraksi nominal harga dari teks jika ada
function extractPrice(text: string): number | null {
  if (!text) return null

  // Cek format k / rb / ribu, misal: 15k, 28k, 15rb, 28 ribu
  const kMatch = text.match(/\b(\d+)\s*(?:k|rb|ribu)\b/i)
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000
  }

  // Cek angka murni >= 1000, misal: 15000, 28000, Rp28.000, 28.000
  const numMatch = text.match(/(?:rp\.?\s*|\b)(\d{1,3}(?:\.\d{3})+|\d{4,6})\b/i)
  if (numMatch) {
    const cleaned = numMatch[1].replace(/\./g, '')
    const val = parseInt(cleaned, 10)
    if (!isNaN(val) && val >= 1000) return val
  }

  return null
}

// Helper: Deteksi metode pembayaran dari teks / note
function detectPaymentMethod(text: string): string {
  const lower = (text || '').toLowerCase()
  if (lower.includes('gopay')) return 'GOPAY'
  if (lower.includes('dana')) return 'DANA'
  if (lower.includes('ovo')) return 'OVO'
  if (lower.includes('shopee') || lower.includes('spay')) return 'EWALLET'
  if (lower.includes('bca') || lower.includes('bri') || lower.includes('mandiri') || lower.includes('tf') || lower.includes('transfer')) return 'TRANSFER'
  return 'QRIS'
}

// Helper: Normalisasi teks catatan dan durasi (Bahasa Indonesia & English)
function normalizeText(str: string): string {
  if (!str) return ''
  return str.toLowerCase()
    .replace(/[*_~`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\bse\s*tahun\b/gi, '1 tahun')
    .replace(/\bse\s*bulan\b/gi, '1 bulan')
    .replace(/\bse\s*minggu\b/gi, '1 minggu')
    .replace(/\bse\s*hari\b/gi, '1 hari')
    .replace(/\b(\d+)\s*u\s*(\d+)\s*b\b/gi, '$1u $2 bulan')
    .replace(/\b(\d+)\s*(?:tahun|thn|th|years?|yr|yrs|y)\b/gi, '$1 tahun')
    .replace(/\b(\d+)\s*(?:bulan|bln|months?|mo)\b/gi, '$1 bulan')
    .replace(/\b(\d+)\s*m\b/gi, '$1 bulan')
    .replace(/\b(\d+)\s*(?:minggu|mgg|weeks?|wk|wks|w)\b/gi, '$1 minggu')
    .replace(/\b(\d+)\s*(?:hari|hr|days?|d)\b/gi, '$1 hari')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper: Ekstraksi durasi dinamis ke dalam jumlah hari standar
function extractDurationInDays(text: string): number | null {
  if (!text) return null
  const norm = normalizeText(text)

  if (/\b(lifetime|selamanya|permanen)\b/i.test(norm)) return 99999

  const yMatch = norm.match(/\b(\d+)\s*tahun\b/i)
  if (yMatch) return parseInt(yMatch[1], 10) * 365

  const mMatch = norm.match(/\b(\d+)\s*bulan\b/i)
  if (mMatch) {
    const m = parseInt(mMatch[1], 10)
    return m === 12 ? 365 : m * 30
  }

  const wMatch = norm.match(/\b(\d+)\s*minggu\b/i)
  if (wMatch) return parseInt(wMatch[1], 10) * 7

  const dMatch = norm.match(/\b(\d+)\s*hari\b/i)
  if (dMatch) return parseInt(dMatch[1], 10)

  return null
}

// Helper: Pencocokan Cerdas Kata Kunci Produk (Mendukung Varian Reseller)
function matchProduct(
  note: string,
  price: number | null,
  products: any[],
  isReseller: boolean = false
): any | null {
  if (!products || products.length === 0) return null

  const lowerNote = normalizeText(note)

  // 1. Cari produk yang namanya persis ada di note
  for (const product of products) {
    const pName = product.name.toLowerCase()
    if (product.sku === 'WA-CUSTOM' || pName.includes('pesanan whatsapp')) continue

    if (lowerNote.includes(pName) || pName.includes(lowerNote.trim())) {
      return product
    }
  }

  // 2. Beri skor pencocokan kata kunci merek & durasi
  let bestMatch: any = null
  let highestScore = 0

  const brands = [
    { key: 'spotify', aliases: ['spotify', 'spoti', 'spot'] },
    { key: 'netflix', aliases: ['netflix', 'netf', 'nf'] },
    { key: 'canva', aliases: ['canva', 'canv'] },
    { key: 'capcut', aliases: ['capcut', 'capc', 'cp'] },
    { key: 'youtube', aliases: ['youtube', 'yt'] },
    { key: 'alight', aliases: ['alight motion', 'alight', 'am'] },
    { key: 'disney', aliases: ['disney', 'hotstar'] },
    { key: 'vidio', aliases: ['vidio'] },
    { key: 'viu', aliases: ['viu'] },
    { key: 'wetv', aliases: ['wetv'] },
    { key: 'bstation', aliases: ['bstation', 'bili'] },
    { key: 'chatgpt', aliases: ['chatgpt', 'gpt'] },
    { key: 'appmusic', aliases: ['apple music', 'appmusic'] },
    { key: 'prime', aliases: ['prime video', 'amazon prime', 'prime'] },
    { key: 'zoom', aliases: ['zoom'] },
    { key: 'picsart', aliases: ['picsart'] },
    { key: 'remini', aliases: ['remini'] },
    { key: 'getcontact', aliases: ['getcontact', 'gtc'] },
    { key: 'dramabox', aliases: ['dramabox'] },
    { key: 'iqiyi', aliases: ['iqiyi'] },
    { key: 'meitu', aliases: ['meitu'] },
  ]

  for (const product of products) {
    const pName = product.name.toLowerCase()
    if (product.sku === 'WA-CUSTOM' || pName.includes('pesanan whatsapp')) continue

    let score = 0
    let brandMatched = false

    for (const b of brands) {
      const productHasBrand = b.aliases.some((a) => {
        if (a.length <= 4) return new RegExp(`\\b${a}\\b`, 'i').test(pName)
        return pName.includes(a)
      })
      const noteHasBrand = b.aliases.some((a) => {
        if (a.length <= 4) return new RegExp(`\\b${a}\\b`, 'i').test(lowerNote)
        return lowerNote.includes(a)
      })
      if (productHasBrand && noteHasBrand) {
        score += 50
        brandMatched = true
        break
      }
    }

    // Jika merek sama sekali tidak cocok, lewati
    if (!brandMatched) {
      continue
    }

    // Varian paket (Famplan, Individu, 1P1U, 1P2U, dsb)
    const variantTags = ['famplan', 'individu', 'indplan', '1p1u', '1p2u', 'semipriv', 'private', 'sharing', 'head']
    for (const vt of variantTags) {
      if (lowerNote.includes(vt) && pName.includes(vt)) {
        score += 25
      }
    }

    // Tipe Perangkat (TV vs Mobile vs AllDev)
    const noteHasTv = /\b(tv|smart\s*tv|tv\s*only)\b/i.test(lowerNote)
    const prodHasTv = /\b(tv|smart\s*tv|tv\s*only)\b/i.test(pName)
    const prodHasMobile = /\b(mobile|hp)\b/i.test(pName)
    const noteHasMobile = /\b(mobile|hp|handphone)\b/i.test(lowerNote)

    if (noteHasTv && prodHasTv) {
      score += 35
    } else if (noteHasTv && prodHasMobile) {
      score -= 35
    }

    if (noteHasMobile && prodHasMobile) {
      score += 30
    } else if (noteHasMobile && prodHasTv) {
      score -= 30
    }

    // Tipe Akun (Private vs Sharing)
    const noteHasPriv = /\b(priv|private|1p1u)\b/i.test(lowerNote)
    const prodHasPriv = /\b(priv|private|1p1u)\b/i.test(pName)
    const prodHasSharing = /\b(sharing|share|2u|4u|5u|6u|8u)\b/i.test(pName)
    const noteHasSharing = /\b(sharing|share|2u|4u|5u|6u|8u)\b/i.test(lowerNote)

    if (noteHasPriv && prodHasPriv) {
      score += 25
    } else if (noteHasPriv && prodHasSharing) {
      score -= 35
    }

    if (noteHasSharing && prodHasSharing) {
      score += 25
    } else if (noteHasSharing && prodHasPriv) {
      score -= 35
    }

    // Dynamic Duration Matching (Mendukung 7 hari, 14 hari, 30 hari, 1 bulan, 3 bulan, 1 tahun, dsb)
    const noteDays = extractDurationInDays(lowerNote)
    const prodDays = extractDurationInDays(pName)

    if (noteDays !== null && prodDays !== null) {
      if (noteDays === prodDays) {
        score += 45 // Cocok durasi persis (7 hari == 7 hari, 14 hari == 14 hari, 3 bulan == 3 bulan, dsb)
      } else {
        score -= 50 // Penalti durasi tidak cocok (minta 7 hari tapi produk 14 hari / 1 bulan)
      }
    } else if (noteDays !== null && prodDays === null) {
      score -= 15
    } else if (noteDays === null && prodDays === 30) {
      // Jika pembeli sama sekali TIDAK menyebutkan durasi, beri preferensi default ke 1 bulan
      score += 2
    }

    // Cocok durasi teks langsung
    const durationMatch = pName.match(/\b(\d+\s*(?:bulan|tahun|hari|minggu)|lifetime)\b/i)
    if (durationMatch && lowerNote.includes(durationMatch[1])) {
      score += 15
    }

    if (
      (lowerNote.includes('1u') || lowerNote.includes('1u1b') || lowerNote.includes('1 user')) &&
      pName.includes('1u')
    ) {
      score += 20
    }

    // Cocok harga
    if (price !== null && product.sellPrice === price) {
      score += 25
    }

    // Reseller preference
    const isProductReseller = pName.includes('reseller')
    if (isReseller && isProductReseller) {
      score += 30
    } else if (!isReseller && isProductReseller) {
      score -= 30
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = product
    }
  }

  if (highestScore >= 45) {
    return bestMatch
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const apiKey =
      request.headers.get('x-api-key') || body.apiKey || body.secretKey
    const expectedKey = process.env.BOT_API_KEY || 'rdm-bot-pos-secret-2026'

    if (apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API Key' },
        { status: 401 }
      )
    }

    const {
      action = 'proses',
      note = '',
      customerPhone = '',
      customerName = '',
      groupName = '',
      receiptNo = '',
      isReseller = false,
    } = body

    // Deteksi jika dari nama grup ada kata reseller / grosir
    const isResellerOrder =
      Boolean(isReseller) || Boolean(groupName && /reseller|grosir/i.test(groupName))

    // Normalisasi No Telepon
    const cleanPhone = (customerPhone || '').replace(/\D/g, '')

    // Ambil data penting secara paralel menggunakan Promise.all untuk kecepatan maksimal
    const [adminUser, existingCustomer, storeSetting, allProducts] = await Promise.all([
      prisma.user.findFirst({ where: { role: 'ADMIN' } }).then((u) => u || prisma.user.findFirst()),
      cleanPhone ? prisma.customer.findFirst({ where: { phone: { contains: cleanPhone } } }) : Promise.resolve(null),
      prisma.store.findFirst({ select: { geminiApiKey: true, receiptPrefix: true } }),
      action === 'proses' || action === 'done' ? prisma.product.findMany({ where: { isActive: true } }) : Promise.resolve([]),
    ])

    if (!adminUser) {
      return NextResponse.json(
        { error: 'No admin or user found in POS database' },
        { status: 500 }
      )
    }

    // Ambil / Buat Pelanggan (Customer)
    let customer: any = existingCustomer
    if (cleanPhone && !customer) {
      const isNameOnlyDigits = customerName && /^\d+$/.test(customerName.trim())
      let displayName = ''

      if (customerName && !isNameOnlyDigits) {
        displayName = isResellerOrder ? `${customerName} [Reseller]` : customerName
      } else {
        displayName = isResellerOrder
          ? (cleanPhone.length >= 15 ? 'Reseller WhatsApp' : `Reseller ${cleanPhone.slice(-4)}`)
          : (cleanPhone.length >= 15 ? 'Pelanggan WhatsApp' : `Pelanggan ${cleanPhone.slice(-4)}`)
      }

      customer = await prisma.customer.create({
        data: {
          name: displayName,
          phone: cleanPhone,
        },
      })
    }

    // =========================================================================
    // AKSI: PROSES (Catat Transaksi Pending)
    // =========================================================================
    if (action === 'proses') {
      const extractedPrice = extractPrice(note)
      let requestedPrice =
        body.price && typeof body.price === 'number' && body.price > 0
          ? body.price
          : extractedPrice !== null && extractedPrice > 0
            ? extractedPrice
            : null

      const requestedProductName =
        body.productName && typeof body.productName === 'string' && body.productName.trim()
          ? body.productName.trim()
          : ''

      // Ambil API Key Gemini (dari setting database toko, env, atau payload request)
      const geminiApiKey =
        body.geminiApiKey ||
        storeSetting?.geminiApiKey ||
        process.env.GEMINI_API_KEY ||
        request.headers.get('x-gemini-key') ||
        null

      // 0. Analisis Gambar Bukti Transfer (Gemini Vision Multimodal)
      let paymentAnalysis: PaymentAnalysis | null = null
      if (geminiApiKey && body.imageBase64) {
        try {
          paymentAnalysis = await analyzePaymentProofWithGemini(
            body.imageBase64,
            geminiApiKey
          )
          if (paymentAnalysis?.isValidProof) {
            console.log(
              `[Gemini Vision Struk]: ${paymentAnalysis.summary} (Nominal: Rp ${paymentAnalysis.amount}, Status: ${paymentAnalysis.status})`
            )
            // Jika ada nominal dari struk dan belum diisi harga manual, gunakan nominal struk!
            if (paymentAnalysis.amount && (!requestedPrice || requestedPrice === 0)) {
              requestedPrice = paymentAnalysis.amount
            }
          }
        } catch (visErr: any) {
          console.warn('[Gemini Vision Warning]:', visErr.message)
        }
      }

      let matchedProduct: any = null
      let aiReasoning = ''

      // 1. Coba Prediksi dengan Google Gemini AI (Jika API Key tersedia)
      if (geminiApiKey) {
        try {
          const nominalHint = paymentAnalysis?.amount ? `, nominal struk: Rp ${paymentAnalysis.amount}` : ''
          const aiInputText = requestedProductName
            ? `${note} (kandidat: ${requestedProductName}${nominalHint})`
            : (paymentAnalysis?.amount ? `${note} (nominal struk: Rp ${paymentAnalysis.amount})` : note)

          const aiResult = await predictProductWithGemini(
            aiInputText,
            allProducts,
            geminiApiKey,
            isResellerOrder
          )

          if (aiResult?.matchedProduct && aiResult.confidence >= 0.65) {
            matchedProduct = aiResult.matchedProduct
            aiReasoning = aiResult.reasoning
            console.log(
              `[Gemini AI Prediction Success] Produk Cocok: "${matchedProduct.name}" (Confidence: ${aiResult.confidence}) Alasan: ${aiReasoning}`
            )
          }
        } catch (aiErr: any) {
          console.warn('[Gemini AI Prediction Warning]:', aiErr.message)
        }
      }

      // 2. Fallback: Gunakan Pencocokan Berbasis Aturan jika AI tidak aktif atau confidence rendah
      if (!matchedProduct) {
        matchedProduct = matchProduct(
          requestedProductName ? `${requestedProductName} ${note}` : note,
          requestedPrice,
          allProducts,
          isResellerOrder
        )
      }

      // Jika belum cocok di database, dan ada nama produk (misal dari list.json):
      if (!matchedProduct && requestedProductName) {
        // Cek apakah ada yang namanya sama persis
        matchedProduct = allProducts.find(
          (p) => p.name.toLowerCase() === requestedProductName.toLowerCase()
        )

        // Jika benar-benar belum pernah didaftarkan ke Web POS, daftarkan otomatis!
        if (!matchedProduct) {
          const autoSku = 'BOT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
          matchedProduct = await prisma.product.create({
            data: {
              name: requestedProductName,
              sku: autoSku,
              sellPrice: requestedPrice || 0,
              buyPrice: 0, // Admin tinggal atur modal / HPP di web kasir kapan saja
              unit: 'AKUN',
              stock: 999,
              manageStock: false,
              isActive: true,
            },
          })
        }
      }

      // Jika tetap belum cocok (misal order teks bebas tanpa nama produk), gunakan fallback WA-CUSTOM
      if (!matchedProduct) {
        matchedProduct = await prisma.product.findFirst({
          where: { sku: 'WA-CUSTOM' },
        })

        if (!matchedProduct) {
          matchedProduct = await prisma.product.create({
            data: {
              name: 'PESANAN WHATSAPP (CUSTOM)',
              sku: 'WA-CUSTOM',
              sellPrice: requestedPrice || 0,
              buyPrice: 0,
              unit: 'AKUN',
              stock: 999,
              manageStock: false,
              isActive: true,
            },
          })
        }
      }

      const newReceiptNo = generateReceiptNo(storeSetting?.receiptPrefix || 'RDM')
      const finalPrice =
        requestedPrice !== null && requestedPrice > 0
          ? requestedPrice
          : matchedProduct.sellPrice

      const finalProductName = requestedProductName || matchedProduct.name

      let paymentMethod = detectPaymentMethod(note)
      if (paymentAnalysis?.sourceMethod && paymentAnalysis.sourceMethod !== 'LAINNYA') {
        paymentMethod = paymentAnalysis.sourceMethod
      }

      const paymentDetailNote = paymentAnalysis?.summary ? ` [💳 ${paymentAnalysis.summary}]` : ''
      const txNote = `[WA Bot${isResellerOrder ? ' (Reseller)' : ''}] ${groupName ? `(${groupName}) ` : ''}${note || 'Pesanan WhatsApp'}${paymentDetailNote}`

      // Cek apakah pelanggan sudah memiliki transaksi PENDING (misal sebelumnya tercatat WA-CUSTOM / Rp 0)
      let existingPendingTx: any = null
      if (customer?.id) {
        existingPendingTx = await prisma.transaction.findFirst({
          where: {
            customerId: customer.id,
            status: 'PENDING',
          },
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        })
      }

      // Deteksi jika transaksi PENDING tersebut adalah custom / Rp 0 yang perlu diperbarui
      const isCustomPending = Boolean(
        existingPendingTx &&
          (existingPendingTx.total === 0 ||
            existingPendingTx.items.some(
              (it: any) =>
                it.productName.toUpperCase().includes('CUSTOM') ||
                it.price === 0 ||
                it.productId === matchedProduct.id
            ))
      )

      let transaction: any = null

      if (isCustomPending && existingPendingTx) {
        // Kembalikan akun lama jika sebelumnya sempat terkunci
        await prisma.digitalAccount.updateMany({
          where: { transactionId: existingPendingTx.id },
          data: { status: 'AVAILABLE', transactionId: null, soldAt: null },
        })

        // Hapus item lama yang bernilai custom/0
        await prisma.transactionItem.deleteMany({
          where: { transactionId: existingPendingTx.id },
        })

        // Perbarui data transaksi yang sudah ada (tidak bikin duplikat)
        transaction = await prisma.transaction.update({
          where: { id: existingPendingTx.id },
          data: {
            subtotal: finalPrice,
            total: finalPrice,
            paymentMethod,
            paymentAmount: finalPrice,
            note: txNote,
            items: {
              create: [
                {
                  productId: matchedProduct.id,
                  productName: finalProductName,
                  quantity: 1,
                  price: finalPrice,
                  buyPrice: matchedProduct?.buyPrice || 0,
                  subtotal: finalPrice,
                },
              ],
            },
          },
          include: {
            items: true,
            customer: true,
          },
        })
      } else {
        // Buat Transaksi Baru di Database
        transaction = await prisma.transaction.create({
          data: {
            receiptNo: newReceiptNo,
            userId: adminUser.id,
            customerId: customer?.id || null,
            subtotal: finalPrice,
            total: finalPrice,
            paymentMethod,
            paymentAmount: finalPrice,
            changeAmount: 0,
            status: 'PENDING',
            note: txNote,
            items: {
              create: [
                {
                  productId: matchedProduct.id,
                  productName: finalProductName,
                  quantity: 1,
                  price: finalPrice,
                  buyPrice: matchedProduct?.buyPrice || 0, // Kunci HPP pada detik pesanan masuk
                  subtotal: finalPrice,
                },
              ],
            },
          },
          include: {
            items: true,
            customer: true,
          },
        })
      }

      // Pengelolaan Stok Akun Digital (HANYA AKTIF JIKA manageStock === true)
      const accountInfo = {
        hasStockManagement: false,
        accountData: null as string | null,
        snk: matchedProduct?.snk || null as string | null,
        remainingStock: matchedProduct?.stock ?? 0,
        isOutOfStock: false,
      }

      if (matchedProduct?.manageStock) {
        accountInfo.hasStockManagement = true

        const availableAccount = await prisma.digitalAccount.findFirst({
          where: {
            productId: matchedProduct.id,
            status: 'AVAILABLE',
          },
          orderBy: { createdAt: 'asc' },
        })

        if (availableAccount) {
          // Kunci akun untuk transaksi ini & ubah status menjadi SOLD
          await prisma.digitalAccount.update({
            where: { id: availableAccount.id },
            data: {
              status: 'SOLD',
              transactionId: transaction.id,
              soldAt: new Date(),
            },
          })

          const remaining = await prisma.digitalAccount.count({
            where: { productId: matchedProduct.id, status: 'AVAILABLE' },
          })

          await prisma.product.update({
            where: { id: matchedProduct.id },
            data: { stock: remaining },
          })

          try {
            await prisma.stockMovement.create({
              data: {
                productId: matchedProduct.id,
                type: 'SALE',
                quantity: -1,
                note: `Penjualan Bot WA #${transaction.receiptNo}`,
                reference: transaction.id,
                userId: adminUser.id,
              },
            })
          } catch (e) {
            console.error('Failed to log stock movement in bot order:', e)
          }

          accountInfo.accountData = availableAccount.accountData
          accountInfo.remainingStock = remaining
          accountInfo.isOutOfStock = false
        } else {
          accountInfo.isOutOfStock = true
          accountInfo.remainingStock = 0
        }
      }

      return NextResponse.json({
        success: true,
        action: 'proses',
        isUpdated: Boolean(isCustomPending),
        receiptNo: transaction.receiptNo,
        productName: finalProductName,
        price: finalPrice,
        customerName: customer?.name || customerPhone,
        customerPhone: cleanPhone,
        status: 'PENDING',
        paymentMethod,
        paymentAnalysis: paymentAnalysis
          ? {
              source: paymentAnalysis.sourceMethod,
              destination: paymentAnalysis.destinationName
                ? `${paymentAnalysis.destinationType} (${paymentAnalysis.destinationName})`
                : paymentAnalysis.destinationType,
              amount: paymentAnalysis.amount,
              status: paymentAnalysis.status,
              summary: paymentAnalysis.summary,
            }
          : null,
        hasStockManagement: accountInfo.hasStockManagement,
        accountData: accountInfo.accountData,
        snk: accountInfo.snk,
        remainingStock: accountInfo.remainingStock,
        isOutOfStock: accountInfo.isOutOfStock,
        message: 'Transaksi berhasil dicatat ke Web POS dengan status PENDING',
      })
    }

    // =========================================================================
    // AKSI: BATAL / CANCEL / REFUND (Ubah Status Menjadi VOIDED & Kembalikan Stok)
    // =========================================================================
    const isRefundAction =
      action === 'batal' ||
      action === 'cancel' ||
      action === 'void' ||
      action === 'refund' ||
      action === 'reffund' ||
      /\b(reff?und|refund|kembali\s*dana|batal)\b/i.test(note || '')

    if (isRefundAction) {
      let targetTx: any = null

      if (receiptNo) {
        targetTx = await prisma.transaction.findFirst({
          where: { receiptNo },
          include: { items: true, customer: true },
        })
      }

      // Prioritas 1: Cari transaksi PENDING terbaru pelanggan
      if (!targetTx && customer?.id) {
        targetTx = await prisma.transaction.findFirst({
          where: { customerId: customer.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          include: { items: true, customer: true },
        })
      }

      if (!targetTx && cleanPhone) {
        targetTx = await prisma.transaction.findFirst({
          where: {
            customer: { phone: { contains: cleanPhone } },
            status: 'PENDING',
          },
          orderBy: { createdAt: 'desc' },
          include: { items: true, customer: true },
        })
      }

      // Prioritas 2: Jika tidak ada yang pending tapi ada transaksi terakhir (misal refund transaksi lunas)
      if (!targetTx && cleanPhone) {
        targetTx = await prisma.transaction.findFirst({
          where: {
            customer: { phone: { contains: cleanPhone } },
            status: { in: ['PENDING', 'COMPLETED'] },
          },
          orderBy: { createdAt: 'desc' },
          include: { items: true, customer: true },
        })
      }

      if (!targetTx) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tidak ditemukan transaksi yang dapat dibatalkan atau direfund untuk pelanggan ini.',
          },
          { status: 404 }
        )
      }

      // Kembalikan akun digital yang terkunci untuk transaksi ini jika ada
      const lockedAccounts = await prisma.digitalAccount.findMany({
        where: { transactionId: targetTx.id },
      })
      for (const acc of lockedAccounts) {
        await prisma.digitalAccount.update({
          where: { id: acc.id },
          data: {
            status: 'AVAILABLE',
            transactionId: null,
            soldAt: null,
          },
        })
        const count = await prisma.digitalAccount.count({
          where: { productId: acc.productId, status: 'AVAILABLE' },
        })
        await prisma.product.update({
          where: { id: acc.productId },
          data: { stock: count },
        })
        try {
          await prisma.stockMovement.create({
            data: {
              productId: acc.productId,
              type: 'CANCEL',
              quantity: 1,
              note: `Batal/Refund Bot WA #${targetTx.receiptNo}`,
              reference: targetTx.id,
              userId: adminUser.id,
            },
          })
        } catch (e) { }
      }

      const updated = await prisma.transaction.update({
        where: { id: targetTx.id },
        data: { status: 'VOIDED' },
        include: { items: true, customer: true },
      })

      return NextResponse.json({
        success: true,
        action: 'refund',
        receiptNo: updated.receiptNo,
        productName: updated.items[0]?.productName || 'Produk',
        total: updated.total,
        customerName: updated.customer?.name || cleanPhone,
        status: 'VOIDED',
        message: 'Pesanan berhasil DIREFUND / DIBATALKAN dan stok akun telah dikembalikan',
      })
    }

    // =========================================================================
    // AKSI: DONE (Ubah Status Menjadi Selesai / COMPLETED)
    // =========================================================================
    if (action === 'done' || action === 'selesai') {
      let pendingTx: any = null

      if (receiptNo) {
        pendingTx = await prisma.transaction.findFirst({
          where: { receiptNo, status: 'PENDING' },
          include: { items: true, customer: true },
        })
      }

      if (!pendingTx && customer?.id) {
        pendingTx = await prisma.transaction.findFirst({
          where: { customerId: customer.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          include: { items: true, customer: true },
        })
      }

      if (!pendingTx && cleanPhone) {
        // Cari lewat customer phone langsung
        pendingTx = await prisma.transaction.findFirst({
          where: {
            customer: { phone: { contains: cleanPhone } },
            status: 'PENDING',
          },
          orderBy: { createdAt: 'desc' },
          include: { items: true, customer: true },
        })
      }

      if (pendingTx) {
        // Jika HPP saat pending masih 0 dan di master produk sekarang sudah ada HPP,
        // kunci HPP sekarang di detik transaksi dinyatakan COMPLETED
        for (const item of pendingTx.items) {
          if (!item.buyPrice || item.buyPrice === 0) {
            const p = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { buyPrice: true },
            })
            if (p?.buyPrice && p.buyPrice > 0) {
              await prisma.transactionItem.update({
                where: { id: item.id },
                data: { buyPrice: p.buyPrice },
              })
            }
          }
        }

        const updated = await prisma.transaction.update({
          where: { id: pendingTx.id },
          data: { status: 'COMPLETED' },
          include: { items: true, customer: true },
        })

        const assignedAccount = await prisma.digitalAccount.findFirst({
          where: { transactionId: pendingTx.id },
          include: { product: true },
        })

        return NextResponse.json({
          success: true,
          action: 'done',
          receiptNo: updated.receiptNo,
          productName: updated.items[0]?.productName || 'Produk',
          total: updated.total,
          customerName: updated.customer?.name || customerPhone,
          status: 'COMPLETED',
          hasStockManagement: Boolean(assignedAccount),
          accountData: assignedAccount?.accountData || null,
          snk: assignedAccount?.product?.snk || null,
          message: 'Transaksi berhasil diselesaikan di Web POS',
        })
      }

      // Jika tidak ada transaksi pending sebelumnya, langsung buatkan transaksi COMPLETED
      const extractedPrice = extractPrice(note)
      const requestedPrice =
        body.price && typeof body.price === 'number' && body.price > 0
          ? body.price
          : extractedPrice !== null && extractedPrice > 0
            ? extractedPrice
            : null

      const requestedProductName =
        body.productName && typeof body.productName === 'string' && body.productName.trim()
          ? body.productName.trim()
          : ''

      // Ambil API Key Gemini (dari setting database toko, env, atau payload request)
      const geminiApiKey =
        body.geminiApiKey ||
        storeSetting?.geminiApiKey ||
        process.env.GEMINI_API_KEY ||
        request.headers.get('x-gemini-key') ||
        null

      let matchedProduct: any = null
      let aiReasoning = ''

      // 1. Coba Prediksi dengan Google Gemini AI (Jika API Key tersedia)
      if (geminiApiKey) {
        try {
          const aiInputText = requestedProductName
            ? `${note} (kandidat: ${requestedProductName})`
            : note

          const aiResult = await predictProductWithGemini(
            aiInputText,
            allProducts,
            geminiApiKey,
            isResellerOrder
          )

          if (aiResult?.matchedProduct && aiResult.confidence >= 0.65) {
            matchedProduct = aiResult.matchedProduct
            aiReasoning = aiResult.reasoning
            console.log(
              `[Gemini AI Prediction Success] Produk Cocok: "${matchedProduct.name}" (Confidence: ${aiResult.confidence}) Alasan: ${aiReasoning}`
            )
          }
        } catch (aiErr: any) {
          console.warn('[Gemini AI Prediction Warning]:', aiErr.message)
        }
      }

      // 2. Fallback: Gunakan Pencocokan Berbasis Aturan jika AI tidak aktif atau confidence rendah
      if (!matchedProduct) {
        matchedProduct = matchProduct(
          requestedProductName ? `${requestedProductName} ${note}` : note,
          requestedPrice,
          allProducts,
          isResellerOrder
        )
      }

      if (!matchedProduct && requestedProductName) {
        matchedProduct = allProducts.find(
          (p) => p.name.toLowerCase() === requestedProductName.toLowerCase()
        )

        if (!matchedProduct) {
          const autoSku = 'BOT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
          matchedProduct = await prisma.product.create({
            data: {
              name: requestedProductName,
              sku: autoSku,
              sellPrice: requestedPrice || 0,
              buyPrice: 0,
              unit: 'AKUN',
              stock: 999,
              manageStock: false,
              isActive: true,
            },
          })
        }
      }

      const finalPrice =
        requestedPrice !== null && requestedPrice > 0
          ? requestedPrice
          : matchedProduct?.sellPrice || 0

      // JANGAN PERNAH membuat transaksi bodong Rp 0 jika tidak ada pesanan pending
      if (!matchedProduct || finalPrice === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tidak ditemukan transaksi pending untuk pelanggan ini.',
          },
          { status: 404 }
        )
      }

      const finalProductName =
        requestedProductName || matchedProduct?.name || 'Pesanan Langsung'

      const newReceiptNo = generateReceiptNo(storeSetting?.receiptPrefix || 'RDM')

      const directCompleted = await prisma.transaction.create({
        data: {
          receiptNo: newReceiptNo,
          userId: adminUser.id,
          customerId: customer?.id || null,
          subtotal: finalPrice,
          total: finalPrice,
          paymentMethod: detectPaymentMethod(note),
          paymentAmount: finalPrice,
          changeAmount: 0,
          status: 'COMPLETED',
          note: `[WA Bot Langsung Selesai${isResellerOrder ? ' (Reseller)' : ''}] ${note || ''}`,
          items: matchedProduct
            ? {
              create: [
                {
                  productId: matchedProduct.id,
                  productName: finalProductName,
                  quantity: 1,
                  price: finalPrice,
                  buyPrice: matchedProduct?.buyPrice || 0, // Kunci HPP transaksi
                  subtotal: finalPrice,
                },
              ],
            }
            : undefined,
        },
        include: { items: true, customer: true },
      })

      return NextResponse.json({
        success: true,
        action: 'done',
        receiptNo: directCompleted.receiptNo,
        productName: finalProductName,
        total: finalPrice,
        customerName: customer?.name || customerPhone,
        status: 'COMPLETED',
        message: 'Transaksi baru langsung dicatat sebagai COMPLETED di Web POS',
      })
    }

    return NextResponse.json(
      { error: `Action '${action}' not supported` },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('API Bot Order Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
