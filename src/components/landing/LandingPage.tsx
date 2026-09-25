import { useEffect, useState, useRef } from 'react'
import {
  ArrowRight,
  Check,
  CloudSun,
  Globe2,
  HeartHandshake,
  Landmark,
  Menu,
  Microscope,
  Satellite,
  Sparkles,
  TreePine,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '../common/Logo'
import { Button } from '../common/Button'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import { DashboardMockup } from './DashboardMockup'

const HERO_POSTER = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-bU80xNmsFnqJXdhzTXpaZq5tx1f4Up.png'

/* Custom Vector SVG Icons for Our Approach Pipeline */
function ObserveIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor">
      {/* Earth horizon curve */}
      <path d="M6 38C13 32 23 29 35 30C39 30.3 42.5 31.5 45 33" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 36C18 32.5 25 32 32 34" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
      {/* Satellite body */}
      <rect x="23" y="10" width="10" height="7" rx="1.5" transform="rotate(-30 23 10)" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
      {/* Solar panels */}
      <line x1="14" y1="11" x2="20" y2="7.5" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="9" y="8" width="7" height="9" rx="1" transform="rotate(-30 9 8)" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      <line x1="32" y1="21.5" x2="38" y2="18" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="33" y="21" width="7" height="9" rx="1" transform="rotate(-30 33 21)" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      {/* Sensor radar beam */}
      <path d="M21 17L13 31M26 20L23 30" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" opacity="0.8" />
    </svg>
  )
}

function AnalyzeIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor">
      {/* Bottom GIS Layer */}
      <path d="M8 34L24 41L40 34L24 27L8 34Z" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      {/* Middle NDVI Layer */}
      <path d="M8 25L24 32L40 25L24 18L8 25Z" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.25" />
      {/* Top Multi-Spectral Layer */}
      <path d="M8 16L24 23L40 16L24 9L8 16Z" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.35" />
      {/* Spectral Grid Points */}
      <circle cx="24" cy="16" r="2.5" fill="currentColor" />
      <circle cx="17" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="31" cy="13.5" r="1.5" fill="currentColor" />
      <path d="M17 13.5L24 16L31 13.5" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

function DetectIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor">
      {/* Baseline axis */}
      <path d="M8 40H40" strokeWidth="2.5" strokeLinecap="round" />
      {/* Baseline Bar */}
      <rect x="12" y="24" width="5.5" height="16" rx="1.5" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />
      {/* Loss Bar */}
      <rect x="21" y="30" width="5.5" height="10" rx="1.5" strokeWidth="2" fill="currentColor" fillOpacity="0.4" />
      {/* Recovery Bar */}
      <rect x="30.5" y="16" width="5.5" height="24" rx="1.5" strokeWidth="2" fill="currentColor" fillOpacity="0.55" />
      {/* Change Detection Signal Line */}
      <path d="M10 20L19 25L27.5 17L38 10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="10" r="2.5" fill="currentColor" />
      <circle cx="19" cy="25" r="2" fill="currentColor" />
    </svg>
  )
}

function QuantifyIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor">
      {/* Report Document Sheet */}
      <path d="M12 8C12 6.89543 12.8954 6 14 6H28L36 14V40C36 41.1046 35.1046 42 34 42H14C12.8954 42 12 41.1046 12 40V8Z" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
      <path d="M28 6V14H36" strokeWidth="2" strokeLinejoin="round" />
      {/* Calculation Formula / Ledger Lines */}
      <path d="M18 16H24" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 22H30" strokeWidth="2" strokeLinecap="round" />
      {/* Carbon Leaf Footprint Badge */}
      <path d="M24 28C20.5 29 19.5 32.5 18 35.5L19.5 36C24 36 26.5 32 26.5 28Z" strokeWidth="1.75" fill="currentColor" fillOpacity="0.5" />
      {/* Delta Sigma marker */}
      <path d="M18 27.5L20.5 27.5L19 29.5L20.5 31.5L18 31.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 34L30 36M30 34L28 36" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ReportIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor">
      {/* Central villager */}
      <circle cx="24" cy="15" r="4.5" strokeWidth="2.2" fill="currentColor" fillOpacity="0.25" />
      <path d="M16 29C16 24.5 19.5 22 24 22C28.5 22 32 24.5 32 29V31H16V29Z" strokeWidth="2.2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.25" />
      {/* Left community member */}
      <circle cx="14" cy="18" r="3.5" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 30C8 26.5 10.5 24.5 14 24.5C14.7 24.5 15.4 24.6 16 24.8V29" strokeWidth="2" strokeLinecap="round" />
      {/* Right community member */}
      <circle cx="34" cy="18" r="3.5" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
      <path d="M40 30C40 26.5 37.5 24.5 34 24.5C33.3 24.5 32.6 24.6 32 24.8V29" strokeWidth="2" strokeLinecap="round" />
      {/* Village Report document badge */}
      <rect x="18" y="33" width="12" height="9" rx="1.5" strokeWidth="2" fill="currentColor" fillOpacity="0.45" />
      <line x1="21" y1="36.5" x2="27" y2="36.5" strokeWidth="1.5" strokeLinecap="round" stroke="white" />
      <line x1="21" y1="39" x2="25" y2="39" strokeWidth="1.5" strokeLinecap="round" stroke="white" />
    </svg>
  )
}

