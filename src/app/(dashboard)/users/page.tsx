'use client'

import { useState, useEffect } from 'react'
import { HiOutlineUserPlus, HiOutlineShieldCheck, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('KASIR')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data)
      } else {
        toast.error(data.error || 'Gagal memuat pengguna')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat memuat pengguna')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('KASIR')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u)
    setName(u.name)
    setEmail(u.email)
    setPassword('') // Don't prefill password
    setRole(u.role)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || (!editingUser && !password)) {
      toast.error('Kolom bertanda bintang (*) wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'

      const bodyData: any = { name, email, role }
      if (password) {
        bodyData.password = password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingUser ? 'Pengguna berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchUsers()
      } else {
        toast.error(data.error || 'Gagal menyimpan data pengguna')
      }
    } catch (err) {
      toast.error('Kesalahan koneksi saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan/menghapus pengguna ini?')) {
      return
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Pengguna berhasil dinonaktifkan')
        fetchUsers()
      } else {
        toast.error(data.error || 'Gagal menonaktifkan pengguna')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat menonaktifkan pengguna')
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Memuat data staff...</div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Pengguna</h2>
          <p className="page-subtitle">Atur hak akses login staf Anda (Admin, Kasir, Owner)</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <HiOutlineUserPlus size={16} /> Tambah Staff
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama Pengguna</th>
              <th>Email</th>
              <th>Role Hak Akses</th>
              <th>Status Akun</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                <td className="font-mono">{u.email}</td>
                <td>
                  <span className={`badge ${
                    u.role === 'ADMIN' ? 'badge-red' :
                    u.role === 'OWNER' ? 'badge-purple' : 'badge-green'
                  }`}>
                    <HiOutlineShieldCheck size={12} style={{ marginRight: 4 }} /> {u.role}
                  </span>
                </td>
                <td>
                  <span className="badge badge-green">{u.isActive ? 'Aktif' : 'Non-aktif'}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-blue)' }} onClick={() => handleOpenEditModal(u)}>
                      <HiOutlinePencilSquare size={16} />
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(u.id)}>
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  Tidak ada staff pengguna ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit Staff */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {editingUser ? 'Ubah Hak Akses Staff' : 'Tambah Staff Baru'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-grid">
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Nama Lengkap Staff *</label>
                  <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Ahmad Rizki" required />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Email Staff *</label>
                  <input type="email" className="input font-mono" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contoh: ahmad@rdm.com" required />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">
                    Kata Sandi {editingUser && '(Biarkan kosong jika tidak diubah)'} *
                  </label>
                  <input type="password" className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi..." required={!editingUser} />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Hak Akses (Role) *</label>
                  <select className="select" value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="KASIR">KASIR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
