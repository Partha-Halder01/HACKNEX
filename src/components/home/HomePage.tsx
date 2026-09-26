import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../common/Logo'
import { HOME_TEXT, type HomeLang } from './content'
import { DiveSequence } from './DiveSequence'
import { goToSnap } from './useSectionSnap'

export function HomePage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const lang: HomeLang = 'en'
  const T = HOME_TEXT[lang]
  const bn = false

  const openDashboard = () => {
    const path = '/dashboard'
    if (onNavigate) onNavigate(path)
    else window.location.href = path
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const snapParam = params.get('snap')
    if (snapParam !== null) {
      const idx = parseInt(snapParam, 10)
      if (!Number.isNaN(idx)) {
        setTimeout(() => goToSnap(idx), 400)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#031a17] text-white">
      {/* Transparent Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-transparent">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-[6vw] py-4">
          <Logo light height={42} onClick={() => goToSnap(0)} />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] md:flex">
            <button type="button" onClick={() => goToSnap(1)} className="hover:text-emerald-300 transition-colors cursor-pointer">{T.nav.dive}</button>
            <button type="button" onClick={() => goToSnap(6)} className="hover:text-emerald-300 transition-colors cursor-pointer">{T.nav.how}</button>
            <button type="button" onClick={() => goToSnap(7)} className="hover:text-emerald-300 transition-colors cursor-pointer">{T.nav.trust}</button>
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <button
              type="button"
              onClick={openDashboard}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-4.5 py-2 text-xs sm:text-sm font-bold text-[#04241d] shadow-[0_2px_14px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-300 hover:shadow-[0_4px_18px_rgba(16,185,129,0.45)] transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
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
