'use client'

import { useState, useEffect } from 'react'
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2'
import toast from 'react-hot-toast'

interface Supplier {
  id: string
  name: string
  phone: string
  email: string
  company: string
  address: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/suppliers')
      const data = await res.json()
      if (res.ok) {
        setSuppliers(data)
      } else {
        toast.error(data.error || 'Gagal memuat supplier')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat memuat supplier')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingSupplier(null)
    setName('')
    setCompany('')
    setPhone('')
    setEmail('')
    setAddress('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (s: Supplier) => {
    setEditingSupplier(s)
    setName(s.name)
    setCompany(s.company)
    setPhone(s.phone || '')
    setEmail(s.email || '')
    setAddress(s.address || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !company) {
      toast.error('Nama perwakilan dan perusahaan wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      const method = editingSupplier ? 'PUT' : 'POST'
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, phone, email, address }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingSupplier ? 'Supplier berhasil diubah!' : 'Supplier berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchSuppliers()
      } else {
        toast.error(data.error || 'Gagal menyimpan supplier')
      }
    } catch (err) {
      toast.error('Kesalahan koneksi saat menyimpan supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus supplier ini? Semua riwayat pasokan yang terkait juga akan dihapus.')) {
      return
    }

    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Supplier berhasil dihapus')
        fetchSuppliers()
      } else {
        toast.error(data.error || 'Gagal menghapus supplier')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat menghapus supplier')
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Memuat data supplier...</div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Supplier</h2>
          <p className="page-subtitle">Kelola database supplier barang dan riwayat pasokan Anda</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <HiOutlinePlus size={16} /> Tambah Supplier
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Perusahaan / Perwakilan</th>
              <th>Telepon / Email</th>
              <th>Alamat Kantor</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.company}</div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIC: {s.name}</span>
                </td>
                <td>
                  <div>{s.phone || '-'}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email || '-'}</span>
                </td>
                <td>{s.address || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-blue)' }} onClick={() => handleOpenEditModal(s)}>
                      <HiOutlinePencilSquare size={16} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(s.id)}>
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  Belum ada data supplier. Klik Tambah Supplier untuk membuat baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit Supplier */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingSupplier ? 'Ubah Supplier' : 'Tambah Supplier Baru'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Nama Perusahaan *</label>
                  <input type="text" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Contoh: PT Sumber Pangan" required />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Nama Kontak Perwakilan (PIC) *</label>
                  <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" required />
                </div>
                <div className="input-group">
                  <label className="input-label">No. Telepon / WhatsApp</label>
                  <input type="text" className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: 081234567" />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Supplier</label>
                  <input type="email" className="input font-mono" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contoh: supplier@email.com" />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Alamat Kantor / Gudang</label>
                  <textarea className="input" style={{ minHeight: 70, resize: 'vertical' }} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
