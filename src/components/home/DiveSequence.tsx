import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Ban, BrainCircuit, FileText, Gauge, Leaf, Map as MapIcon, Satellite, ShieldCheck, TrendingDown, TriangleAlert, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import { HOME_TEXT, type HomeLang } from './content'
import { FRAME_COUNT, FRAME_H, FRAME_W, coverBox, useFrameSequence } from './useFrameSequence'
import { goToSnap, useSectionSnap } from './useSectionSnap'

/**
 * Scroll timeline (0 → 1 across the pinned section). The dive itself happens in
 * the first half; the service explanation then plays over the slowly drifting
 * underwater footage, so the story never leaves the video.
 */
export const STAGES = {
  hero: [0, 0.045],
  above: [0.038, 0.16],
  surface: [0.17, 0.23],
  roots: [0.25, 0.34],
  carbon: [0.36, 0.45],
  problem: [0.475, 0.59],
  how: [0.615, 0.745],
  trust: [0.77, 0.885],
  cta: [0.91, 1],
} as const

/** Scroll progress → video frame. Piecewise linear: fast dive, then slow drift. */
const FRAME_KEYS: [number, number][] = [
  [0, 0],
  [0.045, 8],
  [0.16, 96], // at the surface
  [0.23, 124], // just under water
  [0.45, 205], // down to the glowing sediment
  [1, FRAME_COUNT - 1], // slow drift behind the service panels
]

function frameAt(p: number) {
  for (let i = 1; i < FRAME_KEYS.length; i++) {
    const [p1, f1] = FRAME_KEYS[i]
    const [p0, f0] = FRAME_KEYS[i - 1]
    if (p <= p1) return Math.round(f0 + ((p - p0) / (p1 - p0)) * (f1 - f0))
  }
  return FRAME_COUNT - 1
}

/** Opacity for a panel shown between scroll progress a and b, with soft edges. */
function fade(p: number, [a, b]: readonly [number, number], edge = 0.025) {
  if (p < a || p > b) return 0
  const inO = a <= 0 ? 1 : Math.min(1, (p - a) / edge)
  const outO = b >= 1 ? 1 : Math.min(1, (b - p) / edge)
  return Math.max(0, Math.min(inO, outO))
}

const panelStyle = (o: number, dy = 24): CSSProperties => ({
  opacity: o,
  transform: `translateY(${(1 - o) * dy}px)`,
  pointerEvents: o > 0.6 ? 'auto' : 'none',
  visibility: o > 0 ? 'visible' : 'hidden',
})

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-wide text-emerald-200">
      {children}
    </span>
  )
}

/** A label pinned to a point of the video frame (x, y in video pixels). */
function FrameLabel({ x, y, side, title, sub, o }: { x: number; y: number; side: 'left' | 'right'; title: string; sub: string; o: number }) {
  return (
    <div
      className="absolute flex items-center gap-2 pointer-events-none select-none transition-opacity duration-300"
      style={{
        left: `${(x / FRAME_W) * 100}%`,
        top: `${(y / FRAME_H) * 100}%`,
        transform: `translate(${side === 'left' ? 'calc(-100% + 5px)' : '-5px'}, -50%)`,
        flexDirection: side === 'left' ? 'row-reverse' : 'row',
        opacity: o,
      }}
    >
      <span className="size-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(52,211,153,0.35),0_0_12px_rgba(52,211,153,0.8)]" />
      <span className="h-px w-8 bg-white/60" />
      <span className={`whitespace-nowrap rounded-lg border border-white/15 bg-[#031a17]/80 px-2.5 py-1 backdrop-blur-md shadow-lg shadow-black/50 ${side === 'left' ? 'text-right' : ''}`}>
        <span className="block font-mono text-[10px] sm:text-[10.5px] font-bold tracking-[0.14em] text-emerald-200 uppercase">{title}</span>
        <span className="block font-mono text-[9.5px] sm:text-[10px] text-white/75">{sub}</span>
      </span>
    </div>
  )
}

