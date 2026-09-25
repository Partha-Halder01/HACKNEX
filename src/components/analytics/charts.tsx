import { useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisBundle } from '../../types/analysis'
import type { Lang } from './ui'
import { fmt, signed, t } from './ui'

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
      band: [Math.max(0, p.mangroveHa - p.lowConfidenceHa / 2), p.mangroveHa + p.lowConfidenceHa / 2] as [number, number],
      images: p.imageCount,
    })),
  ]
  const values = rows.flatMap((r) => ('s2' in r ? [r.band![0], r.band![1]] : [r.cgmd]))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.25, hi * 0.02, 1)

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="x" type="number" domain={['dataMin - 0.3', 'dataMax + 0.3']} tickFormatter={yearTick} tick={AXIS} allowDecimals={false} />
            <YAxis tick={AXIS} width={56} domain={[Math.max(0, lo - pad), hi + pad]} tickFormatter={(v) => fmt(v, 0)} />
            <Tooltip
              formatter={(v: number | number[], name: string) =>
                Array.isArray(v) ? [`${fmt(v[0])} – ${fmt(v[1])} ha`, name] : [`${fmt(v)} ha`, name]
              }
              labelFormatter={(x: number) => {
                const r = rows.find((row) => row.x === x) as { label?: string } | undefined
                return r?.label ?? `CGMD ${Math.floor(x)}`
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area dataKey="band" name={lang === 'bn' ? 'কম-নিশ্চিত পরিসর' : 'Low-confidence spread'} stroke="none" fill={GREEN} fillOpacity={0.12} />
            <Line dataKey="s2" name="Sentinel-2 RF" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3.5 }} connectNulls />
            {showHistory && <Line dataKey="cgmd" name="CGMD (1985–2018)" stroke={HISTORY} strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6c817a]">
        <span>
          {lang === 'bn'
            ? 'প্রতিটি বিন্দু একটি উপগ্রহ ছবির সময়কাল; ছায়া = কম-নিশ্চিত পিক্সেলের অর্ধেক।'
            : 'Each point is one image window; shading = ± half of the low-confidence area.'}
        </span>
        {history.length > 0 ? (
          <label className="flex items-center gap-1.5 font-semibold text-[#123f38] print:hidden">
            <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
            {lang === 'bn' ? 'CGMD ইতিহাস দেখান' : 'Show CGMD history'}
          </label>
        ) : (
          <span className="italic">
            {lang === 'bn' ? 'CGMD ইতিহাস শুধু লাইভ ইঞ্জিনে' : 'CGMD history available with the live engine'}
          </span>
        )}
      </div>
    </div>
  )
}

