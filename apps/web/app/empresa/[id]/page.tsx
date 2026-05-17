"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAIS_NOMBRES: Record<string, string> = {
  GT: "Guatemala", MX: "México", SV: "El Salvador", PE: "Perú"
}

function CountryPill({ code }: { code: string }) {
  return (
    <span className="px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono font-bold text-gray-400">
      {code}
    </span>
  )
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])
  const color = score >= 80 ? "#f87171" : score >= 50 ? "#fb923c" : score >= 20 ? "#facc15" : "#4ade80"
  const r = 50; const circ = 2 * Math.PI * r
  const offset = circ * (1 - (animated ? score / 100 : 0))
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-black" style={{ color }}>{score.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-0.5">/ 100</div>
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-2">{label}</div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const [color, label] =
    score >= 80 ? ["bg-red-500/20 text-red-300 border-red-500/40", "Severo"] :
    score >= 50 ? ["bg-orange-500/20 text-orange-300 border-orange-500/40", "Moderado"] :
    score >= 20 ? ["bg-yellow-500/20 text-yellow-300 border-yellow-500/40", "Leve"] :
                  ["bg-green-500/20 text-green-300 border-green-500/40", "Normal"]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function riskBorderColor(score: number) {
  if (score >= 80) return "border-red-700/60"
  if (score >= 50) return "border-orange-700/60"
  if (score >= 20) return "border-yellow-700/60"
  return "border-green-700/60"
}

function riskGlowColor(score: number) {
  if (score >= 80) return "rgba(239,68,68,0.06)"
  if (score >= 50) return "rgba(249,115,22,0.06)"
  if (score >= 20) return "rgba(234,179,8,0.06)"
  return "rgba(34,197,94,0.06)"
}

function riskAccentColor(score: number) {
  if (score >= 80) return "border-l-red-500"
  if (score >= 50) return "border-l-orange-500"
  if (score >= 20) return "border-l-yellow-500"
  return "border-l-green-500"
}

export default function EmpresaPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    axios.get(`${API}/empresa/${id}`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-orange-500/20 border-b-orange-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        </div>
        <div className="text-gray-500 text-sm tracking-wide">Cargando empresa...</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <div className="text-gray-500 text-sm">Empresa no encontrada</div>
      <Link href="/radar" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Volver al Radar
      </Link>
    </div>
  )

  const obras: any[] = data.obras || []
  const presencias: any[] = data.presencias || []
  const score = data.score_riesgo || 0

  return (
    <main
      className="max-w-5xl mx-auto px-4 py-10"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Back button */}
      <Link href="/radar" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-8 w-fit transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Volver al Radar
      </Link>

      {/* Company header */}
      <div
        className={`border rounded-2xl p-6 mb-6 ${riskBorderColor(score)}`}
        style={{ background: `linear-gradient(135deg, ${riskGlowColor(score)}, rgba(17,24,39,0.6))` }}
      >
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {(data.paises || []).map((p: string) => (
                <CountryPill key={p} code={p} />
              ))}
            </div>
            <h1 className="text-2xl font-bold text-white mb-4 leading-tight">{data["nombre_canónico"]}</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Contracts */}
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Contratos</div>
                </div>
                <div className="text-2xl font-bold text-white">{(data.total_contratos || 0).toLocaleString()}</div>
              </div>
              {/* Adjudicado */}
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Total adjudicado</div>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${(data.total_adjudicado || 0) >= 1_000_000
                    ? `${((data.total_adjudicado || 0) / 1_000_000).toFixed(1)}M`
                    : (data.total_adjudicado || 0).toLocaleString()}
                </div>
              </div>
              {/* Sobreprecio */}
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                  </svg>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Sobreprecio prom.</div>
                </div>
                <div className={`text-2xl font-bold ${(data.sobreprecio_prom || 0) >= 50 ? "text-red-400" : (data.sobreprecio_prom || 0) >= 20 ? "text-yellow-400" : "text-green-400"}`}>
                  {(data.sobreprecio_prom || 0) > 0 ? "+" : ""}{Number(data.sobreprecio_prom || 0).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Score gauge */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ScoreGauge score={score} label="Score de riesgo" />
            <ScoreBadge score={score} />
          </div>
        </div>
      </div>

      {/* Presencia por país */}
      {presencias.length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500 mb-3">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
            </svg>
            Presencia regional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {presencias.map((p: any) => (
              <div key={p.pais} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
                <CountryPill code={p.pais} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{PAIS_NOMBRES[p.pais] || p.pais}</div>
                  {p.nombre_local && p.nombre_local !== data["nombre_canónico"] && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">{p.nombre_local}</div>
                  )}
                  {p.tax_id && (
                    <div className="text-xs text-gray-600 font-mono mt-0.5">RUT/NIT: {p.tax_id}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contratos */}
      <div>
        <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
          Contratos ({obras.length > 0 ? `top ${obras.length}` : "0"})
        </h2>
        {obras.length === 0 ? (
          <div className="text-center py-16 text-gray-600 bg-gray-900/40 border border-gray-800 rounded-2xl">
            No hay contratos registrados para esta empresa
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-left">Obra / Contrato</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-medium text-right">Sobreprecio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {obras.map((o: any) => {
                  const sp = o.sobreprecio_pct || 0
                  const spColor = sp >= 80 ? "text-red-400" : sp >= 50 ? "text-orange-400" : sp >= 20 ? "text-yellow-400" : "text-green-400"
                  const leftAccent = sp >= 80 ? "border-l-red-500" : sp >= 50 ? "border-l-orange-500" : sp >= 20 ? "border-l-yellow-500" : "border-l-green-500"
                  return (
                    <tr key={o.id} className={`hover:bg-white/[0.02] transition border-l-2 border-l-transparent hover:${leftAccent}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 mt-0.5">
                            <CountryPill code={o.pais || "??"} />
                          </span>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium leading-snug line-clamp-2">{o.titulo}</div>
                            {o.fecha_adjudicacion && (
                              <div className="text-gray-600 text-xs mt-0.5">{o.fecha_adjudicacion}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-400 text-xs font-mono whitespace-nowrap">
                        {o.monto_adjudicado
                          ? `$${Number(o.monto_adjudicado).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {o.sobreprecio_pct != null ? (
                          <span className={`font-bold text-sm ${spColor}`}>
                            {sp > 0 ? "+" : ""}{sp.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 text-xs text-gray-700 text-center">
        Los porcentajes de sobreprecio son estimativos basados en medianas históricas y no constituyen prueba legal.
      </div>
    </main>
  )
}
