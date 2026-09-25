import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Compass,
  Layers,
  Loader2,
  MapPin,
  Play,
  Printer,
  Radio,
  Satellite,
  Share2,
  Sparkles,
  TreePine,
} from 'lucide-react'
import { Logo } from '../common/Logo'
import { AnalysisApi } from '../../services/analysis'
import type { AnalysisBundle, AnalysisParams, Capabilities } from '../../types/analysis'
import { LocationMap } from './LocationMap'
import { CarbonPanel, ChangeBreakdown, ScenarioChart, ScenarioTable, TimelineChart } from './charts'
import { AccuracyPanel, MethodPanel, NarrativePanel } from './panels'
import { AnswerCard, FutureBoxes, SimpleCards, YearsChart } from './SimpleView'
import { OrbitalRadarHUD } from './AnimatedWidgets'
import { Badge, Card, fmt, t, type Lang } from './ui'

// Forest spots first: near villages the model over-counts mangrove (see the reliability check).
const PRESETS = [
  { name: 'Sajnekhali forest', nameBn: 'সজনেখালি জঙ্গল', lat: 22.1, lon: 88.85, tag: 'Interior Forest' },
  { name: 'Sundarban south', nameBn: 'দক্ষিণ সুন্দরবন', lat: 21.85, lon: 88.9, tag: 'Tidal Core' },
  { name: 'Gosaba village', nameBn: 'গোসাবা গ্রাম', lat: 22.165, lon: 88.805, tag: 'Buffer Zone' },
]

const SIZES = [
  { km: 1, en: 'Small', bn: 'ছোট' },
  { km: 2, en: 'Medium', bn: 'মাঝারি' },
  { km: 4, en: 'Large', bn: 'বড়' },
]

const FALLBACK_DEFAULTS: AnalysisParams = {
  lat: 22.1,
  lon: 88.85,
  radiusKm: 2,
  startDate: '2020-01-01',
  endDate: '2025-03-31',
  windowDays: 90,
  language: 'en',
  useAi: false,
}

// "Compare years" always uses the Jan–Mar dry season of both years, so the
// two photos are taken in the same season (different seasons fake change).
const yearStart = (y: number) => `${y}-01-01`
const yearEnd = (y: number) => `${y}-03-31`
const isYearMode = (p: AnalysisParams) =>
  p.startDate.endsWith('-01-01') && p.endDate.endsWith('-03-31') && p.windowDays === 90

function paramsFromUrl(): Partial<AnalysisParams> {
  const q = new URLSearchParams(window.location.search)
  const num = (k: string) => (q.get(k) !== null && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : undefined)
  const out: Partial<AnalysisParams> = {}
  if (num('lat') !== undefined) out.lat = num('lat')
  if (num('lon') !== undefined) out.lon = num('lon')
  if (num('r') !== undefined) out.radiusKm = num('r')
  if (num('w') !== undefined) out.windowDays = num('w')
  if (q.get('s')) out.startDate = q.get('s')!
  if (q.get('e')) out.endDate = q.get('e')!
  if (q.get('lang') === 'bn') out.language = 'bn'
  return out
}

function urlFor(p: AnalysisParams) {
  const q = new URLSearchParams({
    lat: String(p.lat),
    lon: String(p.lon),
    r: String(p.radiusKm),
    s: p.startDate,
    e: p.endDate,
    w: String(p.windowDays),
    lang: p.language,
  })
  return `${window.location.origin}/dashboard?${q.toString()}`
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 font-display text-sm font-bold text-[#0f352e]">
        <span className="grid size-5.5 place-items-center rounded-full bg-[#16865f] font-mono text-[11px] font-bold text-white shadow-sm">
          {n}
        </span>
        <span>{title}</span>
      </p>
      {children}
    </div>
  )
}

