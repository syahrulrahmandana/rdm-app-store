'use client'

import { useState, useEffect } from 'react'
import { HiOutlineUserPlus, HiOutlineTrash, HiOutlineMagnifyingGlass, HiOutlinePencilSquare } from 'react-icons/hi2'
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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [points, setPoints] = useState(0)
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/customers')
      const data = await res.json()
      if (res.ok) {
        setCustomers(data)
      } else {
        toast.error(data.error || 'Gagal memuat pelanggan')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat memuat pelanggan')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingCustomer(null)
    setName('')
    setPhone('')
    setEmail('')
    setPoints(0)
    setAddress('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c)
    setName(c.name)
    setPhone(c.phone || '')
    setEmail(c.email || '')
    setPoints(c.points || 0)
    setAddress(c.address || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error('Nama member wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      const method = editingCustomer ? 'PUT' : 'POST'
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, points, address }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingCustomer ? 'Member berhasil diupdate!' : 'Member berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchCustomers()
      } else {
        toast.error(data.error || 'Gagal menyimpan data member')
      }
    } catch (err) {
      toast.error('Kesalahan koneksi saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus member ini?')) {
      return
    }

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Member berhasil dihapus')
        fetchCustomers()
      } else {
        toast.error(data.error || 'Gagal menghapus member')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat menghapus member')
    }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Memuat data pelanggan...</div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Pelanggan</h2>
          <p className="page-subtitle">Kelola database member pelanggan dan poin loyalitas mereka</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
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
                  <div>{c.phone || '-'}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email || '-'}</span>
                </td>
                <td>{c.address || '-'}</td>
                <td>
                  <span className="badge badge-purple">{c.points} Poin</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-blue)' }} onClick={() => handleOpenEditModal(c)}>
                      <HiOutlinePencilSquare size={16} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(c.id)}>
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  Tidak ada member pelanggan ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit Pelanggan */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingCustomer ? 'Ubah Member' : 'Tambah Member Baru'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Nama Lengkap Member *</label>
                  <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" required />
                </div>
                <div className="input-group">
                  <label className="input-label">No. Telepon / WhatsApp</label>
                  <input type="text" className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: 081234567" />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Member</label>
                  <input type="email" className="input font-mono" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contoh: member@email.com" />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Poin Loyalitas Awal</label>
                  <input type="number" className="input font-mono" value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 0)} />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Alamat Rumah</label>
                  <textarea className="input" style={{ minHeight: 70, resize: 'vertical' }} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
