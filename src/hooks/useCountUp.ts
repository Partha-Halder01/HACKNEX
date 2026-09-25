import { useEffect, useState } from 'react'

export function useCountUp(value: string | number, duration: number = 750): string {
  const strVal = String(value)
  const target = parseFloat(strVal.replace(/[^0-9.-]/g, '')) || 0
  const prefix = strVal.startsWith('+') ? '+' : strVal.startsWith('-') ? '-' : ''
  const suffix = strVal.replace(/[0-9,.\-+]/g, '')
  const hasDecimals = strVal.includes('.')
  const decimalCount = hasDecimals ? (strVal.split('.')[1]?.replace(/[^0-9]/g, '').length || 1) : 0

  const [display, setDisplay] = useState(0)

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target)
      return
    }

    let frameId = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(target * eased)

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])

  const formattedNum = hasDecimals
    ? display.toFixed(decimalCount)
    : Math.round(display).toLocaleString()

  return `${prefix}${formattedNum}${suffix}`
}
