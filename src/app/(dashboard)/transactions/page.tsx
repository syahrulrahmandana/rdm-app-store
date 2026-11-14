'use client'

import { useState, useEffect } from 'react'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface TransactionItem {
  id: string
  productName: string
  quantity: number
  price: number
  subtotal: number
}

interface Transaction {
  id: string
  receiptNo: string
  customerId: string | null
  subtotal: number
  total: number
  paymentMethod: string
  status: 'PENDING' | 'COMPLETED' | 'VOIDED'
  note: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    phone: string | null
  } | null
  items: TransactionItem[]
  user: {
    name: string
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'VOIDED'>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [statusFilter, search, page])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
        search,
      })

      const res = await fetch(`/api/transactions?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        setTransactions(data.transactions || [])
        setTotalPages(data.totalPages || 1)
      } else {
        toast.error(data.error || 'Gagal memuat transaksi')
      }
    } catch (err) {
      toast.error('Kesalahan koneksi saat memuat transaksi')
    } finally {
      setLoading(false)
    }
  }

  // Handle Selesaikan Pesanan Langsung dari Web
  const handleComplete = async (txId: string, receiptNo: string) => {
    try {
      setActionLoading(txId)
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Pesanan #${receiptNo} berhasil diselesaikan!`)
        fetchTransactions()
      } else {
        toast.error(data.error || 'Gagal memperbarui status')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setActionLoading(null)
    }
  }

  // Hitung stats sederhana dari list transaksi yang ada
  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length
  const completedCount = transactions.filter((t) => t.status === 'COMPLETED').length

  return (
    <div className="animate-fade-in">
      {/* Header Halaman */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Pesanan & Riwayat Transaksi
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Pantau dan kelola antrean pesanan dari WhatsApp serta riwayat penjualan kasir.
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <HiOutlineArrowPath size={18} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Tabs Filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setStatusFilter('ALL'); setPage(1) }}
              className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => { setStatusFilter('PENDING'); setPage(1) }}
              className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-warning' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineClock size={16} />
              <span>Antrean Pending</span>
              {pendingCount > 0 && (
                <span style={{
                  background: '#f59e0b',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setStatusFilter('COMPLETED'); setPage(1) }}
              className={`btn btn-sm ${statusFilter === 'COMPLETED' ? 'btn-success' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineCheckCircle size={16} />
              <span>Selesai (Lunas)</span>
            </button>
            <button
              onClick={() => { setStatusFilter('VOIDED'); setPage(1) }}
              className={`btn btn-sm ${statusFilter === 'VOIDED' ? 'btn-danger' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineXCircle size={16} />
              <span>Dibatalkan</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <HiOutlineMagnifyingGlass
              size={18}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Cari no faktur / HP / nama..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="input"
              style={{ paddingLeft: 38, width: '100%', fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>No. Faktur</th>
                <th>Waktu</th>
                <th>Pelanggan</th>
                <th>Produk / Item</th>
                <th>Total</th>
                <th>Metode</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🧾</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tidak ada transaksi ditemukan</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Pesanan dari WhatsApp atau kasir akan muncul di sini secara otomatis.
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    {/* No Faktur */}
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                      {tx.receiptNo}
                    </td>

                    {/* Waktu */}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDateTime(tx.createdAt)}
                    </td>

                    {/* Pelanggan */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tx.customer?.name || 'Pelanggan Umum'}
                      </div>
                      {tx.customer?.phone && (
                        <a
                          href={`https://wa.me/${tx.customer.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: '#25D366',
                            textDecoration: 'none',
                            marginTop: 2,
                          }}
                          title="Buka Chat WhatsApp"
                        >
                          <HiOutlineChatBubbleLeftRight size={13} />
                          <span>{tx.customer.phone}</span>
                        </a>
                      )}
                    </td>

                    {/* Produk / Item */}
                    <td>
                      {tx.items && tx.items.length > 0 ? (
                        tx.items.map((it, idx) => (
                          <div key={idx} style={{ fontSize: 13, fontWeight: 500 }}>
                            {it.productName} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>x{it.quantity}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {tx.note || 'Pesanan Custom'}
                        </span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                      {formatCurrency(tx.total)}
                    </td>

                    {/* Metode Bayar */}
                    <td>
                      <span className={`badge ${
                        tx.paymentMethod === 'QRIS'
                          ? 'badge-blue'
                          : tx.paymentMethod === 'CASH'
                          ? 'badge-green'
                          : 'badge-purple'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      {tx.status === 'PENDING' && (
                        <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineClock size={13} />
                          <span>Diproses (Pending)</span>
                        </span>
                      )}
                      {tx.status === 'COMPLETED' && (
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineCheckCircle size={13} />
                          <span>Selesai</span>
                        </span>
                      )}
                      {tx.status === 'VOIDED' && (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineXCircle size={13} />
                          <span>Dibatalkan</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td style={{ textAlign: 'right' }}>
                      {tx.status === 'PENDING' ? (
                        <button
                          onClick={() => handleComplete(tx.id, tx.receiptNo)}
                          disabled={actionLoading === tx.id}
                          className="btn btn-sm btn-success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Klik untuk menyelesaikan transaksi dan mencatatnya ke laporan omzet"
                        >
                          <HiOutlineCheckCircle size={15} />
                          <span>{actionLoading === tx.id ? 'Memproses...' : 'Selesaikan'}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border-color)', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-ghost"
            >
              Sebelumnya
            </button>
            <span style={{ fontSize: 13, alignSelf: 'center', color: 'var(--text-muted)' }}>
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-ghost"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
