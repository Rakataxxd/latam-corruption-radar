"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAISES = [
  { code: "",   label: "Todos los países" },
  { code: "GT", label: "🇬🇹 Guatemala" },
  { code: "SV", label: "🇸🇻 El Salvador" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "PE", label: "🇵🇪 Perú" },
]
const BANDERAS: Record<string, string> = { GT: "🇬🇹", MX: "🇲🇽", SV: "🇸🇻", PE: "🇵🇪" }

function ScoreBadge({ score, pct }: { score: number; pct: number }) {
  const color =
    score >= 80 ? "bg-red-500/20 text-red-300 border-red-500/40" :
    score >= 50 ? "bg-orange-500/20 text-orange-300 border-orange-500/40" :
    score >= 20 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" :
                  "bg-green-500/20 text-green-300 border-green-500/40"
  const label =
    score >= 80 ? "Severo" :
    score >= 50 ? "Moderado" :
    score >= 20 ? "Leve" : "Normal"

  return (
    <div className="text-right">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium mb-0.5 ${color}`}>
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
    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

export default function RadarPage() {
  const [obras, setObras]   = useState<any[]>([])
  const [total, setTotal]   = useState(0)
  const [pais, setPais]     = useState("")
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/obras`, {
      params: { pais: pais || undefined, page, page_size: 20, order_by: "sobreprecio_score" }
    })
      .then(r => { setObras(r.data.items); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [pais, page])

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Radar de Obras Públicas</h1>
        <p className="text-gray-500 text-sm">
          {total.toLocaleString()} contratos indexados · ordenados por sobreprecio vs. mediana histórica
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-8">
        {PAISES.map(p => (
          <button key={p.code} onClick={() => { setPais(p.code); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              pais === p.code
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
            }`}>
            {p.label}
          </button>
        ))}
        <Link href="/cotizar"
          className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition">
          + Analizar cotización
        </Link>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-500 text-sm">Cargando contratos...</div>
          </div>
        </div>
      ) : obras.length === 0 ? (
        <div className="text-center py-32 text-gray-600">No hay contratos para mostrar</div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-900/80">
                <th className="px-4 py-3 text-gray-500 font-medium w-8">#</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Obra / Contrato</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Empresa</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Monto</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Sobreprecio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {obras.map((o, i) => (
                <tr key={o.id} className="hover:bg-white/[0.02] transition group">
                  <td className="px-4 py-4 text-gray-600 text-xs">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{BANDERAS[o.pais] || "🌎"}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm leading-snug line-clamp-2">{o.titulo}</div>
                        <div className="text-gray-500 text-xs mt-0.5 truncate">{o.entidad_compradora}</div>
                        {o.fecha_adjudicacion && (
                          <div className="text-gray-700 text-xs mt-0.5">{o.fecha_adjudicacion}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {o.empresa_id ? (
                      <Link href={`/empresa/${o.empresa_id}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline text-xs block max-w-[160px] truncate">
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
                      <ScoreBadge score={o.sobreprecio_score || 0} pct={o.sobreprecio_pct || 0} />
                      <ScoreBar score={o.sobreprecio_score || 0} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-xs text-gray-600">
          Mostrando {Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)} de {total.toLocaleString()}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-400 disabled:opacity-30 hover:border-gray-600 hover:text-white transition">
            ← Anterior
          </button>
          <span className="px-4 py-2 text-gray-500 text-sm">Página {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={obras.length < 20}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-400 disabled:opacity-30 hover:border-gray-600 hover:text-white transition">
            Siguiente →
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
