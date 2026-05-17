import Link from "next/link"

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`, { cache: "no-store" })
    return res.ok ? res.json() : null
  } catch { return null }
}

export default async function Home() {
  const stats = await getStats()

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 text-red-400">
          LatAm Corruption Radar
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Detectamos sobreprecio en cotizaciones públicas de Guatemala, El Salvador, México y Perú.
          Datos, no acusaciones.
        </p>

        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <Link href="/cotizar"
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition">
            Analizar mi cotización
          </Link>
          <Link href="/radar"
            className="border border-gray-600 hover:border-gray-400 text-gray-300 px-6 py-3 rounded-lg font-semibold transition">
            Ver ranking de obras
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Obras analizadas", value: stats.total_obras?.toLocaleString() },
            { label: "Empresas rastreadas", value: stats.total_empresas?.toLocaleString() },
            { label: "Cotizaciones revisadas", value: stats.total_cotizaciones?.toLocaleString() },
            { label: "Obras alto riesgo", value: stats.obras_alto_riesgo?.toLocaleString(), red: true },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
              <div className={`text-3xl font-bold mb-1 ${s.red ? "text-red-400" : "text-white"}`}>
                {s.value ?? "—"}
              </div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-500">
        ⚠️ Esta plataforma muestra datos públicos con fines informativos. Los porcentajes de sobreprecio
        son estimaciones basadas en medianas históricas de contratos similares y no constituyen prueba legal.
        Toda empresa tiene derecho a réplica.
      </div>
    </main>
  )
}
