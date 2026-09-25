import {
  Activity,
  BarChart3,
  FileText,
  Layers,
  Sparkles,
  TrendingUp,
  MapPin,
  CheckCircle2,
  FileDown,
} from 'lucide-react'

export function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#d6e7dd] bg-[#f8fbf8] shadow-2xl shadow-[#123c37]/10 transition-all">
      {/* 1. App Header / Window Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#dcebe1] bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            <span className="size-2.5 rounded-full bg-[#10b981]" />
          </div>
          <div className="h-4 w-px bg-[#e0ede4]" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#123c37]">
            <MapPin className="size-3.5 text-[#16845f]" />
            <span>Gosaba Pilot Zone</span>
            <span className="rounded bg-[#e8f5ec] px-1.5 py-0.5 text-[9px] font-mono text-[#16845f]">
              21.8°N · 88.9°E
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#c5e8d5] bg-[#eef8f2] px-2.5 py-0.5 text-[10px] font-bold text-[#16845f]">
            <span className="size-1.5 rounded-full bg-[#16845f] animate-pulse" />
            Live Platform Workspace
          </span>
        </div>
      </div>

      {/* 2. Workspace Body: Sidebar + Main Workspace Interface */}
      <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[170px_1fr]">
        {/* Left Navigation Sidebar */}
        <aside className="hidden border-r border-[#e0ede4] bg-[#072f26] p-3.5 text-white md:flex md:flex-col md:justify-between">
          <div>
            <p className="mb-3 px-2 text-[9px] font-extrabold uppercase tracking-widest text-[#85cb9b]">
              Platform Modules
            </p>
            <nav className="space-y-1">
              {[
                { name: 'Overview', icon: Activity, active: true },
                { name: 'Change Detection', icon: TrendingUp, active: false },
                { name: 'Carbon Factors', icon: BarChart3, active: false },
                { name: 'Layer Explorer', icon: Layers, active: false },
                { name: 'Village Reports', icon: FileText, active: false },
              ].map(({ name, icon: Icon, active }) => (
                <div
                  key={name}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-[#156e52] font-bold text-white shadow-xs'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </nav>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-[10px] text-white/80">
            <div className="flex items-center gap-1 font-bold text-[#a7f3d0]">
              <CheckCircle2 className="size-3" />
              <span>Sentinel-2 MSI</span>
            </div>
            <p className="mt-1 text-[9px] text-white/60">Cloud Cover: &lt; 3.2%</p>
          </div>
        </aside>

        {/* Main Application Canvas */}
        <div className="flex flex-col justify-between p-3.5 sm:p-4.5">
          {/* Top Status & Metrics Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-[#dcebe1] bg-white p-2.5 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6b857c]">Mangrove Cover</p>
              <p className="mt-0.5 text-base font-extrabold text-[#123c37]">1,245 ha</p>
              <span className="text-[9px] font-semibold text-[#16845f]">▲ +11.2 ha net gain</span>
            </div>

            <div className="rounded-xl border border-[#dcebe1] bg-white p-2.5 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6b857c]">NDVI Health Index</p>
              <p className="mt-0.5 text-base font-extrabold text-[#123c37]">0.78</p>
              <span className="text-[9px] font-semibold text-[#16845f]">High Canopy Vigour</span>
            </div>

            <div className="rounded-xl border border-[#dcebe1] bg-white p-2.5 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6b857c]">Water Estuary</p>
              <p className="mt-0.5 text-base font-extrabold text-[#123c37]">438 ha</p>
              <span className="text-[9px] text-[#5b7a70]">Tidal Channel Stable</span>
            </div>

            <div className="rounded-xl border border-[#dcebe1] bg-white p-2.5 shadow-xs">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6b857c]">Estimated Carbon</p>
              <p className="mt-0.5 text-base font-extrabold text-[#123c37]">18,400 <span className="text-[10px] font-normal">tCO₂e</span></p>
              <span className="text-[9px] text-[#d97706] font-medium">Indicative / Demo</span>
            </div>
          </div>

          {/* Interactive UI Centerpiece: GIS Workspace Canvas with Layer Controls */}
          <div className="mt-3 rounded-2xl border border-[#cfe2d7] bg-[#0c2f27] p-3 text-white shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#c2f2d2]">GIS Observation Workspace</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-mono text-[#a7f3d0]">
                  10m Resolution
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="rounded bg-white/15 px-2 py-0.5 font-medium">Timeline: 2020 — 2025</span>
                <span className="rounded bg-[#16845f] px-2 py-0.5 font-bold text-white">NIR Composite</span>
              </div>
            </div>

            {/* Synthetic Vector Land-Cover Visualization */}
            <div className="relative mt-2.5 h-36 sm:h-40 w-full overflow-hidden rounded-xl bg-[#08241d]">
              <svg viewBox="0 0 600 200" className="h-full w-full object-cover">
                <defs>
                  <pattern id="ui-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="600" height="200" fill="#0b3127" />
                {/* Channels */}
                <path d="M0,60 Q150,70 240,110 T450,120 Q530,130 600,100 L600,160 Q480,180 360,150 T180,140 Q80,130 0,100 Z" fill="#135263" />
                <path d="M320,0 Q300,60 260,110 Q230,160 280,200 L320,200 Q280,150 300,100 Q330,50 360,0 Z" fill="#135263" />
                {/* Mangrove Parcels */}
                <path d="M40,20 Q120,15 160,50 Q120,80 50,70 Z" fill="#116b47" />
                <path d="M380,20 Q480,15 540,60 Q460,80 370,70 Z" fill="#116b47" />
                <path d="M360,140 Q460,130 520,170 Q480,200 380,190 Z" fill="#116b47" />
                <path d="M60,140 Q140,130 150,180 Q100,200 40,180 Z" fill="#116b47" />
                {/* Detected Regrowth Highlight */}
                <path d="M160,45 Q200,60 180,95 Q140,90 150,55 Z" fill="#34d399" opacity="0.85" />
                {/* Aquaculture Clusters */}
                <rect x="500" y="25" width="28" height="18" rx="2" fill="#d97706" opacity="0.8" />
                <rect x="535" y="30" width="24" height="16" rx="2" fill="#d97706" opacity="0.8" />
                <rect width="600" height="200" fill="url(#ui-grid)" />
              </svg>

              {/* UI Overlays inside GIS Workspace */}
              <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[9px] font-semibold backdrop-blur-xs">
                <span className="size-1.5 rounded-full bg-[#34d399]" />
                <span>Classification: Mangrove (68%) · Water (24%) · Aqua (8%)</span>
              </div>

              <div className="absolute right-2.5 bottom-2 flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[8px] font-mono text-[#a7f3d0] backdrop-blur-xs">
                <span>Model Confidence: 87%</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Strip: Report Generation & Fast Export */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#dcebe1] pt-3">
            <div className="flex items-center gap-2 text-[10px] text-[#557b6f] font-medium">
              <Sparkles className="size-3 text-[#16845f]" />
              <span>Village-level Bengali reports ready for download</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#16845f] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#106f50]"
              >
                <FileDown className="size-3" />
                <span>Generate Bengali PDF</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