const processSteps = [
  {
    num: '01',
    title: 'OBSERVE',
    desc: 'Collect historical Sentinel-2 imagery.',
    icon: ObserveIcon,
  },
  {
    num: '02',
    title: 'ANALYZE',
    desc: 'Use NDVI, NDWI and quantitative geospatial analysis.',
    icon: AnalyzeIcon,
  },
  {
    num: '03',
    title: 'DETECT',
    desc: 'Find loss, gain, recovery and land-cover transitions.',
    icon: DetectIcon,
  },
  {
    num: '04',
    title: 'QUANTIFY',
    desc: 'Calculate area and estimate carbon with configured factors.',
    icon: QuantifyIcon,
  },
  {
    num: '05',
    title: 'REPORT',
    desc: 'Turn results into simple village-level Bengali reports.',
    icon: ReportIcon,
  },
]

const audienceCards = [
  {
    title: 'Local Communities',
    desc: 'Understand and protect their environment.',
    icon: Users,
  },
  {
    title: 'Researchers',
    desc: 'Analyse trends and ecosystem changes.',
    icon: Microscope,
  },
  {
    title: 'NGOs',
    desc: 'Monitor impact and plan interventions.',
    icon: HeartHandshake,
  },
  {
    title: 'Government & Planners',
    desc: 'Use evidence for sustainable development.',
    icon: Landmark,
  },
]

