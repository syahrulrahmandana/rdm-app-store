import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        icon: body.icon || '📦',
        color: body.color || '#3B82F6',
      },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Update category error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Nama kategori sudah digunakan' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Gagal mengubah kategori' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Set categoryId to null on all products using this category
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    })

    // Delete category
    await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 })
  }
}