/** Dark glass panel for the service sections, readable on top of the video with balanced padding and max-height safeguards. */
function InfoPanel({
  o,
  eyebrow,
  title,
  bn,
  children,
}: {
  o: number
  eyebrow: string
  title: string
  bn: boolean
  children: ReactNode
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-20"
      style={panelStyle(o, 28)}
    >
      <div className="relative w-full max-w-[1320px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-[#031d18]/92 via-[#021814]/94 to-[#01110e]/96 p-6 sm:p-8 md:p-9 lg:p-11 shadow-[0_32px_100px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.18)] backdrop-blur-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Subtle ambient lighting highlights */}
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="pointer-events-none absolute -top-28 -right-28 size-96 rounded-full bg-emerald-500/12 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 size-96 rounded-full bg-teal-500/10 blur-[90px]" />

        {/* Header Eyebrow & Title */}
        <div className="relative z-10 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] sm:text-xs font-mono font-bold tracking-[0.22em] text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
            {eyebrow}
          </div>

          <h2
            className={`mt-2.5 sm:mt-3.5 max-w-4xl font-condensed text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[0.96] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] ${
              bn ? 'font-bengali text-2xl sm:text-3xl lg:text-4xl font-bold' : ''
            }`}
          >
            {title}
          </h2>
        </div>

        {/* Content body */}
        <div className="relative z-10 mt-6 sm:mt-8">{children}</div>
      </div>
    </div>
  )
}

const WHY_CARD_META = [
  {
    step: '01',
    tag: 'Ecosystem Dynamics',
    tagBn: 'উপকূলের গতিপ্রকৃতি',
    badge: 'Silent Loss',
    badgeBn: 'নীরব অবক্ষয়',
    icon: TrendingDown,
    iconBox: 'border-rose-400/30 bg-rose-500/10 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    tagClass: 'text-rose-300/90',
    dotColor: 'bg-rose-400',
    highlight: 'Unnoticed tidal erosion & fringe retreat',
    highlightBn: 'ভাঙন ও জোয়ারের কারণে নীরবে জমি হারায়',
    hoverBorder: 'hover:border-rose-400/40 hover:bg-[#1a0f14]/85',
  },
  {
    step: '02',
    tag: 'Uncertainty & Verification',
    tagBn: 'যাচাইযোগ্যতার অভাব',
    badge: 'Trust Gap',
    badgeBn: 'বিশ্বস্ততার ঘাটতি',
    icon: ShieldCheck,
    iconBox: 'border-amber-400/30 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    tagClass: 'text-amber-300/90',
    dotColor: 'bg-amber-400',
    highlight: 'Hidden error margins & unvalidated claims',
    highlightBn: 'পরিমাপের যথার্থতা ও ত্রুটি গোপন থাকে',
    hoverBorder: 'hover:border-amber-400/40 hover:bg-[#1a1608]/85',
  },
  {
    step: '03',
    tag: 'Grassroots Access',
    tagBn: 'তৃণমূলের দূরত্ব',
    badge: 'Last Mile',
    badgeBn: 'শেষ মাইল বাধা',
    icon: Users,
    iconBox: 'border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.15)]',
    tagClass: 'text-sky-300/90',
    dotColor: 'bg-sky-400',
    highlight: 'Locked in English & academic silos',
    highlightBn: 'ইংরেজিতে জটিল রূপ যা স্থানীয় কাজে আসে না',
    hoverBorder: 'hover:border-sky-400/40 hover:bg-[#071d24]/85',
  },
]

const HOW_STEP_META = [
  {
    step: '01',
    badge: 'OPTICAL SATELLITE',
    badgeBn: 'উপগ্রহ ছবি',
    sub: 'Sentinel-2 L2A (10m)',
    subBn: '১০ মিটার রেজোলিউশন',
    icon: Satellite,
    highlight: 'Dry-season cloud-filtered tiles',
    highlightBn: 'মেঘমুক্ত শুকনো মৌসুমের ছবি',
  },
  {
    step: '02',
    badge: 'AI CLASSIFIER',
    badgeBn: 'মেশিন লার্নিং',
    sub: 'Random Forest Model',
    subBn: 'CGMD-AFCC30 গ্রাউন্ড ট্রুথ',
    icon: BrainCircuit,
    highlight: 'Supervised mangrove detection',
    highlightBn: 'বৈজ্ঞানিক মানচিত্রে প্রশিক্ষিত',
  },
  {
    step: '03',
    badge: 'TEMPORAL DELTA',
    badgeBn: 'সময়ভিত্তিক তুলনা',
    sub: 'Pixel-to-Pixel Net Change',
    subBn: 'পিক্সেল-টু-পিক্সেল তুলনা',
    icon: Leaf,
    highlight: 'Confirmed canopy gains vs loss',
    highlightBn: 'বাস্তব বৃদ্ধি বনাম ক্ষতি',
  },
  {
    step: '04',
    badge: 'ACTIONABLE INSIGHT',
    badgeBn: 'পরিষ্কার ফলাফল',
    sub: 'Bilingual & Verified Export',
    subBn: 'দ্বিভাষিক সহজ উত্তর',
    icon: FileText,
    highlight: 'Confidence-stamped report',
    highlightBn: 'নির্ভরযোগ্যতার সংকেতসহ',
  },
]

