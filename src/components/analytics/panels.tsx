import { useEffect, useState, type FormEvent } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { AnalysisApi } from '../../services/analysis'
import type { AnalysisBundle, FieldPoint } from '../../types/analysis'
import type { Lang } from './ui'
import { Badge, fmt, t } from './ui'

export function AccuracyPanel({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const acc = bundle.accuracy
  if (!acc) {
    return (
      <div className="rounded-xl border border-dashed border-[#d6e6de] bg-[#f7faf7] p-4 text-sm text-[#6c817a]">
        {bundle.dataSource.isRealData
          ? lang === 'bn'
            ? 'এই বিশ্লেষণে নির্ভুলতা পরীক্ষা করা যায়নি (রেফারেন্স মানচিত্র পাওয়া যায়নি)।'
            : 'The accuracy test could not run for this area (reference map unavailable).'
          : lang === 'bn'
          ? 'ডেমো মোডে নির্ভুলতা দেখানো হয় না — বানানো নির্ভুলতা প্রমাণের মতো দেখাবে। আর্থ ইঞ্জিন যুক্ত হলে এখানে আলাদা রাখা বছরের পরীক্ষার ফল আসবে।'
          : 'No accuracy in demo mode — a made-up score would look like evidence. With Earth Engine connected, this shows a held-out-year test.'}
      </div>
    )
  }
  const m = acc.confusionMatrix
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: lang === 'bn' ? 'সামগ্রিক' : 'Overall', v: `${fmt(acc.overallAccuracy * 100, 1, lang)}%` },
          { k: 'Kappa', v: fmt(acc.kappa, 3, lang) },
          { k: 'F1', v: fmt(acc.f1Macro, 3, lang) },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-[#f2f6f3] p-2 text-center">
            <p className="text-[11px] text-[#6c817a]">{s.k}</p>
            <p className="font-display text-lg font-extrabold text-[#123f38]">{s.v}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#6c817a]">
            <th className="p-1 text-left font-semibold">{lang === 'bn' ? 'রেফারেন্স ↓ / মডেল →' : 'Reference ↓ / Model →'}</th>
            {m.classes.map((c) => (
              <th key={c} className="p-1 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.matrix.map((row, i) => (
            <tr key={m.classes[i]} className="border-t border-[#e5efe9]">
              <td className="p-1 font-semibold text-[#123f38]">{m.classes[i]}</td>
              {row.map((v, j) => (
                <td key={j} className={`p-1 text-center font-tabular ${i === j ? 'bg-[#dcfce7] font-bold' : ''}`}>
                  {fmt(v, 0, lang)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {acc.classMetrics.map((c) => (
          <div key={c.className} className="rounded-lg border border-[#e5efe9] p-2">
            <p className="font-semibold text-[#123f38]">{c.className}</p>
            <p className="text-[#6c817a]">
              {lang === 'bn' ? 'প্রযোজক' : "Producer's"} {fmt(c.producersAccuracy * 100, 1, lang)}% · {lang === 'bn' ? 'ব্যবহারকারী' : "User's"}{' '}
              {fmt(c.usersAccuracy * 100, 1, lang)}%
            </p>
          </div>
        ))}
      </div>
      {acc.areaCheck && (
        <div
          className={`rounded-lg border p-2 text-xs ${
            acc.areaCheck.agrees ? 'border-[#86efac] bg-[#f0fdf4] text-[#166534]' : 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]'
          }`}
        >
          <p className="font-bold">
            {acc.areaCheck.agrees
              ? lang === 'bn' ? '✓ এলাকার হিসাব রেফারেন্সের সঙ্গে মিলেছে' : '✓ Area agrees with the reference map'
              : lang === 'bn' ? '✗ এলাকার হিসাব রেফারেন্সের সঙ্গে মেলেনি — সংখ্যাগুলি নির্ভরযোগ্য নয়' : '✗ Area disagrees with the reference map — treat these numbers as unreliable'}
          </p>
          <p className="mt-0.5">
            {acc.areaCheck.year}: {lang === 'bn' ? 'মডেল' : 'model'} {fmt(acc.areaCheck.modelHa, 1, lang)} ha · CGMD{' '}
            {fmt(acc.areaCheck.referenceHa, 1, lang)} ha ({acc.areaCheck.differenceHa >= 0 ? '+' : ''}
            {fmt(acc.areaCheck.differenceHa, 1, lang)} ha)
          </p>
          <p className="mt-0.5 opacity-80">
            {lang === 'bn'
              ? 'নমুনা-ভিত্তিক নির্ভুলতা কম-ম্যানগ্রোভ এলাকায় অতিরিক্ত গণনা ধরতে পারে না; তাই পুরো এলাকার তুলনা।'
              : 'Sample-based accuracy cannot reveal over-counting in low-mangrove areas, so the whole area is compared too.'}
          </p>
        </div>
      )}
      <p className="text-[11px] text-[#6c817a]">
        {acc.note} ({fmt(acc.sampleCount, 0)} {lang === 'bn' ? 'নমুনা' : 'samples'}, {acc.region ?? acc.referenceSource})
      </p>
    </div>
  )
}

function shareText(bundle: AnalysisBundle, lang: Lang, link: string) {
  const paras = lang === 'bn' ? bundle.narrative.bn : bundle.narrative.en
  const head = lang === 'bn' ? 'MangroveLens · সুন্দরবন ম্যানগ্রোভ বিশ্লেষণ' : 'MangroveLens · Sundarbans mangrove analysis'
  return `${head}\n\n${paras.slice(0, 4).join('\n\n')}\n\n${lang === 'bn' ? bundle.narrative.disclaimerBn : bundle.narrative.disclaimerEn}\n${link}`
}

export function NarrativePanel({
  bundle,
  lang,
  shareLink,
  onGenerateReport,
  isGeneratingReport,
}: {
  bundle: AnalysisBundle
  lang: Lang
  shareLink?: string
  onGenerateReport?: () => void
  isGeneratingReport?: boolean
}) {
  const n = bundle.narrative
  const paras = lang === 'bn' ? n.bn : n.en

  const aiNote: Record<string, string> = {
    success: lang === 'bn' ? 'Gemini ভাষা, সংখ্যা যাচাই করা' : 'Gemini wording, numbers verified',
    rejected_fallback_template: lang === 'bn' ? 'Gemini-র লেখা যাচাইয়ে বাতিল; টেমপ্লেট দেখানো হচ্ছে' : 'Gemini text failed checks; template shown',
    failed_fallback_template: lang === 'bn' ? 'Gemini সাড়া দেয়নি; টেমপ্লেট' : 'Gemini unavailable; template shown',
    not_configured: lang === 'bn' ? 'Gemini কী নেই; টেমপ্লেট' : 'Gemini key not set; template shown',
  }

  return (
    <div>
      <div className={`space-y-2.5 text-sm leading-relaxed text-[#123f38] ${lang === 'bn' ? 'font-bengali' : ''}`}>
        {paras.map((p, i) => (
          <p key={i} className={i === 0 && !bundle.dataSource.isRealData ? 'rounded-lg bg-[#fef3c7] px-2 py-1 text-[#92400e]' : ''}>
            {p}
          </p>
        ))}
        <p className="text-xs italic text-[#6c817a]">{lang === 'bn' ? n.disclaimerBn : n.disclaimerEn}</p>
      </div>
      <div className="mt-4 pt-3.5 border-t border-[#e5efe9] flex flex-wrap items-center justify-between gap-3 print:hidden">
        {onGenerateReport && (
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2 rounded-lg border border-[#16865f] bg-[#16865f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#126b4c] cursor-pointer disabled:opacity-60"
            title={lang === 'bn' ? 'রিপোর্ট তৈরি ও দেখুন' : 'Generate and view analysis report'}
          >
            {isGeneratingReport ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            <span className="font-mono text-[11px] font-bold">
              {isGeneratingReport
                ? (lang === 'bn' ? 'রিপোর্ট তৈরি হচ্ছে…' : 'Generating…')
                : (lang === 'bn' ? 'রিপোর্ট' : 'Report')}
            </span>
          </button>
        )}
        {n.aiStatus !== 'not_requested' && <Badge tone="info">{aiNote[n.aiStatus] ?? n.aiStatus}</Badge>}
      </div>
    </div>
  )
}

export function FieldCheckForm({ lat, lon, analysisId, lang }: { lat: number; lon: number; analysisId?: string; lang: Lang }) {
  const [observedClass, setObservedClass] = useState<'mangrove' | 'other'>('mangrove')
  const [observedOn, setObservedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [observer, setObserver] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [points, setPoints] = useState<FieldPoint[]>([])

  useEffect(() => {
    AnalysisApi.listFieldPoints().then(setPoints).catch(() => setPoints([]))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus(null)
    try {
      const res = await AnalysisApi.addFieldPoint({
        lat,
        lon,
        observedClass,
        observedOn,
        observer: observer || undefined,
        note: note || undefined,
        analysisId,
      })
      setPoints((prev) => [res.point, ...prev])
      setNote('')
      setStatus(lang === 'bn' ? 'মাঠ যাচাই সংরক্ষিত হয়েছে ✓' : 'Ground truth recorded ✓')
    } catch (err) {
      setStatus((err as Error).message)
    }
  }

  const input =
    'w-full rounded-xl border border-[#d6e6de] bg-white/95 px-3 py-2 text-xs sm:text-sm text-[#123f38] focus:border-[#16865f] focus:outline-none focus:ring-2 focus:ring-[#16865f]/20 transition-all'

  return (
    <form onSubmit={submit} className="space-y-2.5 text-sm">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-xs text-[#0f352e]">
        <p className="font-semibold">
          {lang === 'bn' ? '📍 মাঠপর্যায়ের স্থানীয় সত্যতা নিরূপণ' : '📍 Ground-Truth Verification'}
        </p>
        <p className="mt-0.5 text-[11px] text-[#526a63]">
          {lang === 'bn'
            ? `নির্বাচিত বিন্দু (${lat.toFixed(4)}°, ${lon.toFixed(4)}°) সম্পর্কে আপনার মাঠের তথ্য দিন — এটি মডেলের নির্ভুলতা বাড়ায়।`
            : `Record local ground reality at coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)}) to strengthen scientific verification.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={observedClass} onChange={(e) => setObservedClass(e.target.value as 'mangrove' | 'other')}>
          <option value="mangrove">{lang === 'bn' ? '🌿 ম্যানগ্রোভ বন' : '🌿 Dense Mangrove'}</option>
          <option value="other">{lang === 'bn' ? '💧 অন্যান্য (নদী, বসতি, চর)' : '💧 Other (water, settlement)'}</option>
        </select>
        <input className={input} type="date" value={observedOn} onChange={(e) => setObservedOn(e.target.value)} required />
      </div>
      <input className={input} placeholder={lang === 'bn' ? 'আপনার নাম বা সংস্থা (ঐচ্ছিক)' : 'Observer / Organization (optional)'} value={observer} onChange={(e) => setObserver(e.target.value)} maxLength={80} />
      <input className={input} placeholder={lang === 'bn' ? 'গাছের প্রজাতি বা বাঁধের অবস্থা ইত্যাদি (ঐচ্ছিক)' : 'Species note or condition details (optional)'} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" className="rounded-xl bg-[#16865f] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#0f6e4d] transition-colors">
          {lang === 'bn' ? 'তথ্য জমা দিন' : 'Save ground observation'}
        </button>
        {status && <span className="text-xs font-semibold text-emerald-700">{status}</span>}
        <span className="ml-auto font-mono text-[11px] text-[#6c817a]">
          {fmt(points.length, 0, lang)} {lang === 'bn' ? 'যাচাই নথিভুক্ত' : 'records logged'}
        </span>
      </div>
    </form>
  )
}

export function MethodPanel({ bundle, lang }: { bundle: AnalysisBundle; lang: Lang }) {
  const m = bundle.methodology
  const tr = bundle.training
  const rows: [string, string][] = [
    [lang === 'bn' ? 'তথ্যের উৎস' : 'Data source', `${bundle.dataSource.label} · ${bundle.dataSource.modelVersion}`],
    [lang === 'bn' ? 'উপগ্রহ ছবি' : 'Imagery Engine', m.composite],
    [lang === 'bn' ? 'ব্যান্ড ও ইনডেক্স' : 'Spectral Bands', m.features.join(', ')],
    [lang === 'bn' ? 'মডেল অ্যালগরিদম' : 'Classifier', m.classifier],
    [lang === 'bn' ? 'পরিবর্তন নির্ণয়' : 'Change Rule', m.change],
    [lang === 'bn' ? 'স্থানিক রেজোলিউশন' : 'Pixel Resolution', `${m.scaleM} meters`],
  ]
  if (tr) {
    rows.push([
      lang === 'bn' ? 'প্রশিক্ষণ উপাত্ত' : 'Training Data',
      `${tr.trainingRegion}; ${tr.trainYears.join(', ')}; ${Object.entries(tr.samplesByClass).map(([k, v]) => `${k} ${v}`).join(', ')}; ${tr.trees} trees`,
    ])
  }
  return (
    <div className="space-y-3.5">
      {/* AI Satellite Observation Visual Banner */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-900/30 bg-[#062923] p-3 text-white shadow-md">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          style={{ backgroundImage: `url('/images/dashboard/sentinel_satellite_orbit.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062923] via-[#062923]/75 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {lang === 'bn' ? 'সেন্টিনেল-২ এল২এ রিমোট সেন্সিং' : 'Sentinel-2 L2A Earth Observation'}
            </p>
            <p className="mt-0.5 text-xs text-emerald-100 font-bold">
              {lang === 'bn' ? '১০ মিটার রেজোলিউশনে মেঘমুক্ত মহাকাশ বিশ্লেষণ' : '10m Multispectral Atmospheric Correction'}
            </p>
          </div>
          <span className="font-mono text-[10px] rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5">
            ESA Copernicus
          </span>
        </div>
      </div>

      <dl className="grid gap-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-2 border-b border-[#e5efe9]/50 py-1">
            <dt className="font-semibold text-[#6c817a]">{k}</dt>
            <dd className="font-mono text-xs font-semibold text-[#123f38]">{v}</dd>
          </div>
        ))}
      </dl>

      <details className="text-xs">
        <summary className="cursor-pointer font-bold text-[#16865f] hover:underline">
          {lang === 'bn' ? `🔬 বিস্তারিত প্রমাণ খতিয়ান (${bundle.evidence.length})` : `🔬 Technical evidence registry (${bundle.evidence.length})`}
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#e5efe9] bg-white">
          <table className="w-full">
            <thead className="bg-[#f7faf7] text-[10px] font-bold uppercase text-[#6c817a]">
              <tr>
                <th className="p-1.5 text-left font-mono">ID</th>
                <th className="p-1.5 text-left">Metric</th>
                <th className="p-1.5 text-right font-mono">Value</th>
              </tr>
            </thead>
            <tbody>
              {bundle.evidence.map((e) => (
                <tr key={e.id} className="border-t border-[#e5efe9]">
                  <td className="p-1.5 font-mono text-[11px] text-[#6c817a]">{e.id}</td>
                  <td className="p-1.5 text-[11px] text-[#123f38]">{e.label}</td>
                  <td className="p-1.5 text-right font-mono text-[11px] font-bold text-[#16865f]">
                    {fmt(e.value, 2)} {e.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

