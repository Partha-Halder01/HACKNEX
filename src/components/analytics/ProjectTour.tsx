import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Cloud,
  Code2,
  Compass,
  Database,
  ExternalLink,
  FileText,
  Flame,
  FlaskConical,
  Globe,
  GraduationCap,
  Info,
  Layers,
  Leaf,
  MapPin,
  Network,
  Play,
  Satellite,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { BRAND } from '../../config/app'
import type { AnalysisBundle, Capabilities } from '../../types/analysis'
import { fmt, signed, type Lang } from './ui'
import { AnalysisFlow, ArchitectureDiagram } from './SystemDiagrams'

export interface TryPlace {
  label: string
  lat: number
  lon: number
  startDate: string
  endDate: string
}

interface Props {
  open: boolean
  onClose: () => void
  lang: Lang
  bundle: AnalysisBundle | null
  caps: Capabilities | null
  /** Close the tour and scroll the dashboard to a section id. */
  onJump: (sectionId: string) => void
  /** Close the tour and run an analysis for a demonstration place. */
  onTry: (place: TryPlace) => void
}

type L = (en: string, bn: string) => string

// ───────────────────────── helper UI primitives ─────────────────────────

function Heading({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.22em] text-[#16865f] uppercase">
        <span className="size-1.5 rounded-full bg-[#16865f]" />
        {kicker}
      </div>
      <h2 className="mt-2.5 font-condensed text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#08332b] leading-[0.95] uppercase">
        {title}
      </h2>
      {desc && <p className="mt-2.5 max-w-3xl font-sans text-sm sm:text-base leading-relaxed text-[#4d6b61]">{desc}</p>}
    </div>
  )
}

function JumpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#c5ddd0] bg-white px-3.5 py-2 font-mono text-xs font-bold text-[#0e3f34] shadow-2xs transition-all hover:bg-[#16865f] hover:text-white hover:border-[#16865f] cursor-pointer"
    >
      <Target className="size-3.5 text-[#16865f] group-hover:text-white" /> {label}
    </button>
  )
}

// ───────────────────────── interactive pipeline ─────────────────────────

