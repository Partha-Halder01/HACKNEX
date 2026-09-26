import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Play,
  Printer,
  Radio,
  Satellite,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TreePine,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import { Logo } from '../common/Logo'
import { AnalysisApi } from '../../services/analysis'
import type { AnalysisBundle, AnalysisParams, Capabilities } from '../../types/analysis'
import { LocationMap } from './LocationMap'
import { BeforeAfterMap } from './BeforeAfterMap'
import { CarbonPanel, ChangeBreakdown, ScenarioChart, ScenarioTable, TimelineChart } from './charts'
import { AccuracyPanel, MethodPanel, NarrativePanel } from './panels'
import { AnswerCard, FutureBoxes, SimpleCards, YearsChart } from './SimpleView'
import { ReportModal } from './ReportModal'
import { ProjectTour, type TryPlace } from './ProjectTour'
import { Badge, Card, fmt, signed, t, type Lang } from './ui'
import { cn } from '../../lib/utils'

// Known baseline forest sites in the Sundarbans Biosphere Reserve
const PRESETS = [
  { name: 'Sajnekhali forest', nameBn: 'সজনেখালি জঙ্গল', lat: 22.1, lon: 88.85, tag: 'Interior Forest', tagBn: 'গভীর বন' },
  { name: 'Sundarban south', nameBn: 'দক্ষিণ সুন্দরবন', lat: 21.85, lon: 88.9, tag: 'Tidal Core', tagBn: 'ভাটার মূল এলাকা' },
  { name: 'Gosaba village', nameBn: 'গোসাবা গ্রাম', lat: 22.165, lon: 88.805, tag: 'Buffer Zone', tagBn: 'বসতি বাফার' },
]

