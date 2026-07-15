import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let store = await prisma.store.findUnique({
      where: { id: 'store-1' },
    })

    // If store-1 doesn't exist yet, create it with defaults
    if (!store) {
      store = await prisma.store.create({
        data: {
          id: 'store-1',
          name: 'RDM APP STORE',
          phone: '08123456789',
          address: 'Jl. Merdeka No. 123, Jakarta',
          taxRate: 0,
        },
      })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Nama toko wajib diisi' }, { status: 400 })
    }

    const store = await prisma.store.upsert({
      where: { id: 'store-1' },
      update: {
        name: body.name,
        phone: body.phone || null,
        address: body.address || null,
        taxRate: parseFloat(body.taxRate) || 0,
      },
      create: {
        id: 'store-1',
        name: body.name,
        phone: body.phone || null,
        address: body.address || null,
        taxRate: parseFloat(body.taxRate) || 0,
      },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
