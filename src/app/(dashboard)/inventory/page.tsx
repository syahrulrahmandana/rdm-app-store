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
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineBolt,
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

interface RestockPredictionItem {
  productId: string
  productName: string
  sku: string
  currentStock: number
  manageStock: boolean
  soldLast7Days: number
  dailyBurnRate: number
  daysUntilDepleted: number
  urgency: 'CRITICAL' | 'WARNING' | 'SAFE'
  urgencyLabel: string
  recommendedRestockQty: number
  aiAdvice: string
}

interface RestockData {
  items: RestockPredictionItem[]
  criticalCount: number
  warningCount: number
}

interface ParsedBatchAccount {
  id: string
  accountData: string
  email?: string
  password?: string
  notes?: string
  selected: boolean
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

  // Digital Account Vault Modal (Single Product)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [selectedProductForAccounts, setSelectedProductForAccounts] = useState<ProductStockItem | null>(null)
  const [digitalAccounts, setDigitalAccounts] = useState<any[]>([])
  const [newAccountsText, setNewAccountsText] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [isSavingAccounts, setIsSavingAccounts] = useState(false)
  const [isParsingInlineAI, setIsParsingInlineAI] = useState(false)

  // FEATURE 1: Standalone AI Smart Batch Account Parser Modal
  const [isBatchParserModalOpen, setIsBatchParserModalOpen] = useState(false)
  const [batchSelectedProductId, setBatchSelectedProductId] = useState('')
  const [batchRawText, setBatchRawText] = useState('')
  const [isParsingBatchAI, setIsParsingBatchAI] = useState(false)
  const [batchParsedAccounts, setBatchParsedAccounts] = useState<ParsedBatchAccount[]>([])
  const [isSavingBatch, setIsSavingBatch] = useState(false)

  // FEATURE 3: AI Smart Restock Predictor Modal
  const [restockData, setRestockData] = useState<RestockData | null>(null)
  const [loadingRestock, setLoadingRestock] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [restockFilter, setRestockFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SAFE'>('ALL')
  const [restockSearch, setRestockSearch] = useState('')

  useEffect(() => {
    fetchInventory()
    fetchRestockPredictions()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports?type=stock')
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
        if (!batchSelectedProductId && data.products.length > 0) {
          const firstManaged = data.products.find((p: ProductStockItem) => p.manageStock)
          setBatchSelectedProductId(firstManaged ? firstManaged.id : data.products[0].id)
        }
      }
      if (data.movements) setMovements(data.movements)
      if (data.summary) setSummary(data.summary)
    } catch (e) {
      toast.error('Gagal mengambil data stok')
    } finally {
      setLoading(false)
    }
  }

  const fetchRestockPredictions = async () => {
    setLoadingRestock(true)
    try {
      const res = await fetch('/api/ai/restock-predictor')
      const json = await res.json()
      if (res.ok && json.success) {
        setRestockData({
          items: json.items || [],
          criticalCount: json.criticalCount || 0,
          warningCount: json.warningCount || 0,
        })
      }
    } catch (err) {
      console.error('Failed to load restock predictions:', err)
    } finally {
      setLoadingRestock(false)
    }
  }

