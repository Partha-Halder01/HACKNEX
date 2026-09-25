import { useEffect, useState } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { t } from './ui'

type Overlay = 'none' | 'trueColorEnd' | 'classStart' | 'classEnd' | 'change'

const OVERLAY_LABELS: Record<Exclude<Overlay, 'none'>, { en: string; bn: string }> = {
  trueColorEnd: { en: 'Satellite (end)', bn: 'উপগ্রহ ছবি (শেষ)' },
  classStart: { en: 'Mangrove map (start)', bn: 'ম্যানগ্রোভ মানচিত্র (শুরু)' },
  classEnd: { en: 'Mangrove map (end)', bn: 'ম্যানগ্রোভ মানচিত্র (শেষ)' },
  change: { en: 'Gain / loss', bn: 'বৃদ্ধি / ক্ষতি' },
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
    <div className="relative h-[340px] sm:h-[440px] overflow-hidden rounded-2xl border border-[#d6e6de]">
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
          pathOptions={{ color: '#facc15', weight: 2, fillOpacity: overlayUrl ? 0 : 0.08 }}
        />
        <CircleMarker center={[lat, lon]} radius={6} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16865f', fillOpacity: 1 }} />
        <ClickToMove onPick={onPick} />
        <Recenter lat={lat} lon={lon} radiusKm={radiusKm} />
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#123f38] shadow">
        {t('clickMap', lang)}
      </div>

      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => setBase(base === 'satellite' ? 'streets' : 'satellite')}
          className="rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#123f38] shadow hover:bg-white"
        >
          {base === 'satellite' ? (lang === 'bn' ? 'রাস্তার মানচিত্র' : 'Streets') : lang === 'bn' ? 'উপগ্রহ' : 'Satellite'}
        </button>
        {analysed && available.length > 0 && (
          <select
            value={overlay}
            onChange={(e) => setOverlay(e.target.value as Overlay)}
            className="rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-[#123f38] shadow"
            aria-label="Map layer"
          >
            <option value="none">{lang === 'bn' ? 'কোনো স্তর নয়' : 'No layer'}</option>
            {available.map((k) => (
              <option key={k} value={k}>
                {OVERLAY_LABELS[k][lang]}
              </option>
            ))}
          </select>
        )}
      </div>

      {overlayUrl && overlay === 'change' && (
        <div className="absolute bottom-3 right-3 z-[500] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] text-[#123f38] shadow">
          <span className="mr-2"><span className="mr-1 inline-block size-2.5 rounded-sm bg-[#22c55e]" />{t('gain', lang)}</span>
          <span className="mr-2"><span className="mr-1 inline-block size-2.5 rounded-sm bg-[#ef4444]" />{t('loss', lang)}</span>
          <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-[#f59e0b]" />{t('uncertain', lang)}</span>
        </div>
      )}
    </div>
  )
}
