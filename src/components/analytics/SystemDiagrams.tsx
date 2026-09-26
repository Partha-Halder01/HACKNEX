import { useEffect, useState } from 'react'
import {
  ArrowDown,
  BrainCircuit,
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Leaf,
  Monitor,
  Pause,
  Play,
  Route,
  Satellite,
  Server,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Users,
} from 'lucide-react'

type L = (en: string, bn: string) => string

// ════════════════════════════ 1. ARCHITECTURE ════════════════════════════

interface Part {
  id: string
  icon: typeof Leaf
  name: string
  simple: string
  tech: string
}

interface Layer {
  id: string
  title: string
  subtitle: string
  tone: string // tailwind classes for the layer band
  chip: string // tailwind classes for boxes
  parts: Part[]
}

export function ArchitectureDiagram({ L }: { L: L }) {
  const layers: Layer[] = [
    {
      id: 'people',
      title: L('People', 'ব্যবহারকারী'),
      subtitle: L('anyone with a browser or phone', 'ব্রাউজার বা ফোন থাকলেই'),
      tone: 'bg-violet-50 border-violet-200',
      chip: 'border-violet-200 bg-white text-violet-900',
      parts: [
        { id: 'villages', icon: Users, name: L('Panchayats & villagers', 'পঞ্চায়েত ও গ্রামবাসী'), simple: L('See their own forest in plain Bengali and share the result on WhatsApp.', 'নিজেদের বন সহজ বাংলায় দেখে WhatsApp-এ শেয়ার করেন।'), tech: 'Bengali UI · WhatsApp share link · printable report' },
        { id: 'forest', icon: Leaf, name: L('Forest department & NGOs', 'বন দপ্তর ও এনজিও'), simple: L('Check where forest is lost or recovering before sending field teams.', 'মাঠে দল পাঠানোর আগে কোথায় বন হারাচ্ছে বা ফিরছে দেখেন।'), tech: 'Before/after map layers · gain/loss areas · PDF export' },
        { id: 'research', icon: BrainCircuit, name: L('Researchers', 'গবেষক'), simple: L('Inspect accuracy, method and every number behind a result.', 'প্রতিটি ফলাফলের নির্ভুলতা, পদ্ধতি ও সংখ্যা যাচাই করেন।'), tech: 'Science Lab: confusion matrix, model version, evidence list, JSON download' },
      ],
    },
    {
      id: 'web',
      title: L('Website (frontend)', 'ওয়েবসাইট (ফ্রন্টএন্ড)'),
      subtitle: 'React · TypeScript · Vite · Tailwind · Leaflet · Recharts',
      tone: 'bg-sky-50 border-sky-200',
      chip: 'border-sky-200 bg-white text-sky-900',
      parts: [
        { id: 'landing', icon: Globe, name: L('Landing page', 'ল্যান্ডিং পেজ'), simple: L('Scroll-driven dive from the tree into the water that explains the project.', 'গাছ থেকে জলের নিচে স্ক্রোল-ডুব, যা প্রজেক্ট ব্যাখ্যা করে।'), tech: '240 WebP frames drawn on a canvas, driven by scroll position' },
        { id: 'dashboard', icon: LayoutDashboard, name: L('Analytics dashboard', 'বিশ্লেষণ ড্যাশবোর্ড'), simple: L('Pick a place and two years; see the verdict, map, before/after photos, carbon and scenarios.', 'জায়গা ও দুই বছর বাছুন; সিদ্ধান্ত, মানচিত্র, আগে/পরে ছবি, কার্বন ও ভবিষ্যৎ দেখুন।'), tech: 'src/components/analytics/* · one POST per analysis · URL keeps the inputs (shareable link)' },
        { id: 'report', icon: FileText, name: L('Reports & sharing', 'রিপোর্ট ও শেয়ার'), simple: L('Printable report, PDF download and WhatsApp message.', 'ছাপার রিপোর্ট, PDF ডাউনলোড ও WhatsApp বার্তা।'), tech: 'ReportModal · backend ReportLab PDF · wa.me link' },
      ],
    },
    {
      id: 'server',
      title: L('Server (backend)', 'সার্ভার (ব্যাকএন্ড)'),
      subtitle: 'FastAPI · Python',
      tone: 'bg-emerald-50 border-emerald-200',
      chip: 'border-emerald-200 bg-white text-emerald-900',
      parts: [
        { id: 'api', icon: Route, name: L('API', 'API'), simple: L('The doors the website knocks on: run an analysis, get the map photo, check status.', 'ওয়েবসাইট যে দরজায় টোকা দেয়: বিশ্লেষণ, মানচিত্রের ছবি, অবস্থা।'), tech: 'POST /api/analysis/run · GET /api/analysis/basemap · /capabilities · /field-points · PDF export' },
        { id: 'engine', icon: Server, name: L('Analysis engine', 'বিশ্লেষণ ইঞ্জিন'), simple: L('Checks the inputs, asks Earth Engine for the satellite work, remembers results so repeats are instant.', 'ইনপুট যাচাই করে, উপগ্রহের কাজ Earth Engine-কে দেয়, ফলাফল মনে রাখে যাতে আবার চাইলে সঙ্গে সঙ্গে আসে।'), tech: 'app/analysis: request.py · gee_engine.py · service.py (LRU cache) · warmup.py (pre-computes on start) · demo_engine.py (labelled fallback)' },
        { id: 'maths', icon: Leaf, name: L('Carbon & scenarios', 'কার্বন ও ভবিষ্যৎ'), simple: L('Turns forest area into carbon with a ± range, and draws the 5-year what-if lines.', 'বনের এলাকাকে ± পরিসরসহ কার্বনে রূপ দেয়, আর ৫ বছরের "যদি" রেখা তৈরি করে।'), tech: 'carbon.py (IPCC Tier 1, 283.1 Mg C/ha, error propagation) · projection.py (trend + what-if scenarios)' },
        { id: 'trust', icon: ShieldCheck, name: L('Reliability & summary', 'নির্ভরযোগ্যতা ও সারাংশ'), simple: L('Decides green/yellow/red “how sure”, and writes the plain Bengali/English summary.', 'সবুজ/হলুদ/লাল "কতটা নিশ্চিত" ঠিক করে, আর সহজ বাংলা/ইংরেজি সারাংশ লেখে।'), tech: 'reliability.py (season, area check, images, speed, accuracy) · narrative.py (templates + Gemini number validator)' },
      ],
    },
    {
      id: 'external',
      title: L('External services', 'বাইরের পরিষেবা'),
      subtitle: L('cloud platforms we connect to', 'যেসব ক্লাউড পরিষেবায় যুক্ত হই'),
      tone: 'bg-amber-50 border-amber-200',
      chip: 'border-amber-200 bg-white text-amber-900',
      parts: [
        { id: 'gee', icon: Satellite, name: 'Google Earth Engine', simple: L('Where the heavy satellite work happens: photos, cloud removal, the AI model, map tiles.', 'যেখানে ভারী উপগ্রহের কাজ হয়: ছবি, মেঘ সরানো, AI মডেল, মানচিত্রের টাইল।'), tech: 'Sentinel-2 L2A · CGMD-AFCC30 reference map · smileRandomForest · getMapId tiles (loaded by the browser directly)' },
        { id: 'gemini', icon: Sparkles, name: L('Google Gemini (optional)', 'Google Gemini (ঐচ্ছিক)'), simple: L('Only rewrites the summary in friendlier words. It never creates numbers — invented numbers are rejected.', 'শুধু সারাংশ সহজ ভাষায় লেখে। কখনো সংখ্যা বানায় না — বানানো সংখ্যা থাকলে বাতিল।'), tech: 'gemini-2.5-flash · JSON output · evidence-ID + number validator · falls back to template' },
        { id: 'mongo', icon: Database, name: L('MongoDB (optional)', 'MongoDB (ঐচ্ছিক)'), simple: L('Keeps a record of analyses and field checks when connected.', 'যুক্ত থাকলে বিশ্লেষণ ও মাঠ যাচাইয়ের রেকর্ড রাখে।'), tech: 'analysis_runs, field_points collections · file fallback when offline' },
      ],
    },
  ]

  const links = [
    L('opens the website', 'ওয়েবসাইট খোলে'),
    L('HTTPS · JSON  (/api/analysis/…)', 'HTTPS · JSON  (/api/analysis/…)'),
    L('Earth Engine API · Gemini API · database', 'Earth Engine API · Gemini API · ডেটাবেস'),
  ]

  const all = layers.flatMap((l) => l.parts.map((p) => ({ ...p, layer: l })))
  const [sel, setSel] = useState('engine')
  const S = all.find((p) => p.id === sel) ?? all[0]

  return (
    <div className="grid gap-4">
      <div>
        {layers.map((layer, i) => (
          <div key={layer.id}>
            <div className={`rounded-2xl border p-3 ${layer.tone}`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                <p className="text-sm font-extrabold text-[#123f38]">{layer.title}</p>
                <p className="font-mono text-[10.5px] text-[#526a63]">{layer.subtitle}</p>
              </div>
              <div className={`grid gap-2 ${layer.parts.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
                {layer.parts.map((p) => {
                  const Icon = p.icon
                  const on = p.id === sel
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSel(p.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${layer.chip} ${
                        on ? 'ring-2 ring-[#16865f] ring-offset-1' : 'hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="leading-tight">{p.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {i < layers.length - 1 && (
              <div className="flex items-center justify-center gap-2 py-1.5 text-[#6c817a]">
                <ArrowDown className="size-4" />
                <span className="font-mono text-[10.5px]">{links[i]}</span>
                <ArrowDown className="size-4" />
              </div>
            )}
          </div>
        ))}
        <p className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <Satellite className="size-3.5 shrink-0" />
          {L(
            'Shortcut: the satellite map photos go straight from Earth Engine to the browser, so the server never has to carry big images.',
            'শর্টকাট: উপগ্রহের মানচিত্রের ছবি সরাসরি Earth Engine থেকে ব্রাউজারে যায়, তাই সার্ভারকে বড় ছবি বইতে হয় না।',
          )}
        </p>
      </div>

      {/* Details of the selected box */}
      <aside className="rounded-2xl border-2 border-[#16865f]/30 bg-[#f7faf8] p-4">
        <p className="font-mono text-[10.5px] font-bold tracking-[0.18em] text-[#6c817a]">{S.layer.title.toUpperCase()}</p>
        <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-[#123f38]">
          <S.icon className="size-5 text-[#16865f]" /> {S.name}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#475f57]">{S.simple}</p>
        <p className="mt-3 rounded-lg bg-[#f2f6f3] p-2.5 font-mono text-[11px] leading-relaxed text-[#123f38]">{S.tech}</p>
        <p className="mt-3 text-[11px] text-[#6c817a]">{L('Click any box in the diagram to see what it does.', 'কী করে দেখতে ছবির যেকোনো বাক্সে ক্লিক করুন।')}</p>
      </aside>
    </div>
  )
}

// ════════════════════════════ 2. ONE ANALYSIS, STEP BY STEP ════════════════════════════

const ACTORS = [
  { id: 0, icon: Users, en: 'You', bn: 'আপনি', color: '#7c3aed' },
  { id: 1, icon: Monitor, en: 'Website', bn: 'ওয়েবসাইট', color: '#0284c7' },
  { id: 2, icon: Server, en: 'Server', bn: 'সার্ভার', color: '#16865f' },
  { id: 3, icon: Satellite, en: 'Earth Engine', bn: 'আর্থ ইঞ্জিন', color: '#d97706' },
  { id: 4, icon: Sparkles, en: 'Gemini', bn: 'Gemini', color: '#db2777' },
]

export function AnalysisFlow({ L }: { L: L }) {
  const steps: { from: number; to: number; label: string; detail: string }[] = [
    { from: 0, to: 1, label: L('Pick place, size, two years → Run', 'জায়গা, আকার, দুই বছর → চালান'), detail: L('You click on the map (or a preset), choose Small/Medium/Large and two years.', 'মানচিত্রে ক্লিক (বা তালিকা থেকে) করে, ছোট/মাঝারি/বড় আর দুটি বছর বাছেন।') },
    { from: 1, to: 2, label: 'POST /api/analysis/run', detail: L('The website sends one request with the point, radius and dates.', 'ওয়েবসাইট বিন্দু, ব্যাসার্ধ ও তারিখসহ একটি অনুরোধ পাঠায়।') },
    { from: 2, to: 2, label: L('Check inputs · look in the memory', 'ইনপুট যাচাই · মেমরিতে খোঁজ'), detail: L('Dates, size and season are checked. If this exact analysis was done before, the answer comes back instantly.', 'তারিখ, আকার ও মৌসুম যাচাই হয়। একই বিশ্লেষণ আগে হয়ে থাকলে উত্তর সঙ্গে সঙ্গে ফেরে।') },
    { from: 2, to: 3, label: L('Teach the AI from the scientists’ map', 'বিজ্ঞানীদের মানচিত্র থেকে AI শেখানো'), detail: L('Earth Engine trains a Random Forest on places that were clearly mangrove (or clearly not) in 2019–2022.', 'Earth Engine ২০১৯–২০২২-এ স্পষ্ট ম্যানগ্রোভ (বা স্পষ্ট নয়) জায়গা দিয়ে Random Forest শেখায়।') },
    { from: 3, to: 3, label: L('Test on 2023 · build photos · classify', '২০২৩-এ পরীক্ষা · ছবি তৈরি · চিহ্নিতকরণ'), detail: L('The model is tested on 2023 (never seen), then every year’s cloud-free photo is made and every 10 m patch is marked.', 'মডেলকে ২০২৩-এ পরীক্ষা করা হয় (আগে দেখেনি), তারপর প্রতি বছরের মেঘমুক্ত ছবি তৈরি করে প্রতি ১০ মিটার চিহ্নিত হয়।') },
    { from: 3, to: 2, label: L('Areas · gain/loss · accuracy · map links', 'এলাকা · বৃদ্ধি/ক্ষতি · নির্ভুলতা · মানচিত্রের লিংক'), detail: L('Only small numbers and tile links come back — the heavy images stay in the cloud.', 'শুধু ছোট সংখ্যা আর টাইলের লিংক ফেরে — ভারী ছবি ক্লাউডেই থাকে।') },
    { from: 2, to: 2, label: L('Carbon ± · 5-year scenarios · checks', 'কার্বন ± · ৫ বছর · পরীক্ষা'), detail: L('Carbon with a ± range, three what-if scenarios, and the green/yellow/red reliability checks.', '± পরিসরসহ কার্বন, তিনটি "যদি" চিত্র, আর সবুজ/হলুদ/লাল নির্ভরযোগ্যতা পরীক্ষা।') },
    { from: 2, to: 4, label: L('(optional) Reword the summary', '(ঐচ্ছিক) সারাংশ সহজ করা'), detail: L('Gemini gets only the computed numbers. If its text contains any other number, it is thrown away and the template is used.', 'Gemini শুধু হিসাব করা সংখ্যা পায়। লেখায় অন্য সংখ্যা থাকলে তা বাদ দিয়ে টেমপ্লেট ব্যবহার হয়।') },
    { from: 2, to: 1, label: L('One result (JSON)', 'একটি ফলাফল (JSON)'), detail: L('Everything the page needs arrives in one answer.', 'পেজের যা দরকার সব একটি উত্তরে আসে।') },
    { from: 1, to: 3, label: L('Load before/after photo tiles', 'আগে/পরে ছবির টাইল লোড'), detail: L('The browser fetches the map photos straight from Earth Engine.', 'ব্রাউজার মানচিত্রের ছবি সরাসরি Earth Engine থেকে আনে।') },
    { from: 1, to: 0, label: L('Verdict · map · charts · report', 'সিদ্ধান্ত · মানচিত্র · চার্ট · রিপোর্ট'), detail: L('“The forest here grew / shrank”, how sure we are, and everything behind it.', '“এখানকার বন বেড়েছে / কমেছে”, কতটা নিশ্চিত, আর তার পেছনের সব তথ্য।') },
  ]

  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      if (step >= steps.length - 1) setPlaying(false)
      else setStep((s) => s + 1)
    }, 1700)
    return () => clearTimeout(t)
  }, [playing, step, steps.length])

  const col = (i: number) => `${(i + 0.5) * 20}%`
  const cur = steps[step]

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="grid size-9 place-items-center rounded-xl border border-[#d6e6de] bg-white text-[#123f38]" aria-label="Previous">
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (step >= steps.length - 1) setStep(0)
            setPlaying((p) => !p)
          }}
          className="flex items-center gap-2 rounded-xl bg-[#16865f] px-4 py-2 text-sm font-bold text-white"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? L('Pause', 'থামান') : L('Play the whole flow', 'পুরো প্রবাহ চালান')}
        </button>
        <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="grid size-9 place-items-center rounded-xl border border-[#d6e6de] bg-white text-[#123f38]" aria-label="Next">
          <SkipForward className="size-4" />
        </button>
        <span className="ml-auto font-mono text-xs text-[#6c817a]">
          {L('Step', 'ধাপ')} {step + 1} / {steps.length} · {L('first time ~1–2 min, repeats instant', 'প্রথমবার ~১–২ মিনিট, আবার চাইলে সঙ্গে সঙ্গে')}
        </span>
      </div>

      {/* Sequence (swim-lane) diagram */}
      <div className="rounded-2xl border border-[#d6e6de] bg-white p-3">
        <div className="relative grid grid-cols-5 gap-0 pb-2">
          {ACTORS.map((a) => {
            const active = cur.from === a.id || cur.to === a.id
            const Icon = a.icon
            return (
              <div key={a.id} className="flex flex-col items-center">
                <span
                  className="grid size-10 place-items-center rounded-xl text-white shadow transition"
                  style={{ background: a.color, transform: active ? 'scale(1.12)' : 'none', opacity: active ? 1 : 0.55 }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="mt-1 text-center text-[11px] font-bold text-[#123f38]">{L(a.en, a.bn)}</span>
              </div>
            )
          })}
        </div>
        <div className="relative">
          {/* lifelines */}
          <div className="pointer-events-none absolute inset-0">
            {ACTORS.map((a) => (
              <div key={a.id} className="absolute inset-y-0 w-px border-l border-dashed border-[#cfe0d7]" style={{ left: col(a.id) }} />
            ))}
          </div>
          {steps.map((s, i) => {
            const on = i === step
            const done = i < step
            const left = Math.min(s.from, s.to)
            const right = Math.max(s.from, s.to)
            const self = s.from === s.to
            const color = ACTORS[s.from].color
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPlaying(false)
                  setStep(i)
                }}
                className="relative block h-11 w-full text-left"
              >
                {self ? (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold transition"
                    style={{
                      left: `calc(${col(s.from)} + 6px)`,
                      borderColor: on ? color : '#d6e6de',
                      background: on ? color : done ? '#f2f6f3' : '#ffffff',
                      color: on ? '#fff' : '#526a63',
                    }}
                  >
                    ↻ {s.label}
                  </span>
                ) : (
                  <span className="absolute top-1/2 -translate-y-1/2" style={{ left: col(left), width: `${(right - left) * 20}%` }}>
                    <span className="block h-0.5 w-full rounded transition" style={{ background: on ? color : done ? '#8faea2' : '#c5d8ce' }} />
                    <span
                      className="absolute -top-[5px] size-0 border-y-[6px] border-y-transparent"
                      style={s.to > s.from ? { right: -2, borderLeft: `8px solid ${on ? color : done ? '#9bb5ab' : '#d6e6de'}` } : { left: -2, borderRight: `8px solid ${on ? color : done ? '#9bb5ab' : '#d6e6de'}` }}
                    />
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 text-[10.5px] font-semibold transition"
                      style={{ background: on ? color : 'rgba(255,255,255,0.9)', color: on ? '#fff' : done ? '#526a63' : '#6f877e' }}
                    >
                      {s.label}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Current step explanation */}
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#d6e6de] bg-[#04241d] p-4 text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold" style={{ background: ACTORS[cur.from].color }}>
          {step + 1}
        </span>
        <div>
          <p className="text-sm font-bold">
            {L(ACTORS[cur.from].en, ACTORS[cur.from].bn)} → {L(ACTORS[cur.to].en, ACTORS[cur.to].bn)}: {cur.label}
          </p>
          <p className="mt-1 text-sm text-white/75">{cur.detail}</p>
        </div>
      </div>
    </div>
  )
}

