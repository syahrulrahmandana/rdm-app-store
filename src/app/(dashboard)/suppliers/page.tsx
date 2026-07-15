'use client'

import { useState } from 'react'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: '1', name: 'Budi Santoso', phone: '081234567890', email: 'supplier@indofood.com', company: 'PT Indofood Sukses Makmur', address: 'Kawasan Industri Ancol, Jakarta' },
    { id: '2', name: 'Siti Rahayu', phone: '081234567891', email: 'info@sumberjaya.com', company: 'CV Sumber Jaya Elektronik', address: 'Mangga Dua Square, Jakarta' },
    { id: '3', name: 'Ahmad Rizki', phone: '081234567892', email: 'order@makmur.com', company: 'UD Makmur Sentosa', address: 'Pasar Induk Kramat Jati, Jakarta' },
  ])

  return (
    <div className="animate-fade-in">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manajemen Supplier</h2>
          <p className="page-subtitle">Kelola database supplier barang dan riwayat pasokan Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => toast.success('Fitur tambah supplier segera hadir')}>
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
                  <div>{s.phone}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</span>
                </td>
                <td>{s.address}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => {
                    setSuppliers(suppliers.filter(x => x.id !== s.id))
                    toast.success('Supplier dihapus')
                  }}>
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
