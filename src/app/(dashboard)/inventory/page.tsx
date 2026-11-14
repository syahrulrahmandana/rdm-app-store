'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineArchiveBox,
  HiOutlineKey,
  HiOutlineExclamationTriangle,
  HiOutlineBanknotes,
  HiOutlineTrash,
  HiOutlineFolder,
  HiOutlineCheckCircle,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'

interface ProductStockItem {
  id: string
  name: string
  sku: string
  stock: number
  manageStock: boolean
  availableAccounts: number
  minStock: number
  buyPrice: number
  sellPrice: number
  stockValue: number
  unit: string
  image: string | null
  category: string
  categoryIcon: string
  categoryColor: string
}

interface Movement {
  id: string
  productId: string
  product: { name: string; sku: string }
  type: string
  quantity: number
  note: string | null
  createdAt: string
  user: { name: string }
}

interface StockSummary {
  totalProducts: number
  managedCount: number
  totalDigitalAccounts: number
  totalStockValue: number
  totalSellValue: number
  lowStock: number
  outOfStock: number
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products')
  const [products, setProducts] = useState<ProductStockItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<StockSummary>({
    totalProducts: 0,
    managedCount: 0,
    totalDigitalAccounts: 0,
    totalStockValue: 0,
    totalSellValue: 0,
    lowStock: 0,
    outOfStock: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'managed' | 'unmanaged' | 'out_of_stock'>('all')

  // Digital Account Vault Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [selectedProductForAccounts, setSelectedProductForAccounts] = useState<ProductStockItem | null>(null)
  const [digitalAccounts, setDigitalAccounts] = useState<any[]>([])
  const [newAccountsText, setNewAccountsText] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [isSavingAccounts, setIsSavingAccounts] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports?type=stock')
      const data = await res.json()
      if (data.products) setProducts(data.products)
      if (data.movements) setMovements(data.movements)
      if (data.summary) setSummary(data.summary)
    } catch (e) {
      toast.error('Gagal mengambil data stok')
    } finally {
      setLoading(false)
    }
  }

  // Account Modal Actions
  const handleOpenAccountModal = async (product: ProductStockItem) => {
    setSelectedProductForAccounts(product)
    setNewAccountsText('')
    setIsAccountModalOpen(true)
    fetchDigitalAccounts(product.id)
  }

