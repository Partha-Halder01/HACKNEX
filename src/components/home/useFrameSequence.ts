import { useEffect, useRef, useState } from 'react'

export const FRAME_COUNT = 240
export const FRAME_W = 1280
export const FRAME_H = 720
export const frameUrl = (i: number) => `/landing/frames/f${String(i + 1).padStart(4, '0')}.webp`

/**
 * Loads the dive frames coarse-to-fine (every 16th, then 8th, 4th, 2nd, all), so
 * scrolling works within a second and only gets smoother as the rest arrives.
 */
export function useFrameSequence(count = FRAME_COUNT, concurrency = 6) {
  const images = useRef<(HTMLImageElement | null)[]>(Array(count).fill(null))
  const [loaded, setLoaded] = useState(0)

  useEffect(() => {
    let cancelled = false
    const order: number[] = []
    const seen = new Set<number>()
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < count; i += step) {
        if (!seen.has(i)) {
          seen.add(i)
          order.push(i)
        }
      }
    }
    if (!seen.has(count - 1)) order.splice(1, 0, count - 1)

    let next = 0
    let done = 0
    const pump = () => {
      if (cancelled || next >= order.length) return
      const i = order[next++]
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (cancelled) return
        images.current[i] = img
        done++
        if (done % 8 === 0 || done === order.length) setLoaded(done)
        pump()
      }
      img.onerror = () => {
        done++
        pump()
      }
      img.src = frameUrl(i)
    }
    for (let k = 0; k < concurrency; k++) pump()
    return () => {
      cancelled = true
    }
  }, [count, concurrency])

  /** Closest already-loaded frame to `index`. */
  const nearest = (index: number): HTMLImageElement | null => {
    const imgs = images.current
    for (let d = 0; d < count; d++) {
      const a = imgs[index - d]
      if (a) return a
      const b = imgs[index + d]
      if (b) return b
    }
    return null
  }

  return { loaded, total: count, nearest }
}

/** Where a 16:9 frame lands when drawn "cover"-style into a W×H box. */
export function coverBox(W: number, H: number) {
  const s = Math.max(W / FRAME_W, H / FRAME_H)
  const w = FRAME_W * s
  const h = FRAME_H * s
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}