function Pipeline({ L }: { L: L }) {
  const steps = [
    {
      id: 'sentinel',
      icon: Satellite,
      num: '01',
      title: L('Satellite Observation', 'উপগ্রহ চিত্র সংগ্রহ'),
      lead: L(
        'European Space Agency (Sentinel-2) orbits provide 10m multispectral imagery every 5 days.',
        'ইউরোপিয়ান স্পেস এজেন্সির সেন্টিনেল-২ উপগ্রহ প্রতি ৫ দিনে ১০ মিটার রেজোলিউশনে ছবি তোলে।'
      ),
      simple: L(
        'The satellite photographs the Sundarbans across visible, red-edge, and shortwave-infrared wavelengths. We select scenes from the exact same dry season (January–March) across all years to eliminate false loss caused by seasonal monsoons and high spring tides.',
        'উপগ্রহ বিভিন্ন আলো ও ইনফ্রারেড তরঙ্গে সুন্দরবনের ছবি তোলে। প্রতি বছর ঠিক একই শুকনো মৌসুমে (জানুয়ারি–মার্চ) ছবি বাছা হয় যাতে বর্ষা বা জোয়ারের জলকে বন হারানো বলে ভুল না হয়।'
      ),
      hasImage: true,
      specs: [
        { k: 'Sensor', v: 'Copernicus Sentinel-2 MSI (Level-2A BOA)' },
        { k: 'Resolution', v: '10 m (B2, B3, B4, B8) / 20 m (B11, B12)' },
        { k: 'Window', v: 'Jan 01 – Mar 31 (90-day dry season)' },
        { k: 'Cloud Limit', v: 'Scene cloud cover ≤ 30%' },
      ],
    },
    {
      id: 'cloud_free',
      icon: Cloud,
      num: '02',
      title: L('Cloud-Free Compositing', 'মেঘমুক্ত যৌগিক দৃশ্য'),
      lead: L(
        'Google Earth Engine merges multiple scenes to generate clean, shadow-free annual mosaics.',
        'গুগল আর্থ ইঞ্জিন একাধিক দৃশ্য একত্র করে প্রতি বছরের জন্য মেঘ ও ছায়ামুক্ত পরিষ্কার ছবি তৈরি করে।'
      ),
      simple: L(
        'Tropical estuaries have frequent cloud banks and shifting shadows. Google Earth Engine screens every pixel across the 90-day window, filters out clouds and water spray, and calculates the per-pixel median surface reflectance.',
        'সুন্দরবনে মেঘ ও মেঘের ছায়া বেশি থাকে। আর্থ ইঞ্জিন ৯০ দিনের সব ছবির প্রতিটি পিক্সেল যাচাই করে মেঘ দূর করে এবং একটি নিখুঁত বাৎসরিক চিত্র তৈরি করে।'
      ),
      hasImage: false,
      specs: [
        { k: 'Engine', v: 'Google Earth Engine Python REST API' },
        { k: 'Masking', v: 'SCL (Scene Classification) + QA60 bitmask' },
        { k: 'Reducer', v: 'Per-pixel median temporal reducer' },
        { k: 'Indices', v: 'NDVI (B8-B4)/(B8+B4), NDWI (B3-B8)/(B3+B8)' },
      ],
    },
    {
      id: 'ai_classifier',
      icon: BrainCircuit,
      num: '03',
      title: L('Canopy Classification', 'ম্যানগ্রোভ শ্রেণিবিভাগ'),
      lead: L(
        'A 200-tree Random Forest model determines mangrove presence and confidence for each 10m pixel.',
        '২০০টি ডিসিশন ট্রির র‍্যান্ডম ফরেস্ট মডেল প্রতিটি ১০ মিটার পিক্সেল ম্যানগ্রোভ কি না তা যাচাই করে।'
      ),
      simple: L(
        'The machine-learning classifier was trained on long-term verified mangrove baselines (CGMD-AFCC30). It inspects 8 spectral features per pixel to decide whether canopy is present and produces an honest confidence score.',
        'বিজ্ঞানীদের ৪০ বছরের ঐতিহাসিক মানচিত্রে মডেলটি প্রশিক্ষণপ্রাপ্ত। এটি প্রতি পিক্সেলের বর্ণালী বৈশিষ্ট্য দেখে বন নির্ধারণ করে এবং নিজস্ব নির্ভুলতার স্কোর জানায়।'
      ),
      hasImage: false,
      specs: [
        { k: 'Model', v: 'Random Forest (200 trees, balanced depth)' },
        { k: 'Training Data', v: 'CGMD-AFCC30 (1984–2022 stable pixels)' },
        { k: 'Canopy Rule', v: '≥ 50% mangrove canopy closure' },
        { k: 'Validation', v: 'Spatial test on unseen held-out 2023 data' },
      ],
    },
    {
      id: 'change_carbon',
      icon: Layers,
      num: '04',
      title: L('Change & Carbon Accounting', 'পরিবর্তন ও কার্বন হিসাব'),
      lead: L(
        'Spatial change mapping with minimum mapping unit filtering and IPCC Tier 1 carbon equations.',
        'পিক্সেল ভিত্তিক পরিবর্তন বিশ্লেষণ এবং আন্তর্জাতিক IPCC টিয়ার ১ মানকে কার্বন হিসাব।'
      ),
      simple: L(
        'Comparing baseline vs target years produces a categorical change map: forest gain, forest loss, stable canopy, and uncertain transitions. Carbon is computed transparently with error intervals.',
        'দুই বছরের মানচিত্র তুলনা করে দেখা হয় কোথায় বন বেড়েছে, কোথায় কমেছে আর কোথায় অনিশ্চিত। কোনো কৃত্রিম সংখ্যা নয়, আন্তর্জাতিক গণিত মেনে কার্বন হিসাব হয়।'
      ),
      hasImage: false,
      specs: [
        { k: 'Threshold', v: '0.6 minimum classification confidence' },
        { k: 'MMU Filter', v: '0.5 hectare Minimum Mapping Unit' },
        { k: 'Carbon Standard', v: 'IPCC 2013 Wetlands Supplement Tier 1' },
        { k: 'Factor', v: '283.1 Mg C/ha (Above + Roots + Soil)' },
      ],
    },
    {
      id: 'delivery',
      icon: FileText,
      num: '05',
      title: L('Plain-Language Delivery', 'সহজ ভাষায় প্রকাশ'),
      lead: L(
        'Results transformed into verified summaries in Bengali and English for field action.',
        'মাঠ পর্যায়ের ব্যবহারের জন্য বাংলা ও ইংরেজিতে যাচাইকৃত সহজ প্রতিবেদন তৈরি হয়।'
      ),
      simple: L(
        'No confusing academic jargon. The system outputs a clear verdict, a before/after photo slider, reliability traffic lights, and direct WhatsApp sharing links so village panchayats and forest guards can take swift action.',
        'জটিল বৈজ্ঞানিক ভাষা বাদ দিয়ে সহজ সিদ্ধান্ত, আগে-পরের স্লাইডার এবং বিশ্বস্ততার সবুজ-হলুদ-লাল সংকেত দেওয়া হয় যা এক ক্লিকে হোয়াটসঅ্যাপে পাঠানো যায়।'
      ),
      hasImage: false,
      specs: [
        { k: 'Languages', v: 'Bengali (বাংলা) & English' },
        { k: 'Outputs', v: 'WhatsApp cards, Printable PDF, JSON API' },
        { k: 'Guardrails', v: 'Strict numerical verification checks' },
        { k: 'Offline Export', v: 'Deterministic standalone report generation' },
      ],
    },
  ]

  const [active, setActive] = useState(0)
  const S = steps[active]
  const Icon = S.icon

  return (
    <div className="space-y-6">
      {/* Step Selector Horizontal Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#eaf2ed] p-1.5 rounded-2xl border border-[#cbe0d4]">
        {steps.map((s, i) => {
          const on = i === active
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left transition-all cursor-pointer ${
                on
                  ? 'bg-white text-[#062f27] shadow-sm font-bold border border-[#bcd8c8]'
                  : 'text-[#476a5e] hover:text-[#0c3c31] hover:bg-white/60 font-semibold'
              }`}
            >
              <div
                className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-mono font-bold ${
                  on ? 'bg-[#16865f] text-white' : 'bg-[#d8e8de] text-[#34584e]'
                }`}
              >
                {s.num}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs leading-tight">{s.title}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Stage Detailed Presentation Card */}
      <div className="rounded-3xl border border-[#cde0d5] bg-white p-6 sm:p-8 shadow-sm">
        {/* Visual asset for step 1 */}
        {active === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-950/40 shadow-xs mb-6 group">
            <img
              src="/images/tour/sentinel-satellite.jpg"
              alt="Sentinel-2 Satellite in Low Earth Orbit"
              className="h-44 sm:h-56 w-full object-cover group-hover:scale-101 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#021813] via-[#021813]/40 to-transparent flex items-end p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 w-full font-mono text-xs text-emerald-200">
                <span className="font-bold flex items-center gap-1.5">
                  <Satellite className="size-3.5 text-emerald-400" />
                  Copernicus Sentinel-2 MSI · ESA Sun-Synchronous Orbit
                </span>
                <span className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[11px]">
                  Altitude: 786 km · Swath: 290 km
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6efe9] pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-[#dff0e6] text-[#16865f] border border-[#cbe4d7]">
              <Icon className="size-6" />
            </span>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-[#16865f] uppercase">
                {L('PIPELINE PHASE', 'প্রক্রিয়া পর্যায়')} {S.num} / 05
              </p>
              <h3 className="font-display text-2xl font-black text-[#072f27] mt-0.5">{S.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={active === 0}
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              className="flex items-center gap-1 rounded-xl border border-[#d6e6de] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#123f38] hover:bg-[#edf7f2] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> {L('Prev Step', 'আগের ধাপ')}
            </button>
            <button
              type="button"
              disabled={active === steps.length - 1}
              onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
              className="flex items-center gap-1 rounded-xl bg-[#16865f] px-3 py-1.5 font-mono text-xs font-bold text-white hover:bg-[#127251] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-xs"
            >
              {L('Next Step', 'পরের ধাপ')} <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-5 font-display text-base sm:text-lg font-bold text-[#0c3930] leading-snug">{S.lead}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Plain language explanation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-[#f6faf8] border border-[#d9e9df] p-5">
              <p className="font-mono text-[11px] font-bold tracking-wider text-[#16865f] uppercase">
                {L('COMMUNITY CONTEXT & PURPOSE', 'সহজ ব্যাখ্যা ও তাৎপর্য')}
              </p>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#355248]">{S.simple}</p>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 text-xs sm:text-sm text-amber-900/80">
              <ShieldAlert className="size-4.5 shrink-0 text-amber-600 mt-0.5" />
              <span>
                {L(
                  'Deterministic pipeline: All satellite processing follows standardized formulas. AI never invents numbers.',
                  'নির্দিষ্ট গণনা পদ্ধতি: উপগ্রহের সব হিসাব নির্ধারিত সূত্র মেনে চলে। AI কোনো মনগড়া সংখ্যা তৈরি করে না।'
                )}
              </span>
            </div>
          </div>

          {/* Technical specification terminal */}
          <div className="lg:col-span-5 rounded-2xl bg-[#03231c] p-5 text-white border border-[#093d31] shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <p className="font-mono text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase">
                {L('TELEMETRY & ALGORITHM SPEC', 'কারিগরি ও অ্যালগরিদম স্পেক')}
              </p>
              <span className="font-mono text-[10px] text-emerald-400/80">v2.4-GEE</span>
            </div>
            <div className="mt-4 space-y-3 font-mono text-xs">
              {S.specs.map((sp) => (
                <div key={sp.k} className="flex flex-col border-b border-white/5 pb-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300/60">{sp.k}</span>
                  <span className="text-xs font-semibold text-emerald-100 mt-0.5">{sp.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── honesty checks component ─────────────────────────

function HonestyChecks({ L, bundle }: { L: L; bundle: AnalysisBundle | null }) {
  const checks = [
    {
      id: 'season',
      title: L('Same-Season Dry Window', 'একই শুষ্ক মৌসুম যাচাই'),
      desc: L('Both baseline and target composites use identical Jan–Mar dry periods to avoid tidal false loss.', 'দুই বছরের ছবিই জানুয়ারি–মার্চের নেওয়া যাতে জোয়ার ও বর্ষার প্রভাব না পড়ে।'),
    },
    {
      id: 'area_check',
      title: L('Reference Map Coherence', 'বিজ্ঞানীদের রেফারেন্স মিল'),
      desc: L('Estimated canopy closely aligns with 40-year historical CGMD-AFCC30 ground-truth datasets.', 'ঐতিহাসিক বৈজ্ঞানিক রেকর্ডের সঙ্গে গণনা করা বনের এলাকার সামঞ্জস্য যাচাই হয়।'),
    },
    {
      id: 'images',
      title: L('Sufficient Clear Cloud-Free Pixels', 'পর্যাপ্ত পরিষ্কার পিক্সেল'),
      desc: L('Only composites with high QA60 clear-pixel density are evaluated to eliminate cloud artifacts.', 'মেঘমুক্ত ছবির অনুপাত যথেষ্ট হলেই বিশ্লেষণ সম্পূর্ণ করা হয়।'),
    },
    {
      id: 'fast_change',
      title: L('Believable Rate of Change', 'বিশ্বাসযোগ্য পরিবর্তনের হার'),
      desc: L('Rejects physically implausible deforestation rates that violate biological regeneration speeds.', 'অবিশ্বাস্য বা ভৌগোলিকভাবে অসম্ভব পরিবর্তনের হার ধরা পড়লে সতর্কবার্তা দেয়।'),
    },
    {
      id: 'accuracy',
      title: L('Held-Out Year Validation', 'স্বাধীন বছরে মডেলের পরীক্ষা'),
      desc: L('Random Forest was tested on unseen 2023 satellite imagery to confirm real-world generalization.', '২০২৩ সালের নতুন তথ্যে মডেলটি যাচাই করে উচ্চ নির্ভুলতা নিশ্চিত করা হয়েছে।'),
    },
    {
      id: 'outside',
      title: L('Sundarbans Biome Boundary', 'সুন্দরবনের ভৌগোলিক সীমানা'),
      desc: L('Confirms the scanned circle falls inside the coastal delta and flags non-mangrove ecosystems.', 'বাছাই করা বৃত্তটি সুন্দরবন উপকূলীয় অঞ্চলের অন্তর্ভুক্ত কি না তা নিশ্চিত করে।'),
    },
  ]

  const rel = bundle?.reliability
  const levelBadge = {
    high: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: L('🟢 High Confidence (Fairly Sure)', '🟢 উচ্চ নির্ভরযোগ্যতা (বেশ নিশ্চিত)') },
    medium: { cls: 'bg-amber-100 text-amber-800 border-amber-300', text: L('🟡 Medium Confidence (Review Warnings)', '🟡 মাঝারি নির্ভরযোগ্যতা (সতর্কতা দেখুন)') },
    low: { cls: 'bg-rose-100 text-rose-800 border-rose-300', text: L('🔴 Low Confidence (Do Not Trust)', '🔴 নিম্ন নির্ভরযোগ্যতা (বিশ্বাস করবেন না)') },
    demo: { cls: 'bg-sky-100 text-sky-800 border-sky-300', text: L('🔵 Synthesized Demo Mode', '🔵 ডেমো মোড') },
  }

  const currentBadge = rel ? levelBadge[rel.level] : levelBadge.high

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#edf5f0] border border-[#cce1d5] p-4">
        <div>
          <p className="font-display text-base font-bold text-[#08352b]">
            {L('Automated Integrity & Sanity Filters', 'স্বয়ংক্রিয় সততা ও নির্ভরযোগ্যতা পরীক্ষা')}
          </p>
          <p className="text-xs text-[#4b6a60] mt-0.5">
            {L('MangroveLens proactively tests every query against 6 automated sanity filters.', 'প্রতিটি বিশ্লেষণ চালানোর সময় ৬টি স্বয়ংক্রিয় ফিল্টারে ফলাফল যাচাই করা হয়।')}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-bold ${currentBadge.cls}`}>
          {currentBadge.text}
        </span>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => {
          const problem = rel?.problems.find((p) => p.id === c.id)
          const isDemo = rel?.level === 'demo'
          return (
            <div
              key={c.id}
              className={`rounded-2xl border p-4.5 transition-all ${
                problem
                  ? problem.severity === 'high'
                    ? 'border-rose-300 bg-rose-50/70 shadow-xs'
                    : 'border-amber-300 bg-amber-50/70 shadow-xs'
                  : 'border-[#d2e3d9] bg-white shadow-2xs hover:border-[#16865f]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`grid size-7 place-items-center rounded-lg text-xs ${
                    problem
                      ? problem.severity === 'high'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 text-white'
                      : 'bg-emerald-100 text-[#16865f]'
                  }`}
                >
                  {problem ? <CircleAlert className="size-4" /> : <Check className="size-4" />}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                    problem ? (problem.severity === 'high' ? 'text-rose-700' : 'text-amber-700') : 'text-[#16865f]'
                  }`}
                >
                  {isDemo ? L('DEMO', 'ডেমো') : problem ? L('FLAGGED', 'চিহ্নিত') : L('PASSED', 'উত্তীর্ণ')}
                </span>
              </div>
              <h4 className="mt-3 font-display text-sm font-bold text-[#0c3930]">{c.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-[#506e64]">{c.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────────── main popup presentation ─────────────────────────

export function ProjectTour({ open, onClose, lang, bundle, caps, onJump, onTry }: Props) {
  const L: L = (en, bn) => (lang === 'bn' ? bn : en)
  const [chapter, setChapter] = useState(0)
  const b = bundle

  const chapters: { id: string; icon: typeof Leaf; kicker: string; title: string; body: ReactNode }[] = [
    {
      id: 'welcome',
      icon: Sparkles,
      kicker: L('SYSTEM FOUNDATION & MISSION', 'সিস্টেম পরিচিতি ও মূল লক্ষ্য'),
      title: L('Real Satellites. Honest Numbers. For Villages.', 'আসল উপগ্রহ। সৎ সংখ্যা। গ্রামের জন্য।'),
      body: (
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#03231c] via-[#053229] to-[#084236] p-6 sm:p-8 text-white shadow-md border border-[#0d4f40]">
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-emerald-300 uppercase">
              {L('EXECUTIVE SUMMARY', 'সারসংক্ষেপ')}
            </p>
            <p className="mt-3 font-display text-lg sm:text-xl font-bold leading-relaxed text-emerald-50">
              {L(
                'Pick any coordinate in the Sundarbans and two years. MangroveLens analyzes live Copernicus Sentinel-2 satellite telemetry to determine whether mangrove canopy expanded or eroded, computes the carbon locked in its sediment, and states its uncertainty.',
                'সুন্দরবনের যেকোনো স্থান ও দুটি বছর নির্বাচন করুন। MangroveLens সেন্টিনেল-২ উপগ্রহ থেকে আসল তথ্য বিশ্লেষণ করে জানায় ম্যানগ্রোভ বন বেড়েছে না কমেছে, মাটিতে কত কার্বন জমা আছে এবং ফলাফলের নির্ভুলতার স্তর কতখানি।'
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#cfe0d5] bg-white p-5 shadow-2xs">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[#16865f] border border-emerald-200">
                <Satellite className="size-5" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-bold text-[#0c3830]">
                {L('Real Orbital Telemetry', 'আসল উপগ্রহ তথ্য')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4e6c62]">
                {L(
                  'Direct 10m multispectral processing via Google Earth Engine. Real surface reflectance — never pre-fabricated demo curves.',
                  'গুগল আর্থ ইঞ্জিনের মাধ্যমে সরাসরি ১০ মিটার সেন্টিনেল-২ তথ্য প্রক্রিয়া করা হয় — কোনো কৃত্রিম ডেমো গ্রাফ নয়।'
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#cfe0d5] bg-white p-5 shadow-2xs">
              <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldCheck className="size-5" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-bold text-[#0c3830]">
                {L('Radical Honesty by Design', 'সততা শুরু থেকেই')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4e6c62]">
                {L(
                  'Every carbon figure reports explicit ± error intervals. If clouds or tides degrade confidence, the system warns users upfront.',
                  'প্রতিটি কার্বন হিসেবে স্পষ্ট ± ত্রুটির সীমা থাকে। মেঘ বা জোয়ারে বিভ্রান্তি তৈরি হলে সিস্টেম সরাসরি সতর্কবার্তা প্রদান করে।'
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#cfe0d5] bg-white p-5 shadow-2xs">
              <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                <Users className="size-5" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-bold text-[#0c3830]">
                {L('Built for Local Action', 'গ্রামের জন্য উপযোগী')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4e6c62]">
                {L(
                  'Plain Bengali and English explanations, shareable WhatsApp summary cards, and print-ready briefs for coastal panchayats.',
                  'সহজ বাংলা ও ইংরেজি ভাষা, হোয়াটসঅ্যাপে শেয়ার করার কার্ড এবং উপকূলীয় পঞ্চায়েতের জন্য সহজে ছাপা উপযোগী রিপোর্ট।'
                )}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'problem',
      icon: TrendingDown,
      kicker: L('ECOLOGICAL CONTEXT & CHALLENGE', 'বাস্তুতান্ত্রিক সংকট ও বাস্তবতা'),
      title: L('A Crucial Carbon Sink Guarded by Too Few Eyes', 'বিশাল কার্বন ভাণ্ডার, নজরদারির অভাব'),
      body: (
        <div className="space-y-6">
          {/* Visual Showcase Card with Generated AI Aerial Image */}
          <div className="relative overflow-hidden rounded-3xl border border-[#cbe1d5] shadow-xs group">
            <img
              src="/images/tour/sundarbans-aerial.jpg"
              alt="High Altitude Satellite View of Sundarbans Delta"
              className="h-56 sm:h-72 w-full object-cover group-hover:scale-101 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#021c17] via-[#021c17]/60 to-transparent flex items-end p-6 sm:p-7">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 backdrop-blur-md px-3 py-1 font-mono text-[10.5px] font-bold text-emerald-300 border border-emerald-400/30">
                  <Globe className="size-3.5" /> {L('VULNERABLE TIDAL ECOSYSTEM', 'ঝুঁকিপূর্ণ উপকূলীয় বাস্তুতন্ত্র')}
                </span>
                <p className="mt-2 font-display text-lg sm:text-2xl font-bold text-white leading-snug">
                  {L('~4,200 km² of Mangrove Forest Shielding 4.5+ Million People', '৪,২০০ বর্গকিমির বেশি ম্যানগ্রোভ বন যা ৪৫ লাখের বেশি মানুষকে রক্ষা করে')}
                </p>
                <p className="mt-1 font-sans text-xs sm:text-sm text-emerald-100/80 max-w-2xl hidden sm:block">
                  {L(
                    'The Sundarbans forms the planet’s largest continuous mangrove biome, dampening deadly cyclone surges and sequestering gigatons of coastal blue carbon.',
                    'সুন্দরবন পৃথিবীর বৃহত্তম ম্যানগ্রোভ বনভূমি, যা উপকূলীয় প্রলয়ঙ্করী ঘূর্ণিঝড় আটকে দেয় এবং কোটি কোটি টন ব্লু কার্বন ধরে রাখে।'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
              <div className="flex items-center gap-2 text-rose-800 font-mono text-xs font-bold uppercase tracking-wider">
                <TrendingDown className="size-4 text-rose-600" /> {L('CHALLENGE 1', 'সমস্যা ১')}
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-rose-950">
                {L('Unnoticed Perimeter Erosion', 'চোখের আড়ালে ভাঙন')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-rose-900/80">
                {L(
                  'Cyclonic surges, shifting mudflats, and localized illegal clearing erode forest fringes gradually. Conventional annual surveys spot damage only years later.',
                  'ঘূর্ণিঝড়, নদীভাঙন আর গোপনে গাছ কাটায় বনের কিনারা হারিয়ে যায়। সাধারণ বার্ষিক সমীক্ষায় এই ক্ষতি বুঝতে অনেক দেরি হয়ে যায়।'
                )}
              </p>
              <div className="mt-4 rounded-xl bg-white/80 p-3 border border-rose-200 text-xs text-[#0d3b31]">
                <b>{L('MangroveLens Solution:', 'আমাদের সমাধান:')}</b>{' '}
                {L('10m resolution change detection captures localized patches at sub-hectare scales.', '১০ মিটার রেজোলিউশনের উপগ্রহ ছবি সাব-হেক্টর পর্যায় পর্যন্ত ভাঙন বা ক্ষয় চিহ্নিত করে।')}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <div className="flex items-center gap-2 text-amber-800 font-mono text-xs font-bold uppercase tracking-wider">
                <CircleAlert className="size-4 text-amber-600" /> {L('CHALLENGE 2', 'সমস্যা ২')}
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-amber-950">
                {L('Unchecked Carbon Claims', 'যাচাইহীন কার্বনের দাবি')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-amber-900/80">
                {L(
                  'Commercial offset initiatives frequently advertise inflated carbon statistics without stating underlying error intervals or model assumptions.',
                  'বাণিজ্যিক কার্বন প্রকল্পগুলো প্রায়ই অতিরঞ্জিত কার্বন সংখ্যা দাবি করে, যার পেছনে কোনো নির্দিষ্ট বৈজ্ঞানিক ত্রুটি বা প্রমাণের উল্লেখ থাকে না।'
                )}
              </p>
              <div className="mt-4 rounded-xl bg-white/80 p-3 border border-amber-200 text-xs text-[#0d3b31]">
                <b>{L('MangroveLens Solution:', 'আমাদের সমাধান:')}</b>{' '}
                {L('Strict IPCC 2013 Wetlands Tier 1 math with explicit uncertainty bounds on every figure.', 'আন্তর্জাতিক IPCC টিয়ার ১ মানদণ্ড এবং প্রতিটি সংখ্যার সঙ্গে স্পষ্ট ± ত্রুটির পরিসর।')}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2 text-emerald-800 font-mono text-xs font-bold uppercase tracking-wider">
                <Users className="size-4 text-emerald-600" /> {L('CHALLENGE 3', 'সমস্যা ৩')}
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-emerald-950">
                {L('Data Isolated from Villages', 'তথ্য গ্রামে পৌঁছায় না')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-emerald-900/80">
                {L(
                  'Remote sensing data has stayed locked inside GIS software and English academic journals, out of reach of the local panchayats who protect embankments.',
                  'উপগ্রহ তথ্য সাধারণত দামি জিআইএস সফটওয়্যার ও জটিল ইংরেজি রিপোর্টে আবদ্ধ থাকে, যা বাঁধ পাহারা দেওয়া গ্রামবাসীর কোনো কাজে আসে না।'
                )}
              </p>
              <div className="mt-4 rounded-xl bg-white/80 p-3 border border-emerald-200 text-xs text-[#0d3b31]">
                <b>{L('MangroveLens Solution:', 'আমাদের সমাধান:')}</b>{' '}
                {L('Bilingual Bengali/English delivery, WhatsApp cards, and plain-language verdicts.', 'বাংলা ও ইংরেজি দ্বৈত ভাষা, হোয়াটসঅ্যাপ কার্ড এবং সহজ বোধগম্য চূড়ান্ত সিদ্ধান্ত।')}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'pipeline',
      icon: Layers,
      kicker: L('METHODOLOGICAL WORKFLOW', 'পদ্ধতি ও ধাপসমূহ'),
      title: L('From Raw Photons to Actionable Answers', 'উপগ্রহ চিত্র থেকে কার্যকর পদক্ষেপ'),
      body: <Pipeline L={L} />,
    },
    {
      id: 'architecture',
      icon: Network,
      kicker: L('SYSTEM ARCHITECTURE', 'সিস্টেমের সামগ্রিক নকশা'),
      title: L('How the Pieces Fit Together', 'অংশগুলো কীভাবে কাজ করে'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-[#46665c]">
            {L(
              'A multi-tier cloud architecture linking European Space Agency imagery, Google Earth Engine compute, FastAPI machine learning microservices, and client-side geospatial rendering.',
              'ইউরোপীয় স্পেস এজেন্সি, গুগল আর্থ ইঞ্জিন ক্লাউড, ফাস্ট-এপিআই মেশিন লার্নিং এবং ক্লায়েন্ট-সাইড মানচিত্র প্রদর্শনীর সমন্বয়ে তৈরি আধুনিক আর্কিটেকচার।'
            )}
          </p>
          <div className="rounded-3xl border border-[#cbe1d5] bg-white p-5 sm:p-7 shadow-xs">
            <ArchitectureDiagram L={L} />
          </div>
        </div>
      ),
    },
    {
      id: 'dataflow',
      icon: Workflow,
      kicker: L('INTERACTIVE DATA FLOW', 'তথ্য প্রবাহের সিমুলেশন'),
      title: L('What Happens When You Click “Run”', '“Run” বোতাম চাপলে ভেতরে কী ঘটে'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-[#46665c]">
            {L(
              'Press the Play button below to trace a live query through coordinate validation, orbital satellite querying, cloud compositing, canopy classification, and carbon calculation.',
              'নিচের প্লে বোতাম চেপে দেখুন কীভাবে একটি অনুরোধ উপগ্রহ থেকে ছবি এনে, মেঘ পরিষ্কার করে, বন চিহ্নিত করে কার্বন হিসেবে রূপান্তরিত হয়।'
            )}
          </p>
          <div className="rounded-3xl border border-[#cbe1d5] bg-white p-5 sm:p-7 shadow-xs">
            <AnalysisFlow L={L} />
          </div>
        </div>
      ),
    },
    {
      id: 'live_example',
      icon: MapPin,
      kicker: L('ACTIVE DASHBOARD TELEMETRY', 'বর্তমান লাইভ বিশ্লেষণ'),
      title: L('Reading the Numbers on Your Screen', 'স্ক্রিনের ফলাফলগুলো বুঝুন'),
      body: (
        <div className="space-y-6">
          {!b ? (
            <div className="rounded-2xl border border-dashed border-[#b8d4c5] bg-[#edf6f1] p-8 text-center">
              <MapPin className="mx-auto size-8 text-[#16865f] opacity-60" />
              <p className="mt-3 font-display text-base font-bold text-[#0c3830]">
                {L('No Active Analysis Loaded', 'এখনো কোনো বিশ্লেষণ লোড হয়নি')}
              </p>
              <p className="mt-1 text-xs text-[#527066]">
                {L('Close this guide and press “Run Analysis” to view live coordinates, canopy metrics, and carbon figures.', 'এই গাইড বন্ধ করে ড্যাশবোর্ডে “Run Analysis” বোতাম চাপুন।')}
              </p>
            </div>
          ) : (
            <>
              {/* Telemetry metadata header */}
              <div className="rounded-2xl border border-[#cde0d5] bg-[#f6faf8] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8e8de] pb-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#0c3c31] font-bold">
                    <MapPin className="size-4 text-[#16865f]" />
                    <span>
                      {b.request.lat.toFixed(4)}°N, {b.request.lon.toFixed(4)}°E
                    </span>
                    <span className="text-[#88a89b]">·</span>
                    <span>Ø {fmt(b.request.radiusKm * 2, 1, lang)} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[#16865f] font-bold border border-[#cde0d5]">
                      {b.request.startDate.slice(0, 4)} → {b.request.endDate.slice(0, 4)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 font-bold">
                      <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {b.dataSource.isRealData ? L('Copernicus Sentinel-2', 'সেন্টিনেল-২ তথ্য') : L('Synthesized Demo', 'সিন্থেসাইজড ডেমো')}
                    </span>
                  </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-[#d2e3d8] bg-white p-4">
                    <p className="font-mono text-[11px] font-bold text-[#628076] uppercase">{L('Baseline Canopy', 'শুরুর বন')}</p>
                    <p className="mt-1 font-condensed text-3xl font-black text-[#0b382f]">
                      {fmt(b.summary.start.mangroveHa, 1, lang)} <span className="font-sans text-sm font-semibold">ha</span>
                    </p>
                    <p className="text-[11px] text-[#6c877e] mt-0.5">{b.request.startDate.slice(0, 4)} composite</p>
                  </div>

                  <div className="rounded-xl border border-[#d2e3d8] bg-white p-4">
                    <p className="font-mono text-[11px] font-bold text-[#628076] uppercase">{L('Target Canopy', 'শেষের বন')}</p>
                    <p className="mt-1 font-condensed text-3xl font-black text-[#0b382f]">
                      {fmt(b.summary.end.mangroveHa, 1, lang)} <span className="font-sans text-sm font-semibold">ha</span>
                    </p>
                    <p className="text-[11px] text-[#6c877e] mt-0.5">{b.request.endDate.slice(0, 4)} composite</p>
                  </div>

                  <div className="rounded-xl border border-[#d2e3d8] bg-white p-4">
                    <p className="font-mono text-[11px] font-bold text-[#628076] uppercase">{L('Net Canopy Change', 'মোট পরিবর্তন')}</p>
                    <p className={`mt-1 font-condensed text-3xl font-black ${b.change.percentChange >= 0 ? 'text-[#16865f]' : 'text-rose-600'}`}>
                      {signed(b.change.netChangeHa, 1, lang)} <span className="font-sans text-sm font-semibold">ha</span>
                    </p>
                    <p className="text-[11px] font-mono font-bold text-[#4c6d62] mt-0.5">
                      ({signed(b.change.percentChange, 1, lang)}%)
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#d2e3d8] bg-white p-4">
                    <p className="font-mono text-[11px] font-bold text-[#628076] uppercase">{L('Total Blue Carbon', 'জমা ব্লু কার্বন')}</p>
                    <p className="mt-1 font-condensed text-3xl font-black text-[#0b382f]">
                      {fmt(b.carbon.end.co2eMg, 0, lang)} <span className="font-sans text-sm font-semibold">t CO₂e</span>
                    </p>
                    <p className="text-[11px] text-[#6c877e] mt-0.5">± {fmt((b.carbon.end.co2eMg * 0.15), 0, lang)} t (Tier 1)</p>
                  </div>
                </div>
              </div>

              {/* Jump to specific dashboard tool */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#16865f]">
                  {L('EXPLORE DEEP-DIVE TOOLS ON THE DASHBOARD', 'ড্যাশবোর্ডের বিশেষ টুলসমূহ')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <JumpButton label={L('Verdict & Summary Card', 'সিদ্ধান্ত ও সারাংশ')} onClick={() => onJump('verdict')} />
                  <JumpButton label={L('Before / After Satellite Slider', 'আগে / পরে উপগ্রহ স্লাইডার')} onClick={() => onJump('compare')} />
                  <JumpButton label={L('Carbon Pool Metrics', 'কার্বন পরিসংখ্যান')} onClick={() => onJump('metrics')} />
                  <JumpButton label={L('Yearly Trends & 5-Year Scenarios', 'বার্ষিক ধারা ও ৫ বছরের চিত্র')} onClick={() => onJump('trends')} />
                  <JumpButton label={L('Science Lab (Confusion Matrix & Evidence)', 'সায়েন্স ল্যাব (ম্যাট্রিক্স ও প্রমাণ)')} onClick={() => onJump('technical-lab')} />
                </div>
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'honesty',
      icon: ShieldCheck,
      kicker: L('DATA INTEGRITY & ERROR DETECTION', 'সততা ও বিশ্বাসযোগ্যতা যাচাই'),
      title: L('It Knows When Not to Be Trusted', 'কখন ভুল হতে পারে তাও জানিয়ে দেয়'),
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#416258] leading-relaxed max-w-4xl">
            {L(
              'Conventional mapping tools provide answers even when satellite imagery is ruined by monsoon cloud banks or tidal surges. MangroveLens runs 6 continuous sanity filters. If data is dubious, it warns you directly.',
              'অনেক ক্ষেত্রে মেঘ বা জোয়ারের কারণে উপগ্রহ ছবি নষ্ট হলেও ভুল উত্তর আসে। MangroveLens স্বয়ংক্রিয়ভাবে ৬টি ধাপ পরীক্ষা করে জানায় উপাত্তটি কতটা বিশ্বাসযোগ্য।'
            )}
          </p>

          <HonestyChecks L={L} bundle={b} />

          {b?.accuracy && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs sm:text-sm text-emerald-950 font-medium">
              {L('Model Validation Result: On held-out 2023 satellite data that the classifier never trained on, it achieved an overall accuracy of', 'মডেল পরীক্ষার ফলাফল: ২০২৩ সালের সম্পূর্ণ অপ্রশিক্ষিত উপগ্রহ তথ্যে মডেলটির নির্ভুলতার হার')}{' '}
              <b className="font-mono font-bold text-emerald-800">{fmt(b.accuracy.overallAccuracy * 100, 1, lang)}%</b>{' '}
              {L('against scientific reference surveys.', 'বিজ্ঞানী মানচিত্রের তুলনায়।')}
            </div>
          )}

          {/* Interactive Try Test Cases */}
          <div className="pt-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#16865f]">
              {L('TEST UNRELIABLE SCENARIOS (WATCH THE FILTERS TRIGGER IN REAL TIME):', 'পরীক্ষা করে দেখুন — সতর্কবার্তা কীভাবে আসে (লাইভ ১-২ মিনিট):')}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onTry({ label: 'Gosaba Village Overcount Test', lat: 22.165, lon: 88.805, startDate: '2020-01-01', endDate: '2026-03-31' })}
                className="group flex items-start gap-3.5 rounded-2xl border border-[#cbe1d5] bg-white p-4 text-left transition-all hover:border-[#16865f] hover:shadow-xs cursor-pointer"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 group-hover:bg-[#16865f] group-hover:text-white transition-colors">
                  <Play className="size-4" />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-[#0c3830]">
                    {L('Test Case 1: Inhabited Village Settlement', 'পরীক্ষা ১: জনবসতিপূর্ণ এলাকা (গোসাবা)')}
                  </p>
                  <p className="mt-1 text-xs text-[#59756b] leading-relaxed">
                    {L('Village homestead orchards reflect like mangrove — our settlement proximity check automatically flags the risk of false positives.', 'গ্রামের গাছপালা ম্যানগ্রোভের মতো দেখায় — জনবসতি সতর্কতা সিস্টেম এটি স্বয়ংক্রিয়ভাবে চিহ্নিত করে।')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onTry({ label: 'Seasonal Contrast Distortion Test', lat: 22.12, lon: 88.83, startDate: '2019-02-01', endDate: '2022-07-08' })}
                className="group flex items-start gap-3.5 rounded-2xl border border-[#cbe1d5] bg-white p-4 text-left transition-all hover:border-[#16865f] hover:shadow-xs cursor-pointer"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-800 group-hover:bg-[#16865f] group-hover:text-white transition-colors">
                  <Play className="size-4" />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-[#0c3830]">
                    {L('Test Case 2: Dry vs Monsoon Season Clash', 'পরীক্ষা ২: শুষ্ক বনাম বর্ষা মৌসুমের অসঙ্গতি')}
                  </p>
                  <p className="mt-1 text-xs text-[#59756b] leading-relaxed">
                    {L('Feb (dry) vs July (monsoon): cloud spray and deep water falsely look like forest dieback. System issues 🔴 “Do Not Trust”.', 'ফেব্রুয়ারি বনাম জুলাই: বর্ষার জল ও মেঘকে বন হারানোর মতো মনে হয় — সিস্টেম 🔴 “বিশ্বাস করবেন না” চিহ্ন দেয়।')}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'carbon',
      icon: Leaf,
      kicker: L('BIOGEOCHEMICAL ACCOUNTING', 'কার্বন বিজ্ঞান ও হিসাব'),
      title: L('Transparent Math, Never a Black Box', 'স্বচ্ছ গণিত — কোনো অজানা রহস্য নয়'),
      body: (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Column 1: IPCC Tier 1 Pools */}
            <div className="lg:col-span-7 rounded-3xl border border-[#cbe1d5] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5efe9] pb-3">
                <h3 className="font-display text-base font-bold text-[#09352c]">
                  {L('IPCC 2013 Wetlands Tier 1 Carbon Pools', 'IPCC ২০১৩ টিয়ার ১ কার্বন স্তরসমূহ')}
                </h3>
                <span className="font-mono text-xs font-bold text-[#16865f]">283.1 Mg C / ha</span>
              </div>

              {/* Visual asset of mangrove stilt roots & sediment */}
              <div className="relative overflow-hidden rounded-2xl border border-[#cbe1d5] shadow-xs group">
                <img
                  src="/images/tour/mangrove-roots.jpg"
                  alt="Mangrove Roots and Soil Organic Carbon Sediment"
                  className="h-44 sm:h-52 w-full object-cover group-hover:scale-101 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#021f1a] via-[#021f1a]/40 to-transparent flex items-end p-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 backdrop-blur-md px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                      <Leaf className="size-3" /> {L('DEEP TIDAL MUD SEDIMENT', 'গভীর মাটির কার্বন সঞ্চয়')}
                    </span>
                    <p className="mt-1 font-display text-xs sm:text-sm font-bold text-white">
                      {L('63.6% of blue carbon is locked below ground in anaerobic mud (180.0 t C/ha)', '৬৩.৬% ব্লু কার্বন মাটির নিচের কাদায় জমা থাকে (১৮০.০ টন/হেক্টর)')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#03231c] p-4 text-center font-mono text-xs sm:text-sm text-emerald-200">
                Carbon = Mangrove Area (ha) × 283.1 t C/ha × 3.667 CO₂e
              </div>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    name: L('Above-Ground Biomass (Trunks & Foliage)', 'মাটির উপরের অংশ (কাণ্ড ও ডালপালা)'),
                    val: 74.2,
                    pct: 26.2,
                    color: 'bg-emerald-600',
                  },
                  {
                    name: L('Below-Ground Roots (Pneumatophore System)', 'মাটির নিচের শিকড় ব্যবস্থা'),
                    val: 28.9,
                    pct: 10.2,
                    color: 'bg-teal-600',
                  },
                  {
                    name: L('Soil Organic Carbon (Top 1m Anoxic Mud)', 'মাটির জৈব কার্বন (উপরের ১ মিটার কাদা)'),
                    val: 180.0,
                    pct: 63.6,
                    color: 'bg-[#0f5442]',
                  },
                ].map((pool) => (
                  <div key={pool.val} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-[#294c41]">
                      <span>{pool.name}</span>
                      <span className="font-mono font-bold">{pool.val} t C/ha ({pool.pct}%)</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#e3efe7] overflow-hidden">
                      <div className={`h-full rounded-full ${pool.color}`} style={{ width: `${pool.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#5f7d73] leading-relaxed pt-2">
                {L(
                  'Notice that over 63% of blue carbon is locked inside the anaerobic tidal sediment, not in the trees alone. When mangroves erode, this ancient soil carbon oxidizes into atmospheric CO₂.',
                  'লক্ষ্য করুন, ৬৩%-এর বেশি ব্লু কার্বন গাছের চেয়ে মাটির নিচে জমা থাকে। বন হারিয়ে গেলে এই শতাব্দী প্রাচীন কার্বন বাতাসে মিশে যায়।'
                )}
              </p>
            </div>

            {/* Column 2: 5-Year Scenarios */}
            <div className="lg:col-span-5 rounded-3xl border border-[#cbe1d5] bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-display text-base font-bold text-[#09352c]">
                {L('Five-Year Scenario Projections', 'আগামী ৫ বছরের ভবিষ্যৎ চিত্র')}
              </h3>

              <div className="space-y-3">
                <div className="rounded-2xl border border-[#d6e6dc] bg-[#f8faf9] p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#144238]">
                    <ArrowRight className="size-4 text-[#16865f]" /> {L('Status Quo Continuation', 'বর্তমান ধারা')}
                  </div>
                  <p className="mt-1 text-xs text-[#527267] leading-relaxed">
                    {L('Extrapolates the confirmed annual rate of net canopy change forward by 5 years.', 'সাম্প্রতিক বছরের নিশ্চিত পরিবর্তনের গতি অনুসারেই বন বাড়বে বা কমবে।')}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <TrendingDown className="size-4 text-rose-600" /> {L('Severe Stress / Cyclone Scenario', 'দুর্যোগ বা চরম ক্ষতি')}
                  </div>
                  <p className="mt-1 text-xs text-rose-800/80 leading-relaxed">
                    {L('Simulates cyclonic embankment breaches (+100% additional loss per year).', 'ঝড়ে বাঁধ ভাঙলে বা ক্ষতি দ্বিগুণ হলে বনের আয়তন ও কার্বন কীভাবে দ্রুত কমবে।')}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <TrendingUp className="size-4 text-emerald-700" /> {L('Protection & Restoration Target', 'সংরক্ষণ ও রোপণ')}
                  </div>
                  <p className="mt-1 text-xs text-emerald-900/80 leading-relaxed">
                    {L('Models halving loss rates and expanding community sapling planting by +50%.', 'ক্ষতি ৫০% কমিয়ে সামাজিক বনায়ন ৫০% বাড়ালে কার্বনের পুনরুদ্ধার।')}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#edf5f0] p-3 text-[11px] text-[#416257]">
                {L('AI Guardrail: Gemini language model only converts equations to words; it cannot invent numbers.', 'AI গার্ডরেল: জেমিনাই কেবল লেখা সহজ করতে পারে, কোনো সংখ্যা বানাতে পারে না।')}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tech',
      icon: Code2,
      kicker: L('FULL TECHNICAL SPECIFICATION', 'প্রযুক্তি কাঠামো'),
      title: L('Open Science, Transparent Engineering', 'উন্মুক্ত বিজ্ঞান ও আধুনিক সফটওয়্যার প্রযুক্তি'),
      body: (
        <div className="space-y-6">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Satellite,
                cat: L('Orbital Telemetry', 'উপগ্রহ তথ্য'),
                items: ['Copernicus Sentinel-2 MSI L2A', 'CGMD-AFCC30 30m historical archive', 'IPCC 2013 Wetlands Supplement'],
              },
              {
                icon: Cloud,
                cat: L('Cloud Geocomputation', 'ক্লাউড প্রসেসিং'),
                items: ['Google Earth Engine Python API', 'QA60 & SCL cloud shadow masking', '90-day per-pixel median reduction', 'NDVI & NDWI multispectral features'],
              },
              {
                icon: BrainCircuit,
                cat: L('Machine Learning Core', 'মেশিন লার্নিং'),
                items: ['Random Forest (200 decision trees)', 'Held-out test validation (2023)', '0.5 ha Minimum Mapping Unit (MMU)'],
              },
              {
                icon: FlaskConical,
                cat: L('Carbon & Forecasting', 'কার্বন ও পূর্বাভাস'),
                items: ['First-order Taylor error propagation', 'Tier 1 biomass & sediment pools', '3-scenario five-year projection engine'],
              },
              {
                icon: Code2,
                cat: L('Application Engine', 'ওয়েব প্ল্যাটফর্ম'),
                items: ['FastAPI asynchronous microservice', 'React 19 + TypeScript + Vite', 'Leaflet spatial map layers', 'Recharts interactive analytics'],
              },
              {
                icon: FileText,
                cat: L('Field Delivery & Safety', 'মাঠ পর্যায় ও নিরাপত্তা'),
                items: ['Bilingual Bengali & English UI', 'Deterministic PDF generator', '1-click WhatsApp card sharing', 'Numerical verification guardrails'],
              },
            ].map((col) => {
              const ColIcon = col.icon
              return (
                <div key={col.cat} className="rounded-2xl border border-[#cbe1d5] bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-[#16865f] border border-emerald-200">
                      <ColIcon className="size-4" />
                    </span>
                    <h3 className="font-display text-sm font-bold text-[#0c3930]">{col.cat}</h3>
                  </div>
                  <ul className="mt-3.5 space-y-2 border-t border-[#eaf2ed] pt-3">
                    {col.items.map((it) => (
                      <li key={it} className="flex items-start gap-2 font-mono text-xs text-[#46655c]">
                        <span className="text-[#16865f] font-bold">›</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#edf6f1] border border-[#c6decfa8] p-4 font-mono text-xs text-[#2c4e43]">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${caps?.liveEngine ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>
                {caps?.liveEngine
                  ? L('Google Earth Engine: Connected & Live', 'গুগল আর্থ ইঞ্জিন: সংযুক্ত ও লাইভ')
                  : L('Google Earth Engine: Offline (Synthesized Demo Mode)', 'গুগল আর্থ ইঞ্জিন: অফলাইন (ডেমো মোড)')}
              </span>
            </div>
            <span>Version: 2.4.0-production</span>
          </div>
        </div>
      ),
    },
    {
      id: 'impact',
      icon: GraduationCap,
      kicker: L('WHO IT HELPS & ROADMAP', 'কাদের কাজে লাগে ও ভবিষ্যৎ পরিকল্পনা'),
      title: L('From Satellite Sensors to Local Action', 'উপগ্রহ থেকে স্থানীয় বাস্তব পদক্ষেপ'),
      body: (
        <div className="space-y-8">
          {/* Visual Showcase Card with Generated AI Community Planting Image */}
          <div className="relative overflow-hidden rounded-3xl border border-[#cbe1d5] shadow-xs group">
            <img
              src="/images/tour/community-action.jpg"
              alt="Community Mangrove Planting in the Sundarbans Delta"
              className="h-56 sm:h-72 w-full object-cover group-hover:scale-101 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#021813] via-[#021813]/60 to-transparent flex items-end p-6 sm:p-7">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 backdrop-blur-md px-3 py-1 font-mono text-[10.5px] font-bold text-emerald-300 border border-emerald-400/30">
                  <Users className="size-3.5" /> {L('GRASSROOTS COASTAL RESILIENCE', 'স্থানীয় জনগণের অংশগ্রহণ')}
                </span>
                <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                  {L('Empowering Panchayats & Forest Guards with Actionable Satellite Telemetry', 'পঞ্চায়েত ও বনকর্মীদের জন্য উপগ্রহ ভিত্তিক কার্যকর তথ্য')}
                </h3>
                <p className="mt-1 font-sans text-xs sm:text-sm text-emerald-100/80 max-w-2xl hidden sm:block">
                  {L(
                    'Transforming complex remote sensing data into on-the-ground embankment protection, sapling planting, and rapid loss response.',
                    'মহাকাশের জটিল তথ্যকে মাটিতে বাঁধ রক্ষা, চারা রোপণ ও দ্রুত ব্যবস্থা গ্রহণের হাতিয়ারে রূপান্তর।'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Section A: 4 Stakeholders with rich high-density design */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#16865f] mb-3.5">
              {L('PRIMARY STAKEHOLDERS & BENEFICIARIES', 'মূল ব্যবহারকারী ও সুবিধাভোগী')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Stakeholder 1 */}
              <div className="rounded-2xl border border-[#cbe1d5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-[#16865f]">
                      <Users className="size-5" />
                    </span>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {L('COMMUNITY', 'সমাজ')}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-bold text-[#0a352c]">
                    {L('Gram Panchayats', 'গ্রাম পঞ্চায়েত')}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4b6a5f]">
                    {L(
                      'Understand local forest erosion in plain Bengali. Locate vulnerable earthen embankments that require priority mangrove planting before storms.',
                      'সহজ বাংলায় নিজেদের এলাকার বনের ভাঙন বোঝা। ঝড়ের আগে কোন বাঁধের কাছে নতুন চারা রোপণ জরুরি তা চিহ্নিত করা।'
                    )}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#edf4f0] flex flex-wrap gap-1 text-[10.5px] font-mono font-semibold text-[#185544]">
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">Bengali UI</span>
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">WhatsApp Cards</span>
                </div>
              </div>

              {/* Stakeholder 2 */}
              <div className="rounded-2xl border border-[#cbe1d5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-800">
                      <Leaf className="size-5" />
                    </span>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      {L('ENFORCEMENT', 'নজরদারি')}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-bold text-[#0a352c]">
                    {L('Forest Department', 'বন দপ্তর')}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4b6a5f]">
                    {L(
                      'Spot newly emerging deforestation hotspots and clandestine clearings. Dispatch field boat patrols to exact GPS coordinates rather than searching blindly.',
                      'কোথায় নতুন করে গাছ কাটা বা ভাঙন হচ্ছে দ্রুত শনাক্ত করা। অন্ধের মতো টহল না দিয়ে নির্দিষ্ট জিপিএস স্থানে টিম পাঠানো।'
                    )}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#edf4f0] flex flex-wrap gap-1 text-[10.5px] font-mono font-semibold text-[#185544]">
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">Change Polygons</span>
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">GPS Coordinates</span>
                </div>
              </div>

              {/* Stakeholder 3 */}
              <div className="rounded-2xl border border-[#cbe1d5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-800">
                      <ShieldCheck className="size-5" />
                    </span>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {L('VERIFICATION', 'যাচাই')}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-bold text-[#0a352c]">
                    {L('NGOs & Restorers', 'এনজিও ও পুনরুদ্ধার')}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4b6a5f]">
                    {L(
                      'Track whether replanted mudflats actually survive over 3–5 year horizons. Verify real canopy closure instead of unverified sapling purchase receipts.',
                      'রোপণ করা ম্যানগ্রোভ চারা সত্যিই আগামী ৩-৫ বছর টিকে থাকছে কি না তা উপগ্রহ দিয়ে স্বাধীনভাবে যাচাই করা।'
                    )}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#edf4f0] flex flex-wrap gap-1 text-[10.5px] font-mono font-semibold text-[#185544]">
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">Multi-Year Trends</span>
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">Canopy Metrics</span>
                </div>
              </div>

              {/* Stakeholder 4 */}
              <div className="rounded-2xl border border-[#cbe1d5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-800">
                      <FlaskConical className="size-5" />
                    </span>
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {L('ACADEMIA', 'গবেষণা')}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-bold text-[#0a352c]">
                    {L('Researchers & ESG', 'গবেষক ও পরিবেশবিদ')}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#4b6a5f]">
                    {L(
                      'Audit full methodological transparency: confusion matrices, F1 scores, held-out year validation, and raw GeoJSON telemetry exports.',
                      'সম্পূর্ণ উন্মুক্ত কার্যপদ্ধতি, কনফিউশন ম্যাট্রিক্স, নির্ভুলতার স্কোর এবং গবেষণার জন্য ওপেন ডেটা ডাউনলোড।'
                    )}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#edf4f0] flex flex-wrap gap-1 text-[10.5px] font-mono font-semibold text-[#185544]">
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">Confusion Matrix</span>
                  <span className="bg-[#edf6f1] px-2 py-0.5 rounded">JSON / CSV Export</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Known Limits vs. Development Roadmap (Rich structured cards instead of plain bullet dots) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Known Limits */}
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-amber-700" />
                  <h3 className="font-display text-base font-bold text-amber-950">
                    {L('Known Scientific Limits & Safeguards', 'জানা সীমাবদ্ধতা ও সুরক্ষাব্যবস্থা')}
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  {L('TRANSPARENCY', 'স্বচ্ছতা')}
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-2xl bg-white/90 p-4 border border-amber-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>{L('Village & Farmstead Vegetation', 'গ্রামের গাছপালা ও খেতের প্রতিফলন')}</span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Auto-Flagged</span>
                  </div>
                  <p className="mt-1.5 text-xs text-amber-900/80 leading-relaxed">
                    {L(
                      'Homestead trees (coconut, betel palm) near settlements can register spectral reflectance similar to mangrove canopy. MangroveLens includes automated settlement proximity warnings.',
                      'গ্রামের বসতবাড়ির গাছপালা উপগ্রহে ম্যানগ্রোভের মতো লাগতে পারে। আমাদের সিস্টেম গ্রামের কাছের বৃত্তের ক্ষেত্রে আগেই সতর্কতা দেখায়।'
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/90 p-4 border border-amber-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>{L('IPCC Regional Tier 1 Averages', 'টিয়ার ১ আঞ্চলিক কার্বন গড়')}</span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Explicit ± Error</span>
                  </div>
                  <p className="mt-1.5 text-xs text-amber-900/80 leading-relaxed">
                    {L(
                      'Calculates carbon stock using IPCC 2013 standard figures (283.1 t C/ha) rather than destructive core drilling. Intended for regional planning, not commercial carbon offsets.',
                      'সরাসরি মাটি না কেটে আন্তর্জাতিক আইপিসিসি মান অনুযায়ী হিসাব করা হয়। এটি আঞ্চলিক পরিকল্পনার জন্য প্রযোজ্য।'
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/90 p-4 border border-amber-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>{L('Monsoon Cloud Cover & High Tides', 'বর্ষার মেঘ ও ভরা জোয়ারের সীমাবদ্ধতা')}</span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Dry Window Only</span>
                  </div>
                  <p className="mt-1.5 text-xs text-amber-900/80 leading-relaxed">
                    {L(
                      'Submerged breathing roots and dense monsoon cloud cover interfere with optical sensors. Analyses are strictly restricted to 90-day dry-season median composites.',
                      'ভরা জোয়ারে গাছের শ্বাসমূল ডুবে থাকে এবং বর্ষায় মেঘ থাকে। তাই সিস্টেম কেবল জানুয়ারি–মার্চের শুকনো ছবি বিশ্লেষণ করে।'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Development Roadmap */}
            <div className="rounded-3xl border border-[#cbe1d5] bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5efe9] pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="size-5 text-[#16865f]" />
                  <h3 className="font-display text-base font-bold text-[#09352c]">
                    {L('Active Engineering Roadmap', 'ভবিষ্যৎ কর্মপরিকল্পনা ও রোডম্যাপ')}
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {L('HORIZONS', 'পরবর্তী পদক্ষেপ')}
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-2xl bg-[#f6faf8] p-4 border border-[#d6e8dc]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0a352b]">
                    <span>{L('1. Ranger Ground-Truthing Mobile App', '১. বনরক্ষীদের জন্য গ্রাউন্ড-ট্রুথিং অ্যাপ')}</span>
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">In Design</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#4c6a60] leading-relaxed">
                    {L(
                      'Enabling field forest teams and youth to submit geotagged photos of seedling growth to continuously calibrate machine learning weights.',
                      'মাঠের কর্মীরা যাতে সরাসরি ছবি তুলে জিপিএস লোকেশন দিয়ে কৃত্রিম বুদ্ধিমত্তার মানচিত্র আরও নিখুঁত করতে পারেন।'
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f6faf8] p-4 border border-[#d6e8dc]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0a352b]">
                    <span>{L('2. Sentinel-1 SAR Radar Fusion', '২. সেন্টিনেল-১ রাডার ফিউশন')}</span>
                    <span className="font-mono text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded">In Development</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#4c6a60] leading-relaxed">
                    {L(
                      'Integrating Synthetic Aperture Radar (SAR) to penetrate heavy monsoon clouds and differentiate tidal water levels from permanent canopy loss.',
                      'রাডার প্রযুক্তি যুক্ত করা হচ্ছে যাতে বর্ষার ঘন মেঘ ভেদ করেও বছরজুড়ে জোয়ার ও বনের অবস্থা পর্যবেক্ষণ করা যায়।'
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f6faf8] p-4 border border-[#d6e8dc]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0a352b]">
                    <span>{L('3. Regional Sediment Soil Carbon Database', '৩. স্থানীয় মাটির নমুনা ডেটাবেস')}</span>
                    <span className="font-mono text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Research Phase</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#4c6a60] leading-relaxed">
                    {L(
                      'Partnering with regional universities to integrate laboratory-measured Sundarbans soil core data for Tier 2 localized carbon modeling.',
                      'আঞ্চলিক বিশ্ববিদ্যালয়ের গবেষণায় সুন্দরবনের আসল মাটির নমুনা যুক্ত করে আরও সুনির্দিষ্ট টিয়ার ২ কার্বন হিসাব চালু করা।'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const last = chapters.length - 1
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const [progress, setProgress] = useState(0)

  /** Smoothly scroll the popup document to section i. */
  const goTo = (i: number) => {
    const box = scrollRef.current
    const el = sectionRefs.current[i]
    if (!box) return
    box.scrollTo({ top: el ? el.offsetTop - 20 : 0, behavior: 'smooth' })
  }

  // Scroll-spy: highlight the active chapter as the user scrolls inside the popup
  useEffect(() => {
    if (!open) return
    const box = scrollRef.current
    if (!box) return
    const onScroll = () => {
      const max = box.scrollHeight - box.clientHeight
      setProgress(max > 0 ? box.scrollTop / max : 0)
      const probe = box.scrollTop + box.clientHeight * 0.3
      let current = 0
      sectionRefs.current.forEach((el, i) => {
        if (el && el.offsetTop <= probe) current = i
      })
      setChapter(current)
    }
    onScroll()
    box.addEventListener('scroll', onScroll, { passive: true })
    return () => box.removeEventListener('scroll', onScroll)
  }, [open])

  // Global key bindings: Escape to close, Arrows to step through chapters
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goTo(Math.min(last, chapter + 1))
      if (e.key === 'ArrowLeft') goTo(Math.max(0, chapter - 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // goTo only reads refs, so it does not need to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, last, chapter])

  if (!open) return null
  const today = new Date().toLocaleDateString(lang === 'bn' ? 'bn-IN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 bg-black/65 backdrop-blur-md print:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={L('How MangroveLens works', 'MangroveLens কীভাবে কাজ করে')}
      onClick={onClose}
    >
      {/* ── Elevated Floating Popup Modal Container ── */}
      <div
        className="relative flex flex-col w-full max-w-6xl h-[92vh] max-h-[960px] rounded-3xl bg-[#f3f7f4] text-[#0d2a23] shadow-2xl border border-white/20 overflow-hidden ring-1 ring-black/10 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Command Header Bar (Pinned Inside Popup) ── */}
        <header className="relative z-30 flex items-center justify-between border-b border-[#d0e1d7] bg-white/95 px-4 sm:px-8 py-3.5 backdrop-blur-md shadow-xs shrink-0">
          {/* Brand identity */}
          <div className="flex items-center gap-3">
            <img src={BRAND.icon} alt="" className="size-9 drop-shadow-xs" />
            <div>
              <p className="font-display text-base font-black leading-none text-[#04241d]">
                Mangrove<span className="text-emerald-600">Lens</span>
              </p>
              <p className="font-mono text-[9.5px] font-bold tracking-[0.2em] text-[#16865f] uppercase mt-1">
                {L('SYSTEM ARCHITECTURE & SPECIFICATION', 'সিস্টেম পরিচিতি ও প্রযুক্তি গাইড')}
              </p>
            </div>
          </div>

          {/* Current Chapter Indicator */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-[#cbe1d5] bg-[#edf6f1] px-4 py-1.5 shadow-2xs">
            <span className="size-2 rounded-full bg-[#16865f] animate-pulse" />
            <span className="font-mono text-xs font-bold text-[#0c3830]">
              {String(chapter + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
            </span>
            <span className="text-[#88a89b]">·</span>
            <span className="font-mono text-xs font-bold text-[#235346] truncate max-w-[260px] lg:max-w-[380px]">
              {chapters[chapter].title.toUpperCase()}
            </span>
          </div>

          {/* Action Controls & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={chapter === 0}
              onClick={() => goTo(Math.max(0, chapter - 1))}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#cbe1d5] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#123f38] hover:bg-[#edf7f2] hover:border-[#16865f] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              aria-label={L('Previous section', 'আগের অংশ')}
              title="Shortcut: Left Arrow [←]"
            >
              <ArrowLeft className="size-3.5" />
              <span>{L('Prev', 'আগের')}</span>
            </button>
            <button
              type="button"
              disabled={chapter === last}
              onClick={() => goTo(Math.min(last, chapter + 1))}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#cbe1d5] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#123f38] hover:bg-[#edf7f2] hover:border-[#16865f] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              aria-label={L('Next section', 'পরের অংশ')}
              title="Shortcut: Right Arrow [→]"
            >
              <span>{L('Next', 'পরের')}</span>
              <ArrowRight className="size-3.5" />
            </button>

            {/* Prominent Close button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-[#c6dfd2] bg-[#eef6f1] px-3.5 py-1.5 font-mono text-xs font-bold text-[#0d3b32] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition cursor-pointer shadow-2xs"
              aria-label={L('Close guide', 'গাইড বন্ধ করুন')}
              title="Shortcut: Escape [Esc]"
            >
              <span>{L('Close', 'বন্ধ করুন')}</span>
              <span className="hidden sm:inline text-[10px] text-[#55776c] font-normal">[Esc]</span>
              <X className="size-4 ml-0.5" />
            </button>
          </div>

          {/* Reading progress bar pinned to header bottom */}
          <div className="absolute inset-x-0 -bottom-px h-1 bg-[#dbe8e0]">
            <div
              className="h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </header>

        {/* ── 2. Scrollable Body Inside the Popup ── */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 w-full bg-[#f3f7f4]">
          <div className="mx-auto max-w-5xl space-y-12 pb-24">
            {/* Cover Page Hero Card with Photorealistic Sundarbans Aerial Background */}
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#021813] via-[#042821] to-[#07392f] p-8 sm:p-14 text-white shadow-xl border border-emerald-950/60">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                style={{ backgroundImage: `url('/images/tour/sundarbans-aerial.jpg')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#021813]/95 via-[#042821]/80 to-[#07392f]/50" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/70 px-3.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.25em] text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {L('OFFICIAL SYSTEM SPECIFICATION & BLUEPRINT', 'সিস্টেম পরিচিতি ও প্রযুক্তি গাইড')}
                  </div>
                </div>

                <h1 className="mt-4 font-condensed font-black text-5xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-wide uppercase leading-[0.92] text-white">
                  {L('How MangroveLens Works', 'MangroveLens কীভাবে কাজ করে')}
                </h1>
                <p className="mt-4 max-w-2xl font-light-sub text-xs sm:text-sm font-semibold tracking-[0.2em] text-emerald-200/90 uppercase">
                  {L(
                    'FROM ORBITAL SATELLITES TO COMMUNITY ACTION — A TRANSPARENT SCIENTIFIC GUIDE',
                    'উপগ্রহ তথ্য থেকে স্থানীয় পদক্ষেপ — সম্পূর্ণ স্বচ্ছ বৈজ্ঞানিক পদ্ধতি'
                  )}
                </p>

                {/* Verified Specification Badges */}
                <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-emerald-200 border border-white/10">
                    🛰️ Copernicus Sentinel-2 MSI (10m)
                  </span>
                  <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-emerald-200 border border-white/10">
                    ⚡ Google Earth Engine Median Reducer
                  </span>
                  <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-emerald-200 border border-white/10">
                    🌲 200-Tree Random Forest Classifier
                  </span>
                  <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-emerald-200 border border-white/10">
                    ⚖️ IPCC 2013 Wetlands Tier 1
                  </span>
                </div>

                {/* Interactive 2-Column Chapter Directory Grid */}
                <div className="mt-10">
                  <p className="font-mono text-[10.5px] font-bold tracking-[0.24em] text-emerald-300/80 uppercase mb-3.5">
                    {L('DOCUMENT CHAPTERS (CLICK TO JUMP DIRECTLY)', 'অধ্যায়সমূহ (সরাসরি যেতে ক্লিক করুন)')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-4xl">
                    {chapters.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => goTo(i)}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 text-left transition-all hover:bg-white/[0.1] hover:border-emerald-400/40 hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-950/80 border border-emerald-400/30 font-mono text-xs font-bold text-emerald-300">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-white group-hover:text-emerald-200 truncate">
                              {c.title}
                            </p>
                            <p className="font-mono text-[10px] text-emerald-300/60 uppercase truncate">
                              {c.kicker}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-emerald-400/40 group-hover:text-emerald-300 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metadata footer */}
                <div className="mt-10 flex flex-wrap items-center gap-4 font-mono text-[11px] text-white/50 border-t border-white/10 pt-4">
                  <span>{today}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    {caps?.liveEngine ? L('Live Copernicus Satellite Telemetry Active', 'লাইভ উপগ্রহ তথ্য সক্রিয়') : L('Sentinel-2 Dry-Season Benchmark Mode', 'সেন্টিনেল-২ বেঞ্চমার্ক মোড')}
                  </span>
                  {b && (
                    <>
                      <span>·</span>
                      <span>Model: {b.dataSource.modelVersion}</span>
                    </>
                  )}
                </div>
              </div>
            </article>

            {/* Chapters as Individual Presentation Articles */}
            {chapters.map((c, i) => {
              const Icon = c.icon
              return (
                <article
                  key={c.id}
                  ref={(el) => {
                    sectionRefs.current[i] = el
                  }}
                  className="relative rounded-3xl bg-white p-7 sm:p-12 shadow-sm border border-[#d6e6dc] overflow-hidden"
                >
                  {/* Chapter Banner */}
                  <div className="mb-8 flex items-center justify-between border-b border-[#e5efe8] pb-6">
                    <div className="flex items-center gap-4">
                      <span className="grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-[#dff0e6] text-[#16865f] border border-[#cbe4d7] shadow-2xs">
                        <Icon className="size-6.5" />
                      </span>
                      <div>
                        <p className="font-mono text-xs font-bold tracking-[0.24em] text-[#16865f] uppercase">
                          {L('CHAPTER', 'অধ্যায়')} {String(i + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
                        </p>
                        <h2 className="font-condensed text-4xl sm:text-5xl font-black tracking-wide text-[#062c25] leading-none mt-1 uppercase">
                          {c.title}
                        </h2>
                      </div>
                    </div>
                    <span className="hidden sm:inline font-mono text-xs text-[#87a59a]">
                      [ § {String(i + 1).padStart(2, '0')} ]
                    </span>
                  </div>

                  {/* Chapter Body Content */}
                  <div className="min-w-0">{c.body}</div>

                  {/* Chapter Navigation Footer */}
                  <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5efe8] pt-5 font-mono text-xs text-[#648479]">
                    <span>MangroveLens · {L('System Architecture & Guide', 'সিস্টেম পরিচিতি ও প্রযুক্তি গাইড')}</span>
                    {i < last ? (
                      <button
                        type="button"
                        onClick={() => goTo(i + 1)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#16865f] hover:text-[#0c4e37] hover:underline cursor-pointer"
                      >
                        {L('Next Chapter', 'পরের অধ্যায়')}: {chapters[i + 1].title} →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#16865f] hover:text-[#0c4e37] hover:underline cursor-pointer"
                      >
                        {L('Return to Live Dashboard', 'ড্যাশবোর্ডে ফিরে যান')} →
                      </button>
                    )}
                  </div>
                </article>
              )
            })}

            {/* Bottom Action Section */}
            <div className="pt-6 pb-12 text-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#16865f] hover:bg-[#127251] px-9 py-4 font-display text-base font-bold text-white shadow-xl shadow-emerald-900/25 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {L('Start Exploring the Live Dashboard', 'লাইভ ড্যাশবোর্ডে কাজ শুরু করুন')} <ArrowRight className="size-5" />
              </button>
              <p className="mt-3 font-mono text-xs text-[#6c887e]">
                {L('You can reopen this technical blueprint anytime by clicking “How it works” in the top navigation.', 'উপরের মেনু থেকে যেকোনো সময় “How it works” চেপে এই গাইড পুনরায় দেখতে পারেন।')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
