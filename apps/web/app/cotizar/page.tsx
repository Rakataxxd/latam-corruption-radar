"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PAISES = [
  { code: "GT", name: "Guatemala",   flag: "🇬🇹", fuente: "Guatecompras" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", fuente: "COMPRASAL" },
  { code: "MX", name: "México",      flag: "🇲🇽", fuente: "CompraNet" },
  { code: "PE", name: "Perú",        flag: "🇵🇪", fuente: "SEACE" },
]

const EJEMPLOS = [
  "Cotización de construcción de escuela",
  "Adquisición de equipos médicos",
  "Proyecto de pavimentación",
  "Compra de laptops para gobierno",
]

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

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-gray-600 hover:text-gray-400 text-sm transition mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">Analizar cotización</h1>
          <p className="text-gray-400 max-w-xl">
            Subí un PDF o imagen de una cotización pública y en segundos te decimos si los precios
            están dentro del rango de mercado, ítem por ítem.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">

          {/* ── FORMULARIO ── */}
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                drag
                  ? "border-red-500 bg-red-500/10"
                  : file
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-gray-700 hover:border-gray-500 hover:bg-white/[0.02]"
              }`}>
              <input ref={inputRef} type="file" accept=".pdf,image/*"
                className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />

              {file ? (
                <div>
                  <div className="text-4xl mb-3">✅</div>
                  <div className="text-white font-semibold">{file.name}</div>
                  <div className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB · click para cambiar</div>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4">📄</div>
                  <div className="text-white font-medium mb-1">Arrastrá o hacé click para subir</div>
                  <div className="text-gray-500 text-sm">PDF o imagen · Máx. 15 MB</div>
                </div>
              )}
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">País de la cotización</label>
              <div className="grid grid-cols-2 gap-2">
                {PAISES.map(p => (
                  <button key={p.code} type="button" onClick={() => setPais(p.code)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                      pais === p.code
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-white"
                    }`}>
                    <span className="text-xl">{p.flag}</span>
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Tu nombre (opcional)</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Anónimo"
                className="w-full bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition" />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 text-red-300 rounded-xl px-4 py-3 text-sm">
                <span className="text-lg leading-none">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || !file}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition text-lg shadow-lg shadow-red-500/20">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando con IA...
                </span>
              ) : "Analizar cotización →"}
            </button>

            <p className="text-center text-xs text-gray-600">
              Gratis · Sin registro · Datos encriptados
            </p>
          </form>

          {/* ── INFO LATERAL ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Qué analizamos */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Qué obtenés</h3>
              <ul className="space-y-2.5">
                {[
                  { icon: "🎯", text: "Score de riesgo 0-100" },
                  { icon: "🚦", text: "Semáforo por ítem (verde/naranja/rojo)" },
                  { icon: "📈", text: "% de sobreprecio vs mediana de mercado" },
                  { icon: "🤖", text: "Narrativa en español generada por IA" },
                  { icon: "📊", text: "Comparación con contratos históricos reales" },
                ].map(i => (
                  <li key={i.text} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <span>{i.icon}</span>
                    <span>{i.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* País seleccionado */}
            {selectedPais && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-3 text-sm">Analizando para {selectedPais.flag} {selectedPais.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Comparamos contra contratos reales de <strong className="text-gray-400">{selectedPais.fuente}</strong>,
                  el portal oficial de compras públicas de {selectedPais.name}.
                </p>
              </div>
            )}

            {/* Ejemplos */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Ejemplos de cotizaciones</h3>
              <ul className="space-y-1.5">
                {EJEMPLOS.map(e => (
                  <li key={e} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="text-gray-700">·</span> {e}
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-gray-700 leading-relaxed">
              ⚠️ El análisis es orientativo. Los precios de referencia son medianas históricas de contratos similares y no constituyen prueba legal.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
