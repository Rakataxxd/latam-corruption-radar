"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PAISES = [
  { code: "GT", name: "Guatemala",   fuente: "Guatecompras" },
  { code: "SV", name: "El Salvador", fuente: "COMPRASAL" },
  { code: "MX", name: "México",      fuente: "CompraNet" },
  { code: "PE", name: "Perú",        fuente: "SEACE" },
]

const EJEMPLOS = [
  "Cotización de construcción de escuela",
  "Adquisición de equipos médicos",
  "Proyecto de pavimentación",
  "Compra de laptops para gobierno",
]

/* ── SVG icon components ── */

function IconUpload() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function IconAlert({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function IconSemaphore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  )
}

function IconTrendingUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconCpu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

/* ── Page component ── */

export default function CotizarPage() {
  const [file, setFile]       = useState<File | null>(null)
  const [pais, setPais]       = useState("GT")
  const [nombre, setNombre]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [drag, setDrag]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  const handleFile = (f: File | null) => {
    if (!f) return
    if (f.size > 15 * 1024 * 1024) { setError("El archivo es muy grande (máx. 15 MB)"); return }
    setFile(f)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError("Seleccioná un archivo PDF o imagen")
    setLoading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("archivo", file)
      fd.append("pais", pais)
      fd.append("nombre", nombre)
      fd.append("publica", "false")
      const { data } = await axios.post(`${API}/cotizacion/analizar`, fd, { timeout: 120_000 })
      router.push(`/analisis/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al analizar. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const selectedPais = PAISES.find(p => p.code === pais)

  const sidebarItems = [
    { icon: <IconTarget />,     text: "Score de riesgo 0-100" },
    { icon: <IconSemaphore />,  text: "Semáforo por ítem (verde/naranja/rojo)" },
    { icon: <IconTrendingUp />, text: "% de sobreprecio vs mediana de mercado" },
    { icon: <IconCpu />,        text: "Narrativa en español generada por IA" },
    { icon: <IconBarChart />,   text: "Comparación con contratos históricos reales" },
  ]

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-all duration-200 mb-5"
          >
            <IconArrowLeft />
            Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">Analizar cotización</h1>
          <p className="text-gray-400 max-w-xl">
            Subí un PDF o imagen de una cotización pública y en segundos te decimos si los precios
            están dentro del rango de mercado, ítem por ítem.
          </p>
        </div>

        {/* Main grid — entrance animation */}
        <div
          className="grid md:grid-cols-5 gap-8"
          style={{ animation: "fadeSlideIn 0.4s ease both" }}
        >
          <style>{`
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes dashMove {
              to { stroke-dashoffset: -20; }
            }
          `}</style>

          {/* ── FORMULARIO ── */}
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
              className={`relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
                drag
                  ? "border-red-500 bg-red-500/10 scale-[1.01]"
                  : file
                  ? "border-green-500/60 bg-green-500/5"
                  : "border-gray-700 hover:border-gray-500 hover:bg-white/[0.02]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-green-400">
                    <IconCheckCircle />
                  </div>
                  <div className="text-white font-semibold">{file.name}</div>
                  <div className="text-gray-500 text-sm">
                    {(file.size / 1024).toFixed(0)} KB · click para cambiar
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`transition-all duration-200 ${drag ? "text-red-400 scale-110" : "text-gray-500"}`}>
                    <IconUpload />
                  </div>
                  <div className="text-white font-medium">Arrastrá o hacé click para subir</div>
                  <div className="text-gray-500 text-sm">PDF o imagen · Máx. 15 MB</div>
                </div>
              )}
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                País de la cotización
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAISES.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPais(p.code)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                      pais === p.code
                        ? "border-red-500 bg-red-500/10 text-white shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_0_12px_rgba(239,68,68,0.12)]"
                        : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-white"
                    }`}
                  >
                    {/* Country code pill */}
                    <span
                      className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide shrink-0 transition-all duration-200 ${
                        pais === p.code
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-gray-800 text-gray-500 border border-gray-700"
                      }`}
                    >
                      {p.code}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-gray-600">{p.fuente}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tu nombre (opcional)
              </label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Anónimo"
                className="w-full bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-all duration-200"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 text-red-300 rounded-xl px-4 py-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  <IconAlert size={14} />
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all duration-200 text-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando con IA...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Analizar cotización
                  <IconArrowRight />
                </span>
              )}
            </button>

            <p className="text-center text-xs text-gray-600">
              Gratis · Sin registro · Datos encriptados
            </p>
          </form>

          {/* ── INFO LATERAL ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Qué obtenés */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 border-l-2 border-l-red-500/40">
              <h3 className="font-semibold text-white mb-4 text-sm">Qué obtenés</h3>
              <ul className="space-y-3">
                {sidebarItems.map(item => (
                  <li key={item.text} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <span className="text-gray-500 shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* País seleccionado */}
            {selectedPais && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 border-l-2 border-l-blue-500/30 transition-all duration-200">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    {selectedPais.code}
                  </span>
                  {selectedPais.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Comparamos contra contratos reales de{" "}
                  <strong className="text-gray-400">{selectedPais.fuente}</strong>,
                  el portal oficial de compras públicas de {selectedPais.name}.
                </p>
              </div>
            )}

            {/* Ejemplos */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Ejemplos de cotizaciones</h3>
              <ul className="space-y-2">
                {EJEMPLOS.map(e => (
                  <li key={e} className="text-xs text-gray-500 flex items-start gap-2">
                    <span className="text-gray-700 mt-0.5 shrink-0">·</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
              <span className="text-gray-600 shrink-0 mt-0.5">
                <IconAlert size={12} />
              </span>
              El análisis es orientativo. Los precios de referencia son medianas históricas de contratos similares y no constituyen prueba legal.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
