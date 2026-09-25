import { useEffect, useState } from 'react'
import { Activity, Radio, Satellite, ShieldCheck, Sparkles, Waves } from 'lucide-react'
import type { Lang } from './ui'
import { fmt, toBnDigits } from './ui'

/**
 * Animated number counter with ease-out cubic interpolation.
 * Automatically supports English and Bengali numerals.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  digits = 0,
  lang = 'en',
  prefix = '',
  suffix = '',
}: {
  value: number
  duration?: number
  digits?: number
  lang?: Lang
  prefix?: string
  suffix?: string
}) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    // Check if user prefers reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return
    }

    let startTimestamp: number | null = null
    const startVal = displayValue
    const endVal = value
    const delta = endVal - startVal

    if (Math.abs(delta) < 0.001) {
      setDisplayValue(endVal)
      return
    }

    let animationFrameId: number
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = startVal + delta * ease
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(endVal)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [value, duration])

  const formatted = fmt(displayValue, digits, lang)

  return (
    <span className="font-tabular inline-block transition-transform duration-100">
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

/**
 * Live Satellite Orbital Telemetry HUD widget.
 * Features an animated radar reticle, real-time sweeping scan ray,
 * sensor status signals, and orbit parameters.
 */
export function OrbitalRadarHUD({
  lat,
  lon,
  radiusKm,
  lang = 'en',
}: {
  lat: number
  lon: number
  radiusKm: number
  lang?: Lang
}) {
  const bn = lang === 'bn'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#031d17]/85 p-3.5 sm:p-4 text-emerald-100 backdrop-blur-md shadow-[0_12px_30px_rgba(3,29,23,0.45)]">
      {/* Subtle background tech grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Mini Radar Scanner & Target Coordinates */}
        <div className="flex items-center gap-3.5">
          <div className="relative size-12 shrink-0 rounded-full border border-emerald-400/40 bg-emerald-950/60 p-1 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            {/* Concentric rings */}
            <div className="absolute inset-1.5 rounded-full border border-emerald-500/25" />
            <div className="absolute inset-3 rounded-full border border-emerald-500/35" />
            {/* Crosshairs */}
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-emerald-500/30" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-emerald-500/30" />
            {/* Rotating radar sweep ray */}
            <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none">
              <div className="h-1/2 w-1/2 rounded-tl-full bg-gradient-to-br from-emerald-400/50 via-emerald-500/10 to-transparent" />
            </div>
            {/* Target blip */}
            <div className="absolute top-[35%] left-[60%] size-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7] animate-ping" />
            <div className="absolute top-[35%] left-[60%] size-2 rounded-full bg-emerald-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-light-sub text-[10px] font-bold tracking-[0.2em] text-emerald-400">
                {bn ? 'উপগ্রহ অবস্থান ট্র্যাকার' : 'ORBITAL TARGET ACQUISITION'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LOCK
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs font-semibold text-emerald-100">
              {lat.toFixed(4)}°N, {lon.toFixed(4)}°E · R {radiusKm} km ({fmt(radiusKm * 2, 0, lang)} km swath)
            </p>
          </div>
        </div>

        {/* Right: Live Sensor Telemetry Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 font-mono text-[10.5px]">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-900/40 px-2.5 py-1 border border-emerald-500/20">
            <Satellite className="size-3.5 text-emerald-400 shrink-0" />
            <span>Sentinel-2 L2A</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-900/40 px-2.5 py-1 border border-emerald-500/20">
            <Radio className="size-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span>10m / px GSD</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-emerald-900/40 px-2.5 py-1 border border-emerald-500/20">
            <Waves className="size-3.5 text-teal-400 shrink-0" />
            <span>NIR / Red / SWIR</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-900/40 px-2.5 py-1 border border-emerald-500/20">
            <ShieldCheck className="size-3.5 text-emerald-300 shrink-0" />
            <span>{bn ? 'মেঘমুক্ত < ৫%' : 'Cloud < 5%'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
