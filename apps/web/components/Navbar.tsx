"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/radar",      label: "Radar",               external: false },
  { href: "/grafo.html", label: "Grafo",                external: true  },
  { href: "/cotizar",    label: "Analizar Cotización",  external: false },
]

export default function Navbar() {
  const path = usePathname()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-red-500 text-xl">◎</span>
          <span>CotiRadar</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(l => {
            const cls = `px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              path === l.href
                ? "bg-red-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            }`
            return l.external
              ? <a key={l.href} href={l.href} className={cls}>{l.label}</a>
              : <Link key={l.href} href={l.href} className={cls}>{l.label}</Link>
          })}
        </div>
      </div>
    </nav>
  )
}
