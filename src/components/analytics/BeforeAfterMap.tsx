import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { ArrowLeftRight, Image as ImageIcon, MapPin, Satellite, Sparkles, TreePine, TriangleAlert } from 'lucide-react'
import type { AnalysisBundle } from '../../types/analysis'
import { fmt, type Lang } from './ui'
import { ESRI_URL } from './useBasemap'

type Mode = 'photo' | 'forest'

/**
 * Clips the left layer to the part of the map left of the divider and the right
 * layer to the rest (same technique as leaflet-side-by-side). Tile containers live
 * in layer coordinates, so the clip is recomputed whenever the map moves.
 */
function SideBySide({ left, right, pct }: { left: L.TileLayer | null; right: L.TileLayer | null; pct: number }) {
  const map = useMap()
  useEffect(() => {
    if (!left || !right) return
    const update = () => {
      const lc = left.getContainer()
      const rc = right.getContainer()
      if (!lc || !rc) return
      const size = map.getSize()
      const nw = map.containerPointToLayerPoint([0, 0])
      const se = map.containerPointToLayerPoint(size)
      const x = nw.x + (size.x * pct) / 100
      lc.style.clip = `rect(${nw.y}px, ${x}px, ${se.y}px, ${nw.x}px)`
      rc.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${x}px)`
    }
    update()
    map.on('move zoom zoomend resize viewreset', update)
    left.on('load', update)
    right.on('load', update)
    return () => {
      map.off('move zoom zoomend resize viewreset', update)
      left.off('load', update)
      right.off('load', update)
    }
  }, [map, left, right, pct])
  return null
}

function periodLabel(date: string, lang: Lang) {
  const m = Number(date.slice(5, 7))
  const year = date.slice(0, 4)
  if (m >= 1 && m <= 3) return year
  const months = lang === 'bn'
    ? ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${year}`
}

export function BeforeAfterMap({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const bn = lang === 'bn'
  const tiles = b.tiles ?? {}
  const hasPhotos = !!(tiles.trueColorStart && tiles.trueColorEnd)
  const hasForest = !!(tiles.classStart && tiles.classEnd)
  const [mode, setMode] = useState<Mode>(hasPhotos ? 'photo' : 'forest')
  const [pct, setPct] = useState(50)
  const [left, setLeft] = useState<L.TileLayer | null>(null)
  const [right, setRight] = useState<L.TileLayer | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMode(hasPhotos ? 'photo' : 'forest'), [b.analysisId, hasPhotos])

  const moveTo = useCallback((clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    setPct(Math.min(98, Math.max(2, ((clientX - r.left) / r.width) * 100)))
  }, [])

  // Follow the pointer on the whole window while dragging, so the divider keeps up
  // even when the pointer leaves the handle (more robust than pointer capture).
  const startDrag = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const move = (ev: globalThis.PointerEvent) => moveTo(ev.clientX)
      const stop = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', stop)
        window.removeEventListener('pointercancel', stop)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', stop)
      window.addEventListener('pointercancel', stop)
    },
    [moveTo],
  )

  if (!hasPhotos && !hasForest) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#c4ded2] bg-[#f7faf8] p-6 text-sm text-[#526a63]">
        <Satellite className="size-5 shrink-0 text-[#16865f]" />
        {bn
          ? 'আগে/পরে উপগ্রহ ছবি শুধু আসল উপগ্রহ তথ্য (Earth Engine) যুক্ত থাকলে দেখা যায়।'
          : 'Before/after satellite photos appear when real satellite data (Earth Engine) is connected.'}
      </div>
    )
  }

  const startLbl = periodLabel(b.summary.start.startDate, lang)
  const endLbl = periodLabel(b.summary.end.endDate, lang)
  const leftUrl = mode === 'photo' ? tiles.trueColorStart! : tiles.classStart!
  const rightUrl = mode === 'photo' ? tiles.trueColorEnd! : tiles.classEnd!
  const { lat, lon, radiusKm } = b.request
  const bounds = L.latLng(lat, lon).toBounds(radiusKm * 1000 * 2 * 1.9)

  const diff = b.change.netChangeHa
  const pctChange = b.change.percentChange
  const unreliable = b.reliability.level === 'low'
  const chip = unreliable
    ? { tone: 'amber', icon: TriangleAlert, text: bn ? 'নির্ভরযোগ্য নয় — সিদ্ধান্ত দেখুন' : 'Not reliable — see the verdict' }
    : Math.abs(pctChange) < 2
    ? { tone: 'green', icon: TreePine, text: bn ? `প্রায় একই (${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), 0, lang)} হেক্টর)` : `Stable forest (${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), 0)} ha)` }
    : diff > 0
    ? { tone: 'green', icon: Sparkles, text: bn ? `বন বেড়েছে (+${fmt(diff, 0, lang)} হেক্টর)` : `Regrowth detected (+${fmt(diff, 0)} ha)` }
    : { tone: 'red', icon: TriangleAlert, text: bn ? `বন কমেছে (−${fmt(-diff, 0, lang)} হেক্টর)` : `Loss detected (−${fmt(-diff, 0)} ha)` }
  const chipCls =
    chip.tone === 'red'
      ? 'text-[#fca5a5] border-red-400/40'
      : chip.tone === 'amber'
      ? 'text-[#fcd34d] border-amber-300/40'
      : 'text-emerald-300 border-emerald-400/40'
  const ChipIcon = chip.icon

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowLeft') setPct((p) => Math.max(2, p - 4))
    if (e.key === 'ArrowRight') setPct((p) => Math.min(98, p + 4))
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-xl border border-[#d6e6de] bg-white text-xs font-bold shadow-xs">
          {hasPhotos && (
            <button
              type="button"
              onClick={() => setMode('photo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${mode === 'photo' ? 'bg-[#16865f] text-white' : 'text-[#123f38] hover:bg-[#f2f6f3]'}`}
            >
              <ImageIcon className="size-3.5" /> {bn ? 'উপগ্রহ ছবি' : 'Satellite photo'}
            </button>
          )}
          {hasForest && (
            <button
              type="button"
              onClick={() => setMode('forest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${mode === 'forest' ? 'bg-[#16865f] text-white' : 'text-[#123f38] hover:bg-[#f2f6f3]'}`}
            >
              <TreePine className="size-3.5" /> {bn ? 'বনের মানচিত্র' : 'Forest map'}
            </button>
          )}
        </div>
        <p className="text-xs text-[#6c817a]">
          {bn ? 'মাঝের দাগটি টেনে আগে ও পরে তুলনা করুন · মানচিত্র সরানো ও জুম করা যায়' : 'Drag the handle to compare · you can also pan and zoom'}
        </p>
      </div>

      {/* Comparison viewport */}
      <div
        ref={boxRef}
        className="relative h-[380px] sm:h-[460px] lg:h-[520px] w-full overflow-hidden rounded-[24px] border-4 sm:border-8 border-white bg-[#08261e] shadow-2xl shadow-[#123c37]/15"
      >
        <MapContainer
          key={`${b.analysisId}-${mode}`}
          bounds={bounds}
          minZoom={8}
          maxZoom={17}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl
          ref={(m) => {
            m?.attributionControl.setPrefix(false)
          }}
        >
          <TileLayer url={ESRI_URL} attribution="Esri" opacity={mode === 'forest' ? 0.9 : 0.5} />
          <TileLayer ref={setLeft} key={`L-${leftUrl}`} url={leftUrl} attribution="Sentinel-2 · Google Earth Engine" maxNativeZoom={16} />
          <TileLayer ref={setRight} key={`R-${rightUrl}`} url={rightUrl} maxNativeZoom={16} />
          <Circle center={[lat, lon]} radius={radiusKm * 1000} pathOptions={{ color: '#facc15', weight: 2, dashArray: '6 6', fill: false }} />
          <SideBySide left={left} right={right} pct={pct} />
        </MapContainer>

        {/* Divider + handle (only the handle takes pointer input, the rest pans the map) */}
        <div className="pointer-events-none absolute inset-0 z-[600]">
          <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]" style={{ left: `${pct}%` }} />
          <button
            type="button"
            aria-label={bn ? 'আগে/পরে তুলনার দাগ' : 'Before/after divider'}
            onKeyDown={onKey}
            onPointerDown={startDrag}
            className="pointer-events-auto absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full border-4 border-white bg-white/95 text-[#16865f] shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
            style={{ left: `${pct}%` }}
          >
            <ArrowLeftRight className="size-5" />
          </button>
        </div>

        {/* Labels, like the landing-page slider */}
        <div className="pointer-events-none absolute left-4 top-4 z-[650] flex items-center gap-2 rounded-full bg-[#062f29]/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-emerald-400" />
          {startLbl} <span className="font-normal text-emerald-200/80">· {bn ? 'আগে' : 'BEFORE'}</span>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 z-[650] flex items-center gap-2 rounded-full bg-[#062f29]/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-emerald-400" />
          {endLbl} <span className="font-normal text-emerald-200/80">· {bn ? 'পরে' : 'AFTER'}</span>
        </div>

        <div className="pointer-events-none absolute bottom-7 left-4 z-[650] hidden rounded-xl bg-[#062f29]/90 sm:block px-3 py-1.5 text-white shadow-lg backdrop-blur">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <MapPin className="size-3.5 text-emerald-300" />
            {bn ? `${fmt(radiusKm * 2, 0, lang)} কিমি চওড়া এলাকা` : `${fmt(radiusKm * 2, 0)} km-wide area`}
          </p>
          <p className="font-mono text-[10px] text-emerald-200/80">
            {lat.toFixed(3)}°N · {lon.toFixed(3)}°E · Sentinel-2 · {b.request.scaleM} m
          </p>
        </div>
        <div className={`pointer-events-none absolute bottom-7 right-3 z-[650] flex sm:right-4 items-center gap-1.5 rounded-xl border bg-[#062f29]/90 px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur ${chipCls}`}>
          <ChipIcon className="size-3.5" /> {chip.text}
        </div>
      </div>

      {mode === 'forest' && (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#526a63]">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[#0b7a4b]" /> {bn ? 'ম্যানগ্রোভ বন' : 'Mangrove forest'}</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[#d9d2b6]" /> {bn ? 'অন্য (জল, মাঠ, গ্রাম)' : 'Other (water, fields, villages)'}</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-dashed border-[#facc15]" /> {bn ? 'বিশ্লেষণ এলাকা' : 'Analysed area'}</span>
        </div>
      )}
      {mode === 'photo' && (
        <p className="mt-2 text-xs text-[#6c817a]">
          {bn
            ? 'মেঘ সরানো উপগ্রহ ছবি (Sentinel-2, মাঝামাঝি মান)। গাঢ় সবুজ = ঘন বন; বাদামি/ধূসর = জল, কাদা বা খেত।'
            : 'Cloud-free Sentinel-2 photos (median of the season). Dark green = dense forest; brown/grey = water, mud or fields.'}
        </p>
      )}
    </div>
  )
}
