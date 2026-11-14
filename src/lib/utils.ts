export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

import { getWIBDateParts } from './date-wib'

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date))
}

export function generateReceiptNo(prefix: string = 'RDM'): string {
  const parts = getWIBDateParts()
  const dateStr = `${parts.year}${String(parts.month).padStart(2, '0')}${String(parts.day).padStart(2, '0')}`
  const timeStr = `${String(parts.hour).padStart(2, '0')}${String(parts.minute).padStart(2, '0')}${String(parts.second).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${dateStr}-${timeStr}-${random}`
}

export function generateSKU(categoryPrefix: string = 'PRD'): string {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${categoryPrefix}-${random}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export const paymentMethods = [
  { value: 'CASH', label: 'Tunai', icon: '💵' },
  { value: 'QRIS', label: 'QRIS', icon: '📱' },
  { value: 'DANA', label: 'DANA', icon: '🔵' },
  { value: 'GOPAY', label: 'GoPay', icon: '🟢' },
  { value: 'OVO', label: 'OVO', icon: '🟣' },
  { value: 'BANK', label: 'Bank / Transfer', icon: '🏦' },
  { value: 'CARD', label: 'Kartu Debit/Kredit', icon: '💳' },
]

export function getPaymentMethodLabel(method: string): string {
  return paymentMethods.find((m) => m.value === method)?.label || method
}

export function getPaymentMethodIcon(method: string): string {
  return paymentMethods.find((m) => m.value === method)?.icon || '💰'
}
