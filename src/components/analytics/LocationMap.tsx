import { useCallback, useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Compass, Crosshair, Eye, Layers, MapPin, Satellite } from 'lucide-react'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { t } from './ui'
import { ESRI_ATTRIBUTION, ESRI_URL, useBasemap } from './useBasemap'
import { cn } from '../../lib/utils'

type Overlay = 'none' | 'trueColorEnd' | 'classStart' | 'classEnd' | 'change'

const OVERLAY_LABELS: Record<Exclude<Overlay, 'none'>, { en: string; bn: string }> = {
  trueColorEnd: { en: 'Sentinel-2 True Color (End)', bn: 'মহাকাশ থেকে ছবি (শেষ বছর)' },
  classStart: { en: 'Mangrove Canopy (Baseline)', bn: 'তখনকার বন (সবুজ)' },
  classEnd: { en: 'Mangrove Canopy (Latest)', bn: 'এখনকার বন (সবুজ)' },
  change: { en: 'Canopy Dynamics Mask', bn: 'কোথায় বন বদলেছে' },
}

function ClickToMove({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)))
    },
  })
  return null
}

function Recenter({ lat, lon, radiusKm }: { lat: number; lon: number; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    const bounds = map.getBounds()
    if (!bounds.contains([lat, lon])) map.setView([lat, lon], map.getZoom())
  }, [lat, lon, map])
  useEffect(() => {
    // Fit the AOI circle comfortably when the radius changes a lot.
    const zoom = Math.round(13.4 - Math.log2(Math.max(radiusKm, 0.5)))
    map.setView([lat, lon], Math.min(Math.max(zoom, 8), 15))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm])
  return null
}

function MapResizeObserver() {
  const map = useMap()
  useEffect(() => {
    const handle = () => {
      map.invalidateSize()
    }
    const timer = setTimeout(handle, 200)
    window.addEventListener('resize', handle)
    const container = map.getContainer()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handle) : null
    if (observer && container) observer.observe(container)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handle)
      if (observer) observer.disconnect()
    }
  }, [map])
  return null
}

