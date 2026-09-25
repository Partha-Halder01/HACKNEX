import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Loader2, MapPin, Play, Satellite } from 'lucide-react'
import { Logo } from '../common/Logo'
import { AnalysisApi } from '../../services/analysis'
import type { AnalysisBundle, AnalysisParams, Capabilities } from '../../types/analysis'
import { LocationMap } from './LocationMap'
import { CarbonPanel, ChangeBreakdown, ScenarioChart, ScenarioTable, TimelineChart } from './charts'
import { AccuracyPanel, FieldCheckForm, MethodPanel, NarrativePanel } from './panels'
import { Badge, Card, Kpi, fmt, signed, t, type Lang } from './ui'

const PRESETS = [
  { name: 'Gosaba', nameBn: 'গোসাবা', lat: 22.165, lon: 88.805 },
  { name: 'Satjelia', nameBn: 'সাতজেলিয়া', lat: 22.08, lon: 88.87 },
  { name: 'Sajnekhali', nameBn: 'সজনেখালি', lat: 22.12, lon: 88.83 },
]

const FALLBACK_DEFAULTS: AnalysisParams = {
  lat: 22.165,
  lon: 88.805,
  radiusKm: 3,
  startDate: '2020-01-01',
  endDate: '2025-03-31',
  windowDays: 90,
  language: 'en',
  useAi: false,
}

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
  const [scenarioMetric, setScenarioMetric] = useState<'area' | 'carbon'>('area')
  const runSeq = useRef(0)
  const lang: Lang = params.language

  const set = <K extends keyof AnalysisParams>(k: K, v: AnalysisParams[K]) => setParams((p) => ({ ...p, [k]: v }))

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

  // Load capabilities, apply server defaults (unless the URL pinned values), then run once.
  useEffect(() => {
    const fromUrl = paramsFromUrl()
    AnalysisApi.capabilities()
      .then((c) => {
        setCaps(c)
        const merged: AnalysisParams = {
          ...FALLBACK_DEFAULTS,
          lat: c.defaults.lat,
          lon: c.defaults.lon,
          radiusKm: c.defaults.radiusKm,
          startDate: c.defaults.startDate,
          endDate: c.defaults.endDate,
          windowDays: c.defaults.windowDays,
          ...fromUrl,
        }
        setParams(merged)
        run(merged)
      })
      .catch((e) => {
        setError((e as Error).message)
      })
  }, [run])

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
    'w-full rounded-lg border border-[#d6e6de] bg-white px-2.5 py-1.5 text-sm text-[#123f38] focus:border-[#16865f] focus:outline-none'

  const b = bundle
  return (
    <div className={`min-h-screen bg-[#f4f8f5] ${lang === 'bn' ? 'font-bengali' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-[1000] border-b border-[#d6e6de] bg-white/95 backdrop-blur print:static">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={goHome} className="print:hidden" aria-label={t('home', lang)}>
            <ArrowLeft className="size-4 text-[#6c817a]" />
          </button>
          <Logo onClick={goHome} />
          <h1 className="hidden text-sm font-bold text-[#123f38] md:block">{t('title', lang)}</h1>
          <div className="ml-auto flex items-center gap-2">
            {caps && (
              <Badge tone={caps.liveEngine ? 'live' : 'demo'}>
                <Satellite className="size-3" />
                {caps.liveEngine ? (lang === 'bn' ? 'লাইভ উপগ্রহ তথ্য' : 'Live satellite engine') : lang === 'bn' ? 'ডেমো মোড' : 'Demo mode'}
              </Badge>
            )}
            <div className="flex overflow-hidden rounded-lg border border-[#d6e6de] text-xs font-bold print:hidden">
              {(['en', 'bn'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set('language', l)}
                  className={`px-2.5 py-1 ${lang === l ? 'bg-[#16865f] text-white' : 'bg-white text-[#123f38]'}`}
                >
                  {l === 'en' ? 'EN' : 'বাংলা'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <p className="text-sm text-[#6c817a] print:hidden">{t('subtitle', lang)}</p>

        {/* Map + controls */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px] print:block">
          <LocationMap
            lat={params.lat}
            lon={params.lon}
            radiusKm={params.radiusKm}
            onPick={(lat, lon) => setParams((p) => ({ ...p, lat, lon }))}
            bundle={bundle}
            lang={lang}
          />
          <Card className="print:hidden">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                run(params)
              }}
            >
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-bold text-[#123f38]">
                  <MapPin className="size-3.5" /> {t('location', lang)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={input}
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={params.lat}
                    onChange={(e) => set('lat', Number(e.target.value))}
                    aria-label="Latitude"
                  />
                  <input
                    className={input}
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={params.lon}
                    onChange={(e) => set('lon', Number(e.target.value))}
                    aria-label="Longitude"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-[#6c817a]">{t('presets', lang)}:</span>
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setParams((prev) => ({ ...prev, lat: p.lat, lon: p.lon }))}
                      className="rounded-full border border-[#d6e6de] px-2 py-0.5 text-[11px] font-semibold text-[#16865f] hover:bg-[#e7f4ec]"
                    >
                      {lang === 'bn' ? p.nameBn : p.name}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="flex justify-between text-xs font-bold text-[#123f38]">
                  {t('radius', lang)}
                  <span className="font-tabular text-[#16865f]">
                    {fmt(params.radiusKm, 1, lang)} km · {fmt(Math.PI * params.radiusKm ** 2 * 100, 0, lang)} ha
                  </span>
                </span>
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
                  <span className="text-xs font-bold text-[#123f38]">{t('startDate', lang)}</span>
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
                  <span className="text-xs font-bold text-[#123f38]">{t('endDate', lang)}</span>
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
                <span className="text-xs font-bold text-[#123f38]">{t('window', lang)}</span>
                <select className={input} value={params.windowDays} onChange={(e) => set('windowDays', Number(e.target.value))}>
                  {[30, 60, 90, 120, 180].map((d) => (
                    <option key={d} value={d}>
                      {lang === 'bn' ? `${fmt(d, 0, lang)} দিন` : `${d} days`}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-[#6c817a]">
                  {lang === 'bn'
                    ? 'শুরুর তারিখের পরের ও শেষ তারিখের আগের এই কয়দিনের মেঘমুক্ত ছবি মেলানো হয়।'
                    : 'Cloud-free images this many days after the start date and before the end date are combined.'}
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#123f38]">
                <input
                  type="checkbox"
                  checked={params.useAi}
                  disabled={caps ? !caps.geminiConfigured : false}
                  onChange={(e) => set('useAi', e.target.checked)}
                />
                {t('useAi', lang)}
                {caps && !caps.geminiConfigured && <span className="text-[#6c817a]">({lang === 'bn' ? 'কী নেই' : 'no key'})</span>}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16865f] px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-[#0f6e4d] disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {loading ? t('running', lang) : t('run', lang)}
              </button>
              {stale && !loading && (
                <p className="text-center text-[11px] font-semibold text-[#d97706]">
                  {lang === 'bn' ? 'সেটিং বদলেছে — নতুন ফলের জন্য আবার চালান।' : 'Settings changed — run again to update results.'}
                </p>
              )}
              {caps && <p className="text-[11px] leading-snug text-[#6c817a]">{caps.engineMessage}</p>}
            </form>
          </Card>
        </div>

        {/* Status */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#991b1b]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}
        {loading && caps?.liveEngine && (
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm text-[#1e40af]">
            {lang === 'bn'
              ? 'আর্থ ইঞ্জিনে মডেল প্রশিক্ষণ ও ছবি বিশ্লেষণ চলছে — এক-দুই মিনিট লাগতে পারে।'
              : 'Training the classifier and processing imagery on Earth Engine — this can take a minute or two.'}
          </div>
        )}
        {b && !b.dataSource.isRealData && (
          <div className="flex items-start gap-2 rounded-xl border border-[#fcd34d] bg-[#fffbeb] p-3 text-sm text-[#92400e]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>{lang === 'bn' ? 'ডেমো তথ্য। ' : 'Demo data. '}</b>
              {lang === 'bn'
                ? 'আর্থ ইঞ্জিন যুক্ত নেই, তাই সংখ্যাগুলি অবস্থান-ভিত্তিক কৃত্রিম মান — সব হিসাব ও চার্ট কীভাবে কাজ করে তা দেখায়, এগুলি পরিমাপ নয়।'
                : 'Earth Engine is not connected, so values are synthetic and location-seeded. Every calculation and chart runs as it will on real data, but these are not measurements.'}
            </span>
          </div>
        )}
        {b && b.warnings.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-xs text-[#92400e]">
            {b.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        )}

        {!b && !loading && !error && (
          <Card>
            <p className="py-8 text-center text-sm text-[#6c817a]">{t('empty', lang)}</p>
          </Card>
        )}

        {b && (
          <div className={`space-y-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi
                label={t('mangroveStart', lang)}
                value={fmt(b.summary.start.mangroveHa, 1, lang)}
                unit="ha"
                detail={`${fmt(b.summary.start.mangrovePct, 1, lang)}% · ${b.request.startDate}`}
                tone="neutral"
              />
              <Kpi
                label={t('mangroveEnd', lang)}
                value={fmt(b.summary.end.mangroveHa, 1, lang)}
                unit="ha"
                detail={`${fmt(b.summary.end.mangrovePct, 1, lang)}% · ${b.request.endDate}`}
                tone="neutral"
              />
              <Kpi
                label={t('netChange', lang)}
                value={signed(b.change.netChangeHa, 1, lang)}
                unit="ha"
                detail={`+${fmt(b.change.gainHa, 1, lang)} / −${fmt(b.change.lossHa, 1, lang)} ha`}
                tone={b.change.netChangeHa < 0 ? 'red' : 'green'}
              />
              <Kpi
                label={t('carbonStock', lang)}
                value={fmt(b.carbon.end.carbonMgC, 0, lang)}
                unit="Mg C"
                detail={`±${fmt(b.carbon.end.uncertaintyPct, 1, lang)}% · ${fmt(b.carbon.end.co2eMg, 0, lang)} Mg CO₂e`}
                tone="blue"
              />
              <Kpi
                label={t('co2Change', lang)}
                value={signed(b.carbon.change.co2eChangeMg, 0, lang)}
                unit="Mg"
                detail={`${signed(b.carbon.change.annualCo2eChangeMg, 0, lang)} Mg CO₂e / ${lang === 'bn' ? 'বছর' : 'yr'}`}
                tone={b.carbon.change.co2eChangeMg < 0 ? 'red' : 'green'}
              />
            </div>

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
                  <div className="flex overflow-hidden rounded-lg border border-[#d6e6de] text-[11px] font-bold print:hidden">
                    {(['area', 'carbon'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setScenarioMetric(m)}
                        className={`px-2 py-0.5 ${scenarioMetric === m ? 'bg-[#16865f] text-white' : 'bg-white text-[#123f38]'}`}
                      >
                        {m === 'area' ? (lang === 'bn' ? 'এলাকা' : 'Area') : lang === 'bn' ? 'কার্বন' : 'Carbon'}
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
              <Card
                title={t('explanation', lang)}
                right={<Badge tone={b.dataSource.isRealData ? 'live' : 'demo'}>{b.dataSource.label}</Badge>}
              >
                <NarrativePanel bundle={b} lang={lang} shareLink={urlFor({ ...params, ...b.request, language: lang, useAi: false })} />
              </Card>
              <Card title={t('accuracy', lang)}>
                <AccuracyPanel bundle={b} lang={lang} />
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t('method', lang)}>
                <MethodPanel bundle={b} lang={lang} />
              </Card>
              <Card title={t('fieldCheck', lang)} className="print:hidden">
                <FieldCheckForm lat={params.lat} lon={params.lon} analysisId={b.analysisId} lang={lang} />
              </Card>
            </div>

            <p className="pb-6 text-center text-[11px] text-[#6c817a]">
              {b.analysisId} · {new Date(b.generatedAt).toLocaleString()} · {b.dataSource.modelVersion}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
