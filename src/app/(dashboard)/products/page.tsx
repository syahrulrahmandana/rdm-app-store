'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineFolderOpen,
  HiOutlineFolder
} from 'react-icons/hi2'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  buyPrice: number
  sellPrice: number
  stock: number
  minStock: number
  unit: string
  categoryId: string | null
  category?: { name: string } | null
  manageStock: boolean
}

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  description: string | null
  _count?: {
    products: number
  }
}

const EMOJI_PRESETS = ['📦', '🍔', '🥤', '🔌', '👕', '💊', '📚', '💄', '⚙️', '🎮']
const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B'  // Slate
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Product Form states
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [buyPrice, setBuyPrice] = useState(0)
  const [sellPrice, setSellPrice] = useState(0)
  const [stock, setStock] = useState(0)
  const [minStock, setMinStock] = useState(5)
  const [unit, setUnit] = useState('pcs')
  const [manageStock, setManageStock] = useState(true)

  // Category Management Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catIcon, setCatIcon] = useState('📦')
  const [catColor, setCatColor] = useState('#3B82F6')
  const [isSubmittingCat, setIsSubmittingCat] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [search, selectedCategory])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}&categoryId=${selectedCategory}`)
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (e) {
      toast.error('Gagal mengambil data produk')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setName('')
    setSku(`PRD-${Math.floor(Math.random() * 90000) + 10000}`)
    setBarcode('')
    setCategoryId('')
    setBuyPrice(0)
    setSellPrice(0)
    setStock(0)
    setMinStock(5)
    setUnit('pcs')
    setManageStock(true)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setSku(product.sku)
    setBarcode(product.barcode || '')
    setCategoryId(product.categoryId || '')
    setBuyPrice(product.buyPrice)
    setSellPrice(product.sellPrice)
    setStock(product.stock)
    setMinStock(product.minStock)
    setUnit(product.unit)
    setManageStock(product.manageStock ?? true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Produk berhasil dihapus')
        fetchProducts()
      } else {
        toast.error('Gagal menghapus produk')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name,
      sku,
      barcode: barcode || null,
      categoryId: categoryId || null,
      buyPrice,
      sellPrice,
      stock: manageStock ? stock : 0,
      minStock: manageStock ? minStock : 0,
      unit,
      manageStock,
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingProduct ? 'Produk diperbarui' : 'Produk ditambahkan')
        setIsModalOpen(false)
        fetchProducts()
      } else {
        toast.error(data.error || 'Gagal menyimpan produk')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) {
      toast.error('Nama kategori harus diisi')
      return
    }

    setIsSubmittingCat(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          description: catDesc || null,
          icon: catIcon,
          color: catColor,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Kategori berhasil ditambahkan')
        setCatName('')
        setCatDesc('')
        setCatIcon('📦')
        setCatColor('#3B82F6')
        fetchCategories()
      } else {
        toast.error(data.error || 'Gagal menambahkan kategori')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmittingCat(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) return

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Kategori berhasil dihapus')
        if (selectedCategory === id) {
          setSelectedCategory('')
        }
        if (categoryId === id) {
          setCategoryId('')
        }
        fetchCategories()
        fetchProducts()
      } else {
        toast.error(data.error || 'Gagal menghapus kategori')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Produk</h2>
          <p className="page-subtitle">Kelola, tambah, edit, dan hapus inventori produk Anda</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <HiOutlineFolderOpen size={16} /> Kelola Kategori
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <HiOutlinePlus size={16} /> Tambah Produk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <HiOutlineMagnifyingGlass className="search-box-icon" />
          <input
            type="text"
            className="input"
            placeholder="Cari nama, SKU, atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ minWidth: 150, flex: 1, maxWidth: 250 }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>SKU / Barcode</th>
                <th>Kategori</th>
                <th>Harga Beli</th>
                <th>Harga Jual</th>
                <th>Stok</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unit: {p.unit}</span>
                  </td>
                  <td>
                    <div className="font-mono" style={{ fontSize: 13 }}>{p.sku}</div>
                    {p.barcode && <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.barcode}</div>}
                  </td>
                  <td>
                    <span className="badge badge-blue">{p.category?.name || 'Umum'}</span>
                  </td>
                  <td className="font-mono">{formatCurrency(p.buyPrice)}</td>
                  <td className="font-mono" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                    {formatCurrency(p.sellPrice)}
                  </td>
                  <td>
                    {p.manageStock ? (
                      <span className={`badge ${p.stock <= p.minStock ? 'badge-red' : 'badge-green'}`}>
                        {p.stock} {p.unit}
                      </span>
                    ) : (
                      <span className="badge badge-blue">
                        Tanpa Stok
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-icon btn-ghost" onClick={() => handleOpenEdit(p)}>
                        <HiOutlinePencilSquare size={16} />
                      </button>
                      <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(p.id)}>
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Produk tidak ditemukan</div>
              <div className="empty-state-desc">Silakan tambahkan produk baru</div>
            </div>
          )}
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid" style={{ gap: 16 }}>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Nama Produk</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">SKU</label>
                  <input
                    type="text"
                    className="input"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Barcode (Opsional)</label>
                  <input
                    type="text"
                    className="input"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Kategori</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{ flexShrink: 0, width: 42, height: 42 }}
                      onClick={() => setIsCategoryModalOpen(true)}
                      title="Kelola Kategori Baru"
                    >
                      <HiOutlinePlus size={16} />
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Satuan Unit</label>
                  <input
                    type="text"
                    className="input"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    className="input font-mono"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    className="input font-mono"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                  <input
                    id="product-manage-stock"
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="product-manage-stock" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}>
                    Pakai Pengelolaan Stok (Aktifkan untuk memantau sisa stok barang)
                  </label>
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ opacity: manageStock ? 1 : 0.5 }}>Stok Awal</label>
                  <input
                    type="number"
                    className="input"
                    value={manageStock ? stock : 0}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    required={manageStock}
                    disabled={!manageStock || !!editingProduct}
                    style={{ opacity: manageStock ? 1 : 0.5 }}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ opacity: manageStock ? 1 : 0.5 }}>Stok Minimum Peringatan</label>
                  <input
                    type="number"
                    className="input"
                    value={manageStock ? minStock : 0}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    required={manageStock}
                    disabled={!manageStock}
                    style={{ opacity: manageStock ? 1 : 0.5 }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Kategori */}
      {isCategoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Kelola Kategori Produk</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsCategoryModalOpen(false)}>×</button>
            </div>
            <div className="modal-body form-grid" style={{ gap: 24 }}>
              {/* Kolom Kiri: Form Tambah Kategori */}
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                  Tambah Kategori Baru
                </h4>
                <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Nama Kategori</label>
                    <input
                      type="text"
                      className="input"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Contoh: Makanan, Minuman, Elektronik"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Deskripsi (Opsional)</label>
                    <input
                      type="text"
                      className="input"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Deskripsi singkat..."
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Ikon / Emoji Preset</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: '8px',
                            minWidth: '40px',
                            fontSize: '18px',
                            borderColor: catIcon === emoji ? 'var(--border-active)' : 'var(--border-color)',
                            background: catIcon === emoji ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          }}
                          onClick={() => setCatIcon(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      <input
                        type="text"
                        className="input"
                        style={{ width: 60, textAlign: 'center', fontSize: '18px', padding: '6px' }}
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value.substring(0, 4))}
                        placeholder="Custom"
                        title="Masukkan Emoji Custom"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Warna Tema</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: catColor === color ? '3px solid white' : '1px solid rgba(0,0,0,0.2)',
                            boxShadow: catColor === color ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => setCatColor(color)}
                        />
                      ))}
                      <input
                        type="color"
                        style={{
                          width: '32px',
                          height: '32px',
                          padding: '0',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: 'transparent'
                        }}
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        title="Pilih Warna Custom"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={isSubmittingCat}>
                    {isSubmittingCat ? 'Menyimpan...' : 'Tambah Kategori'}
                  </button>
                </form>
              </div>

              {/* Kolom Kanan: Daftar Kategori Aktif */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                  Daftar Kategori ({categories.length})
                </h4>
                <div style={{ overflowY: 'auto', maxHeight: '380px', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                  {categories.map((c) => {
                    const productCount = c._count?.products || 0;
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-card)',
                          border: `1px solid ${c.color || 'var(--border-color)'}20`,
                          position: 'relative'
                        }}
                      >
                        {/* Avatar Kategori */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: `${c.color || '#3b82f6'}20`,
                            color: c.color || '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            flexShrink: 0
                          }}
                        >
                          {c.icon || '📦'}
                        </div>

                        {/* Detail Kategori */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.name}
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {productCount} Produk
                            </span>
                          </div>
                          {c.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.description}
                            </div>
                          )}
                        </div>

                        {/* Aksi */}
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{
                            color: productCount > 0 ? 'var(--text-muted)' : 'var(--accent-red)',
                            cursor: productCount > 0 ? 'not-allowed' : 'pointer',
                            opacity: productCount > 0 ? 0.3 : 1
                          }}
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          disabled={productCount > 0}
                          title={productCount > 0 ? 'Kategori tidak dapat dihapus karena memiliki produk' : 'Hapus Kategori'}
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    );
                  })}

                  {categories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      <HiOutlineFolder size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div style={{ fontSize: 13 }}>Belum ada kategori. Silakan buat di sebelah kiri.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
