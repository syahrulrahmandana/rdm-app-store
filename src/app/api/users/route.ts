import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: 'Nama, email, dan sandi wajib diisi' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: body.email }
    })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah digunakan oleh pengguna lain' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || 'KASIR',
      },
    })

    // Return without password
    const { password: _, ...result } = user
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
