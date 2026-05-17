"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IcArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
  </svg>
)
const IcDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IcBuilding = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IcBriefcase = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
)
const IcCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcMoney = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IcTrendUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)
const IcGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IcLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const IcFilePdf = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3z"/>
    <path d="M14 13h1a2 2 0 0 1 0 4h-1v-4z"/>
  </svg>
)
const IcSparkle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z"/>
  </svg>
)
const IcRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IcShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 80 ? "#f87171" : s >= 50 ? "#fb923c" : s >= 20 ? "#facc15" : "#4ade80"
}
function scoreTailwind(s: number) {
  return s >= 80 ? "text-red-400" : s >= 50 ? "text-orange-400" : s >= 20 ? "text-yellow-400" : "text-green-400"
}
function scoreBorder(s: number) {
  return s >= 80 ? "border-red-700/40" : s >= 50 ? "border-orange-700/40" : s >= 20 ? "border-yellow-700/40" : "border-green-700/40"
}
function scoreGlow(s: number) {
  return s >= 80 ? "shadow-red-500/10" : s >= 50 ? "shadow-orange-500/10" : s >= 20 ? "shadow-yellow-500/10" : "shadow-green-500/10"
}
function semColorBg(sem: string) {
  return sem === "rojo"    ? "bg-red-500/5 border-red-700/30"
    : sem === "naranja"    ? "bg-orange-500/5 border-orange-700/30"
    : sem === "amarillo"   ? "bg-yellow-500/5 border-yellow-700/30"
    : sem === "verde"      ? "bg-green-500/5 border-green-700/30"
    : "bg-gray-800/30 border-gray-700/30"
}
function semDotColor(sem: string) {
  return sem === "rojo" ? "#f87171" : sem === "naranja" ? "#fb923c"
    : sem === "amarillo" ? "#facc15" : sem === "verde" ? "#4ade80" : "#4b5563"
}
function semLabel(sem: string) {
  return sem === "rojo" ? "Severo" : sem === "naranja" ? "Alto"
    : sem === "amarillo" ? "Moderado" : sem === "verde" ? "Normal" : "Sin ref."
}

const PAIS_NAME: Record<string, string> = { MX: "México", GT: "Guatemala", SV: "El Salvador", PE: "Perú" }
const PAIS_FLAG: Record<string, string> = { MX: "MX", GT: "GT", SV: "SV", PE: "PE" }

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, animate }: { score: number; animate: boolean }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - (animate ? score / 100 : 0))
  const col = scoreColor(score)
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-full h-full" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="7"/>
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={col} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
        {/* Glow filter */}
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={col} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          filter="url(#glow)" opacity="0.5"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-black" style={{ color: col, lineHeight: 1 }}>{score.toFixed(0)}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest">riesgo</div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, borderColor, delay }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  color: string; borderColor: string; delay: number
}) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div
      className={`relative bg-gray-900/70 border ${borderColor} rounded-2xl p-5 overflow-hidden group
        transition-all duration-500 hover:scale-[1.02] hover:shadow-lg`}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.2s, scale 0.2s` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 70%)" }}/>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color} bg-current/10`}
        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
        <span className={color}>{icon}</span>
      </div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── Semaphore dot SVG ─────────────────────────────────────────────────────────
