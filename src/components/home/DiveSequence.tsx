import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Ban, BrainCircuit, FileText, Gauge, Leaf, Map as MapIcon, Satellite, ShieldCheck, TrendingDown, TriangleAlert, Users } from 'lucide-react'
import { HOME_TEXT, type HomeLang } from './content'
import { FRAME_COUNT, FRAME_H, FRAME_W, coverBox, useFrameSequence } from './useFrameSequence'

/**
 * Scroll timeline (0 → 1 across the pinned section). The dive itself happens in
 * the first half; the service explanation then plays over the slowly drifting
 * underwater footage, so the story never leaves the video.
 */
export const STAGES = {
  hero: [0, 0.035],
  above: [0.055, 0.15],
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
  [0.035, 8],
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

/** Dark glass panel for the service sections, readable on top of the video. */
function InfoPanel({ o, eyebrow, title, bn, children }: { o: number; eyebrow: string; title: string; bn: boolean; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-[5vw] pt-16" style={panelStyle(o, 32)}>
      <div className="w-full max-w-[1280px] rounded-3xl border border-white/10 bg-[#031a17]/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md xl:p-12">
        <p className="font-mono text-xs font-bold tracking-[0.24em] text-emerald-300">{eyebrow}</p>
        <h2 className={`mt-3 max-w-4xl font-condensed text-5xl leading-[0.95] tracking-wide text-white xl:text-6xl ${bn ? 'font-bengali text-4xl font-bold' : ''}`}>
          {title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

const STEP_ICONS = [Satellite, BrainCircuit, Leaf, FileText]
const WHY_ICONS = [TrendingDown, ShieldCheck, Users]
const TRUST_ICONS = [MapIcon, Gauge, TriangleAlert, Ban]

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
  const labels = fade(p, [0, 0.025])
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
  const scrollToStage = (stage: number) => {
    const el = sectionRef.current
    if (el) window.scrollTo({ top: el.offsetTop + stage * (el.offsetHeight - window.innerHeight), behavior: 'smooth' })
  }

  return (
    <section ref={sectionRef} id="dive" className="relative" style={{ height: '1300vh' }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#04241d]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Readability shades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
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
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3 py-1 backdrop-blur-md shadow-2xs">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-emerald-300">
              {T.hero.eyebrow}
            </span>
          </div>

          {/* Majestic Hero Headline */}
          <h1
            className={`mt-3.5 sm:mt-4 font-condensed font-black tracking-tight text-white leading-[0.93] ${
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
              onClick={() => scrollToStage(0.1)}
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
          <div className="grid gap-5 md:grid-cols-3">
            {T.why.cards.map(([title, body], i) => {
              const Icon = WHY_ICONS[i]
              return (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                  <Icon className="size-7 text-emerald-300" />
                  <h3 className="mt-4 font-display text-xl font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
                </article>
              )
            })}
          </div>
        </InfoPanel>

        {/* HOW IT WORKS */}
        <InfoPanel o={how} eyebrow={T.how.eyebrow} title={T.how.title} bn={bn}>
          <ol className="relative grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 md:block" />
            {T.how.steps.map(([title, body], i) => {
              const Icon = STEP_ICONS[i]
              return (
                <li key={title} className="relative">
                  <div className="relative z-10 grid size-14 place-items-center rounded-2xl border border-emerald-300/40 bg-[#062f29] shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                    <Icon className="size-6 text-emerald-300" />
                  </div>
                  <p className="mt-5 font-mono text-[11px] font-bold tracking-[0.2em] text-emerald-300/80">{`0${i + 1}`}</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
                </li>
              )
            })}
          </ol>
        </InfoPanel>

        {/* WHY TRUST IT — plain promises, no figures claimed */}
        <InfoPanel o={trust} eyebrow={T.trust.eyebrow} title={T.trust.title} bn={bn}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {T.trust.points.map(([title, body], i) => {
              const Icon = TRUST_ICONS[i]
              return (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                  <span className={`grid size-11 place-items-center rounded-xl ${i === 2 ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300'}`}>
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
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

        {/* Section dots (for the service part) */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2" style={{ opacity: info }} aria-hidden>
          {[problem, how, trust, cta].map((o, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${o > 0.5 ? 'w-8 bg-emerald-300' : 'w-3 bg-white/35'}`} />
          ))}
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 text-center pointer-events-none transition-opacity duration-300 z-10"
          style={{ opacity: hero }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-8 w-5 justify-center rounded-full border border-white/40 bg-black/25 p-1 backdrop-blur-xs">
              <span className="h-1.5 w-1 animate-bounce rounded-full bg-emerald-400" />
            </div>
            <span className="font-mono text-[8.5px] font-bold tracking-[0.2em] text-white/50 uppercase">
              {bn ? 'স্ক্রোল করুন' : 'Scroll to explore'}
            </span>
          </div>
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
