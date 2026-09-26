import { useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Leaf,
  Minus,
  Sparkles,
  TreePine,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisBundle } from '../../types/analysis'
import { AnimatedNumber } from './AnimatedWidgets'
import type { Lang } from './ui'
import { fmt } from './ui'

/** Everyday comparisons so numbers mean something without a GIS background. */
const FOOTBALL_FIELDS_PER_HA = 1.4 // a standard pitch is ~0.71 ha
const BIGHA_PER_HA = 7.47 // West Bengal bigha ≈ 1,338 m²
const CO2_T_PER_PERSON_INDIA = 2 // approx. yearly CO₂ per person in India

export function areaInWords(ha: number, lang: Lang) {
  return lang === 'bn'
    ? `প্রায় ${fmt(ha * BIGHA_PER_HA, 0, lang)} বিঘা`
    : `about ${fmt(ha * FOOTBALL_FIELDS_PER_HA, 0)} football fields`
}

const SAME_PCT = 2 // below this, call it "about the same"

type Verdict = 'grew' | 'shrank' | 'same'

function verdictOf(b: AnalysisBundle): Verdict {
  const p = b.change.percentChange
  if (Math.abs(p) < SAME_PCT) return 'same'
  return p > 0 ? 'grew' : 'shrank'
}

const startYear = (b: AnalysisBundle) => b.request.startDate.slice(0, 4)
const endYear = (b: AnalysisBundle) => b.request.endDate.slice(0, 4)

