"use client"
import { useEffect, useState, useCallback } from "react"
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
} from "reactflow"
import "reactflow/dist/style.css"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const CLUSTER: Record<string, { x: number; y: number }> = {
  GT: { x: 350,  y: 350  },
  SV: { x: 1200, y: 350  },
  MX: { x: 350,  y: 1200 },
  PE: { x: 1200, y: 1200 },
}

const BANDERAS: Record<string, string> = { GT: "🇬🇹", MX: "🇲🇽", SV: "🇸🇻", PE: "🇵🇪" }
const NOMBRES:  Record<string, string>  = { GT: "Guatemala", MX: "México", SV: "El Salvador", PE: "Perú" }

function scoreColor(s: number) {
  return s >= 80 ? "#ef4444" : s >= 50 ? "#f97316" : s >= 20 ? "#eab308" : "#22c55e"
}

function spiral(c: { x: number; y: number }, i: number, spread = 78) {
  const a = (i * 137.508 * Math.PI) / 180
  const r = Math.sqrt(i + 1) * spread
  return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }
}

function buildGraph(obras: any[]): { nodes: Node[]; edges: Edge[]; crossCount: number; nodeCount: number } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Group obras by empresa key → country
  const empresaMap: Record<string, { nombre: string; paises: Record<string, any[]> }> = {}
  for (const o of obras) {
    if (!o.pais || !CLUSTER[o.pais]) continue
    const eid = o.empresa_id
      ? `id-${o.empresa_id}`
      : `name-${(o.empresa_nombre || "").toLowerCase().replace(/\W+/g, "-").slice(0, 40)}`
    if (!empresaMap[eid]) empresaMap[eid] = { nombre: o.empresa_nombre || "—", paises: {} }
    if (!empresaMap[eid].paises[o.pais]) empresaMap[eid].paises[o.pais] = []
    empresaMap[eid].paises[o.pais].push(o)
  }

  // Country label nodes (non-interactive headers)
  for (const [pais, pos] of Object.entries(CLUSTER)) {
    nodes.push({
      id: `country-${pais}`,
      type: "default",
      position: { x: pos.x - 80, y: pos.y - 260 },
      data: { label: `${BANDERAS[pais] || ""} ${NOMBRES[pais] || pais}` },
      style: {
        background: "rgba(17,24,39,0.8)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        color: "#d1d5db",
        fontSize: 14,
        fontWeight: 700,
        padding: "8px 24px",
        pointerEvents: "none",
        minWidth: 165,
        textAlign: "center",
      },
      selectable: false,
      draggable: false,
    })
  }

  // One empresa node per (empresa, country) pair
  const byPais: Record<string, number> = {}
  const nodeIdMap: Record<string, string> = {}

  for (const [eid, emp] of Object.entries(empresaMap)) {
    for (const [pais, obrasInPais] of Object.entries(emp.paises)) {
      if (!CLUSTER[pais]) continue
      if (!byPais[pais]) byPais[pais] = 0
      const idx = byPais[pais]++
      const pos = spiral(CLUSTER[pais], idx)
      const avgScore =
        obrasInPais.reduce((s: number, o: any) => s + (o.sobreprecio_score || 0), 0) / obrasInPais.length
      const color = scoreColor(avgScore)
      const nodeId = `emp-${eid}-${pais}`
      nodeIdMap[`${eid}::${pais}`] = nodeId
      const empresa_id = obrasInPais[0]?.empresa_id ?? null

      nodes.push({
        id: nodeId,
        type: "default",
        position: pos,
        data: {
          label: emp.nombre.length > 22 ? emp.nombre.slice(0, 20) + "…" : emp.nombre,
          empresa_id,
          pais,
          count: obrasInPais.length,
        },
        style: {
          background: `${color}14`,
          border: `1.5px solid ${color}88`,
          borderRadius: 8,
          color: "#e5e7eb",
          fontSize: 9,
          padding: "4px 8px",
          width: 118,
          textAlign: "center",
          cursor: empresa_id ? "pointer" : "default",
        },
      })
    }
  }

  // Cross-country edges: same empresa_id in 2+ countries
  let crossCount = 0
  for (const [eid, emp] of Object.entries(empresaMap)) {
    const countries = Object.keys(emp.paises)
    if (countries.length < 2) continue
    for (let a = 0; a < countries.length; a++) {
      for (let b = a + 1; b < countries.length; b++) {
        const src = nodeIdMap[`${eid}::${countries[a]}`]
        const tgt = nodeIdMap[`${eid}::${countries[b]}`]
        if (!src || !tgt) continue
        crossCount++
        const label = emp.nombre.length > 18 ? emp.nombre.slice(0, 16) + "…" : emp.nombre
        edges.push({
          id: `cross-${eid}-${countries[a]}-${countries[b]}`,
          source: src,
          target: tgt,
          animated: true,
          style: { stroke: "#818cf8", strokeWidth: 2 },
          label,
          labelStyle: { fill: "#c7d2fe", fontSize: 9, fontWeight: 600 },
          labelBgStyle: { fill: "#1e1b4b", fillOpacity: 0.88 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        })
      }
    }
  }

  const nodeCount = nodes.filter(n => !n.id.startsWith("country-")).length
  return { nodes, edges, crossCount, nodeCount }
}