export function ChangeBreakdown({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const c = bundle.change
  const data = [
    { name: t('gain', lang), value: c.gainHa, color: GREEN },
    { name: t('loss', lang), value: c.lossHa, color: RED },
    { name: t('uncertain', lang), value: c.uncertainHa, color: AMBER },
  ]
  return (
    <div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={AXIS} width={72} />
            <Tooltip formatter={(v: number) => [`${fmt(v)} ha`, '']} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${fmt(v)} ha` }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[#f2f6f3] p-2">
          <dt className="text-[#6c817a]">{t('netChange', lang)}</dt>
          <dd className="font-bold text-[#123f38]">{signed(c.netChangeHa, 1, lang)} ha ({signed(c.percentChange, 1, lang)}%)</dd>
        </div>
        <div className="rounded-lg bg-[#f2f6f3] p-2">
          <dt className="text-[#6c817a]">{lang === 'bn' ? 'প্রতি বছর' : 'Per year'}</dt>
          <dd className="font-bold text-[#123f38]">{signed(c.annualNetChangeHa, 1, lang)} ha</dd>
        </div>
        <div className="rounded-lg bg-[#f2f6f3] p-2">
          <dt className="text-[#6c817a]">{t('stable', lang)}</dt>
          <dd className="font-bold text-[#123f38]">{fmt(c.stableMangroveHa, 1, lang)} ha</dd>
        </div>
        <div className="rounded-lg bg-[#f2f6f3] p-2">
          <dt className="text-[#6c817a]">{lang === 'bn' ? 'এলাকার পার্থক্য' : 'Area difference'}</dt>
          <dd className="font-bold text-[#123f38]">{signed(c.rawAreaDifferenceHa, 1, lang)} ha</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-[#6c817a]">
        {lang === 'bn'
          ? `ছোট টুকরো (< ${c.minMappingUnitHa ?? 0.5} হেক্টর) বাদ; কম-নিশ্চিত পরিবর্তন আলাদা দেখানো।`
          : `Patches under ${c.minMappingUnitHa ?? 0.5} ha dropped; low-confidence change shown separately, not counted.`}
      </p>
    </div>
  )
}

export function CarbonPanel({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const { end, change, methodology, areaUncertaintyPct } = bundle.carbon
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs text-[#6c817a]">{lang === 'bn' ? 'শেষে মোট কার্বন' : 'Total carbon at end'}</p>
        <p className="font-display text-xl font-extrabold text-[#123f38]">
          {fmt(end.carbonMgC, 0, lang)} <span className="text-xs font-semibold text-[#6c817a]">Mg C</span>
        </p>
        <p className="text-xs text-[#6c817a]">
          {fmt(end.carbonRangeMgC[0], 0, lang)} – {fmt(end.carbonRangeMgC[1], 0, lang)} (±{fmt(end.uncertaintyPct, 1, lang)}%) ·{' '}
          {fmt(end.co2eMg, 0, lang)} Mg CO₂e
        </p>
      </div>
      <div className="space-y-1.5">
        {end.pools.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between text-xs">
              <span className="text-[#123f38]">{p.name}</span>
              <span className="font-tabular text-[#6c817a]">{fmt(p.densityMgCPerHa, 1)} Mg C/ha · {fmt(p.sharePct, 0)}%</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-[#e5efe9]">
              <div className="h-1.5 rounded-full bg-[#16865f]" style={{ width: `${p.sharePct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-[#f2f6f3] p-2 text-xs">
        <p className="text-[#6c817a]">{t('co2Change', lang)}</p>
        <p className="font-bold text-[#123f38]">
          {signed(change.co2eChangeMg, 0, lang)} Mg CO₂e{' '}
          <span className="font-normal text-[#6c817a]">
            ({fmt(change.co2eChangeRangeMg[0], 0, lang)} to {fmt(change.co2eChangeRangeMg[1], 0, lang)})
          </span>
        </p>
        <p className="mt-1 text-[#6c817a]">
          {lang === 'bn' ? 'হারানো এলাকার মজুত' : 'Stock in lost area'}: {fmt(change.grossLossCarbonMgC, 0, lang)} Mg C ·{' '}
          {lang === 'bn' ? 'নতুন এলাকার মজুত' : 'in gained area'}: {fmt(change.grossGainCarbonMgC, 0, lang)} Mg C
        </p>
      </div>
      <p className="text-[11px] leading-relaxed text-[#6c817a]">
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
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickFormatter={yearTick} tick={AXIS} allowDecimals={false} />
          <YAxis tick={AXIS} width={64} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v, 0)} />
          <Tooltip
            labelFormatter={(x: number) => `${Math.floor(x)}`}
            formatter={(v: number | number[], name: string) =>
              Array.isArray(v) ? [`${fmt(v[0], 0)} – ${fmt(v[1], 0)} ${unit}`, name] : [`${fmt(v, isArea ? 1 : 0)} ${unit}`, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {bundle.projection.scenarios.map((sc) => (
            <Area
              key={`${sc.id}_band`}
              dataKey={`${sc.id}_band`}
              stroke="none"
              fill={SCENARIO_COLORS[sc.id]}
              fillOpacity={0.1}
              legendType="none"
              name={`${lang === 'bn' ? sc.nameBn : sc.name} range`}
              connectNulls
            />
          ))}
          <Line dataKey="observed" name={lang === 'bn' ? 'পর্যবেক্ষিত' : 'Observed'} stroke="#123f38" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          {bundle.projection.scenarios.map((sc) => (
            <Line
              key={sc.id}
              dataKey={sc.id}
              name={lang === 'bn' ? sc.nameBn : sc.name}
              stroke={SCENARIO_COLORS[sc.id]}
              strokeDasharray={sc.id === 'current_trend' ? undefined : '6 4'}
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
            <th className="py-1 pr-2 font-semibold">{lang === 'bn' ? 'চিত্র' : 'Scenario'}</th>
            <th className="py-1 pr-2 font-semibold">{lang === 'bn' ? 'প্রতি বছর' : 'ha / yr'}</th>
            <th className="py-1 pr-2 font-semibold">{lang === 'bn' ? '৩ বছরে' : 'In 3 yrs'}</th>
            <th className="py-1 font-semibold">{lang === 'bn' ? '৫ বছরে' : 'In 5 yrs'}</th>
          </tr>
        </thead>
        <tbody>
          {pick(3).map(({ sc, p }) => {
            const p5 = sc.points.find((q) => q.yearsAhead === 5)!
            return (
              <tr key={sc.id} className="border-t border-[#e5efe9]" title={sc.description}>
                <td className="py-1.5 pr-2 font-semibold" style={{ color: SCENARIO_COLORS[sc.id] }}>
                  {lang === 'bn' ? sc.nameBn : sc.name}
                </td>
                <td className="py-1.5 pr-2 font-tabular">{signed(sc.annualNetChangeHa, 1, lang)}</td>
                <td className="py-1.5 pr-2 font-tabular">
                  {fmt(p.mangroveHa, 0, lang)} <span className="text-[#6c817a]">({fmt(p.lowHa, 0, lang)}–{fmt(p.highHa, 0, lang)})</span>
                </td>
                <td className="py-1.5 font-tabular">
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
