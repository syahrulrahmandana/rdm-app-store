'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, getPaymentMethodLabel } from '@/lib/utils'
import {
  HiOutlineArrowDownTray,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineSparkles,
  HiOutlineLightBulb,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

interface ReportSummary {
  totalSales: number
  totalTransactions: number
  totalItems: number
  totalProfit: number
  totalCapital: number
}

interface ChartItem {
  date: string
  totalSales: number
  totalProfit: number
  count: number
  items: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
  profit: number
}

interface PaymentMethod {
  method: string
  count: number
  total: number
}

interface TransactionItemDetail {
  id: string
  productName: string
  quantity: number
  price: number
  buyPrice: number
  subtotal: number
}

interface TransactionItem {
  id: string
  receiptNo: string
  total: number
  subtotal?: number
  discount?: number
  profit: number
  paymentMethod: string
  paymentAmount?: number
  changeAmount?: number
  note?: string | null
  itemCount: number
  userName: string
  customerName?: string | null
  customerPhone?: string | null
  items: TransactionItemDetail[]
  createdAt: string
}

interface ReportData {
  summary: ReportSummary
  chartData: ChartItem[]
  topProducts: TopProduct[]
  paymentMethods: PaymentMethod[]
  transactions: TransactionItem[]
}

const COLORS = ['#FF731D', '#1746A2', '#5F9DF7', '#10b981', '#ef4444', '#8b5cf6']

export default function ReportsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  // Void modal states
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false)
  const [voidingTxId, setVoidingTxId] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false)

  // Store info for receipts
  const [storeInfo, setStoreInfo] = useState<{
    name: string
    address?: string | null
    phone?: string | null
  } | null>(null)

  // Receipt modal states for reprinting
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionItem | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // AI Business Advisor States
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false)
  const [advisorData, setAdvisorData] = useState<any | null>(null)
  const [loadingAdvisor, setLoadingAdvisor] = useState(false)

  const fetchBusinessAdvisor = async () => {
    setLoadingAdvisor(true)
    setIsAdvisorModalOpen(true)
    try {
      let query = `?groupBy=${groupBy}`
      if (dateFrom) query += `&dateFrom=${dateFrom}`
      if (dateTo) query += `&dateTo=${dateTo}`
      const res = await fetch(`/api/ai/business-advisor${query}`)
      const json = await res.json()
      if (res.ok && json.success) {
        setAdvisorData(json.advisor)
      } else {
        toast.error(json.error || 'Gagal memuat analisis bisnis')
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat memproses analisis AI')
    } finally {
      setLoadingAdvisor(false)
    }
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((s) => {
        if (s && !s.error) setStoreInfo(s)
      })
      .catch(() => {})
  }, [])

  const handlePrintReceipt = (tx: TransactionItem) => {
    setSelectedReceipt(tx)
    setIsReceiptOpen(true)
  }

  const triggerBrowserPrint = () => {
    window.print()
  }

  useEffect(() => {
    fetchReport()
  }, [dateFrom, dateTo, groupBy])

  const fetchReport = async () => {
    try {
      let query = `?groupBy=${groupBy}`
      if (dateFrom) query += `&dateFrom=${dateFrom}`
      if (dateTo) query += `&dateTo=${dateTo}`

      const res = await fetch(`/api/reports${query}`)
      const report = await res.json()
      setData(report)
    } catch (e) {
      toast.error('Gagal mengambil laporan')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!data) return
    
    // Gunakan BOM UTF-8 (\ufeff) dan sep=, agar Excel otomatis membaca koma sebagai pemisah kolom secara rapi
    let csvContent = '\ufeffsep=,\n'
    
    // 1. RINGKASAN LAPORAN
    csvContent += '=== RINGKASAN LAPORAN PENJUALAN ===\n'
    csvContent += 'Total Penjualan,Total Transaksi,Total Item Terjual,Total Keuntungan (Estimasi Profit),Total Modal Keluar\n'
    csvContent += `${data.summary.totalSales},${data.summary.totalTransactions},${data.summary.totalItems},${data.summary.totalProfit},${data.summary.totalCapital}\n\n`
    
    // 2. DAFTAR DETAIL TRANSAKSI
    csvContent += '=== DAFTAR DETAIL TRANSAKSI ===\n'
    csvContent += 'Nomor Struk,Tanggal & Waktu,Kasir,Produk / Aplikasi,Metode Pembayaran,Jumlah Barang,Total Belanja,Keuntungan (Profit)\n'
    data.transactions.forEach((t) => {
      const formattedDate = new Date(t.createdAt).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(',', '') // Hapus koma pemisah detik/menit untuk keamanan CSV
      const productsStr = (t.items || []).map((i) => `${i.productName} (${i.quantity}x)`).join('; ') || 'Item'
      csvContent += `${t.receiptNo},${formattedDate},${t.userName},"${productsStr.replace(/"/g, '""')}",${t.paymentMethod},${t.itemCount},${t.total},${t.profit || 0}\n`
    })
    csvContent += '\n'
    
    // 3. DAFTAR PRODUK TERLARIS
    csvContent += '=== PRODUK TERLARIS ===\n'
    csvContent += 'Nama Produk,Jumlah Terjual,Total Pendapatan (Omset),Total Keuntungan (Profit)\n'
    data.topProducts.forEach((p) => {
      csvContent += `${p.name.replace(/,/g, ' ')},${p.quantity},${p.revenue},${p.profit}\n`
    })
    
    // Buat Blob agar data besar aman terdownload tanpa limitasi URL browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `laporan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Laporan penjualan lengkap berhasil di-export ke CSV!')
  }

  const handleVoidTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voidReason.trim()) {
      toast.error('Alasan pembatalan harus diisi')
      return
    }

    setIsSubmittingVoid(true)
    try {
      const res = await fetch(`/api/transactions/${voidingTxId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: voidReason,
          userId: (session?.user as any)?.id || null
        })
      })

      const result = await res.json()
      if (res.ok) {
        toast.success('Transaksi berhasil dibatalkan')
        setIsVoidModalOpen(false)
        setVoidReason('')
        setVoidingTxId('')
        fetchReport()
      } else {
        toast.error(result.error || 'Gagal membatalkan transaksi')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setIsSubmittingVoid(false)
    }
  }

  const openVoidModal = (id: string) => {
    setVoidingTxId(id)
    setVoidReason('')
    setIsVoidModalOpen(true)
  }

  if (loading) {
    return <div className="skeleton" style={{ height: 500 }} />
  }

  if (!data) return <div>Gagal memuat laporan</div>

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Filters Toolbar */}
      <div className="page-toolbar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="page-title" style={{ margin: 0 }}>Laporan Penjualan & Pendapatan</h2>
            <span className="badge badge-purple" style={{ fontSize: 11, padding: '4px 10px', fontWeight: 600 }}>
              {!dateFrom && !dateTo ? (
                groupBy === 'day' ? 'Hari Ini' :
                groupBy === 'week' ? 'Minggu Ini' : 'Bulan Ini'
              ) : 'Rentang Kustom'}
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>Pantau performa harian, produk terlaris, dan laba kotor toko Anda</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineCalendar color="var(--text-muted)" />
            <input
              type="date"
              className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, minWidth: 120, flex: 1, maxWidth: 160, color: 'var(--text-primary)' }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: 'var(--text-muted)' }}>s/d</span>
            <input
              type="date"
              className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, minWidth: 120, flex: 1, maxWidth: 160, color: 'var(--text-primary)' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ minWidth: 100, flex: 1, maxWidth: 150 }}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
          >
            <option value="day">Harian</option>
            <option value="week">Mingguan</option>
            <option value="month">Bulanan</option>
          </select>

          <button className="btn btn-ghost" onClick={exportCSV}>
            <HiOutlineArrowDownTray size={16} /> Export CSV
          </button>

          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
              cursor: 'pointer',
            }}
            onClick={fetchBusinessAdvisor}
          >
            <HiOutlineSparkles size={16} />
            <span>💡 Analisis Bisnis (AI)</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid-stats">
        <div className="stat-card green">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total Penjualan</div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-green)' }}>
            {formatCurrency(data.summary.totalSales)}
          </div>
        </div>

        <div className="stat-card purple">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Laba Kotor (Profit)</div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-purple)' }}>
            {formatCurrency(data.summary.totalProfit)}
          </div>
        </div>

        <div className="stat-card blue">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Jumlah Transaksi</div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-blue)' }}>
            {formatNumber(data.summary.totalTransactions)}
          </div>
        </div>

        <div className="stat-card orange">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total Modal Keluar</div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-orange)' }}>
            {formatCurrency(data.summary.totalCapital)}
          </div>
        </div>
      </div>

      {/* Main Revenue Chart */}
      <div className="chart-container">
        <h3 className="chart-title" style={{ marginBottom: 20 }}>📈 Trend Omset Penjualan & Profit</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.chartData}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF731D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF731D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5F9DF7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5F9DF7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip />
            <Area type="monotone" name="Penjualan" dataKey="totalSales" stroke="#FF731D" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
            <Area type="monotone" name="Profit" dataKey="totalProfit" stroke="#5F9DF7" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Split Row for Terlaris & Metode Pembayaran */}
      <div className="grid-2">
        {/* Top Selling Products */}
        <div className="chart-container">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>🏆 Produk Terlaris</h3>
          <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Terjual</th>
                  <th>Total Pendapatan</th>
                  <th>Estimasi Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>{p.quantity} pcs</td>
                    <td className="font-mono">{formatCurrency(p.revenue)}</td>
                    <td className="font-mono" style={{ color: 'var(--accent-green)' }}>{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="chart-container">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>💳 Distribusi Metode Pembayaran</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="total"
                nameKey="method"
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="form-grid" style={{ gap: 12, marginTop: 16 }}>
            {data.paymentMethods.map((pm, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                <span style={{ color: 'var(--text-secondary)' }}>{getPaymentMethodLabel(pm.method)}:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{formatCurrency(pm.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daftar Transaksi Terbaru */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📝 Daftar Transaksi Terbaru</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Rincian produk/aplikasi yang dibeli, profit bersih, serta cetak ulang struk thermal.
            </p>
          </div>
          <span className="badge badge-blue" style={{ fontSize: 12 }}>
            {data.transactions.length} Transaksi Ditampilkan
          </span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>No. Nota</th>
                <th>Aplikasi / Produk</th>
                <th>Kasir</th>
                <th>Metode</th>
                <th>Total Belanja</th>
                <th>Profit (Laba)</th>
                <th style={{ textAlign: 'center' }}>Struk</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id}>
                  {/* Waktu */}
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </div>
                  </td>

                  {/* No. Nota & Customer */}
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600, fontSize: 12 }}>
                      {tx.receiptNo}
                    </span>
                    {tx.customerName && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        👤 {tx.customerName}
                      </div>
                    )}
                  </td>

                  {/* Aplikasi / Produk yang Dibeli */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tx.items && tx.items.length > 0 ? (
                        tx.items.map((it, itIdx) => (
                          <div key={it.id || itIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                fontSize: 13,
                              }}
                            >
                              {it.productName}
                            </span>
                            <span
                              className="badge"
                              style={{
                                fontSize: 10,
                                padding: '1px 6px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: 'var(--accent-purple)',
                                fontWeight: 600,
                              }}
                            >
                              {it.quantity}x
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Kasir */}
                  <td>
                    <span style={{ fontSize: 13 }}>{tx.userName}</span>
                  </td>

                  {/* Metode Bayar */}
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>
                      {getPaymentMethodLabel(tx.paymentMethod)}
                    </span>
                  </td>

                  {/* Total Belanja */}
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(tx.total)}
                  </td>

                  {/* Profit (Laba Bersih) */}
                  <td>
                    <div
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        color: (tx.profit || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontSize: 13,
                      }}
                    >
                      {formatCurrency(tx.profit || 0)}
                    </div>
                    {tx.total > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {Math.round(((tx.profit || 0) / tx.total) * 100)}% margin
                      </div>
                    )}
                  </td>

                  {/* Tombol Cetak Struk Ulang */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => handlePrintReceipt(tx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}
                      title="Cetak Struk Transaksi Ulang"
                    >
                      <HiOutlinePrinter size={15} />
                      <span>Cetak Struk</span>
                    </button>
                  </td>

                  {/* Tombol Void */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      style={{ color: 'var(--accent-red)' }}
                      onClick={() => openVoidModal(tx.id)}
                      title="Batalkan Transaksi (Void)"
                    >
                      <HiOutlineTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.transactions.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Belum ada transaksi pada periode ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cetak Struk Ulang */}
      {isReceiptOpen && selectedReceipt && (
        <div className="modal-overlay" onClick={() => setIsReceiptOpen(false)}>
          <div
            className="modal-content animate-slide-up"
            style={{ maxWidth: 360, background: '#fff', color: '#000', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Dialog (Hanya tampil di layar, disembunyikan saat print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                <HiOutlinePrinter size={18} color="#2563eb" />
                <span>Cetak Ulang Struk</span>
              </div>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setIsReceiptOpen(false)}
                style={{ color: '#64748b', fontSize: 18 }}
              >
                ×
              </button>
            </div>

            {/* Template Struk Thermal POS */}
            <div className="receipt">
              <div className="receipt-header">
                <h3 style={{ fontSize: 16, margin: 0, textTransform: 'uppercase', fontWeight: 800 }}>
                  {storeInfo?.name || 'RDM APP STORE'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#334155' }}>
                  {storeInfo?.address || 'Layanan Akun & Produk Digital Premium'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#334155' }}>
                  WA/CS: {storeInfo?.phone || '087844538339'}
                </p>
              </div>

              <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No. Nota:</span>
                  <span style={{ fontWeight: 700 }}>{selectedReceipt.receiptNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tanggal:</span>
                  <span>
                    {new Date(selectedReceipt.createdAt).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })} WIB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kasir:</span>
                  <span>{selectedReceipt.userName || 'Admin'}</span>
                </div>
                {selectedReceipt.customerName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Customer:</span>
                    <span>{selectedReceipt.customerName}</span>
                  </div>
                )}
              </div>

              <div className="receipt-divider" />

              {/* Rincian Produk / Aplikasi yang dibeli */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(selectedReceipt.items || []).map((item, idx) => (
                  <div key={item.id || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 11 }}>
                      <span>{item.productName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
                      <span>
                        {item.quantity} x {formatCurrency(item.price)}
                      </span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider" />

              {/* Rincian Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedReceipt.subtotal ?? selectedReceipt.total)}</span>
                </div>
                {typeof selectedReceipt.discount === 'number' && selectedReceipt.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Diskon:</span>
                    <span>-{formatCurrency(selectedReceipt.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, marginTop: 2 }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedReceipt.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Metode:</span>
                  <span>{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</span>
                </div>
                {selectedReceipt.paymentAmount && selectedReceipt.paymentAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bayar:</span>
                    <span>{formatCurrency(selectedReceipt.paymentAmount)}</span>
                  </div>
                )}
                {selectedReceipt.changeAmount && selectedReceipt.changeAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kembalian:</span>
                    <span>{formatCurrency(selectedReceipt.changeAmount)}</span>
                  </div>
                )}
              </div>

              {selectedReceipt.note && (
                <>
                  <div className="receipt-divider" />
                  <div style={{ fontSize: 10, color: '#475569' }}>
                    <span>Catatan: {selectedReceipt.note}</span>
                  </div>
                </>
              )}

              <div className="receipt-divider" />

              <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Terima Kasih Atas Pembelian Anda!</p>
                <p style={{ margin: '2px 0 0' }}>Simpan struk ini sebagai bukti pembayaran resmi.</p>
              </div>
            </div>

            {/* Footer Aksi Dialog (Disembunyikan saat print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                gap: 8,
                padding: 14,
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, color: '#475569' }}
                onClick={() => setIsReceiptOpen(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onClick={triggerBrowserPrint}
              >
                <HiOutlinePrinter size={16} />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alasan Pembatalan (Void) */}
      {isVoidModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Alasan Pembatalan Transaksi</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsVoidModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleVoidTransaction}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Harap masukkan alasan yang valid untuk membatalkan transaksi ini. Stok barang akan dikembalikan otomatis.
                </p>
                <div className="input-group">
                  <label className="input-label">Alasan Pembatalan</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 80, resize: 'vertical' }}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Contoh: Salah input produk, customer batal membeli..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsVoidModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={isSubmittingVoid}>
                  {isSubmittingVoid ? 'Memproses...' : 'Ya, Batalkan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AI Business Advisor */}
      {isAdvisorModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdvisorModalOpen(false)}>
          <div
            className="modal-content animate-slide-up"
            style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HiOutlineSparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    AI Business Advisor
                    <span className="badge badge-purple" style={{ fontSize: 10 }}>Powered by Google Gemini</span>
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Evaluasi performa toko dan rekomendasi strategis berdasarkan data penjualan Anda
                  </p>
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsAdvisorModalOpen(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {loadingAdvisor ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div className="skeleton" style={{ height: 60, width: '100%', marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 120, width: '100%', marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 180, width: '100%' }} />
                  <p style={{ marginTop: 16, color: 'var(--accent-purple)', fontWeight: 600, fontSize: 13 }}>
                    ✨ Sedang menganalisis omset, profit margin, dan produk terlaris dengan Gemini AI...
                  </p>
                </div>
              ) : advisorData ? (
                <>
                  {/* Status Kesehatan & Score */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status Kesehatan Toko:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-green)', marginTop: 2 }}>
                        {advisorData.healthStatus || 'Sehat'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Skor Performa:</div>
                      <div className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-purple)' }}>
                        {advisorData.healthScore || 85}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Eksekutif */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      📋 Ringkasan Eksekutif
                    </h4>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                      {advisorData.executiveSummary}
                    </p>
                  </div>

                  {/* Split Kekuatan & Risiko */}
                  <div className="grid-2" style={{ gap: 14 }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineCheckCircle size={16} /> Kekuatan Toko Saat Ini
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {(advisorData.strengths || []).map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineExclamationTriangle size={16} /> Potensi Risiko / Kebocoran Margin
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {(advisorData.risks || []).map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Insight Produk Bintang & Bundling */}
                  {advisorData.topProductInsights && advisorData.topProductInsights.length > 0 && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineLightBulb size={16} /> Insight Produk Bintang & Peluang Upselling
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {advisorData.topProductInsights.map((insight: string, idx: number) => (
                          <li key={idx}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rencana Strategis & Aksi Nyata */}
                  {advisorData.actionableStrategies && advisorData.actionableStrategies.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                        🚀 Rekomendasi Aksi Nyata untuk Diterapkan
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {advisorData.actionableStrategies.map((strat: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: 12,
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 12,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                {strat.title}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                                {strat.action}
                              </div>
                            </div>
                            <span
                              className={`badge ${strat.impact === 'Tinggi' ? 'badge-purple' : 'badge-blue'}`}
                              style={{ flexShrink: 0, fontSize: 10 }}
                            >
                              Dampak {strat.impact}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={fetchBusinessAdvisor}
                disabled={loadingAdvisor}
              >
                🔄 Refresh Analisis
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAdvisorModalOpen(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
