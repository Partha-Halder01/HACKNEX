import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Satellite, Sparkles, AlertCircle } from 'lucide-react'

const layers = [
  { name: 'Mangroves', color: 'bg-[#10b981]' },
  { name: 'Water', color: 'bg-[#0ea5e9]' },
  { name: 'Aquaculture', color: 'bg-[#f59e0b]' },
  { name: 'Bare land', color: 'bg-[#fb923c]' },
  { name: 'Other vegetation', color: 'bg-[#84cc16]' },
]

export function BeforeAfterSlider() {
  const [compare, setCompare] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.min(Math.max((x / rect.width) * 100, 5), 95)
    setCompare(percent)
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    handlePointerMove(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMoveEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging || e.buttons === 1) {
      handlePointerMove(e.clientX)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignore if already released
    }
  }

  return (
    <div className="mt-6 sm:mt-7">
      {/* 1. Main Interactive Comparison Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMoveEvent}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        className="relative h-[380px] sm:h-[460px] lg:h-[500px] w-full cursor-ew-resize select-none touch-none overflow-hidden rounded-[24px] sm:rounded-[28px] border-4 sm:border-8 border-white bg-[#08261e] shadow-2xl shadow-[#123c37]/15"
      >
        {/* Layer 2 (Underneath): 2025 Observed Satellite Map */}
        <div className="absolute inset-0 h-full w-full">
          <svg
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full object-cover"
            aria-label="2025 Observed Satellite Surface Map"
          >
            <defs>
              <pattern id="grid-2025-lg" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              </pattern>
              <pattern id="regrowthHatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="8" x2="8" y2="0" stroke="#34d399" strokeWidth="1.5" />
              </pattern>
              <linearGradient id="deepWater2025" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#083842" />
                <stop offset="50%" stopColor="#0f4e5c" />
                <stop offset="100%" stopColor="#176375" />
              </linearGradient>
              <linearGradient id="mangroveHigh2025" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0d5236" />
                <stop offset="100%" stopColor="#057a48" />
              </linearGradient>
              <linearGradient id="mangroveVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Base Silt Terrain */}
            <rect width="1000" height="500" fill="#0c352a" />

            {/* River & Estuary Channels (Gosaba River Network) */}
            <path
              d="M0,130 Q240,160 380,240 T700,270 Q840,280 1000,220 L1000,340 Q800,380 620,320 T280,310 Q120,290 0,220 Z"
              fill="url(#deepWater2025)"
            />
            <path
              d="M520,0 Q500,120 440,240 Q390,360 460,500 L540,500 Q470,360 510,240 Q560,120 600,0 Z"
              fill="url(#deepWater2025)"
            />
            <path
              d="M740,270 Q800,380 940,440 L1000,410 Q860,350 790,250 Z"
              fill="url(#deepWater2025)"
            />
            <path
              d="M0,380 Q140,360 220,430 L200,490 Q110,430 0,440 Z"
              fill="url(#deepWater2025)"
            />

            {/* Intertidal Mudflats & Sediment Banks */}
            <path
              d="M40,40 Q180,30 260,110 Q210,170 70,150 Z"
              fill="#758860"
              opacity="0.5"
            />
            <path
              d="M620,40 Q790,30 890,110 Q760,170 600,140 Z"
              fill="#758860"
              opacity="0.45"
            />
            <path
              d="M100,320 Q240,310 260,420 Q160,480 50,440 Z"
              fill="#758860"
              opacity="0.45"
            />
            <path
              d="M580,310 Q730,290 850,360 Q790,470 610,440 Z"
              fill="#758860"
              opacity="0.4"
            />

            {/* 2025 Dense Mangrove Forest Coverage */}
            <path
              d="M60,55 Q195,45 240,115 Q190,160 85,145 Z"
              fill="url(#mangroveHigh2025)"
            />
            <path
              d="M635,55 Q785,45 865,115 Q740,155 620,135 Z"
              fill="url(#mangroveHigh2025)"
            />
            <path
              d="M590,325 Q735,305 825,370 Q770,460 625,435 Z"
              fill="url(#mangroveHigh2025)"
            />
            <path
              d="M115,335 Q235,325 245,410 Q165,465 75,430 Z"
              fill="url(#mangroveHigh2025)"
            />

            {/* 2025 DETECTED REGROWTH / RESTORATION ZONES */}
            <path
              d="M245,110 Q310,135 285,190 Q215,175 235,120 Z"
              fill="url(#mangroveVibrant)"
              stroke="#34d399"
              strokeWidth="2"
            />
            <path
              d="M245,110 Q310,135 285,190 Q215,175 235,120 Z"
              fill="url(#regrowthHatch)"
              opacity="0.75"
            />

            <path
              d="M565,430 Q660,490 750,455 Q700,410 595,420 Z"
              fill="url(#mangroveVibrant)"
              stroke="#34d399"
              strokeWidth="2"
            />
            <path
              d="M565,430 Q660,490 750,455 Q700,410 595,420 Z"
              fill="url(#regrowthHatch)"
              opacity="0.75"
            />

            {/* 2025 Aquaculture Ponds (Controlled expansion) */}
            <rect x="800" y="55" width="48" height="34" rx="4" fill="#5c4d28" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="860" y="65" width="42" height="28" rx="4" fill="#5c4d28" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="815" y="96" width="38" height="24" rx="4" fill="#5c4d28" stroke="#f59e0b" strokeWidth="1.5" />

            {/* Shoreline Accretion / Sand Flat */}
            <ellipse cx="430" cy="275" rx="35" ry="14" fill="#fb923c" opacity="0.6" />

            {/* Geographic Grid Overlay */}
            <rect width="1000" height="500" fill="url(#grid-2025-lg)" />

            {/* Coordinate Reticles & Annotation Markers */}
            <g stroke="#34d399" strokeWidth="1.5" opacity="0.85">
              <path d="M 285,150 L 285,160 M 280,155 L 290,155" />
              <path d="M 660,445 L 660,455 M 655,450 L 665,450" />
            </g>
          </svg>

          {/* 2025 Right Markers & Badges */}
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[#a7f3d0]">2025</span>
            <span className="text-white/40">·</span>
            <span className="text-[11px] uppercase tracking-wider text-white/90">Observed</span>
          </div>

          <div className="absolute right-4 bottom-4 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#34d399]/40 bg-[#062e24]/90 px-2.5 py-1 text-[11px] font-bold text-[#34d399] backdrop-blur-md shadow-md">
              <Sparkles className="size-3.5" />
              <span>Regrowth Detected (+14 ha)</span>
            </div>
            <div className="rounded bg-black/50 px-2 py-0.5 text-[9px] font-mono text-white/70 backdrop-blur-xs">
              Sentinel-2 MSI · 10m Multi-Spectral
            </div>
          </div>
        </div>

        {/* Layer 1 (Clipped Over Top): 2020 Baseline Satellite Map */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-[width] duration-75 ease-out"
          style={{ width: `${compare}%` }}
        >
          {/* Inner container with locked 1000px coordinate projection matching background exactly */}
          <div className="relative h-full w-[min(100vw,1240px)] min-w-[700px]">
            <svg
              viewBox="0 0 1000 500"
              preserveAspectRatio="xMidYMid slice"
              className="h-full w-full object-cover"
              aria-label="2020 Baseline Satellite Surface Map"
            >
              <defs>
                <pattern id="grid-2020-lg" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
                </pattern>
                <linearGradient id="deepWater2020" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#083842" />
                  <stop offset="50%" stopColor="#0f4e5c" />
                  <stop offset="100%" stopColor="#176375" />
                </linearGradient>
                <linearGradient id="mangroveDense2020" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0b472e" />
                  <stop offset="100%" stopColor="#0f643f" />
                </linearGradient>
              </defs>

              {/* Base Silt Terrain */}
              <rect width="1000" height="500" fill="#0c352a" />

              {/* River & Estuary Channels (Identical Baseline Geometry) */}
              <path
                d="M0,130 Q240,160 380,240 T700,270 Q840,280 1000,220 L1000,340 Q800,380 620,320 T280,310 Q120,290 0,220 Z"
                fill="url(#deepWater2020)"
              />
              <path
                d="M520,0 Q500,120 440,240 Q390,360 460,500 L540,500 Q470,360 510,240 Q560,120 600,0 Z"
                fill="url(#deepWater2020)"
              />
              <path
                d="M740,270 Q800,380 940,440 L1000,410 Q860,350 790,250 Z"
                fill="url(#deepWater2020)"
              />
              <path
                d="M0,380 Q140,360 220,430 L200,490 Q110,430 0,440 Z"
                fill="url(#deepWater2020)"
              />

              {/* Intertidal Mudflats (2020 Baseline) */}
              <path
                d="M40,40 Q180,30 260,110 Q210,170 70,150 Z"
                fill="#758860"
                opacity="0.6"
              />
              <path
                d="M620,40 Q790,30 890,110 Q760,170 600,140 Z"
                fill="#758860"
                opacity="0.55"
              />
              <path
                d="M100,320 Q240,310 260,420 Q160,480 50,440 Z"
                fill="#758860"
                opacity="0.55"
              />
              <path
                d="M580,310 Q730,290 850,360 Q790,470 610,440 Z"
                fill="#758860"
                opacity="0.5"
              />

              {/* 2020 Mangrove Forest Coverage (Before 2021-2025 Restoration) */}
              <path
                d="M60,55 Q195,45 240,115 Q190,160 85,145 Z"
                fill="url(#mangroveDense2020)"
              />
              <path
                d="M635,55 Q785,45 865,115 Q740,155 620,135 Z"
                fill="url(#mangroveDense2020)"
              />
              <path
                d="M590,325 Q735,305 825,370 Q770,460 625,435 Z"
                fill="url(#mangroveDense2020)"
              />
              <path
                d="M115,335 Q235,325 245,410 Q165,465 75,430 Z"
                fill="url(#mangroveDense2020)"
              />

              {/* 2020 Bare Mudflats (Where 2025 has regrowth) */}
              <path
                d="M245,110 Q310,135 285,190 Q215,175 235,120 Z"
                fill="#6a7d55"
                opacity="0.65"
              />
              <path
                d="M565,430 Q660,490 750,455 Q700,410 595,420 Z"
                fill="#6a7d55"
                opacity="0.6"
              />

              {/* 2020 Baseline Aquaculture Ponds (Only 2 ponds in 2020) */}
              <rect x="800" y="55" width="48" height="34" rx="4" fill="#5c4d28" stroke="#d97706" strokeWidth="1.2" />
              <rect x="860" y="65" width="42" height="28" rx="4" fill="#5c4d28" stroke="#d97706" strokeWidth="1.2" />

              {/* Geographic Grid Overlay */}
              <rect width="1000" height="500" fill="url(#grid-2020-lg)" />

              {/* Reticle Marks */}
              <g stroke="#a7f3d0" strokeWidth="1.5" opacity="0.65">
                <path d="M 240,115 L 240,125 M 235,120 L 245,120" />
                <path d="M 740,155 L 740,165 M 735,160 L 745,160" />
              </g>
            </svg>

            {/* 2020 Left Markers & Badges */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#a7f3d0]" />
              <span className="text-[#a7f3d0]">2020</span>
              <span className="text-white/40">·</span>
              <span className="text-[11px] uppercase tracking-wider text-white/90">Baseline</span>
            </div>

            <div className="absolute left-4 bottom-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-[#a7f3d0] backdrop-blur-md">
                <Satellite className="size-3.5 text-[#a7f3d0]" />
                <span>Gosaba Delta Baseline Zone</span>
              </div>
              <div className="rounded bg-black/50 px-2 py-0.5 text-[9px] font-mono text-white/70 backdrop-blur-xs">
                21°46′N · 88°54′E · Level-2A BOA
              </div>
            </div>
          </div>
        </div>

        {/* Movable Vertical Divider Bar */}
        <div
          className="pointer-events-none absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.7)]"
          style={{ left: `${compare}%` }}
        >
          {/* Circular Interactive Drag Handle */}
          <div className="absolute left-1/2 top-1/2 grid size-10 sm:size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#16845f] bg-white text-[#123c37] shadow-2xl transition-transform duration-150 hover:scale-110 active:scale-95">
            <div className="flex items-center gap-0.5 text-[#16845f]">
              <ArrowLeft className="size-3.5 sm:size-4 stroke-[2.5]" />
              <ArrowRight className="size-3.5 sm:size-4 stroke-[2.5] -ml-1" />
            </div>
          </div>
        </div>

        {/* Accessible range input for keyboard / screen-reader accessibility */}
        <label className="sr-only" htmlFor="comparison-slider">
          Compare 2020 baseline with 2025 satellite observation
        </label>
        <input
          id="comparison-slider"
          type="range"
          min="5"
          max="95"
          value={compare}
          onChange={(e) => setCompare(Number(e.target.value))}
          className="sr-only"
        />
      </div>

      {/* 2. Bottom Legend & Prototype Change Summary */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dcebe1] bg-white px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs">
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#446359]">
          {layers.map(({ name, color }) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${color}`} />
              <span>{name}</span>
            </span>
          ))}
        </div>

        {/* Prototype Change Summary */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a847b]">
              Mangrove Change (2020 → 2025):
            </span>
            <span className="font-mono font-extrabold text-[#147f57] bg-[#eef8f2] px-2 py-0.5 rounded-md border border-[#c5e6d4]">
              + / − XX ha (Demo)
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#edf5f0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#376957]">
            <AlertCircle className="size-2.5" />
            Pilot / Demo
          </span>
        </div>
      </div>
    </div>
  )
}
