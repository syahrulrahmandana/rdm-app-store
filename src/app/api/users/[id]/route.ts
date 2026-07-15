import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    // Check if email already used by another user
    const existing = await prisma.user.findFirst({
      where: {
        email: body.email,
        id: { not: id }
      }
    })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah digunakan oleh pengguna lain' }, { status: 400 })
    }

    const data: any = {
      name: body.name,
      email: body.email,
      role: body.role,
    }

    if (body.password) {
      data.password = await bcrypt.hash(body.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    })

    const { password: _, ...result } = user
    return NextResponse.json(result)
  } catch (error) {
    console.error('User PUT error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete by setting isActive to false
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    const { password: _, ...result } = user
    return NextResponse.json(result)
  } catch (error) {
    console.error('User DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
