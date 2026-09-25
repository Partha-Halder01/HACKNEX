import React from 'react'
import { ArrowRight } from 'lucide-react'

interface ButtonProps {
  children: React.ReactNode
  light?: boolean
  href?: string
  onClick?: () => void
  className?: string
}

export function Button({ children, light = false, href, onClick, className = '' }: ButtonProps) {
  const baseClasses = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
    light
      ? 'bg-[#baf4b6] text-[#0d4438] shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-[#a8efb5]'
      : 'border border-white/35 text-white hover:bg-white/10 hover:-translate-y-0.5'
  } ${className}`

  if (href) {
    return (
      <a href={href} onClick={onClick} className={baseClasses}>
        {children}
        <ArrowRight className="size-4" />
      </a>
    )
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {children}
      <ArrowRight className="size-4" />
    </button>
  )
}
