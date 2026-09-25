import { useEffect, useState, type FormEvent } from 'react'
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
  const head = lang === 'bn' ? 'সুন্দরবন ম্যানগ্রোভ বিশ্লেষণ' : 'Sundarban mangrove analysis'
  return `${head}\n\n${paras.slice(0, 4).join('\n\n')}\n\n${lang === 'bn' ? bundle.narrative.disclaimerBn : bundle.narrative.disclaimerEn}\n${link}`
}

export function NarrativePanel({ bundle, lang, shareLink }: { bundle: AnalysisBundle; lang: Lang; shareLink: string }) {
  const n = bundle.narrative
  const paras = lang === 'bn' ? n.bn : n.en
  const [copied, setCopied] = useState(false)

  const download = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mangrove-analysis-${bundle.request.startDate}_${bundle.request.endDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; link is still in the address bar */
    }
  }

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
      <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText(bundle, lang, shareLink))}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-bold text-white hover:brightness-95"
        >
          WhatsApp
        </a>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#d6e6de] px-3 py-1.5 text-xs font-bold text-[#123f38] hover:bg-[#f2f6f3]">
          {lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}
        </button>
        <button type="button" onClick={download} className="rounded-lg border border-[#d6e6de] px-3 py-1.5 text-xs font-bold text-[#123f38] hover:bg-[#f2f6f3]">
          JSON
        </button>
        <button type="button" onClick={copyLink} className="rounded-lg border border-[#d6e6de] px-3 py-1.5 text-xs font-bold text-[#123f38] hover:bg-[#f2f6f3]">
          {copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : lang === 'bn' ? 'লিংক কপি' : 'Copy link'}
        </button>
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
      setStatus(lang === 'bn' ? 'সংরক্ষিত হয়েছে ✓' : 'Saved ✓')
    } catch (err) {
      setStatus((err as Error).message)
    }
  }

  const input = 'w-full rounded-lg border border-[#d6e6de] bg-white px-2.5 py-1.5 text-sm text-[#123f38] focus:border-[#16865f] focus:outline-none'
  return (
    <form onSubmit={submit} className="space-y-2 text-sm">
      <p className="text-xs text-[#6c817a]">
        {lang === 'bn'
          ? `মাঠে গিয়ে এই বিন্দুতে (${fmt(lat, 4, lang)}, ${fmt(lon, 4, lang)}) কী দেখলেন তা লিখুন — মডেল যাচাইয়ে ব্যবহার হবে।`
          : `Record what you saw at the selected point (${lat.toFixed(4)}, ${lon.toFixed(4)}). Used to validate the model.`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={observedClass} onChange={(e) => setObservedClass(e.target.value as 'mangrove' | 'other')}>
          <option value="mangrove">{lang === 'bn' ? 'ম্যানগ্রোভ' : 'Mangrove'}</option>
          <option value="other">{lang === 'bn' ? 'অন্য (জল, মাঠ, বসতি…)' : 'Other (water, field, village…)'}</option>
        </select>
        <input className={input} type="date" value={observedOn} onChange={(e) => setObservedOn(e.target.value)} required />
      </div>
      <input className={input} placeholder={lang === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Your name (optional)'} value={observer} onChange={(e) => setObserver(e.target.value)} maxLength={80} />
      <input className={input} placeholder={lang === 'bn' ? 'মন্তব্য (ঐচ্ছিক)' : 'Note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-[#16865f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0f6e4d]">
          {lang === 'bn' ? 'সংরক্ষণ' : 'Save check'}
        </button>
        {status && <span className="text-xs text-[#6c817a]">{status}</span>}
        <span className="ml-auto text-xs text-[#6c817a]">
          {fmt(points.length, 0, lang)} {lang === 'bn' ? 'টি যাচাই' : 'checks recorded'}
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
    [lang === 'bn' ? 'ছবি' : 'Imagery', m.composite],
    [lang === 'bn' ? 'বৈশিষ্ট্য' : 'Features', m.features.join(', ')],
    [lang === 'bn' ? 'শ্রেণিবিন্যাস' : 'Classifier', m.classifier],
    [lang === 'bn' ? 'পরিবর্তন' : 'Change', m.change],
    [lang === 'bn' ? 'পিক্সেল' : 'Pixel size', `${m.scaleM} m`],
  ]
  if (tr) {
    rows.push([
      lang === 'bn' ? 'প্রশিক্ষণ' : 'Training',
      `${tr.trainingRegion}; ${tr.trainYears.join(', ')}; ${Object.entries(tr.samplesByClass).map(([k, v]) => `${k} ${v}`).join(', ')}; ${tr.trees} trees`,
    ])
  }
  return (
    <div className="space-y-3">
      <dl className="grid gap-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="font-semibold text-[#6c817a]">{k}</dt>
            <dd className="text-[#123f38]">{v}</dd>
          </div>
        ))}
      </dl>
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-[#16865f]">
          {lang === 'bn' ? `প্রমাণ তালিকা (${bundle.evidence.length})` : `Evidence list (${bundle.evidence.length})`}
        </summary>
        <table className="mt-2 w-full">
          <tbody>
            {bundle.evidence.map((e) => (
              <tr key={e.id} className="border-t border-[#e5efe9]">
                <td className="py-1 pr-2 font-mono text-[#6c817a]">{e.id}</td>
                <td className="py-1 pr-2 text-[#123f38]">{e.label}</td>
                <td className="py-1 text-right font-tabular">
                  {fmt(e.value, 2)} {e.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

