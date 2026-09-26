import { useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  History,
  Info,
  Layers,
  Satellite,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { fmt, signed, t } from './ui'
import { cn } from '../../lib/utils'

const GREEN = '#16865f'
const HISTORY = '#7c3aed'
const RED = '#dc2626'
const AMBER = '#d97706'
const BLUE = '#2563eb'
const GRID = '#e5efe9'
const AXIS = { fontSize: 11, fill: '#6c817a' }

const yearTick = (v: number) => String(Math.floor(v))

/** Mangrove area per observation window; optional CGMD 1985–2018 context in a second colour. */
export function TimelineChart({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [showHistory, setShowHistory] = useState(false)
  const history = bundle.historical ?? []
  const rows = [
    ...(showHistory ? history.map((h) => ({ x: h.year + 0.5, cgmd: h.mangroveHa })) : []),
    ...bundle.timeline.map((p) => ({
      x: p.decimalYear,
      label: p.label,
      s2: p.mangroveHa,
      band: [
        Math.max(0, p.mangroveHa - p.lowConfidenceHa / 2),
        p.mangroveHa + p.lowConfidenceHa / 2,
      ] as [number, number],
      lowConfidenceHa: p.lowConfidenceHa,
      images: p.imageCount,
    })),
  ]
  const values = rows.flatMap((r) => ('s2' in r ? [r.band![0], r.band![1]] : [r.cgmd]))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.25, hi * 0.02, 1)

  const firstPt = bundle.timeline[0]
  const latestPt = bundle.timeline[bundle.timeline.length - 1]
  const totalChange = latestPt && firstPt ? latestPt.mangroveHa - firstPt.mangroveHa : 0
  const pctChange = firstPt && firstPt.mangroveHa > 0 ? (totalChange / firstPt.mangroveHa) * 100 : 0

  return (
    <div className="space-y-3.5">
      {/* Top Quick Stats Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-slate-50/70 to-emerald-50/40 p-2.5 sm:p-3 border border-[#d6e6de]/80">
        <div className="flex flex-wrap items-center gap-2">
          {latestPt && (
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-[#123f38] shadow-2xs border border-emerald-100">
              <span className="size-2 rounded-full bg-[#16865f] animate-pulse" />
              <span className="text-[#6c817a] font-normal">{lang === 'bn' ? 'সাম্প্রতিক:' : 'Latest:'}</span>
              <span className="font-display font-bold text-[#0f352e]">{fmt(latestPt.mangroveHa, 1, lang)} ha</span>
            </div>
          )}

          <div
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs border',
              totalChange >= 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200',
            )}
          >
            {totalChange >= 0 ? (
              <TrendingUp className="size-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="size-3.5 text-rose-600" />
            )}
            <span>
              {signed(totalChange, 1, lang)} ha ({signed(pctChange, 1, lang)}%)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs text-[#6c817a] border border-[#d6e6de]/70 shadow-2xs">
            <Satellite className="size-3.5 text-[#16865f]" />
            <span>
              {bundle.timeline.length} {lang === 'bn' ? 'উইন্ডো পর্যবেক্ষণ' : 'Observation Windows'}
            </span>
          </div>
        </div>

        {/* CGMD History Interactive Toggle Pill */}
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all border shadow-2xs cursor-pointer select-none',
              showHistory
                ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200'
                : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50',
            )}
          >
            <History className={cn('size-3.5', showHistory ? 'text-white' : 'text-purple-600')} />
            <span>{lang === 'bn' ? 'CGMD ইতিহাস (১৯৮৫–২০১৮)' : 'CGMD History (1985–2018)'}</span>
            <span className={cn('size-1.5 rounded-full ml-0.5', showHistory ? 'bg-white' : 'bg-purple-400')} />
          </button>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-68 sm:h-76 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 2 }}>
            <defs>
              <linearGradient id="s2AreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5efe9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin - 0.3', 'dataMax + 0.3']}
              tickFormatter={yearTick}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: '#d6e6de' }}
              allowDecimals={false}
            />
            <YAxis
              tick={AXIS}
              width={56}
              domain={[Math.max(0, lo - pad), hi + pad]}
              tickFormatter={(v) => `${fmt(v, 0)}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0]?.payload as
                  | {
                      x: number
                      label?: string
                      s2?: number
                      band?: [number, number]
                      images?: number
                      cgmd?: number
                    }
                  | undefined
                if (!data) return null

                return (
                  <div className="rounded-2xl border border-emerald-100/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 min-w-[210px]">
                    <div className="flex items-center gap-1.5 font-bold text-[#0f352e] border-b border-[#e5efe9] pb-1.5">
                      <Calendar className="size-3.5 text-[#16865f]" />
                      <span>{data.label ?? `Year ${Math.floor(data.x)}`}</span>
                    </div>

                    {typeof data.s2 === 'number' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-[#6c817a]">
                            <span className="size-2 rounded-full bg-[#16865f]" />
                            Sentinel-2 RF
                          </span>
                          <span className="font-display font-bold text-sm text-[#0f352e]">
                            {fmt(data.s2, 1, lang)} ha
                          </span>
                        </div>

                        {data.band && (
                          <div className="flex items-center justify-between text-[11px] text-[#6c817a] pl-3.5">
                            <span>{lang === 'bn' ? 'বিশ্বস্ততা পরিসর' : 'Confidence band'}</span>
                            <span className="font-mono text-[#0f352e]">
                              {fmt(data.band[0], 0, lang)} – {fmt(data.band[1], 0, lang)} ha
                            </span>
                          </div>
                        )}

                        {typeof data.images === 'number' && data.images > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-[#16865f] bg-emerald-50/80 px-2 py-0.5 rounded-md mt-1 w-fit">
                            <Satellite className="size-3" />
                            <span>
                              {data.images} {lang === 'bn' ? 'দৃশ্য সংযুক্ত' : 'scenes composited'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {typeof data.cgmd === 'number' && (
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#e5efe9]/70">
                        <span className="flex items-center gap-1.5 text-purple-700">
                          <span className="size-2 rounded-full bg-purple-600" />
                          CGMD Record
                        </span>
                        <span className="font-display font-bold text-purple-900">
                          {fmt(data.cgmd, 1, lang)} ha
                        </span>
                      </div>
                    )}
                  </div>
                )
              }}
            />
            <Area
              dataKey="band"
              name={lang === 'bn' ? 'কম-নিশ্চিত পরিসর' : 'Low-confidence spread'}
              stroke="none"
              fill="url(#s2AreaGrad)"
              type="monotone"
            />
            <Line
              dataKey="s2"
              name="Sentinel-2 RF"
              stroke="#16865f"
              strokeWidth={3}
              type="monotone"
              dot={{ r: 4.5, fill: '#16865f', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#0f352e', stroke: '#ffffff', strokeWidth: 3 }}
              connectNulls
            />
            {showHistory && (
              <Line
                dataKey="cgmd"
                name="CGMD (1985–2018)"
                stroke="#7c3aed"
                strokeDasharray="5 4"
                strokeWidth={2.2}
                type="monotone"
                dot={{ r: 3.5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 1.5 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sleek Custom Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#123f38]">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#16865f]" />
          <span>Sentinel-2 RF</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-emerald-200/80 border border-emerald-300" />
          <span className="text-[#6c817a]">
            {lang === 'bn' ? 'কম-নিশ্চিত পরিসর (±)' : 'Confidence band (±)'}
          </span>
        </div>
        {showHistory && (
          <div className="flex items-center gap-1.5 text-purple-700">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-purple-600" />
            <span>CGMD (1985–2018)</span>
          </div>
        )}
      </div>

      {/* Microcopy Notice */}
      <div className="flex items-start gap-2 rounded-xl bg-slate-50/70 border border-slate-200/60 p-2.5 text-[11px] text-[#556963]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-[#16865f]" />
        <p className="leading-relaxed">
          {lang === 'bn'
            ? 'প্রতিটি বিন্দু একটি উপগ্রহ ছবির সময়কাল; ছায়া = কম-নিশ্চিত পিক্সেলের অর্ধেক (± ৫০%)।'
            : 'Each point represents an automated composite image window; the shaded ribbon marks ± half of the low-confidence pixels.'}
        </p>
      </div>
    </div>
  )
}

/** Dynamic, responsive change breakdown with proportional bar and elevated metric cards. */
export function ChangeBreakdown({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const c = bundle.change
  const maxVal = Math.max(c.gainHa, c.lossHa, c.uncertainHa, 0.5)
  const totalDynamics = c.gainHa + c.lossHa + c.uncertainHa + c.stableMangroveHa
  const stablePct = totalDynamics > 0 ? (c.stableMangroveHa / totalDynamics) * 100 : 100
  const gainPct = totalDynamics > 0 ? (c.gainHa / totalDynamics) * 100 : 0
  const lossPct = totalDynamics > 0 ? (c.lossHa / totalDynamics) * 100 : 0
  const uncertainPct = totalDynamics > 0 ? (c.uncertainHa / totalDynamics) * 100 : 0

  return (
    <div className="space-y-3.5">
      {/* Proportional Macro Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#556963]">
          <span>{lang === 'bn' ? 'সার্বিক ক্যানোপি ভারসাম্য' : 'Canopy Distribution'}</span>
          <span className="font-mono text-[10px] text-[#6c817a]">
            {fmt(totalDynamics, 1, lang)} ha total
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5 border border-slate-200/70 shadow-inner">
          <div
            className="h-full rounded-l-full bg-[#0f352e] hover:bg-[#16865f] transition-all"
            style={{ width: `${Math.max(4, stablePct)}%` }}
            title={`Stable: ${fmt(c.stableMangroveHa, 1, lang)} ha (${fmt(stablePct, 1)}%)`}
          />
          {c.gainHa > 0 && (
            <div
              className="h-full bg-emerald-500 hover:bg-emerald-400 transition-all"
              style={{ width: `${Math.max(3, gainPct)}%` }}
              title={`Gain: +${fmt(c.gainHa, 1, lang)} ha (${fmt(gainPct, 1)}%)`}
            />
          )}
          {c.lossHa > 0 && (
            <div
              className="h-full bg-rose-500 hover:bg-rose-400 transition-all"
              style={{ width: `${Math.max(3, lossPct)}%` }}
              title={`Loss: -${fmt(c.lossHa, 1, lang)} ha (${fmt(lossPct, 1)}%)`}
            />
          )}
          {c.uncertainHa > 0 && (
            <div
              className="h-full rounded-r-full bg-amber-400 hover:bg-amber-300 transition-all"
              style={{ width: `${Math.max(2, uncertainPct)}%` }}
              title={`Uncertain: ${fmt(c.uncertainHa, 1, lang)} ha`}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#6c817a]">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#0f352e]" />
            {lang === 'bn' ? 'স্থির' : 'Stable'} ({fmt(stablePct, 1)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" />
            {lang === 'bn' ? 'বৃদ্ধি' : 'Gain'} ({fmt(gainPct, 1)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" />
            {lang === 'bn' ? 'ক্ষতি' : 'Loss'} ({fmt(lossPct, 1)}%)
          </span>
        </div>
      </div>

      {/* 3 Dynamics Visual Progress Rows */}
      <div className="space-y-2">
        {/* Gain Row */}
        <div className="group rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 p-2.5 transition-all hover:bg-emerald-50/90 hover:shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5.5 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shadow-2xs">
                <TrendingUp className="size-3.5" />
              </span>
              <span className="font-bold text-[#123f38]">{t('gain', lang)}</span>
              <span className="hidden sm:inline text-[10px] text-[#6c817a]">
                ({lang === 'bn' ? 'নতুন বন' : 'New growth'})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-emerald-800 text-xs sm:text-sm">
                +{fmt(c.gainHa, 1, lang)} ha
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-emerald-100/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(c.gainHa > 0 ? 8 : 0, (c.gainHa / maxVal) * 100))}%` }}
            />
          </div>
        </div>

        {/* Loss Row */}
        <div className="group rounded-xl border border-rose-200/70 bg-gradient-to-r from-rose-50/70 to-rose-50/20 p-2.5 transition-all hover:bg-rose-50/90 hover:shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5.5 items-center justify-center rounded-lg bg-rose-100 text-rose-700 shadow-2xs">
                <TrendingDown className="size-3.5" />
              </span>
              <span className="font-bold text-[#123f38]">{t('loss', lang)}</span>
              <span className="hidden sm:inline text-[10px] text-[#6c817a]">
                ({lang === 'bn' ? 'ক্ষয়প্রাপ্ত' : 'Canopy loss'})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-rose-800 text-xs sm:text-sm">
                -{fmt(c.lossHa, 1, lang)} ha
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-rose-100/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(c.lossHa > 0 ? 8 : 0, (c.lossHa / maxVal) * 100))}%` }}
            />
          </div>
        </div>

        {/* Uncertain Row */}
        <div className="group rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/60 to-amber-50/20 p-2.5 transition-all hover:bg-amber-50/80 hover:shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5.5 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shadow-2xs">
                <AlertCircle className="size-3.5" />
              </span>
              <span className="font-bold text-[#123f38]">{t('uncertain', lang)}</span>
              <span className="hidden sm:inline text-[10px] text-[#6c817a]">
                ({lang === 'bn' ? 'অস্পষ্ট পিক্সেল' : 'Low confidence'})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-amber-800 text-xs sm:text-sm">
                {fmt(c.uncertainHa, 1, lang)} ha
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-amber-100/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(c.uncertainHa > 0 ? 8 : 0, (c.uncertainHa / maxVal) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2x2 Elevated Metric Tiles */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Net Change Tile */}
        <div
          className={cn(
            'group rounded-xl p-2.5 transition-all border shadow-2xs hover:shadow-xs',
            c.netChangeHa >= 0
              ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-emerald-200/80 hover:border-emerald-300'
              : 'bg-gradient-to-br from-rose-50/90 via-red-50/40 to-white border-rose-200/80 hover:border-rose-300',
          )}
        >
          <div className="flex items-center justify-between text-[#6c817a] mb-1">
            <span className="text-[11px] font-medium">{t('netChange', lang)}</span>
            {c.netChangeHa >= 0 ? (
              <TrendingUp className="size-3 text-emerald-600" />
            ) : (
              <TrendingDown className="size-3 text-rose-600" />
            )}
          </div>
          <div className="font-display text-sm sm:text-base font-extrabold text-[#0f352e]">
            {signed(c.netChangeHa, 1, lang)}{' '}
            <span className="text-xs font-semibold text-[#6c817a]">ha</span>
          </div>
          <div
            className={cn(
              'mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              c.percentChange >= 0
                ? 'bg-emerald-100/80 text-emerald-800'
                : 'bg-rose-100/80 text-rose-800',
            )}
          >
            {signed(c.percentChange, 1, lang)}%
          </div>
        </div>

        {/* Per Year Rate Tile */}
        <div className="group rounded-xl bg-gradient-to-br from-slate-50/90 via-emerald-50/20 to-white border border-slate-200/80 hover:border-emerald-200/80 p-2.5 transition-all shadow-2xs hover:shadow-xs">
          <div className="flex items-center justify-between text-[#6c817a] mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'প্রতি বছর' : 'Per year'}</span>
            <Activity className="size-3 text-[#16865f]" />
          </div>
          <div className="font-display text-sm sm:text-base font-extrabold text-[#0f352e]">
            {signed(c.annualNetChangeHa, 1, lang)}{' '}
            <span className="text-xs font-semibold text-[#6c817a]">ha/yr</span>
          </div>
          <div className="mt-1 text-[10px] text-[#6c817a]">
            {lang === 'bn' ? 'বার্ষিক পরিবর্তনের হার' : 'Annual velocity'}
          </div>
        </div>

        {/* Stable Mangrove Tile */}
        <div className="group rounded-xl bg-gradient-to-br from-emerald-50/60 via-slate-50/40 to-white border border-[#cbe4d7] hover:border-emerald-300 p-2.5 transition-all shadow-2xs hover:shadow-xs">
          <div className="flex items-center justify-between text-[#6c817a] mb-1">
            <span className="text-[11px] font-medium">{t('stable', lang)}</span>
            <ShieldCheck className="size-3 text-[#16865f]" />
          </div>
          <div className="font-display text-sm sm:text-base font-extrabold text-[#0f352e]">
            {fmt(c.stableMangroveHa, 1, lang)}{' '}
            <span className="text-xs font-semibold text-[#6c817a]">ha</span>
          </div>
          <div className="mt-1 text-[10px] text-[#6c817a]">
            {lang === 'bn' ? 'স্থায়ী অক্ষুণ্ণ আচ্ছাদন' : 'Core persistent canopy'}
          </div>
        </div>

        {/* Area Difference Tile */}
        <div className="group rounded-xl bg-gradient-to-br from-slate-50/90 via-blue-50/20 to-white border border-slate-200/80 hover:border-blue-200 p-2.5 transition-all shadow-2xs hover:shadow-xs">
          <div className="flex items-center justify-between text-[#6c817a] mb-1">
            <span className="text-[11px] font-medium">{lang === 'bn' ? 'এলাকার পার্থক্য' : 'Area difference'}</span>
            <Layers className="size-3 text-blue-600" />
          </div>
          <div className="font-display text-sm sm:text-base font-extrabold text-[#0f352e]">
            {signed(c.rawAreaDifferenceHa, 1, lang)}{' '}
            <span className="text-xs font-semibold text-[#6c817a]">ha</span>
          </div>
          <div className="mt-1 text-[10px] text-[#6c817a]">
            {lang === 'bn' ? 'দুই মানচিত্রের মোটের পার্থক্য (ছবির তারতম্যসহ)' : 'Map-total difference (includes image noise)'}
          </div>
        </div>
      </div>

      {/* Footnote Microcopy */}
      <div className="flex items-start gap-1.5 rounded-xl bg-slate-50/80 border border-slate-200/60 p-2 text-[10.5px] text-[#556963]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-[#16865f]" />
        <p className="leading-tight">
          {lang === 'bn'
            ? `ছোট বিচ্ছিন্ন টুকরো (< ${c.minMappingUnitHa ?? 0.5} হেক্টর) বাদ দেওয়া হয়েছে; কম-নিশ্চিত পরিবর্তন আলাদাভাবে বিবেচিত।`
            : `Patches under ${c.minMappingUnitHa ?? 0.5} ha dropped; low-confidence change shown separately, not counted in net canopy.`}
        </p>
      </div>
    </div>
  )
}

export function CarbonPanel({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const { end, change, methodology, areaUncertaintyPct } = bundle.carbon
  return (
    <div className="space-y-3.5 text-sm">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white border border-emerald-200/80 p-3.5 shadow-2xs">
        <p className="text-xs font-medium text-[#6c817a]">
          {lang === 'bn' ? 'শেষে মোট কার্বন মজুত' : 'Total carbon stock at period end'}
        </p>
        <p className="font-display text-2xl font-extrabold text-[#0f352e] mt-0.5">
          {fmt(end.carbonMgC, 0, lang)}{' '}
          <span className="text-xs font-semibold text-[#6c817a]">Mg C</span>
        </p>
        <p className="text-xs text-[#556963] mt-1 flex flex-wrap items-center gap-1.5">
          <span>
            {fmt(end.carbonRangeMgC[0], 0, lang)} – {fmt(end.carbonRangeMgC[1], 0, lang)} (±{fmt(end.uncertaintyPct, 1, lang)}%)
          </span>
          <span>·</span>
          <span className="font-semibold text-emerald-800">
            {fmt(end.co2eMg, 0, lang)} Mg CO₂e
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#123f38]">
          {lang === 'bn' ? 'কার্বন পুল বণ্টন (IPCC টিয়ার ১)' : 'Carbon Pool Allocation (IPCC Tier 1)'}
        </p>
        {end.pools.map((p) => (
          <div key={p.id} className="rounded-xl border border-[#e5efe9] bg-white p-2 text-xs shadow-2xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-[#123f38]">{p.name}</span>
              <span className="font-mono text-[11px] text-[#6c817a]">
                {fmt(p.densityMgCPerHa, 1)} Mg C/ha · {fmt(p.sharePct, 0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e5efe9] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500"
                style={{ width: `${p.sharePct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50/90 border border-slate-200/70 p-3 text-xs space-y-1">
        <div className="flex items-center justify-between text-[#6c817a]">
          <span className="font-medium">{t('co2Change', lang)}</span>
          <CheckCircle2 className="size-3 text-[#16865f]" />
        </div>
        <p className="font-bold text-[#0f352e] text-sm">
          {signed(change.co2eChangeMg, 0, lang)} Mg CO₂e{' '}
          <span className="text-xs font-normal text-[#6c817a]">
            ({fmt(change.co2eChangeRangeMg[0], 0, lang)} to {fmt(change.co2eChangeRangeMg[1], 0, lang)})
          </span>
        </p>
        <p className="text-[11px] text-[#556963] pt-0.5 border-t border-slate-200/50">
          {lang === 'bn' ? 'হারানো এলাকার মজুত' : 'Stock in lost area'}: {fmt(change.grossLossCarbonMgC, 0, lang)} Mg C ·{' '}
          {lang === 'bn' ? 'নতুন এলাকার মজুত' : 'in gained area'}: {fmt(change.grossGainCarbonMgC, 0, lang)} Mg C
        </p>
      </div>

      <p className="text-[10.5px] leading-relaxed text-[#6c817a]">
        {methodology.tier}: {fmt(methodology.densityMgCPerHa, 1)} Mg C/ha × area, CO₂e = C × 44/12. {lang === 'bn' ? 'এলাকার অনিশ্চয়তা' : 'Area uncertainty'} ±
        {fmt(areaUncertaintyPct, 1)}%, {lang === 'bn' ? 'ফ্যাক্টর' : 'factor'} ±{fmt(methodology.factorUncertaintyPct, 0)}%. {methodology.disclaimer}
      </p>
    </div>
  )
}

