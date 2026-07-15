'use client'

import { useState } from 'react'
import { HiOutlineArrowPath, HiOutlineCircleStack, HiOutlineBuildingStorefront } from 'react-icons/hi2'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('RDM APP STORE')
  const [phone, setPhone] = useState('08123456789')
  const [address, setAddress] = useState('Jl. Merdeka No. 123, Jakarta')
  const [tax, setTax] = useState(0)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Pengaturan toko berhasil disimpan!')
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 650 }}>
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Pengaturan Toko</h2>
          <p className="page-subtitle">Ubah metadata, logo, alamat, pajak toko, serta backup basis data</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile Card */}
        <form className="card" style={{ padding: 24 }} onSubmit={handleSave}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineBuildingStorefront /> Profil Bisnis Toko
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-label">Nama Toko</label>
              <input type="text" className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Nomor Telepon</label>
              <input type="text" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Tarif Pajak (%)</label>
              <input type="number" className="input font-mono" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} required />
            </div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-label">Alamat Lengkap Toko</label>
              <textarea className="input" style={{ minHeight: 80, resize: 'vertical' }} value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Simpan Pengaturan</button>
          </div>
        </form>

        {/* Database backup */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineCircleStack /> Backup & Restore Database
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Ekspor data transaksi, produk, dan supplier Anda sebagai file SQLite dev.db lokal untuk cadangan data aman.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => toast.success('Cadangan data dev.db berhasil diexport ke Unduhan')}>
              Ekspor SQLite Database
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
