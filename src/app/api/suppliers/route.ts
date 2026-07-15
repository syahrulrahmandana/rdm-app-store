import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { company: 'asc' },
    })
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Suppliers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.company || !body.name) {
      return NextResponse.json({ error: 'Nama perusahaan dan perwakilan wajib diisi' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        company: body.company,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Suppliers POST error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
