'use client'

import { usePathname } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { HiOutlineBell, HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { useState, useEffect } from 'react'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan bisnis Anda hari ini' },
  '/pos': { title: 'Kasir (POS)', subtitle: 'Buat transaksi penjualan' },
  '/products': { title: 'Manajemen Produk', subtitle: 'Kelola produk dan kategori' },
  '/inventory': { title: 'Manajemen Stok', subtitle: 'Kelola stok masuk, keluar & opname' },
  '/customers': { title: 'Pelanggan', subtitle: 'Kelola data pelanggan & member' },
  '/suppliers': { title: 'Supplier', subtitle: 'Kelola data supplier & pembelian' },
  '/reports': { title: 'Laporan', subtitle: 'Analisis penjualan & pendapatan' },
  '/users': { title: 'Manajemen Pengguna', subtitle: 'Kelola akun pengguna & hak akses' },
  '/settings': { title: 'Pengaturan', subtitle: 'Konfigurasi toko & aplikasi' },
}

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pageInfo = pageTitles[pathname] || { title: 'RDM APP STORE', subtitle: '' }

  return (
    <header className="header">
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
        ☰
      </button>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{pageInfo.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {pageInfo.subtitle}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          background: 'var(--bg-input)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <span className="hide-mobile">
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
            {' · '}
          </span>
          {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <button className="btn btn-icon btn-ghost" style={{ position: 'relative' }}>
          <HiOutlineBell size={20} />
          <span className="notification-dot" />
        </button>
      </div>
    </header>
  )
}
