import React from 'react'
import { BRAND } from '../../config/app'

interface LogoProps {
  /** On dark backgrounds: puts the logo on a soft white card so the dark lettering stays readable. */
  light?: boolean
  /** Rendered height in px (the logo is ~2.8× wider than tall). */
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
      className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-90 ${
        light ? 'rounded-xl bg-white/95 px-2 py-1 shadow-sm' : ''
      }`}
    >
      <img
        src={BRAND.logo}
        alt={BRAND.name}
        style={{ height }}
        className="w-auto select-none"
        draggable={false}
      />
    </a>
  )
}
