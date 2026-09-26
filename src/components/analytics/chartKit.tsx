/**
 * Shared look for every dashboard chart: soft glowing lines, gradient fills,
 * a pulsing "latest" point with its value, dark glass tooltips and legend chips.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export const CK = {
  ink: '#0f352e',
  green: '#16865f',
  mint: '#10b981',
  grid: '#e6efe9',
  muted: '#6c817a',
  violet: '#7c3aed',
  blue: '#2563eb',
  red: '#e11d48',
} as const

export const axisTick = { fontSize: 11, fill: '#6c817a', fontFamily: 'var(--font-mono)' }

/** Integer year ticks between two decimal years (every 2nd year when crowded). */
export function yearTicks(min: number, max: number) {
  const a = Math.ceil(min)
  const b = Math.floor(max)
  const step = b - a > 10 ? 5 : b - a > 7 ? 2 : 1
  const out: number[] = []
  for (let y = a; y <= b; y += step) out.push(y)
  return out
}

/** Gradient fill + glow filter for one colour. Use `${id}-fill` and `${id}-glow`. */
export function GlowDefs({ id, color, top = 0.32 }: { id: string; color: string; top?: number }) {
  return (
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={top} />
        <stop offset="70%" stopColor={color} stopOpacity={top * 0.2} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
      <filter id={`${id}-glow`} x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
        <feColorMatrix in="blur" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0`} result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

type DotProps = { cx?: number; cy?: number; index?: number; value?: unknown }

/**
 * Dot renderer: small ring for every point, and for the last point a pulsing
 * halo plus a value pill (so the latest reading is always readable).
 */
export function makeDot({
  lastIndex,
  color,
  label,
  showAll = true,
}: {
  lastIndex: number
  color: string
  label?: (v: number) => string
  showAll?: boolean
}) {
  return function Dot({ cx, cy, index, value }: DotProps) {
    const v = Array.isArray(value) ? value[1] : value
    if (cx == null || cy == null || typeof v !== 'number') return <g key={`d-${index}`} />
    if (index !== lastIndex) {
      if (!showAll) return <g key={`d-${index}`} />
      return <circle key={`d-${index}`} cx={cx} cy={cy} r={3.6} fill="#fff" stroke={color} strokeWidth={2.2} />
    }
    const text = label ? label(v) : ''
    const w = Math.max(34, text.length * 6.6 + 14)
    return (
      <g key={`d-${index}`}>
        <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.35}>
          <animate attributeName="r" values="5;14" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="#fff" strokeWidth={2.5} />
        {text && (
          <g transform={`translate(${cx - w - 10}, ${cy - 30})`}>
            <rect width={w} height={20} rx={10} fill={CK.ink} opacity={0.92} />
            <text x={w / 2} y={13.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#fff" fontFamily="var(--font-mono)">
              {text}
            </text>
          </g>
        )}
      </g>
    )
  }
}

/** Dark glass tooltip used by all charts. */
export function TooltipCard({ title, badge, children }: { title: ReactNode; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-[220px] rounded-xl border border-emerald-400/25 bg-[#031d17]/95 p-3 text-white shadow-[0_18px_40px_rgba(3,29,23,0.35)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
        <span className="font-mono text-xs font-bold text-emerald-300">{title}</span>
        {badge && <span className="font-mono text-[10px] text-emerald-200/70">{badge}</span>}
      </div>
      <div className="space-y-1 text-[11.5px]">{children}</div>
    </div>
  )
}

export function TooltipRow({ color, label, value, sub, dashed }: { color: string; label: ReactNode; value: ReactNode; sub?: ReactNode; dashed?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-white/75">
        <span className={cn('mt-px inline-block w-3', dashed ? 'border-t-2 border-dashed' : 'h-2 rounded-full')} style={dashed ? { borderColor: color } : { background: color }} />
        {label}
      </span>
      <span className="text-right">
        <span className="font-mono font-bold text-white">{value}</span>
        {sub && <span className="block font-mono text-[10px] text-white/50">{sub}</span>}
      </span>
    </div>
  )
}

/** Legend chip; clickable when `onClick` is given. */
export function LegendChip({
  color,
  label,
  kind = 'line',
  active = true,
  onClick,
}: {
  color: string
  label: ReactNode
  kind?: 'line' | 'dashed' | 'band' | 'dot'
  active?: boolean
  onClick?: () => void
}) {
  const swatch =
    kind === 'band' ? (
      <span className="h-2.5 w-4 rounded-sm" style={{ background: color, opacity: 0.25 }} />
    ) : kind === 'dashed' ? (
      <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} />
    ) : kind === 'dot' ? (
      <span className="size-2.5 rounded-full" style={{ background: color }} />
    ) : (
      <span className="h-[3px] w-4 rounded-full" style={{ background: color }} />
    )
  const cls = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
    active ? 'border-[#d6e6de] bg-white text-[#123f38] shadow-2xs' : 'border-transparent bg-transparent text-[#9bb0a8]',
    onClick && 'cursor-pointer hover:border-[#b9d6c7]',
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {swatch}
      {label}
    </button>
  ) : (
    <span className={cls}>
      {swatch}
      {label}
    </span>
  )
}

/** Small KPI tile used above charts. */
export function StatTile({ label, value, tone = 'ink', hint }: { label: ReactNode; value: ReactNode; tone?: 'ink' | 'green' | 'red' | 'violet'; hint?: ReactNode }) {
  const color = { ink: 'text-[#0f352e]', green: 'text-[#16865f]', red: 'text-rose-700', violet: 'text-violet-700' }[tone]
  return (
    <div className="min-w-0 rounded-xl border border-[#dbe8e1] bg-gradient-to-b from-white to-[#f6faf8] px-3 py-2 shadow-2xs">
      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-[#6c867d]">{label}</p>
      <p className={cn('truncate font-display text-base font-bold', color)}>{value}</p>
      {hint && <p className="truncate text-[10.5px] text-[#7d958d]">{hint}</p>}
    </div>
  )
}
