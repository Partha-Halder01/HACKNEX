import { CheckCircle2, CircleAlert, CircleHelp, Leaf, TreePine, TrendingDown, TrendingUp, Minus, Users } from 'lucide-react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalysisBundle } from '../../types/analysis'
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
  const toneBorder = rel.level === 'low' ? 'from-amber-500/80' : v === 'shrank' ? 'from-rose-500/80' : 'from-emerald-500/80'
  const iconColor = rel.level === 'low' ? 'text-amber-600 bg-amber-50 border-amber-200' : v === 'shrank' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  return (
    <section className="glass-panel group relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-[0_12px_36px_rgba(7,61,52,0.06)] transition-all duration-300">
      {/* Dynamic top gradient line based on forest state */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${toneBorder} via-emerald-400 to-transparent`} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5efe9] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 border border-emerald-300/60 rounded-md px-2 py-0.5">
            {lang === 'bn' ? 'উপগ্রহ সিদ্ধান্ত' : 'Satellite Verdict'}
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
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl border shadow-sm ${iconColor}`}>
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight text-[#0f352e] tracking-tight">
            {headline}
          </h2>
          {sub && (
            <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-[#40564f]">
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
    high: { dot: 'bg-emerald-500', box: 'bg-emerald-50/90 border-emerald-200 text-emerald-900', label: lang === 'bn' ? 'উচ্চ নির্ভুলতা' : 'High Confidence', en: 'We are fairly sure of this result', bn: 'এই ফলাফলে আমরা বেশ নিশ্চিত' },
    medium: { dot: 'bg-amber-500', box: 'bg-amber-50/90 border-amber-200 text-amber-900', label: lang === 'bn' ? 'মাঝারি নির্ভুলতা' : 'Moderate Confidence', en: 'Use this result with some care', bn: 'এই ফলাফল একটু সাবধানে ব্যবহার করুন' },
    low: { dot: 'bg-rose-500', box: 'bg-rose-50/90 border-rose-200 text-rose-900', label: lang === 'bn' ? 'নিম্ন নির্ভুলতা' : 'Low Confidence', en: 'Do not trust these numbers without field check', bn: 'এই সংখ্যাগুলি বিশ্বাস করবেন না' },
    demo: { dot: 'bg-amber-500', box: 'bg-amber-50/90 border-amber-200 text-amber-900', label: lang === 'bn' ? 'ডেমো সিমুলেশন' : 'Simulation Mode', en: 'Demo only — synthetic satellite measurements', bn: 'শুধু ডেমো — আসল পরিমাপ নয়' },
  }[rel.level]

  return (
    <div className={`mt-4.5 rounded-xl border p-3.5 text-sm transition-all ${conf.box}`}>
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

/** Four high-impact metric cards with glowing subtle gradients and AI blue carbon imagery. */
export function SimpleCards({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const dim = b.reliability.level === 'low'
  const end = b.summary.end
  const diff = end.mangroveHa - b.summary.start.mangroveHa
  const co2 = b.carbon.end.co2eMg
  const people = co2 / CO2_T_PER_PERSON_INDIA
  const trend = b.projection.scenarios.find((s) => s.id === 'current_trend')!.points.at(-1)!
  const bn = lang === 'bn'

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Forest Area */}
      <article className={`glass-panel group relative overflow-hidden rounded-2xl p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(7,61,52,0.08)] ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#6c817a]">
            <TreePine className="size-4 text-emerald-600" />
            {bn ? `ম্যানগ্রোভ (${endYear(b)})` : `Forest Area (${endYear(b)})`}
          </p>
          <span className="font-mono text-[10px] font-bold rounded-md bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5">
            {fmt(end.mangrovePct, 0, lang)}% {bn ? 'ক্যানোপি' : 'cover'}
          </span>
        </div>
        <p className="mt-2 font-display text-3xl font-extrabold font-tabular text-[#0f352e] tracking-tight">
          {fmt(end.mangroveHa, 0, lang)}
          <span className="ml-1 text-sm font-semibold text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </p>
        <p className="mt-1 text-xs text-[#526a63]">
          {areaInWords(end.mangroveHa, lang)}
        </p>
      </article>

      {/* 2. Forest Change */}
      <article className={`glass-panel group relative overflow-hidden rounded-2xl p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(7,61,52,0.08)] ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#6c817a]">
            {diff < 0 ? <TrendingDown className="size-4 text-rose-600" /> : <TrendingUp className="size-4 text-emerald-600" />}
            {bn ? `${startYear(b)} থেকে বদল` : `Change Since ${startYear(b)}`}
          </p>
          <span className={`font-mono text-[10px] font-bold rounded-md px-1.5 py-0.5 ${diff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {diff > 0 ? '+' : ''}{fmt(b.change.percentChange, 1, lang)}%
          </span>
        </div>
        <p className={`mt-2 font-display text-3xl font-extrabold font-tabular tracking-tight ${diff < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          {Math.abs(diff) < 0.5 ? (bn ? '০.০' : '0.0') : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), 0, lang)}`}
          <span className="ml-1 text-sm font-semibold text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </p>
        <p className="mt-1 text-xs text-[#526a63]">
          {Math.abs(diff) < 0.5
            ? bn ? 'বন স্থিতিশীল রয়েছে' : 'canopy density remained stable'
            : bn
            ? `${diff > 0 ? 'বেড়েছে' : 'কমেছে'} ${fmt(Math.abs(b.change.percentChange), 1, lang)}%`
            : `${diff > 0 ? 'expanded' : 'contracted'} by ${fmt(Math.abs(b.change.percentChange), 1)}%`}
        </p>
      </article>

      {/* 3. Blue Carbon Reservoir (Featuring AI Generated Visual) */}
      <article className={`group relative overflow-hidden rounded-2xl border border-emerald-900/30 bg-[#062923] p-4.5 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(6,41,35,0.3)] ${dim ? 'opacity-50' : ''}`}>
        {/* AI-Generated Blue Carbon Roots Background Image with dark gradient mask */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity group-hover:scale-105 group-hover:opacity-40 transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url('/images/dashboard/mangrove_blue_carbon.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062923] via-[#062923]/80 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Users className="size-4 text-emerald-400" />
              {bn ? 'বনে জমা কার্বন' : 'Blue Carbon Stock'}
            </p>
            <span className="font-mono text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5">
              IPCC Tier 1
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold font-tabular text-emerald-100 tracking-tight">
            {fmt(co2, 0, lang)}
            <span className="ml-1 text-sm font-semibold text-emerald-300/80 font-sans">{bn ? 'টন CO₂' : 't CO₂e'}</span>
          </p>
          <p className="mt-1 text-xs text-emerald-200/90 leading-tight">
            {bn
              ? `প্রায় ${fmt(people, 0, lang)} জনের ১ বছরের কার্বনের সমতুল্য`
              : `≈ annual footprint of ${fmt(people, 0)} Indian residents`}
          </p>
        </div>
      </article>

      {/* 4. 2030 Horizon Projection */}
      <article className={`glass-panel group relative overflow-hidden rounded-2xl p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(7,61,52,0.08)] ${dim ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#6c817a]">
            <Leaf className="size-4 text-emerald-600" />
            {bn ? `${trend.year} পূর্বাভাস` : `${trend.year} Scenario`}
          </p>
          <span className="font-mono text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 px-1.5 py-0.5">
            +5 yr model
          </span>
        </div>
        <p className="mt-2 font-display text-3xl font-extrabold font-tabular text-[#0f352e] tracking-tight">
          {fmt(trend.mangroveHa, 0, lang)}
          <span className="ml-1 text-sm font-semibold text-[#6c817a] font-sans">{bn ? 'হেক্টর' : 'ha'}</span>
        </p>
        <p className="mt-1 text-xs text-[#526a63]">
          {bn ? 'বর্তমান ধারা অনুযায়ী আনুমানিক প্রক্ষেপণ' : 'projected trajectory under status-quo trends'}
        </p>
      </article>
    </div>
  )
}

/** Modern bar chart with emerald gradients and custom tooltip. */
export function YearsChart({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const dim = b.reliability.level === 'low'
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']

  const rows = b.timeline.map((p) => {
    const m = Number(p.midDate.slice(5, 7))
    const dry = m >= 1 && m <= 3
    const year = p.midDate.slice(0, 4)
    return { year: dry ? year : `${(lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m - 1]} ${year}`, ha: p.mangroveHa }
  })
  const max = Math.max(...rows.map((r) => r.ha))

  return (
    <div className={dim ? 'opacity-50' : ''}>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 24, right: 12, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="primaryEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="historyEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#526a63', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, max * 1.15]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload
                return (
                  <div className="rounded-xl border border-emerald-500/20 bg-white/95 p-2.5 shadow-xl backdrop-blur-md">
                    <p className="font-mono text-xs font-bold text-[#6c817a]">{item.year}</p>
                    <p className="font-display text-base font-extrabold text-[#0f352e]">
                      {fmt(item.ha, 0, lang)} {lang === 'bn' ? 'হেক্টর' : 'hectares'}
                    </p>
                    <p className="text-[11px] text-[#526a63]">{areaInWords(item.ha, lang)}</p>
                  </div>
                )
              }}
              cursor={{ fill: 'rgba(22, 134, 95, 0.05)' }}
            />
            <Bar dataKey="ha" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {rows.map((_, i) => (
                <Cell
                  key={i}
                  fill={dim ? '#9ca3af' : i === rows.length - 1 ? 'url(#primaryEmeraldGradient)' : 'url(#historyEmeraldGradient)'}
                />
              ))}
              <LabelList
                dataKey="ha"
                position="top"
                formatter={(v: number) => fmt(v, 0, lang)}
                style={{ fontSize: 11, fill: '#0f352e', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5efe9] pt-2 text-xs text-[#6c817a]">
        <span>
          {lang === 'bn'
            ? 'প্রতিটি স্তম্ভ = সেই বছরের ম্যানগ্রোভ আয়তন (১ হেক্টর ≈ ৭.৫ বিঘা)।'
            : 'Each bar represents annual validated mangrove canopy area.'}
        </span>
        <span className="font-mono text-[11px] text-emerald-800 font-semibold">
          {lang === 'bn' ? 'উৎস: সেন্টিনেল-২ এল২এ' : 'Source: Sentinel-2 L2A'}
        </span>
      </div>
    </div>
  )
}

/** Three interactive what-if future scenario cards. */
export function FutureBoxes({ bundle: b, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const dim = b.reliability.level === 'low'
  const now = b.summary.end.mangroveHa
  const text = {
    current_trend: { en: 'Business-as-Usual', bn: 'এখনকার ধারা বজায় থাকলে', descEn: 'Historical erosion and natural regeneration rate maintained', descBn: 'পূর্বের ভাঙন ও বৃদ্ধির স্বাভাবিক হার বহাল থাকলে', emoji: '➡️' },
    higher_loss: { en: 'Stressed / High Loss', bn: 'ভাঙন ও ঘূর্ণিঝড়জনিত চাপ', descEn: 'Severe weather events or coastal erosion doubling loss', descBn: 'ঘূর্ণিঝড় বা তীব্র নদীভাঙনে ক্ষতির মাত্রা দ্বিগুণ হলে', emoji: '⚠️' },
    recovery: { en: 'Community Conservation', bn: 'সম্প্রদায়ভিত্তিক পুনরুদ্ধার', descEn: 'Aggressive afforestation and community embankment protection', descBn: 'সক্রিয় বনায়ন ও বাঁধ সুরক্ষায় নতুন চরে গাছ লাগালে', emoji: '🌱' },
  } as const

  return (
    <div className={dim ? 'opacity-50' : ''}>
      <div className="grid gap-3 sm:grid-cols-3">
        {b.projection.scenarios.map((sc) => {
          const p = sc.points.at(-1)!
          const d = p.mangroveHa - now
          const isRecovery = sc.id === 'recovery'
          const isLoss = sc.id === 'higher_loss'

          return (
            <div
              key={sc.id}
              className={`group relative rounded-xl border p-3.5 transition-all duration-300 hover:shadow-md ${
                isRecovery
                  ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                  : isLoss
                  ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                  : 'border-[#e5efe9] bg-white hover:border-emerald-200'
              }`}
            >
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#0f352e]">
                <span>{text[sc.id].emoji}</span>
                <span>{text[sc.id][lang]}</span>
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold font-tabular text-[#0f352e]">
                {fmt(p.mangroveHa, 0, lang)}
                <span className="ml-1 text-xs font-semibold text-[#6c817a] font-sans">{lang === 'bn' ? 'হেক্টর' : 'ha'}</span>
              </p>
              <p className={`mt-1 font-mono text-xs font-bold ${d < -0.5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {Math.abs(d) < 0.5
                  ? lang === 'bn' ? `≈ কোনো পরিবর্তন নেই (${p.year})` : `≈ stable baseline by ${p.year}`
                  : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 0, lang)} ${lang === 'bn' ? `হেক্টর (${p.year})` : `ha by ${p.year}`}`}
              </p>
              <p className="mt-1 text-[11px] text-[#6c817a] leading-tight">
                {lang === 'bn' ? text[sc.id].descBn : text[sc.id].descEn}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#6c817a]">
        <p>
          {lang === 'bn'
            ? 'এগুলো গাণিতিক প্রক্ষেপণ ("হোয়াট-ইফ"), অপরিবর্তনীয় ভবিষ্যদ্বাণী নয়।'
            : 'Monte-Carlo projection model for planning — subject to climate variability.'}
        </p>
        <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
          2030 Horizon
        </span>
      </div>
    </div>
  )
}