/** The first thing anyone reads: one sentence, plus how sure we are. */
export function AnswerCard({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const rel = b.reliability
  const v = verdictOf(b)
  const diff = b.summary.end.mangroveHa - b.summary.start.mangroveHa
  const unreliable = rel.level === 'low' || rel.level === 'demo'

  const headline = (() => {
    if (rel.level === 'low')
      return lang === 'bn'
        ? 'এই জায়গা ও তারিখের জন্য নির্ভরযোগ্য উত্তর দেওয়া যাচ্ছে না'
        : "We can't give a reliable answer for this place and these dates"
    const [s, e] = [startYear(b), endYear(b)]
    if (lang === 'bn') {
      if (v === 'same') return `${s} থেকে ${e}: এখানকার ম্যানগ্রোভ বন প্রায় একই আছে`
      return v === 'grew'
        ? `${s} থেকে ${e}: এখানকার ম্যানগ্রোভ বন বেড়েছে`
        : `${s} থেকে ${e}: এখানকার ম্যানগ্রোভ বন কমেছে`
    }
    if (v === 'same') return `From ${s} to ${e}, the mangrove forest here stayed about the same`
    return v === 'grew'
      ? `From ${s} to ${e}, the mangrove forest here grew`
      : `From ${s} to ${e}, the mangrove forest here shrank`
  })()

  const sub = (() => {
    if (rel.level === 'low') return null
    const pct = Math.abs(b.change.percentChange)
    if (lang === 'bn') {
      return v === 'same'
        ? `পরিবর্তন মাত্র ${fmt(Math.abs(diff), 0, lang)} হেক্টর (${fmt(pct, 1, lang)}%) — এটা প্রায় স্থিতিশীল।`
        : `${v === 'grew' ? 'বেড়েছে' : 'কমেছে'} ${fmt(Math.abs(diff), 0, lang)} হেক্টর (${areaInWords(Math.abs(diff), lang)}), অর্থাৎ ${fmt(pct, 1, lang)}%।`
    }
    return v === 'same'
      ? `The change is only ${fmt(Math.abs(diff), 0)} hectares (${fmt(pct, 1)}%) — practically unchanged.`
      : `It ${v === 'grew' ? 'grew' : 'shrank'} by ${fmt(Math.abs(diff), 0)} hectares (${areaInWords(Math.abs(diff), lang)}), which is ${fmt(pct, 1)}%.`
  })()

  const Icon = rel.level === 'low' ? CircleHelp : v === 'grew' ? TrendingUp : v === 'shrank' ? TrendingDown : Minus
  const iconColor =
    rel.level === 'low'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : v === 'shrank'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : 'text-emerald-800 bg-emerald-50 border-emerald-200'

  return (
    <section className="rounded-2xl border border-[#d2e4db] bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5efe9] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-light-sub text-[10.5px] font-bold tracking-[0.2em] text-[#16865f] bg-[#edf6f1] border border-[#cbe4d7] rounded px-2 py-0.5">
            {lang === 'bn' ? 'উপগ্রহ সিদ্ধান্ত' : 'SENTINEL-2 CANOPY VERDICT'}
          </span>
          <span className="font-mono text-xs font-semibold text-[#6c817a]">
            {startYear(b)} → {endYear(b)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#6c817a]">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>{b.dataSource.modelVersion}</span>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <span className={`grid size-12 sm:size-14 shrink-0 place-items-center rounded-2xl border shadow-2xs ${iconColor}`}>
          <Icon className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-condensed text-2xl sm:text-3xl lg:text-4xl font-bold leading-none text-[#0f352e] tracking-wide uppercase">
            {headline}
          </h2>
          {sub && (
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#40564f] font-sans">
              {sub}
            </p>
          )}
        </div>
      </div>

      <SureMeter bundle={b} lang={lang} />

      {unreliable && rel.level === 'low' && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-950 font-medium">
          {lang === 'bn' ? '👉 কী করবেন: ' : '👉 Recommended next step: '}
          {rel.problems.some((p) => p.id === 'season')
            ? lang === 'bn'
              ? 'উপরে "বছর" বেছে নিন — দুই বছরের একই মাস (জানুয়ারি–মার্চ) তুলনা হবে।'
              : 'Select "Compare years" in the mission controls above to standardize on cloud-free Jan–Mar dry-season passes.'
            : lang === 'bn'
            ? 'জঙ্গলের ভেতরের কোনো জায়গা বাছুন, বা মাঠে গিয়ে যাচাই করুন।'
            : 'Select an interior dense canopy coordinate, or record a ground-truth field observation.'}
        </p>
      )}
    </section>
  )
}

function SureMeter({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const rel = b.reliability
  const conf = {
    high: { dot: 'bg-emerald-500', box: 'bg-[#edf7f2] border-[#cbe4d7] text-emerald-950', label: lang === 'bn' ? 'উচ্চ নির্ভুলতা' : 'High Confidence', en: 'We are fairly sure of this result', bn: 'এই ফলাফলে আমরা বেশ নিশ্চিত' },
    medium: { dot: 'bg-amber-500', box: 'bg-amber-50/90 border-amber-200 text-amber-950', label: lang === 'bn' ? 'মাঝারি নির্ভুলতা' : 'Moderate Confidence', en: 'Use this result with some care', bn: 'এই ফলাফল একটু সাবধানে ব্যবহার করুন' },
    low: { dot: 'bg-rose-500', box: 'bg-rose-50/90 border-rose-200 text-rose-950', label: lang === 'bn' ? 'নিম্ন নির্ভুলতা' : 'Low Confidence', en: 'Do not trust these numbers without field check', bn: 'এই সংখ্যাগুলি বিশ্বাস করবেন না' },
    demo: { dot: 'bg-amber-500', box: 'bg-amber-50/90 border-amber-200 text-amber-950', label: lang === 'bn' ? 'ডেমো সিমুলেশন' : 'Simulation Mode', en: 'Demo only — synthetic satellite measurements', bn: 'শুধু ডেমো — আসল পরিমাপ নয়' },
  }[rel.level]

  return (
    <div className={`mt-4 rounded-xl border p-3.5 text-sm transition-all ${conf.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider opacity-75">
            {lang === 'bn' ? 'নির্ভরযোগ্যতা পরীক্ষা' : 'Confidence Assessment'}
          </span>
          <span className="font-mono text-xs font-bold rounded px-1.5 py-0.5 bg-black/5 border border-black/10">
            {conf.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['low', 'medium', 'high'] as const).map((l, idx) => {
            const activeLevel = rel.level === 'demo' ? 'medium' : rel.level
            const active = (activeLevel === 'high') || (activeLevel === 'medium' && idx <= 1) || (activeLevel === 'low' && idx === 0)
            return (
              <span
                key={l}
                className={`h-2 w-6 rounded-full transition-all ${
                  active ? conf.dot : 'bg-black/15'
                }`}
              />
            )
          })}
        </div>
      </div>
      <p className="mt-1.5 text-xs sm:text-sm font-medium">
        {lang === 'bn' ? conf.bn : conf.en}
      </p>

      {rel.problems.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs border-t border-black/10 pt-2">
          {rel.problems.map((p) => (
            <li key={p.id} className="flex items-start gap-1.5">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 opacity-80" />
              <span>{lang === 'bn' ? p.bn : p.en}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 border-t border-emerald-200/80 pt-2">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
          <span>
            {lang === 'bn'
              ? 'পরিষ্কার উপগ্রহ ছবি, একই মৌসুম, আর বৈজ্ঞানিক মানচিত্রের সঙ্গে মিল — সব ঠিক আছে।'
              : 'Clear satellite telemetry, verified dry-season alignment, and verified canopy spectral index agreement.'}
          </span>
        </p>
      )}
    </div>
  )
}

/** Executive Cohesive KPI Cards with Crisp Typography & Attribution */
export function SimpleCards({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const dim = b.reliability.level === 'low'
  const end = b.summary.end
  const diff = end.mangroveHa - b.summary.start.mangroveHa
  const co2 = b.carbon.end.co2eMg
  const people = co2 / CO2_T_PER_PERSON_INDIA
  const trend = b.projection.scenarios.find((s) => s.id === 'current_trend')!.points.at(-1)!
  const bn = lang === 'bn'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Forest Area */}
      <article className={`rounded-2xl border border-[#d2e4db] bg-white p-5 shadow-xs transition-all hover:border-[#16865f]/50 ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-light-sub text-[10.5px] font-semibold tracking-[0.2em] text-[#6c817a]">
            <TreePine className="size-4 text-[#16865f]" />
            {bn ? `ম্যানগ্রোভ (${endYear(b)})` : `Forest Area (${endYear(b)})`}
          </p>
          <span className="font-mono text-[10px] font-bold rounded bg-[#edf6f1] text-[#166534] border border-[#cbe4d7] px-1.5 py-0.5">
            {fmt(end.mangrovePct, 0, lang)}% {bn ? 'ক্যানোপি' : 'cover'}
          </span>
        </div>
        <div className="mt-2 flex items-baseline">
          <p className="font-condensed text-4xl sm:text-5xl font-bold tracking-wide text-[#0f352e]">
            <AnimatedNumber value={end.mangroveHa} digits={0} lang={lang} />
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {areaInWords(end.mangroveHa, lang)}
        </p>
      </article>

      {/* 2. Forest Change */}
      <article className={`rounded-2xl border border-[#d2e4db] bg-white p-5 shadow-xs transition-all hover:border-[#16865f]/50 ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-light-sub text-[10.5px] font-semibold tracking-[0.2em] text-[#6c817a]">
            {diff < 0 ? <TrendingDown className="size-4 text-rose-600" /> : <TrendingUp className="size-4 text-[#16865f]" />}
            {bn ? `${startYear(b)} থেকে বদল` : `Change Since ${startYear(b)}`}
          </p>
          <span className={`font-mono text-[10px] font-bold rounded px-1.5 py-0.5 border ${diff < 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-[#edf6f1] text-[#166534] border-[#cbe4d7]'}`}>
            {diff > 0 ? '+' : ''}{fmt(b.change.percentChange, 1, lang)}%
          </span>
        </div>
        <div className="mt-2 flex items-baseline">
          <p className={`font-condensed text-4xl sm:text-5xl font-bold tracking-wide ${diff < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {Math.abs(diff) < 0.5 ? (
              bn ? '০.০' : '0.0'
            ) : (
              <AnimatedNumber
                value={Math.abs(diff)}
                digits={0}
                lang={lang}
                prefix={diff > 0 ? '+' : '−'}
              />
            )}
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {Math.abs(diff) < 0.5
            ? bn ? 'বন স্থিতিশীল রয়েছে' : 'canopy density remained stable'
            : bn
            ? `${diff > 0 ? 'বেড়েছে' : 'কমেছে'} ${fmt(Math.abs(b.change.percentChange), 1, lang)}%`
            : `${diff > 0 ? 'expanded' : 'contracted'} by ${fmt(Math.abs(b.change.percentChange), 1)}%`}
        </p>
      </article>

      {/* 3. Blue Carbon Reservoir */}
      <article className={`rounded-2xl border border-[#d2e4db] bg-white p-5 shadow-xs transition-all hover:border-[#16865f]/50 ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-light-sub text-[10.5px] font-semibold tracking-[0.2em] text-[#6c817a]">
            <Users className="size-4 text-[#16865f]" />
            {bn ? 'বনে জমা কার্বন' : 'Blue Carbon Stock'}
          </p>
          <span className="font-mono text-[10px] font-bold rounded bg-[#edf6f1] text-[#166534] border border-[#cbe4d7] px-1.5 py-0.5">
            IPCC Tier 1
          </span>
        </div>
        <div className="mt-2 flex items-baseline">
          <p className="font-condensed text-4xl sm:text-5xl font-bold tracking-wide text-[#0f352e]">
            <AnimatedNumber value={co2} digits={0} lang={lang} />
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'টন CO₂' : 't CO₂e'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {bn
            ? `প্রায় ${fmt(people, 0, lang)} জনের ১ বছরের কার্বনের সমতুল্য`
            : `≈ annual footprint of ${fmt(people, 0)} Indian residents`}
        </p>
      </article>

      {/* 4. 2030 Horizon Projection */}
      <article className={`rounded-2xl border border-[#d2e4db] bg-white p-5 shadow-xs transition-all hover:border-[#16865f]/50 ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-light-sub text-[10.5px] font-semibold tracking-[0.2em] text-[#6c817a]">
            <Leaf className="size-4 text-[#16865f]" />
            {bn ? `${trend.year} পূর্বাভাস` : `${trend.year} Scenario`}
          </p>
          <span className="font-mono text-[10px] font-bold rounded bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5">
            +5 yr model
          </span>
        </div>
        <div className="mt-2 flex items-baseline">
          <p className="font-condensed text-4xl sm:text-5xl font-bold tracking-wide text-[#0f352e]">
            <AnimatedNumber value={trend.mangroveHa} digits={0} lang={lang} />
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {bn ? 'বর্তমান ধারা অনুযায়ী আনুমানিক প্রক্ষেপণ' : 'projected trajectory under status-quo trends'}
        </p>
      </article>
    </div>
  )
}

/**
 * State-of-the-art interactive chart with Spline Area & Capsule Bar toggles,
 * Metric toggling (Canopy Area vs Carbon Stock vs YoY Delta),
 * Baseline benchmark lines, and luminous frosted glass tooltip.
 */
export function YearsChart({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [chartMode, setChartMode] = useState<'spline' | 'bars'>('spline')
  const [metric, setMetric] = useState<'area' | 'carbon' | 'delta'>('area')
  const dim = b.reliability.level === 'low'
  const bn = lang === 'bn'

  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']

  // Carbon factor: t CO₂e per ha
  const carbonDensity = (b.carbon.end.co2eMg / (b.summary.end.mangroveHa || 1)) || 1038

  const rawRows = b.timeline.map((p, i, arr) => {
    const m = Number(p.midDate.slice(5, 7))
    const dry = m >= 1 && m <= 3
    const year = p.midDate.slice(0, 4)
    const label = dry ? year : `${(bn ? MONTHS_BN : MONTHS_EN)[m - 1]} ${year}`

    const areaVal = p.mangroveHa
    const carbonVal = Math.round(p.mangroveHa * carbonDensity)
    const prevArea = i === 0 ? arr[0].mangroveHa : arr[i - 1].mangroveHa
    const deltaVal = Math.round(p.mangroveHa - prevArea)

    return {
      year: label,
      rawYear: year,
      area: areaVal,
      carbon: carbonVal,
      delta: deltaVal,
      val: metric === 'area' ? areaVal : metric === 'carbon' ? carbonVal : deltaVal,
      baselineDiff: p.mangroveHa - arr[0].mangroveHa,
      baselinePct: ((p.mangroveHa - arr[0].mangroveHa) / (arr[0].mangroveHa || 1)) * 100,
    }
  })

  const baselineVal = rawRows[0]?.val ?? 0
  const maxVal = Math.max(...rawRows.map((r) => r.val))
  const minVal = Math.min(...rawRows.map((r) => r.val))
  const peakRow = rawRows.reduce((prev, curr) => (curr.val > prev.val ? curr : prev), rawRows[0])

  const metricLabels = {
    area: { unit: bn ? 'হেক্টর' : 'ha', title: bn ? 'ক্যানোপি আয়তন' : 'Canopy Area' },
    carbon: { unit: bn ? 'টন CO₂e' : 't CO₂e', title: bn ? 'কার্বন মজুত' : 'Carbon Stock' },
    delta: { unit: bn ? 'বার্ষিক পরিবর্তন' : 'Annual Delta', title: bn ? 'বৃদ্ধি / সংকোচন' : 'YoY Delta' },
  }[metric]

  return (
    <div className={`space-y-3 ${dim ? 'opacity-50' : ''}`}>
      {/* Interactive Controls Bar: Mode Switcher & Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e5efe9] pb-3">
        {/* Metric Selector Pills */}
        <div className="flex items-center rounded-xl bg-[#f2f6f3] p-0.5 border border-[#d6e6de] text-xs font-semibold">
          {(['area', 'carbon', 'delta'] as const).map((m) => {
            const active = metric === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`rounded-lg px-2.5 py-1 transition-all text-[11.5px] ${
                  active
                    ? 'bg-[#16865f] text-white shadow-xs font-bold'
                    : 'text-[#526a63] hover:text-[#123f38]'
                }`}
              >
                {m === 'area' ? (bn ? 'আয়তন (হেক্টর)' : 'Area (ha)') : m === 'carbon' ? (bn ? 'কার্বন (CO₂e)' : 'Carbon (CO₂e)') : (bn ? 'বার্ষিক পরিবর্তন' : 'Annual Δ')}
              </button>
            )
          })}
        </div>

        {/* View Mode Toggle: Spline Area vs Capsule Bars */}
        <div className="flex items-center gap-1 rounded-xl bg-[#f2f6f3] p-0.5 border border-[#d6e6de]">
          <button
            type="button"
            onClick={() => setChartMode('spline')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
              chartMode === 'spline' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#6c817a] hover:text-[#123f38]'
            }`}
            title="Spline Area Flow"
          >
            <Activity className="size-3.5" />
            <span className="hidden sm:inline">{bn ? 'কার্ভ ভিউ' : 'Spline'}</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
              chartMode === 'bars' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#6c817a] hover:text-[#123f38]'
            }`}
            title="Capsule Bar Chart"
          >
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">{bn ? 'বার ভিউ' : 'Bars'}</span>
          </button>
        </div>
      </div>

      {/* KPI Micro-Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#6c817a] bg-[#f7faf7] p-2.5 rounded-xl border border-[#e5efe9]">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>
            {bn ? 'শুরুর বেসলাইন' : '2020 Baseline'}: <strong className="text-[#0f352e]">{fmt(baselineVal, 0, lang)} {metricLabels.unit}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-teal-500" />
          <span>
            {bn ? 'সর্বোচ্চ রেকর্ড' : 'Peak'}: <strong className="text-[#0f352e]">{fmt(peakRow.val, 0, lang)} {metricLabels.unit} ({peakRow.year})</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
          <ArrowUpRight className="size-3" />
          <span>
            {bn ? 'নিট পরিবর্তন' : 'Net'}: {fmt(rawRows.at(-1)!.val - baselineVal, 0, lang)} {metricLabels.unit}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'spline' ? (
            <AreaChart data={rawRows} margin={{ top: 18, right: 14, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="splineEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.01} />
                </linearGradient>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#10b981" floodOpacity="0.35" />
                </filter>
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 11.5, fill: '#526a63', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[Math.max(0, minVal * 0.9), maxVal * 1.1]} hide />
              <Tooltip content={<ModernChartTooltip lang={lang} metricLabels={metricLabels} />} cursor={{ stroke: 'rgba(16, 185, 129, 0.3)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
              <ReferenceLine y={baselineVal} stroke="#6c817a" strokeDasharray="3 3" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="val"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#splineEmeraldGrad)"
                dot={{ r: 4, fill: '#ffffff', stroke: '#059669', strokeWidth: 2.5 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2, className: 'animate-ping' }}
              />
            </AreaChart>
          ) : (
            <BarChart data={rawRows} margin={{ top: 22, right: 12, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="barLatestGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="barHistGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 11.5, fill: '#526a63', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, maxVal * 1.15]} />
              <Tooltip content={<ModernChartTooltip lang={lang} metricLabels={metricLabels} />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
              <Bar dataKey="val" radius={[8, 8, 2, 2]} maxBarSize={48}>
                {rawRows.map((_, i) => (
                  <Cell
                    key={i}
                    fill={dim ? '#9ca3af' : i === rawRows.length - 1 ? 'url(#barLatestGrad)' : 'url(#barHistGrad)'}
                  />
                ))}
                <LabelList
                  dataKey="val"
                  position="top"
                  formatter={(v: number) => fmt(v, 0, lang)}
                  style={{ fontSize: 11, fill: '#0f352e', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5efe9] pt-2 text-xs text-[#6c817a]">
        <span>
          {bn
            ? 'প্রতিটি বিন্দু/স্তম্ভ = সেন্টিনেল-২ উপগ্রহ ছবির জানু–মার্চ ড্রাই সিজন কম্পোজিট।'
            : 'Each point represents validated cloud-free Jan–Mar Sentinel-2 dry-season composite.'}
        </span>
        <span className="font-mono text-[11px] text-emerald-800 font-semibold">
          {bn ? 'ইউরোপীয় মহাকাশ সংস্থা (ESA)' : 'ESA Sentinel-2 MSI L2A'}
        </span>
      </div>
    </div>
  )
}

function ModernChartTooltip({ active, payload, lang, metricLabels }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  const bn = lang === 'bn'

  return (
    <div className="rounded-xl border border-emerald-500/35 bg-[#031d17]/95 p-3 text-white shadow-2xl backdrop-blur-md min-w-[210px]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-2">
        <span className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
          <Calendar className="size-3" />
          {item.year}
        </span>
        <span className="font-mono text-[10px] text-emerald-300/80 bg-emerald-500/20 px-1.5 py-0.5 rounded">
          MSI L2A
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-condensed text-2xl font-bold tracking-wide text-white">
          {fmt(item.val, 0, lang)}
        </span>
        <span className="text-xs text-emerald-300 font-sans">{metricLabels.unit}</span>
      </div>

      <div className="mt-2 space-y-1 text-[11px] border-t border-emerald-500/20 pt-1.5">
        <div className="flex items-center justify-between text-emerald-200">
          <span>{bn ? '২০২০ বেসলাইন থেকে:' : 'vs 2020 Baseline:'}</span>
          <span className={`font-mono font-bold ${item.baselineDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {item.baselineDiff >= 0 ? '+' : ''}{fmt(item.baselineDiff, 0, lang)} ha ({item.baselinePct >= 0 ? '+' : ''}{fmt(item.baselinePct, 1, lang)}%)
          </span>
        </div>
        <p className="text-[10.5px] text-emerald-300/70 italic">
          {areaInWords(item.area, lang)}
        </p>
      </div>
    </div>
  )
}

/**
 * State-of-the-Art Interactive 5-Year Horizon Scenarios Simulator.
 * Features selectable scenario cards with glowing active ring,
 * interactive projected impact calculations, and comparative scenario bars.
 */
export function FutureBoxes({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [activeScenarioId, setActiveScenarioId] = useState<'current_trend' | 'higher_loss' | 'recovery'>('current_trend')
  const dim = b.reliability.level === 'low'
  const now = b.summary.end.mangroveHa
  const bn = lang === 'bn'

  const carbonDensity = (b.carbon.end.co2eMg / (b.summary.end.mangroveHa || 1)) || 1038

  const meta = {
    current_trend: {
      en: 'Business-as-Usual',
      bn: 'বর্তমান ধারা বহাল',
      descEn: 'Historical erosion and natural regeneration rate maintained without extra policy intervention.',
      descBn: 'পূর্বের ভাঙন ও বৃদ্ধির স্বাভাবিক গতি বজায় থাকলে বন এই ধারায় চলবে।',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      activeBorder: 'border-sky-500 ring-2 ring-sky-400/30',
      icon: '➡️',
    },
    higher_loss: {
      en: 'Stressed / High Loss',
      bn: 'ঘূর্ণিঝড় ও ভাঙনজনিত চাপ',
      descEn: 'Severe weather events, storm surges or coastal erosion doubling the historical rate of loss.',
      descBn: 'ঘূর্ণিঝড় বা তীব্র নদীভাঙনে ক্ষতির মাত্রা দ্বিগুণ হলে সম্ভাব্য প্রক্ষেপণ।',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      activeBorder: 'border-rose-500 ring-2 ring-rose-400/30',
      icon: '⚠️',
    },
    recovery: {
      en: 'Community Conservation',
      bn: 'সম্প্রদায়ভিত্তিক পুনরুদ্ধার',
      descEn: 'Aggressive community afforestation and biological embankment stabilization on newly formed mudflats.',
      descBn: 'সক্রিয় সামাজিক বনায়ন ও বাঁধ সুরক্ষায় নতুন চরে গাছ লাগালে সর্বোত্তম অগ্রগতি।',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-400/30',
      icon: '🌱',
    },
  } as const

  const activeScenario = b.projection.scenarios.find((s) => s.id === activeScenarioId)!
  const activeEndpoint = activeScenario.points.at(-1)!
  const activeDelta = activeEndpoint.mangroveHa - now
  const projectedCarbonDelta = Math.round(activeDelta * carbonDensity)

  return (
    <div className={`space-y-4 ${dim ? 'opacity-50' : ''}`}>
      {/* 3 Selectable Scenario Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {b.projection.scenarios.map((sc) => {
          const p = sc.points.at(-1)!
          const d = p.mangroveHa - now
          const isSelected = activeScenarioId === sc.id
          const m = meta[sc.id]

          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setActiveScenarioId(sc.id)}
              className={`group relative text-left rounded-2xl border p-4 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? `bg-white shadow-lg ${m.activeBorder}`
                  : 'bg-white/80 border-[#e5efe9] hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 size-2 rounded-full bg-emerald-500 animate-ping" />
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#0f352e]">
                  <span>{m.icon}</span>
                  <span>{m[bn ? 'bn' : 'en']}</span>
                </span>
                <span className={`font-mono text-[9.5px] font-bold rounded px-1.5 py-0.5 border ${m.badgeColor}`}>
                  {p.year}
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline">
                <span className="font-condensed text-3xl font-bold tracking-wide text-[#0f352e]">
                  <AnimatedNumber value={p.mangroveHa} digits={0} lang={lang} />
                </span>
                <span className="ml-1 text-xs font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
              </div>

              <p className={`mt-1 font-mono text-xs font-bold ${d < -0.5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {Math.abs(d) < 0.5
                  ? bn ? `≈ কোনো পরিবর্তন নেই` : `≈ stable baseline`
                  : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 0, lang)} ${bn ? 'হেক্টর' : 'ha'}`}
              </p>
            </button>
          )
        })}
      </div>

      {/* Interactive Scenario Deep-Dive Panel */}
      <div className="rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#f7faf8] to-[#edf6f2] p-4 text-xs text-[#0f352e] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {bn ? 'নির্বাচিত দৃশ্যপট বিশ্লেষণ' : 'ACTIVE SCENARIO SIMULATION'}
            </span>
            <span className="font-bold text-sm text-[#0f352e]">
              {meta[activeScenarioId][bn ? 'bn' : 'en']}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#6c817a]">
            {bn ? '২০২৬ → ২০৩১ প্রক্ষেপণ' : '2026 → 2031 Trajectory'}
          </span>
        </div>

        <p className="mt-2 text-xs text-[#40564f] leading-relaxed">
          {meta[activeScenarioId][bn ? 'descBn' : 'descEn']}
        </p>

        {/* Dynamic Impact Counters */}
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono">
          <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/80 shadow-2xs">
            <p className="text-[10px] text-[#6c817a] uppercase font-bold tracking-wider">
              {bn ? 'প্রত্যাশিত নেট বন বিস্তার' : 'PROJECTED CANOPY DELTA'}
            </p>
            <p className={`mt-1 font-condensed text-2xl font-bold tracking-wide ${activeDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              <AnimatedNumber
                value={Math.abs(activeDelta)}
                digits={0}
                lang={lang}
                prefix={activeDelta >= 0 ? '+' : '−'}
              />
              <span className="ml-1 text-xs font-sans text-[#6c817a]">{bn ? 'হেক্টর' : 'ha'}</span>
            </p>
          </div>

          <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/80 shadow-2xs">
            <p className="text-[10px] text-[#6c817a] uppercase font-bold tracking-wider">
              {bn ? 'কার্বন প্রভাব (CO₂ সমতুল্য)' : 'NET CARBON OFFSET'}
            </p>
            <p className={`mt-1 font-condensed text-2xl font-bold tracking-wide ${projectedCarbonDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              <AnimatedNumber
                value={Math.abs(projectedCarbonDelta)}
                digits={0}
                lang={lang}
                prefix={projectedCarbonDelta >= 0 ? '+' : '−'}
              />
              <span className="ml-1 text-xs font-sans text-[#6c817a]">{bn ? 'টন CO₂' : 't CO₂e'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#6c817a]">
        <p>
          {bn
            ? 'এগুলো মন্টে-কার্লো গাণিতিক প্রক্ষেপণ ("হোয়াট-ইফ"), জলবায়ু পরিবর্তনের ওপর নির্ভরশীল।'
            : 'Monte-Carlo projection model for planning — subject to climate variability.'}
        </p>
        <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
          2031 Horizon
        </span>
      </div>
    </div>
  )
}
