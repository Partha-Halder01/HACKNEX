import { useEffect, useRef, useState } from 'react'
import { Check, CircleDashed, Loader2, Satellite } from 'lucide-react'
import type { AnalysisProgress as Snapshot, ProgressStep } from '../../types/analysis'
import type { Lang } from './ui'
import { cn } from '../../lib/utils'

/** Plain-language labels for the step ids the backend reports (see backend/app/analysis/progress.py). */
const STEP_TEXT: Record<string, { en: string; bn: string; hintEn: string; hintBn: string }> = {
  check: { en: 'Checking your request', bn: 'অনুরোধ যাচাই', hintEn: 'Place, years and season look valid', hintBn: 'জায়গা, বছর ও মৌসুম ঠিক আছে কিনা' },
  cache: { en: 'Found a saved result', bn: 'আগের ফলাফল পাওয়া গেছে', hintEn: 'Same question was answered recently', hintBn: 'একই প্রশ্নের উত্তর সম্প্রতি তৈরি হয়েছে' },
  demo: { en: 'Building sample result', bn: 'নমুনা ফলাফল তৈরি', hintEn: 'Satellite link is off, using demo engine', hintBn: 'উপগ্রহ সংযোগ বন্ধ, ডেমো ইঞ্জিন চলছে' },
  train: { en: 'Teaching the model', bn: 'মডেল শেখানো হচ্ছে', hintEn: 'Random Forest learns from known mangrove maps', hintBn: 'পরিচিত ম্যানগ্রোভ মানচিত্র থেকে Random Forest শিখছে' },
  test: { en: 'Testing the model', bn: 'মডেল পরীক্ষা', hintEn: 'Checked on a year it has never seen', hintBn: 'যে বছর দেখেনি সেই বছরে পরীক্ষা' },
  photos: { en: 'Reading satellite photos', bn: 'উপগ্রহ ছবি পড়া হচ্ছে', hintEn: 'Cloud-free Sentinel-2 photo for each period', hintBn: 'প্রতিটি সময়ের মেঘমুক্ত Sentinel-2 ছবি' },
  areacheck: { en: 'Cross-checking the area', bn: 'এলাকা মিলিয়ে দেখা', hintEn: 'Compared with an independent mangrove map', hintBn: 'স্বাধীন ম্যানগ্রোভ মানচিত্রের সাথে তুলনা' },
  change: { en: 'Finding loss and growth', bn: 'ক্ষতি ও বৃদ্ধি খোঁজা', hintEn: 'First photo vs last photo, pixel by pixel', hintBn: 'প্রথম ও শেষ ছবি, পিক্সেল ধরে তুলনা' },
  tiles: { en: 'Drawing the maps', bn: 'মানচিত্র আঁকা হচ্ছে', hintEn: 'Map layers for before, after and change', hintBn: 'আগে, পরে ও পরিবর্তনের স্তর' },
  history: { en: 'Adding past years', bn: 'পুরোনো বছর যোগ', hintEn: 'Reference map history for context', hintBn: 'প্রেক্ষাপটের জন্য পুরোনো মানচিত্র' },
  carbon: { en: 'Counting carbon', bn: 'কার্বন হিসাব', hintEn: 'IPCC factors with ± range, plus 5-year outlook', hintBn: 'IPCC গুণক ও ± পরিসর, সাথে ৫ বছরের পূর্বাভাস' },
  summary: { en: 'Writing the summary', bn: 'সারাংশ লেখা', hintEn: 'Plain-language explanation of the numbers', hintBn: 'সংখ্যাগুলোর সহজ ব্যাখ্যা' },
}

