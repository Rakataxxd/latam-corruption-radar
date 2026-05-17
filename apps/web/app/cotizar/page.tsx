"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAISES = [
  { code: "GT", name: "🇬🇹 Guatemala" },
  { code: "SV", name: "🇸🇻 El Salvador" },
  { code: "MX", name: "🇲🇽 México" },
  { code: "PE", name: "🇵🇪 Perú" },
]

export default function CotizarPage() {
  const [file, setFile]       = useState<File | null>(null)
  const [pais, setPais]       = useState("GT")
  const [nombre, setNombre]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError("Seleccioná un archivo PDF")
    setLoading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("archivo", file)
      fd.append("pais", pais)
      fd.append("nombre", nombre)
      fd.append("publica", "false")
      const { data } = await axios.post(`${API}/cotizacion/analizar`, fd)
      router.push(`/analisis/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al analizar. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Analizar cotización</h1>
      <p className="text-gray-400 mb-8">Subí un PDF y te decimos si los precios están dentro del rango de mercado.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 rounded-xl p-10 text-center cursor-pointer hover:border-red-500 transition">
          <input ref={inputRef} type="file" accept=".pdf,image/*"
            className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <div className="text-white font-medium">{file.name}</div>
              <div className="text-gray-500 text-sm">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <div className="text-gray-400">Click para subir PDF o imagen</div>
              <div className="text-gray-600 text-sm">Máx. 15 MB</div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">País de la cotización</label>
          <select value={pais} onChange={e => setPais(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white">
            {PAISES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Tu nombre (opcional)</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Anónimo"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600" />
        </div>

        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <button type="submit" disabled={loading || !file}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition text-lg">
          {loading ? "Analizando..." : "Analizar cotización →"}
        </button>
      </form>
    </main>
  )
}
