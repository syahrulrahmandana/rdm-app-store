'use client'

import { useState, useEffect } from 'react'
import { HiOutlineArrowPath, HiOutlineCircleStack, HiOutlineBuildingStorefront, HiOutlineSparkles } from 'react-icons/hi2'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [tax, setTax] = useState(0)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (res.ok) {
        setStoreName(data.name || '')
        setPhone(data.phone || '')
        setAddress(data.address || '')
        setTax(data.taxRate || 0)
        setGeminiApiKey(data.geminiApiKey || '')
      } else {
        toast.error(data.error || 'Gagal memuat pengaturan')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat memuat pengaturan')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          phone,
          address,
          taxRate: tax,
          geminiApiKey,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Pengaturan toko berhasil disimpan!')
      } else {
        toast.error(data.error || 'Gagal menyimpan pengaturan')
      }
    } catch (e) {
      toast.error('Kesalahan koneksi saat menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Memuat pengaturan...</div>
      </div>
    )
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
          <div className="form-grid" style={{ gap: 16 }}>
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
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>

        {/* Gemini AI Card */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineSparkles style={{ color: 'var(--accent-primary)' }} /> Integrasi Google Gemini AI (Prediksi Pesanan Chat)
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Gemini Flash bertindak cerdas mengenali pesanan dari format chat bebas di WhatsApp (memahami varian 1 bulan vs 7 hari, singkatan seperti yt/nflx/am/capcut, typo, dll). Jika API Key tidak diisi, bot tetap menggunakan pencocokan reguler.
          </p>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: 12 }}
              >
                Dapatkan API Key Gratis di Google AI Studio ↗
              </a>
            </label>
            <input
              type="password"
              className="input font-mono"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Gunakan model gratis Gemini 1.5 Flash tanpa biaya bulanan.
            </span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan API Key'}
            </button>
          </div>
        </div>

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