  const fetchDigitalAccounts = async (productId: string) => {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/products/${productId}/accounts`)
      const data = await res.json()
      if (res.ok) {
        setDigitalAccounts(data.accounts || [])
      } else {
        toast.error(data.error || 'Gagal memuat akun')
      }
    } catch (err) {
      toast.error('Gagal mengambil data akun digital')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleSaveDigitalAccounts = async () => {
    if (!selectedProductForAccounts) return
    if (!newAccountsText.trim()) {
      toast.error('Mohon masukkan minimal 1 akun')
      return
    }

    setIsSavingAccounts(true)
    try {
      const res = await fetch(`/api/products/${selectedProductForAccounts.id}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newAccountsText }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Akun berhasil ditambahkan!')
        setNewAccountsText('')
        fetchDigitalAccounts(selectedProductForAccounts.id)
        fetchInventory() // refresh stock numbers
      } else {
        toast.error(data.error || 'Gagal menambahkan akun')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSavingAccounts(false)
    }
  }

  const handleDeleteDigitalAccount = async (accountId: string) => {
    if (!selectedProductForAccounts) return
    if (!confirm('Hapus akun ini dari stok?')) return

    try {
      const res = await fetch(
        `/api/products/${selectedProductForAccounts.id}/accounts?accountId=${accountId}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success('Akun dihapus dari stok')
        fetchDigitalAccounts(selectedProductForAccounts.id)
        fetchInventory()
      } else {
        toast.error(data.error || 'Gagal menghapus akun')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan')
    }
  }

  // Categories list for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category && p.category !== '-') set.add(p.category)
    })
    return Array.from(set).sort()
  }, [products])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory ? p.category === selectedCategory : true
      let matchType = true
      if (filterType === 'managed') matchType = p.manageStock
      if (filterType === 'unmanaged') matchType = !p.manageStock
      if (filterType === 'out_of_stock') matchType = p.manageStock && p.stock <= 0

      return matchSearch && matchCat && matchType
    })
  }, [products, search, selectedCategory, filterType])

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Stok & Inventori</h2>
          <p className="page-subtitle">
            Pantau stok produk, brankas akun digital, dan riwayat mutasi barang secara real-time
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchInventory}>
          <HiOutlineArrowPath size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <HiOutlineArchiveBox />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Total Produk</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {summary.totalProducts} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Produk</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <HiOutlineKey />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Stok Akun Digital (Vault)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>
              {summary.totalDigitalAccounts} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Akun Siap Kirim</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: summary.outOfStock > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              color: summary.outOfStock > 0 ? 'var(--accent-red)' : 'var(--accent-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <HiOutlineExclamationTriangle />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Stok Kritis / Habis</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: summary.outOfStock > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {summary.outOfStock} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Habis</span>
              {summary.lowStock > 0 && (
                <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--accent-yellow)' }}>
                  ({summary.lowStock} Menipis)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.12)',
              color: 'var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <HiOutlineBanknotes />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Nilai Modal Stok (HPP)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(summary.totalStockValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('products')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-md)' }}
        >
          <HiOutlineArchiveBox size={18} /> Stok Produk Saat Ini ({products.length})
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('movements')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-md)' }}
        >
          <HiOutlineArrowPath size={18} /> Riwayat Mutasi Stok ({movements.length})
        </button>
      </div>

      {/* TAB 1: STOK PRODUK SAAT INI */}
      {activeTab === 'products' && (
        <div>
          {/* Filters Bar */}
          <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 240px', minWidth: 200 }}>
              <HiOutlineMagnifyingGlass className="search-box-icon" />
              <input
                type="text"
                className="input"
                placeholder="Cari nama produk atau SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="select"
              style={{ minWidth: 150, width: 'auto', flexShrink: 0 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ minWidth: 160, width: 'auto', flexShrink: 0 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">Semua Tipe Stok</option>
              <option value="managed">🔑 Kelola Stok Digital (Vault)</option>
              <option value="unmanaged">📦 Bebas Stok</option>
              <option value="out_of_stock">⚠️ Stok Habis (0)</option>
            </select>
          </div>

          {/* Products Stock Table */}
          {loading ? (
            <div className="skeleton" style={{ height: 350 }} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Kategori</th>
                    <th>Tipe Manajemen</th>
                    <th>Sisa Stok</th>
                    <th>Harga Beli (HPP)</th>
                    <th>Harga Jual</th>
                    <th>Nilai Stok</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isOut = p.manageStock && p.stock <= 0
                    const isLow = p.manageStock && p.stock > 0 && p.stock <= p.minStock

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {p.image ? (
                                <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                p.categoryIcon || '📦'
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Satuan: {p.unit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono" style={{ fontSize: 12 }}>{p.sku}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${p.categoryColor}15`,
                              color: p.categoryColor,
                              border: `1px solid ${p.categoryColor}30`,
                            }}
                          >
                            {p.category}
                          </span>
                        </td>
                        <td>
                          {p.manageStock ? (
                            <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <HiOutlineKey size={12} /> Akun Digital (Vault)
                            </span>
                          ) : (
                            <span className="badge badge-blue">
                              Bebas Stok
                            </span>
                          )}
                        </td>
                        <td>
                          {p.manageStock ? (
                            <div>
                              <span
                                className={`badge ${
                                  isOut ? 'badge-red' : isLow ? 'badge-yellow' : 'badge-green'
                                } font-mono`}
                                style={{ fontWeight: 700, fontSize: 13 }}
                              >
                                {p.stock} akun
                              </span>
                              {isOut && <span style={{ fontSize: 10, color: 'var(--accent-red)', display: 'block', marginTop: 2 }}>Stok Habis!</span>}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                              Tanpa Batas
                            </span>
                          )}
                        </td>
                        <td className="font-mono">{formatCurrency(p.buyPrice)}</td>
                        <td className="font-mono" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                          {formatCurrency(p.sellPrice)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>
                          {formatCurrency(p.stockValue)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {p.manageStock ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                fontSize: 12,
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                              onClick={() => handleOpenAccountModal(p)}
                            >
                              <HiOutlineKey size={14} /> Kelola Akun ({p.availableAccounts})
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">Produk tidak ditemukan</div>
                  <div className="empty-state-desc">Coba sesuaikan kata kunci pencarian atau filter kategori</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT MUTASI STOK */}
      {activeTab === 'movements' && (
        <div>
          {loading ? (
            <div className="skeleton" style={{ height: 300 }} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal & Waktu</th>
                    <th>Nama Produk</th>
                    <th>SKU</th>
                    <th>Tipe Mutasi</th>
                    <th>Jumlah</th>
                    <th>Keterangan</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 13 }}>{formatDateTime(m.createdAt)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.product?.name}</td>
                      <td className="font-mono">{m.product?.sku}</td>
                      <td>
                        <span
                          className={`badge ${
                            m.type === 'IN' || m.type === 'PURCHASE'
                              ? 'badge-green'
                              : m.type === 'OUT' || m.type === 'SALE'
                              ? 'badge-red'
                              : 'badge-blue'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          fontWeight: 700,
                          color: m.quantity > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td>{m.note || '-'}</td>
                      <td>{m.user?.name || 'Sistem'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movements.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <div className="empty-state-title">Mutasi stok kosong</div>
                  <div className="empty-state-desc">Belum ada riwayat pergerakan barang masuk atau keluar</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Kelola Stok Akun Digital */}
      {isAccountModalOpen && selectedProductForAccounts && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🔑 Kelola Stok Akun: {selectedProductForAccounts.name}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Setiap kali ada pesanan di WA dengan format &quot;proses&quot;, 1 akun yang tersedia akan otomatis dikirimkan ke nomor admin.
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsAccountModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Form Tambah Akun Sekaligus */}
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label className="input-label" style={{ fontWeight: 600, marginBottom: 6 }}>
                  Tambah Stok Akun Sekaligus (1 Baris = 1 Akun)
                </label>
                <textarea
                  className="input font-mono"
                  rows={4}
                  value={newAccountsText}
                  onChange={(e) => setNewAccountsText(e.target.value)}
                  placeholder="Contoh:&#10;user1@gmail.com|pass123&#10;user2@gmail.com|pass456&#10;user3@gmail.com|pass789"
                  style={{ resize: 'vertical', fontSize: 13 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Tip: Masukkan format login bebas (email|pass, link invite, kode voucher, dll).
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSavingAccounts || !newAccountsText.trim()}
                    onClick={handleSaveDigitalAccounts}
                  >
                    {isSavingAccounts ? 'Menyimpan...' : '➕ Masukkan ke Stok'}
                  </button>
                </div>
              </div>

              {/* Daftar Akun yang Ada */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>
                    Daftar Akun di Brankas (
                    <span style={{ color: 'var(--accent-green)' }}>
                      {digitalAccounts.filter((a) => a.status === 'AVAILABLE').length} Tersedia
                    </span>
                    {', '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {digitalAccounts.filter((a) => a.status === 'SOLD').length} Terjual
                    </span>
                    )
                  </h4>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                    onClick={() => fetchDigitalAccounts(selectedProductForAccounts.id)}
                  >
                    🔄 Refresh
                  </button>
                </div>

                {loadingAccounts ? (
                  <div className="skeleton" style={{ height: 150 }} />
                ) : digitalAccounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Belum ada akun di dalam stok. Masukkan akun baru pada form di atas.
                  </div>
                ) : (
                  <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table" style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Data Akun</th>
                          <th>Waktu</th>
                          <th style={{ textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {digitalAccounts.map((acc) => (
                          <tr key={acc.id} style={{ opacity: acc.status === 'SOLD' ? 0.6 : 1 }}>
                            <td>
                              {acc.status === 'AVAILABLE' ? (
                                <span className="badge badge-green">Tersedia</span>
                              ) : (
                                <span className="badge badge-blue">
                                  Terjual ({acc.transaction?.receiptNo || 'POS'})
                                </span>
                              )}
                            </td>
                            <td className="font-mono" style={{ wordBreak: 'break-all', maxWidth: 280 }}>
                              {acc.accountData}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {new Date(acc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {acc.status === 'AVAILABLE' && (
                                <button
                                  type="button"
                                  className="btn btn-icon btn-ghost"
                                  style={{ color: 'var(--accent-red)' }}
                                  onClick={() => handleDeleteDigitalAccount(acc.id)}
                                  title="Hapus akun dari stok"
                                >
                                  <HiOutlineTrash size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAccountModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
