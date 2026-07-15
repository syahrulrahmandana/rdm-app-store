'use client'

import { usePathname } from 'next/navigation'
import { HiOutlineBell } from 'react-icons/hi2'
import { useState, useEffect, useRef } from 'react'

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

interface NotificationItem {
  id: string
  type: 'info' | 'warning'
  title: string
  desc: string
  time: string
}

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch low stock items for notifications dynamically
  useEffect(() => {
    const fetchLowStockAlerts = async () => {
      try {
        const res = await fetch('/api/products?limit=100')
        const data = await res.json()
        if (res.ok && data.products) {
          const lowStock = data.products.filter((p: any) => p.manageStock && p.stock <= p.minStock)
          const alerts: NotificationItem[] = [
            {
              id: 'welcome',
              type: 'info',
              title: 'Selamat Datang!',
              desc: 'Sistem Kasir RDM App Store siap digunakan hari ini.',
              time: 'Baru saja',
            },
            ...lowStock.map((p: any) => ({
              id: `stock-${p.id}`,
              type: 'warning' as const,
              title: 'Stok Produk Menipis',
              desc: `${p.name} sisa ${p.stock} ${p.unit} (Batas min: ${p.minStock})`,
              time: 'Perlu restock',
            }))
          ]
          setNotifications(alerts)
        }
      } catch (err) {
        console.error('Failed to load alerts for notifications', err)
      }
    }

    fetchLowStockAlerts()
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchLowStockAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const pageInfo = pageTitles[pathname] || { title: 'RDM APP STORE', subtitle: '' }

  // Count warning/unread alerts
  const warningCount = notifications.filter(n => n.type === 'warning').length

  return (
    <header className="header" style={{ position: 'relative' }}>
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
        ☰
      </button>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{pageInfo.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {pageInfo.subtitle}
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={dropdownRef}>
        {/* Clock */}
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

        {/* Notification Bell Button */}
        <button 
          className="btn btn-icon btn-ghost" 
          style={{ position: 'relative' }}
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifikasi"
        >
          <HiOutlineBell size={20} />
          {notifications.length > 0 && (
            <span 
              className="notification-dot" 
              style={{ 
                background: warningCount > 0 ? 'var(--accent-red)' : 'var(--accent-blue)',
                width: 10,
                height: 10,
                top: 4,
                right: 4
              }} 
            />
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '48px',
            width: 320,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 999,
            overflow: 'hidden',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notifikasi</span>
              {warningCount > 0 && (
                <span className="badge badge-red" style={{ fontSize: 11 }}>
                  {warningCount} Peringatan
                </span>
              )}
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {notifications.map((item) => (
                <div 
                  key={item.id} 
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    background: item.type === 'warning' ? 'var(--accent-orange-glow)' : 'transparent',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 13, 
                    color: item.type === 'warning' ? 'var(--accent-orange)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    {item.type === 'warning' ? '⚠️' : 'ℹ️'} {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {item.time}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Tidak ada notifikasi baru
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
