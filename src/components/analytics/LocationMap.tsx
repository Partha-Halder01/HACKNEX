import { useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Compass, Crosshair, Layers, MapPin } from 'lucide-react'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { t } from './ui'

type Overlay = 'none' | 'trueColorEnd' | 'classStart' | 'classEnd' | 'change'

const OVERLAY_LABELS: Record<Exclude<Overlay, 'none'>, { en: string; bn: string }> = {
  trueColorEnd: { en: 'Photo from space (latest)', bn: 'মহাকাশ থেকে ছবি (সর্বশেষ)' },
  classStart: { en: 'Forest then (green)', bn: 'তখনকার বন (সবুজ)' },
  classEnd: { en: 'Forest now (green)', bn: 'এখনকার বন (সবুজ)' },
  change: { en: 'Where forest changed', bn: 'কোথায় বন বদলেছে' },
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

export function LocationMap({
  lat,
  lon,
  radiusKm,
  onPick,
  bundle,
  lang,
}: {
  lat: number
  lon: number
  radiusKm: number
  onPick: (lat: number, lon: number) => void
  bundle: AnalysisBundle | null
  lang: Lang
}) {
  const tiles = bundle?.tiles ?? null
  const available = (Object.keys(OVERLAY_LABELS) as Exclude<Overlay, 'none'>[]).filter((k) => tiles?.[k])
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [base, setBase] = useState<'satellite' | 'streets'>('satellite')

  useEffect(() => {
    setOverlay(tiles?.change ? 'change' : 'none')
  }, [tiles])

  // The overlay belongs to the analysed AOI; hide it once the point moves away.
  const analysed = bundle && bundle.request.lat === lat && bundle.request.lon === lon && bundle.request.radiusKm === radiusKm
  const overlayUrl = analysed && overlay !== 'none' ? tiles?.[overlay] : undefined

  return (
    <div className="hud-corner group relative h-[400px] sm:h-[480px] lg:h-[530px] xl:h-[580px] overflow-hidden rounded-2xl border border-[#c4ded2] shadow-[0_8px_30px_rgba(7,61,52,0.06)]">
      {/* Sci-fi corner brackets */}
      <div className="pointer-events-none absolute inset-0 z-[500] border-2 border-emerald-600/10 rounded-2xl" />

      <MapContainer center={[lat, lon]} zoom={12} minZoom={5} maxZoom={17} scrollWheelZoom={false} className="h-full w-full">
        {base === 'satellite' ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        )}
        {overlayUrl && <TileLayer key={overlayUrl} url={overlayUrl} opacity={0.8} attribution="Google Earth Engine" />}
        <Circle
          center={[lat, lon]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#10b981', weight: 2.5, dashArray: '6 6', fillOpacity: overlayUrl ? 0 : 0.12 }}
        />
        <CircleMarker center={[lat, lon]} radius={7} pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#16865f', fillOpacity: 1 }} />
        <ClickToMove onPick={onPick} />
        <Recenter lat={lat} lon={lon} radiusKm={radiusKm} />
      </MapContainer>

      {/* Top Telemetry HUD Pill */}
      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-xl bg-[#062f29]/90 px-3 py-1.5 backdrop-blur-md border border-emerald-500/30 text-white shadow-lg">
        <span className="size-2 rounded-full bg-emerald-400 beacon-pulse" />
        <span className="font-mono text-[11px] font-semibold tracking-wider text-emerald-200">
          {lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`} · {lon >= 0 ? `${lon.toFixed(4)}°E` : `${Math.abs(lon).toFixed(4)}°W`}
        </span>
        <span className="text-[10px] text-emerald-400/80 font-mono">[{radiusKm}km AOI]</span>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] hidden sm:flex items-center gap-1.5 rounded-xl bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#123f38] shadow backdrop-blur-sm border border-[#d6e6de]">
        <Crosshair className="size-3 text-[#16865f]" />
        {t('clickMap', lang)}
      </div>

      {/* Bottom Floating Control Deck */}
      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setBase(base === 'satellite' ? 'streets' : 'satellite')}
          className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-[#123f38] shadow-md border border-[#d6e6de] hover:bg-white hover:border-[#16865f] transition-colors"
        >
          <Compass className="size-3.5 text-[#16865f]" />
          {base === 'satellite' ? (lang === 'bn' ? 'রাস্তার মানচিত্র' : 'Streets') : lang === 'bn' ? 'উপগ্রহ' : 'Satellite'}
        </button>

        {analysed && available.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1 text-xs font-bold text-[#123f38] shadow-md border border-[#d6e6de]">
            <Layers className="size-3.5 text-[#16865f]" />
            <select
              value={overlay}
              onChange={(e) => setOverlay(e.target.value as Overlay)}
              className="bg-transparent text-xs font-bold text-[#123f38] focus:outline-none cursor-pointer"
              aria-label="Map layer"
            >
              <option value="none">{lang === 'bn' ? 'কোনো স্তর নয়' : 'No layer'}</option>
              {available.map((k) => (
                <option key={k} value={k}>
                  {OVERLAY_LABELS[k][lang]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {overlayUrl && overlay === 'change' && (
        <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-3 rounded-xl bg-[#062f29]/95 px-3 py-1.5 font-mono text-[11px] text-white shadow-lg backdrop-blur border border-emerald-500/30">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#22c55e]" />{lang === 'bn' ? 'নতুন বন' : 'New'}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#ef4444]" />{lang === 'bn' ? 'ক্ষতি' : 'Loss'}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#f59e0b]" />{lang === 'bn' ? 'অনিশ্চিত' : 'Uncertain'}</span>
        </div>
      )}
    </div>
  )
}