const label = (id: string, bn: boolean) => (STEP_TEXT[id] ? (bn ? STEP_TEXT[id].bn : STEP_TEXT[id].en) : id)
const hint = (id: string, bn: boolean) => (STEP_TEXT[id] ? (bn ? STEP_TEXT[id].hintBn : STEP_TEXT[id].hintEn) : '')
const secs = (s: number | null | undefined) => (s == null ? '' : s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`)

/** Before the first poll answers, show the first step as running. */
const PLACEHOLDER: ProgressStep[] = [
  { id: 'check', status: 'active', seconds: null },
  { id: 'photos', status: 'pending', seconds: null },
  { id: 'carbon', status: 'pending', seconds: null },
  { id: 'summary', status: 'pending', seconds: null },
]

type Phase = 'hidden' | 'running' | 'done' | 'leaving'

export function AnalysisProgress({ loading, snapshot, failed, lang }: { loading: boolean; snapshot: Snapshot | null; failed: boolean; lang: Lang }) {
  const bn = lang === 'bn'
  const [phase, setPhase] = useState<Phase>(loading ? 'running' : 'hidden')
  const [tick, setTick] = useState(0)
  const startedAt = useRef(0)
  const finalElapsed = useRef(0)

  // Phase machine: running → done ("Done in Xs") → leaving (collapse) → hidden.
  useEffect(() => {
    if (loading) {
      startedAt.current = performance.now()
      setPhase('running')
      return
    }
    if (failed) {
      setPhase('hidden')
      return
    }
    finalElapsed.current = (performance.now() - startedAt.current) / 1000
    setPhase((p) => (p === 'running' ? 'done' : p))
    const t1 = window.setTimeout(() => setPhase((p) => (p === 'done' ? 'leaving' : p)), 1400)
    const t2 = window.setTimeout(() => setPhase((p) => (p === 'leaving' ? 'hidden' : p)), 1400 + 650)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [loading, failed])

  // Local clock so the timer moves smoothly between polls.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [phase])

  if (phase === 'hidden') return null

  const done = phase !== 'running'
  const rawSteps = snapshot?.steps?.length ? snapshot.steps : PLACEHOLDER
  const steps: ProgressStep[] = done ? rawSteps.map((s) => ({ ...s, status: 'done' })) : rawSteps
  const activeIdx = steps.findIndex((s) => s.status === 'active')
  const active = activeIdx >= 0 ? steps[activeIdx] : null
  const next = steps.find((s, i) => s.status === 'pending' && i > activeIdx)
  const detail = snapshot?.detail
  const sub = active?.id === 'photos' && detail?.n ? Math.min(1, ((detail.i ?? 1) - 0.5) / detail.n) : 0.4
  const doneCount = steps.filter((s) => s.status === 'done').length
  const pct = done ? 100 : Math.min(97, ((doneCount + (active ? sub : 0)) / steps.length) * 100)
  void tick
  const elapsed = done ? finalElapsed.current : (performance.now() - startedAt.current) / 1000

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-[650ms] ease-[cubic-bezier(.4,0,.2,1)]',
        phase === 'leaving' ? 'grid-rows-[0fr] opacity-0 -mb-6' : 'grid-rows-[1fr] opacity-100',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="min-h-0 overflow-hidden">
        <div className="overflow-hidden rounded-2xl border border-[#cfe3d9] bg-white shadow-[0_10px_30px_rgba(4,36,29,0.10)]" style={{ animation: 'scaleIn .35s ease-out' }}>
          {/* Header */}
          <div className="relative overflow-hidden bg-[#04241d] px-5 py-4 text-white">
            <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <Radar done={done} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-emerald-300/90">
                  {done ? (bn ? 'বিশ্লেষণ সম্পূর্ণ' : 'ANALYSIS COMPLETE') : bn ? 'বিশ্লেষণ চলছে · লাইভ' : 'ANALYSING · LIVE'}
                </p>
                <p key={done ? 'done' : active?.id} className="mt-0.5 truncate font-display text-lg font-extrabold" style={{ animation: 'fadeIn .35s ease-out' }}>
                  {done ? (bn ? `${secs(elapsed)}-এ শেষ হয়েছে` : `Done in ${secs(elapsed)}`) : active ? label(active.id, bn) : bn ? 'শুরু হচ্ছে…' : 'Starting…'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-bold tabular-nums leading-none">{Math.round(pct)}%</p>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-white/55">{secs(elapsed) || '0.0s'}</p>
              </div>
            </div>
            <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={cn('relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out', done ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-300')} style={{ width: `${pct}%` }}>
                {!done && <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />}
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            {/* Now / Next */}
            <div className="space-y-3 border-b border-[#e5efe9] p-5 md:border-b-0 md:border-r">
              <div key={active?.id ?? (done ? 'done' : 'none')} className="rounded-xl bg-[#eef7f2] p-4 ring-1 ring-[#cfe8db]" style={{ animation: 'fadeInUp .4s ease-out' }}>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#16865f]">{done ? (bn ? 'ফলাফল' : 'RESULT') : bn ? 'এখন' : 'NOW'}</p>
                <p className="mt-1 text-[15px] font-bold text-[#0d2e27]">
                  {done ? (bn ? 'সব ধাপ শেষ — ফলাফল দেখানো হচ্ছে' : 'All steps finished — showing results') : active ? label(active.id, bn) : bn ? 'শুরু হচ্ছে…' : 'Starting…'}
                </p>
                {!done && active && <p className="mt-0.5 text-xs text-[#4f6b63]">{hint(active.id, bn)}</p>}
                {!done && active?.id === 'photos' && detail?.n ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#16865f]">
                      <span>
                        {bn ? `ছবি ${detail.i} / ${detail.n}` : `Photo ${detail.i} of ${detail.n}`}
                        {detail.label ? ` · ${detail.label}` : ''}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: detail.n }, (_, k) => (
                        <span
                          key={k}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors duration-500',
                            k + 1 < (detail.i ?? 0) ? 'bg-[#16865f]' : k + 1 === detail.i ? 'animate-pulse bg-emerald-400' : 'bg-[#d6e6de]',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {!done && next && (
                <div key={next.id} className="flex items-start gap-3 rounded-xl border border-dashed border-[#cfe3d9] p-3.5" style={{ animation: 'fadeIn .4s ease-out' }}>
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-[#8aa69c]" />
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#8aa69c]">{bn ? 'এরপর' : 'NEXT'}</p>
                    <p className="text-sm font-semibold text-[#35514a]">{label(next.id, bn)}</p>
                    <p className="text-[11px] text-[#7d958d]">{hint(next.id, bn)}</p>
                  </div>
                </div>
              )}
              {!done && (
                <p className="text-[11px] leading-relaxed text-[#7d958d]">
                  {bn
                    ? 'নতুন এলাকা বা বছরের প্রথম বিশ্লেষণে ১–২ মিনিট লাগতে পারে; পরেরবার এটি সঙ্গে সঙ্গে আসে।'
                    : 'A new place or year can take 1–2 minutes the first time; repeat questions come back instantly.'}
                </p>
              )}
            </div>

            {/* Step list */}
            <ol className="relative p-5">
              {steps.map((s, i) => {
                const isNext = !done && s === next
                return (
                  <li key={s.id} className="relative flex gap-3 pb-3 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className={cn('absolute left-[11px] top-6 bottom-0 w-px transition-colors duration-500', s.status === 'done' ? 'bg-[#16865f]/50' : 'bg-[#e1ebe6]')} />
                    )}
                    <span
                      className={cn(
                        'relative z-10 grid size-6 shrink-0 place-items-center rounded-full transition-all duration-500',
                        s.status === 'done' && 'bg-[#16865f] text-white',
                        s.status === 'active' && 'bg-emerald-50 text-[#16865f] ring-2 ring-emerald-400',
                        s.status === 'pending' && (isNext ? 'bg-white text-[#16865f] border-2 border-dashed border-[#9fd0b8]' : 'bg-[#f2f6f4] text-[#a9bdb5]'),
                      )}
                    >
                      {s.status === 'done' ? (
                        <Check className="size-3.5" strokeWidth={3} style={{ animation: 'scaleIn .3s ease-out' }} />
                      ) : s.status === 'active' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span className="font-mono text-[10px] font-bold">{i + 1}</span>
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 pt-0.5">
                      <p
                        className={cn(
                          'truncate text-[13px] transition-colors',
                          s.status === 'done' && 'text-[#35514a]',
                          s.status === 'active' && 'font-bold text-[#0d2e27]',
                          s.status === 'pending' && (isNext ? 'font-semibold text-[#4f6b63]' : 'text-[#a3b7af]'),
                        )}
                      >
                        {label(s.id, bn)}
                        {isNext && <span className="ml-2 rounded-full bg-[#e7f4ec] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#16865f]">{bn ? 'এরপর' : 'NEXT'}</span>}
                      </p>
                      <span className={cn('shrink-0 font-mono text-[11px] tabular-nums', s.status === 'active' ? 'text-[#16865f]' : 'text-[#9bb5ab]')}>
                        {s.status === 'active' ? (bn ? 'চলছে' : 'running') : secs(s.seconds)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

function Radar({ done }: { done: boolean }) {
  return (
    <div className="relative grid size-12 shrink-0 place-items-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-300/30">
      {!done && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/15" />
          <span className="animate-radar-sweep absolute inset-1 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(52,211,153,0.45)_60deg,transparent_90deg)]" />
        </>
      )}
      {done ? <Check className="relative size-6 text-emerald-300" strokeWidth={3} style={{ animation: 'scaleIn .3s ease-out' }} /> : <Satellite className="relative size-5 text-emerald-200" />}
    </div>
  )
}
