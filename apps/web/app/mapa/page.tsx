"use client"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Map, { Source, Layer, Popup, NavigationControl } from "@vis.gl/react-maplibre"
import type { LayerProps, MapLayerMouseEvent, MapRef } from "@vis.gl/react-maplibre"
import axios from "axios"
import Link from "next/link"
import "maplibre-gl/dist/maplibre-gl.css"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

// Geographic centers of each country (not capital cities)
const CENTROIDS: Record<string, [number, number]> = {
  GT: [-90.23,  15.78],
  SV: [-88.90,  13.79],
  MX: [-102.55, 23.63],
  PE: [-75.01,  -9.19],
}

// Zoom destination per country
const VIEWPORTS: Record<string, { center: [number, number]; zoom: number }> = {
  GT: { center: [-90.23,  15.78], zoom: 7.5 },
  SV: { center: [-88.90,  13.79], zoom: 8.5 },
  MX: { center: [-102.55, 23.63], zoom: 5.2 },
  PE: { center: [-75.01,  -9.19], zoom: 5.2 },
}
const VIEW_ALL = { center: [-82, 8] as [number, number], zoom: 3.4 }
const BANDERAS: Record<string, string> = { GT: "🇬🇹", MX: "🇲🇽", SV: "🇸🇻", PE: "🇵🇪" }
const NOMBRES:  Record<string, string> = { GT: "Guatemala", MX: "México", SV: "El Salvador", PE: "Perú" }
const PAISES_ORDEN = ["GT", "SV", "MX", "PE"]

function scoreColor(score: number) {
  if (score >= 80) return "#ef4444"
  if (score >= 50) return "#f97316"
  if (score >= 20) return "#eab308"
  return "#22c55e"
}
function scoreLabel(score: number) {
  if (score >= 80) return "Severo"
  if (score >= 50) return "Moderado"
  if (score >= 20) return "Leve"
  return "Normal"
}

// Spiral scatter — deterministic, no Math.random()
function jitter(center: [number, number], idx: number, spread: number): [number, number] {
  const angle = (idx * 137.508) % 360
  const r     = Math.sqrt(idx / Math.max(1, idx + 1)) * spread
  return [
    center[0] + r * Math.cos((angle * Math.PI) / 180),
    center[1] + r * Math.sin((angle * Math.PI) / 180),
  ]
}

// Build country GeoJSON lazily with full error handling
async function loadCountryGeoJSON(
  stats: Record<string, { avg: number }>
): Promise<GeoJSON.FeatureCollection> {
  const NUMERIC_TO_ISO2: Record<string, string> = {
    "320": "GT", "222": "SV", "484": "MX", "604": "PE",
  }
  try {
    const { feature } = await import("topojson-client")
    const worldData   = await import("world-atlas/countries-110m.json")
    const geo = feature(worldData as any, (worldData as any).objects.countries) as unknown as GeoJSON.FeatureCollection
    return {
      type: "FeatureCollection",
      features: geo.features
        .filter(f => NUMERIC_TO_ISO2[String(f.id)])
        .map(f => ({
          ...f,
          properties: {
            iso2:      NUMERIC_TO_ISO2[String(f.id)],
            fillColor: scoreColor(stats[NUMERIC_TO_ISO2[String(f.id)]]?.avg || 0),
          },
        })),
    }
  } catch (e) {
    console.warn("Country GeoJSON failed to load:", e)
    return { type: "FeatureCollection", features: [] }
  }
}

