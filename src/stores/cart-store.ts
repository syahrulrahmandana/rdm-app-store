import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  discount: number
  image?: string
  stock: number
  sku: string
  manageStock: boolean
}

interface CartStore {
  items: CartItem[]
  customerId: string | null
  customerName: string | null
  globalDiscount: number
  globalDiscountType: 'nominal' | 'percent'
  paymentMethod: string
  paymentAmount: number
  note: string

  addItem: (product: Omit<CartItem, 'quantity' | 'discount'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setCustomer: (id: string | null, name: string | null) => void
  setGlobalDiscount: (amount: number, type: 'nominal' | 'percent') => void
  setPaymentMethod: (method: string) => void
  setPaymentAmount: (amount: number) => void
  setNote: (note: string) => void
  clearCart: () => void
  getSubtotal: () => number
  getDiscountTotal: () => number
  getTaxAmount: (taxRate: number) => number
  getTotal: (taxRate: number) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      customerName: null,
      globalDiscount: 0,
      globalDiscountType: 'nominal',
      paymentMethod: 'CASH',
      paymentAmount: 0,
      note: '',

      addItem: (product) => {
        const items = get().items
        const existing = items.find((i) => i.productId === product.productId)
        if (existing) {
          if (!existing.manageStock || existing.quantity < existing.stock) {
            set({
              items: items.map((i) =>
                i.productId === product.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            })
          }
        } else {
          set({
            items: [
              ...items,
              { ...product, quantity: 1, discount: 0 },
            ],
          })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: i.manageStock ? Math.min(quantity, i.stock) : quantity }
              : i
          ),
        })
      },

      updateItemDiscount: (productId, discount) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, discount } : i
          ),
        })
      },

      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      setGlobalDiscount: (amount, type) =>
        set({ globalDiscount: amount, globalDiscountType: type }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setPaymentAmount: (amount) => set({ paymentAmount: amount }),
      setNote: (note) => set({ note }),

      clearCart: () =>
        set({
          items: [],
          customerId: null,
          customerName: null,
          globalDiscount: 0,
          globalDiscountType: 'nominal',
          paymentMethod: 'CASH',
          paymentAmount: 0,
          note: '',
        }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.price - item.discount) * item.quantity,
          0
        )
      },

      getDiscountTotal: () => {
        const { globalDiscount, globalDiscountType } = get()
        const subtotal = get().getSubtotal()
        if (globalDiscountType === 'percent') {
          return (subtotal * globalDiscount) / 100
        }
        return globalDiscount
      },

      getTaxAmount: (taxRate) => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscountTotal()
        return ((subtotal - discount) * taxRate) / 100
      },

      getTotal: (taxRate) => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscountTotal()
        const tax = ((subtotal - discount) * taxRate) / 100
        return subtotal - discount + tax
      },
    }),
    {
      name: 'rdm-cart-storage',
    }
  )
)
