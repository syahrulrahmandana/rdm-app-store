'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { formatCurrency, formatNumber, paymentMethods } from '@/lib/utils'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineShoppingBag,
  HiOutlineCheckCircle,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  buyPrice: number
  sellPrice: number
  stock: number
  unit: string
  categoryId: string | null
  manageStock: boolean
}

interface Category {
  id: string
  name: string
  icon: string | null
}

export default function POSPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Cart actions & state from Zustand
  const cart = useCartStore()

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [receiptNo, setReceiptNo] = useState('')
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [search, selectedCategory])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}&categoryId=${selectedCategory}`)
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (e) {
      toast.error('Gagal mengambil data produk')
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cart.items.length === 0) {
      toast.error('Keranjang belanja kosong')
      return
    }

    const subtotal = cart.getSubtotal()
    const discount = cart.getDiscountTotal()
    const tax = cart.getTaxAmount(0)
    const total = cart.getTotal(0)

    if (cart.paymentMethod === 'CASH' && cart.paymentAmount < total) {
      toast.error('Jumlah pembayaran kurang')
      return
    }

    const payload = {
      userId: (session?.user as any)?.id || 'system',
      subtotal,
      discount,
      discountType: cart.globalDiscountType,
      tax,
      total,
      paymentMethod: cart.paymentMethod,
      paymentAmount: cart.paymentMethod === 'CASH' ? cart.paymentAmount : total,
      changeAmount: cart.paymentMethod === 'CASH' ? cart.paymentAmount - total : 0,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
      })),
      note: cart.note,
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Transaksi Berhasil!')
        setLastTransaction(data)
        setIsCheckoutOpen(false)
        setIsReceiptOpen(true)
        cart.clearCart()
        fetchProducts()
      } else {
        toast.error(data.error || 'Gagal menyimpan transaksi')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="pos-layout animate-fade-in">
      {/* Kiri: Katalog Produk */}
      <div className="pos-products">
        {/* Search & Categories */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <HiOutlineMagnifyingGlass className="search-box-icon" />
            <input
              type="text"
              className="input"
              placeholder="Cari nama produk, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="category-chips" style={{ marginBottom: 16 }}>
          <button
            className={`category-chip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`category-chip ${selectedCategory === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Grid Katalog */}
        <div className="pos-product-grid">
          {products.map((p) => {
            const isOutOfStock = p.manageStock && p.stock <= 0
            return (
              <div
                key={p.id}
                className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                onClick={() => {
                  if (!isOutOfStock) {
                    cart.addItem({
                      id: p.id,
                      productId: p.id,
                      name: p.name,
                      price: p.sellPrice,
                      stock: p.stock,
                      sku: p.sku,
                      manageStock: p.manageStock,
                    })
                  }
                }}
              >
                <div style={{
                  width: '100%',
                  height: 100,
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}>
                  📦
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                  {p.name}
                </div>
                <div className="font-mono" style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 700 }}>
                  {formatCurrency(p.sellPrice)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {p.manageStock ? `Stok: ${p.stock}` : 'Bebas Stok'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Kanan: Keranjang Kasir */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <HiOutlineShoppingBag /> Keranjang Belanja
          </h3>
          <button className="btn btn-icon btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => cart.clearCart()}>
            <HiOutlineTrash size={16} />
          </button>
        </div>

        <div className="pos-cart-items">
          {cart.items.map((item) => (
            <div key={item.productId} className="pos-cart-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div className="font-mono" style={{ fontSize: 12, color: 'var(--accent-green)' }}>
                  {formatCurrency(item.price)}
                </div>
              </div>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}>-</button>
                <span className="qty-value">{item.quantity}</span>
                <button className="qty-btn" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}>+</button>
              </div>
            </div>
          ))}
          {cart.items.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <div className="empty-state-title">Keranjang kosong</div>
              <div className="empty-state-desc">Pilih produk di sebelah kiri untuk berbelanja</div>
            </div>
          )}
        </div>

        <div className="pos-cart-summary">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
            <span className="font-mono">{formatCurrency(cart.getSubtotal())}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Diskon:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                id="cart-discount"
                type="number"
                className="input font-mono"
                style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
                value={cart.globalDiscount}
                onChange={(e) => cart.setGlobalDiscount(parseFloat(e.target.value) || 0, cart.globalDiscountType)}
              />
              <select
                className="select"
                style={{ width: 60, padding: '4px 8px', fontSize: 12, backgroundImage: 'none' }}
                value={cart.globalDiscountType}
                onChange={(e) => cart.setGlobalDiscount(cart.globalDiscount, e.target.value as any)}
              >
                <option value="nominal">Rp</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total Akhir:</span>
            <span className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-green)' }}>
              {formatCurrency(cart.getTotal(0))}
            </span>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={cart.items.length === 0}
            onClick={() => {
              cart.setPaymentAmount(cart.getTotal(0))
              setIsCheckoutOpen(true)
            }}
          >
            Bayar & Checkout
          </button>
        </div>
      </div>

      {/* Modal Pembayaran */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Metode Pembayaran</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setIsCheckoutOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCheckoutSubmit}>
              <div className="modal-body">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tagihan Total</div>
                  <div className="font-mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-green)', marginTop: 4 }}>
                    {formatCurrency(cart.getTotal(0))}
                  </div>
                </div>

                {/* Metode Pembayaran */}
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="input-label">Pilih Metode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {paymentMethods.map((pm) => (
                      <button
                        key={pm.value}
                        type="button"
                        className={`btn ${cart.paymentMethod === pm.value ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 13, padding: '12px' }}
                        onClick={() => {
                          cart.setPaymentMethod(pm.value)
                          if (pm.value !== 'CASH') {
                            cart.setPaymentAmount(cart.getTotal(0))
                          }
                        }}
                      >
                        {pm.icon} {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nominal Bayar (Hanya Tunai) */}
                {cart.paymentMethod === 'CASH' && (
                  <div className="input-group" style={{ marginBottom: 16 }}>
                    <label className="input-label">Jumlah Uang Tunai</label>
                    <input
                      id="payment-cash-amount"
                      type="number"
                      className="input font-mono"
                      style={{ fontSize: 18, textAlign: 'center' }}
                      value={cart.paymentAmount}
                      onChange={(e) => cart.setPaymentAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {[5000, 10000, 20000, 50000, 100000].map((cash) => (
                        <button
                          key={cash}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 1, fontSize: 11 }}
                          onClick={() => cart.setPaymentAmount(cash)}
                        >
                          {formatNumber(cash)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kembalian (Hanya Tunai) */}
                {cart.paymentMethod === 'CASH' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Kembalian:</span>
                    <span className="font-mono" style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: cart.paymentAmount - cart.getTotal(0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {formatCurrency(cart.paymentAmount - cart.getTotal(0))}
                    </span>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Catatan Transaksi</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Opsional..."
                    value={cart.note}
                    onChange={(e) => cart.setNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsCheckoutOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Konfirmasi Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Struk */}
      {isReceiptOpen && lastTransaction && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 360, background: 'white', color: 'black' }}>
            <div className="receipt">
              <div className="receipt-header">
                <h3 style={{ fontSize: 16, margin: 0, textTransform: 'uppercase' }}>RDM APP STORE</h3>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>Jl. Merdeka No. 123, Jakarta</p>
                <p style={{ margin: '2px 0 0', fontSize: 10 }}>HP: 08123456789</p>
              </div>

              <div style={{ fontSize: 11 }}>
                <p>No: {lastTransaction.receiptNo}</p>
                <p>Tgl: {new Date(lastTransaction.createdAt).toLocaleString('id-ID')}</p>
                <p>Kasir: {lastTransaction.user?.name || 'Kasir'}</p>
              </div>

              <div className="receipt-divider" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lastTransaction.items.map((item: any) => (
                  <div key={item.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{item.productName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span>{item.quantity} x {formatCurrency(item.price)}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastTransaction.subtotal)}</span>
                </div>
                {lastTransaction.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Diskon:</span>
                    <span>-{formatCurrency(lastTransaction.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total Akhir:</span>
                  <span>{formatCurrency(lastTransaction.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bayar ({lastTransaction.paymentMethod}):</span>
                  <span>{formatCurrency(lastTransaction.paymentAmount)}</span>
                </div>
                {lastTransaction.paymentMethod === 'CASH' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kembalian:</span>
                    <span>{formatCurrency(lastTransaction.changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="receipt-divider" />

              <div style={{ textAlign: 'center', fontSize: 11, marginTop: 10 }}>
                <p>Terima Kasih Atas Kunjungan Anda</p>
                <p>Barang yang sudah dibeli tidak dapat ditukar</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: 16, background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsReceiptOpen(false)}>
                Tutup
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePrint}>
                Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