const TRUST_CARD_META = [
  {
    badge: 'Ground Truth',
    badgeBn: 'বৈজ্ঞানিক মানচিত্র',
    icon: MapIcon,
    iconBox: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)]',
    tagBadge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    dotColor: 'bg-emerald-400',
    footer: 'CGMD-AFCC30 Reference Map',
    footerBn: 'স্বাধীন বিজ্ঞানীদের রেফারেন্স মানচিত্র',
    hoverBorder: 'hover:border-emerald-400/40 hover:bg-[#062c25]/85',
  },
  {
    badge: 'Certainty Tiers',
    badgeBn: 'নিশ্চয়তার মাত্রা',
    icon: Gauge,
    iconBox: 'border-sky-400/35 bg-sky-500/15 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.18)]',
    tagBadge: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
    dotColor: 'bg-sky-400',
    footer: 'Green / Yellow / Red Reliability',
    footerBn: 'স্পষ্ট ট্রাফিক-লাইট সংকেত',
    hoverBorder: 'hover:border-sky-400/40 hover:bg-[#07242c]/85',
  },
  {
    badge: 'Known Limits',
    badgeBn: 'সতর্কতা ও সীমাবদ্ধতা',
    icon: TriangleAlert,
    iconBox: 'border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    tagBadge: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    dotColor: 'bg-amber-400',
    footer: 'Flags Edge Ambiguity & Tides',
    footerBn: 'গ্রামের কিনারা ও মৌসুমি বিভ্রান্তি সতর্কতা',
    hoverBorder: 'hover:border-amber-400/40 hover:bg-[#251e08]/85',
  },
  {
    badge: 'Ethical Science',
    badgeBn: 'নীতিগত স্বচ্ছতা',
    icon: Ban,
    iconBox: 'border-teal-400/35 bg-teal-500/15 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.18)]',
    tagBadge: 'border-teal-400/30 bg-teal-500/10 text-teal-300',
    dotColor: 'bg-teal-400',
    footer: 'Conservation Only · No Credits',
    footerBn: 'কোনো আর্থিক বা কার্বন ক্রেডিট দাবি নেই',
    hoverBorder: 'hover:border-teal-400/40 hover:bg-[#062925]/85',
  },
]

