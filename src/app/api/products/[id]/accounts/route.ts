import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        manageStock: true,
        snk: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const accounts = await prisma.digitalAccount.findMany({
      where: { productId: id },
      orderBy: [
        { status: 'asc' }, // AVAILABLE first
        { createdAt: 'desc' },
      ],
      include: {
        transaction: {
          select: {
            receiptNo: true,
            createdAt: true,
          },
        },
      },
    })

    const availableCount = accounts.filter((a) => a.status === 'AVAILABLE').length
    const soldCount = accounts.filter((a) => a.status === 'SOLD').length

    return NextResponse.json({
      product,
      accounts,
      availableCount,
      soldCount,
      totalCount: accounts.length,
    })
  } catch (error: any) {
    console.error('Digital accounts GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengambil data akun' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, manageStock: true, stock: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    let rawList: string[] = []
    if (typeof body.text === 'string') {
      rawList = body.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
    } else if (Array.isArray(body.accounts)) {
      rawList = body.accounts
        .map((line: any) => String(line).trim())
        .filter(Boolean)
    }

    if (!rawList.length) {
      return NextResponse.json(
        { error: 'Mohon masukkan minimal 1 akun' },
        { status: 400 }
      )
    }

    // Masukkan semua akun baru ke database
    await prisma.$transaction(
      rawList.map((accountText) =>
        prisma.digitalAccount.create({
          data: {
            productId: id,
            accountData: accountText,
            status: 'AVAILABLE',
          },
        })
      )
    )

    // Hitung total akun yang tersedia sekarang
    const availableCount = await prisma.digitalAccount.count({
      where: {
        productId: id,
        status: 'AVAILABLE',
      },
    })

    // Jika produk mengaktifkan manageStock, sinkronkan jumlah stock produk!
    if (product.manageStock) {
      await prisma.product.update({
        where: { id },
        data: { stock: availableCount },
      })
    }

    // Catat Riwayat Mutasi Stok
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'OWNER'] } },
        select: { id: true },
      })
      if (adminUser) {
        await prisma.stockMovement.create({
          data: {
            productId: id,
            type: 'IN',
            quantity: rawList.length,
            note: `Restock ${rawList.length} Akun Digital Vault`,
            userId: adminUser.id,
          },
        })
      }
    } catch (e) {
      console.error('Failed to log stock movement on account add:', e)
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${rawList.length} akun ke dalam stok digital`,
      addedCount: rawList.length,
      currentAvailableStock: availableCount,
    })
  } catch (error: any) {
    console.error('Digital accounts POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan akun digital' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'ID Akun harus disertakan' },
        { status: 400 }
      )
    }

    await prisma.digitalAccount.delete({
      where: { id: accountId },
    })

    // Sinkronkan sisa stok jika manageStock aktif
    const product = await prisma.product.findUnique({
      where: { id },
      select: { manageStock: true },
    })

    const availableCount = await prisma.digitalAccount.count({
      where: { productId: id, status: 'AVAILABLE' },
    })

    if (product?.manageStock) {
      await prisma.product.update({
        where: { id },
        data: { stock: availableCount },
      })
    }

    // Catat Riwayat Mutasi Stok
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'OWNER'] } },
        select: { id: true },
      })
      if (adminUser) {
        await prisma.stockMovement.create({
          data: {
            productId: id,
            type: 'OUT',
            quantity: -1,
            note: 'Penghapusan akun digital dari brankas',
            userId: adminUser.id,
          },
        })
      }
    } catch (e) {
      console.error('Failed to log stock movement on account delete:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil dihapus dari stok',
      currentAvailableStock: availableCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus akun' },
      { status: 500 }
    )
  }
}
