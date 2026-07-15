'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, getPaymentMethodLabel } from '@/lib/utils'
import { HiOutlineArrowDownTray, HiOutlineCalendar, HiOutlineTrash } from 'react-icons/hi2'
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
  avgTransaction: number
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

interface TransactionItem {
  id: string
  receiptNo: string
  total: number
  paymentMethod: string
  itemCount: number
  userName: string
  createdAt: string
}

interface ReportData {
  summary: ReportSummary
  chartData: ChartItem[]
  topProducts: TopProduct[]
  paymentMethods: PaymentMethod[]
  transactions: TransactionItem[]
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

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
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Tanggal/Periode,Total Penjualan,Total Transaksi,Total Profit\n'

    data.chartData.forEach((row) => {
      csvContent += `${row.date},${row.totalSales},${row.count},${row.totalProfit}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Laporan berhasil diexport ke CSV')
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
        <div>
          <h2 className="page-title">Laporan Penjualan & Pendapatan</h2>
          <p className="page-subtitle">Pantau performa harian, produk terlaris, dan laba kotor toko Anda</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineCalendar color="var(--text-muted)" />
            <input
              type="date"
              className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, width: 130, color: 'var(--text-primary)' }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: 'var(--text-muted)' }}>s/d</span>
            <input
              type="date"
              className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, width: 130, color: 'var(--text-primary)' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 120 }}
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
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Rata-rata Transaksi</div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-orange)' }}>
            {formatCurrency(data.summary.avgTransaction)}
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
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip />
            <Area type="monotone" name="Penjualan" dataKey="totalSales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
            <Area type="monotone" name="Profit" dataKey="totalProfit" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
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
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📝 Daftar Transaksi Terbaru</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>No. Nota</th>
                <th>Kasir</th>
                <th>Jumlah Item</th>
                <th>Metode Pembayaran</th>
                <th>Total Transaksi</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{tx.receiptNo}</td>
                  <td>{tx.userName}</td>
                  <td>{tx.itemCount} item</td>
                  <td>
                    <span className="badge badge-blue">{getPaymentMethodLabel(tx.paymentMethod)}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                    {formatCurrency(tx.total)}
                  </td>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Belum ada transaksi pada periode ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}
