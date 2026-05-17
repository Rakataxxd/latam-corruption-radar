"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAISES = [
  { code: "",   label: "Todos los países" },
  { code: "GT", label: "Guatemala" },
  { code: "SV", label: "El Salvador" },
  { code: "MX", label: "México" },
  { code: "PE", label: "Perú" },
]

function CountryPill({ code }: { code: string }) {
  const display = code || "—"
  return (
    <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono font-bold text-gray-300">
      {display}
    </span>
  )
}

function ScoreBadge({ score, pct }: { score: number; pct: number }) {
  const color =
    score >= 80 ? "bg-red-500/20 text-red-300 border-red-500/40" :
    score >= 50 ? "bg-orange-500/20 text-orange-300 border-orange-500/40" :
    score >= 20 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" :
                  "bg-green-500/20 text-green-300 border-green-500/40"
  const dotColor =
    score >= 80 ? "bg-red-400" :
    score >= 50 ? "bg-orange-400" :
    score >= 20 ? "bg-yellow-400" : "bg-green-400"
  const label =
    score >= 80 ? "Severo" :
    score >= 50 ? "Moderado" :
    score >= 20 ? "Leve" : "Normal"

  return (
    <div className="text-right">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium mb-0.5 ${color}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span>{label}</span>
      </div>
      <div className={`text-sm font-bold ${score >= 80 ? "text-red-400" : score >= 50 ? "text-orange-400" : score >= 20 ? "text-yellow-400" : "text-green-400"}`}>
        {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
      </div>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 50 ? "bg-orange-400" : score >= 20 ? "bg-yellow-400" : "bg-green-500"
  return (
    <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

function RowAccentColor(score: number): string {
  if (score >= 80) return "border-red-500"
  if (score >= 50) return "border-orange-400"
  if (score >= 20) return "border-yellow-400"
  return "border-green-500"
}

export default function RadarPage() {
  const searchParams = useSearchParams()
  const [obras, setObras]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [pais, setPais]         = useState("")
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [busqueda, setBusqueda] = useState(searchParams.get("busqueda") || "")
  const [query, setQuery]       = useState(searchParams.get("busqueda") || "")

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/obras`, {
      timeout: 15000,
      params: {
        pais: pais || undefined,
        busqueda: query || undefined,
        page, page_size: 20,
        order_by: "sobreprecio_score",
      }
    })
      .then(r => { setObras(r.data.items); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [pais, page, query])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setQuery(busqueda.trim())
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8 relative">
        {/* Subtle red glow behind title */}
        <div className="absolute -top-4 -left-4 w-48 h-16 bg-red-500/10 blur-2xl rounded-full pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-1">
          <span className="text-red-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
              <line x1="12" y1="2" x2="12" y2="4"/>
            </svg>
          </span>
          <h1 className="text-3xl font-bold text-white">Radar de Obras Públicas</h1>
        </div>
        <p className="text-gray-500 text-sm pl-8">
          {total.toLocaleString()} contratos indexados · ordenados por sobreprecio vs. mediana histórica
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por obra o empresa..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-700 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setBusqueda(""); setQuery(""); setPage(1) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </form>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-8">
        {PAISES.map(p => (
          <button
            key={p.code}
            onClick={() => { setPais(p.code); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              pais === p.code
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 hover:bg-gray-800"
            }`}
          >
            {p.code && <CountryPill code={p.code} />}
            {p.code && " "}
            {p.label}
          </button>
        ))}
        <Link
          href="/cotizar"
          className="ml-auto px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          + Analizar cotización
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            {/* Double-ring spinner */}
            <div className="relative w-10 h-10 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-red-500/10 animate-spin" />
            </div>
            <div className="text-gray-500 text-sm tracking-wide">Cargando contratos...</div>
          </div>
        </div>
      ) : obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-600">
          {/* Search empty state icon */}
          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">No hay contratos para mostrar</span>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-900/80">
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold w-8">#</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Obra / Contrato</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Empresa</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold text-right">Monto</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold text-right">Sobreprecio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {obras.map((o, i) => {
                const score = o.sobreprecio_score || 0
                return (
                  <tr
                    key={o.id}
                    className={`hover:bg-white/[0.025] transition-all duration-150 group border-l-2 border-transparent hover:${RowAccentColor(score)}`}
                    style={{ borderLeftColor: undefined }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      const colors: Record<string, string> = {
                        "border-red-500": "#ef4444",
                        "border-orange-400": "#fb923c",
                        "border-yellow-400": "#facc15",
                        "border-green-500": "#22c55e",
                      }
                      el.style.borderLeftColor = colors[RowAccentColor(score)] ?? "transparent"
                    }}
                    onMouseLeave={e => { e.currentTarget.style.borderLeftColor = "transparent" }}
                  >
                    <td className="px-4 py-4 text-gray-600 text-xs">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <CountryPill code={o.pais || "—"} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm leading-snug line-clamp-2">{o.titulo}</div>
                          <div className="text-gray-500 text-xs mt-0.5 truncate">{o.entidad_compradora}</div>
                          {o.fecha_adjudicacion && (
                            <div className="text-gray-700 text-xs mt-0.5">{o.fecha_adjudicacion}</div>
                          )}
                          <Link
                            href={`/obra/${o.id}`}
                            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-150"
                          >
                            Ver comparación →
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {o.empresa_id ? (
                        <Link
                          href={`/empresa/${o.empresa_id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline text-xs block max-w-[160px] truncate"
                        >
                          {o.empresa_nombre || "Ver empresa →"}
                        </Link>
                      ) : (
                        <span className="text-gray-600 text-xs">{o.empresa_nombre || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-gray-300 text-xs font-mono">
                        {o.monto_adjudicado
                          ? `${o.moneda} ${Number(o.monto_adjudicado).toLocaleString()}`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end gap-1.5">
                        <ScoreBadge score={score} pct={o.sobreprecio_pct || 0} />
                        <ScoreBar score={score} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-xs text-gray-600">
          Mostrando {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} de {total.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-medium text-gray-400 disabled:opacity-30 hover:border-gray-600 hover:text-white hover:bg-gray-800 transition-all duration-150"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>
          <span className="px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono font-bold text-white">
            {page}{totalPages > 0 ? ` / ${totalPages}` : ""}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={obras.length < 20}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-medium text-gray-400 disabled:opacity-30 hover:border-gray-600 hover:text-white hover:bg-gray-800 transition-all duration-150"
          >
            Siguiente
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 text-xs text-gray-700 text-center">
        Los porcentajes de sobreprecio son estimativos basados en medianas históricas de contratos similares y no constituyen prueba legal.
      </div>
    </main>
  )
}
