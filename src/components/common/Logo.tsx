import React from 'react'
import { BRAND } from '../../config/app'

interface LogoProps {
  /**
   * For dark backgrounds. The logo file's lettering is dark green, which disappears
   * on dark colours, so this shows the transparent emblem with the name in light
   * colours instead of the full logo image.
   */
  light?: boolean
  /** Rendered height in px. */
  height?: number
  onClick?: () => void
}

export function Logo({ light = false, height = 44, onClick }: LogoProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <a
      href="/"
      onClick={handleClick}
      aria-label={`${BRAND.name} — home`}
      className="inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
    >
      {light ? (
        <>
          <img
            src={BRAND.icon}
            alt=""
            style={{ height: height * 1.15 }}
            className="w-auto select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            draggable={false}
          />
          <span className="leading-none">
            <span className="block font-display font-extrabold tracking-tight text-white" style={{ fontSize: height * 0.5 }}>
              Mangrove<span className="text-emerald-400">Lens</span>
            </span>
            <span className="mt-1 hidden font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:block">
              {BRAND.tagline}
            </span>
          </span>
        </>
      ) : (
        <img src={BRAND.logo} alt={BRAND.name} style={{ height }} className="w-auto select-none" draggable={false} />
      )}
    </a>
  )
}