  // Account Modal Actions (Single Product)
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
        fetchInventory()
        fetchRestockPredictions()
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
        fetchRestockPredictions()
      } else {
        toast.error(data.error || 'Gagal menghapus akun')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan')
    }
  }

  // FEATURE 1: Inline AI Parser in Vault Modal
  const handleParseInlineWithAI = async () => {
    if (!newAccountsText.trim()) {
      toast.error('Tempel teks akun mentah terlebih dahulu')
      return
    }
    setIsParsingInlineAI(true)
    try {
      const res = await fetch('/api/ai/parse-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: newAccountsText,
          productId: selectedProductForAccounts?.id,
          productName: selectedProductForAccounts?.name,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.accounts?.length) {
        const cleanLines = data.accounts.map((a: any) => a.accountData).join('\n')
        setNewAccountsText(cleanLines)
        toast.success(`✨ Gemini AI berhasil merapikan ${data.accounts.length} akun!`)
      } else {
        toast.error(data.error || 'AI tidak dapat mendeteksi akun valid')
      }
    } catch (e) {
      toast.error('Gagal mengekstrak akun dengan AI')
    } finally {
      setIsParsingInlineAI(false)
    }
  }

  // FEATURE 1: Standalone Batch Parser Handlers
  const handleOpenBatchParserForProduct = (productId?: string) => {
    if (productId) {
      setBatchSelectedProductId(productId)
    } else if (!batchSelectedProductId && products.length > 0) {
      const firstManaged = products.find((p) => p.manageStock)
      setBatchSelectedProductId(firstManaged ? firstManaged.id : products[0].id)
    }
    setBatchRawText('')
    setBatchParsedAccounts([])
    setIsBatchParserModalOpen(true)
  }

  const handleRunBatchAI = async () => {
    if (!batchRawText.trim()) {
      toast.error('Tempel teks akun mentah dari supplier terlebih dahulu')
      return
    }
    const targetProduct = products.find((p) => p.id === batchSelectedProductId)

    setIsParsingBatchAI(true)
    try {
      const res = await fetch('/api/ai/parse-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: batchRawText,
          productId: batchSelectedProductId,
          productName: targetProduct?.name,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.accounts?.length) {
        const parsedList: ParsedBatchAccount[] = data.accounts.map((acc: any, idx: number) => ({
          id: `batch-${Date.now()}-${idx}`,
          accountData: acc.accountData,
          email: acc.email,
          password: acc.password,
          notes: acc.notes,
          selected: true,
        }))
        setBatchParsedAccounts(parsedList)
        toast.success(`✨ Gemini AI berhasil mendeteksi ${parsedList.length} akun!`)
      } else {
        toast.error(data.error || 'AI tidak dapat mendeteksi akun valid dari teks tersebut.')
      }
    } catch (err) {
      toast.error('Gagal memproses parsing dengan AI')
    } finally {
      setIsParsingBatchAI(false)
    }
  }

  const handleToggleSelectAllBatch = () => {
    const allSelected = batchParsedAccounts.every((a) => a.selected)
    setBatchParsedAccounts((prev) => prev.map((a) => ({ ...a, selected: !allSelected })))
  }

  const handleToggleSelectAccount = (id: string) => {
    setBatchParsedAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    )
  }

  const handleDeleteBatchItem = (id: string) => {
    setBatchParsedAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSaveBatchParsedAccounts = async () => {
    if (!batchSelectedProductId) {
      toast.error('Pilih produk tujuan terlebih dahulu')
      return
    }
    const selectedItems = batchParsedAccounts.filter((a) => a.selected && a.accountData.trim())
    if (!selectedItems.length) {
      toast.error('Pilih minimal 1 akun untuk disimpan')
      return
    }

    const targetProduct = products.find((p) => p.id === batchSelectedProductId)

    setIsSavingBatch(true)
    try {
      const res = await fetch(`/api/products/${batchSelectedProductId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: selectedItems.map((a) => a.accountData.trim()),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Berhasil memasukkan ${selectedItems.length} akun ke stok ${targetProduct?.name || ''}!`)
        setIsBatchParserModalOpen(false)
        setBatchRawText('')
        setBatchParsedAccounts([])
        fetchInventory()
        fetchRestockPredictions()
      } else {
        toast.error(data.error || 'Gagal menyimpan akun')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan akun')
    } finally {
      setIsSavingBatch(false)
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

  // Filtered Restock Items
  const filteredRestockItems = useMemo(() => {
    if (!restockData?.items) return []
    return restockData.items.filter((item) => {
      const matchesFilter =
        restockFilter === 'ALL' ? true : restockFilter === item.urgency
      const matchesSearch =
        item.productName.toLowerCase().includes(restockSearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(restockSearch.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [restockData, restockFilter, restockSearch])

  const safeRestockCount = useMemo(() => {
    if (!restockData?.items) return 0
    return restockData.items.filter((i) => i.urgency === 'SAFE').length
  }, [restockData])

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Stok &amp; Inventori</h2>
          <p className="page-subtitle">
            Pantau stok produk, brankas akun digital, dan analisis restock cerdas real-time
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsRestockModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <HiOutlineClock size={16} /> Prediksi Stok (AI)
            {restockData && (restockData.criticalCount > 0 || restockData.warningCount > 0) && (
              <span
                className="badge badge-red"
                style={{ fontSize: 10, padding: '2px 6px', marginLeft: 4 }}
              >
                {restockData.criticalCount + restockData.warningCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleOpenBatchParserForProduct()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <HiOutlineSparkles size={16} /> Batch Parser Akun (AI)
          </button>
          <button className="btn btn-ghost" onClick={() => { fetchInventory(); fetchRestockPredictions(); }}>
            <HiOutlineArrowPath size={16} /> Refresh
          </button>
        </div>
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

      {/* FEATURE 3: AI Restock Warning Banner */}
      {restockData && (restockData.criticalCount > 0 || restockData.warningCount > 0) && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              <HiOutlineExclamationTriangle />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Peringatan Stok AI: {restockData.criticalCount} Produk Kritis &amp; {restockData.warningCount} Produk Menipis</span>
                <span className="badge badge-red" style={{ fontSize: 11 }}>Perhatian Segera</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Berdasarkan laju penjualan riil 7 hari terakhir, stok akun diperkirakan habis dalam &lt; 24-48 jam.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsRestockModalOpen(true)}
            >
              <HiOutlineClock size={15} /> Buka Prediksi Stok AI
            </button>
          </div>
        </div>
      )}

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
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  fontSize: 12,
                                  padding: '6px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onClick={() => handleOpenBatchParserForProduct(p.id)}
                                title="Input Akun Massal Cerdas dengan AI"
                              >
                                <HiOutlineSparkles size={13} color="var(--accent-purple)" /> Input AI
                              </button>
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
                                <HiOutlineKey size={14} /> Brankas ({p.availableAccounts})
                              </button>
                            </div>
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
                    <th>Tanggal &amp; Waktu</th>
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

      {/* MODAL 1: Kelola Stok Akun Digital (Single Product Vault) */}
      {isAccountModalOpen && selectedProductForAccounts && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🔑 Brankas Akun: {selectedProductForAccounts.name}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Setiap kali ada pesanan di WA dengan format &quot;proses&quot;, 1 akun yang tersedia akan otomatis dikirimkan ke admin/pembeli.
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsAccountModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Form Tambah Akun Sekaligus */}
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <label className="input-label" style={{ fontWeight: 600, margin: 0 }}>
                    Tambah Stok Akun (1 Baris = 1 Akun)
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isParsingInlineAI || !newAccountsText.trim()}
                    onClick={handleParseInlineWithAI}
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      height: 'auto',
                      color: 'var(--accent-purple)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      background: 'rgba(168, 85, 247, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Merapikan format teks acak dari supplier secara otomatis"
                  >
                    <HiOutlineSparkles size={14} />
                    {isParsingInlineAI ? 'Merapikan dengan AI...' : '✨ Parse Otomatis AI'}
                  </button>
                </div>
                <textarea
                  className="input font-mono"
                  rows={4}
                  value={newAccountsText}
                  onChange={(e) => setNewAccountsText(e.target.value)}
                  placeholder="Contoh:&#10;user1@gmail.com|pass123&#10;user2@gmail.com|pass456&#10;&#10;Tip: Bisa tempel teks mentah/acak dari supplier lalu klik '✨ Parse Otomatis AI'"
                  style={{ resize: 'vertical', fontSize: 13 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
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

      {/* FEATURE 1: STANDALONE AI SMART BATCH ACCOUNT PARSER MODAL */}
      {isBatchParserModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 840 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiOutlineSparkles style={{ color: 'var(--accent-purple)' }} />
                  AI Smart Batch Account Parser
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Ekstrak otomatis akun digital massal dari teks mentah supplier (chat WhatsApp, format acak, tabel, dsb) menggunakan Google Gemini.
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsBatchParserModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Product Selector */}
              <div>
                <label className="input-label" style={{ fontWeight: 600, marginBottom: 6 }}>
                  1. Pilih Produk Digital Tujuan
                </label>
                <select
                  className="select"
                  value={batchSelectedProductId}
                  onChange={(e) => setBatchSelectedProductId(e.target.value)}
                  style={{ width: '100%', fontSize: 14 }}
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {p.manageStock ? `🔑 Brankas: ${p.stock} akun` : `📦 Stok: ${p.stock}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Raw Input Box */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="input-label" style={{ fontWeight: 600, margin: 0 }}>
                    2. Tempel Teks Mentah dari Supplier / WhatsApp
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Format acak, nomor urut, email pass pin terpisah didukung otomatis
                  </span>
                </div>
                <textarea
                  className="input font-mono"
                  rows={5}
                  value={batchRawText}
                  onChange={(e) => setBatchRawText(e.target.value)}
                  placeholder={`Contoh teks mentah supplier:&#10;NETFLIX 1 BULAN 4U 1P ULTRA HD:&#10;1. user1@gmail.com pass: rahasia123 pin 1234 garansi 30 hari&#10;2. Email : user2@yahoo.com | Sandi: pass999 | PIN: 8888&#10;3. Akun: user3@gmail.com - Pass: abcde123`}
                  style={{ resize: 'vertical', fontSize: 13 }}
                />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isParsingBatchAI || !batchRawText.trim()}
                    onClick={handleRunBatchAI}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <HiOutlineSparkles size={16} />
                    {isParsingBatchAI ? 'Sedang Menganalisis dengan Gemini AI...' : '✨ Ekstrak & Format Cerdas dengan AI'}
                  </button>
                </div>
              </div>

              {/* Parsed Preview Table */}
              {batchParsedAccounts.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>
                        3. Hasil Ekstrak AI ({batchParsedAccounts.filter((a) => a.selected).length}/{batchParsedAccounts.length} Terpilih)
                      </h4>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '2px 8px', height: 'auto' }}
                        onClick={handleToggleSelectAllBatch}
                      >
                        {batchParsedAccounts.every((a) => a.selected) ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </button>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Periksa data sebelum dimasukkan ke stok
                    </span>
                  </div>

                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>✓</th>
                          <th>Data Akun (Akan Disimpan)</th>
                          <th>Email / Akun</th>
                          <th>Password / PIN</th>
                          <th>Catatan</th>
                          <th style={{ width: 40, textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchParsedAccounts.map((item) => (
                          <tr key={item.id} style={{ opacity: item.selected ? 1 : 0.5 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleSelectAccount(item.id)}
                              />
                            </td>
                            <td className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.accountData}
                            </td>
                            <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                              {item.email || '-'}
                            </td>
                            <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                              {item.password || '-'}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {item.notes || '-'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-icon btn-ghost"
                                style={{ color: 'var(--accent-red)', padding: 4 }}
                                onClick={() => handleDeleteBatchItem(item.id)}
                                title="Hapus baris ini"
                              >
                                <HiOutlineTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setIsBatchParserModalOpen(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  isSavingBatch ||
                  !batchSelectedProductId ||
                  batchParsedAccounts.filter((a) => a.selected).length === 0
                }
                onClick={handleSaveBatchParsedAccounts}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <HiOutlineCheckCircle size={16} />
                {isSavingBatch
                  ? 'Menyimpan ke Database...'
                  : `💾 Simpan ${batchParsedAccounts.filter((a) => a.selected).length} Akun ke Stok`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 3: AI SMART RESTOCK PREDICTOR MODAL */}
      {isRestockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 920 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiOutlineClock style={{ color: 'var(--accent-red)' }} />
                  AI Smart Restock Predictor
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Prediksi laju kehabisan stok semua produk digital &amp; fisik (Burn Rate) berdasarkan histori penjualan 7 hari terakhir dengan saran restock cerdas dari Gemini AI.
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsRestockModalOpen(false)}>×</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary Cards */}
              <div className="grid-3" style={{ gap: 12 }}>
                <div
                  className="card"
                  style={{
                    padding: 14,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--accent-red)', fontWeight: 600 }}>🚨 KRITIS (&lt; 24-36 Jam)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-red)', marginTop: 4 }}>
                    {restockData?.criticalCount || 0}{' '}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Produk</span>
                  </div>
                </div>

                <div
                  className="card"
                  style={{
                    padding: 14,
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--accent-yellow)', fontWeight: 600 }}>⚠️ MENIPIS (2-3 Hari)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-yellow)', marginTop: 4 }}>
                    {restockData?.warningCount || 0}{' '}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Produk</span>
                  </div>
                </div>

                <div
                  className="card"
                  style={{
                    padding: 14,
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>🟢 STOK AMAN (&gt; 4 Hari)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)', marginTop: 4 }}>
                    {safeRestockCount}{' '}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>Produk</span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`btn ${restockFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                    onClick={() => setRestockFilter('ALL')}
                  >
                    Semua ({restockData?.items.length || 0})
                  </button>
                  <button
                    className={`btn ${restockFilter === 'CRITICAL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                    onClick={() => setRestockFilter('CRITICAL')}
                  >
                    🚨 Kritis ({restockData?.criticalCount || 0})
                  </button>
                  <button
                    className={`btn ${restockFilter === 'WARNING' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                    onClick={() => setRestockFilter('WARNING')}
                  >
                    ⚠️ Menipis ({restockData?.warningCount || 0})
                  </button>
                  <button
                    className={`btn ${restockFilter === 'SAFE' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                    onClick={() => setRestockFilter('SAFE')}
                  >
                    🟢 Aman ({safeRestockCount})
                  </button>
                </div>

                <div className="search-box" style={{ width: 220 }}>
                  <HiOutlineMagnifyingGlass className="search-box-icon" />
                  <input
                    type="text"
                    className="input"
                    placeholder="Cari produk..."
                    value={restockSearch}
                    onChange={(e) => setRestockSearch(e.target.value)}
                    style={{ padding: '6px 10px 6px 32px', fontSize: 12 }}
                  />
                </div>
              </div>

              {/* Restock Items Table */}
              {loadingRestock ? (
                <div className="skeleton" style={{ height: 260 }} />
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table className="table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Stok Sekarang</th>
                        <th>Terjual (7 Hari)</th>
                        <th>Laju Penjualan</th>
                        <th>Estimasi Habis</th>
                        <th>Saran Restock &amp; AI Advice</th>
                        <th style={{ textAlign: 'right' }}>Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRestockItems.map((item) => {
                        const isCritical = item.urgency === 'CRITICAL'
                        const isWarning = item.urgency === 'WARNING'

                        return (
                          <tr key={item.productId} style={{ background: isCritical ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {item.productName}
                                </span>
                                {item.manageStock ? (
                                  <span className="badge badge-purple" style={{ fontSize: 10, padding: '1px 5px' }}>
                                    🔑 Brankas
                                  </span>
                                ) : (
                                  <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 5px' }}>
                                    📦 Umum
                                  </span>
                                )}
                              </div>
                              <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {item.sku}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  item.currentStock <= 0
                                    ? 'badge-red'
                                    : item.currentStock <= 5
                                    ? 'badge-yellow'
                                    : 'badge-green'
                                } font-mono`}
                                style={{ fontWeight: 700 }}
                              >
                                {item.currentStock} {item.manageStock ? 'akun' : 'unit'}
                              </span>
                            </td>
                            <td className="font-mono">{item.soldLast7Days} pcs</td>
                            <td className="font-mono">
                              <span style={{ fontWeight: 600 }}>{item.dailyBurnRate}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                                {item.manageStock ? 'akun/hari' : 'unit/hari'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  isCritical ? 'badge-red' : isWarning ? 'badge-yellow' : 'badge-green'
                                }`}
                                style={{ fontSize: 11, fontWeight: 600 }}
                              >
                                {item.urgencyLabel}
                              </span>
                            </td>
                            <td style={{ maxWidth: 260, fontSize: 12 }}>
                              <div style={{ fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 2 }}>
                                Rekomendasi: +{item.recommendedRestockQty} {item.manageStock ? 'akun' : 'unit'}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.3 }}>
                                {item.aiAdvice}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  fontSize: 11,
                                  padding: '5px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: isCritical ? 'var(--accent-red)' : undefined,
                                }}
                                onClick={() => {
                                  setIsRestockModalOpen(false)
                                  handleOpenBatchParserForProduct(item.productId)
                                }}
                              >
                                <HiOutlineSparkles size={12} /> Isi Stok AI
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredRestockItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      Tidak ada produk pada kategori ini
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={fetchRestockPredictions}
                style={{ fontSize: 12 }}
              >
                🔄 Refresh Prediksi
              </button>
              <button className="btn btn-secondary" onClick={() => setIsRestockModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