export function DiveSequence({ lang, onOpenDashboard }: { lang: HomeLang; onOpenDashboard: () => void }) {
  const T = HOME_TEXT[lang]
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [p, setP] = useState(0)
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight })
  const { loaded, total, nearest } = useFrameSequence()
  const frame = frameAt(p)

  // Scroll → progress through the pinned section. Browsers already deliver scroll
  // events at most once per frame, so no rAF here (rAF pauses in background tabs).
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      setP(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0)
    }
    const onResize = () => {
      setView({ w: window.innerWidth, h: window.innerHeight })
      onScroll()
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // One small scroll = one section, for every section of the story.
  useSectionSnap(sectionRef)

  // Draw the frame for the current progress (and redraw as better frames arrive).
  useEffect(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (c.width !== Math.round(view.w * dpr) || c.height !== Math.round(view.h * dpr)) {
      c.width = Math.round(view.w * dpr)
      c.height = Math.round(view.h * dpr)
    }
    const img = nearest(frame)
    if (!img) return
    const b = coverBox(view.w, view.h)
    ctx.drawImage(img, b.x * dpr, b.y * dpr, b.w * dpr, b.h * dpr)
  }, [frame, loaded, view, nearest])

  const box = coverBox(view.w, view.h)
  const hero = fade(p, STAGES.hero)
  const labels = fade(p, [0, 0.04])
  const above = fade(p, STAGES.above)
  const surface = fade(p, STAGES.surface, 0.02)
  const roots = fade(p, STAGES.roots)
  const carbon = fade(p, STAGES.carbon)
  const problem = fade(p, STAGES.problem)
  const how = fade(p, STAGES.how)
  const trust = fade(p, STAGES.trust)
  const cta = fade(p, STAGES.cta)
  const info = Math.max(problem, how, trust, cta)
  const depth = Math.min(1, p / STAGES.carbon[1]) // the gauge covers the dive only
  const stops = [0, 0.4, 0.62, 0.9]
  const bn = lang === 'bn'

  return (
    <section ref={sectionRef} id="dive" className="relative" style={{ height: '1300vh' }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#04241d]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Readability shades — transparent top header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent" />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[66%] lg:w-[56%] bg-gradient-to-r from-[#031c17]/95 via-[#031c17]/60 to-transparent"
          style={{ opacity: Math.max(hero, above * 0.9, carbon * 0.8) }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[60%] bg-gradient-to-l from-[#03201c]/80 via-[#03201c]/35 to-transparent"
          style={{ opacity: roots }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#021512]" style={{ opacity: Math.max(carbon * 0.3, info * 0.45) }} />

        {/* Labels pinned to the opening frame, like the reference illustration */}
        <div className="pointer-events-none absolute hidden lg:block" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
          <FrameLabel x={1005} y={205} side="left" title={T.labels.canopy[0]} sub={T.labels.canopy[1]} o={labels} />
          <FrameLabel x={1150} y={395} side="left" title={T.labels.water[0]} sub={T.labels.water[1]} o={labels} />
          <FrameLabel x={905} y={520} side="right" title={T.labels.roots[0]} sub={T.labels.roots[1]} o={labels} />
          <FrameLabel x={860} y={605} side="right" title={T.labels.carbon[0]} sub={T.labels.carbon[1]} o={labels} />
        </div>

        {/* HERO */}
        <div
          className="absolute inset-y-0 left-[6vw] flex flex-col justify-center max-w-[640px] xl:max-w-[700px] pt-14 pb-14 z-10"
          style={panelStyle(hero, 0)}
        >
          {/* Majestic Hero Headline */}
          <h1
            className={`font-condensed font-black tracking-tight text-white leading-[0.93] ${
              bn
                ? 'font-bengali text-4xl sm:text-5xl lg:text-6xl font-bold'
                : 'text-5xl sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]'
            }`}
          >
            {T.hero.title1}
            <br />
            {T.hero.title2}
            <br />
            <span className="text-emerald-300 drop-shadow-[0_2px_24px_rgba(52,211,153,0.35)]">
              {T.hero.title3}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 sm:mt-4 max-w-[500px] font-light-sub text-xs sm:text-sm font-light leading-relaxed tracking-[0.16em] text-white/85">
            {T.hero.sub}
          </p>

          {/* Action CTAs */}
          <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-[#04241d] shadow-[0_4px_24px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-300 hover:shadow-[0_6px_28px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {T.hero.primary} <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goToSnap(1)}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5.5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/50 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {T.hero.secondary} <ArrowDown className="size-4" />
            </button>
          </div>
        </div>

        {/* 01 · ABOVE THE WATER */}
        <div className="absolute left-[6vw] top-1/2 max-w-[560px] -translate-y-1/2" style={panelStyle(above)}>
          <p className="font-mono text-xs font-bold tracking-[0.22em] text-emerald-300">{T.above.step}</p>
          <h2 className={`mt-3 font-condensed text-6xl leading-[0.95] tracking-wide text-white ${bn ? 'font-bengali text-5xl font-bold' : ''}`}>{T.above.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-white/85">{T.above.body}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {T.above.chips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        </div>

        {/* SURFACE */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center" style={panelStyle(surface, 12)}>
          <h2 className={`font-condensed text-8xl tracking-[0.08em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] ${bn ? 'font-bengali text-7xl font-bold' : ''}`}>{T.surface.title}</h2>
          <p className="font-light-sub mt-2 text-sm font-light tracking-[0.3em] text-emerald-200">{T.surface.sub.toUpperCase()}</p>
        </div>

        {/* 02 · ROOTS */}
        <div className="absolute right-[7vw] top-1/2 max-w-[520px] -translate-y-1/2 text-right" style={panelStyle(roots)}>
          <p className="font-mono text-xs font-bold tracking-[0.22em] text-emerald-300">{T.roots.step}</p>
          <h2 className={`mt-3 font-condensed text-6xl leading-[0.95] tracking-wide text-white ${bn ? 'font-bengali text-5xl font-bold' : ''}`}>{T.roots.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-white/85">{T.roots.body}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {T.roots.chips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        </div>

        {/* 03 · BLUE CARBON */}
        <div className="absolute left-[6vw] top-[16vh] max-w-[640px]" style={panelStyle(carbon)}>
          <p className="font-mono text-xs font-bold tracking-[0.22em] text-sky-300">{T.carbon.step}</p>
          <p className={`mt-2 font-condensed text-[9rem] leading-none tracking-wide text-white drop-shadow-[0_0_30px_rgba(56,189,248,0.35)] ${bn ? 'font-bengali text-8xl font-bold' : ''}`}>
            {T.carbon.number}
          </p>
          <p className="font-light-sub text-base font-light tracking-[0.18em] text-sky-200">{T.carbon.unit.toUpperCase()}</p>
          <p className="mt-5 max-w-[520px] text-base leading-relaxed text-white/85">{T.carbon.body}</p>
          <p className="mt-3 font-mono text-[11px] text-white/50">{T.carbon.source}</p>
        </div>

        {/* ── The service, explained over the underwater footage ── */}

        {/* THE PROBLEM */}
        <InfoPanel o={problem} eyebrow={T.why.eyebrow} title={T.why.title} bn={bn}>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {T.why.cards.map(([title, body], i) => {
              const meta = WHY_CARD_META[i]
              const Icon = meta.icon
              return (
                <article
                  key={title}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.5)]',
                    meta.hoverBorder,
                  )}
                >
                  {/* Subtle top edge line highlight */}
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 group-hover:via-white/40 to-transparent transition-all" />

                  <div>
                    {/* Top icon and step chip */}
                    <div className="flex items-center justify-between gap-3">
                      <div className={cn('flex size-12 sm:size-13 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105', meta.iconBox)}>
                        <Icon className="size-6" />
                      </div>
                      <span className="font-mono text-[11px] font-bold tracking-widest text-white/50 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                        {meta.step}
                      </span>
                    </div>

                    {/* Tag & Title */}
                    <div className="mt-4 sm:mt-5">
                      <span className={cn('inline-block font-mono text-[10.5px] font-bold tracking-wider uppercase mb-1.5', meta.tagClass)}>
                        {bn ? meta.tagBn : meta.tag}
                      </span>
                      <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-white transition-colors">
                        {title}
                      </h3>
                      <p className="mt-2 text-[13px] sm:text-sm leading-relaxed text-white/75 group-hover:text-white/90 transition-colors">
                        {body}
                      </p>
                    </div>
                  </div>

                  {/* Footer takeaway chip */}
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center gap-2">
                    <span className={cn('size-1.5 rounded-full shrink-0', meta.dotColor)} />
                    <span className="font-mono text-[11px] text-white/60 tracking-wide font-medium truncate">
                      {bn ? meta.highlightBn : meta.highlight}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </InfoPanel>

        {/* HOW IT WORKS */}
        <InfoPanel o={how} eyebrow={T.how.eyebrow} title={T.how.title} bn={bn}>
          <div className="relative">
            {/* Horizontal connecting track on desktop */}
            <div className="pointer-events-none absolute left-8 right-8 top-10 hidden h-px bg-gradient-to-r from-emerald-400/10 via-emerald-400/40 to-emerald-400/10 lg:block" />

            <ol className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {T.how.steps.map(([title, body], i) => {
                const meta = HOW_STEP_META[i]
                const Icon = meta.icon
                return (
                  <li
                    key={title}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-[#062c25]/85 hover:shadow-[0_20px_48px_rgba(0,0,0,0.5),0_0_24px_rgba(16,185,129,0.15)]"
                  >
                    {/* Subtle top edge line highlight */}
                    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 group-hover:via-emerald-400/70 to-transparent transition-all" />

                    <div>
                      {/* Step header: Icon + Step number chip */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="relative flex size-12 items-center justify-center rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 to-[#052721] text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-transform duration-300 group-hover:scale-105">
                          <Icon className="size-6" />
                        </div>
                        <span className="font-mono text-xs font-bold tracking-wider text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/15">
                          {`STEP ${meta.step}`}
                        </span>
                      </div>

                      {/* Sub-badge & Title */}
                      <div className="mt-4">
                        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-300/80">
                          {bn ? meta.subBn : meta.sub}
                        </span>
                        <h3 className="mt-1 font-display text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-100 transition-colors">
                          {title}
                        </h3>
                        <p className="mt-2 text-[13px] sm:text-[13.5px] leading-relaxed text-white/75 group-hover:text-white/90 transition-colors">
                          {body}
                        </p>
                      </div>
                    </div>

                    {/* Micro footer info */}
                    <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/55">
                      <span className="truncate">{bn ? meta.highlightBn : meta.highlight}</span>
                      {i < 3 && <ArrowRight className="size-3.5 text-emerald-400/60 hidden lg:block shrink-0 ml-1" />}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </InfoPanel>

        {/* WHY TRUST IT — plain promises, no figures claimed */}
        <InfoPanel o={trust} eyebrow={T.trust.eyebrow} title={T.trust.title} bn={bn}>
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {T.trust.points.map(([title, body], i) => {
              const meta = TRUST_CARD_META[i]
              const Icon = meta.icon
              return (
                <article
                  key={title}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.5)]',
                    meta.hoverBorder,
                  )}
                >
                  {/* Subtle top edge line highlight */}
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 group-hover:via-white/40 to-transparent transition-all" />

                  <div>
                    {/* Header icon + tag badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className={cn('flex size-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105', meta.iconBox)}>
                        <Icon className="size-6" />
                      </div>
                      <span className={cn('font-mono text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border', meta.tagBadge)}>
                        {bn ? meta.badgeBn : meta.badge}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-100 transition-colors">
                        {title}
                      </h3>
                      <p className="mt-2 text-[13px] sm:text-[13.5px] leading-relaxed text-white/75 group-hover:text-white/90 transition-colors">
                        {body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center gap-2">
                    <span className={cn('size-1.5 rounded-full shrink-0', meta.dotColor)} />
                    <span className="font-mono text-[11px] text-white/60 tracking-wide font-medium truncate">
                      {bn ? meta.footerBn : meta.footer}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </InfoPanel>

        {/* CALL TO ACTION */}
        <div className="absolute inset-0 flex items-center justify-center px-[5vw] text-center" style={panelStyle(cta, 32)}>
          <div>
            <h2 className={`font-condensed text-7xl tracking-wide text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] xl:text-8xl ${bn ? 'font-bengali text-6xl font-bold' : ''}`}>
              {T.cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">{T.cta.sub}</p>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-9 py-4 text-base font-bold text-[#04241d] shadow-[0_0_40px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
            >
              {T.cta.button} <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        {/* Depth gauge (during the dive) */}
        <div
          className="absolute right-6 top-1/2 hidden -translate-y-1/2 md:block"
          style={{ opacity: Math.max(0, 1 - labels - info * 1.5) }}
          aria-hidden
        >
          <div className="relative h-[46vh] w-px bg-white/25">
            <div className="absolute left-0 top-0 w-px bg-emerald-300" style={{ height: `${depth * 100}%` }} />
            {T.gauge.map((g, i) => (
              <div key={g} className="absolute right-3 -translate-y-1/2 whitespace-nowrap text-right" style={{ top: `${stops[i] * 100}%` }}>
                <span className={`font-mono text-[10px] font-bold tracking-[0.18em] ${depth >= stops[i] - 0.02 ? 'text-white' : 'text-white/40'}`}>{g.toUpperCase()}</span>
              </div>
            ))}
            <div
              className="absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
              style={{ top: `${depth * 100}%` }}
            />
          </div>
        </div>

        {/* Interactive section navigation pill bar */}
        <div
          className="absolute bottom-6 sm:bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#021512]/80 px-3 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 z-30"
          style={{ opacity: info, pointerEvents: info > 0.5 ? 'auto' : 'none' }}
        >
          {[
            { label: 'The Problem', bn: 'সমস্যা', snap: 5, active: problem > 0.5 },
            { label: 'How It Works', bn: 'পদ্ধতি', snap: 6, active: how > 0.5 },
            { label: 'Why Trust It', bn: 'স্বচ্ছতা', snap: 7, active: trust > 0.5 },
            { label: 'Get Started', bn: 'শুরু করুন', snap: 8, active: cta > 0.5 },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => goToSnap(s.snap)}
              className={cn(
                'group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium transition-all duration-200 cursor-pointer',
                s.active
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5',
              )}
              title={bn ? s.bn : s.label}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full transition-all duration-300',
                  s.active ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] scale-125' : 'bg-white/30 group-hover:bg-white/60',
                )}
              />
              <span className={cn('hidden sm:inline text-[11px]', s.active ? 'font-bold' : '')}>
                {bn ? s.bn : s.label}
              </span>
            </button>
          ))}
        </div>


        {/* Loading indicator (frames keep streaming in; scrolling already works) */}
        {loaded < total && (
          <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
            {T.loading} · {Math.round((loaded / total) * 100)}%
          </div>
        )}
      </div>
    </section>
  )
}
