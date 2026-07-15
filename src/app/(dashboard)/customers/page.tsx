'use client'

import { useState } from 'react'
import { HiOutlineUserPlus, HiOutlineTrash, HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  points: number
  address: string
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'Budi Santoso', phone: '081234567890', email: 'budi@email.com', points: 150, address: 'Jl. Sudirman No. 1, Jakarta' },
    { id: '2', name: 'Siti Rahayu', phone: '081234567891', email: 'siti@email.com', points: 250, address: 'Jl. Thamrin No. 5, Jakarta' },
    { id: '3', name: 'Ahmad Rizki', phone: '081234567892', email: 'ahmad@email.com', points: 80, address: 'Jl. Gatot Subroto No. 10, Jakarta' },
    { id: '4', name: 'Dewi Lestari', phone: '081234567893', email: 'dewi@email.com', points: 320, address: 'Jl. Rasuna Said No. 15, Jakarta' },
  ])

  const handleDelete = (id: string) => {
    if (confirm('Hapus pelanggan?')) {
      setCustomers(customers.filter(c => c.id !== id))
      toast.success('Pelanggan berhasil dihapus')
    }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Pelanggan</h2>
          <p className="page-subtitle">Kelola database member pelanggan dan poin loyalitas mereka</p>
        </div>
        <button className="btn btn-primary" onClick={() => toast.success('Fitur tambah member segera hadir')}>
          <HiOutlineUserPlus size={16} /> Tambah Member
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box-icon" />
          <input
            type="text"
            className="input"
            placeholder="Cari pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Telepon / Email</th>
              <th>Alamat</th>
              <th>Loyalitas Poin</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                <td>
                  <div>{c.phone}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</span>
                </td>
                <td>{c.address}</td>
                <td>
                  <span className="badge badge-purple">{c.points} Poin</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(c.id)}>
                    <HiOutlineTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
