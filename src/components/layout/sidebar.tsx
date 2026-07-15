'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineArchiveBox,
  HiOutlineUsers,
  HiOutlineTruck,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineUserGroup,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2'
import { getInitials } from '@/lib/utils'

const menuItems = [
  {
    section: 'Menu Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
      { href: '/pos', label: 'Kasir (POS)', icon: HiOutlineShoppingCart },
    ],
  },
  {
    section: 'Manajemen',
    items: [
      { href: '/products', label: 'Produk', icon: HiOutlineCube },
      { href: '/inventory', label: 'Stok', icon: HiOutlineArchiveBox },
      { href: '/customers', label: 'Pelanggan', icon: HiOutlineUsers },
      { href: '/suppliers', label: 'Supplier', icon: HiOutlineTruck },
    ],
  },
  {
    section: 'Analitik',
    items: [
      { href: '/reports', label: 'Laporan', icon: HiOutlineChartBar },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { href: '/users', label: 'Pengguna', icon: HiOutlineUserGroup },
      { href: '/settings', label: 'Pengaturan', icon: HiOutlineCog6Tooth },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">R</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            RDM APP STORE
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            Point of Sale System
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((section) => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="sidebar-link-icon">
                    <item.icon size={20} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {session?.user?.name ? getInitials(session.user.name) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session?.user?.name || 'Loading...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {(session?.user as any)?.role || 'User'}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn-icon btn-ghost"
          title="Logout"
          style={{ flexShrink: 0 }}
        >
          <HiOutlineArrowRightOnRectangle size={18} />
        </button>
      </div>
    </aside>
  )
}
