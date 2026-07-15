'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'
import { HiOutlinePlus, HiOutlineArrowPath } from 'react-icons/hi2'
import toast from 'react-hot-toast'

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

export default function InventoryPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/reports?type=stock')
      const data = await res.json()
      if (data.movements) {
        setMovements(data.movements)
      }
    } catch (e) {
      toast.error('Gagal mengambil data stok')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Stok & Riwayat Mutasi</h2>
          <p className="page-subtitle">Pantau pergerakan stok keluar masuk barang secara real-time</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchInventory}>
          <HiOutlineArrowPath size={16} /> Refresh
        </button>
      </div>

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
                    <span className={`badge ${
                      m.type === 'IN' || m.type === 'PURCHASE' ? 'badge-green' :
                      m.type === 'OUT' || m.type === 'SALE' ? 'badge-red' : 'badge-blue'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="font-mono" style={{
                    fontWeight: 700,
                    color: m.quantity > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
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
  )
}
