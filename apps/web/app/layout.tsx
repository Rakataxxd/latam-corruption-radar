import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"

export const metadata: Metadata = {
  title: "LatAm Corruption Radar",
  description: "Detectamos sobreprecio en cotizaciones públicas de Guatemala, El Salvador, México y Perú",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Navbar />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  )
}
