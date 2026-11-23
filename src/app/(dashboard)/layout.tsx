'use client'

import { useState, useCallback, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Otomatis minta login kembali setelah 30 menit berada di dashboard
  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000 // 30 menit
    const timer = setTimeout(() => {
      signOut({ callbackUrl: '/login?expired=1' })
    }, TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  )
}
