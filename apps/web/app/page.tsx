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

const FEATURES: { title: string; desc: string; href: string; cta: string; border: string; glow: string; iconKey: string; external: boolean }[] = [
  { title: "Red interactiva de contratos", desc: "Grafo al estilo Obsidian con 15.380 contratos de Colombia. Detectá clusters de empresas y monopolios de un vistazo.", href: "/grafo.html", cta: "Explorar red", border: "border-red-500/30", glow: "from-red-500/10", iconKey: "barchart", external: true },
  { title: "Señales de monopolio", desc: "50 entidades donde una sola empresa gana más del 65% de los contratos. Nodos con borde rojo pulsante.", href: "/grafo.html", cta: "Ver monopolios", border: "border-orange-500/30", glow: "from-orange-500/10", iconKey: "building", external: true },
  { title: "Analizá tu cotización", desc: "Subí un PDF y en segundos te decimos si los precios están inflados, ítem por ítem.", href: "/cotizar", cta: "Subir PDF", border: "border-yellow-500/30", glow: "from-yellow-500/10", iconKey: "document", external: false },
  { title: "Narrativa con IA", desc: "IA explica el análisis en español llano para cualquier ciudadano, sin tecnicismos.", href: "/cotizar", cta: "Probar", border: "border-blue-500/30", glow: "from-blue-500/10", iconKey: "sparkle", external: false },
  { title: "Datos Colombia SECOP", desc: "15.380 contratos públicos de fuentes oficiales. Empresas, entidades y montos en COP.", href: "/grafo.html", cta: "Ver datos", border: "border-green-500/30", glow: "from-green-500/10", iconKey: "globe", external: true },
  { title: "Metodología abierta", desc: "Datos públicos del SECOP I y II. Mostramos concentración real, nunca acusamos directamente.", href: "/cotizar", cta: "Más info", border: "border-purple-500/30", glow: "from-purple-500/10", iconKey: "shield", external: false },
]

const STEPS = [
  { n: "01", title: "Subís la cotización",   desc: "PDF o imagen de cualquier contrato" },
  { n: "02", title: "IA extrae los ítems",   desc: "Descripción, cantidad y precio unitario" },
  { n: "03", title: "Comparamos precios",    desc: "Vs. miles de contratos históricos reales" },
  { n: "04", title: "Recibís el análisis",   desc: "Score, semáforo y narrativa en español" },
]

const PAISES = [
  { name: "Colombia",   fuente: "SECOP I",  code: "CO" },
  { name: "Colombia",   fuente: "SECOP II", code: "CO2" },
]

// ── Inline SVG icon components ──────────────────────────────────────────────

