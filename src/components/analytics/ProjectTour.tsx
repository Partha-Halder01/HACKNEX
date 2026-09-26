import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleAlert,
  Cloud,
  Code2,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  Leaf,
  MapPin,
  Network,
  Play,
  Satellite,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Workflow,
  X,
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

// ───────────────────────── small building blocks ─────────────────────────

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[11px] font-bold tracking-[0.22em] text-[#16865f]">{kicker}</p>
      <h2 className="mt-1 font-condensed text-4xl tracking-wide text-[#0f352e] xl:text-5xl">{title}</h2>
    </div>
  )
}

function InfoCard({ icon: Icon, title, children, tone = 'green' }: { icon: typeof Leaf; title: string; children: ReactNode; tone?: 'green' | 'amber' | 'blue' }) {
  const toneCls = tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'blue' ? 'bg-sky-50 text-sky-600' : 'bg-[#e7f4ec] text-[#16865f]'
  return (
    <div className="rounded-2xl border border-[#d6e6de] bg-white p-4">
      <span className={`grid size-10 place-items-center rounded-xl ${toneCls}`}>
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 font-display text-base font-bold text-[#123f38]">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-[#526a63]">{children}</div>
    </div>
  )
}

function JumpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#16865f] bg-white px-3 py-1.5 text-xs font-bold text-[#16865f] transition hover:bg-[#16865f] hover:text-white"
    >
      <Target className="size-3.5" /> {label}
    </button>
  )
}

// ───────────────────────── chapter: pipeline (interactive) ─────────────────────────

