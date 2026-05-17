"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const SEMAFORO: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  rojo:           { bg: "bg-red-500/10",    text: "text-red-300",    border: "border-red-700",    dot: "bg-red-500",    label: "Severo" },
  naranja:        { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-700", dot: "bg-orange-400", label: "Alto" },
  amarillo:       { bg: "bg-yellow-500/10", text: "text-yellow-300", border: "border-yellow-700", dot: "bg-yellow-400", label: "Moderado" },
  verde:          { bg: "bg-green-500/10",  text: "text-green-300",  border: "border-green-700",  dot: "bg-green-500",  label: "Normal" },
  sin_referencia: { bg: "bg-gray-800/50",   text: "text-gray-400",   border: "border-gray-700",   dot: "bg-gray-600",   label: "Sin ref." },
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

function SemDot({ dotClass }: { dotClass: string }) {
  return (
    <span className="relative flex h-3 w-3 shrink-0 mt-1">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${dotClass}`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${dotClass}`} />
    </span>
  )
}

export default function AnalisisPage() {
  const { id } = useParams()
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    axios.get(`${API}/cotizaciones/${id}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
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
        <div className="text-gray-500 text-sm tracking-wide">Cargando análisis...</div>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <div className="text-gray-500 text-sm">Análisis no encontrado.</div>
      <Link href="/" className="text-red-400 hover:text-red-300 text-sm transition-colors">Volver al inicio</Link>
    </div>
  )

  const resultado = data.resultado || {}
  const items     = resultado.items || data.items || []

  return (
    <main
      className="max-w-4xl mx-auto px-4 py-10"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8">
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Inicio
        </Link>
        <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <Link href="/radar" className="text-gray-500 hover:text-white text-sm transition-colors">Radar</Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Resultado del análisis</h1>
      {data.nombre_usuario && (
        <p className="text-gray-500 text-sm mb-6">{data.nombre_usuario}</p>
      )}
      {!data.nombre_usuario && <div className="mb-6" />}

      {/* Score + stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <ScoreGauge score={data.sobreprecio_score || 0} label="Score de riesgo" />
        <div className="md:col-span-2 space-y-3">
          {[
            { label: "Sobreprecio vs mercado", value: `${(data.sobreprecio_pct || 0) > 0 ? "+" : ""}${Number(data.sobreprecio_pct || 0).toFixed(1)}%` },
            { label: "Total cotizado", value: `${data.moneda} ${Number(resultado.total_cotizado || 0).toLocaleString()}` },
            { label: "Referencia de mercado", value: `${data.moneda} ${Number(resultado.total_referencia || 0).toLocaleString()}` },
            { label: "Cobertura de análisis", value: `${resultado.cobertura_pct || 0}%` },
          ].map(s => (
            <div key={s.label} className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">{s.label}</span>
              <span className="text-white font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Narrativa */}
      {data.narrativa_ia && (
        <div className="bg-gray-900 border border-gray-800 border-l-2 border-l-blue-500/40 rounded-xl p-6 mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
            <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            Análisis narrativo
          </h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{data.narrativa_ia}</p>
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Detalle por ítem</h2>
          <div className="space-y-3">
            {items.map((item: any, i: number) => {
              const s = SEMAFORO[item.semaforo] || SEMAFORO.sin_referencia
              const sp = item.sobreprecio_pct
              const fuentes: any[] = item.contratos_referencia || []
              return (
                <div key={i} className={`border rounded-xl ${s.bg} ${s.border} overflow-hidden`}>
                  {/* Main item row */}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <SemDot dotClass={s.dot} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm leading-snug ${s.text}`}>{item.descripcion}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.cantidad} {item.unidad}
                        {item.precio_referencia && (
                          <span className="ml-2">· precio mercado: <span className="text-gray-300 font-medium">{Number(item.precio_referencia).toFixed(2)}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${s.text}`}>
                        {Number(item.precio_unitario || 0).toFixed(2)}
                      </div>
                      {sp != null && (
                        <div className={`text-xs font-semibold mt-0.5 ${s.text}`}>
                          {sp > 0 ? "+" : ""}{Number(sp).toFixed(1)}%
                        </div>
                      )}
                      <div className={`text-xs mt-0.5 opacity-60 ${s.text}`}>{s.label}</div>
                    </div>
                  </div>

                  {/* Source contracts */}
                  {fuentes.length > 0 && (
                    <div className="border-t border-white/5 bg-black/20 px-4 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        Contratos públicos de referencia
                      </div>
                      <div className="space-y-1.5">
                        {fuentes.map((c: any, j: number) => (
                          <div key={j} className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 mt-0.5">
                              <CountryPill code={c.pais || "??"} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-300 truncate leading-snug">{c.titulo}</div>
                              <div className="text-gray-600 truncate">{c.entidad}{c.fecha ? ` · ${c.fecha}` : ""}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-gray-300 font-mono font-medium">
                                {Number(c.precio_unitario).toLocaleString()}
                              </div>
                              <div className="text-gray-600">{c.unidad || ""}</div>
                            </div>
                            {c.url_fuente && (
                              <a href={c.url_fuente} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition mt-0.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
