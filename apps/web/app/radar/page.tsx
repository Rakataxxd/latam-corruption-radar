"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAISES = ["", "GT", "MX", "SV", "PE"]
const BANDERAS: Record<string, string> = { GT: "🇬🇹", MX: "🇲🇽", SV: "🇸🇻", PE: "🇵🇪" }
const SEMAFORO: Record<string, string> = {
  rojo: "bg-red-500", naranja: "bg-orange-400",
  amarillo: "bg-yellow-400", verde: "bg-green-500",
}

function scoreColor(score: number) {
  if (score >= 80) return "text-red-400"
  if (score >= 50) return "text-orange-400"
  if (score >= 20) return "text-yellow-400"
  return "text-green-400"
}

export default function RadarPage() {
  const [obras, setObras]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [pais, setPais]         = useState("")
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/obras`, { params: { pais: pais || undefined, page, page_size: 20, order_by: "sobreprecio_score" } })
      .then(r => { setObras(r.data.items); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [pais, page])

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Radar de Obras Públicas</h1>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} contratos indexados</p>
        </div>
        <div className="flex gap-2">
          {PAISES.map(p => (
            <button key={p} onClick={() => { setPais(p); setPage(1) }}
              className={`px-3 py-1 rounded text-sm transition ${pais === p ? "bg-red-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              {p ? `${BANDERAS[p]} ${p}` : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-3 pr-4">País</th>
                <th className="pb-3 pr-4">Obra / Contrato</th>
                <th className="pb-3 pr-4">Empresa</th>
                <th className="pb-3 pr-4 text-right">Monto</th>
                <th className="pb-3 text-right">Sobreprecio</th>
              </tr>
            </thead>
            <tbody>
              {obras.map(o => (
                <tr key={o.id} className="border-b border-gray-900 hover:bg-gray-900 transition">
                  <td className="py-3 pr-4">{BANDERAS[o.pais] || o.pais}</td>
                  <td className="py-3 pr-4 max-w-xs">
                    <div className="font-medium text-white truncate">{o.titulo}</div>
                    <div className="text-gray-500 text-xs">{o.entidad_compradora}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {o.empresa_id ? (
                      <Link href={`/empresa/${o.empresa_id}`} className="text-blue-400 hover:underline truncate block max-w-[180px]">
                        {o.empresa_nombre || "Ver empresa"}
                      </Link>
                    ) : (
                      <span className="text-gray-500">{o.empresa_nombre || "—"}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-300">
                    {o.monto_adjudicado ? `${o.moneda} ${Number(o.monto_adjudicado).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${scoreColor(o.sobreprecio_score || 0)}`}>
                      {o.sobreprecio_pct != null ? `${o.sobreprecio_pct > 0 ? "+" : ""}${Number(o.sobreprecio_pct).toFixed(1)}%` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700 transition">
          ← Anterior
        </button>
        <span className="py-2 text-gray-400">Página {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={obras.length < 20}
          className="px-4 py-2 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700 transition">
          Siguiente →
        </button>
      </div>
    </main>
  )
}
