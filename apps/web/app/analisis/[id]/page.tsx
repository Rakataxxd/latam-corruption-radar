"use client"
import { useEffect, useState, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import axios from "axios"
import Link from "next/link"

type ContribuirState = "idle" | "loading" | "done" | "declined"
type RadarState      = "idle" | "loading" | "done" | "declined"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PAISES: Record<string, { name: string; flag: string }> = {
  GT: { name: "Guatemala",   flag: "🇬🇹" },
  SV: { name: "El Salvador", flag: "🇸🇻" },
  MX: { name: "México",      flag: "🇲🇽" },
  PE: { name: "Perú",        flag: "🇵🇪" },
}

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
  return <Suspense><AnalisisInner /></Suspense>
}

function AnalisisInner() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const esGubernamental = searchParams.get("tipo") === "gubernamental"

  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [visible, setVisible]   = useState(false)
  const [contribuir, setContribuir] = useState<ContribuirState>("idle")
  const [guardados, setGuardados]   = useState<{ guardados: number; actualizados: number } | null>(null)

  const [radarState, setRadarState]         = useState<RadarState>("idle")
  const [entidadCompradora, setEntidad]     = useState("")
  const [tituloContrato, setTituloContrato] = useState("")
  const [empresaCotizante, setEmpresa]      = useState("")
  const [obraPublicadaId, setObraId]        = useState<string | null>(null)

  const handleContribuir = async () => {
    setContribuir("loading")
    try {
      const { data: res } = await axios.post(`${API}/cotizacion/${id}/contribuir`)
      setGuardados(res)
      setContribuir("done")
    } catch {
      setContribuir("idle")
    }
  }

  const handlePublicarRadar = async () => {
    if (!entidadCompradora.trim()) return
    setRadarState("loading")
    try {
      const { data: res } = await axios.post(`${API}/cotizacion/${id}/publicar-en-radar`, {
        entidad_compradora: entidadCompradora.trim(),
        titulo: tituloContrato.trim() || undefined,
        empresa_nombre: empresaCotizante.trim() || undefined,
      })
      setObraId(res.obra_id)
      setRadarState("done")
      // Ir al Radar para ver el contrato publicado
      setTimeout(() => router.push("/radar"), 1200)
    } catch {
      setRadarState("idle")
    }
  }

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

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-white">Resultado del análisis</h1>
        {data.pais && PAISES[data.pais] && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 font-medium">
            {PAISES[data.pais].flag} {PAISES[data.pais].name}
          </span>
        )}
      </div>
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
            { label: "Total cotizado", value: `$${Number(resultado.total_cotizado || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` },
            { label: "Referencia de mercado", value: `$${Number(resultado.total_referencia || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` },
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

      {/* ── Card de contribución ── */}
      {contribuir === "idle" && data && (
        <div className="mb-8 bg-gray-900/60 border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">¿Mejoramos el radar de mercado juntos?</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Los precios de referencia de esta cotización pueden guardarse anónimamente para que futuros análisis sean más precisos.
                Los datos también aparecerán como nodos en el grafo de precios locales.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleContribuir}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Sí, contribuir precios
                </button>
                <button
                  onClick={() => setContribuir("declined")}
                  className="px-4 py-2 text-gray-500 hover:text-gray-300 text-xs font-medium rounded-lg transition-all hover:bg-white/5"
                >
                  No, gracias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contribuir === "loading" && (
        <div className="mb-8 bg-gray-900/60 border border-indigo-500/20 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
          <span className="text-gray-400 text-sm">Guardando precios en el radar...</span>
        </div>
      )}

      {contribuir === "done" && guardados && (
        <div className="mb-8 bg-green-500/8 border border-green-800/40 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div>
            <p className="text-green-300 text-sm font-medium">¡Gracias por contribuir!</p>
            <p className="text-green-400/70 text-xs mt-0.5">
              {guardados.guardados > 0 && `${guardados.guardados} precios nuevos agregados`}
              {guardados.guardados > 0 && guardados.actualizados > 0 && " · "}
              {guardados.actualizados > 0 && `${guardados.actualizados} medianas actualizadas`}
            </p>
          </div>
        </div>
      )}

      {/* ── Card de publicar en Radar (solo cotizaciones gubernamentales) ── */}
      {esGubernamental && radarState === "idle" && (
        <div className="mb-8 bg-gray-900/60 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">¿Publicar este contrato en el Radar?</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Podés publicarlo anónimamente en el Radar de Obras Públicas para que otros ciudadanos puedan verlo y compararlo.
              </p>
              <div className="space-y-2 mb-4">
                <input
                  value={entidadCompradora}
                  onChange={e => setEntidad(e.target.value)}
                  placeholder="Entidad compradora (ej: Ministerio de Salud) *"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs outline-none transition-all"
                />
                <input
                  value={empresaCotizante}
                  onChange={e => setEmpresa(e.target.value)}
                  placeholder="Empresa que cotiza (ej: Constructora ABC, S.A.)"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs outline-none transition-all"
                />
                <input
                  value={tituloContrato}
                  onChange={e => setTituloContrato(e.target.value)}
                  placeholder="Título del contrato (opcional)"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs outline-none transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePublicarRadar}
                  disabled={!entidadCompradora.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/>
                  </svg>
                  Publicar en Radar
                </button>
                <button
                  onClick={() => setRadarState("declined")}
                  className="px-4 py-2 text-gray-500 hover:text-gray-300 text-xs font-medium rounded-lg transition-all hover:bg-white/5"
                >
                  No, gracias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {radarState === "loading" && (
        <div className="mb-8 bg-gray-900/60 border border-red-500/20 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin shrink-0" />
          <span className="text-gray-400 text-sm">Publicando en el Radar...</span>
        </div>
      )}

      {radarState === "done" && obraPublicadaId && (
        <div className="mb-8 bg-green-500/8 border border-green-800/40 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div>
            <p className="text-green-300 text-sm font-medium">¡Contrato publicado en el Radar!</p>
            <Link
              href={`/obra/${obraPublicadaId}`}
              className="text-green-400/70 text-xs mt-0.5 hover:text-green-300 underline underline-offset-2 transition-colors"
            >
              Ver en el Radar →
            </Link>
          </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm leading-snug ${s.text}`}>{item.descripcion}</span>
                        {item.es_estimacion_ia && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                            </svg>
                            Estimación IA
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.cantidad} {item.unidad}
                        {item.precio_referencia && (
                          <span className="ml-2">· ref: <span className="text-gray-300 font-medium">${Number(item.precio_referencia).toFixed(2)}</span></span>
                        )}
                        {item.fuente_ref && (
                          <span className="ml-2 text-gray-600 truncate" title={item.fuente_ref}>· {item.fuente_ref.length > 50 ? item.fuente_ref.slice(0, 50) + "…" : item.fuente_ref}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${s.text}`}>
                        ${Number(item.precio_unitario || 0).toFixed(2)}
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

      {/* ── Botón fijo al fondo ── */}
      {data && (
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm font-medium">¿Querés ver cómo se conectan los contratos?</p>
            <p className="text-gray-600 text-xs mt-0.5">Red interactiva de empresas y entidades públicas</p>
          </div>
          <a
            href="/grafo.html"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Ver grafo de contratos
          </a>
        </div>
      )}
    </main>
  )
}
