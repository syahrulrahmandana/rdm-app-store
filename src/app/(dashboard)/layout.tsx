'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
