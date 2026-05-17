import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "LatAm Corruption Radar",
  description: "Detectamos sobreprecio en cotizaciones públicas",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