export function AnalyticsDashboard({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [caps, setCaps] = useState<Capabilities | null>(null)
  const [params, setParams] = useState<AnalysisParams>(() => ({ ...FALLBACK_DEFAULTS, ...paramsFromUrl() }))
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(() => !isYearMode({ ...FALLBACK_DEFAULTS, ...paramsFromUrl() }))
  const [scenarioMetric, setScenarioMetric] = useState<'area' | 'carbon'>('area')
  const [copied, setCopied] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [activeSection, setActiveSection] = useState<'cockpit' | 'verdict' | 'metrics' | 'trends' | 'narrative' | 'technical-lab'>('cockpit')

  const runSeq = useRef(0)
  const lang: Lang = params.language
  const bn = lang === 'bn'

  const set = <K extends keyof AnalysisParams>(k: K, v: AnalysisParams[K]) => setParams((p) => ({ ...p, [k]: v }))

  // Years whose Jan–Mar season is complete and has Sentinel-2 L2A coverage.
  const lastYear = useMemo(() => {
    const today = new Date()
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  }, [])
  const years = useMemo(() => Array.from({ length: lastYear - 2019 + 1 }, (_, i) => 2019 + i), [lastYear])
  const fromYear = Number(params.startDate.slice(0, 4))
  const toYear = Number(params.endDate.slice(0, 4))
  const setYears = (from: number, to: number) =>
    setParams((p) => ({ ...p, startDate: yearStart(from), endDate: yearEnd(to), windowDays: 90 }))

  const run = useCallback(async (p: AnalysisParams) => {
    const seq = ++runSeq.current
    setLoading(true)
    setError(null)
    try {
      const result = await AnalysisApi.run(p)
      if (seq !== runSeq.current) return
      setBundle(result)
      window.history.replaceState({}, '', urlFor(p).replace(window.location.origin, ''))
    } catch (e) {
      if (seq === runSeq.current) setError((e as Error).message)
    } finally {
      if (seq === runSeq.current) setLoading(false)
    }
  }, [])

  // Load capabilities, then run once with the URL's values (or the forest default).
  useEffect(() => {
    const fromUrl = paramsFromUrl()
    AnalysisApi.capabilities()
      .then((c) => {
        setCaps(c)
        const merged: AnalysisParams = {
          ...FALLBACK_DEFAULTS,
          endDate: c.defaults.endDate,
          ...fromUrl,
        }
        setParams(merged)
        run(merged)
      })
      .catch((e) => setError((e as Error).message))
  }, [run])

  // Scroll listener for reading progress, parallel parallax, and section spy
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const sy = window.scrollY
          setScrollY(sy)
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = docHeight > 0 ? Math.min(100, Math.max(0, (sy / docHeight) * 100)) : 0
          setScrollProgress(progress)

          // Scrollspy detection
          const sections: Array<{ id: 'cockpit' | 'verdict' | 'metrics' | 'trends' | 'narrative' | 'technical-lab'; offset: number }> = [
            'technical-lab',
            'narrative',
            'trends',
            'metrics',
            'verdict',
            'cockpit',
          ].map((id) => {
            const el = document.getElementById(id)
            return {
              id: id as any,
              offset: el ? el.getBoundingClientRect().top + window.scrollY - 160 : 0,
            }
          })

          const current = sections.find((s) => sy >= s.offset)
          if (current) {
            setActiveSection(current.id)
          }

          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 110
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = urlFor({ ...params, ...(bundle?.request ?? {}), language: lang })
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      // fallback
    }
  }

  const stale = useMemo(() => {
    if (!bundle) return false
    const r = bundle.request
    return (
      r.lat !== params.lat ||
      r.lon !== params.lon ||
      r.radiusKm !== params.radiusKm ||
      r.startDate !== params.startDate ||
      r.endDate !== params.endDate ||
      r.windowDays !== params.windowDays
    )
  }, [bundle, params])

  const goHome = () => (onNavigate ? onNavigate('/') : (window.location.href = '/'))
  const limits = caps?.limits

  const input =
    'w-full rounded-xl border border-[#d6e6de] bg-white px-3 py-2 text-xs sm:text-sm text-[#123f38] focus:border-[#16865f] focus:outline-none focus:ring-2 focus:ring-[#16865f]/15 transition-all'

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 font-mono text-xs font-semibold transition-all duration-200 ${
      active
        ? 'border-[#16865f] bg-[#16865f] text-white shadow-sm'
        : 'border-[#d6e6de] bg-white text-[#123f38] hover:bg-[#e7f4ec] hover:border-[#16865f]/40'
    }`

  const b = bundle

  return (
    <div className={`relative min-h-screen bg-[#f5f9f6] text-[#123c37] ${bn ? 'font-bengali' : 'font-sans'}`}>
      {/* Scroll Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[1200] h-1 bg-emerald-500 transition-all duration-150 ease-out print:hidden"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Parallel Scrolling Ambient Background Layers */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 select-none print:hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-32 -left-32 size-[600px] rounded-full bg-emerald-300/20 blur-[120px]"
          style={{ transform: `translate3d(0, ${scrollY * 0.15}px, 0)` }}
        />
        <div
          className="absolute top-1/3 -right-32 size-[500px] rounded-full bg-teal-200/25 blur-[100px]"
          style={{ transform: `translate3d(0, ${-scrollY * 0.12}px, 0)` }}
        />
        {/* Floating Ambient Coordinates */}
        <div
          className="absolute top-[25%] left-8 font-mono text-[10px] tracking-widest text-emerald-800/20"
          style={{ transform: `translate3d(0, ${-scrollY * 0.25}px, 0)` }}
        >
          22.1000°N / 88.8500°E · SENTINEL-2 L2A · NIR/SWIR MANGROVE INDEX
        </div>
        <div
          className="absolute top-[60%] right-12 font-mono text-[10px] tracking-widest text-emerald-800/20"
          style={{ transform: `translate3d(0, ${-scrollY * 0.35}px, 0)` }}
        >
          IPCC TIER 1 BLUE CARBON · RANDOM FOREST ENSEMBLE · 10M SPATIAL RES
        </div>
      </div>

      {/* Unified Executive Clean Header */}
      <header className="sticky top-0 z-[1100] border-b border-[#d6e6de]/80 bg-white/95 backdrop-blur-md shadow-xs print:static">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-12 py-2.5">
          {/* Brand & Home */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={goHome}
              className="flex size-8 items-center justify-center rounded-lg border border-[#d6e6de] text-[#526a63] hover:border-[#16865f] hover:bg-[#e7f4ec] hover:text-[#123f38] transition print:hidden"
              aria-label={t('home', lang)}
              title="Return to Home"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="h-4 w-px bg-[#d6e6de]" />
            <Logo onClick={goHome} />
          </div>

          {/* Integrated Segmented Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-[#f2f6f3]/80 p-1 border border-[#d6e6de]/70 print:hidden" aria-label="Section navigation">
            {[
              { id: 'cockpit', labelEn: 'Cockpit', labelBn: 'নিয়ন্ত্রণ' },
              { id: 'verdict', labelEn: 'Canopy Verdict', labelBn: 'বনের সিদ্ধান্ত' },
              { id: 'metrics', labelEn: 'Blue Carbon & Area', labelBn: 'কার্বন ও এলাকা' },
              { id: 'trends', labelEn: 'Dynamics & Forecast', labelBn: 'গতিপ্রকৃতি' },
              { id: 'narrative', labelEn: 'Narrative', labelBn: 'বিবরণী' },
              { id: 'technical-lab', labelEn: 'Science Lab', labelBn: 'গবেষণা ল্যাব' },
            ].map(({ id, labelEn, labelBn }) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-white text-[#16865f] shadow-xs font-bold'
                      : 'text-[#526a63] hover:text-[#123f38]'
                  }`}
                >
                  {bn ? labelBn : labelEn}
                </button>
              )
            })}
          </nav>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {caps && (
              <Badge tone={caps.liveEngine ? 'live' : 'demo'}>
                <Satellite className="size-3" />
                <span className="hidden sm:inline">{caps.liveEngine ? (bn ? 'আসল উপগ্রহ' : 'Live Sentinel') : bn ? 'ডেমো সিমুলেশন' : 'Simulation'}</span>
              </Badge>
            )}

            {/* Quick Share with Toast */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-[#d6e6de] bg-white px-2.5 py-1 text-xs font-semibold text-[#123f38] shadow-xs hover:border-[#16865f] hover:bg-[#e7f4ec] transition print:hidden"
              title="Share or copy analysis URL"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5 text-[#6c817a]" />}
              <span className="hidden sm:inline">{copied ? (bn ? 'কপি হয়েছে!' : 'Copied!') : bn ? 'শেয়ার' : 'Share'}</span>
            </button>

            {/* Print / Export Report */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-[#d6e6de] bg-white px-2.5 py-1 text-xs font-semibold text-[#123f38] shadow-xs hover:border-[#16865f] hover:bg-[#e7f4ec] transition print:hidden"
              title="Print or save PDF report"
            >
              <Printer className="size-3.5 text-[#6c817a]" />
              <span className="hidden sm:inline">{bn ? 'রিপোর্ট' : 'Report'}</span>
            </button>

            {/* Bilingual Switcher */}
            <div className="flex overflow-hidden rounded-lg border border-[#d6e6de] font-mono text-xs font-bold shadow-xs print:hidden">
              {(['en', 'bn'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set('language', l)}
                  className={`px-2.5 py-0.5 transition-colors ${lang === l ? 'bg-[#16865f] text-white' : 'bg-white text-[#123f38] hover:bg-[#f2f6f3]'}`}
                >
                  {l === 'en' ? 'EN' : 'বাং'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Mobile Sub-navigation Strip (< lg) */}
        <div className="flex lg:hidden overflow-x-auto px-4 py-1.5 border-t border-[#d6e6de]/60 gap-1.5 scrollbar-none print:hidden bg-[#f7faf8]">
          {[
            { id: 'cockpit', labelEn: 'Cockpit', labelBn: 'নিয়ন্ত্রণ' },
            { id: 'verdict', labelEn: 'Verdict', labelBn: 'সিদ্ধান্ত' },
            { id: 'metrics', labelEn: 'Carbon', labelBn: 'কার্বন' },
            { id: 'trends', labelEn: 'Dynamics', labelBn: 'গতিপ্রকৃতি' },
            { id: 'narrative', labelEn: 'Narrative', labelBn: 'বিবরণী' },
            { id: 'technical-lab', labelEn: 'Science', labelBn: 'ল্যাব' },
          ].map(({ id, labelEn, labelBn }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold transition ${
                  active ? 'bg-[#16865f] text-white font-bold' : 'text-[#526a63] hover:text-[#123f38]'
                }`}
              >
                {bn ? labelBn : labelEn}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content Area - Widescreen Utilized */}
      <main className="relative z-10 mx-auto max-w-[1720px] space-y-6 px-4 sm:px-6 lg:px-8 xl:px-12 py-5 sm:py-7">
        {/* Ambient atmospheric background glows */}
        <div className="ambient-glow-emerald -top-24 -left-48" />
        <div className="ambient-glow-teal top-[450px] -right-48" />

        {/* SECTION 1: HERO COCKPIT & MISSION CONTROL */}
        <section id="cockpit" className="scroll-mt-20 space-y-4">
          {/* Eye-Catching Mission Hero Banner with Bebas Neue & Montserrat Font Pairing */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-[#04241d] p-6 sm:p-8 lg:p-10 text-white shadow-[0_16px_40px_rgba(4,36,29,0.35)] print:hidden">
            {/* AI Generated Orbital Radar Background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 pointer-events-none transition-transform duration-1000"
              style={{ backgroundImage: `url('/images/dashboard/sundarban_satellite_radar.jpg')` }}
            />
            {/* Dark gradient mask */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#04241d] via-[#04241d]/90 to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="size-3 text-emerald-400" />
                  {bn ? 'ইউরোপীয় মহাকাশ সংস্থা সেন্টিনেল-২ এআই বিশ্লেষণ' : 'Sentinel-2 L2A AI Spectral Intelligence'}
                </span>
                <span className="font-mono text-[11px] text-emerald-300/80">
                  {fmt(params.radiusKm * 2, 0, lang)} km swath · Dry season Jan–Mar composite
                </span>
              </div>

              {/* Font Pairing: Bebas Neue (Condensed Bold) + Montserrat (Light Tracked Subtitle) */}
              <h1 className="font-condensed text-4xl sm:text-5xl lg:text-6xl font-bold tracking-wide text-white leading-none">
                {bn
                  ? 'আপনার এলাকার ম্যানগ্রোভ বন কি বাড়ছে না কমছে?'
                  : 'IS THE MANGROVE FOREST GROWING OR SHRINKING?'}
              </h1>
              <p className="font-light-sub text-xs sm:text-sm font-extralight tracking-[0.24em] text-emerald-300 mt-2.5 leading-relaxed">
                {bn
                  ? 'উপগ্রহের ছবি দেখে বায়োমাস ও কার্বন মজুতের নির্ভরযোগ্য তথ্য'
                  : 'ORBITAL MULTISPECTRAL VERIFICATION · BLUE CARBON SEQUESTRATION · ECOSYSTEM RESILIENCE'}
              </p>
            </div>
          </div>

          {/* Animated Orbital Radar Telemetry HUD */}
          <div className="print:hidden">
            <OrbitalRadarHUD
              lat={params.lat}
              lon={params.lon}
              radiusKm={params.radiusKm}
              lang={lang}
            />
          </div>

          {/* Widescreen Cockpit: Map & Controls with Wide Screen Utilization */}
          <div className="grid gap-5 lg:grid-cols-[1fr_380px] xl:grid-cols-[1.3fr_420px] 2xl:grid-cols-[1.5fr_440px] print:block">
            <LocationMap
              lat={params.lat}
              lon={params.lon}
              radiusKm={params.radiusKm}
              onPick={(lat, lon) => setParams((p) => ({ ...p, lat, lon }))}
              bundle={bundle}
              lang={lang}
            />

            {/* Mission Controls Card */}
            <Card className="print:hidden border-[#c4ded2]">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  run(params)
                }}
              >
                {/* Step 1 */}
                <Step n={1} title={bn ? 'জায়গা বাছুন' : 'Choose Target Location'}>
                  <p className="text-xs text-[#6c817a]">
                    {bn ? 'মানচিত্রে ক্লিক করুন, অথবা নির্বাচিত এলাকা বাছুন:' : 'Click directly on the map, or select a preset:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESETS.map((p) => {
                      const active = params.lat === p.lat && params.lon === p.lon
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setParams((prev) => ({ ...prev, lat: p.lat, lon: p.lon }))}
                          className={chip(active)}
                        >
                          <MapPin className="mr-1 inline size-3" />
                          {bn ? p.nameBn : p.name}
                        </button>
                      )
                    })}
                  </div>
                </Step>

                {/* Step 2 */}
                <Step n={2} title={bn ? 'এলাকার পরিধি' : 'Analysis Swath (Radius)'}>
                  <div className="flex flex-wrap gap-1.5">
                    {SIZES.map((s) => {
                      const active = params.radiusKm === s.km
                      return (
                        <button
                          key={s.km}
                          type="button"
                          onClick={() => set('radiusKm', s.km)}
                          className={chip(active)}
                        >
                          {bn ? s.bn : s.en} · {fmt(s.km * 2, 0, lang)} {bn ? 'কিমি ব্যাস' : 'km wide'}
                        </button>
                      )
                    })}
                  </div>
                </Step>

                {/* Step 3 */}
                <Step n={3} title={bn ? 'তুলনার দুই বছর' : 'Standardized Year Comparison'}>
                  {!isYearMode(params) && (
                    <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <p>
                        {bn
                          ? `কাস্টম তারিখ চলছে (${params.startDate} → ${params.endDate})`
                          : `Custom dates active (${params.startDate} → ${params.endDate})`}
                      </p>
                      <button
                        type="button"
                        className="mt-1 rounded-lg bg-[#16865f] px-2 py-1 font-bold text-white text-[11px]"
                        onClick={() =>
                          setYears(Math.min(fromYear, lastYear - 1), Math.min(Math.max(toYear, fromYear + 1), lastYear))
                        }
                      >
                        {bn
                          ? `বছর তুলনা করুন: ${Math.min(fromYear, lastYear - 1)} → ${Math.min(Math.max(toYear, fromYear + 1), lastYear)}`
                          : `Switch to Standard: ${Math.min(fromYear, lastYear - 1)} → ${Math.min(Math.max(toYear, fromYear + 1), lastYear)}`}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <select
                      className={input}
                      value={fromYear}
                      onChange={(e) => setYears(Number(e.target.value), Math.max(toYear, Number(e.target.value) + 1))}
                      aria-label="From year"
                    >
                      {years.slice(0, -1).map((y) => (
                        <option key={y} value={y}>
                          {fmt(y, 0, lang).replace(/,/g, '')}
                        </option>
                      ))}
                    </select>
                    <span className="font-mono text-sm font-bold text-[#6c817a]">→</span>
                    <select
                      className={input}
                      value={toYear}
                      onChange={(e) => setYears(fromYear, Number(e.target.value))}
                      aria-label="To year"
                    >
                      {years
                        .filter((y) => y > fromYear)
                        .map((y) => (
                          <option key={y} value={y}>
                            {fmt(y, 0, lang).replace(/,/g, '')}
                          </option>
                        ))}
                    </select>
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] text-[#6c817a]">
                    {bn
                      ? '✓ মেঘমুক্ত জানুয়ারি–মার্চের শুকনো মৌসুমের ছবি তুলনা হয়।'
                      : '✓ Jan–Mar dry-season cloud-free composite window.'}
                  </p>
                </Step>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#16865f] to-[#0d6e4d] px-4 py-3 font-display text-base font-bold text-white shadow-md hover:from-[#137352] hover:to-[#09573c] disabled:opacity-60 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />}
                  <span>{loading ? (bn ? 'উপগ্রহ বিশ্লেষণ চলছে…' : 'Analyzing Satellite Telemetry…') : bn ? 'ফলাফল বিশ্লেষণ দেখুন' : 'Execute Satellite Analysis'}</span>
                </button>

                {stale && !loading && (
                  <p className="text-center font-mono text-xs font-semibold text-amber-700 animate-pulse">
                    {bn ? 'প্যারামিটার পরিবর্তন হয়েছে — নতুন ফলাফলের জন্য বাটন চাপুন।' : 'Parameters modified — execute to re-calculate.'}
                  </p>
                )}

                {/* Advanced Parameters */}
                <details open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
                  <summary className="flex cursor-pointer items-center gap-1 font-mono text-xs font-semibold text-[#6c817a] hover:text-[#123f38] transition">
                    <ChevronDown className="size-3.5" />
                    {bn ? 'বিশেষজ্ঞ কনফিগারেশন' : 'Expert Telemetry Parameters'}
                  </summary>
                  <div className="mt-2 space-y-2.5 rounded-xl border border-[#e5efe9] bg-[#f7faf7] p-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10.5px] font-mono text-[#6c817a]">Latitude</span>
                        <input
                          className={input}
                          type="number"
                          step="any"
                          value={params.lat}
                          onChange={(e) => set('lat', Number(e.target.value))}
                          aria-label="Latitude"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] font-mono text-[#6c817a]">Longitude</span>
                        <input
                          className={input}
                          type="number"
                          step="any"
                          value={params.lon}
                          onChange={(e) => set('lon', Number(e.target.value))}
                          aria-label="Longitude"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <div className="flex justify-between font-mono text-[10.5px] text-[#6c817a]">
                        <span>Radius</span>
                        <span>{fmt(params.radiusKm, 1, lang)} km</span>
                      </div>
                      <input
                        type="range"
                        className="mt-1 w-full accent-[#16865f]"
                        min={limits?.minRadiusKm ?? 0.5}
                        max={limits?.maxRadiusKm ?? 10}
                        step={0.5}
                        value={params.radiusKm}
                        onChange={(e) => set('radiusKm', Number(e.target.value))}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10.5px] font-mono text-[#6c817a]">{t('startDate', lang)}</span>
                        <input
                          className={input}
                          type="date"
                          min={limits?.minDate}
                          max={params.endDate}
                          value={params.startDate}
                          onChange={(e) => set('startDate', e.target.value)}
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] font-mono text-[#6c817a]">{t('endDate', lang)}</span>
                        <input
                          className={input}
                          type="date"
                          min={params.startDate}
                          max={limits?.maxDate}
                          value={params.endDate}
                          onChange={(e) => set('endDate', e.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-[10.5px] font-mono text-[#6c817a]">{t('window', lang)}</span>
                      <select
                        className={input}
                        value={params.windowDays}
                        onChange={(e) => set('windowDays', Number(e.target.value))}
                      >
                        {[30, 60, 90, 120, 180].map((d) => (
                          <option key={d} value={d}>
                            {d} {bn ? 'দিন' : 'days window'}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 pt-1 font-semibold text-[#123f38]">
                      <input
                        type="checkbox"
                        checked={params.useAi}
                        disabled={caps ? !caps.geminiConfigured : false}
                        onChange={(e) => set('useAi', e.target.checked)}
                        className="rounded accent-[#16865f]"
                      />
                      <span>{t('useAi', lang)}</span>
                    </label>
                  </div>
                </details>
              </form>
            </Card>
          </div>
        </section>

        {/* Status Messages */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 shadow-xs">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">{lang === 'bn' ? 'বিশ্লেষণে সমস্যা হয়েছে' : 'Analysis Error'}</p>
              <p className="text-xs text-rose-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && caps?.liveEngine && (
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm text-sky-950 shadow-xs backdrop-blur">
            <Loader2 className="size-5 shrink-0 animate-spin text-sky-600" />
            <div>
              <p className="font-bold">
                {bn ? 'উপগ্রহ ছবি প্রক্রিয়াকরণ চলছে…' : 'Processing Sentinel-2 Multispectral Tiles…'}
              </p>
              <p className="text-xs text-sky-800 mt-0.5">
                {bn
                  ? 'প্রথমবার নতুন এলাকার জন্য ক্লাউড কম্পোজিট তৈরিতে ১-২ মিনিট সময় লাগতে পারে।'
                  : 'Retrieving cloud-free optical composite and computing random-forest canopy classification.'}
              </p>
            </div>
          </div>
        )}

        {/* ANALYTICS SECTIONS */}
        {b && (
          <div className={`space-y-8 transition-opacity duration-300 ${loading ? 'opacity-50' : ''}`}>
            {/* SECTION 2: CANOPY VERDICT */}
            <div id="verdict" className="scroll-mt-28">
              <AnswerCard bundle={b} lang={lang} />
            </div>

            {/* SECTION 3: CORE BLUE CARBON & AREA METRICS */}
            <div id="metrics" className="scroll-mt-28 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                    {bn ? 'মূল পরিবেশগত সূচক' : 'CORE ECOSYSTEM INVENTORY'}
                  </p>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                    {bn ? 'ম্যানগ্রোভ আয়তন ও ব্লু কার্বন মজুত' : 'MANGROVE CANOPY & BLUE CARBON RESERVOIR'}
                  </h3>
                </div>
                <span className="hidden sm:inline font-mono text-xs text-[#6c817a] bg-white border border-[#d6e6de] px-2.5 py-1 rounded-lg">
                  AOI: {fmt(params.radiusKm, 1, lang)} km radius
                </span>
              </div>
              <SimpleCards bundle={b} lang={lang} />
            </div>

            {/* SECTION 4: ANNUAL DYNAMICS & 5-YEAR PROJECTIONS */}
            <div id="trends" className="scroll-mt-28 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                    {bn ? 'কালক্রমিক ও ভবিষ্যৎ পূর্বাভাস' : 'TEMPORAL DYNAMICS & HORIZON SCENARIOS'}
                  </p>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                    {bn ? 'বার্ষিক বন পরিবর্তন ও ৫ বছরের সম্ভাব্য চিত্র' : 'ANNUAL CANOPY EVOLUTION & 5-YEAR PROJECTIONS'}
                  </h3>
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card title={bn ? 'বার্ষিক ম্যানগ্রোভ আয়তন' : 'Annual Mangrove Canopy Area'}>
                  <YearsChart bundle={b} lang={lang} />
                </Card>
                <Card title={bn ? 'আগামী ৫ বছরের প্রক্ষেপণ চিত্র' : 'Next 5-Year Horizon Scenarios'}>
                  <FutureBoxes bundle={b} lang={lang} />
                </Card>
              </div>
            </div>

            {/* SECTION 5: COMMUNITY NARRATIVE */}
            <div id="narrative" className="scroll-mt-28 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                    {bn ? 'সহজ কথায় পরিবেশ প্রতিবেদন' : 'COMMUNITY INTELLIGENCE REPORT'}
                  </p>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                    {bn ? 'ম্যানগ্রোভ ও জলবায়ু প্রভাব বিবরণী' : 'PLAIN-LANGUAGE ECOSYSTEM NARRATIVE'}
                  </h3>
                </div>
              </div>
              <Card>
                <NarrativePanel
                  bundle={b}
                  lang={lang}
                  shareLink={urlFor({ ...params, ...b.request, language: lang, useAi: false })}
                />
              </Card>
            </div>

            {/* SECTION 6: ADVANCED TECHNICAL & SCIENTIFIC LABORATORY */}
            <div id="technical-lab" className="scroll-mt-28">
              <details className="glass-panel group rounded-3xl p-5 sm:p-6 transition-all shadow-md">
                <summary className="flex cursor-pointer items-center justify-between text-base font-bold text-[#0f352e]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🔬</span>
                    <span className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide">
                      {bn ? 'বিশেষজ্ঞদের জন্য বিস্তারিত বৈজ্ঞানিক গবেষণা তথ্য' : 'ADVANCED SCIENCE & VALIDATION LABORATORY'}
                    </span>
                    <span className="hidden sm:inline font-light-sub text-[11px] font-normal tracking-[0.2em] text-[#6c817a]">
                      ({bn ? 'কনফিউশন ম্যাট্রিক্স, কার্বন পুল' : 'CONFUSION MATRIX · IPCC POOLS · UNCERTAINTY'})
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-[#6c817a] transition-transform group-open:rotate-180" />
                </summary>

                <div className="mt-5 space-y-5 border-t border-[#e5efe9] pt-5">
                  {b.warnings.length > 0 && (
                    <ul className="space-y-1 rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 font-medium">
                      {b.warnings.map((w) => (
                        <li key={w} className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card title={t('timeline', lang)} className="lg:col-span-2">
                      <TimelineChart bundle={b} lang={lang} />
                    </Card>
                    <Card title={t('change', lang)}>
                      <ChangeBreakdown bundle={b} lang={lang} />
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card
                      title={t('scenarios', lang)}
                      className="lg:col-span-2"
                      right={
                        <div className="flex overflow-hidden rounded-xl border border-[#d6e6de] font-mono text-[11px] font-bold">
                          {(['area', 'carbon'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setScenarioMetric(m)}
                              className={`px-2.5 py-1 transition-colors ${
                                scenarioMetric === m ? 'bg-[#16865f] text-white' : 'bg-white text-[#123f38] hover:bg-[#f2f6f3]'
                              }`}
                            >
                              {m === 'area' ? (bn ? 'এলাকা' : 'Area') : bn ? 'কার্বন' : 'Carbon'}
                            </button>
                          ))}
                        </div>
                      }
                    >
                      <ScenarioChart bundle={b} lang={lang} metric={scenarioMetric} />
                      <div className="mt-3">
                        <ScenarioTable bundle={b} lang={lang} />
                      </div>
                    </Card>
                    <Card title={t('carbon', lang)}>
                      <CarbonPanel bundle={b} lang={lang} />
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card title={t('accuracy', lang)}>
                      <AccuracyPanel bundle={b} lang={lang} />
                    </Card>
                    <Card title={t('method', lang)}>
                      <MethodPanel bundle={b} lang={lang} />
                    </Card>
                  </div>
                </div>
              </details>
            </div>

            {/* Footer Footnote */}
            <div className="border-t border-[#d6e6de]/70 pt-6 pb-8 text-center text-xs text-[#6c817a] space-y-1">
              <p>
                {bn
                  ? 'সুন্দরবন ব্লু কার্বন সিস্টেম — রিমোট সেন্সিং ও পরিবেশগত নজরদারির উদ্দেশ্যে প্রণীত।'
                  : 'Sundarban Blue Carbon Monitoring System — Designed for scientific research and community stewardship.'}
              </p>
              <p className="font-mono text-[11px] text-[#8aa39b]">
                {b.dataSource.modelVersion} · Sentinel-2 MSI · IPCC Tier 1 Guidelines
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Smooth Scroll to Top Button */}
      {scrollY > 350 && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 right-5 z-[1000] flex size-11 items-center justify-center rounded-full bg-[#16865f] text-white shadow-xl hover:bg-[#0f6e4d] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer print:hidden"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </div>
  )
}
