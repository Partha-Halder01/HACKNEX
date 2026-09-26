import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../common/Logo'
import { HOME_TEXT, type HomeLang } from './content'
import { DiveSequence, STAGES } from './DiveSequence'

export function HomePage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [lang, setLang] = useState<HomeLang>(() => (new URLSearchParams(window.location.search).get('lang') === 'bn' ? 'bn' : 'en'))
  const [scrolled, setScrolled] = useState(false)
  const T = HOME_TEXT[lang]
  const bn = lang === 'bn'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openDashboard = () => {
    const path = `/dashboard${bn ? '?lang=bn' : ''}`
    if (onNavigate) onNavigate(path)
    else window.location.href = path
  }

  /** Jump to a point of the scroll-driven story (the middle of a stage). */
  const goToStage = (stage: readonly [number, number]) => {
    const el = document.getElementById('dive')
    if (!el) return
    const mid = (stage[0] + stage[1]) / 2
    window.scrollTo({ top: el.offsetTop + mid * (el.offsetHeight - window.innerHeight), behavior: 'smooth' })
  }

  return (
    <div className={`min-h-screen bg-[#031a17] text-white ${bn ? 'font-bengali' : ''}`}>
      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'border-b border-white/10 bg-[#031a17]/60 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-[6vw] py-4">
          <Logo light height={42} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-white/85 md:flex">
            <button type="button" onClick={() => goToStage(STAGES.above)} className="hover:text-white">{T.nav.dive}</button>
            <button type="button" onClick={() => goToStage(STAGES.how)} className="hover:text-white">{T.nav.how}</button>
            <button type="button" onClick={() => goToStage(STAGES.trust)} className="hover:text-white">{T.nav.trust}</button>
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="flex overflow-hidden rounded-full border border-white/30 font-mono text-xs font-bold">
              {(['en', 'bn'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 ${lang === l ? 'bg-white text-[#04241d]' : 'text-white hover:bg-white/10'}`}
                >
                  {l === 'en' ? 'EN' : 'বাং'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openDashboard}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-[#04241d] transition hover:bg-emerald-400"
            >
              {T.nav.cta} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* The whole story — dive and service explanation — plays over the video */}
      <DiveSequence lang={lang} onOpenDashboard={openDashboard} />

      <footer className="border-t border-white/10 bg-[#020f0d] px-[6vw] py-8 text-center font-mono text-[11px] leading-relaxed text-white/45">
        {T.footer}
      </footer>
    </div>
  )
}