interface LandingPageProps {
  onNavigate?: (path: string) => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState<'EN' | 'বাংলা'>('EN')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Ensure video autoplays smoothly on all desktop and mobile browsers
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy prevented playback, fallback poster stays active
      })
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll reveal observer for landing sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    const revealElements = document.querySelectorAll('.reveal-init, .reveal-fade, .reveal-scale')
    revealElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    if (href.startsWith('/')) {
      if (onNavigate) {
        onNavigate(href)
      } else {
        window.history.pushState({}, '', href)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } else {
      const targetId = href === '#community' ? '#communities' : href
      const el = document.querySelector(targetId) || document.querySelector(href)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <main className="overflow-hidden bg-[#f8fbf7] text-[#123c37]">
      {/* Sticky Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? 'border-b border-[#d7e8df] bg-[rgba(248,252,249,0.96)] shadow-[0_4px_18px_rgba(18,59,50,0.08)] backdrop-blur-[16px]'
          : 'border-b border-[#d7e8df]/60 bg-[rgba(248,252,249,0.88)] backdrop-blur-[12px]'
          }`}
      >
        <div className="flex w-full items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24 py-4">
          <Logo onClick={() => handleNavClick('/')} />
          <nav className="hidden items-center gap-7 text-[12px] font-semibold text-[#123B32] lg:flex">
            {['Home', 'About', 'Approach', 'Monitoring', 'Community'].map((item) => (
              <a
                key={item}
                href={
                  item === 'Home'
                    ? '/'
                    : item === 'About'
                    ? '#about'
                    : item === 'Approach'
                    ? '#workflow'
                    : item === 'Monitoring'
                    ? '#monitoring'
                    : '#communities'
                }
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(
                    item === 'Home'
                      ? '/'
                      : item === 'About'
                      ? '#about'
                      : item === 'Approach'
                      ? '#workflow'
                      : item === 'Monitoring'
                      ? '#monitoring'
                      : '#communities'
                  )
                }}
                className={`border-b-2 py-2 transition-colors ${
                  item === 'Home'
                    ? 'border-[#16845F] text-[#16845F]'
                    : 'border-transparent text-[#123B32] hover:border-[#16845F] hover:text-[#16845F]'
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => setLanguage(language === 'EN' ? 'বাংলা' : 'EN')}
              className="cursor-pointer rounded-full border border-[#b9d9c8] bg-[#eff9f1] px-3 py-2 text-[11px] font-bold text-[#123B32] transition-colors hover:bg-[#e1f3e5]"
            >
              {language === 'EN' ? 'EN  বাংলা' : 'বাংলা  EN'}
            </button>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick('/dashboard')
              }}
              className="cursor-pointer rounded-full bg-[#16845F] px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-[#0b4a36]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#106f50]"
            >
              Explore Dashboard <ArrowRight className="ml-1 inline size-3" />
            </a>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-[#123B32] transition-colors hover:bg-[#e6f4ea] lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <nav className="flex flex-col gap-4 border-t border-[#d7e8df] bg-[rgba(248,252,249,0.98)] px-5 pb-6 pt-4 text-sm font-semibold text-[#123B32] shadow-xl lg:hidden">
            {['Home', 'About', 'Approach', 'Monitoring', 'Community'].map((item) => (
              <a
                key={item}
                href={
                  item === 'Home'
                    ? '/'
                    : item === 'About'
                    ? '#about'
                    : item === 'Approach'
                    ? '#workflow'
                    : item === 'Monitoring'
                    ? '#monitoring'
                    : '#communities'
                }
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(
                    item === 'Home'
                      ? '/'
                      : item === 'About'
                      ? '#about'
                      : item === 'Approach'
                      ? '#workflow'
                      : item === 'Monitoring'
                      ? '#monitoring'
                      : '#communities'
                  )
                }}
                className="py-1 text-[#123B32] hover:text-[#16845F]"
              >
                {item}
              </a>
            ))}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setLanguage(language === 'EN' ? 'বাংলা' : 'EN')}
                className="rounded-full border border-[#b9d9c8] bg-[#eff9f1] px-3 py-1.5 text-xs font-bold text-[#123B32]"
              >
                {language === 'EN' ? 'EN  বাংলা' : 'বাংলা  EN'}
              </button>
            </div>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick('/dashboard')
              }}
              className="rounded-full bg-[#14885a] px-4 py-3 text-center text-white font-bold"
            >
              Explore Dashboard <ArrowRight className="ml-1 inline size-4" />
            </a>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="relative w-full flex min-h-0 flex-col justify-between overflow-hidden bg-[#073d34] pb-8 pt-24 text-white sm:pb-10 lg:min-h-[820px] lg:max-h-[960px] lg:pb-10 lg:pt-28"
      >
        {/* Background Media: 4K Video background with crisp, un-fogged presentation */}
        <div className="absolute inset-0 z-0 overflow-hidden w-full h-full" aria-hidden="true">
          <img
            src={HERO_POSTER}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            poster={HERO_POSTER}
            aria-hidden="true"
          >
            <source src="/videos/sundarbans-hero.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Subtle, localized left-only gradient for text readability without darkening or fogging the video */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(0,40,32,0.48)_0%,rgba(0,40,32,0.22)_38%,rgba(0,40,32,0.05)_58%,transparent_80%)]" />

        {/* Hero Content */}
        <div className="relative z-20 w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <div className="max-w-[760px] animate-[fadeInUp_0.7s_ease-out]">
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9f2cb]">
              <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 backdrop-blur-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
                Data for nature
              </span>
              <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 backdrop-blur-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
                People
              </span>
              <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 backdrop-blur-xs [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
                Climate
              </span>
            </div>
            <p className="mb-3 text-xs font-semibold sm:text-sm text-[#c9f2cb] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
              Climate intelligence for a living delta
            </p>
            <h1 className="max-w-[740px] text-4xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[76px] [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Measure the Forest.
              <br />
              <span className="text-[#b6f2b9]">Protect the Carbon.</span>
            </h1>
            <p className="mt-4 max-w-[660px] text-sm leading-6 text-white/95 sm:text-base sm:leading-7 lg:text-lg [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
              AI-assisted satellite intelligence for monitoring Sundarbans mangroves, detecting ecosystem
              change, estimating blue-carbon impact, and turning environmental data into community-level evidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
              <Button
                light
                href="/dashboard"
                onClick={() => handleNavClick('/dashboard')}
              >
                Explore Dashboard
              </Button>
              <Button
                href="#workflow"
                onClick={() => handleNavClick('#workflow')}
              >
                See How It Works
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)] sm:mt-5">
              <Globe2 className="size-4 text-[#b6f2b9]" /> Gosaba, Sundarbans, West Bengal
            </div>
          </div>
        </div>

        {/* Hero Bottom Translucent Glass Statistics Panel */}
        <div className="relative z-20 mt-8 w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <div className="grid overflow-hidden rounded-2xl border border-[#b4f0c8]/20 bg-[rgba(4,55,45,0.72)] shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Pilot Mangrove Area', '1,245 ha', TreePine],
              ['Observation Period', '2020–2025', Satellite],
              ['Estimated Carbon', 'XX,XXX tCO₂e', CloudSun],
              ['Community Reports', 'Bengali-first', Users],
            ].map(([label, value, IconComponent]) => {
              const Icon = IconComponent as typeof TreePine
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 border-white/10 px-4 py-4 first:pl-4 sm:border-b sm:py-4.5 lg:border-b-0 lg:border-r lg:px-7 lg:py-4.5 lg:last:border-r-0"
                >
                  <Icon className="size-7 shrink-0 text-[#b9edba]" />
                  <div>
                    <p className="text-[10px] text-white/70">{String(label)}</p>
                    <p className="mt-0.5 text-base font-bold sm:text-lg text-white">{String(value)}</p>
                    <span className="text-[9px] uppercase tracking-widest text-[#b9edba]">Pilot / demo</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* About Section ("Why Sundarbans?") */}
      <section
        id="about"
        className="w-full bg-[#f8fbf7] py-10 sm:py-12 lg:py-14"
      >
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          {/* Top Two-Column Storytelling Grid - Perfectly Balanced */}
          <div className="grid items-center gap-10 lg:gap-14 xl:gap-20 lg:grid-cols-[1fr_1.12fr]">
            {/* Left Content */}
            <div className="flex flex-col items-start max-w-2xl">
              <p className="eyebrow">Our purpose</p>
              <h2 className="section-title">Why Sundarbans?</h2>
              <p className="body-copy">
                A living ecosystem under constant change. The Sundarbans protects coastal communities, stores
                vast amounts of carbon, and sustains unique wildlife — while facing growing pressure from
                cyclones, erosion, water change and land-use shifts.
              </p>

              {/* What We Monitor Block */}
              <div className="mt-5 w-full rounded-2xl border border-[#dcebe1] bg-white/90 p-4 sm:p-5 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#16865f]">
                  What we monitor
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-semibold text-[#123c37]">
                  {[
                    'Mangrove cover',
                    'Forest health',
                    'Water & shoreline',
                    'Aquaculture expansion',
                    'Land-use change',
                    'Ecosystem change',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-[#e8f5ec] text-[#16865f]">
                        <Check className="size-3 stroke-[2.5]" />
                      </span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topic Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  'Extreme weather',
                  'Erosion & water change',
                  'Aquaculture expansion',
                  'Mangrove loss & recovery',
                ].map((text) => (
                  <span
                    key={text}
                    className="rounded-full border border-[#cce2d4] bg-white px-3 py-1.5 text-xs font-medium text-[#316b5c] shadow-xs"
                  >
                    {text}
                  </span>
                ))}
              </div>

              {/* Supporting Quote */}
              <div className="mt-5 border-l-2 border-[#16865f] pl-4 py-0.5">
                <p className="text-sm font-bold text-[#123c37]">
                  “Every hectare tells a story.”
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#647a72]">
                  Satellite observations help reveal where the ecosystem is changing and where conservation action may be needed.
                </p>
              </div>

              {/* CTA */}
              <a
                href="#workflow"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('#workflow')
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14885a] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#106f50] hover:shadow-md active:scale-98"
              >
                Explore the method <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>

            {/* Right Visual: Exact Reference Recreation with Vertical Centering */}
            <div className="relative w-full flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-5 lg:gap-7">
              {/* Main Image + Overlapping Secondary Image Container */}
              <div className="relative w-full sm:w-[67%] lg:w-[68%] max-w-[540px] xl:max-w-[620px]">
                {/* Main Sundarban Tiger Mangrove Image */}
                <div className="relative aspect-[1.32/1] w-full overflow-hidden rounded-[22px] border-2 border-white bg-[#073D34] shadow-[0_12px_32px_rgba(7,61,52,0.12)]">
                  <img
                    src="/images/why-sundarban-main.jpg"
                    alt="Royal Bengal Tiger in Sundarban Mangrove Forest"
                    className="h-full w-full object-cover object-[center_60%]"
                    loading="eager"
                  />
                </div>

                {/* Overlapping Secondary Boatman Image */}
                <div className="absolute -bottom-4 -right-3 sm:-bottom-5 sm:-right-5 lg:-bottom-6 lg:-right-6 w-[34%] max-w-[190px] min-w-[125px] z-20 overflow-hidden rounded-[18px] border-[3.5px] border-white bg-white shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
                  <img
                    src="/images/why-sundarban-secondary.jpg"
                    alt="Local boatman navigating Sundarban mangrove waterway"
                    className="aspect-[3/4] w-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Bengali Quote Card */}
              <div className="relative w-full sm:w-[33%] lg:w-[32%] max-w-[280px] xl:max-w-[320px] self-stretch min-h-[280px] sm:min-h-[320px] flex flex-col justify-between rounded-[22px] border border-[#DCE8DC] bg-[#F7FAF2] p-5 sm:p-6 lg:p-7 shadow-[0_8px_24px_rgba(7,61,52,0.06)]">
                <div>
                  <span className="text-3xl lg:text-4xl font-serif text-[#16865F] leading-none select-none block mb-1">
                    “
                  </span>
                  <p className="font-bengali text-xl sm:text-2xl lg:text-[23px] xl:text-[26px] font-extrabold leading-[1.32] text-[#073D34] tracking-normal">
                    বন বাঁচলে<br />
                    মানুষ বাঁচবে,<br />
                    ভবিষ্যৎ বাঁচবে
                    <span className="text-xl lg:text-2xl font-serif text-[#16865F] inline-block ml-1">”</span>
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#D7E6DC] flex items-center gap-2">
                  <div className="shrink-0 text-[#16865F]">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#16865F]">
                    — Sundarban Blue Carbon
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Four Impact Cards */}
          <div className="mt-10 sm:mt-12 lg:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-7">
            {/* Card 1: Biodiversity */}
            <div className="group flex flex-col items-center text-center rounded-[20px] border border-[#d6e6de] bg-[#f7faf7] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#16865f]/50 hover:bg-white hover:shadow-md">
              <div className="mb-4 flex items-center justify-center text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-11 text-[#16865f]" viewBox="0 0 24 24" fill="currentColor">
                  {/* Main Metacarpal Pad */}
                  <path d="M12 11c-2.3 0-4.2 1.6-4.5 3.7-.3 1.9.9 3.8 2.8 4.5.8.3 1.6.3 2.4.3.8 0 1.6 0 2.4-.3 1.9-.7 3.1-2.6 2.8-4.5-.3-2.1-2.2-3.7-4.9-3.7z" />
                  {/* 4 Toe Pads */}
                  <ellipse cx="6.8" cy="8.2" rx="1.6" ry="2.2" transform="rotate(-20 6.8 8.2)" />
                  <ellipse cx="10.2" cy="5.8" rx="1.7" ry="2.3" transform="rotate(-8 10.2 5.8)" />
                  <ellipse cx="13.8" cy="5.8" rx="1.7" ry="2.3" transform="rotate(8 13.8 5.8)" />
                  <ellipse cx="17.2" cy="8.2" rx="1.6" ry="2.2" transform="rotate(20 17.2 8.2)" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#123c37]">Biodiversity</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6c817a]">
                Home to unique species like the Royal Bengal Tiger.
              </p>
            </div>

            {/* Card 2: Natural Shield */}
            <div className="group flex flex-col items-center text-center rounded-[20px] border border-[#d6e6de] bg-[#f7faf7] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#16865f]/50 hover:bg-white hover:shadow-md">
              <div className="mb-4 flex items-center justify-center text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-11 text-[#16865f]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#123c37]">Natural Shield</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6c817a]">
                Protects coastal communities from storms and sea level rise.
              </p>
            </div>

            {/* Card 3: Climate Action */}
            <div className="group flex flex-col items-center text-center rounded-[20px] border border-[#d6e6de] bg-[#f7faf7] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#16865f]/50 hover:bg-white hover:shadow-md">
              <div className="mb-4 flex items-center justify-center text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-11 text-[#16865f]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#123c37]">Climate Action</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6c817a]">
                Stores large amounts of blue carbon.
              </p>
            </div>

            {/* Card 4: Community Livelihoods */}
            <div className="group flex flex-col items-center text-center rounded-[20px] border border-[#d6e6de] bg-[#f7faf7] p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#16865f]/50 hover:bg-white hover:shadow-md">
              <div className="mb-4 flex items-center justify-center text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-11 text-[#16865f]" viewBox="0 0 24 24" fill="currentColor">
                  {/* Central leader */}
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  {/* Left member */}
                  <path d="M4.5 10.5c1.38 0 2.5-1.12 2.5-2.5S5.88 5.5 4.5 5.5 2 6.62 2 8s1.12 2.5 2.5 2.5zm0 1.5c-1.63 0-4.5.82-4.5 2.45V16h4.5v-1.5c0-.64.25-1.22.68-1.68-.45-.2-.93-.32-1.68-.32z" opacity="0.75" />
                  {/* Right member */}
                  <path d="M19.5 10.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5zm0 1.5c.75 0 1.23.12 1.68.32.43.46.68 1.04.68 1.68V16H24v-1.55c0-1.63-2.87-2.45-4.5-2.45z" opacity="0.75" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#123c37]">Community Livelihoods</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6c817a]">
                Supports the lives of millions in coastal villages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section
        id="workflow"
        className="w-full border-y border-[#e0ede4] bg-white py-14 sm:py-16 lg:py-20"
      >
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <div className="grid items-center gap-10 lg:gap-12 xl:gap-16 lg:grid-cols-[0.32fr_0.68fr]">
            {/* Left Column: Compact Editorial Introduction */}
            <div className="flex flex-col items-start max-w-xl">
              <p className="eyebrow">Our approach</p>
              <h2 className="section-title !leading-[1.08]">
                From satellite data<br />
                to community action.
              </h2>
              <p className="body-copy mt-3.5 max-w-[500px]">
                A simple yet powerful pipeline from imagery to real-world impact — grounded in quantitative
                GIS analysis, with AI as an assisting layer for interpretation and verification.
              </p>
              <a
                href="#monitoring"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('#monitoring')
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14885a] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#106f50] hover:shadow-md active:scale-98"
              >
                Explore the Process <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>

            {/* Right Column: Visual Horizontal Process Pipeline */}
            <div className="w-full">
              {/* Desktop / Tablet Horizontal Pipeline */}
              <div className="hidden md:flex items-start justify-between gap-1 lg:gap-2">
                {processSteps.map((step, idx) => {
                  const IconComp = step.icon
                  return (
                    <div key={step.num} className="flex items-center flex-1">
                      {/* Step Item */}
                      <div className="flex-1 flex flex-col items-center text-center group">
                        {/* Number Badge */}
                        <span className="grid size-7 sm:size-7.5 place-items-center rounded-full bg-[#137f57] text-[11px] sm:text-xs font-bold text-white shadow-xs mb-2.5 transition-transform duration-200 group-hover:scale-110">
                          {step.num}
                        </span>

                        {/* Circular Icon Container */}
                        <div className="size-18 sm:size-20 lg:size-[78px] xl:size-22 rounded-full bg-[#EEF7F2] border border-[#D6EBD9] flex items-center justify-center text-[#16865F] shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:bg-[#E3F4E8] group-hover:border-[#16865F]/40 group-hover:shadow-sm">
                          <IconComp className="size-9 sm:size-10 lg:size-9.5 xl:size-11" />
                        </div>

                        {/* Step Title */}
                        <h3 className="mt-3 text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#123F38]">
                          {step.title}
                        </h3>

                        {/* Step Description */}
                        <p className="mt-1 text-[11px] sm:text-xs leading-snug text-[#6C817A] max-w-[130px] xl:max-w-[145px]">
                          {step.desc}
                        </p>
                      </div>

                      {/* Connecting Arrow (between items) */}
                      {idx < processSteps.length - 1 && (
                        <div className="shrink-0 -mt-16 sm:-mt-18 text-[#75aa90] px-1">
                          <ArrowRight className="size-4 sm:size-4.5 stroke-[2.2] opacity-70" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Mobile Vertical Flow */}
              <div className="md:hidden flex flex-col gap-5">
                {processSteps.map((step, idx) => {
                  const IconComp = step.icon
                  return (
                    <div key={step.num} className="flex items-start gap-3.5">
                      {/* Number + Icon */}
                      <div className="flex flex-col items-center">
                        <span className="grid size-6.5 place-items-center rounded-full bg-[#137f57] text-[11px] font-bold text-white shadow-xs mb-1.5">
                          {step.num}
                        </span>
                        <div className="size-14 rounded-full bg-[#EEF7F2] border border-[#D6EBD9] flex items-center justify-center text-[#16865F]">
                          <IconComp className="size-7" />
                        </div>
                        {idx < processSteps.length - 1 && (
                          <div className="w-0.5 h-6 bg-[#d6ebd9] my-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pt-2">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-[#123F38]">
                          {step.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#6C817A] leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monitoring Before/After Section */}
      <section id="monitoring" className="w-full bg-[#f2f7f2] py-12 sm:py-16 lg:py-20">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Real insights</p>
              <h2 className="section-title">
                See the change.
                <br />
                Understand the impact.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#6b8179]">
              Compare mangrove cover over time and see how the Sundarbans is changing across the Gosaba pilot landscape.
            </p>
          </div>
          <BeforeAfterSlider />
        </div>
      </section>

      {/* Platform Preview Section */}
      <section id="dashboard" className="w-full bg-white py-12 sm:py-16 lg:py-20 reveal-init">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <div className="grid items-center gap-10 lg:gap-14 xl:gap-16 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="eyebrow">Platform preview</p>
              <h2 className="section-title">Environmental intelligence at a glance.</h2>
              <p className="body-copy">
                Explore interactive maps, track changes over time, view carbon estimates, and generate
                Bengali reports for your village — all in one place.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-[#42635a]">
                {[
                  'Interactive map with land-cover layers',
                  '2020–2025 timeline slider',
                  'Carbon estimates with uncertainty',
                  'Village-level Bengali PDF reports',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="size-4.5 rounded-full bg-[#d9f4df] p-0.5 text-[#13865c]" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('/dashboard')
                }}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#14885a] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#14885a]/20 transition hover:bg-[#106f50]"
              >
                Open the dashboard <ArrowRight className="size-4" />
              </a>
            </div>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Empowering Communities Section - Full-Width Panoramic Environmental Banner */}
      <section
        id="communities"
        className="relative w-full overflow-hidden bg-white py-12 sm:py-14 lg:py-16 mb-4 sm:mb-6 lg:mb-7"
        style={{
          backgroundImage: "url('/images/empowering-communities.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Soft Linear Horizontal Gradient Overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-white via-white/95 to-white/70 lg:hidden"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden lg:block bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_20%,rgba(255,255,255,0.92)_35%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0.1)_68%,transparent_82%)]"
          aria-hidden="true"
        />

        {/* Floating Editorial Cursive Script Annotation on Image (Top Right) */}
        <div className="hidden lg:block absolute top-8 right-12 xl:right-20 z-10 pointer-events-none select-none text-right">
          <p className="font-serif italic text-2xl xl:text-3xl text-white font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] -rotate-3 leading-snug tracking-wide">
            Data for People.<br />
            <span className="font-normal text-white/95">Action for Nature.</span>
          </p>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          {/* Top Editorial Row */}
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#16865f]">
              FOR PEOPLE. FOR NATURE.
            </p>

            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#073d34] sm:text-4xl lg:text-[44px] leading-[1.08]">
              Empowering Communities
            </h2>

            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-[#506e64]">
              Our insights support local communities, researchers, NGOs and policymakers in building a more resilient Sundarbans.
            </p>
          </div>

          {/* Bottom Row: 4 Compact Editorial Audience Blocks (Uniform Baseline & Compact Width) */}
          <div className="mt-8 sm:mt-10 lg:mt-12 max-w-[1000px] lg:max-w-[1140px] xl:max-w-[1240px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5 items-start">
            {/* 01: Local Communities */}
            <div className="group flex flex-col items-start p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:bg-white/50">
              <div className="text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-7" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="7" r="3" />
                  <path d="M12 12c-2.7 0-8 1.35-8 4v2h16v-2c0-2.65-5.3-4-8-4z" />
                  <circle cx="5" cy="9" r="2" opacity="0.7" />
                  <path d="M5 13.5c-.8 0-3 .4-3 1.5V17h3.5v-1.5c0-.6.2-1.1.5-1.5-.4-.3-.7-.5-1-.5z" opacity="0.7" />
                  <circle cx="19" cy="9" r="2" opacity="0.7" />
                  <path d="M19 13.5c.3 0 .6.2 1 .5.3.4.5.9.5 1.5V17H22v-2c0-1.1-2.2-1.5-3-1.5z" opacity="0.7" />
                </svg>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-[#123c37]">Local Communities</h3>
              <p className="mt-0.5 text-xs text-[#506e64] leading-[1.35]">Understand and protect their environment.</p>
            </div>

            {/* 02: Researchers */}
            <div className="group flex flex-col items-start p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:bg-white/50">
              <div className="text-[#0e7490] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v5.5L4.5 18c-.8 1.4.2 3 1.8 3h11.4c1.6 0 2.6-1.6 1.8-3L14 7.5V2" />
                  <path d="M8.5 2h7" />
                  <circle cx="10" cy="18" r="1" fill="currentColor" />
                  <circle cx="14" cy="17" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-[#123c37]">Researchers</h3>
              <p className="mt-0.5 text-xs text-[#506e64] leading-[1.35]">Analyse trends and ecosystem changes.</p>
            </div>

            {/* 03: NGOs */}
            <div className="group flex flex-col items-start p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:bg-white/50">
              <div className="text-[#e07a5f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.7 6.3a2.5 2.5 0 0 0-3.5 0l-1.7 1.7-2.8-2.8a2.5 2.5 0 0 0-3.5 0l-4.5 4.5a2.5 2.5 0 0 0 0 3.5l5.2 5.2a2.5 2.5 0 0 0 3.5 0l1.7-1.7 2.8 2.8a2.5 2.5 0 0 0 3.5 0l1.4-1.4a2.5 2.5 0 0 0 0-3.5l-2.1-2.1 2-2a2.5 2.5 0 0 0 0-3.5l-2-2.2zM8.5 17.1l-4.1-4.1 4.5-4.5 2.8 2.8-3.2 3.2 1.4 1.4 3.2-3.2 1.4 1.4-6 6zm10.3-3.6l-1.4 1.4-2.8-2.8 3.2-3.2-1.4-1.4-3.2 3.2-1.4-1.4 4.5-4.5 4.1 4.1-1.6 1.6 2 2-2 2z" />
                </svg>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-[#123c37]">NGOs</h3>
              <p className="mt-0.5 text-xs text-[#506e64] leading-[1.35]">Monitor impact and plan interventions.</p>
            </div>

            {/* 04: Government & Planners */}
            <div className="group flex flex-col items-start p-2.5 sm:p-3 rounded-xl transition-all duration-200 hover:bg-white/50">
              <div className="text-[#16865f] transition-transform duration-200 group-hover:scale-110">
                <svg className="size-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6 0v7h4v-7h-4zm7 0v7h3v-7h-3zM2 20v2h20v-2H2z" />
                </svg>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-[#123c37]">Government & Planners</h3>
              <p className="mt-0.5 text-xs text-[#506e64] leading-[1.35]">Use evidence for sustainable development.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contact"
        className="relative w-full overflow-hidden bg-[#041a15] bg-cover bg-center bg-no-repeat px-5 py-16 sm:py-20 lg:py-24 text-center text-white"
        style={{ backgroundImage: "url('/images/community-cta-bg.webp')" }}
      >
        {/* Subtle localized dark radial gradient behind the central text for crisp contrast while preserving the cinematic mangrove, river, and sunset background */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_48%,rgba(3,26,20,0.58)_0%,rgba(3,26,20,0.32)_50%,transparent_100%)]"
          aria-hidden="true"
        />

        {/* Section Content */}
        <div className="relative z-10 mx-auto max-w-4xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a3a30]/80 border border-[#216d56]/60 backdrop-blur-xs shadow-inner">
            <span className="size-1.5 rounded-full bg-[#70e6a5] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a9dda6]">
              Join the movement
            </span>
          </div>

          <h2 className="mt-4 sm:mt-5 text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-[-0.045em] text-white leading-[1.15] sm:leading-[1.12] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
            The forest is changing.
            <br />
            <span className="text-[#f1fcf6]">Let’s make that change measurable.</span>
          </h2>

          <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#d4ece0] font-normal [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
            Observe the ecosystem. Understand the change. Support better conservation decisions.
          </p>

          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-xs sm:max-w-none">
            <Button
              light
              href="/dashboard"
              onClick={() => handleNavClick('/dashboard')}
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold tracking-tight shadow-xl shadow-[#021713]/60 hover:shadow-[#0d4438]/50 transition-all duration-200"
            >
              Explore Dashboard
            </Button>
            <Button
              href="/dashboard"
              onClick={() => handleNavClick('/dashboard')}
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold tracking-tight border-white/35 bg-black/20 text-white backdrop-blur-xs hover:bg-white/10 hover:border-white/55 transition-all duration-200"
            >
              Generate Village Report
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#f8fbf7] border-t border-[#dcebe1] px-5 py-10 sm:py-12">
        <div className="flex w-full flex-col justify-between gap-8 md:flex-row md:items-end px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <Logo onClick={() => handleNavClick('/')} />
          <div className="flex flex-wrap gap-6 text-xs font-semibold text-[#527167]">
            {['Home', 'About', 'Approach', 'Monitoring', 'Community', 'Contact'].map(
              (item) => (
                <a
                  key={item}
                  href={
                    item === 'Home'
                      ? '/'
                      : item === 'About'
                      ? '#about'
                      : item === 'Approach'
                      ? '#workflow'
                      : item === 'Monitoring'
                      ? '#monitoring'
                      : item === 'Community'
                      ? '#communities'
                      : '#contact'
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavClick(
                      item === 'Home'
                        ? '/'
                        : item === 'About'
                        ? '#about'
                        : item === 'Approach'
                        ? '#workflow'
                        : item === 'Monitoring'
                        ? '#monitoring'
                        : item === 'Community'
                        ? '#communities'
                        : '#contact'
                    )
                  }}
                  className="hover:text-[#16845F] transition-colors"
                >
                  {item}
                </a>
              )
            )}
          </div>
          <div className="flex gap-3.5 text-[#23614f]">
            <Globe2 className="size-4.5" />
            <Globe2 className="size-4.5" />
            <Sparkles className="size-4.5" />
          </div>
        </div>
        <div className="mt-8 flex w-full justify-between border-t border-[#dcebe1] pt-5 text-[10px] text-[#789087] px-6 sm:px-10 lg:px-16 xl:px-20 2xl:px-24">
          <span>© 2026 Sundarban Blue Carbon. All rights reserved.</span>
          <span className="hidden sm:block">Measure the forest. Protect the carbon.</span>
        </div>
      </footer>
    </main>
  )
}