function Pipeline({ L }: { L: L }) {
  const steps = [
    {
      icon: Satellite,
      title: L('Satellite photos', 'উপগ্রহের ছবি'),
      simple: L(
        'A European satellite (Sentinel-2) photographs the Sundarbans every few days. We use photos from the same dry months (January–March) every year, so years are compared fairly.',
        'ইউরোপের সেন্টিনেল-২ উপগ্রহ কয়েক দিন পরপর সুন্দরবনের ছবি তোলে। প্রতি বছরের একই শুকনো মাসের (জানুয়ারি–মার্চ) ছবি নেওয়া হয়, যাতে বছরগুলো ন্যায্যভাবে তুলনা করা যায়।',
      ),
      tech: 'Copernicus Sentinel-2 L2A (surface reflectance), 10 m bands B2, B3, B4, B8 + 20 m B11, B12; scene filter ≤ 30 % cloud.',
    },
    {
      icon: Cloud,
      title: L('Cloud-free composite', 'মেঘমুক্ত মিলিত ছবি'),
      simple: L(
        'One photo can be cloudy, so we combine all photos from a 90-day window, remove clouds and shadows, and keep one clean picture per year.',
        'একটি ছবিতে মেঘ থাকতে পারে, তাই ৯০ দিনের সব ছবি মিলিয়ে মেঘ ও ছায়া সরিয়ে প্রতি বছরের একটি পরিষ্কার ছবি তৈরি হয়।',
      ),
      tech: 'Google Earth Engine: SCL + QA60 cloud/shadow mask → per-pixel median composite; NDVI and NDWI added as features.',
    },
    {
      icon: BrainCircuit,
      title: L('AI forest map', 'AI বনের মানচিত্র'),
      simple: L(
        'A machine-learning model learns what mangrove looks like from a trusted scientists’ mangrove map, then marks every 10 m patch as mangrove or not — and how sure it is.',
        'একটি মেশিন-লার্নিং মডেল বিজ্ঞানীদের নির্ভরযোগ্য ম্যানগ্রোভ মানচিত্র থেকে শেখে, তারপর প্রতি ১০ মিটার জায়গা ম্যানগ্রোভ কি না — আর কতটা নিশ্চিত — চিহ্নিত করে।',
      ),
      tech: 'Random Forest (200 trees) trained on pixels that were stable mangrove / non-mangrove in CGMD-AFCC30 for 2019–2022 (≥ 50 % canopy = mangrove, mixed pixels excluded, 30 m edge erosion); tested on held-out 2023.',
    },
    {
      icon: Layers,
      title: L('Change & carbon', 'পরিবর্তন ও কার্বন'),
      simple: L(
        'Comparing two years shows where forest grew, where it was lost, and where we are unsure. Forest area × a standard international carbon figure gives the carbon stock, with an honest ± range.',
        'দুই বছর তুলনা করলে দেখা যায় কোথায় বন বেড়েছে, কোথায় হারিয়েছে, আর কোথায় নিশ্চিত নই। বনের এলাকা × আন্তর্জাতিক কার্বন মান = কার্বন মজুত, সঙ্গে সৎ ± পরিসর।',
      ),
      tech: 'Post-classification change with 0.5 ha minimum mapping unit and 0.6 confidence threshold; IPCC 2013 Wetlands Supplement Tier 1 (283.1 Mg C/ha), first-order error propagation; 5-year what-if scenarios.',
    },
    {
      icon: FileText,
      title: L('Plain answer', 'সহজ উত্তর'),
      simple: L(
        '“The forest here grew / shrank”, a green-yellow-red “how sure are we?” light, a before/after photo slider, and a summary in Bengali or English that can be shared on WhatsApp or printed.',
        '“এখানকার বন বেড়েছে / কমেছে”, সবুজ-হলুদ-লাল “কতটা নিশ্চিত?” আলো, আগে/পরে ছবির স্লাইডার, আর বাংলা বা ইংরেজিতে সারাংশ — WhatsApp-এ শেয়ার বা প্রিন্ট করা যায়।',
      ),
      tech: 'FastAPI JSON bundle → React dashboard. Optional Gemini re-wording is rejected if it cites any number not in the computed evidence list.',
    },
  ]
  const [active, setActive] = useState(0)
  const [technical, setTechnical] = useState(false)
  const S = steps[active]
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const Icon = s.icon
          const on = i === active
          return (
            <div key={s.title} className="flex items-center">
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                  on ? 'border-[#16865f] bg-[#16865f] text-white shadow-md' : 'border-[#d6e6de] bg-white text-[#123f38] hover:border-[#16865f]'
                }`}
              >
                <Icon className="size-4.5" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="mx-0.5 size-4 text-[#9bb5ab]" />}
            </div>
          )
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-[#d6e6de] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#16865f]">
            {L('STEP', 'ধাপ')} {active + 1} / {steps.length}
          </p>
          <div className="flex overflow-hidden rounded-lg border border-[#d6e6de] text-[11px] font-bold">
            <button type="button" onClick={() => setTechnical(false)} className={`px-2.5 py-1 ${!technical ? 'bg-[#16865f] text-white' : 'text-[#123f38]'}`}>
              {L('Simple', 'সহজ')}
            </button>
            <button type="button" onClick={() => setTechnical(true)} className={`px-2.5 py-1 ${technical ? 'bg-[#16865f] text-white' : 'text-[#123f38]'}`}>
              {L('Technical', 'কারিগরি')}
            </button>
          </div>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-[#123f38]">{S.title}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${technical ? 'font-mono text-[#123f38]' : 'text-[#475f57]'}`}>{technical ? S.tech : S.simple}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => setActive((a) => a - 1)}
            className="rounded-lg border border-[#d6e6de] px-3 py-1 text-xs font-bold text-[#123f38] disabled:opacity-40"
          >
            ← {L('Previous step', 'আগের ধাপ')}
          </button>
          <button
            type="button"
            disabled={active === steps.length - 1}
            onClick={() => setActive((a) => a + 1)}
            className="rounded-lg bg-[#16865f] px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
          >
            {L('Next step', 'পরের ধাপ')} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── chapter: honesty checks (live) ─────────────────────────

