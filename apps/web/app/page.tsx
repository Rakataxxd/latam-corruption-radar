import Link from "next/link"

async function getStats() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/stats`,
      { cache: "no-store" }
    )
    return res.ok ? res.json() : null
  } catch { return null }
}

const FEATURES = [
  { icon: "📄", title: "Analizá tu cotización", desc: "Subí un PDF y en segundos te decimos si los precios están inflados, ítem por ítem.", href: "/cotizar", cta: "Subir PDF →", border: "border-red-500/30", glow: "from-red-500/10" },
  { icon: "📊", title: "Radar de obras públicas", desc: "Ranking de contratos gubernamentales ordenados por sobreprecio vs. mediana histórica de mercado.", href: "/radar", cta: "Ver ranking →", border: "border-orange-500/30", glow: "from-orange-500/10" },
  { icon: "🏢", title: "Red de empresas", desc: "Drill-down por empresa: mirá todos sus contratos en múltiples países y su historial de sobreprecios.", href: "/radar", cta: "Explorar →", border: "border-yellow-500/30", glow: "from-yellow-500/10" },
  { icon: "🤖", title: "Narrativa con IA", desc: "Groq + Llama 3.3 explica el análisis en español llano para cualquier ciudadano, sin tecnicismos.", href: "/cotizar", cta: "Probar →", border: "border-blue-500/30", glow: "from-blue-500/10" },
  { icon: "🌎", title: "4 países cubiertos", desc: "Guatemala · El Salvador · México · Perú. Datos de los portales oficiales en estándar OCDS.", href: "/radar", cta: "Ver datos →", border: "border-green-500/30", glow: "from-green-500/10" },
  { icon: "⚖️", title: "Metodología abierta", desc: "Comparamos contra medianas históricas. Mostramos datos públicos, nunca acusamos directamente.", href: "/radar", cta: "Ver casos →", border: "border-purple-500/30", glow: "from-purple-500/10" },
]

const STEPS = [
  { n: "01", title: "Subís la cotización",   desc: "PDF o imagen de cualquier contrato" },
  { n: "02", title: "IA extrae los ítems",   desc: "Descripción, cantidad y precio unitario" },
  { n: "03", title: "Comparamos precios",    desc: "Vs. miles de contratos históricos reales" },
  { n: "04", title: "Recibís el análisis",   desc: "Score, semáforo y narrativa en español" },
]

const PAISES = [
  { flag: "🇬🇹", name: "Guatemala",   fuente: "Guatecompras", code: "GT" },
  { flag: "🇸🇻", name: "El Salvador", fuente: "COMPRASAL",    code: "SV" },
  { flag: "🇲🇽", name: "México",      fuente: "CompraNet",    code: "MX" },
  { flag: "🇵🇪", name: "Perú",        fuente: "SEACE",        code: "PE" },
]

export default async function Home() {
  const stats = await getStats()

  return (
    <main className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-28 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-red-500/8 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Datos en tiempo real · GT · SV · MX · PE
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Detectamos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              sobreprecio
            </span>
            <br />en compras públicas
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Subí una cotización y en segundos sabés si los precios están inflados.
            Explorá el ranking de obras con mayor sobreprecio en 4 países de LATAM.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/cotizar" className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-red-500/20">
              Analizar cotización →
            </Link>
            <Link href="/radar" className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition">
              Ver radar de obras
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      {stats && (
        <section className="border-y border-white/5 bg-white/[0.02] py-12 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Obras indexadas",      value: stats.total_obras?.toLocaleString(),                 sub: "contratos públicos" },
              { label: "Empresas rastreadas",  value: stats.total_empresas?.toLocaleString(),              sub: "en 4 países" },
              { label: "Sobreprecio promedio", value: `+${Number(stats.avg_sobreprecio||0).toFixed(0)}%`, sub: "vs mercado", red: true },
              { label: "Alto riesgo",          value: stats.obras_alto_riesgo?.toLocaleString(),           sub: "score › 70/100", red: true },
            ].map(s => (
              <div key={s.label}>
                <div className={`text-4xl font-bold mb-1 ${s.red ? "text-red-400" : "text-white"}`}>{s.value ?? "—"}</div>
                <div className="text-sm font-medium text-gray-300">{s.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      <section className="px-4 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Todo lo que podés hacer</h2>
          <p className="text-gray-500">Una plataforma completa de transparencia en compras públicas</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <Link key={f.title} href={f.href}
              className={`group bg-gradient-to-br ${f.glow} to-transparent border ${f.border} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-200 hover:bg-white/[0.04]`}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>
              <span className="text-sm text-gray-400 group-hover:text-white transition">{f.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-4 py-20 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">¿Cómo funciona?</h2>
            <p className="text-gray-500">Del PDF al análisis completo en menos de 30 segundos</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[55%] w-[90%] h-px bg-gradient-to-r from-gray-700 to-transparent" />
                )}
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-sm mx-auto mb-4 relative z-10">
                  {s.n}
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAÍSES ── */}
      <section className="px-4 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Cobertura regional</h2>
          <p className="text-gray-500">Datos de portales oficiales de compras públicas · estándar OCDS</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PAISES.map(p => (
            <Link key={p.code} href={`/radar?pais=${p.code}`}
              className="border border-white/10 bg-white/[0.03] rounded-2xl p-6 text-center hover:bg-white/[0.07] hover:border-white/20 transition group">
              <div className="text-5xl mb-3">{p.flag}</div>
              <div className="font-semibold text-white">{p.name}</div>
              <div className="text-xs text-gray-500 mt-1">{p.fuente}</div>
              <div className="text-xs text-gray-700 mt-3 group-hover:text-gray-400 transition">Ver contratos →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-24 text-center border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">¿Tenés una cotización sospechosa?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Subí el PDF y en segundos tenés el análisis completo con comparación de precios de mercado. Gratis, sin registro.
          </p>
          <Link href="/cotizar" className="inline-block bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-red-500/20">
            Analizar ahora — es gratis
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-4 py-8">
        <p className="text-center text-xs text-gray-700 max-w-3xl mx-auto">
          Esta plataforma muestra datos públicos con fines informativos. Los porcentajes son estimaciones basadas en medianas históricas y no constituyen prueba legal. Toda empresa tiene derecho a réplica.
        </p>
      </footer>
    </main>
  )
}