function IconDocument({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconBarChart({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
      <line x1="2"  y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconBuilding({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconSparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5l-6.2 4.5 2.4-7.3L2 9.2h7.6z" />
    </svg>
  )
}

function IconGlobe({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function IconShield({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function IconDatabase({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function IconBriefcase({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconAlertTriangle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconTrendingUp({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

const FEATURE_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  document: IconDocument,
  barchart: IconBarChart,
  building: IconBuilding,
  sparkle:  IconSparkle,
  globe:    IconGlobe,
  shield:   IconShield,
}

const FEATURE_ICON_COLORS: Record<string, string> = {
  document: "text-red-400",
  barchart: "text-orange-400",
  building: "text-yellow-400",
  sparkle:  "text-blue-400",
  globe:    "text-emerald-400",
  shield:   "text-purple-400",
}

const FEATURE_ICON_BG: Record<string, string> = {
  document: "bg-red-500/10",
  barchart: "bg-orange-500/10",
  building: "bg-yellow-500/10",
  sparkle:  "bg-blue-500/10",
  globe:    "bg-emerald-500/10",
  shield:   "bg-purple-500/10",
}

export default async function Home() {
  const stats = await getStats()

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* ── GRAPH CTA BANNER ── */}
      <section className="px-4 pt-20 pb-0">
        <a
          href="/grafo.html"
          className="group block max-w-6xl mx-auto relative overflow-hidden rounded-2xl border border-red-500/20 bg-gray-900/80 hover:border-red-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10"
        >
          {/* Background network pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ng" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#ng)"/>
              {[...Array(12)].map((_, i) => {
                const x1 = [12,85,50,25,70,40,90,15,60,80,35,55][i]
                const y1 = [20,15,50,70,80,35,60,55,25,40,85,10][i]
                const x2 = [50,50,85,50,50,70,40,60,80,35,55,25][i]
                const y2 = [50,50,50,50,50,80,15,25,40,85,10,70][i]
                return <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.4"/>
              })}
              {[...Array(12)].map((_, i) => {
                const cx = [12,85,50,25,70,40,90,15,60,80,35,55][i]
                const cy = [20,15,50,70,80,35,60,55,25,40,85,10][i]
                const r = [4,6,8,3,5,4,7,3,5,4,3,6][i]
                const color = i % 3 === 0 ? "#ef4444" : i % 3 === 1 ? "#60a5fa" : "#fb923c"
                return <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={r} fill={color} fillOpacity="0.6"/>
              })}
            </svg>
          </div>

          <div className="relative flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-xl flex-shrink-0">
                ⬡
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-semibold text-sm">Red interactiva de contratos públicos</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-mono">Colombia · SECOP</span>
                </div>
                <p className="text-gray-500 text-xs">250 nodos · 95 señales de monopolio · fuerza física · D3.js</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
                Monopolios detectados: 95
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 group-hover:bg-red-600 text-white text-sm font-semibold transition-colors duration-200 shadow-lg shadow-red-500/25">
                Ver grafo
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-32 text-center">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-red-500/6 blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-red-900/10 blur-3xl" />
        </div>

        {/* Hero content — CSS entrance animation via style prop */}
        <div
          className="relative max-w-4xl mx-auto"
          style={{ animation: "fadeInUp 0.7s ease both" }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-10"
            style={{ animation: "fadeInUp 0.6s ease both" }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            15.380 contratos &middot;
            <span className="font-mono text-red-300 text-xs">Colombia · SECOP</span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
            style={{ animation: "fadeInUp 0.7s 0.1s ease both" }}
          >
            Detectamos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-orange-400">
              sobreprecio
            </span>
            <br />en compras públicas
          </h1>

          <p
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ animation: "fadeInUp 0.7s 0.2s ease both" }}
          >
            Visualizá la red de contratos públicos de Colombia: 15.380 contratos,
            señales de monopolio y conexiones entre empresas y entidades del Estado.
          </p>

          <div
            className="flex gap-4 justify-center flex-wrap"
            style={{ animation: "fadeInUp 0.7s 0.3s ease both" }}
          >
            <a
              href="/grafo.html"
              className="group inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:shadow-xl hover:-translate-y-0.5"
            >
              Explorar red de contratos
              <IconArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link
              href="/cotizar"
              className="inline-flex items-center gap-2 border border-gray-800 hover:border-gray-600 bg-gray-900 hover:bg-gray-800/80 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              Analizar cotización
            </Link>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>

      {/* ── STATS ── */}
      {stats && (
        <section className="border-y border-gray-800 bg-gray-900/60 py-14 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              {
                label: "Obras indexadas",
                value: stats.total_obras?.toLocaleString(),
                sub: "contratos públicos",
                Icon: IconDatabase,
                red: false,
              },
              {
                label: "Empresas rastreadas",
                value: stats.total_empresas?.toLocaleString(),
                sub: "en 4 países",
                Icon: IconBriefcase,
                red: false,
              },
              {
                label: "Sobreprecio promedio",
                value: `+${Number(stats.avg_sobreprecio || 0).toFixed(0)}%`,
                sub: "vs mercado",
                Icon: IconTrendingUp,
                red: true,
              },
              {
                label: "Alto riesgo",
                value: stats.obras_alto_riesgo?.toLocaleString(),
                sub: "score › 70/100",
                Icon: IconAlertTriangle,
                red: true,
              },
            ].map((s) => (
              <div key={s.label} className="group">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 mx-auto ${s.red ? "bg-red-500/10" : "bg-gray-800"}`}>
                  <s.Icon className={`w-5 h-5 ${s.red ? "text-red-400" : "text-gray-400"}`} />
                </div>
                <div className={`text-4xl font-bold mb-1 tabular-nums ${s.red ? "text-red-400" : "text-white"}`}>
                  {s.value ?? "—"}
                </div>
                <div className="text-sm font-medium text-gray-300">{s.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      <section className="px-4 py-28 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Todo lo que podés hacer</h2>
          <p className="text-gray-500 text-lg">Una plataforma completa de transparencia en compras públicas</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.iconKey]
            const iconColor = FEATURE_ICON_COLORS[f.iconKey]
            const iconBg = FEATURE_ICON_BG[f.iconKey]
            const cardClass = `group relative bg-gradient-to-br ${f.glow} to-transparent border ${f.border} bg-gray-900/60 rounded-2xl p-6 hover:scale-[1.02] hover:bg-gray-900/80 transition-all duration-200 overflow-hidden`
            const inner = (
              <>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/[0.02]" />
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} mb-5`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 group-hover:text-white transition-colors duration-200">
                  {f.cta}
                  <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </>
            )
            return f.external ? (
              <a key={f.title} href={f.href} className={cardClass}>{inner}</a>
            ) : (
              <Link key={f.title} href={f.href} className={cardClass}>{inner}</Link>
            )
          })}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-4 py-24 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">¿Cómo funciona?</h2>
            <p className="text-gray-500 text-lg">Del PDF al análisis completo en menos de 30 segundos</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[58%] w-[84%] h-px bg-gradient-to-r from-red-500/30 via-gray-700 to-transparent" />
                )}
                {/* Step number badge */}
                <div className="relative z-10 mx-auto mb-5 w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col items-center justify-center shadow-sm group hover:border-red-500/40 transition-colors">
                  <span className="text-[10px] font-mono text-gray-600 leading-none">PASO</span>
                  <span className="text-2xl font-bold text-red-400 leading-tight tabular-nums">{s.n}</span>
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm leading-snug">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUENTE DE DATOS ── */}
      <section className="px-4 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Fuente de datos</h2>
          <p className="text-gray-500 text-lg">Contratos públicos de Colombia · portales oficiales SECOP</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {PAISES.map((p) => (
            <a
              key={p.fuente}
              href="/grafo.html"
              className="group border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
            >
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-base font-mono font-bold text-gray-200 tracking-widest group-hover:border-gray-600 transition-colors">
                  CO
                </span>
              </div>
              <div className="font-semibold text-white text-sm mb-1">{p.name}</div>
              <div className="text-xs text-gray-500 mb-4">{p.fuente}</div>
              <div className="inline-flex items-center gap-1 text-xs text-gray-600 group-hover:text-emerald-400 transition-colors duration-200">
                Ver red de contratos
                <IconArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-28 text-center border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20">
              <IconBarChart className="w-7 h-7 text-red-400" />
            </div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20">
              <IconDocument className="w-7 h-7 text-red-400" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Dos herramientas, un objetivo</h2>
          <p className="text-gray-400 mb-10 leading-relaxed text-lg">
            Explorá la red de contratos públicos de Colombia o analizá tu propia cotización.
            Todo gratis, sin registro.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/grafo.html"
              className="group inline-flex items-center gap-2.5 bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:shadow-2xl hover:-translate-y-0.5"
            >
              Ver red de contratos
              <IconArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link
              href="/cotizar"
              className="inline-flex items-center gap-2.5 border border-gray-700 hover:border-gray-500 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              Analizar cotización
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-800 bg-gray-950 px-4 py-10">
        <div className="max-w-3xl mx-auto flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <IconShield className="w-4 h-4 text-gray-700" />
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            Esta plataforma muestra datos públicos con fines informativos. Los porcentajes son estimaciones
            basadas en medianas históricas y no constituyen prueba legal. Toda empresa tiene derecho a réplica.
          </p>
        </div>
      </footer>
    </main>
  )
}
