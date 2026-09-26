import { useState } from 'react'
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Info,
  Leaf,
  Minus,
  Satellite,
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
  CartesianGrid,
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
import { CK, GlowDefs, makeDot } from './chartKit'
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
  const diff = b.change.netChangeHa
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
              ? 'সব স্বয়ংক্রিয় যাচাই পাস: যথেষ্ট মেঘমুক্ত ছবি, দুই সময়ের মৌসুম মেলে, আলাদা ম্যানগ্রোভ মানচিত্রের সঙ্গে আয়তন মেলে, আর না-দেখা বছরে মডেল ভালো করেছে।'
              : 'All automatic checks passed: enough clear photos, matching seasons, area agrees with an independent mangrove map, and the model scored well on a year it had not seen.'}
          </span>
        </p>
      )}
    </div>
  )
}

/** Round to `sig` significant figures: carbon is a Tier 1 estimate, so no false precision. */
const roundSig = (v: number, sig = 2) => {
  if (!v) return 0
  const m = 10 ** (Math.floor(Math.log10(Math.abs(v))) - sig + 1)
  return Math.round(v / m) * m
}

/** Compact number: "740k" / "1.2M" in English, "৭.৪ লাখ" / "১.২ কোটি" in Bengali. */
function compact(v: number, lang: Lang) {
  const r = roundSig(v)
  if (lang === 'bn') {
    if (r >= 1e7) return `${fmt(r / 1e7, r >= 1e8 ? 0 : 1, lang)} কোটি`
    if (r >= 1e5) return `${fmt(r / 1e5, r >= 1e6 ? 0 : 1, lang)} লাখ`
    return fmt(r, 0, lang)
  }
  if (r >= 1e6) return `${fmt(r / 1e6, r >= 1e7 ? 0 : 1)}M`
  if (r >= 1e3) return `${fmt(r / 1e3, 0)}k`
  return fmt(r, 0)
}

/** Executive Cohesive KPI Cards with Crisp Typography & Attribution */
export function SimpleCards({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const dim = b.reliability.level === 'low'
  const end = b.summary.end
  const diff = b.change.netChangeHa
  const co2 = b.carbon.end.co2eMg
  const [co2Low, co2High] = b.carbon.end.co2eRangeMg
  const co2Unc = b.carbon.end.uncertaintyPct
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
        {/* Shown as a range: IPCC Tier 1 averages carry about ±18% uncertainty. */}
        <div className="mt-2 flex flex-wrap items-baseline" title={`${fmt(co2Low, 0, lang)} – ${fmt(co2High, 0, lang)} t CO₂e`}>
          <p className="font-condensed text-4xl sm:text-5xl font-bold tracking-wide text-[#0f352e]">
            {compact(co2Low, lang)}–{compact(co2High, lang)}
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'টন CO₂' : 't CO₂e'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {bn
            ? `সম্ভাব্য পরিসর (±${fmt(co2Unc, 0, lang)}%) · মাঝামাঝি প্রায় ${compact(co2, lang)} টন`
            : `likely range (±${fmt(co2Unc, 0)}%) · middle estimate ≈ ${compact(co2, lang)} t`}
        </p>
        <p className="mt-0.5 text-[11px] text-[#7d958d]">
          {bn
            ? `≈ ${compact(co2Low / CO2_T_PER_PERSON_INDIA, lang)}–${compact(co2High / CO2_T_PER_PERSON_INDIA, lang)} জন ভারতীয়ের ১ বছরের CO₂`
            : `≈ one year of CO₂ from ${compact(co2Low / CO2_T_PER_PERSON_INDIA, lang)}–${compact(co2High / CO2_T_PER_PERSON_INDIA, lang)} people in India`}
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
            {bn ? '+৫ বছর' : '+5 yr what-if'}
          </span>
        </div>
        <div className="mt-2 flex items-baseline">
          <p className="font-condensed text-4xl sm:text-5xl font-bold tracking-wide text-[#0f352e]">
            <AnimatedNumber value={trend.mangroveHa} digits={0} lang={lang} />
          </p>
          <span className="ml-1.5 text-base font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </div>
        <p className="mt-1 text-xs text-[#526a63]">
          {bn
            ? `সম্ভাব্য পরিসর ${fmt(trend.lowHa, 0, lang)}–${fmt(trend.highHa, 0, lang)} হেক্টর · বর্তমান ধারা চললে`
            : `likely range ${fmt(trend.lowHa, 0)}–${fmt(trend.highHa, 0)} ha · if the current trend continues`}
        </p>
      </article>
    </div>
  )
}

