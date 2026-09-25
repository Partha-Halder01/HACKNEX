import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type Lang = 'en' | 'bn'

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'
export const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)])

export function fmt(value: number | null | undefined, digits = 1, lang: Lang = 'en'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const s = value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
  return lang === 'bn' ? toBnDigits(s) : s
}

export function signed(value: number, digits = 1, lang: Lang = 'en'): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value), digits, lang)}`
}

const STRINGS = {
  title: { en: 'Mangrove & Blue Carbon Analytics', bn: 'ম্যানগ্রোভ ও ব্লু কার্বন বিশ্লেষণ' },
  subtitle: {
    en: 'Pick a place on the map and a date range — area, change, carbon and scenarios are computed for that area.',
    bn: 'মানচিত্রে জায়গা ও তারিখ বেছে নিন — সেই এলাকার বন, পরিবর্তন, কার্বন ও সম্ভাব্য চিত্র হিসাব হবে।',
  },
  home: { en: 'Home', bn: 'হোম' },
  location: { en: 'Location', bn: 'অবস্থান' },
  clickMap: { en: 'Click the map to move the point', bn: 'বিন্দু সরাতে মানচিত্রে ক্লিক করুন' },
  radius: { en: 'Radius', bn: 'ব্যাসার্ধ' },
  startDate: { en: 'Start date', bn: 'শুরুর তারিখ' },
  endDate: { en: 'End date', bn: 'শেষ তারিখ' },
  window: { en: 'Image window', bn: 'ছবির সময়কাল' },
  useAi: { en: 'Gemini wording (validated)', bn: 'Gemini ভাষা (যাচাই সহ)' },
  run: { en: 'Run analysis', bn: 'বিশ্লেষণ চালান' },
  running: { en: 'Analysing…', bn: 'বিশ্লেষণ চলছে…' },
  presets: { en: 'Quick places', bn: 'দ্রুত জায়গা' },
  mangroveStart: { en: 'Mangrove at start', bn: 'শুরুতে ম্যানগ্রোভ' },
  mangroveEnd: { en: 'Mangrove at end', bn: 'শেষে ম্যানগ্রোভ' },
  netChange: { en: 'Net change', bn: 'নিট পরিবর্তন' },
  carbonStock: { en: 'Carbon stock (end)', bn: 'কার্বন মজুত (শেষে)' },
  co2Change: { en: 'CO₂e stock change', bn: 'CO₂e মজুত পরিবর্তন' },
  timeline: { en: 'Mangrove area over time', bn: 'সময়ের সঙ্গে ম্যানগ্রোভ এলাকা' },
  change: { en: 'What changed', bn: 'কী বদলেছে' },
  carbon: { en: 'Carbon (IPCC Tier 1)', bn: 'কার্বন (IPCC টিয়ার ১)' },
  scenarios: { en: 'Next 5 years — scenarios', bn: 'আগামী ৫ বছর — সম্ভাব্য চিত্র' },
  accuracy: { en: 'Model accuracy', bn: 'মডেলের নির্ভুলতা' },
  explanation: { en: 'Plain-language summary', bn: 'সহজ ভাষায় সারাংশ' },
  fieldCheck: { en: 'Field check', bn: 'মাঠ যাচাই' },
  method: { en: 'Method & data', bn: 'পদ্ধতি ও তথ্য' },
  gain: { en: 'Gain', bn: 'বৃদ্ধি' },
  loss: { en: 'Loss', bn: 'ক্ষতি' },
  uncertain: { en: 'Uncertain', bn: 'অনিশ্চিত' },
  stable: { en: 'Stable mangrove', bn: 'স্থির ম্যানগ্রোভ' },
  empty: { en: 'Choose a place and dates, then press “Run analysis”.', bn: 'জায়গা ও তারিখ বেছে “বিশ্লেষণ চালান” চাপুন।' },
} as const

export type StringKey = keyof typeof STRINGS
export const t = (key: StringKey, lang: Lang) => STRINGS[key][lang]

export function Card({
  title,
  right,
  children,
  className,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'glass-panel rounded-2xl p-4 sm:p-5.5 transition-all duration-300 hover:shadow-[0_12px_36px_rgba(7,61,52,0.08)] break-inside-avoid relative overflow-hidden',
        className,
      )}
    >
      <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-500/5 to-transparent pointer-events-none rounded-tr-2xl" />
      {(title || right) && (
        <header className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5efe9]/80 pb-2.5">
          {title && (
            <h2 className="font-display text-base font-bold tracking-tight text-[#123f38] flex items-center gap-2">
              {title}
            </h2>
          )}
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Kpi({
  label,
  value,
  unit,
  detail,
  tone = 'green',
}: {
  label: string
  value: string
  unit?: string
  detail?: ReactNode
  tone?: 'green' | 'red' | 'blue' | 'neutral'
}) {
  const accent =
    tone === 'red' ? 'text-[#dc2626]' : tone === 'blue' ? 'text-[#2563eb]' : tone === 'neutral' ? 'text-[#123f38]' : 'text-[#16865f]'
  return (
    <article className="glass-panel group relative rounded-2xl p-4.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(7,61,52,0.08)]">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#6c817a]">{label}</p>
      <p className={cn('mt-1.5 font-display text-2xl font-extrabold font-tabular tracking-tight', accent)}>
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-[#6c817a]">{unit}</span>}
      </p>
      {detail && <div className="mt-1.5 text-xs text-[#526a63]">{detail}</div>}
    </article>
  )
}

export function Badge({ tone, children }: { tone: 'live' | 'demo' | 'info'; children: ReactNode }) {
  const cls =
    tone === 'live'
      ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]/80 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
      : tone === 'demo'
      ? 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]/80'
      : 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]/80'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-tight', cls)}>
      {tone === 'live' && <span className="size-1.5 rounded-full bg-[#16a34a] beacon-pulse inline-block" />}
      {children}
    </span>
  )
}
