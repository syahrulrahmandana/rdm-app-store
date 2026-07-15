'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  HiOutlineBanknotes,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTrendingUp,
  HiOutlineUsers,
} from 'react-icons/hi2'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DashboardData {
  todaySales: number
  todayRevenue: number
  todayTransactions: number
  totalProducts: number
  lowStockProducts: number
  totalCustomers: number
  salesChart: { date: string; total: number; count: number }[]
  topProducts: { name: string; sold: number; revenue: number }[]
  recentTransactions: { id: string; receiptNo: string; total: number; paymentMethod: string; createdAt: string; userName: string }[]
  lowStockList: { id: string; name: string; stock: number; minStock: number; sku: string }[]
  paymentMethodStats: { method: string; count: number; total: number }[]
}

const COLORS = ['#FF731D', '#1746A2', '#5F9DF7', '#10b981', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7' | '30'>('7')

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/dashboard?period=${period}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="grid-stats" style={{ marginBottom: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
        <div className="grid-2">
          <div className="skeleton" style={{ height: 350 }} />
          <div className="skeleton" style={{ height: 350 }} />
        </div>
      </div>
    )
  }

  if (!data) return <div>Gagal memuat data</div>

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 13,
        }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ color: p.color }}>
              {p.name === 'total' ? 'Penjualan' : p.name}: {p.name === 'total' ? formatCurrency(p.value) : p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="animate-fade-in">
      {/* KPI Stats */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Penjualan Hari Ini</div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)' }}>
                {formatCurrency(data.todayRevenue)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {data.todayTransactions} transaksi
              </div>
            </div>
            <div className="stat-icon green">
              <HiOutlineBanknotes size={22} color="var(--accent-green)" />
            </div>
          </div>
        </div>

        <div className="stat-card blue">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total Transaksi</div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {formatNumber(data.todayTransactions)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Hari ini
              </div>
            </div>
            <div className="stat-icon blue">
              <HiOutlineShoppingCart size={22} color="var(--accent-blue)" />
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total Produk</div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-purple)' }}>
                {formatNumber(data.totalProducts)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Produk aktif
              </div>
            </div>
            <div className="stat-icon purple">
              <HiOutlineCube size={22} color="var(--accent-purple)" />
            </div>
          </div>
        </div>

        <div className="stat-card orange">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Stok Menipis</div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: data.lowStockProducts > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                {formatNumber(data.lowStockProducts)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Perlu restok
              </div>
            </div>
            <div className="stat-icon orange">
              <HiOutlineExclamationTriangle size={22} color="var(--accent-orange)" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Sales Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">📊 Grafik Penjualan</h3>
            <div className="tabs">
              <button className={`tab ${period === '7' ? 'active' : ''}`} onClick={() => setPeriod('7')}>7 Hari</button>
              <button className={`tab ${period === '30' ? 'active' : ''}`} onClick={() => setPeriod('30')}>30 Hari</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.salesChart}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF731D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF731D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#FF731D" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">🏆 Produk Terlaris</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} width={120} tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sold" name="Terjual" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Recent Transactions */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">🧾 Transaksi Terbaru</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>No. Struk</th>
                  <th>Total</th>
                  <th>Metode</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.slice(0, 8).map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{tx.receiptNo}</td>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                      {formatCurrency(tx.total)}
                    </td>
                    <td>
                      <span className={`badge ${tx.paymentMethod === 'CASH' ? 'badge-green' : tx.paymentMethod === 'QRIS' ? 'badge-blue' : 'badge-purple'}`}>
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentTransactions.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">Belum ada transaksi</div>
                <div className="empty-state-desc">Transaksi akan muncul di sini</div>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">⚠️ Stok Menipis</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th>Stok</th>
                  <th>Min</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockList.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{p.sku}</td>
                    <td>
                      <span className={`badge ${p.stock <= 0 ? 'badge-red' : 'badge-orange'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.lowStockList.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">Semua stok aman</div>
                <div className="empty-state-desc">Tidak ada produk yang perlu restok</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
