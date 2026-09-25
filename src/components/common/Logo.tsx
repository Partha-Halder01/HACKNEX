import React from 'react'
import { Leaf } from 'lucide-react'

interface LogoProps {
  light?: boolean
  onClick?: () => void
}

export function Logo({ light = false, onClick }: LogoProps) {
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
      className={`flex items-center gap-2.5 transition-opacity hover:opacity-90 ${
        light ? 'text-white' : 'text-[#123B32]'
      }`}
    >
      <span
        className={`grid size-10 place-items-center rounded-full ${
          light ? 'bg-[#299b70] text-white' : 'bg-[#e5f6e9] text-[#15905e]'
        }`}
      >
        <Leaf className="size-6 -rotate-12" strokeWidth={2.5} />
      </span>
      <span className="leading-[0.9]">
        <strong className="block text-[14px] font-extrabold tracking-[-0.04em]">SUNDARBAN</strong>
        <strong className="block text-[14px] font-extrabold tracking-[-0.04em]">BLUE CARBON</strong>
        <small
          className={`block pt-1 text-[7px] font-medium tracking-[0.04em] ${
            light ? 'text-white/60' : 'text-[#5f8075]'
          }`}
        >
          MEASURE THE FOREST. PROTECT THE CARBON.
        </small>
      </span>
    </a>
  )
}
