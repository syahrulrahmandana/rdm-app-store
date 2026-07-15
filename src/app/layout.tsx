import type { Metadata } from "next"
import "./globals.css"
import AuthProvider from "@/components/providers/session-provider"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "RDM APP STORE - Aplikasi Kasir Premium",
  description: "Aplikasi Point of Sale (POS) premium untuk manajemen toko retail. Kelola produk, transaksi, stok, dan laporan bisnis Anda.",
  keywords: "kasir, POS, point of sale, manajemen toko, aplikasi kasir",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1f2e',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#1a1f2e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#1a1f2e',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