export default function GrafoPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [crossCount, setCrossCount] = useState(0)
  const [nodeCount, setNodeCount]   = useState(0)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    axios
      .get(`${API}/obras`, { params: { page_size: 300, order_by: "sobreprecio_score" } })
      .then(r => {
        const items: any[] = r.data.items || []
        const { nodes: n, edges: e, crossCount: cc, nodeCount: nc } = buildGraph(items)
        setNodes(n)
        setEdges(e)
        setCrossCount(cc)
        setNodeCount(nc)
      })
      .finally(() => setLoading(false))
  }, [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const empresa_id = (node.data as any)?.empresa_id
    if (empresa_id) router.push(`/empresa/${empresa_id}`)
  }, [router])

  return (
    <div style={{ height: "calc(100vh - 56px)", background: "#030712", position: "relative" }}>
      {/* Panel de leyenda */}
      <div className="absolute top-4 left-4 z-10 bg-gray-950/90 border border-gray-800 rounded-2xl p-4 w-56 backdrop-blur-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <span className="text-white text-sm font-bold">Red de Empresas</span>
        </div>

        <p className="text-gray-500 text-xs mb-3 leading-relaxed">
          Cada nodo es una empresa por país. Las líneas{" "}
          <span className="text-indigo-400 font-semibold">━━</span> conectan la misma empresa activa en múltiples países.
        </p>

        <div className="flex gap-4 text-xs mb-4">
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-none">{nodeCount}</div>
            <div className="text-gray-600 mt-0.5">nodos</div>
          </div>
          <div className="text-center">
            <div className="text-indigo-400 font-bold text-lg leading-none">{crossCount}</div>
            <div className="text-gray-600 mt-0.5">conexiones</div>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {[
            { c: "#22c55e", l: "Normal (< 20)" },
            { c: "#eab308", l: "Leve (20–49)" },
            { c: "#f97316", l: "Moderado (50–79)" },
            { c: "#ef4444", l: "Severo (≥ 80)" },
          ].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
              <span className="text-gray-500 text-xs">{l}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 py-2 border-t border-gray-800 mb-3">
          <div
            className="h-px w-8 shrink-0"
            style={{ background: "repeating-linear-gradient(90deg,#818cf8 0,#818cf8 5px,transparent 5px,transparent 9px)" }}
          />
          <span className="text-gray-500 text-xs">Empresa transnacional</span>
        </div>

        <p className="text-gray-700 text-[10px] mb-3">
          Clic en un nodo para ver el perfil de la empresa.
        </p>

        <div className="flex flex-col gap-1 border-t border-gray-800 pt-3">
          <Link href="/radar" className="text-xs text-gray-500 hover:text-white transition py-1 rounded hover:bg-white/5 text-center">
            ← Radar
          </Link>
          <Link href="/mapa" className="text-xs text-gray-500 hover:text-white transition py-1 rounded hover:bg-white/5 text-center">
            ← Mapa
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400 text-sm">Construyendo grafo...</div>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.04}
          maxZoom={2.5}
        >
          <Background color="#1f2937" gap={24} />
          <Controls />
          <MiniMap
            nodeColor={n => {
              const b = (n.style?.border as string) || ""
              const m = b.match(/#([0-9a-fA-F]{6})/)
              return m ? `#${m[1]}` : "#374151"
            }}
            maskColor="rgba(3,7,18,0.75)"
            style={{ background: "#111827", border: "1px solid #374151" }}
          />
        </ReactFlow>
      )}
    </div>
  )
}
