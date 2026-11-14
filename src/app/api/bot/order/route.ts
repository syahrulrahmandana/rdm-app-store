import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReceiptNo } from '@/lib/utils'

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

// Helper: Pencocokan Cerdas Kata Kunci Produk (Mendukung Varian Reseller)
function matchProduct(
  note: string,
  price: number | null,
  products: any[],
  isReseller: boolean = false
): any | null {
  if (!products || products.length === 0) return null

  const lowerNote = (note || '').toLowerCase()

  // 1. Jika ada nominal pas dan persis cocok dengan salah satu harga produk
  if (price) {
    let exactPriceMatches = products.filter((p) => p.sellPrice === price)
    if (isReseller) {
      const resellerMatch = exactPriceMatches.find((p) =>
        p.name.toLowerCase().includes('reseller')
      )
      if (resellerMatch) return resellerMatch
    }
    if (exactPriceMatches.length === 1) {
      return exactPriceMatches[0]
    }
    // Jika ada lebih dari 1 yang harganya sama, saring lagi dengan kata kunci
    if (exactPriceMatches.length > 1) {
      for (const p of exactPriceMatches) {
        const pLower = p.name.toLowerCase()
        if (
          (lowerNote.includes('spotify') && pLower.includes('spotify')) ||
          (lowerNote.includes('netflix') && pLower.includes('netflix')) ||
          (lowerNote.includes('canva') && pLower.includes('canva')) ||
          (lowerNote.includes('capcut') && pLower.includes('capcut'))
        ) {
          return p
        }
      }
      return exactPriceMatches[0]
    }
  }

  // 2. Beri skor pencocokan kata kunci
  let bestMatch: any = null
  let highestScore = 0

  for (const product of products) {
    const pName = product.name.toLowerCase()
    let score = 0

    const isProductReseller =
      pName.includes('reseller') || pName.includes('(reseller)')

    // Jika ini grup Reseller, prioritaskan produk yang ada kata "reseller"
    if (isReseller && isProductReseller) {
      score += 35
    } else if (!isReseller && isProductReseller) {
      // Jika BUKAN grup reseller, kurangi skor produk reseller agar tidak terpilih
      score -= 35
    }

    // Cek merek utama
    const brands = [
      { key: 'spotify', aliases: ['spotify', 'spoti', 'spot'] },
      { key: 'netflix', aliases: ['netflix', 'netf', 'nf'] },
      { key: 'canva', aliases: ['canva', 'canv'] },
      { key: 'capcut', aliases: ['capcut', 'capc', 'cp'] },
      { key: 'youtube', aliases: ['youtube', 'yt'] },
    ]

    for (const b of brands) {
      const productHasBrand = b.aliases.some((a) => pName.includes(a))
      const noteHasBrand = b.aliases.some((a) => lowerNote.includes(a))
      if (productHasBrand && noteHasBrand) {
        score += 30
      }
    }

    // Cek durasi / paket
    if (
      (lowerNote.includes('2 bulan') || lowerNote.includes('2b') || lowerNote.includes('2bln') || lowerNote.includes('2m')) &&
      pName.includes('2 bulan')
    ) {
      score += 25
    }

    if (
      (lowerNote.includes('1 bulan') || lowerNote.includes('1b') || lowerNote.includes('1bln') || lowerNote.includes('1m') || lowerNote.includes('indplan')) &&
      (pName.includes('1 bulan') || pName.includes('1b') || pName.includes('individual'))
    ) {
      score += 20
    }

    if (
      (lowerNote.includes('1u') || lowerNote.includes('1u1b') || lowerNote.includes('1 user')) &&
      pName.includes('1u')
    ) {
      score += 20
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = product
    }
  }

  if (highestScore >= 20) {
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

    // Ambil default admin user untuk relasi userId di Transaction
    const adminUser =
      (await prisma.user.findFirst({ where: { role: 'ADMIN' } })) ||
      (await prisma.user.findFirst())

    if (!adminUser) {
      return NextResponse.json(
        { error: 'No admin or user found in POS database' },
        { status: 500 }
      )
    }

    // Normalisasi No Telepon
    const cleanPhone = (customerPhone || '').replace(/\D/g, '')

    // Ambil / Buat Pelanggan (Customer)
    let customer: any = null
    if (cleanPhone) {
      customer = await prisma.customer.findFirst({
        where: { phone: { contains: cleanPhone } },
      })
      if (!customer) {
        const displayName = customerName
          ? (isResellerOrder ? `${customerName} [Reseller]` : customerName)
          : (isResellerOrder ? `Reseller ${cleanPhone.slice(-4)}` : `Pelanggan ${cleanPhone.slice(-4)}`)
        customer = await prisma.customer.create({
          data: {
            name: displayName,
            phone: cleanPhone,
          },
        })
      }
    }

    // =========================================================================
    // AKSI: PROSES (Catat Transaksi Pending)
    // =========================================================================
    if (action === 'proses') {
      const allProducts = await prisma.product.findMany({
        where: { isActive: true },
      })

      const extractedPrice = extractPrice(note)
      let matchedProduct = matchProduct(
        note,
        extractedPrice,
        allProducts,
        isResellerOrder
      )

      // Jika belum cocok, cari atau buat produk fallback
      if (!matchedProduct) {
        matchedProduct = await prisma.product.findFirst({
          where: { sku: 'WA-CUSTOM' },
        })

        if (!matchedProduct) {
          matchedProduct = await prisma.product.create({
            data: {
              name: 'PESANAN WHATSAPP (CUSTOM)',
              sku: 'WA-CUSTOM',
              sellPrice: extractedPrice || 0,
              buyPrice: 0,
              unit: 'AKUN',
              stock: 999,
              manageStock: false,
              isActive: true,
            },
          })
        }
      }

      const store = await prisma.store.findFirst()
      const newReceiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')
      const finalPrice =
        extractedPrice !== null && extractedPrice > 0
          ? extractedPrice
          : matchedProduct.sellPrice

      const paymentMethod = detectPaymentMethod(note)

      // Buat Transaksi di Database
      const transaction = await prisma.transaction.create({
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
          note: `[WA Bot${isResellerOrder ? ' (Reseller)' : ''}] ${groupName ? `(${groupName}) ` : ''}${note || 'Pesanan WhatsApp'}`,
          items: {
            create: [
              {
                productId: matchedProduct.id,
                productName: matchedProduct.name,
                quantity: 1,
                price: finalPrice,
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

      return NextResponse.json({
        success: true,
        action: 'proses',
        receiptNo: transaction.receiptNo,
        productName: matchedProduct.name,
        price: finalPrice,
        customerName: customer?.name || customerPhone,
        customerPhone: cleanPhone,
        status: 'PENDING',
        message: 'Transaksi berhasil dicatat ke Web POS dengan status PENDING',
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
        const updated = await prisma.transaction.update({
          where: { id: pendingTx.id },
          data: { status: 'COMPLETED' },
          include: { items: true, customer: true },
        })

        return NextResponse.json({
          success: true,
          action: 'done',
          receiptNo: updated.receiptNo,
          productName: updated.items[0]?.productName || 'Produk',
          total: updated.total,
          customerName: updated.customer?.name || customerPhone,
          status: 'COMPLETED',
          message: 'Transaksi berhasil diselesaikan di Web POS',
        })
      }

      // Jika tidak ada transaksi pending sebelumnya, langsung buatkan transaksi COMPLETED
      const allProducts = await prisma.product.findMany({
        where: { isActive: true },
      })
      const extractedPrice = extractPrice(note)
      let matchedProduct = matchProduct(
        note,
        extractedPrice,
        allProducts,
        isResellerOrder
      )

      if (!matchedProduct) {
        matchedProduct = await prisma.product.findFirst({
          where: { sku: 'WA-CUSTOM' },
        })
      }

      const store = await prisma.store.findFirst()
      const newReceiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')
      const finalPrice =
        extractedPrice !== null && extractedPrice > 0
          ? extractedPrice
          : matchedProduct?.sellPrice || 0

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
          note: `[WA Bot Langsung Selesai] ${note || ''}`,
          items: matchedProduct
            ? {
                create: [
                  {
                    productId: matchedProduct.id,
                    productName: matchedProduct.name,
                    quantity: 1,
                    price: finalPrice,
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
        productName: matchedProduct?.name || 'Pesanan Langsung',
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
