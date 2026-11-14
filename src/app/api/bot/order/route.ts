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

  const rawLower = (note || '').toLowerCase()
  const lowerNote = rawLower
    .replace(/(\d+)\s*(bulan|bln)/g, '$1 bulan')
    .replace(/(\d+)\s*(tahun|thn|th)/g, '$1 tahun')
    .replace(/(\d+)\s*(hari|hr)/g, '$1 hari')
    .replace(/(\d+)\s*(minggu|mgg)/g, '$1 minggu')

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

    // Durasi / paket
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

    if (
      (lowerNote.includes('1 tahun') || lowerNote.includes('1th') || lowerNote.includes('1thn')) &&
      (pName.includes('1 tahun') || pName.includes('1 th'))
    ) {
      score += 20
    }

    if (
      (lowerNote.includes('7 hari') || lowerNote.includes('7hari')) &&
      pName.includes('7 hari')
    ) {
      score += 20
    }

    if (
      (lowerNote.includes('30 hari') || lowerNote.includes('30hari')) &&
      pName.includes('30 hari')
    ) {
      score += 20
    }

    // Cocok harga
    if (price !== null && product.sellPrice === price) {
      score += 15
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
    }

    // =========================================================================
    // AKSI: PROSES (Catat Transaksi Pending)
    // =========================================================================
    if (action === 'proses') {
      const allProducts = await prisma.product.findMany({
        where: { isActive: true },
      })

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

      let matchedProduct = matchProduct(
        requestedProductName ? `${requestedProductName} ${note}` : note,
        requestedPrice,
        allProducts,
        isResellerOrder
      )

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

      const store = await prisma.store.findFirst()
      const newReceiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')
      const finalPrice =
        requestedPrice !== null && requestedPrice > 0
          ? requestedPrice
          : matchedProduct.sellPrice

      const finalProductName = requestedProductName || matchedProduct.name

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
        receiptNo: transaction.receiptNo,
        productName: finalProductName,
        price: finalPrice,
        customerName: customer?.name || customerPhone,
        customerPhone: cleanPhone,
        status: 'PENDING',
        hasStockManagement: accountInfo.hasStockManagement,
        accountData: accountInfo.accountData,
        snk: accountInfo.snk,
        remainingStock: accountInfo.remainingStock,
        isOutOfStock: accountInfo.isOutOfStock,
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
      const allProducts = await prisma.product.findMany({
        where: { isActive: true },
      })
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

      let matchedProduct = matchProduct(
        requestedProductName ? `${requestedProductName} ${note}` : note,
        requestedPrice,
        allProducts,
        isResellerOrder
      )

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

      const store = await prisma.store.findFirst()
      const newReceiptNo = generateReceiptNo(store?.receiptPrefix || 'RDM')
      const finalPrice =
        requestedPrice !== null && requestedPrice > 0
          ? requestedPrice
          : matchedProduct?.sellPrice || 0

      const finalProductName =
        requestedProductName || matchedProduct?.name || 'Pesanan Langsung'

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