const SCENARIO_COLORS: Record<string, string> = { current_trend: BLUE, higher_loss: RED, recovery: GREEN }

/** Observed series followed by three scenario lines with uncertainty bands. */
export function ScenarioChart({ bundle, lang, metric }: { bundle: AnalysisBundle; lang: Lang; metric: 'area' | 'carbon' }) {
  const isArea = metric === 'area'
  const observed = isArea
    ? bundle.timeline.map((p) => ({ x: p.decimalYear, observed: p.mangroveHa }))
    : bundle.carbon.series.map((p) => ({ x: p.decimalYear, observed: p.carbonMgC }))
  const byX = new Map<number, Record<string, unknown>>()
  observed.forEach((o) => byX.set(o.x, { ...o }))
  for (const sc of bundle.projection.scenarios) {
    for (const p of sc.points) {
      const row = byX.get(p.decimalYear) ?? { x: p.decimalYear }
      row[sc.id] = isArea ? p.mangroveHa : p.carbonMgC
      row[`${sc.id}_band`] = isArea ? [p.lowHa, p.highHa] : [p.carbonLowMgC, p.carbonHighMgC]
      byX.set(p.decimalYear, row)
    }
  }
  const rows = [...byX.values()].sort((a, b) => (a.x as number) - (b.x as number))
  const unit = isArea ? 'ha' : 'Mg C'

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={yearTick}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: '#d6e6de' }}
            allowDecimals={false}
          />
          <YAxis
            tick={AXIS}
            width={60}
            domain={['auto', 'auto']}
            tickFormatter={(v) => fmt(v, 0)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null
              return (
                <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 min-w-[180px]">
                  <div className="font-bold text-[#0f352e] border-b border-slate-100 pb-1">
                    {lang === 'bn' ? 'বছর' : 'Year'} {Math.floor(Number(label))}
                  </div>
                  {payload.map((entry) => {
                    if (entry.dataKey && String(entry.dataKey).endsWith('_band')) return null
                    return (
                      <div key={String(entry.dataKey)} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[#556963]">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: entry.color ?? '#16865f' }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-semibold text-[#0f352e]">
                          {fmt(Number(entry.value), isArea ? 1 : 0, lang)} {unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {bundle.projection.scenarios.map((sc) => (
            <Area
              key={`${sc.id}_band`}
              dataKey={`${sc.id}_band`}
              stroke="none"
              fill={SCENARIO_COLORS[sc.id]}
              fillOpacity={0.08}
              legendType="none"
              name={`${lang === 'bn' ? sc.nameBn : sc.name} range`}
              connectNulls
            />
          ))}
          <Line
            dataKey="observed"
            name={lang === 'bn' ? 'পর্যবেক্ষিত' : 'Observed'}
            stroke="#123f38"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#123f38' }}
            connectNulls
          />
          {bundle.projection.scenarios.map((sc) => (
            <Line
              key={sc.id}
              dataKey={sc.id}
              name={lang === 'bn' ? sc.nameBn : sc.name}
              stroke={SCENARIO_COLORS[sc.id]}
              strokeDasharray={sc.id === 'current_trend' ? undefined : '5 4'}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ScenarioTable({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const pick = (h: number) => bundle.projection.scenarios.map((sc) => ({ sc, p: sc.points.find((p) => p.yearsAhead === h)! }))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[#6c817a]">
            <th className="py-1.5 pr-2 font-semibold">{lang === 'bn' ? 'চিত্র' : 'Scenario'}</th>
            <th className="py-1.5 pr-2 font-semibold">{lang === 'bn' ? 'প্রতি বছর' : 'ha / yr'}</th>
            <th className="py-1.5 pr-2 font-semibold">{lang === 'bn' ? '৩ বছরে' : 'In 3 yrs'}</th>
            <th className="py-1.5 font-semibold">{lang === 'bn' ? '৫ বছরে' : 'In 5 yrs'}</th>
          </tr>
        </thead>
        <tbody>
          {pick(3).map(({ sc, p }) => {
            const p5 = sc.points.find((q) => q.yearsAhead === 5)!
            return (
              <tr key={sc.id} className="border-t border-[#e5efe9]" title={sc.description}>
                <td className="py-2 pr-2 font-semibold" style={{ color: SCENARIO_COLORS[sc.id] }}>
                  {lang === 'bn' ? sc.nameBn : sc.name}
                </td>
                <td className="py-2 pr-2 font-mono font-medium">{signed(sc.annualNetChangeHa, 1, lang)}</td>
                <td className="py-2 pr-2 font-mono">
                  {fmt(p.mangroveHa, 0, lang)} <span className="text-[#6c817a]">({fmt(p.lowHa, 0, lang)}–{fmt(p.highHa, 0, lang)})</span>
                </td>
                <td className="py-2 font-mono">
                  {fmt(p5.mangroveHa, 0, lang)} <span className="text-[#6c817a]">({fmt(p5.lowHa, 0, lang)}–{fmt(p5.highHa, 0, lang)})</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-[#6c817a]">
        {lang === 'bn'
          ? 'এগুলি “যদি এমন হয়” চিত্র, পূর্বাভাস নয়। পরিসর = প্রবণতার অনিশ্চয়তা + এলাকা মাপার ত্রুটি।'
          : 'What-if scenarios, not forecasts. Ranges combine trend uncertainty and area measurement error.'}
      </p>
    </div>
  )
}