const CO2_PER_C = 44 / 12

function windowText(from: string, to: string, lang: Lang) {
  const loc = lang === 'bn' ? 'bn-IN' : 'en-GB'
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f(from)} – ${f(to)}`
}

const signedInt = (v: number, lang: Lang, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), d, lang)}`

/**
 * Mapped mangrove area for every period the engine measured (start, each dry
 * season, end) with the ±area-error band. Every label comes from the data.
 */
export function YearsChart({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [chartMode, setChartMode] = useState<'spline' | 'bars'>('spline')
  const [metric, setMetric] = useState<'area' | 'carbon' | 'delta'>('area')
  const dim = b.reliability.level === 'low'
  const bn = lang === 'bn'
  const u = (b.carbon.areaUncertaintyPct || 0) / 100
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
  const seriesByKey = new Map(b.carbon.series.map((s) => [s.key, s]))
  const co2PerHa = b.carbon.end.co2eMg / (b.summary.end.mangroveHa || 1)

  const years = b.timeline.map((p) => p.midDate.slice(0, 4))
  const first = b.timeline[0]
  const rows = b.timeline.map((p, i, arr) => {
    const year = years[i]
    const m = Number(p.midDate.slice(5, 7))
    // Only add the month when two periods fall in the same year.
    const label = years.filter((y) => y === year).length > 1 ? `${(bn ? MONTHS_BN : MONTHS_EN)[m - 1]} ${year}` : year
    const cs = seriesByKey.get(p.key)
    const carbon = cs ? cs.co2eMg : p.mangroveHa * co2PerHa
    const carbonLow = cs ? cs.carbonLowMgC * CO2_PER_C : carbon * (1 - u)
    const carbonHigh = cs ? cs.carbonHighMgC * CO2_PER_C : carbon * (1 + u)
    const delta = i === 0 ? null : p.mangroveHa - arr[i - 1].mangroveHa
    const val = metric === 'area' ? p.mangroveHa : metric === 'carbon' ? carbon : delta
    const band: [number, number] | null =
      metric === 'area' ? [p.mangroveHa * (1 - u), p.mangroveHa * (1 + u)] : metric === 'carbon' ? [carbonLow, carbonHigh] : null
    return {
      label,
      window: windowText(p.startDate, p.endDate, lang),
      images: p.imageCount,
      unsureHa: p.lowConfidenceHa,
      area: p.mangroveHa,
      val,
      band,
      isFirst: i === 0,
      baselineDiff: p.mangroveHa - first.mangroveHa,
      baselinePct: ((p.mangroveHa - first.mangroveHa) / (first.mangroveHa || 1)) * 100,
    }
  })

  const plotted = rows.filter((r): r is (typeof rows)[number] & { val: number } => r.val !== null)
  const lows = plotted.map((r) => (r.band ? r.band[0] : r.val))
  const highs = plotted.map((r) => (r.band ? r.band[1] : r.val))
  const minVal = Math.min(...lows, ...(metric === 'delta' ? [0] : []))
  const maxVal = Math.max(...highs, ...(metric === 'delta' ? [0] : []))
  const pad = (maxVal - minVal) * 0.12 || Math.abs(maxVal) * 0.05 || 1
  const domain: [number, number] = [metric === 'delta' ? minVal - pad : Math.max(0, minVal - pad), maxVal + pad]
  const peak = plotted.reduce((a, c) => (c.val > a.val ? c : a), plotted[0])
  const low = plotted.reduce((a, c) => (c.val < a.val ? c : a), plotted[0])
  const firstRow = rows[0]
  const lastRow = rows[rows.length - 1]
  const mapDiff = lastRow.area - firstRow.area
  const confirmed = b.change.netChangeHa

  const unit = metric === 'carbon' ? (bn ? 'টন CO₂e' : 't CO₂e') : bn ? 'হেক্টর' : 'ha'
  const tooltip = <ModernChartTooltip lang={lang} metric={metric} unit={unit} u={u} />
  const lastDot = makeDot({
    lastIndex: rows.length - 1,
    color: CK.green,
    label: (v) => (metric === 'delta' ? `${signedInt(v, lang)} ha` : `${fmt(v, 0, lang)} ${metric === 'carbon' ? 't' : 'ha'}`),
  })
  const windowDays = b.request.windowDays
  const scaleM = b.request.scaleM

  return (
    <div className={`space-y-4 ${dim ? 'opacity-50' : ''}`}>
      {/* 1. Header Segment Controls (Tabs & Mode Switcher) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e5efe9] pb-3.5">
        <div className="inline-flex rounded-xl bg-[#eef5f1] p-1 border border-[#cbe1d5] gap-1">
          {(['area', 'carbon', 'delta'] as const).map((m) => {
            const active = metric === m
            const Icon = m === 'area' ? TreePine : m === 'carbon' ? Leaf : TrendingUp
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-xs font-bold cursor-pointer ${
                  active
                    ? 'bg-[#16865f] text-white shadow-xs'
                    : 'text-[#416257] hover:text-[#0c382f] hover:bg-white/60'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-[#16865f]'}`} />
                <span>
                  {m === 'area'
                    ? (bn ? 'আয়তন (হেক্টর)' : 'Area (ha)')
                    : m === 'carbon'
                    ? (bn ? 'কার্বন (CO₂e)' : 'Carbon (CO₂e)')
                    : (bn ? 'আগের তুলনায় পরিবর্তন' : 'Change vs previous')}
                </span>
              </button>
            )
          })}
        </div>

        <div className="inline-flex items-center rounded-xl bg-[#eef5f1] p-1 border border-[#cbe1d5] gap-1">
          {(['spline', 'bars'] as const).map((mode) => {
            const active = chartMode === mode
            const Icon = mode === 'spline' ? Activity : BarChart3
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setChartMode(mode)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#0f352e] shadow-xs border border-[#cbe1d5]'
                    : 'text-[#56746a] hover:text-[#0f352e]'
                }`}
              >
                <Icon className="size-3.5 text-[#16865f]" />
                <span className="hidden sm:inline">{mode === 'spline' ? (bn ? 'কার্ভ রেখা' : 'Smooth Line') : (bn ? 'বার চার্ট' : 'Bar Graph')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Executive KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 font-mono">
        {metric === 'delta' ? (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'সর্বোচ্চ বৃদ্ধি' : 'Biggest Rise'}</p>
                <p className="font-display text-sm font-bold text-emerald-800 truncate">{signedInt(peak.val, lang)} ha ({peak.label})</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'সর্বোচ্চ হ্রাস' : 'Biggest Drop'}</p>
                <p className="font-display text-sm font-bold text-rose-800 truncate">{signedInt(low.val, lang)} ha ({low.label})</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-teal-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'পিক্সেল নিশ্চিত পরিবর্তন' : 'Confirmed Net Change'}</p>
                <p className={`font-display text-sm font-bold truncate ${confirmed >= 0 ? 'text-[#16865f]' : 'text-rose-700'}`}>
                  {signedInt(confirmed, lang, 1)} ha
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'শুরুর বছর' : 'Baseline Year'} ({firstRow.label})</p>
                <p className="font-display text-sm font-bold text-[#0c3930] truncate">{fmt(firstRow.val ?? 0, 0, lang)} {unit}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-teal-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'সর্বোচ্চ স্তর' : 'Peak Canopy'} ({peak.label})</p>
                <p className="font-display text-sm font-bold text-[#0c3930] truncate">{fmt(peak.val, 0, lang)} {unit}</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-xl border border-[#d5e5dc] bg-[#f7faf8] px-3 py-2 shadow-2xs">
              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#6c867d]">{bn ? 'সর্বনিম্ন স্তর' : 'Lowest Canopy'} ({low.label})</p>
                <p className="font-display text-sm font-bold text-[#0c3930] truncate">{fmt(low.val, 0, lang)} {unit}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Main Chart Canvas with Visible Y-Axis and Light Guidelines */}
      <div className="h-68 sm:h-74 w-full rounded-2xl border border-[#e3eee8] bg-gradient-to-b from-white to-[#f7fbf9] p-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'spline' ? (
            <AreaChart data={rows} margin={{ top: 18, right: 16, bottom: 4, left: 4 }}>
              <GlowDefs id="yc" color={CK.mint} />
              <CartesianGrid stroke={CK.grid} strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fontSize: 11, fill: '#526a63', fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: '#dce8e1' }}
                tickLine={false}
              />
              <YAxis
                domain={domain}
                tick={{ fontSize: 10.5, fill: '#6c867d', fontFamily: 'var(--font-mono)' }}
                tickFormatter={(v) => fmt(v, 0, lang)}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={tooltip} cursor={{ stroke: 'rgba(16, 185, 129, 0.35)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
              {metric !== 'delta' && (
                <Area type="monotone" dataKey="band" stroke={CK.mint} strokeOpacity={0.35} strokeDasharray="3 4" fill={CK.mint} fillOpacity={0.1} isAnimationActive={false} activeDot={false} />
              )}
              <ReferenceLine y={metric === 'delta' ? 0 : (firstRow.val ?? 0)} stroke="#6c817a" strokeDasharray="3 3" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="val"
                connectNulls
                stroke={CK.green}
                strokeWidth={3}
                fill={metric === 'delta' ? 'none' : 'url(#yc-fill)'}
                baseValue={domain[0]}
                filter="url(#yc-glow)"
                dot={lastDot}
                activeDot={{ r: 6.5, fill: CK.ink, stroke: '#ffffff', strokeWidth: 3 }}
                animationDuration={900}
              />
            </AreaChart>
          ) : (
            <BarChart data={rows} margin={{ top: 22, right: 16, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="yc-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="yc-bar-last" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16865f" />
                  <stop offset="100%" stopColor="#0f5d44" />
                </linearGradient>
                <linearGradient id="yc-bar-neg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CK.grid} strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fontSize: 11, fill: '#526a63', fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: '#dce8e1' }}
                tickLine={false}
              />
              <YAxis
                domain={metric === 'delta' ? domain : [0, maxVal * 1.12]}
                tick={{ fontSize: 10.5, fill: '#6c867d', fontFamily: 'var(--font-mono)' }}
                tickFormatter={(v) => fmt(v, 0, lang)}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={tooltip} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
              {metric === 'delta' && <ReferenceLine y={0} stroke="#6c817a" />}
              <Bar dataKey="val" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={dim ? '#9ca3af' : (r.val ?? 0) < 0 ? 'url(#yc-bar-neg)' : i === rows.length - 1 ? 'url(#yc-bar-last)' : 'url(#yc-bar)'} />
                ))}
                <LabelList
                  dataKey="val"
                  position="top"
                  formatter={(v: unknown) => (typeof v !== 'number' ? '' : metric === 'delta' ? signedInt(v, lang) : fmt(v, 0, lang))}
                  style={{ fontSize: 10.5, fill: '#0f352e', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 4. Structured Diagnostic Comparison Card */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-amber-50/40 to-emerald-50/40 p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-amber-900 font-mono text-xs font-bold uppercase tracking-wider">
          <Info className="size-4 text-amber-700 shrink-0" />
          <span>{bn ? 'উপাত্ত ব্যাখ্যা: উপগ্রহের পরিবর্তনশীলতা বনাম নিশ্চিত বন পরিবর্তন' : 'SENSOR VARIANCE VS. CONFIRMED PIXEL CHANGE'}</span>
        </div>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl bg-white/85 p-3 border border-amber-200/60 shadow-2xs">
            <span className="text-[10.5px] font-mono text-[#6c867d] uppercase">{bn ? 'মানচিত্র মোটের পার্থক্য' : 'Raw Map Delta (Scene Noise)'}</span>
            <p className="font-mono text-sm font-bold text-[#0f352e] mt-0.5">
              {signedInt(mapDiff, lang)} ha <span className="text-[11px] font-normal text-[#6c867d]">({bn ? '±' : '±'}{fmt(u * 100, 1, lang)}% {bn ? 'ছবির ভিন্নতা' : 'spread'})</span>
            </p>
            <p className="text-[11px] text-[#557369] mt-0.5 leading-snug">
              {bn ? 'প্রতি বছরের আলাদা ছবির আলো ও জোয়ারের তারতম্য থাকে।' : 'Measured from independent dry-season composites.'}
            </p>
          </div>
          <div className="rounded-xl bg-white/85 p-3 border border-emerald-200/80 shadow-2xs">
            <span className="text-[10.5px] font-mono text-[#16865f] font-bold uppercase">{bn ? 'পিক্সেল-ভিত্তিক নিশ্চিত পরিবর্তন' : 'Confirmed Pixel Net Change'}</span>
            <p className={`font-mono text-sm font-bold mt-0.5 ${confirmed >= 0 ? 'text-[#16865f]' : 'text-rose-600'}`}>
              {signedInt(confirmed, lang, 1)} ha <span className="text-[11px] font-normal text-[#557369]">({bn ? 'বৃদ্ধি − ক্ষতি' : 'gain − loss'})</span>
            </p>
            <p className="text-[11px] text-[#426156] mt-0.5 leading-snug">
              {bn ? 'মূল সিদ্ধান্ত ও ৫ বছরের প্রক্ষেপণে এই নিশ্চিত মানটি ব্যবহৃত।' : 'Used strictly for the headline verdict & 5-year outlook.'}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Bottom Metadata Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5efe9] pt-2.5 font-mono text-xs text-[#6c867d]">
        <span className="flex items-center gap-1.5">
          <Satellite className="size-3.5 text-[#16865f]" />
          {bn
            ? 'প্রতিটি বিন্দু = ওই সময়ের মেঘমুক্ত সেন্টিনেল-২ ছবির মিডিয়ান কম্পোজিট।'
            : `Each point = median of the cloud-free Sentinel-2 photos in a ${windowDays}-day window (hover for dates).`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800 font-bold border border-emerald-200/70 text-[11px]">
          ESA Sentinel-2 · {scaleM} m analysis
        </span>
      </div>
    </div>
  )
}

type ChartRow = {
  label: string
  window: string
  images: number
  unsureHa: number
  area: number
  val: number | null
  band: [number, number] | null
  isFirst: boolean
  baselineDiff: number
  baselinePct: number
}

function ModernChartTooltip({
  active,
  payload,
  lang,
  metric,
  unit,
  u,
}: {
  active?: boolean
  payload?: { dataKey?: unknown; payload: ChartRow }[]
  lang: Lang
  metric: 'area' | 'carbon' | 'delta'
  unit: string
  u: number
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  const bn = lang === 'bn'

  return (
    <div className="rounded-xl border border-emerald-500/35 bg-[#031d17]/95 p-3 text-white shadow-2xl backdrop-blur-md min-w-[230px]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-1.5">
        <span className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
          <Calendar className="size-3" />
          {item.label}
        </span>
        <span className="font-mono text-[10px] text-emerald-300/80">
          {fmt(item.images, 0, lang)} {bn ? 'টি ছবি' : 'photos'}
        </span>
      </div>
      <p className="font-mono text-[10.5px] text-emerald-200/80">{item.window}</p>

      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="font-condensed text-2xl font-bold tracking-wide text-white">
          {item.val == null ? '—' : metric === 'delta' ? signedInt(item.val, lang) : fmt(item.val, 0, lang)}
        </span>
        <span className="text-xs text-emerald-300 font-sans">{unit}</span>
      </div>
      {item.band && (
        <p className="font-mono text-[10.5px] text-emerald-200/70">
          {bn ? 'সম্ভাব্য পরিসর' : 'likely range'} {fmt(item.band[0], 0, lang)}–{fmt(item.band[1], 0, lang)}
        </p>
      )}
      {metric === 'delta' && item.val == null && (
        <p className="text-[10.5px] text-emerald-200/70">{bn ? 'প্রথম সময়কাল — আগের কোনো মাপ নেই' : 'First period — nothing earlier to compare'}</p>
      )}

      <div className="mt-2 space-y-1 text-[11px] border-t border-emerald-500/20 pt-1.5">
        {!item.isFirst && (
          <div className="flex items-center justify-between gap-3 text-emerald-200">
            <span>{bn ? 'শুরুর মানচিত্রের তুলনায়' : 'vs start map'}</span>
            <span className={`font-mono font-bold ${item.baselineDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {signedInt(item.baselineDiff, lang)} ha ({signedInt(item.baselinePct, lang, 1)}%)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 text-emerald-200/80">
          <span>{bn ? 'অনিশ্চিত পিক্সেল' : 'Unsure pixels'}</span>
          <span className="font-mono">{fmt(item.unsureHa, 0, lang)} ha</span>
        </div>
        <p className="text-[10.5px] text-emerald-300/70 italic">
          {areaInWords(item.area, lang)} · ±{fmt(u * 100, 1, lang)}%
        </p>
      </div>
    </div>
  )
}

/**
 * The three 5-year "what if" lines computed by the backend. Descriptions are
 * built from the real rates the backend used.
 */
export function FutureBoxes({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [activeScenarioId, setActiveScenarioId] = useState<'current_trend' | 'higher_loss' | 'recovery'>('current_trend')
  const dim = b.reliability.level === 'low'
  const bn = lang === 'bn'
  const pr = b.projection

  const meta = {
    current_trend: {
      icon: '➡️',
      activeBorder: 'border-sky-500 ring-2 ring-sky-400/30',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      desc: bn
        ? `এখন পর্যন্ত নিশ্চিত পরিবর্তন (বৃদ্ধি − ক্ষতি) বছরে ${signedInt(pr.trendHaPerYear, lang, 2)} হেক্টর — এই হার চলতে থাকলে।`
        : `The confirmed change so far (gain − loss), ${signedInt(pr.trendHaPerYear, lang, 2)} ha per year, keeps going.`,
    },
    higher_loss: {
      icon: '⚠️',
      activeBorder: 'border-rose-500 ring-2 ring-rose-400/30',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      desc: bn
        ? `ক্ষতি দ্বিগুণ হলে: বর্তমান ধারার উপর বছরে আরও −${fmt(pr.observedGrossLossHaPerYear, 1, lang)} হেক্টর (যেমন বেশি ভাঙন)।`
        : `If loss doubled: another −${fmt(pr.observedGrossLossHaPerYear, 1)} ha per year on top of the current trend (e.g. stronger erosion).`,
    },
    recovery: {
      icon: '🌱',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-400/30',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      desc: bn
        ? 'ক্ষতি অর্ধেক আর নতুন বৃদ্ধি দেড় গুণ হলে (যেমন সুরক্ষা ও বনায়ন)।'
        : 'If loss halved and regrowth rose by half (e.g. protection plus planting).',
    },
  } as const

  const active = pr.scenarios.find((s) => s.id === activeScenarioId) ?? pr.scenarios[0]
  const p0 = active.points[0]
  const pEnd = active.points[active.points.length - 1]
  const activeDelta = pEnd.mangroveHa - p0.mangroveHa
  const carbonDelta = (pEnd.carbonMgC - p0.carbonMgC) * CO2_PER_C

  return (
    <div className={`space-y-4 ${dim ? 'opacity-50' : ''}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {pr.scenarios.map((sc) => {
          const start = sc.points[0]
          const p = sc.points[sc.points.length - 1]
          const d = p.mangroveHa - start.mangroveHa
          const isSelected = active.id === sc.id
          const m = meta[sc.id]
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setActiveScenarioId(sc.id)}
              className={`group relative text-left rounded-2xl border p-4 transition-all duration-300 cursor-pointer ${
                isSelected ? `bg-white shadow-lg ${m.activeBorder}` : 'bg-white/80 border-[#e5efe9] hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#0f352e]">
                  <span>{m.icon}</span>
                  <span>{bn ? sc.nameBn : sc.name}</span>
                </span>
                <span className={`font-mono text-[9.5px] font-bold rounded px-1.5 py-0.5 border ${m.badgeColor}`}>{p.year}</span>
              </div>
              <div className="mt-2.5 flex items-baseline">
                <span className="font-condensed text-3xl font-bold tracking-wide text-[#0f352e]">
                  <AnimatedNumber value={p.mangroveHa} digits={0} lang={lang} />
                </span>
                <span className="ml-1 text-xs font-normal text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
              </div>
              <p className={`mt-1 font-mono text-xs font-bold ${d < -0.5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {Math.abs(d) < 0.5 ? (bn ? '≈ কোনো পরিবর্তন নেই' : '≈ no change') : `${signedInt(d, lang)} ${bn ? 'হেক্টর' : 'ha'}`}
              </p>
              <p className="mt-1 font-mono text-[10.5px] text-[#7d958d]">
                {bn ? 'পরিসর' : 'range'} {fmt(p.lowHa, 0, lang)}–{fmt(p.highHa, 0, lang)}
              </p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#f7faf8] to-[#edf6f2] p-4 text-xs text-[#0f352e] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {bn ? 'নির্বাচিত দৃশ্যপট' : 'Selected scenario'}
            </span>
            <span className="font-bold text-sm text-[#0f352e]">{bn ? active.nameBn : active.name}</span>
          </div>
          <span className="font-mono text-[11px] text-[#6c817a]">
            {p0.year} → {pEnd.year}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#40564f] leading-relaxed">{meta[active.id].desc}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono">
          <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/80 shadow-2xs">
            <p className="text-[10px] text-[#6c817a] uppercase font-bold tracking-wider">{bn ? 'বনের আয়তনে পরিবর্তন' : 'Change in forest area'}</p>
            <p className={`mt-1 font-condensed text-2xl font-bold tracking-wide ${activeDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              <AnimatedNumber value={Math.abs(activeDelta)} digits={0} lang={lang} prefix={activeDelta >= 0 ? '+' : '−'} />
              <span className="ml-1 text-xs font-sans text-[#6c817a]">{bn ? 'হেক্টর' : 'ha'}</span>
            </p>
          </div>
          <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/80 shadow-2xs">
            <p className="text-[10px] text-[#6c817a] uppercase font-bold tracking-wider">{bn ? 'জমা কার্বনে পরিবর্তন' : 'Change in stored carbon'}</p>
            <p className={`mt-1 font-condensed text-2xl font-bold tracking-wide ${carbonDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              <AnimatedNumber value={Math.abs(carbonDelta)} digits={0} lang={lang} prefix={carbonDelta >= 0 ? '+' : '−'} />
              <span className="ml-1 text-xs font-sans text-[#6c817a]">{bn ? 'টন CO₂e' : 't CO₂e'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[#6c817a]">
        <p>
          {bn
            ? 'এগুলো সহজ "যদি এমন হয়" রেখা, পূর্বাভাস নয়। পরিসরে মানচিত্রের ত্রুটি ও বছর-বছর ওঠানামা ধরা আছে।'
            : 'Simple "what if" lines from the measured rates — not a forecast. Ranges include map error and year-to-year noise.'}
        </p>
        <span className="shrink-0 font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
          {bn ? `${fmt(pr.horizonYears, 0, lang)} বছরের দৃশ্য` : `${pr.horizonYears}-year outlook`}
        </span>
      </div>
    </div>
  )
}