export function LocationMap({
  lat,
  lon,
  radiusKm,
  onPick,
  bundle,
  lang,
  className,
}: {
  lat: number
  lon: number
  radiusKm: number
  onPick: (lat: number, lon: number) => void
  bundle: AnalysisBundle | null
  lang: Lang
  className?: string
}) {
  const tiles = bundle?.tiles ?? null
  const available = (Object.keys(OVERLAY_LABELS) as Exclude<Overlay, 'none'>[]).filter((k) => tiles?.[k])
  const [overlay, setOverlay] = useState<Overlay>('none')
  // Background: Earth Engine Sentinel-2 photo (default when live) → Esri photo → streets.
  const basemap = useBasemap()
  const geeReady = !!basemap?.available && !!basemap.tileUrl
  const [base, setBase] = useState<'gee' | 'esri' | 'streets'>('gee')
  const effectiveBase = base === 'gee' && basemap && !geeReady ? 'esri' : base
  const bases: ('gee' | 'esri' | 'streets')[] = geeReady || basemap === undefined ? ['gee', 'esri', 'streets'] : ['esri', 'streets']
  const nextBase = bases[(bases.indexOf(effectiveBase) + 1) % bases.length]
  const BASE_LABEL = {
    gee: { en: 'Sentinel-2 photo (Earth Engine)', bn: 'সেন্টিনেল-২ ছবি (আর্থ ইঞ্জিন)' },
    esri: { en: 'Esri photo', bn: 'Esri ছবি' },
    streets: { en: 'Streets / Topo', bn: 'রাস্তার মানচিত্র' },
  } as const

  useEffect(() => {
    setOverlay(tiles?.change ? 'change' : 'none')
  }, [tiles])

  // The overlay belongs to the analysed AOI; hide it once the point moves away.
  const analysed = bundle && bundle.request.lat === lat && bundle.request.lon === lon && bundle.request.radiusKm === radiusKm
  const overlayUrl = analysed && overlay !== 'none' ? tiles?.[overlay] : undefined

  return (
    <div
      className={cn(
        'group relative w-full h-full min-h-[460px] sm:min-h-[520px] lg:min-h-full overflow-hidden rounded-2xl border border-[#c4ded2] bg-[#072c24] shadow-sm flex flex-col',
        className,
      )}
    >
      <div className="relative w-full flex-1 min-h-[460px]">
        <MapContainer center={[lat, lon]} zoom={12} minZoom={5} maxZoom={17} scrollWheelZoom={false} className="h-full w-full">
          {effectiveBase === 'streets' ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          ) : (
            // Esri stays underneath the Earth Engine photo: it fills areas outside the delta.
            <TileLayer url={ESRI_URL} attribution={ESRI_ATTRIBUTION} />
          )}
          {effectiveBase === 'gee' && geeReady && (
            <TileLayer key={basemap!.tileUrl} url={basemap!.tileUrl!} attribution={basemap!.attribution} maxNativeZoom={16} />
          )}
          {overlayUrl && <TileLayer key={overlayUrl} url={overlayUrl} opacity={0.85} attribution="Google Earth Engine" />}
          <Circle
            center={[lat, lon]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#10b981', weight: 2, dashArray: '5 5', fillOpacity: overlayUrl ? 0 : 0.08 }}
          />
          <CircleMarker center={[lat, lon]} radius={7} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16865f', fillOpacity: 1 }} />
          <ClickToMove onPick={onPick} />
          <Recenter lat={lat} lon={lon} radiusKm={radiusKm} />
          <MapResizeObserver />
        </MapContainer>

        {/* Top-Left Telemetry Coordinates */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-1.5 rounded-xl bg-[#06241e]/90 px-3 py-1.5 text-white shadow-md backdrop-blur-md border border-emerald-500/25">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs font-bold tracking-tight text-emerald-100">
            {lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`}, {lon >= 0 ? `${lon.toFixed(4)}°E` : `${Math.abs(lon).toFixed(4)}°W`}
          </span>
          <span className="text-[11px] text-emerald-300/80 font-mono border-l border-emerald-500/30 pl-1.5 ml-0.5">
            Ø {radiusKm * 2} km swath · {(Math.PI * radiusKm * radiusKm).toFixed(1)} km²
          </span>
        </div>

        {/* Top-Right Map Hint */}
        <div className="pointer-events-none absolute right-3 top-3 z-[500] hidden sm:flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#123f38] shadow-xs backdrop-blur-sm border border-[#d6e6de]">
          <Crosshair className="size-3 text-[#16865f]" />
          <span>{t('clickMap', lang)}</span>
        </div>

        {/* Bottom Floating GIS Layer Controls */}
        <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-2 print:hidden">
          {/* Basemap Switcher */}
          <button
            type="button"
            onClick={() => setBase(nextBase)}
            title={lang === 'bn' ? 'পটভূমি বদলান' : 'Cycle basemap tile source'}
            className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#123f38] shadow-sm border border-[#d6e6de] hover:border-[#16865f] hover:bg-white transition-all cursor-pointer"
          >
            <Compass className="size-3.5 text-[#16865f]" />
            {/* Honest label: while the Earth Engine photo is still loading, the Esri photo
                underneath is what is visible, so say so instead of claiming Sentinel-2. */}
            <span>
              {effectiveBase === 'gee' && !geeReady
                ? lang === 'bn' ? 'Esri ছবি · আর্থ ইঞ্জিন লোড হচ্ছে…' : 'Esri photo · loading Sentinel-2…'
                : BASE_LABEL[effectiveBase][lang]}
            </span>
            <span className="text-[10px] text-[#6c817a]">→ {BASE_LABEL[nextBase][lang]}</span>
          </button>

          {/* Spectral Overlay Selector (when analysis is ready) */}
          {analysed && available.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#123f38] shadow-sm border border-[#d6e6de]">
              <Layers className="size-3.5 text-[#16865f]" />
              <select
                value={overlay}
                onChange={(e) => setOverlay(e.target.value as Overlay)}
                className="bg-transparent text-xs font-semibold text-[#123f38] focus:outline-none cursor-pointer pr-1"
                aria-label="Map layer"
              >
                <option value="none">{lang === 'bn' ? 'কোনো স্তর নয়' : 'No overlay'}</option>
                {available.map((k) => (
                  <option key={k} value={k}>
                    {OVERLAY_LABELS[k][lang]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Change Mask Legend */}
        {overlayUrl && overlay === 'change' && (
          <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-2.5 rounded-lg bg-[#06241e]/95 px-3 py-1.5 font-mono text-[11px] text-white shadow-md backdrop-blur border border-emerald-500/30">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#22c55e]" />
              <span>{lang === 'bn' ? 'নতুন বন' : 'Canopy Gain'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#ef4444]" />
              <span>{lang === 'bn' ? 'ক্ষতি' : 'Canopy Loss'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#f59e0b]" />
              <span>{lang === 'bn' ? 'অনিশ্চিত' : 'Uncertain'}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