function SemDot({ sem }: { sem: string }) {
  const col = semDotColor(sem)
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 mt-1">
      <circle cx="5" cy="5" r="4" fill={col} opacity="0.9"/>
      {sem !== "sin_referencia" && <circle cx="5" cy="5" r="4" fill={col} opacity="0.3">
        <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Category score bar ───────────────────────────────────────────────────────
function CategoryBar({ cat, moneda }: { cat: any; moneda: string }) {
  const [anim, setAnim] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [])

  if (!cat || cat.semaforo === "sin_datos") return null

  const { p10, p25, mediana, p75, p90, monto, min_monto, max_monto } = cat
  const lo  = Math.min(min_monto, monto) * 0.9
  const hi  = Math.max(max_monto, monto) * 1.05

  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))

  const markers = [
    { val: p25,    label: "P25",    color: "#4ade80", y: 0 },
    { val: mediana, label: "P50",   color: "#facc15", y: 1 },
    { val: p75,    label: "P75",    color: "#fb923c", y: 0 },
    { val: p90,    label: "P90",    color: "#f87171", y: 1 },
  ]

  const montoX   = pct(monto)
  const sem       = cat.semaforo as string
  const montoColor = sem === "rojo" ? "#f87171" : sem === "naranja" ? "#fb923c" : sem === "amarillo" ? "#facc15" : "#4ade80"
  const fmt = (n: number) => n >= 1_000_000 ? `${moneda} ${(n/1_000_000).toFixed(1)}M` : `${moneda} ${Number(n).toLocaleString()}`

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="relative h-10 rounded-full overflow-hidden bg-gray-800/60 border border-gray-700/40">
        {/* Color zones */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-green-500/10"  style={{ width: `${pct(p25)}%` }}/>
          <div className="h-full bg-yellow-500/10" style={{ width: `${pct(p75) - pct(p25)}%` }}/>
          <div className="h-full bg-orange-500/10" style={{ width: `${pct(p90) - pct(p75)}%` }}/>
          <div className="h-full bg-red-500/10 flex-1"/>
        </div>

        {/* Percentile tick lines */}
        {markers.map(m => (
          <div key={m.label}
            className="absolute top-0 bottom-0 w-px opacity-60"
            style={{ left: `${pct(m.val)}%`, background: m.color }}
          />
        ))}

        {/* This contract marker */}
        <div
          className="absolute top-1 bottom-1 w-1 rounded-full shadow-lg transition-all duration-1000"
          style={{
            left:       `${anim ? montoX : 0}%`,
            background: montoColor,
            boxShadow:  `0 0 8px 2px ${montoColor}60`,
            transform:  "translateX(-50%)",
          }}
        />
      </div>

      {/* Labels */}
      <div className="relative h-6 text-[10px] text-gray-500">
        {markers.map(m => (
          <div key={m.label} className="absolute flex flex-col items-center gap-0.5"
            style={{ left: `${pct(m.val)}%`, transform: "translateX(-50%)" }}>
            <span style={{ color: m.color }} className="font-semibold">{m.label}</span>
          </div>
        ))}
        <div className="absolute flex flex-col items-center" style={{ left: `${montoX}%`, transform: "translateX(-50%)" }}>
          <span style={{ color: montoColor }} className="font-bold whitespace-nowrap">↑ Este</span>
        </div>
      </div>

      {/* Values row */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: "P25",    val: p25,    color: "text-green-400" },
          { label: "Mediana", val: mediana, color: "text-yellow-400" },
          { label: "P75",    val: p75,    color: "text-orange-400" },
          { label: "P90",    val: p90,    color: "text-red-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-2">
            <div className={`text-[10px] font-semibold ${color} uppercase tracking-wide`}>{label}</div>
            <div className="text-[11px] text-gray-300 font-mono mt-0.5 tabular-nums">{fmt(val)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ObraPage() {
  const { id } = useParams()
  const [data, setData]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [ready, setReady]             = useState(false)
  const [comparacion, setComparacion] = useState<any>(null)
  const [loadingIA, setLoadingIA]     = useState(false)
  const [errorIA, setErrorIA]         = useState<string | null>(null)
  const [showPdf, setShowPdf]         = useState(false)
  const [catScore, setCatScore]       = useState<any>(null)
  const [catLoading, setCatLoading]   = useState(false)

  useEffect(() => {
    axios.get(`${API}/obra/${id}`)
      .then(r => { setData(r.data); setTimeout(() => setReady(true), 80) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    // Carga score por categoría en paralelo (sin IA para no bloquear)
    setCatLoading(true)
    axios.get(`${API}/obra/${id}/score-categoria`, { params: { genera_ia: false } })
      .then(r => setCatScore(r.data))
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [id])

  function generarComparacion() {
    setLoadingIA(true); setErrorIA(null)
    axios.get(`${API}/obra/${id}/contrato-ia`)
      .then(r => setComparacion(r.data))
      .catch(e => setErrorIA(e?.response?.data?.detail || "Error al generar estimación"))
      .finally(() => setLoadingIA(false))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"/>
          <div className="w-16 h-16 rounded-full border-2 border-red-500 border-t-transparent animate-spin"/>
        </div>
        <div className="text-gray-500 text-sm tracking-wide">Cargando contrato...</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="text-center py-32 space-y-3">
      <div className="text-gray-600 text-4xl">∅</div>
      <div className="text-gray-500">Contrato no encontrado.</div>
      <Link href="/radar" className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition-colors">
        <IcArrowLeft/> Volver al Radar
      </Link>
    </div>
  )

  const items: any[] = data.items || []
  const moneda       = data.moneda || ""
  const diferencia   = data.diferencia || 0
  const totalOf      = data.total_oficial || 0
  const totalRef     = data.total_referencia || 0
  const itemsConRef  = items.filter(i => i.semaforo !== "sin_referencia")
  const score        = data.sobreprecio_score || 0
  const paisName     = PAIS_NAME[data.pais] || data.pais

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${moneda} ${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000   ? `${moneda} ${Number(n).toLocaleString()}`
    : `${moneda} ${n}`

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <Link href="/radar"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 group transition-colors">
        <span className="group-hover:-translate-x-0.5 transition-transform"><IcArrowLeft/></span>
        Volver al Radar
      </Link>

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div
        className={`relative bg-gray-900/60 border rounded-3xl p-7 mb-6 overflow-hidden transition-all duration-700 ${scoreBorder(score)}`}
        style={{ opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)" }}
      >
        {/* Gradient glow top-right */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: scoreColor(score) }}/>

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            {/* País + fuente */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1.5">
                <IcShield/>{paisName}
              </span>
              <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-500 font-mono">
                {data.fuente}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white leading-snug mb-2 tracking-tight">
              {data.titulo}
            </h1>

            {/* Entidad */}
            {data.entidad_compradora && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
                <IcBuilding/>{data.entidad_compradora}
              </div>
            )}

            {/* Empresa */}
            {data.empresa_nombre && (
              <div className="flex items-center gap-1.5 text-sm mt-1">
                <IcBriefcase/>
                {data.empresa_id ? (
                  <Link href={`/empresa/${data.empresa_id}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors hover:underline underline-offset-2">
                    {data.empresa_nombre} →
                  </Link>
                ) : (
                  <span className="text-gray-500">{data.empresa_nombre}</span>
                )}
              </div>
            )}

            {/* Fecha */}
            {data.fecha_adjudicacion && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                <IcCalendar/>Adjudicado: {data.fecha_adjudicacion}
              </div>
            )}
          </div>

          {/* Score ring + links */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ScoreRing score={score} animate={ready}/>
            {data.url_fuente && (
              <a href={data.url_fuente} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/30 bg-blue-500/8 text-blue-400 hover:bg-blue-500/15 rounded-xl text-xs font-medium transition-all hover:border-blue-500/50 w-full justify-center">
                <IcLink/>Ver proyecto original
              </a>
            )}
            {data.pdf_url && (
              <a href={data.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/15 rounded-xl text-xs font-medium transition-all hover:border-red-500/50 w-full justify-center">
                <IcFilePdf/>Ver PDF del contrato
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard delay={100} icon={<IcMoney/>}   label="Monto oficial"
          value={data.monto_adjudicado ? fmt(data.monto_adjudicado) : "—"}
          color="text-white" borderColor="border-gray-800"/>
        <StatCard delay={180} icon={<IcTrendUp/>} label="Total esperado mercado"
          value={totalRef > 0 ? fmt(totalRef) : "—"}
          sub={`${data.cobertura_pct || 0}% con referencia`}
          color="text-emerald-400" borderColor="border-emerald-900/40"/>
        <StatCard delay={260} icon={<IcTrendUp/>} label="Posible sobreprecio"
          value={diferencia > 0 && totalRef > 0 ? fmt(diferencia) : "—"}
          sub={totalRef > 0 && diferencia > 0 ? `+${((diferencia / totalRef) * 100).toFixed(1)}% sobre mercado` : undefined}
          color={diferencia > 0 ? "text-red-400" : "text-gray-400"}
          borderColor={diferencia > 0 ? "border-red-900/40" : "border-gray-800"}/>
        <StatCard delay={340} icon={<IcGrid/>}    label="Ítems analizados"
          value={`${itemsConRef.length} / ${items.length}`}
          sub="con precio de mercado"
          color="text-gray-300" borderColor="border-gray-800"/>
      </div>

      {/* ── Score por categoría ───────────────────────────────────────────── */}
      {(catScore || catLoading) && (
        <div className="mb-8 bg-gray-900/50 border border-gray-800 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <IcTrendUp/>Comparación por categoría
              </h2>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {catScore
                  ? `vs. ${catScore.n_contratos.toLocaleString()} contratos${catScore.categoria ? ` de "${catScore.categoria}"` : ""} en ${data?.pais}`
                  : "Calculando distribución…"}
              </p>
            </div>

            {catScore && catScore.semaforo !== "sin_datos" && (
              <div className="text-right shrink-0">
                <div className={`text-2xl font-black tabular-nums ${
                  catScore.score >= 80 ? "text-red-400" : catScore.score >= 50 ? "text-orange-400" :
                  catScore.score >= 20 ? "text-yellow-400" : "text-green-400"
                }`}>{catScore.score.toFixed(0)}</div>
                <div className="text-[10px] text-gray-600 uppercase tracking-widest">score cat.</div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {catLoading && !catScore && (
              <div className="flex items-center justify-center py-8 gap-3 text-gray-600 text-sm">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"/>
                Comparando con contratos similares…
              </div>
            )}

            {catScore && catScore.semaforo === "sin_datos" && (
              <div className="text-center py-6 text-gray-600 text-sm">
                Sin contratos similares en la base de datos para comparar.
              </div>
            )}

            {catScore && catScore.semaforo !== "sin_datos" && (
              <>
                {/* Resumen de alertas */}
                {catScore.alertas?.length > 0 && (
                  <div className="space-y-1.5">
                    {catScore.alertas.map((a: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-orange-300 bg-orange-500/8 border border-orange-700/30 rounded-xl px-4 py-2.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        {a}
                      </div>
                    ))}
                  </div>
                )}

                {/* Barra de distribución */}
                <CategoryBar cat={catScore} moneda={data?.moneda || ""}/>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  {[
                    {
                      label: "Posición percentil",
                      val: `${catScore.percentil?.toFixed(0)}°`,
                      color: catScore.percentil >= 90 ? "text-red-400" : catScore.percentil >= 75 ? "text-orange-400" : "text-gray-300",
                    },
                    {
                      label: "vs mediana categoría",
                      val: `${catScore.sobreprecio_pct >= 0 ? "+" : ""}${catScore.sobreprecio_pct?.toFixed(1)}%`,
                      color: catScore.sobreprecio_pct > 50 ? "text-red-400" : catScore.sobreprecio_pct > 20 ? "text-orange-400" : "text-green-400",
                    },
                    {
                      label: "Contratos comparados",
                      val: catScore.n_contratos?.toLocaleString(),
                      color: "text-gray-300",
                    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{label}</div>
                      <div className={`font-bold tabular-nums ${color}`}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Contratos similares */}
                {catScore.ejemplos?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-2">
                      Contratos más similares en monto
                    </div>
                    <div className="rounded-xl border border-gray-800/50 overflow-hidden divide-y divide-gray-800/40">
                      {catScore.ejemplos.map((e: any, i: number) => {
                        const diff = e.diferencia_pct || 0
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-800/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <Link href={`/obra/${e.obra_id}`}
                                className="text-xs text-gray-300 hover:text-white transition-colors truncate block">
                                {e.titulo}
                              </Link>
                              <div className="text-[10px] text-gray-600 mt-0.5">{e.entidad_compradora}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono text-gray-400 tabular-nums">
                                {e.moneda} {Number(e.monto_adjudicado).toLocaleString()}
                              </div>
                              <div className={`text-[10px] font-semibold tabular-nums ${
                                Math.abs(diff) < 10 ? "text-gray-500" : diff > 0 ? "text-orange-400" : "text-emerald-400"
                              }`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(0)}% vs este
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Botón para generar narrativa IA */}
                {!catScore.narrativa_ia && (
                  <button
                    onClick={() => {
                      setCatLoading(true)
                      axios.get(`${API}/obra/${id}/score-categoria`, { params: { genera_ia: true } })
                        .then(r => setCatScore(r.data))
                        .finally(() => setCatLoading(false))
                    }}
                    disabled={catLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm
                      bg-indigo-500/8 border border-indigo-500/25 text-indigo-400
                      hover:bg-indigo-500/15 hover:border-indigo-400/40 transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {catLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>Generando narrativa…</>
                      : <><IcSparkle/>Generar análisis IA de la categoría</>
                    }
                  </button>
                )}

                {/* Narrativa IA */}
                {catScore.narrativa_ia && (
                  <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl px-5 py-4 text-xs text-gray-300 leading-relaxed">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2 text-[11px] uppercase tracking-wide">
                      <IcSparkle/>Análisis comparativo IA
                    </div>
                    {catScore.narrativa_ia}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Visor PDF ────────────────────────────────────────────────────── */}
      {data.pdf_url && (
        <div className="mb-8">
          <button
            onClick={() => setShowPdf(v => !v)}
            className="flex items-center gap-2.5 w-full px-5 py-3.5
              bg-gray-900/60 border border-red-500/20 hover:border-red-500/40
              hover:bg-gray-900/80 rounded-2xl text-sm text-gray-300 hover:text-white
              transition-all duration-200 group"
          >
            <span className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <IcFilePdf/>
            </span>
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">Documento original del contrato</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {showPdf ? "Ocultar visor" : "Ver PDF embebido · " + (data.fuente || "")}
              </div>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-500 transition-transform duration-300 ${showPdf ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showPdf && (
            <div className="mt-2 rounded-2xl overflow-hidden border border-gray-800 bg-gray-950">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900/80">
                <span className="text-xs text-gray-500 font-mono truncate flex-1 mr-4">{data.pdf_url}</span>
                <a href={data.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all shrink-0">
                  <IcLink/>Abrir en nueva pestaña
                </a>
              </div>
              <iframe
                src={data.pdf_url}
                className="w-full"
                style={{ height: "700px" }}
                title="Documento original del contrato"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de ítems ────────────────────────────────────────────────── */}
      {items.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <IcGrid/>Comparación ítem por ítem
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {[
                { col: "#4b5563", label: "Sin ref." },
                { col: "#4ade80", label: "Normal" },
                { col: "#facc15", label: "Moderado" },
                { col: "#fb923c", label: "Alto" },
                { col: "#f87171", label: "Severo" },
              ].map(({ col, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill={col}/></svg>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-4 mb-2 text-[10px] text-gray-600 font-semibold uppercase tracking-widest">
            <div className="col-span-5">Ítem</div>
            <div className="col-span-1 text-right">Cant.</div>
            <div className="col-span-2 text-right">Precio oficial</div>
            <div className="col-span-2 text-right">Precio mercado</div>
            <div className="col-span-2 text-right">Diferencia</div>
          </div>

          <div className="space-y-1.5">
            {items.map((item: any, i: number) => {
              const sem  = item.semaforo || "sin_referencia"
              const sp   = item.sobreprecio_pct
              const hasSp = sp != null && sem !== "sin_referencia"
              const pu   = Number(item.precio_unitario || 0)
              const ref  = Number(item.precio_referencia || 0)
              const qty  = Number(item.cantidad || 1)
              const difItem = (pu - ref) * qty

              return (
                <div key={i}
                  className={`border rounded-2xl transition-all duration-200 hover:scale-[1.005] hover:shadow-md ${semColorBg(sem)}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                    <div className="col-span-5 flex items-start gap-2.5 min-w-0">
                      <SemDot sem={sem}/>
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium leading-snug">{item.descripcion}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{item.unidad} · {semLabel(sem)}</div>
                      </div>
                    </div>
                    <div className="col-span-1 text-right text-sm text-gray-500 tabular-nums">{qty}</div>
                    <div className="col-span-2 text-right">
                      <div className="text-sm font-mono text-gray-200 tabular-nums">{pu.toLocaleString()}</div>
                      {qty > 1 && <div className="text-[10px] text-gray-600">{(pu * qty).toLocaleString()}</div>}
                    </div>
                    <div className="col-span-2 text-right">
                      {ref > 0 ? (
                        <>
                          <div className="text-sm font-mono text-emerald-400 tabular-nums">{ref.toLocaleString()}</div>
                          {qty > 1 && <div className="text-[10px] text-gray-600">{(ref * qty).toLocaleString()}</div>}
                        </>
                      ) : (
                        <div className="text-[11px] text-gray-600">—</div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {hasSp ? (
                        <>
                          <div className={`text-sm font-bold tabular-nums ${scoreTailwind(item.sobreprecio_score || 0)}`}>
                            {sp > 0 ? "+" : ""}{Number(sp).toFixed(1)}%
                          </div>
                          {difItem !== 0 && (
                            <div className="text-[10px] text-gray-500 tabular-nums">
                              {difItem > 0 ? "+" : ""}{difItem.toLocaleString()}
                            </div>
                          )}
                        </>
                      ) : <div className="text-[11px] text-gray-600">—</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totales */}
          {totalRef > 0 && (
            <div className="mt-4 bg-gray-900/80 border border-gray-700/60 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-800">
                {[
                  { label: "Total pagado",          val: fmt(totalOf),          col: "text-white" },
                  { label: "Total esperado mercado", val: fmt(totalRef),         col: "text-emerald-400" },
                  { label: "Posible sobreprecio",    val: (diferencia > 0 ? "+" : "") + fmt(Math.abs(diferencia)),
                    col: diferencia > 0 ? "text-red-400" : "text-emerald-400" },
                ].map(({ label, val, col }) => (
                  <div key={label} className="px-4">
                    <div className="text-[11px] text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
                    <div className={`text-lg font-bold tabular-nums ${col}`}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-gray-900/30 border border-gray-800/60 rounded-3xl">
          <IcDoc/>
          <div className="text-gray-600 text-sm">Este contrato no tiene desglose de ítems disponible.</div>
        </div>
      )}

      {/* ── Comparación original vs IA ────────────────────────────────────── */}
      {(() => {
        const iaData    = comparacion?.ia
        const iaTotal   = iaData?.total || 0
        const origTotal = totalOf > 0 ? totalOf : (data.monto_adjudicado || 0)
        const diff      = origTotal - iaTotal
        const diffPct   = iaTotal > 0 ? ((diff / iaTotal) * 100) : 0

        return (
          <div className="mt-10 border border-gray-800 rounded-3xl overflow-hidden bg-gray-950/40">

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-800/80">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <IcDoc/>Contrato original vs. estimación de mercado
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  {iaData
                    ? iaData.generado_por === "ia_llm"
                      ? "Estimación generada por IA con precios típicos de mercado"
                      : "Basada en precios históricos de contratos similares"
                    : "Compará el contrato adjudicado con una estimación justa de mercado"}
                </p>
              </div>
              <button
                onClick={generarComparacion}
                disabled={loadingIA}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                  hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:scale-105
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
              >
                {loadingIA
                  ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>Generando...</>
                  : iaData
                    ? <><IcRefresh/>Regenerar</>
                    : <><IcSparkle/>Generar estimación IA</>
                }
              </button>
            </div>

            {errorIA && (
              <div className="px-7 py-3 text-sm text-red-400 bg-red-500/5 border-b border-red-900/30 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errorIA}
              </div>
            )}

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800/60">

              {/* ── Contrato original ──────────────────────────────────── */}
              <div className="p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
                    <IcDoc/>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Contrato original scrapeado</div>
                    <div className="text-[11px] text-gray-500">Tal como fue adjudicado en {data.fuente}</div>
                  </div>
                </div>

                {/* Links fuente + PDF */}
                <div className="flex flex-col gap-2 mb-5">
                  {data.url_fuente && (
                    <a href={data.url_fuente} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 w-full px-4 py-2.5
                        bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/40
                        hover:bg-gray-800 rounded-xl text-sm text-gray-400 hover:text-white
                        transition-all duration-200 group">
                      <span className="text-gray-500 group-hover:text-blue-400 transition-colors"><IcLink/></span>
                      <span className="flex-1 truncate text-xs">Ver proyecto original en {data.fuente}</span>
                      <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-xs">↗</span>
                    </a>
                  )}
                  {data.pdf_url && (
                    <a href={data.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 w-full px-4 py-2.5
                        bg-red-950/20 border border-red-500/20 hover:border-red-500/40
                        hover:bg-red-950/30 rounded-xl text-sm text-red-400 hover:text-red-300
                        transition-all duration-200 group">
                      <span className="group-hover:scale-110 transition-transform"><IcFilePdf/></span>
                      <span className="flex-1 truncate text-xs">Descargar / ver PDF del contrato original</span>
                      <span className="text-red-700 group-hover:text-red-400 transition-colors text-xs">↗</span>
                    </a>
                  )}
                </div>

                {/* Metadata */}
                <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 divide-y divide-gray-800/40 mb-5 overflow-hidden">
                  {[
                    { icon: <IcBuilding/>,  label: "Entidad compradora",  val: data.entidad_compradora },
                    { icon: <IcBriefcase/>, label: "Empresa adjudicada",  val: data.empresa_nombre },
                    { icon: <IcCalendar/>,  label: "Fecha adjudicación",  val: data.fecha_adjudicacion },
                    { icon: <IcShield/>,    label: "Fuente",              val: `${data.fuente} · ${data.pais}` },
                  ].map(({ icon, label, val }) => val ? (
                    <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-gray-600 shrink-0">{icon}</span>
                      <span className="text-[11px] text-gray-600 shrink-0 w-32">{label}</span>
                      <span className="text-[11px] text-gray-300 text-right flex-1 leading-snug">{val}</span>
                    </div>
                  ) : null)}
                </div>

                {/* Items o monto */}
                {items.length > 0 ? (
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">Desglose de ítems</div>
                    <div className="space-y-0 rounded-xl border border-gray-800/40 overflow-hidden">
                      {items.map((item: any, i: number) => {
                        const pu  = Number(item.precio_unitario || 0)
                        const qty = Number(item.cantidad || 1)
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-300 leading-snug truncate">{item.descripcion}</div>
                              <div className="text-[10px] text-gray-600">{qty} {item.unidad}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono text-gray-400 tabular-nums">{moneda} {pu.toLocaleString()}</div>
                              {qty > 1 && <div className="text-[10px] text-gray-600">= {(pu * qty).toLocaleString()}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-4 px-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total adjudicado</span>
                      <span className="text-base font-bold text-white tabular-nums">{fmt(origTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gray-900/40 border border-gray-800/40 px-5 py-6 text-center space-y-2">
                    <div className="text-lg font-bold text-white">{data.monto_adjudicado ? fmt(data.monto_adjudicado) : "—"}</div>
                    <div className="text-[11px] text-gray-600">Monto adjudicado total</div>
                    <div className="text-[10px] text-gray-700 italic pt-1">La fuente no publicó desglose de ítems</div>
                  </div>
                )}
              </div>

              {/* ── Estimación IA ──────────────────────────────────────── */}
              <div className="p-7 relative overflow-hidden"
                style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.04) 0%, transparent 60%)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <IcSparkle/>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-indigo-300">
                      {iaData ? iaData.generado_por === "ia_llm" ? "Desglose estimado (IA)" : "Estimación de mercado" : "Estimación de mercado (IA)"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {iaData
                        ? iaData.generado_por === "ia_llm"
                          ? "Generado por IA con precios típicos"
                          : `${iaData.cobertura_pct}% de ítems con referencia histórica`
                        : "Pendiente de generar"}
                    </div>
                  </div>
                </div>

                {!iaData && !loadingIA && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                      <IcSparkle/>
                    </div>
                    <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                      Generá una estimación de cuánto debería haber costado este contrato según el mercado.
                    </p>
                  </div>
                )}

                {loadingIA && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping"/>
                      <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
                    </div>
                    <p className="text-sm text-gray-500">La IA está estimando precios...</p>
                  </div>
                )}

                {iaData && !loadingIA && (
                  <div>
                    {iaData.generado_por !== "ia_llm" && (
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">Precios de referencia histórica</div>
                    )}
                    <div className="rounded-xl border border-indigo-900/30 overflow-hidden mb-4">
                      {(iaData.items as any[]).map((item: any, i: number) => {
                        const pu   = Number(item.precio_unitario || 0)
                        const pOf  = Number(item.precio_oficial  || 0)
                        const qty  = Number(item.cantidad || 1)
                        const sp   = item.sobreprecio_pct
                        const hasSp = sp != null && item.tiene_referencia && pOf > 0
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-indigo-900/20 last:border-0 hover:bg-indigo-950/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-300 leading-snug truncate">{item.descripcion}</div>
                              <div className="text-[10px] text-gray-600">{qty} {item.unidad}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono text-indigo-300 tabular-nums">{moneda} {pu.toLocaleString()}</div>
                              {qty > 1 && <div className="text-[10px] text-gray-600">= {(pu * qty).toLocaleString()}</div>}
                              {hasSp && (
                                <div className={`text-[10px] font-bold tabular-nums ${sp > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                  {sp > 0 ? "+" : ""}{Number(sp).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Totales */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total estimado</span>
                        <span className="text-base font-bold text-indigo-300 tabular-nums">{fmt(iaTotal)}</span>
                      </div>
                      {iaTotal > 0 && origTotal > 0 && (
                        <div className="flex items-center justify-between bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3">
                          <span className="text-xs text-gray-500">Posible sobreprecio</span>
                          <div className="text-right">
                            <span className={`text-sm font-bold tabular-nums ${diff > 0 ? "text-red-400" : "text-emerald-400"}`}>
                              {diff > 0 ? "+" : ""}{fmt(Math.abs(diff))}
                            </span>
                            <span className={`text-xs ml-1.5 ${diff > 0 ? "text-red-500/70" : "text-emerald-500/70"}`}>
                              ({diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {iaData.notas && (
                      <p className="text-[10px] text-gray-600 italic border-t border-gray-800/40 pt-3 mt-4 leading-relaxed">
                        {iaData.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-gray-700">
        <IcShield/>
        Los precios de mercado son medianas históricas y no constituyen prueba legal.
      </div>
    </main>
  )
}