const SIZES = [
  { km: 1, en: '1 km', bn: '১ কিমি', descEn: '3.1 km² swath', descBn: '৩.১ বর্গকিমি' },
  { km: 2, en: '2 km', bn: '২ কিমি', descEn: '12.6 km² swath', descBn: '১২.৬ বর্গকিমি' },
  { km: 4, en: '4 km', bn: '৪ কিমি', descEn: '50.3 km² swath', descBn: '৫০.৩ বর্গকিমি' },
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

// "Compare years" standardizes on the Jan–Mar dry season of both years
// to eliminate cloud artifacts and false seasonal phonological differences.
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
  const [activeSection, setActiveSection] = useState<'cockpit' | 'verdict' | 'compare' | 'metrics' | 'trends' | 'narrative' | 'technical-lab'>('cockpit')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  const handleGenerateReport = () => {
    if (!bundle) return
    setIsGeneratingReport(true)
    setTimeout(() => {
      setIsGeneratingReport(false)
      setShowReportModal(true)
    }, 400)
  }

  const runSeq = useRef(0)
  const lang: Lang = params.language
  const bn = lang === 'bn'

  const set = <K extends keyof AnalysisParams>(k: K, v: AnalysisParams[K]) => setParams((p) => ({ ...p, [k]: v }))

  // Sentinel-2 L2A archive complete years
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

  // Initial load
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

  // Scroll listener for reading progress bar and section tracking
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

          const sections: Array<{ id: 'cockpit' | 'verdict' | 'compare' | 'metrics' | 'trends' | 'narrative' | 'technical-lab'; offset: number }> = [
            'technical-lab',
            'narrative',
            'trends',
            'metrics',
            'compare',
            'verdict',
            'cockpit',
          ].map((id) => {
            const el = document.getElementById(id)
            return {
              id: id as any,
              offset: el ? el.getBoundingClientRect().top + window.scrollY - 140 : 0,
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
      const top = el.getBoundingClientRect().top + window.scrollY - 95
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

  const activePreset = PRESETS.find((p) => Math.abs(p.lat - params.lat) < 0.005 && Math.abs(p.lon - params.lon) < 0.005)

  const input =
    'w-full rounded-lg border border-[#cfdfd6] bg-white px-3 py-2 text-xs sm:text-sm text-[#123f38] focus:border-[#16865f] focus:outline-none focus:ring-1 focus:ring-[#16865f] transition-all font-mono'

  const b = bundle

  return (
    <div className={`relative min-h-screen bg-[#f7faf8] text-[#123c37] ${bn ? 'font-bengali' : 'font-sans'}`}>
      {/* Top Reading Progress Indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-[1200] h-0.5 bg-[#16865f] transition-all duration-150 ease-out print:hidden"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Professional Scientific Top Navigation Bar */}
      <header className="sticky top-0 z-[1100] border-b border-[#d8e6df] bg-white/95 backdrop-blur-md shadow-2xs print:static">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5">
          {/* Brand & Overview Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-1.5 rounded-lg border border-[#d6e6de] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#123f38] hover:border-[#16865f] hover:bg-[#edf7f2] transition cursor-pointer print:hidden"
              aria-label={t('home', lang)}
              title="Return to Home Overview"
            >
              <ArrowLeft className="size-3.5 text-[#526a63]" />
              <span className="hidden sm:inline font-mono text-[11px]">{bn ? 'হোম' : 'Overview'}</span>
            </button>
            <div className="h-4 w-px bg-[#d6e6de]" />
            <Logo onClick={goHome} />
          </div>

          {/* Precision Segmented Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-0.5 rounded-xl bg-[#eef4f0] p-1 border border-[#d5e5dc] print:hidden" aria-label="Section navigation">
            {[
              { id: 'cockpit', labelEn: 'Console', labelBn: 'কনসোল' },
              { id: 'verdict', labelEn: 'Verdict', labelBn: 'সিদ্ধান্ত' },
              { id: 'compare', labelEn: 'Before / After', labelBn: 'আগে / পরে' },
              { id: 'metrics', labelEn: 'Carbon & Area', labelBn: 'কার্বন ও এলাকা' },
              { id: 'trends', labelEn: 'Dynamics', labelBn: 'গতিপ্রকৃতি' },
              { id: 'narrative', labelEn: 'Briefing', labelBn: 'বিবরণী' },
              { id: 'technical-lab', labelEn: 'Science Lab', labelBn: 'ল্যাব' },
            ].map(({ id, labelEn, labelBn }) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={cn(
                    'rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all duration-150 cursor-pointer',
                    active
                      ? 'bg-[#123c37] text-white shadow-2xs font-bold'
                      : 'text-[#4d665e] hover:text-[#123f38] hover:bg-white/60'
                  )}
                >
                  {bn ? labelBn : labelEn}
                </button>
              )
            })}
          </nav>

          {/* Clean Action Toolbar (Refined, no clutter) */}
          <div className="flex items-center gap-2">
            {/* How it works: system guide with architecture and data-flow diagrams */}
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#0f352e] bg-[#04241d] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#06302a] cursor-pointer print:hidden"
              title={bn ? 'পুরো সিস্টেম কীভাবে কাজ করে — আর্কিটেকচার ও চিত্রসহ' : 'How the whole system works — architecture and diagrams'}
            >
              <Workflow className="size-3.5 text-emerald-300" />
              <span className="font-mono text-[11px] font-bold">{bn ? 'কীভাবে কাজ করে' : 'How it works'}</span>
            </button>

            {/* Generate & View Analysis Report */}
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={!bundle || loading || isGeneratingReport}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs transition cursor-pointer print:hidden',
                bundle
                  ? 'border-[#16865f] bg-[#16865f] text-white hover:bg-[#126b4c]'
                  : 'border-[#d6e6de] bg-white text-[#526a63] opacity-60 cursor-not-allowed'
              )}
              title={bn ? 'রিপোর্ট তৈরি ও দেখুন' : 'Generate and view analysis report'}
            >
              {isGeneratingReport ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              <span className="hidden sm:inline font-mono text-[11px] font-bold">
                {isGeneratingReport ? (bn ? 'রিপোর্ট তৈরি হচ্ছে…' : 'Generating…') : (bn ? 'রিপোর্ট' : 'Report')}
              </span>
            </button>

            {/* Compact Share Icon Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex size-7.5 items-center justify-center rounded-lg border border-[#d6e6de] bg-white text-[#526a63] hover:border-[#16865f] hover:text-[#123f38] hover:bg-[#edf7f2] transition cursor-pointer print:hidden"
              title={copied ? (bn ? 'কপি হয়েছে!' : 'Copied!') : (bn ? 'শেয়ার লিংক কপি করুন' : 'Copy share link')}
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="flex lg:hidden overflow-x-auto px-4 py-1.5 border-t border-[#d8e6df]/70 gap-1.5 scrollbar-none print:hidden bg-[#f7faf8]">
          {[
            { id: 'cockpit', labelEn: 'Console', labelBn: 'কনসোল' },
            { id: 'verdict', labelEn: 'Verdict', labelBn: 'সিদ্ধান্ত' },
            { id: 'compare', labelEn: 'Compare', labelBn: 'তুলনা' },
            { id: 'metrics', labelEn: 'Carbon', labelBn: 'কার্বন' },
            { id: 'trends', labelEn: 'Dynamics', labelBn: 'গতিপ্রকৃতি' },
            { id: 'narrative', labelEn: 'Briefing', labelBn: 'বিবরণী' },
            { id: 'technical-lab', labelEn: 'Science', labelBn: 'ল্যাব' },
          ].map(({ id, labelEn, labelBn }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition cursor-pointer',
                  active ? 'bg-[#123c37] text-white font-bold' : 'text-[#526a63] hover:text-[#123f38]'
                )}
              >
                {bn ? labelBn : labelEn}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="relative z-10 mx-auto max-w-[1720px] space-y-6 px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
        {/* SECTION 1: GIS MISSION CONSOLE & COCKPIT */}
        <section id="cockpit" className="scroll-mt-20 space-y-3.5">
          {/* Compact Scientific Telemetry Bar (Replaces noisy hero banners) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#d2e4db] bg-white px-4 py-3 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-[#edf6f1] text-[#16865f] shrink-0">
                <Compass className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-light-sub text-[10px] sm:text-[10.5px] font-bold tracking-[0.22em] text-[#16865f]">
                    {bn ? 'উপগ্রহ নজরদারি' : 'EARTH OBSERVATION AOI'}
                  </p>
                  {activePreset && (
                    <span className="rounded bg-[#edf5f1] border border-[#cbe4d7] px-1.5 py-0.2 font-mono text-[10px] font-semibold text-[#1b6b52]">
                      {bn ? activePreset.tagBn : activePreset.tag}
                    </span>
                  )}
                </div>
                <h1 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e] leading-none mt-0.5">
                  {activePreset ? (bn ? activePreset.nameBn : activePreset.name) : (bn ? 'কাস্টম স্থানাঙ্ক এলাকা' : 'TARGET AREA OF INTEREST')}
                </h1>
                <p className="font-mono text-[11px] text-[#6c817a] truncate mt-1">
                  {params.lat.toFixed(4)}°N, {params.lon.toFixed(4)}°E · {params.radiusKm * 2} km swath · Sentinel-2 MSI (10m Multispectral)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e0ece5] bg-[#f9fbf9] px-2.5 py-1 font-mono text-[11px] text-[#425d54]">
                <span className="size-1.5 rounded-full bg-[#16865f]" />
                {bn ? `তুলনা: ${fromYear} → ${toYear}` : `Epoch: ${fromYear} → ${toYear}`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e0ece5] bg-[#f9fbf9] px-2.5 py-1 font-mono text-[11px] text-[#425d54]">
                AOI: {(Math.PI * params.radiusKm * params.radiusKm).toFixed(1)} km²
              </span>
            </div>
          </div>

          {/* Integrated Equal-Height Workspace Grid (Eliminates the empty gap below the map!) */}
          <div className="grid gap-4 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px] 2xl:grid-cols-[1.25fr_440px] items-stretch print:block">
            {/* Left Column: Full-Height Map Container */}
            <div className="min-h-[480px] sm:min-h-[540px] lg:min-h-[640px] xl:min-h-[680px] flex">
              <LocationMap
                lat={params.lat}
                lon={params.lon}
                radiusKm={params.radiusKm}
                onPick={(lat, lon) => setParams((p) => ({ ...p, lat, lon }))}
                bundle={bundle}
                lang={lang}
                className="w-full flex-1"
              />
            </div>

            {/* Right Column: Mission Telemetry Inspector */}
            <div className="flex flex-col rounded-2xl border border-[#cbe0d5] bg-white p-4 sm:p-5 shadow-xs">
              <form
                className="flex flex-col justify-between h-full space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  run(params)
                }}
              >
                {/* Panel Header */}
                <div className="border-b border-[#e6f0ea] pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xs font-bold text-[#0f352e] tracking-wider uppercase">
                      {bn ? 'অভিযান পরিমিতি ও নিয়ন্ত্রণ' : 'Telemetry & Analysis Parameters'}
                    </h2>
                    <span
                      className={cn(
                        'font-mono text-[10.5px] font-bold rounded px-1.5 py-0.5 border',
                        loading
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : stale
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      )}
                    >
                      {loading ? (bn ? 'বিশ্লেষণ চলছে' : 'Computing…') : stale ? (bn ? 'পরিবর্তিত' : 'Pending Run') : bn ? 'প্রস্তুত' : 'Synchronized'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6c817a]">
                    {bn ? 'স্থান, পরিধি ও বছর নির্বাচন করে স্যাটেলাইট বিশ্লেষণ চালান।' : 'Configure multispectral swath and compare standardized epochs.'}
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  {/* Step 1: Target Location Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#40564f]">
                        {bn ? '১. লক্ষিত এলাকা' : '1. Target Location (AOI)'}
                      </label>
                      <span className="font-mono text-[10.5px] text-[#6c817a]">
                        {params.lat.toFixed(4)}°, {params.lon.toFixed(4)}°
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {PRESETS.map((p) => {
                        const active = Math.abs(params.lat - p.lat) < 0.005 && Math.abs(params.lon - p.lon) < 0.005
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setParams((prev) => ({ ...prev, lat: p.lat, lon: p.lon }))}
                            className={cn(
                              'flex flex-col text-left p-2 rounded-xl border transition-all cursor-pointer text-xs',
                              active
                                ? 'border-[#16865f] bg-[#edf7f2] text-[#0f352e] shadow-2xs font-semibold'
                                : 'border-[#d6e6de] bg-white text-[#526a63] hover:border-[#16865f]/50 hover:bg-[#f7faf8]',
                            )}
                          >
                            <span className="font-medium truncate">{bn ? p.nameBn : p.name}</span>
                            <span className="font-mono text-[10px] text-[#6c817a]">{bn ? p.tagBn : p.tag}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 2: Swath Aperture Radius */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#40564f]">
                      {bn ? '২. এলাকার ব্যাসার্ধ (সোয়াথ)' : '2. Swath Aperture (Radius)'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SIZES.map((s) => {
                        const active = params.radiusKm === s.km
                        return (
                          <button
                            key={s.km}
                            type="button"
                            onClick={() => set('radiusKm', s.km)}
                            className={cn(
                              'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer',
                              active
                                ? 'border-[#16865f] bg-[#edf7f2] text-[#0f352e] shadow-2xs font-semibold'
                                : 'border-[#d6e6de] bg-white text-[#526a63] hover:border-[#16865f]/50 hover:bg-[#f7faf8]',
                            )}
                          >
                            <span className="font-mono text-xs font-bold">{bn ? s.bn : s.en}</span>
                            <span className="font-mono text-[10px] text-[#6c817a]">{bn ? s.descBn : s.descEn}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 3: Comparative Years */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#40564f]">
                        {bn ? '৩. তুলনার দুই বছর' : '3. Standardized Epoch Comparison'}
                      </label>
                      <span className="font-mono text-[10px] font-semibold text-[#16865f] bg-[#edf7f2] border border-[#cbe4d7] rounded px-1.5 py-0.2">
                        Δ {toYear - fromYear} {bn ? 'বছর ব্যবধান' : 'Yrs Delta'}
                      </span>
                    </div>

                    {!isYearMode(params) && (
                      <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        <p>
                          {bn
                            ? `কাস্টম তারিখ চলছে (${params.startDate} → ${params.endDate})`
                            : `Custom dates active (${params.startDate} → ${params.endDate})`}
                        </p>
                        <button
                          type="button"
                          className="mt-1 rounded-md bg-[#16865f] px-2 py-0.5 font-bold text-white text-[11px] cursor-pointer"
                          onClick={() =>
                            setYears(Math.min(fromYear, lastYear - 1), Math.min(Math.max(toYear, fromYear + 1), lastYear))
                          }
                        >
                          {bn ? 'স্ট্যান্ডার্ড বছরে ফিরুন' : 'Switch to Standard Epoch'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-[#6c817a] mb-0.5">{bn ? 'শুরুর বছর' : 'Baseline Year'}</label>
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
                      </div>

                      <span className="mt-4 font-mono text-sm font-bold text-[#8fa79e]">→</span>

                      <div>
                        <label className="block text-[10px] font-mono text-[#6c817a] mb-0.5">{bn ? 'শেষ বছর' : 'Comparison Year'}</label>
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
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-[#4d6b60] font-mono">
                      <Check className="size-3 text-[#16865f] shrink-0" />
                      <span>{bn ? 'মেঘমুক্ত জানুয়ারি–মার্চের শুকনো মৌসুমের ছবি।' : 'Jan–Mar dry-season cloud-free composite window.'}</span>
                    </div>
                  </div>

                  {/* Expert Telemetry Configuration Accordion */}
                  <details
                    open={showAdvanced}
                    onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
                    className="border-t border-[#e6f0ea] pt-2"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-mono text-xs font-semibold text-[#5a746b] hover:text-[#123f38] transition py-1">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3 text-[#16865f]" />
                        <span>{bn ? 'বিশেষজ্ঞ কনফিগারেশন' : 'Expert Telemetry Parameters'}</span>
                      </div>
                      <ChevronDown className="size-3.5" />
                    </summary>

                    <div className="mt-2 space-y-2.5 rounded-xl border border-[#e5efe9] bg-[#f9fbf9] p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10.5px] font-mono text-[#6c817a]">Latitude (°N)</span>
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
                          <span className="text-[10.5px] font-mono text-[#6c817a]">Longitude (°E)</span>
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
                          <span>Swath Radius</span>
                          <span>{fmt(params.radiusKm, 1, lang)} km</span>
                        </div>
                        <input
                          type="range"
                          className="mt-1 w-full accent-[#16865f] cursor-pointer"
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

                      <label className="flex items-center gap-2 pt-1 font-semibold text-[#123f38] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.useAi}
                          disabled={caps ? !caps.geminiConfigured : false}
                          onChange={(e) => set('useAi', e.target.checked)}
                          className="rounded accent-[#16865f]"
                        />
                        <span className="text-xs">{t('useAi', lang)}</span>
                      </label>
                    </div>
                  </details>
                </div>

                {/* Primary Execution Action */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#123c37] hover:bg-[#0a2723] px-4 py-3 font-display text-sm sm:text-base font-bold text-white shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4.5 animate-spin text-emerald-400" />
                        <span>{bn ? 'উপগ্রহ তথ্য বিশ্লেষণ চলছে…' : 'Processing Satellite Telemetry…'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-4.5 fill-current text-emerald-400" />
                        <span>{bn ? 'ফলাফল বিশ্লেষণ দেখুন' : 'Run Satellite Analysis'}</span>
                      </>
                    )}
                  </button>

                  {stale && !loading && (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2 py-1 text-center font-mono text-[11px] font-semibold text-amber-800">
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{bn ? 'প্যারামিটার পরিবর্তন হয়েছে — নতুন ফলাফলের জন্য চালান।' : 'Parameters modified — execute to calculate.'}</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Status Error Messages */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 shadow-2xs">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">{lang === 'bn' ? 'বিশ্লেষণে সমস্যা হয়েছে' : 'Analysis Processing Error'}</p>
              <p className="text-xs text-rose-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Live Loading Overlay */}
        {loading && caps?.liveEngine && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/95 p-4 text-sm text-sky-950 shadow-2xs">
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
            <div id="verdict" className="scroll-mt-24 space-y-2">
              <div>
                <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#16865f]">
                  {bn ? 'উপগ্রহ সিদ্ধান্ত' : 'ANALYSIS VERDICT'}
                </p>
              </div>
              <AnswerCard bundle={b} lang={lang} />
            </div>

            {/* SECTION 3: BEFORE / AFTER REAL SATELLITE COMPARISON */}
            <div id="compare" className="scroll-mt-24 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                    {bn ? 'নিজের চোখে দেখুন' : 'SEE THE CHANGE'}
                  </p>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                    {bn ? 'আগে ও পরে — আসল উপগ্রহ ছবি' : 'BEFORE & AFTER — REAL SATELLITE PHOTOS'}
                  </h3>
                </div>
                <span className="font-mono text-xs text-[#6c817a]">
                  {fromYear} vs {toYear} Dry Season Composite
                </span>
              </div>
              <Card>
                <BeforeAfterMap bundle={b} lang={lang} />
              </Card>
            </div>

            {/* SECTION 4: CORE BLUE CARBON & AREA METRICS */}
            <div id="metrics" className="scroll-mt-24 space-y-3">
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

            {/* SECTION 5: ANNUAL DYNAMICS & 5-YEAR PROJECTIONS */}
            <div id="trends" className="scroll-mt-24 space-y-3">
              <div>
                <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                  {bn ? 'কালক্রমিক ও ভবিষ্যৎ পূর্বাভাস' : 'TEMPORAL DYNAMICS & HORIZON SCENARIOS'}
                </p>
                <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                  {bn ? 'বার্ষিক বন পরিবর্তন ও ৫ বছরের সম্ভাব্য চিত্র' : 'ANNUAL CANOPY EVOLUTION & 5-YEAR PROJECTIONS'}
                </h3>
              </div>
              <div className="grid gap-4.5 lg:grid-cols-2">
                <Card title={bn ? 'বার্ষিক ম্যানগ্রোভ আয়তন' : 'Annual Mangrove Canopy Area'}>
                  <YearsChart bundle={b} lang={lang} />
                </Card>
                <Card title={bn ? 'আগামী ৫ বছরের প্রক্ষেপণ চিত্র' : 'Next 5-Year Horizon Scenarios'}>
                  <FutureBoxes bundle={b} lang={lang} />
                </Card>
              </div>
            </div>

            {/* SECTION 6: COMMUNITY NARRATIVE */}
            <div id="narrative" className="scroll-mt-24 space-y-3">
              <div>
                <p className="font-light-sub text-[11px] font-bold tracking-[0.22em] text-[#6c817a]">
                  {bn ? 'সহজ কথায় পরিবেশ প্রতিবেদন' : 'COMMUNITY INTELLIGENCE REPORT'}
                </p>
                <h3 className="font-condensed text-2xl sm:text-3xl font-bold tracking-wide text-[#0f352e]">
                  {bn ? 'ম্যানগ্রোভ ও জলবায়ু প্রভাব বিবরণী' : 'PLAIN-LANGUAGE ECOSYSTEM NARRATIVE'}
                </h3>
              </div>
              <Card>
                <NarrativePanel
                  bundle={b}
                  lang={lang}
                  shareLink={urlFor({ ...params, ...b.request, language: lang, useAi: false })}
                />
              </Card>
            </div>

            {/* SECTION 7: ADVANCED TECHNICAL & SCIENTIFIC LABORATORY */}
            <div id="technical-lab" className="scroll-mt-24">
              <details className="rounded-2xl border border-[#cbe0d5] bg-white p-5 sm:p-6 transition-all shadow-xs group">
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
                    <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 font-medium">
                      {b.warnings.map((w) => (
                        <li key={w} className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="grid gap-4.5 lg:grid-cols-3">
                    <Card
                      title={t('timeline', lang)}
                      subtitle={
                        lang === 'bn'
                          ? 'সেন্টিনেল-২ উপগ্রহ ভিত্তিক বনের ক্যানোপি ও সময়ের ধারাবাহিক পরিবর্তন'
                          : 'Multi-temporal Sentinel-2 MSI canopy dynamics (10m RF)'
                      }
                      icon={<Activity className="size-4 text-[#16865f]" />}
                      className="lg:col-span-2"
                      right={
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Sentinel-2 RF
                        </span>
                      }
                    >
                      <TimelineChart bundle={b} lang={lang} />
                    </Card>
                    <Card
                      title={t('change', lang)}
                      subtitle={
                        lang === 'bn'
                          ? `${b.request.startDate.slice(0, 4)} থেকে ${b.request.endDate.slice(0, 4)} সময়কালের বৃদ্ধি ও ক্ষয়ের পরিমাপ`
                          : `Canopy expansion vs retreat (${b.request.startDate.slice(0, 4)} – ${b.request.endDate.slice(0, 4)})`
                      }
                      icon={<TrendingUp className="size-4 text-[#16865f]" />}
                      right={
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border shadow-2xs',
                            b.change.netChangeHa >= 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200',
                          )}
                        >
                          {signed(b.change.netChangeHa, 1, lang)} ha
                        </span>
                      }
                    >
                      <ChangeBreakdown bundle={b} lang={lang} />
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card
                      title={t('scenarios', lang)}
                      className="lg:col-span-2"
                      right={
                        <div className="flex overflow-hidden rounded-lg border border-[#d6e6de] font-mono text-[11px] font-bold">
                          {(['area', 'carbon'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setScenarioMetric(m)}
                              className={cn(
                                'px-2.5 py-1 transition-colors cursor-pointer',
                                scenarioMetric === m ? 'bg-[#123c37] text-white' : 'bg-white text-[#123f38] hover:bg-[#f2f6f3]'
                              )}
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

            {/* Scientific Attribution & Footer */}
            <div className="border-t border-[#d6e6de]/70 pt-6 pb-8 text-center text-xs text-[#6c817a] space-y-1">
              <p>
                {bn
                  ? 'MangroveLens — রিমোট সেন্সিং ও পরিবেশগত নজরদারির উদ্দেশ্যে প্রণীত।'
                  : 'MangroveLens — Designed for scientific research and community stewardship.'}
              </p>
              <p className="font-mono text-[11px] text-[#8aa39b]">
                {b.dataSource.modelVersion} · Sentinel-2 MSI · IPCC Tier 1 Guidelines
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Discrete Back-to-Top Floating Button */}
      {scrollY > 400 && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-[1000] flex size-10 items-center justify-center rounded-xl bg-white border border-[#cbe0d5] text-[#123f38] shadow-md hover:bg-[#edf7f2] hover:border-[#16865f] transition-all cursor-pointer print:hidden"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="size-4" />
        </button>
      )}

      {/* System guide popup (opened from the header "How it works" button) */}
      <ProjectTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        lang={lang}
        bundle={bundle}
        caps={caps}
        onJump={(id) => {
          setTourOpen(false)
          setTimeout(() => scrollToSection(id), 80)
        }}
        onTry={(place: TryPlace) => {
          setTourOpen(false)
          const next: AnalysisParams = { ...params, lat: place.lat, lon: place.lon, startDate: place.startDate, endDate: place.endDate, windowDays: 90 }
          setParams(next)
          run(next)
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80)
        }}
      />

      {/* Official Generated Report Modal View */}
      {showReportModal && bundle && (
        <ReportModal
          bundle={bundle}
          params={params}
          lang={lang}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  )
}