export default function MapaPage() {
  const mapRef = useRef<MapRef>(null)
  const [obras,         setObras]         = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [fetchError,    setFetchError]    = useState(false)
  const [popup,         setPopup]         = useState<{ lng: number; lat: number; obra: any } | null>(null)
  const [countryStats,  setCountryStats]  = useState<Record<string, { avg: number; count: number }>>({})
  const [countryGeo,    setCountryGeo]    = useState<GeoJSON.FeatureCollection | null>(null)
  const [activePais,    setActivePais]    = useState<string | null>(null)

  const flyTo = useCallback((pais: string | null) => {
    const map = mapRef.current
    if (!map) return
    if (!pais) {
      setActivePais(null)
      map.flyTo({ center: VIEW_ALL.center, zoom: VIEW_ALL.zoom, duration: 1400, essential: true })
    } else {
      const vp = VIEWPORTS[pais]
      if (!vp) return
      setActivePais(pais)
      map.flyTo({ center: vp.center, zoom: vp.zoom, duration: 1400, essential: true })
    }
  }, [])

  // Fetch obras from API
  useEffect(() => {
    setFetchError(false)
    axios
      .get(`${API}/obras`, { params: { page_size: 100, order_by: "sobreprecio_score" } })
      .then(r => {
        const items: any[] = r.data.items || []
        setObras(items)
        const acc: Record<string, { total: number; count: number }> = {}
        items.forEach(o => {
          const p = o.pais
          if (!acc[p]) acc[p] = { total: 0, count: 0 }
          acc[p].total += o.sobreprecio_score || 0
          acc[p].count += 1
        })
        const stats = Object.fromEntries(
          Object.entries(acc).map(([p, s]) => [p, { avg: s.count ? s.total / s.count : 0, count: s.count }])
        )
        setCountryStats(stats)
        // Load country GeoJSON after we have stats for coloring
        loadCountryGeoJSON(stats).then(setCountryGeo)
      })
      .catch(err => {
        console.error("Error cargando obras:", err)
        setFetchError(true)
        loadCountryGeoJSON({}).then(setCountryGeo)
      })
      .finally(() => setLoading(false))
  }, [])

  // Contract markers GeoJSON
  const geojson = useMemo((): GeoJSON.FeatureCollection => {
    const byPais: Record<string, number> = {}
    return {
      type: "FeatureCollection",
      features: obras.map(obra => {
        const pais = obra.pais
        if (!byPais[pais]) byPais[pais] = 0
        const idx = byPais[pais]++
        const [lng, lat] = jitter(CENTROIDS[pais] || [-90, 15], idx, 0.4)
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {
            titulo:     obra.titulo,
            pais:       obra.pais,
            empresa:    obra.empresa_nombre || "",
            empresa_id: obra.empresa_id || "",
            score:      obra.sobreprecio_score || 0,
            pct:        obra.sobreprecio_pct || 0,
            monto:      obra.monto_adjudicado || 0,
            moneda:     obra.moneda || "USD",
            color:      scoreColor(obra.sobreprecio_score || 0),
          },
        }
      }),
    }
  }, [obras])

  // ── Layer definitions ──────────────────────────────────────────────────────
  const fillLayer: LayerProps = {
    id: "country-fill",
    type: "fill",
    paint: { "fill-color": ["get", "fillColor"], "fill-opacity": 0.2 },
  }
  const outlineLayer: LayerProps = {
    id: "country-outline",
    type: "line",
    paint: { "line-color": ["get", "fillColor"], "line-width": 1.5, "line-opacity": 0.65 },
  }
  const clusterLayer: LayerProps = {
    id: "clusters",
    type: "circle",
    filter: ["has", "point_count"],
    paint: {
      "circle-color":        ["step", ["get", "point_count"], "#f97316", 15, "#ef4444", 40, "#991b1b"],
      "circle-radius":       ["step", ["get", "point_count"], 22, 15, 30, 40, 40],
      "circle-opacity":      0.85,
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.15)",
    },
  }
  const clusterCountLayer: LayerProps = {
    id: "cluster-count",
    type: "symbol",
    filter: ["has", "point_count"],
    layout: { "text-field": "{point_count_abbreviated}", "text-size": 13 },
    paint: { "text-color": "#ffffff" },
  }
  const pointLayer: LayerProps = {
    id: "unclustered-point",
    type: "circle",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius":       7,
      "circle-color":        ["get", "color"],
      "circle-opacity":      0.9,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(255,255,255,0.45)",
    },
  }

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature || feature.layer?.id !== "unclustered-point") { setPopup(null); return }
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    setPopup({ lng, lat, obra: feature.properties! })
  }, [])

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px)" }}>

      {/* Stats panel */}
      <div className="absolute top-4 left-4 z-10 bg-gray-950/90 border border-gray-800 rounded-2xl p-4 w-56 backdrop-blur-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-red-500 text-base">◎</span>
          <span className="text-white text-sm font-bold">Mapa de Riesgo</span>
        </div>

        {fetchError ? (
          <div className="text-xs text-red-400 mb-3">
            No se pudo conectar con el API.<br />
            <span className="text-gray-500">¿Está corriendo el backend?</span>
          </div>
        ) : (
          <div className="space-y-0.5 mb-3">
            {PAISES_ORDEN.map(pais => {
              const s      = countryStats[pais]
              const avg    = s?.avg || 0
              const col    = scoreColor(avg)
              const active = activePais === pais
              return (
                <button
                  key={pais}
                  onClick={() => flyTo(active ? null : pais)}
                  className={`w-full flex items-center gap-2.5 py-2 px-2 rounded-lg border transition-all duration-200 text-left
                    ${active
                      ? "border-white/20 bg-white/8 scale-[1.02]"
                      : "border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                >
                  <span className="text-xl shrink-0">{BANDERAS[pais]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 font-medium">{NOMBRES[pais]}</div>
                    <div className="text-xs text-gray-600">
                      {loading ? "cargando…" : s ? `${s.count} contratos` : "sin datos"}
                    </div>
                  </div>
                  {s && (
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: col }}>{avg.toFixed(0)}</div>
                      <div className="text-xs opacity-70" style={{ color: col }}>{scoreLabel(avg)}</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Ver todo button */}
        {activePais && (
          <button
            onClick={() => flyTo(null)}
            className="w-full text-xs text-gray-400 hover:text-white py-1.5 px-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-all duration-200 mb-2"
          >
            ← Ver todos los países
          </button>
        )}

        <div className="border-t border-gray-800 pt-3 mb-3">
          <div className="text-xs text-gray-600 mb-2">Nivel de sobreprecio</div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { c: "#22c55e", l: "Normal" },
              { c: "#eab308", l: "Leve"   },
              { c: "#f97316", l: "Mod."   },
              { c: "#ef4444", l: "Severo" },
            ].map(({ c, l }) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                <div className="text-gray-600 text-center leading-none" style={{ fontSize: "9px" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <Link href="/radar"
          className="block text-center text-xs text-gray-500 hover:text-white transition py-1 rounded-lg hover:bg-white/5">
          ← Ver tabla del Radar
        </Link>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: -82, latitude: 8, zoom: 3.4 }}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["unclustered-point", "clusters"]}
        onClick={onClick}
      >
        <NavigationControl position="bottom-right" />

        {/* Country choropleth (renders only when GeoJSON is ready) */}
        {countryGeo && countryGeo.features.length > 0 && (
          <Source id="countries" type="geojson" data={countryGeo}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}

        {/* Contract clusters + points */}
        <Source
          id="contracts"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={6}
          clusterRadius={55}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointLayer} />
        </Source>

        {/* Popup */}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton={false}
            offset={14}
          >
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 w-64 shadow-2xl">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg shrink-0 mt-0.5">{BANDERAS[popup.obra.pais] || "🌎"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-medium leading-snug line-clamp-3">
                    {popup.obra.titulo}
                  </div>
                </div>
                <button onClick={() => setPopup(null)}
                  className="text-gray-600 hover:text-white text-xl leading-none shrink-0 -mt-0.5">×</button>
              </div>
              {popup.obra.empresa && (
                <div className="mb-2">
                  {popup.obra.empresa_id ? (
                    <Link href={`/empresa/${popup.obra.empresa_id}`}
                      className="text-blue-400 hover:underline text-xs block truncate">
                      {popup.obra.empresa} →
                    </Link>
                  ) : (
                    <div className="text-gray-500 text-xs truncate">{popup.obra.empresa}</div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <div className="text-gray-500 text-xs">
                  {popup.obra.monto
                    ? `${popup.obra.moneda} ${Number(popup.obra.monto).toLocaleString()}`
                    : "Sin monto"}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scoreColor(popup.obra.score) }} />
                  <div className="font-bold text-sm" style={{ color: scoreColor(popup.obra.score) }}>
                    {popup.obra.pct > 0 ? "+" : ""}{Number(popup.obra.pct).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/60 z-20 pointer-events-none">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400 text-sm">Cargando contratos...</div>
          </div>
        </div>
      )}
    </div>
  )
}
