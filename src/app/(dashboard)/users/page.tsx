'use client'

import { useState } from 'react'
import { HiOutlineUserPlus, HiOutlineShieldCheck } from 'react-icons/hi2'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users] = useState([
    { id: '1', name: 'Admin RDM', email: 'admin@rdm.com', role: 'ADMIN', active: true },
    { id: '2', name: 'Kasir Utama', email: 'kasir@rdm.com', role: 'KASIR', active: true },
    { id: '3', name: 'Owner Toko', email: 'owner@rdm.com', role: 'OWNER', active: true },
  ])

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Pengguna</h2>
          <p className="page-subtitle">Atur hak akses login staf Anda (Admin, Kasir, Owner)</p>
        </div>
        <button className="btn btn-primary" onClick={() => toast.success('Fitur tambah pengguna segera hadir')}>
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
                  <span className="badge badge-green">Aktif</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
