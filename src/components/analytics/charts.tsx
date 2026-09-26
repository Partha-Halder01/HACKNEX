import { useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  History,
  Info,
  Layers,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { fmt, signed, t } from './ui'
import { cn } from '../../lib/utils'
import { CK, GlowDefs, LegendChip, StatTile, TooltipCard, TooltipRow, axisTick, makeDot, yearTicks } from './chartKit'

/** Mangrove area per observation window, with the unsure-pixel ribbon and optional CGMD history. */
export function TimelineChart({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const [showHistory, setShowHistory] = useState(false)
  const bn = lang === 'bn'
  const history = bundle.historical ?? []
  const tl = bundle.timeline
  const s2Rows = tl.map((p) => ({
    x: p.decimalYear,
    label: p.label,
    s2: p.mangroveHa,
    band: [Math.max(0, p.mangroveHa - p.lowConfidenceHa / 2), p.mangroveHa + p.lowConfidenceHa / 2] as [number, number],
    unsure: p.lowConfidenceHa,
    images: p.imageCount,
    window: `${p.startDate} → ${p.endDate}`,
  }))
  const histRows = showHistory ? history.map((h) => ({ x: h.year + 0.5, cgmd: h.mangroveHa })) : []
  const rows = [...histRows, ...s2Rows]
  const values = [...s2Rows.flatMap((r) => r.band), ...histRows.map((r) => r.cgmd)]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.18, hi * 0.01, 1)
  const xMin = Math.min(...rows.map((r) => r.x)) - 0.25
  const xMax = Math.max(...rows.map((r) => r.x)) + 0.25
  const latest = tl[tl.length - 1]
  const areas = tl.map((p) => p.mangroveHa)
  const lastS2 = rows.length - 1
  const Dot = makeDot({ lastIndex: lastS2, color: CK.green, label: (v) => `${fmt(v, 0, lang)} ha` })

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={bn ? 'সর্বশেষ মানচিত্র' : 'Latest map'} value={`${fmt(latest.mangroveHa, 0, lang)} ha`} tone="green" hint={latest.label} />
        <StatTile
          label={bn ? 'সর্বনিম্ন – সর্বোচ্চ' : 'Lowest – highest'}
          value={`${fmt(Math.min(...areas), 0, lang)}–${fmt(Math.max(...areas), 0, lang)}`}
          hint={bn ? 'মানচিত্রের মোট (হেক্টর)' : 'map totals (ha)'}
        />
        <StatTile
          label={bn ? 'নিশ্চিত পরিবর্তন' : 'Confirmed change'}
          value={`${signed(bundle.change.netChangeHa, 1, lang)} ha`}
          tone={bundle.change.netChangeHa >= 0 ? 'green' : 'red'}
          hint={bn ? 'পিক্সেল ধরে (বৃদ্ধি − ক্ষতি)' : 'pixel by pixel (gain − loss)'}
        />
        <StatTile label={bn ? 'পর্যবেক্ষণ' : 'Observations'} value={`${tl.length} ${bn ? 'টি' : 'windows'}`} hint={`${tl.reduce((s, p) => s + (p.imageCount ?? 0), 0)} ${bn ? 'ছবি' : 'photos'}`} />
      </div>

      <div className="relative h-72 w-full rounded-2xl border border-[#e3eee8] bg-gradient-to-b from-white to-[#f7fbf9] p-2 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 34, right: 18, bottom: 4, left: 0 }}>
            <GlowDefs id="tl" color={CK.mint} />
            <CartesianGrid stroke={CK.grid} strokeDasharray="4 6" vertical={false} />
            {showHistory && histRows.length > 0 && (
              <ReferenceArea
                x1={xMin}
                x2={s2Rows[0].x - 0.3}
                fill={CK.violet}
                fillOpacity={0.05}
                label={{ value: bn ? 'CGMD রেফারেন্স মানচিত্র' : 'CGMD reference maps', position: 'insideTopLeft', fill: CK.violet, fontSize: 10.5, fontWeight: 700 }}
              />
            )}
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              ticks={yearTicks(xMin, xMax)}
              tickFormatter={(v) => String(v)}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: '#dce8e1' }}
            />
            <YAxis tick={axisTick} width={48} domain={[Math.max(0, lo - pad), hi + pad]} tickFormatter={(v) => fmt(v, 0)} tickLine={false} axisLine={false} tickCount={5} />
            <Tooltip
              cursor={{ stroke: CK.green, strokeOpacity: 0.35, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined
                if (!d) return null
                if ('cgmd' in d)
                  return (
                    <TooltipCard title={`${Math.floor(d.x)}`} badge="CGMD">
                      <TooltipRow color={CK.violet} dashed label={bn ? 'রেফারেন্স মানচিত্র' : 'Reference map'} value={`${fmt(d.cgmd, 0, lang)} ha`} />
                    </TooltipCard>
                  )
                return (
                  <TooltipCard title={d.label} badge={`${d.images} ${bn ? 'ছবি' : 'photos'}`}>
                    <p className="font-mono text-[10px] text-white/50">{d.window}</p>
                    <TooltipRow color={CK.mint} label="Sentinel-2 RF" value={`${fmt(d.s2, 1, lang)} ha`} />
                    <TooltipRow color="rgba(16,185,129,0.35)" label={bn ? 'অনিশ্চিত পরিসর' : 'Unsure range'} value={`${fmt(d.band[0], 0, lang)}–${fmt(d.band[1], 0, lang)}`} sub={`${fmt(d.unsure, 0, lang)} ha ${bn ? 'অনিশ্চিত পিক্সেল' : 'unsure pixels'}`} />
                  </TooltipCard>
                )
              }}
            />
            <Area dataKey="band" type="monotone" stroke={CK.mint} strokeOpacity={0.35} strokeDasharray="3 4" fill={CK.mint} fillOpacity={0.1} isAnimationActive={false} activeDot={false} connectNulls />
            <Area
              dataKey="s2"
              type="monotone"
              stroke={CK.green}
              strokeWidth={3}
              fill="url(#tl-fill)"
              baseValue={Math.max(0, lo - pad)}
              filter="url(#tl-glow)"
              dot={Dot}
              activeDot={{ r: 7, fill: CK.ink, stroke: '#fff', strokeWidth: 3 }}
              animationDuration={900}
              connectNulls
            />
            {showHistory && (
              <Line dataKey="cgmd" type="monotone" stroke={CK.violet} strokeWidth={2.2} strokeDasharray="6 5" dot={{ r: 3.5, fill: CK.violet, stroke: '#fff', strokeWidth: 1.5 }} connectNulls animationDuration={700} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LegendChip color={CK.green} label="Sentinel-2 RF" />
          <LegendChip color={CK.mint} kind="band" label={bn ? '± অর্ধেক অনিশ্চিত পিক্সেল' : '± half of unsure pixels'} />
          {history.length > 0 && (
            <LegendChip
              color={CK.violet}
              kind="dashed"
              active={showHistory}
              onClick={() => setShowHistory(!showHistory)}
              label={
                <>
                  <History className="size-3" />
                  CGMD {history[0].year}–{history[history.length - 1].year}
                </>
              }
            />
          )}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-[#6c817a]">
          <Info className="size-3.5 text-[#16865f]" />
          {bn ? 'প্রতিটি বিন্দু একটি উপগ্রহ-ছবির সময়কাল' : 'Each point is one satellite photo window'}
        </span>
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

const SCENARIO_COLORS: Record<string, string> = { current_trend: CK.blue, higher_loss: CK.red, recovery: CK.mint }
type ScenarioId = 'current_trend' | 'higher_loss' | 'recovery'

/**
 * Observed history, then the three what-if lines. Only the focused scenario's
 * range is shaded (three overlapping bands hid the lines); click a chip to switch.
 */
export function ScenarioChart({ bundle, lang, metric }: { bundle: AnalysisBundle; lang: Lang; metric: 'area' | 'carbon' }) {
  const [focus, setFocus] = useState<ScenarioId>('current_trend')
  const bn = lang === 'bn'
  const isArea = metric === 'area'
  const scs = bundle.projection.scenarios
  const unit = isArea ? 'ha' : 'Mg C'
  const val = (p: { mangroveHa: number; carbonMgC: number }) => (isArea ? p.mangroveHa : p.carbonMgC)
  const rng = (p: { lowHa: number; highHa: number; carbonLowMgC: number; carbonHighMgC: number }) =>
    (isArea ? [p.lowHa, p.highHa] : [p.carbonLowMgC, p.carbonHighMgC]) as [number, number]

  const observed = isArea
    ? bundle.timeline.map((p) => ({ x: p.decimalYear, observed: p.mangroveHa }))
    : bundle.carbon.series.map((p) => ({ x: p.decimalYear, observed: p.carbonMgC }))
  const byX = new Map<number, Record<string, number | [number, number] | undefined>>()
  observed.forEach((o) => byX.set(o.x, { ...o }))
  for (const sc of scs) {
    for (const p of sc.points) {
      const x = p.yearsAhead === 0 ? observed[observed.length - 1].x : p.decimalYear
      const row = byX.get(x) ?? { x }
      row[sc.id] = val(p)
      row[`${sc.id}_band`] = rng(p)
      byX.set(x, row)
    }
  }
  const rows = [...byX.values()].sort((a, b) => (a.x as number) - (b.x as number))
  const nowX = observed[observed.length - 1].x
  const xMin = observed[0].x - 0.2
  const xMax = Math.max(...rows.map((r) => r.x as number)) + 0.2

  const focused = scs.find((s) => s.id === focus) ?? scs[0]
  const vals = [
    ...observed.map((o) => o.observed),
    ...scs.flatMap((s) => s.points.map(val)),
    ...focused.points.flatMap(rng),
  ]
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max((hi - lo) * 0.1, hi * 0.005, 1)
  const fmtV = (v: number) => (isArea ? `${fmt(v, 0, lang)} ha` : `${fmt(v / 1000, 0, lang)}k Mg C`)
  const lastIdx = rows.length - 1

  return (
    <div className="space-y-3">
      {/* Scenario chips — also the legend; click to focus a scenario's range */}
      <div className="grid gap-2 sm:grid-cols-3">
        {scs.map((sc) => {
          const end = sc.points[sc.points.length - 1]
          const d = val(end) - val(sc.points[0])
          const on = sc.id === focus
          const color = SCENARIO_COLORS[sc.id]
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setFocus(sc.id)}
              aria-pressed={on}
              className={cn(
                'group relative overflow-hidden rounded-xl border px-3 py-2 text-left transition-all cursor-pointer',
                on ? 'bg-white shadow-md' : 'border-[#e2ece6] bg-white/60 hover:bg-white hover:shadow-sm',
              )}
              style={on ? { borderColor: color, boxShadow: `0 0 0 3px ${color}22` } : undefined}
            >
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-bold text-[#123f38]">{bn ? sc.nameBn : sc.name}</span>
                <span className="font-mono text-[10px] text-[#7d958d]">{end.year}</span>
              </span>
              <span className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-[#0f352e]">{fmtV(val(end))}</span>
                <span className={cn('font-mono text-[11px] font-bold', d < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                  {signed(isArea ? d : d / 1000, 0, lang)}
                  {isArea ? '' : 'k'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="h-72 w-full rounded-2xl border border-[#e3eee8] bg-gradient-to-b from-white to-[#f7fbf9] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 30, right: 22, bottom: 4, left: 0 }}>
            <GlowDefs id="obs" color={CK.green} top={0.22} />
            <CartesianGrid stroke={CK.grid} strokeDasharray="4 6" vertical={false} />
            <ReferenceArea
              x1={nowX}
              x2={xMax}
              fill="#0f352e"
              fillOpacity={0.035}
              label={{ value: bn ? '“যদি এমন হয়” অংশ · পূর্বাভাস নয়' : 'WHAT-IF ZONE · NOT A FORECAST', position: 'insideTopRight', fill: '#7d958d', fontSize: 10, fontWeight: 700 }}
            />
            <ReferenceLine
              x={nowX}
              stroke={CK.ink}
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              label={{ value: bn ? 'এখন' : 'NOW', position: 'top', fill: CK.ink, fontSize: 10.5, fontWeight: 800 }}
            />
            <XAxis dataKey="x" type="number" domain={[xMin, xMax]} ticks={yearTicks(xMin, xMax)} tickFormatter={(v) => String(v)} tick={axisTick} tickLine={false} axisLine={{ stroke: '#dce8e1' }} />
            <YAxis
              tick={axisTick}
              width={52}
              domain={[Math.max(0, lo - pad), hi + pad]}
              tickFormatter={(v) => (isArea ? fmt(v, 0) : `${fmt(v / 1000, 0)}k`)}
              tickLine={false}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip
              cursor={{ stroke: CK.ink, strokeOpacity: 0.25, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                const r = active ? (payload?.[0]?.payload as Record<string, number | [number, number]> | undefined) : undefined
                if (!r) return null
                const x = r.x as number
                const isFuture = x > nowX + 0.01
                return (
                  <TooltipCard title={Math.floor(x)} badge={isFuture ? (bn ? 'যদি এমন হয়' : 'what-if') : bn ? 'মাপা' : 'measured'}>
                    {typeof r.observed === 'number' && <TooltipRow color={CK.green} label={bn ? 'মাপা' : 'Observed'} value={fmtV(r.observed)} />}
                    {isFuture &&
                      scs.map((sc) => {
                        const v = r[sc.id]
                        const band = r[`${sc.id}_band`] as [number, number] | undefined
                        if (typeof v !== 'number') return null
                        return (
                          <TooltipRow
                            key={sc.id}
                            color={SCENARIO_COLORS[sc.id]}
                            dashed={sc.id !== 'current_trend'}
                            label={bn ? sc.nameBn : sc.name}
                            value={fmtV(v)}
                            sub={band ? `${fmt(isArea ? band[0] : band[0] / 1000, 0, lang)}–${fmt(isArea ? band[1] : band[1] / 1000, 0, lang)}${isArea ? '' : 'k'}` : undefined}
                          />
                        )
                      })}
                  </TooltipCard>
                )
              }}
            />
            <Area
              key={`${focused.id}-band`}
              dataKey={`${focused.id}_band`}
              stroke={SCENARIO_COLORS[focused.id]}
              strokeOpacity={0.35}
              strokeDasharray="3 4"
              fill={SCENARIO_COLORS[focused.id]}
              fillOpacity={0.12}
              isAnimationActive
              animationDuration={500}
              activeDot={false}
              connectNulls
            />
            <Area
              dataKey="observed"
              type="monotone"
              stroke={CK.green}
              strokeWidth={3}
              fill="url(#obs-fill)"
              baseValue={Math.max(0, lo - pad)}
              filter="url(#obs-glow)"
              dot={{ r: 3.6, fill: '#fff', stroke: CK.green, strokeWidth: 2.2 }}
              activeDot={{ r: 6, fill: CK.ink, stroke: '#fff', strokeWidth: 2.5 }}
              animationDuration={800}
              connectNulls
            />
            {scs.map((sc) => {
              const on = sc.id === focus
              return (
                <Line
                  key={sc.id}
                  dataKey={sc.id}
                  stroke={SCENARIO_COLORS[sc.id]}
                  strokeWidth={on ? 3 : 1.8}
                  strokeOpacity={on ? 1 : 0.55}
                  strokeDasharray={sc.id === 'current_trend' ? undefined : '6 4'}
                  dot={makeDot({ lastIndex: lastIdx, color: SCENARIO_COLORS[sc.id], label: on ? fmtV : undefined, showAll: false })}
                  activeDot={{ r: 5, fill: SCENARIO_COLORS[sc.id], stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={900}
                  animationBegin={300}
                  connectNulls
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <LegendChip color={CK.green} label={bn ? 'মাপা (উপগ্রহ)' : 'Measured (satellite)'} />
        <LegendChip color={SCENARIO_COLORS[focus]} kind="band" label={bn ? 'নির্বাচিত দৃশ্যের সম্ভাব্য পরিসর' : 'Likely range of the selected scenario'} />
      </div>
    </div>
  )
}

/** Scenario comparison: rate per year, 3- and 5-year values with a range bar. */
export function ScenarioTable({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const bn = lang === 'bn'
  const scs = bundle.projection.scenarios
  const at = (sc: (typeof scs)[number], h: number) => sc.points.find((p) => p.yearsAhead === h) ?? sc.points[sc.points.length - 1]
  const all = scs.flatMap((sc) => [at(sc, 3), at(sc, 5)]).flatMap((p) => [p.lowHa, p.highHa])
  const min = Math.min(...all)
  const max = Math.max(...all)
  const pos = (v: number) => `${((v - min) / (max - min || 1)) * 100}%`

  const Cell = ({ p, color }: { p: (typeof scs)[number]['points'][number]; color: string }) => (
    <div className="min-w-[120px]">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[13px] font-bold text-[#0f352e]">{fmt(p.mangroveHa, 0, lang)}</span>
        <span className="font-mono text-[10.5px] text-[#7d958d]">
          {fmt(p.lowHa, 0, lang)}–{fmt(p.highHa, 0, lang)}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-[#eef3f0]">
        <span className="absolute inset-y-0 rounded-full" style={{ left: pos(p.lowHa), right: `calc(100% - ${pos(p.highHa)})`, background: color, opacity: 0.3 }} />
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: pos(p.mangroveHa), background: color }} />
      </div>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e3eee8]">
      <table className="w-full text-xs">
        <thead className="bg-[#f5f9f7] text-left font-mono text-[10px] uppercase tracking-wider text-[#6c817a]">
          <tr>
            <th className="px-3 py-2 font-semibold">{bn ? 'দৃশ্য' : 'Scenario'}</th>
            <th className="px-3 py-2 font-semibold">{bn ? 'প্রতি বছর' : 'Per year'}</th>
            <th className="px-3 py-2 font-semibold">{bn ? '৩ বছরে (হেক্টর)' : 'In 3 years (ha)'}</th>
            <th className="px-3 py-2 font-semibold">{bn ? '৫ বছরে (হেক্টর)' : 'In 5 years (ha)'}</th>
          </tr>
        </thead>
        <tbody>
          {scs.map((sc) => {
            const color = SCENARIO_COLORS[sc.id]
            return (
              <tr key={sc.id} className="border-t border-[#e8f0ec] transition-colors hover:bg-[#f7fbf9]" title={sc.description}>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2 font-semibold text-[#123f38]">
                    <span className="h-5 w-1 rounded-full" style={{ background: color }} />
                    {bn ? sc.nameBn : sc.name}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                      sc.annualNetChangeHa < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
                    )}
                  >
                    {signed(sc.annualNetChangeHa, 1, lang)} ha
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Cell p={at(sc, 3)} color={color} />
                </td>
                <td className="px-3 py-2.5">
                  <Cell p={at(sc, 5)} color={color} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-[#e8f0ec] bg-[#fbfdfc] px-3 py-2 text-[11px] text-[#6c817a]">
        {bn
          ? 'এগুলি “যদি এমন হয়” চিত্র, পূর্বাভাস নয়। দাগ = সম্ভাব্য পরিসর (প্রবণতার অনিশ্চয়তা + মাপার ত্রুটি), বিন্দু = মাঝামাঝি মান।'
          : 'What-if scenarios, not forecasts. Bar = likely range (trend uncertainty + measurement error), dot = middle value.'}
      </p>
    </div>
  )
}