function HonestyChecks({ L, bundle }: { L: L; bundle: AnalysisBundle | null }) {
  const checks = [
    { id: 'season', en: 'Both photos from the same season', bn: 'দুই ছবিই একই মৌসুমের' },
    { id: 'area_check', en: 'Forest area matches the scientists’ reference map', bn: 'বনের এলাকা বিজ্ঞানীদের মানচিত্রের সঙ্গে মেলে' },
    { id: 'images', en: 'Enough clear, cloud-free photos', bn: 'যথেষ্ট পরিষ্কার, মেঘহীন ছবি' },
    { id: 'fast_change', en: 'Change is at a believable speed', bn: 'পরিবর্তনের গতি বিশ্বাসযোগ্য' },
    { id: 'accuracy', en: 'Model accuracy is good in this area', bn: 'এই এলাকায় মডেলের নির্ভুলতা ভালো' },
    { id: 'outside', en: 'Place is inside the Sundarbans', bn: 'জায়গাটি সুন্দরবনের ভেতরে' },
  ]
  const rel = bundle?.reliability
  const levelText = {
    high: L('🟢 Fairly sure', '🟢 বেশ নিশ্চিত'),
    medium: L('🟡 Use with care', '🟡 সাবধানে ব্যবহার'),
    low: L('🔴 Do not trust', '🔴 বিশ্বাস করবেন না'),
    demo: L('🟡 Demo data', '🟡 ডেমো তথ্য'),
  }
  return (
    <div className="rounded-2xl border border-[#d6e6de] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#123f38]">{L('Automatic checks on the analysis you are viewing', 'এখন দেখা বিশ্লেষণের স্বয়ংক্রিয় পরীক্ষা')}</p>
        {rel && <span className="rounded-full bg-[#f2f6f3] px-3 py-1 text-xs font-bold text-[#123f38]">{levelText[rel.level]}</span>}
      </div>
      {!bundle ? (
        <p className="mt-3 text-sm text-[#6c817a]">{L('Run an analysis first to see the checks live.', 'পরীক্ষাগুলো দেখতে আগে একটি বিশ্লেষণ চালান।')}</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => {
            const problem = rel?.problems.find((p) => p.id === c.id)
            const na = rel?.level === 'demo'
            return (
              <li key={c.id} className={`flex items-start gap-2 rounded-xl border p-2.5 text-sm ${problem ? (problem.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50') : 'border-[#d6e6de] bg-[#f7faf8]'}`}>
                {na ? (
                  <span className="mt-0.5 text-xs font-bold text-[#6c817a]">–</span>
                ) : problem ? (
                  <CircleAlert className={`mt-0.5 size-4 shrink-0 ${problem.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                ) : (
                  <Check className="mt-0.5 size-4 shrink-0 text-[#16865f]" />
                )}
                <span className="text-[#123f38]">{L(c.en, c.bn)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ───────────────────────── the tour ─────────────────────────

export function ProjectTour({ open, onClose, lang, bundle, caps, onJump, onTry }: Props) {
  const L: L = (en, bn) => (lang === 'bn' ? bn : en)
  const [chapter, setChapter] = useState(0)
  const b = bundle

  const chapters: { icon: typeof Leaf; title: string; body: ReactNode }[] = [
    {
      icon: Sparkles,
      title: L('Welcome', 'স্বাগতম'),
      body: (
        <>
          <Heading kicker={L('SYSTEM GUIDE', 'সিস্টেম গাইড')} title={L(`${BRAND.name} in one line`, `এক লাইনে ${BRAND.name}`)} />
          <p className="rounded-2xl bg-[#04241d] p-5 text-lg leading-relaxed text-white">
            {L(
              'Pick any place in the Sundarbans and two years. MangroveLens reads real satellite photos, tells you whether the mangrove forest grew or shrank, how much carbon it holds — and how sure it is.',
              'সুন্দরবনের যেকোনো জায়গা আর দুটি বছর বাছুন। MangroveLens আসল উপগ্রহ ছবি দেখে বলে ম্যানগ্রোভ বন বেড়েছে না কমেছে, কতটা কার্বন ধরে রাখে — আর কতটা নিশ্চিত।',
            )}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard icon={Satellite} title={L('Real satellite data', 'আসল উপগ্রহ তথ্য')}>
              {L('Live Sentinel-2 photos processed on Google Earth Engine — not a pre-made demo.', 'Google Earth Engine-এ প্রক্রিয়া করা লাইভ সেন্টিনেল-২ ছবি — আগে থেকে বানানো ডেমো নয়।')}
            </InfoCard>
            <InfoCard icon={ShieldCheck} title={L('Honest by design', 'সততা শুরু থেকেই')}>
              {L('Every answer says how sure it is, and warns when it may be wrong.', 'প্রতিটি উত্তর বলে কতটা নিশ্চিত, আর ভুল হতে পারলে সতর্ক করে।')}
            </InfoCard>
            <InfoCard icon={Users} title={L('Made for villages', 'গ্রামের জন্য তৈরি')}>
              {L('Plain Bengali and English, shareable on WhatsApp or as a printed report.', 'সহজ বাংলা ও ইংরেজি, WhatsApp বা ছাপা রিপোর্টে শেয়ার করা যায়।')}
            </InfoCard>
          </div>
          <p className="mt-5 text-xs text-[#6c817a]">
            {L('Tip: use ← → keys or the buttons below. “Show me” buttons jump to the live dashboard.', 'টিপ: ← → কী বা নিচের বোতাম ব্যবহার করুন। “দেখান” বোতাম লাইভ ড্যাশবোর্ডের সেই অংশে নিয়ে যায়।')}
          </p>
        </>
      ),
    },
    {
      icon: TrendingDown,
      title: L('The problem', 'সমস্যা'),
      body: (
        <>
          <Heading kicker={L('WHY THIS MATTERS', 'কেন দরকার')} title={L('A huge carbon store, watched by too few eyes', 'বিশাল কার্বন ভাণ্ডার, নজর রাখার চোখ কম')} />
          <p className="mb-5 text-sm leading-relaxed text-[#475f57]">
            {L(
              'The Sundarbans is the world’s largest mangrove forest. Mangroves protect villages from cyclones and store “blue carbon” — mostly in the mud beneath them. When the forest is lost, that carbon is at risk.',
              'সুন্দরবন পৃথিবীর বৃহত্তম ম্যানগ্রোভ বন। ম্যানগ্রোভ গ্রামকে ঘূর্ণিঝড় থেকে রক্ষা করে এবং “ব্লু কার্বন” জমা রাখে — বেশিরভাগই নিচের কাদায়। বন হারালে সেই কার্বন ঝুঁকিতে পড়ে।',
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard icon={TrendingDown} title={L('Change goes unnoticed', 'বদল চোখে পড়ে না')} tone="amber">
              {L('Erosion, storms and clearing change the forest edge every year.', 'ভাঙন, ঝড় আর গাছ কাটায় প্রতি বছর বনের কিনারা বদলায়।')}
            </InfoCard>
            <InfoCard icon={CircleAlert} title={L('Numbers without honesty', 'সততা ছাড়া সংখ্যা')} tone="amber">
              {L('Carbon figures are often given without saying how sure they are.', 'কার্বনের সংখ্যা প্রায়ই দেওয়া হয়, কতটা নিশ্চিত তা বলা হয় না।')}
            </InfoCard>
            <InfoCard icon={Users} title={L('Data doesn’t reach villages', 'তথ্য গ্রামে পৌঁছায় না')} tone="amber">
              {L('Satellite maps stay with experts, in English and technical formats.', 'উপগ্রহ মানচিত্র বিশেষজ্ঞদের কাছে থাকে, ইংরেজি ও কারিগরি রূপে।')}
            </InfoCard>
          </div>
        </>
      ),
    },
    {
      icon: Layers,
      title: L('How it works', 'কীভাবে কাজ করে'),
      body: (
        <>
          <Heading kicker={L('THE PIPELINE — CLICK EACH STEP', 'প্রক্রিয়া — প্রতিটি ধাপে ক্লিক করুন')} title={L('From a satellite photo to a plain answer', 'উপগ্রহের ছবি থেকে সহজ উত্তর')} />
          <Pipeline L={L} />
        </>
      ),
    },
    {
      icon: Network,
      title: L('Architecture', 'আর্কিটেকচার'),
      body: (
        <>
          <Heading kicker={L('SYSTEM ARCHITECTURE — CLICK ANY BOX', 'সিস্টেম আর্কিটেকচার — যেকোনো বাক্সে ক্লিক করুন')} title={L('How the pieces fit together', 'অংশগুলো কীভাবে জোড়া লাগে')} />
          <ArchitectureDiagram L={L} />
        </>
      ),
    },
    {
      icon: Workflow,
      title: L('One analysis, step by step', 'একটি বিশ্লেষণ, ধাপে ধাপে'),
      body: (
        <>
          <Heading kicker={L('DATA FLOW — PRESS PLAY', 'তথ্যের প্রবাহ — চালান চাপুন')} title={L('What happens when you press “Run”', '“চালান” চাপলে কী ঘটে')} />
          <AnalysisFlow L={L} />
        </>
      ),
    },
    {
      icon: MapPin,
      title: L('Live example', 'লাইভ উদাহরণ'),
      body: (
        <>
          <Heading kicker={L('THE ANALYSIS ON YOUR SCREEN RIGHT NOW', 'এখন আপনার স্ক্রিনের বিশ্লেষণ')} title={L('Reading the result', 'ফলাফল পড়া')} />
          {!b ? (
            <p className="text-sm text-[#6c817a]">{L('No analysis yet — close the tour and press “Run”.', 'এখনো বিশ্লেষণ হয়নি — ট্যুর বন্ধ করে “Run” চাপুন।')}</p>
          ) : (
            <>
              <div className="rounded-2xl border border-[#d6e6de] bg-white p-5">
                <p className="text-xs font-bold text-[#6c817a]">
                  {b.request.lat.toFixed(3)}°N, {b.request.lon.toFixed(3)}°E · {fmt(b.request.radiusKm * 2, 0, lang)} km · {b.request.startDate.slice(0, 4)} → {b.request.endDate.slice(0, 4)} ·{' '}
                  {b.dataSource.isRealData ? L('real satellite data', 'আসল উপগ্রহ তথ্য') : L('demo data', 'ডেমো তথ্য')}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {[
                    [L('Forest at start', 'শুরুতে বন'), `${fmt(b.summary.start.mangroveHa, 0, lang)} ha`],
                    [L('Forest at end', 'শেষে বন'), `${fmt(b.summary.end.mangroveHa, 0, lang)} ha`],
                    [L('Change', 'পরিবর্তন'), `${signed(b.summary.end.mangroveHa - b.summary.start.mangroveHa, 0, lang)} ha (${signed(b.change.percentChange, 1, lang)}%)`],
                    [L('Carbon stored (end)', 'জমা কার্বন (শেষে)'), `${fmt(b.carbon.end.co2eMg, 0, lang)} t CO₂e`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-[#f2f6f3] p-3">
                      <p className="text-[11px] font-bold text-[#6c817a]">{k}</p>
                      <p className="mt-0.5 font-display text-lg font-extrabold text-[#123f38]">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm text-[#475f57]">
                  {b.change.percentChange >= 0 ? <TrendingUp className="mt-0.5 size-4 text-[#16865f]" /> : <TrendingDown className="mt-0.5 size-4 text-red-600" />}
                  {L(
                    'These numbers are computed live for this exact circle and these years. Change the place or years on the dashboard and every number is recalculated from new satellite photos.',
                    'এই সংখ্যাগুলো এই বৃত্ত আর এই বছরগুলোর জন্য লাইভ হিসাব করা। ড্যাশবোর্ডে জায়গা বা বছর বদলালে নতুন উপগ্রহ ছবি থেকে সব সংখ্যা আবার হিসাব হয়।',
                  )}
                </p>
              </div>
              <p className="mt-5 text-sm font-bold text-[#123f38]">{L('Show me on the dashboard:', 'ড্যাশবোর্ডে দেখান:')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <JumpButton label={L('The verdict', 'সিদ্ধান্ত')} onClick={() => onJump('verdict')} />
                <JumpButton label={L('Before / after photos', 'আগে / পরে ছবি')} onClick={() => onJump('compare')} />
                <JumpButton label={L('Carbon & area', 'কার্বন ও এলাকা')} onClick={() => onJump('metrics')} />
                <JumpButton label={L('Yearly trend & 5-year scenarios', 'বার্ষিক ধারা ও ৫ বছর')} onClick={() => onJump('trends')} />
                <JumpButton label={L('Science lab (accuracy, method)', 'বিজ্ঞান ল্যাব (নির্ভুলতা, পদ্ধতি)')} onClick={() => onJump('technical-lab')} />
              </div>
            </>
          )}
        </>
      ),
    },
    {
      icon: ShieldCheck,
      title: L('Honesty built in', 'সততা'),
      body: (
        <>
          <Heading kicker={L('HOW WE AVOID MISLEADING NUMBERS', 'কীভাবে ভুল সংখ্যা এড়াই')} title={L('It knows when not to be trusted', 'কখন বিশ্বাস করা উচিত নয়, তাও জানে')} />
          <HonestyChecks L={L} bundle={b} />
          {b?.accuracy && (
            <p className="mt-4 text-sm text-[#475f57]">
              {L('In this analysis, the model was tested on 2023 — a year it never learned from — and agreed with the scientists’ map', 'এই বিশ্লেষণে মডেলকে ২০২৩ সালে পরীক্ষা করা হয়েছে — যে বছর থেকে সে শেখেনি — আর বিজ্ঞানীদের মানচিত্রের সঙ্গে মিলেছে')}{' '}
              <b>{fmt(b.accuracy.overallAccuracy * 100, 1, lang)}%</b>
              {L(' of the time.', ' ক্ষেত্রে।')}
            </p>
          )}
          <p className="mt-5 text-sm font-bold text-[#123f38]">{L('Try it — watch the warnings appear (live, takes 1–2 min):', 'নিজে দেখুন — সতর্কবার্তা আসবে (লাইভ, ১–২ মিনিট):')}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onTry({ label: 'Gosaba village', lat: 22.165, lon: 88.805, startDate: '2020-01-01', endDate: '2026-03-31' })}
              className="flex items-start gap-3 rounded-xl border border-[#d6e6de] bg-white p-3 text-left transition hover:border-[#16865f]"
            >
              <Play className="mt-0.5 size-4 shrink-0 text-[#16865f]" />
              <span>
                <span className="block text-sm font-bold text-[#123f38]">{L('A village instead of forest', 'বনের বদলে গ্রাম')}</span>
                <span className="block text-xs text-[#6c817a]">
                  {L('Gosaba village: trees and fields look like mangrove — the area check flags it.', 'গোসাবা গ্রাম: গাছপালা ও খেত ম্যানগ্রোভের মতো দেখায় — এলাকা যাচাই তা ধরে ফেলে।')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTry({ label: 'Different seasons', lat: 22.12, lon: 88.83, startDate: '2019-02-01', endDate: '2022-07-08' })}
              className="flex items-start gap-3 rounded-xl border border-[#d6e6de] bg-white p-3 text-left transition hover:border-[#16865f]"
            >
              <Play className="mt-0.5 size-4 shrink-0 text-[#16865f]" />
              <span>
                <span className="block text-sm font-bold text-[#123f38]">{L('Dry season vs rainy season', 'শুকনো বনাম বর্ষা মৌসুম')}</span>
                <span className="block text-xs text-[#6c817a]">
                  {L('Feb 2019 vs July 2022: water and clouds look like lost forest — marked 🔴 “do not trust”.', 'ফেব্রুয়ারি ২০১৯ বনাম জুলাই ২০২২: জল ও মেঘ বন হারানোর মতো দেখায় — 🔴 “বিশ্বাস করবেন না” চিহ্ন আসে।')}
                </span>
              </span>
            </button>
          </div>
        </>
      ),
    },
    {
      icon: Leaf,
      title: L('Carbon & future', 'কার্বন ও ভবিষ্যৎ'),
      body: (
        <>
          <Heading kicker={L('TRANSPARENT MATHS, NOT A BLACK BOX', 'স্বচ্ছ গণিত, রহস্য নয়')} title={L('How carbon and the 5-year view are calculated', 'কার্বন ও ৫ বছরের চিত্র কীভাবে হিসাব হয়')} />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#d6e6de] bg-white p-5">
              <p className="text-sm font-bold text-[#123f38]">{L('Carbon', 'কার্বন')}</p>
              <p className="mt-2 rounded-xl bg-[#04241d] p-3 text-center font-mono text-sm text-emerald-200">
                {L('carbon = forest area × 283.1 t C/ha', 'কার্বন = বনের এলাকা × ২৮৩.১ টন/হেক্টর')}
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-[#475f57]">
                {[
                  [L('Trees above ground', 'মাটির উপরে গাছ'), 74.2],
                  [L('Roots', 'শিকড়'), 28.9],
                  [L('Soil (top 1 m)', 'মাটি (উপরের ১ মিটার)'), 180],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="flex justify-between text-xs">
                      <span>{k}</span>
                      <span className="font-mono">{fmt(v as number, 1, lang)} t C/ha</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-[#e5efe9]">
                      <div className="h-1.5 rounded-full bg-[#16865f]" style={{ width: `${((v as number) / 283.1) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#6c817a]">
                {L('Standard IPCC 2013 (Tier 1) figures, shown with a ± range. Estimates for planning — not carbon credits.', 'IPCC ২০১৩ (টিয়ার ১)-এর মানক সংখ্যা, ± পরিসর সহ। পরিকল্পনার জন্য আনুমানিক — কার্বন ক্রেডিট নয়।')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d6e6de] bg-white p-5">
              <p className="text-sm font-bold text-[#123f38]">{L('Next 5 years', 'আগামী ৫ বছর')}</p>
              <ul className="mt-2 space-y-2 text-sm text-[#475f57]">
                <li>➡️ <b>{L('If things continue:', 'এভাবে চললে:')}</b> {L('the observed yearly change, repeated.', 'দেখা বার্ষিক পরিবর্তনই চলতে থাকবে।')}</li>
                <li>⚠️ <b>{L('If damage doubles:', 'ক্ষতি দ্বিগুণ হলে:')}</b> {L('one more year’s worth of loss every year.', 'প্রতি বছর আরও এক গুণ ক্ষতি।')}</li>
                <li>🌱 <b>{L('If protected & planted:', 'রক্ষা ও রোপণ হলে:')}</b> {L('half the loss, 50 % more new forest.', 'ক্ষতি অর্ধেক, নতুন বন ৫০% বেশি।')}</li>
              </ul>
              <p className="mt-3 rounded-xl bg-[#f2f6f3] p-3 text-xs text-[#475f57]">
                {L(
                  'Simple, repeatable maths — not an AI guess. Gemini only rewrites the summary in plain words, and its text is rejected if it contains any number we did not calculate.',
                  'সহজ, বারবার মেলানো যায় এমন গণিত — AI-এর অনুমান নয়। Gemini শুধু সারাংশ সহজ ভাষায় লেখে; হিসাবের বাইরের কোনো সংখ্যা লিখলে তার লেখা বাতিল হয়।',
                )}
              </p>
              {b && (
                <div className="mt-3">
                  <JumpButton label={L('See the scenarios', 'চিত্রগুলো দেখুন')} onClick={() => onJump('trends')} />
                </div>
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Code2,
      title: L('Technology', 'প্রযুক্তি'),
      body: (
        <>
          <Heading kicker={L('WHAT IT IS BUILT WITH', 'কী দিয়ে তৈরি')} title={L('Open data, open science, a simple app', 'উন্মুক্ত তথ্য, উন্মুক্ত বিজ্ঞান, সহজ অ্যাপ')} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [Satellite, L('Data', 'তথ্য'), ['Copernicus Sentinel-2 L2A', 'CGMD-AFCC30 mangrove map (1984–2023)', 'IPCC 2013 Wetlands Supplement']],
              [Cloud, L('Processing', 'প্রক্রিয়াকরণ'), ['Google Earth Engine', 'Cloud & shadow masking', 'Median composites, NDVI / NDWI']],
              [BrainCircuit, L('Machine learning', 'মেশিন লার্নিং'), ['Random Forest (200 trees)', 'Held-out year test (2023)', 'Area check vs reference map']],
              [FlaskConical, L('Analytics', 'বিশ্লেষণ'), ['Gain / loss / uncertain change', 'Carbon with ± error propagation', '5-year what-if scenarios']],
              [Code2, L('Application', 'অ্যাপ্লিকেশন'), ['FastAPI (Python)', 'React + TypeScript + Vite', 'Leaflet maps, Recharts']],
              [FileText, L('Delivery', 'পৌঁছে দেওয়া'), [L('Bengali & English', 'বাংলা ও ইংরেজি'), L('WhatsApp share, PDF report', 'WhatsApp, PDF রিপোর্ট'), L('Gemini wording, number-checked', 'Gemini ভাষা, সংখ্যা যাচাই')]],
            ].map(([Icon, title, items]) => {
              const I = Icon as typeof Leaf
              return (
                <div key={title as string} className="rounded-2xl border border-[#d6e6de] bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-[#123f38]">
                    <I className="size-4 text-[#16865f]" /> {title as string}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {(items as string[]).map((it) => (
                      <li key={it} className="font-mono text-[11.5px] text-[#475f57]">• {it}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-[#6c817a]">
            {caps?.liveEngine
              ? L('Right now: connected to Google Earth Engine — live satellite analysis.', 'এই মুহূর্তে: Google Earth Engine যুক্ত — লাইভ উপগ্রহ বিশ্লেষণ।')
              : L('Right now: Earth Engine not connected — the dashboard is in labelled demo mode.', 'এই মুহূর্তে: Earth Engine যুক্ত নেই — ড্যাশবোর্ড চিহ্নিত ডেমো মোডে।')}
          </p>
        </>
      ),
    },
    {
      icon: GraduationCap,
      title: L('Impact & next steps', 'প্রভাব ও পরের ধাপ'),
      body: (
        <>
          <Heading kicker={L('WHO IT HELPS — AND WHAT COMES NEXT', 'কাদের কাজে লাগে — আর এরপর')} title={L('From a map to local action', 'মানচিত্র থেকে স্থানীয় পদক্ষেপ')} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={Users} title={L('Gram panchayats', 'গ্রাম পঞ্চায়েত')}>{L('See their own forest in Bengali; plan planting and embankment protection.', 'নিজেদের বন বাংলায় দেখা; রোপণ ও বাঁধ রক্ষার পরিকল্পনা।')}</InfoCard>
            <InfoCard icon={Leaf} title={L('Forest department', 'বন দপ্তর')}>{L('Spot where loss is happening and send teams to check.', 'কোথায় ক্ষতি হচ্ছে দেখে দল পাঠানো।')}</InfoCard>
            <InfoCard icon={ShieldCheck} title={L('NGOs & restoration', 'এনজিও ও পুনরুদ্ধার')}>{L('Track whether planted areas actually grow.', 'রোপণ করা এলাকা সত্যিই বাড়ছে কি না দেখা।')}</InfoCard>
            <InfoCard icon={FlaskConical} title={L('Researchers', 'গবেষক')}>{L('Transparent method, model version and evidence for every result.', 'প্রতিটি ফলাফলের স্বচ্ছ পদ্ধতি, মডেল সংস্করণ ও প্রমাণ।')}</InfoCard>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">{L('Known limits', 'জানা সীমাবদ্ধতা')}</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
                <li>• {L('Over-counts mangrove near villages (flagged automatically).', 'গ্রামের কাছে ম্যানগ্রোভ বেশি গোনে (স্বয়ংক্রিয়ভাবে সতর্ক করে)।')}</li>
                <li>• {L('Carbon uses average (Tier 1) figures, not local soil samples.', 'কার্বনে গড় (টিয়ার ১) মান, স্থানীয় মাটির নমুনা নয়।')}</li>
                <li>• {L('Clouds and tides limit some seasons.', 'মেঘ ও জোয়ার কিছু মৌসুমে সমস্যা করে।')}</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#d6e6de] bg-white p-4">
              <p className="text-sm font-bold text-[#123f38]">{L('Next steps', 'পরের ধাপ')}</p>
              <ul className="mt-2 space-y-1 text-sm text-[#475f57]">
                <li>• {L('Field checks by local teams to validate the maps.', 'স্থানীয় দলের মাঠ যাচাই দিয়ে মানচিত্র যাচাই।')}</li>
                <li>• {L('Separate village trees and crops from mangrove.', 'গ্রামের গাছ ও ফসলকে ম্যানগ্রোভ থেকে আলাদা করা।')}</li>
                <li>• {L('Local soil-carbon samples for better carbon figures.', 'ভালো কার্বন হিসাবের জন্য স্থানীয় মাটির নমুনা।')}</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
  ]

  const last = chapters.length - 1
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setChapter((c) => Math.min(last, c + 1))
      if (e.key === 'ArrowLeft') setChapter((c) => Math.max(0, c - 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, last])

  if (!open) return null
  const C = chapters[chapter]

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#021512]/70 p-3 backdrop-blur-sm sm:p-6 print:hidden" role="dialog" aria-modal="true" aria-label={L('How MangroveLens works', 'MangroveLens কীভাবে কাজ করে')} onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-[#f7faf8] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Chapter rail */}
        <aside className="hidden w-64 shrink-0 flex-col bg-[#04241d] p-5 text-white md:flex">
          <div className="flex items-center gap-2">
            <img src={BRAND.icon} alt="" className="size-10" />
            <div>
              <p className="font-display text-base font-extrabold leading-none">
                Mangrove<span className="text-emerald-400">Lens</span>
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-emerald-300/80">{L('HOW IT WORKS', 'কীভাবে কাজ করে')}</p>
            </div>
          </div>
          <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
            {chapters.map((c, i) => {
              const Icon = c.icon
              const on = i === chapter
              return (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => setChapter(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? 'bg-emerald-500 font-bold text-[#04241d]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-lg font-mono text-[11px] ${on ? 'bg-[#04241d]/15' : i < chapter ? 'bg-emerald-400/25 text-emerald-200' : 'bg-white/10'}`}>
                    {i < chapter ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
              )
            })}
          </nav>
          <p className="mt-4 font-mono text-[10px] leading-relaxed text-white/40">{BRAND.tagline}</p>
        </aside>

        {/* Content */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-[#d6e6de] px-5 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[#6c817a]">
                {L('CHAPTER', 'অধ্যায়')} {chapter + 1} / {chapters.length}
              </p>
              <div className="mt-1.5 h-1 w-48 overflow-hidden rounded-full bg-[#e5efe9]">
                <div className="h-1 rounded-full bg-[#16865f] transition-all" style={{ width: `${((chapter + 1) / chapters.length) * 100}%` }} />
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-[#d6e6de] text-[#123f38] hover:bg-white" aria-label={L('Close', 'বন্ধ করুন')}>
              <X className="size-4" />
            </button>
          </header>

          <div key={chapter} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 [animation:fadeInUp_0.35s_ease-out]">
            {C.body}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[#d6e6de] bg-white px-5 py-3">
            <button
              type="button"
              disabled={chapter === 0}
              onClick={() => setChapter((c) => c - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-[#d6e6de] px-4 py-2 text-sm font-bold text-[#123f38] disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> {L('Back', 'পিছনে')}
            </button>
            <div className="hidden gap-1.5 sm:flex">
              {chapters.map((c, i) => (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => setChapter(i)}
                  aria-label={c.title}
                  className={`h-2 rounded-full transition-all ${i === chapter ? 'w-6 bg-[#16865f]' : 'w-2 bg-[#cfe0d7] hover:bg-[#9bc5b0]'}`}
                />
              ))}
            </div>
            {chapter < last ? (
              <button type="button" onClick={() => setChapter((c) => c + 1)} className="flex items-center gap-1.5 rounded-xl bg-[#16865f] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f6e4d]">
                {L('Next', 'পরের')}: {chapters[chapter + 1].title} <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-xl bg-[#16865f] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f6e4d]">
                {L('Start exploring', 'নিজে দেখা শুরু করুন')} <ArrowRight className="size-4" />
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  )
}
