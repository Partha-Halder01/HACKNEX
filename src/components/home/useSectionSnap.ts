import { useEffect, type RefObject } from 'react'

/**
 * Scroll progress (0 → 1 through the pinned dive) where each section is fully
 * shown: hero, above, surface, roots, carbon, problem, how, trust, cta.
 * These are the middles of the STAGES in DiveSequence (hero and cta at the ends).
 */
export const SNAPS = [0, 0.099, 0.2, 0.295, 0.405, 0.5325, 0.68, 0.8275, 1] as const

/** Fired by the header nav / hero buttons: `detail` is the SNAPS index to go to. */
export const SNAP_EVENT = 'dive:goto'

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const instant = 'instant' as ScrollBehavior // the page sets `scroll-behavior: smooth` globally

/**
 * One small wheel / swipe / key press moves exactly one section, with an eased
 * scroll so the video plays between sections. Past the last section the page
 * scrolls normally (to the footer). If scrolling stops between two sections
 * (e.g. after dragging the scrollbar), the page settles on the nearest one.
 */
export function useSectionSnap(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let animating = false
    let raf = 0
    let lastWheel = 0
    let needQuiet = false // swallow trackpad inertia after a snap
    let pointerDown = false
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    let touchY: number | null = null

    const geom = () => {
      const el = sectionRef.current
      if (!el) return null
      const span = el.offsetHeight - window.innerHeight
      return span > 0 ? { top: el.offsetTop, span } : null
    }
    const yOf = (g: { top: number; span: number }, i: number) => g.top + SNAPS[i] * g.span

    /** Next snap in the scroll direction, or null when native scrolling should take over. */
    const targetFor = (dir: 1 | -1): number | null => {
      const g = geom()
      if (!g) return null
      const y = window.scrollY
      const end = g.top + g.span
      if (dir > 0 && y >= end - 2) return null // past the story: let the footer scroll
      if (dir < 0 && y > end + 2) return null // in the footer: native until back at the story
      if (y < g.top - 2) return null
      if (dir > 0) {
        for (let i = 0; i < SNAPS.length; i++) if (yOf(g, i) > y + 4) return yOf(g, i)
      } else {
        for (let i = SNAPS.length - 1; i >= 0; i--) if (yOf(g, i) < y - 4) return yOf(g, i)
      }
      return null
    }

    const animateTo = (target: number) => {
      cancelAnimationFrame(raf)
      const from = window.scrollY
      const d = target - from
      if (Math.abs(d) < 2) return
      if (document.hidden) {
        // Animation frames don't run in a hidden tab: jump straight there.
        window.scrollTo({ top: target, behavior: instant })
        needQuiet = true
        return
      }
      const dur = Math.min(1400, Math.max(750, 650 + (Math.abs(d) / window.innerHeight) * 90))
      const t0 = performance.now()
      animating = true
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur)
        window.scrollTo({ top: from + d * easeInOutCubic(k), behavior: instant })
        if (k < 1) raf = requestAnimationFrame(step)
        else {
          animating = false
          needQuiet = true
        }
      }
      raf = requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return // pinch-zoom / sideways
      const now = performance.now()
      const quietGap = now - lastWheel
      lastWheel = now
      const dir = e.deltaY > 0 ? 1 : -1
      const target = targetFor(dir)
      if (target === null && !animating) return
      e.preventDefault()
      if (animating) return
      if (needQuiet && quietGap < 160) return // still the same flick
      needQuiet = false
      if (Math.abs(e.deltaY) < 2 || target === null) return
      animateTo(target)
    }

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.altKey || e.ctrlKey || e.metaKey) return
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
      if (!down && !up) return
      const target = targetFor(down ? 1 : -1)
      if (target === null) return
      e.preventDefault()
      if (!animating) animateTo(target)
    }

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return
      const dy = touchY - (e.touches[0]?.clientY ?? touchY)
      if (Math.abs(dy) < 4) return
      if (animating || targetFor(dy > 0 ? 1 : -1) !== null) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY === null) return
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY)
      touchY = null
      if (animating || Math.abs(dy) < 30) return
      const target = targetFor(dy > 0 ? 1 : -1)
      if (target !== null) animateTo(target)
    }

    // Settle on the nearest section when scrolling stops in between.
    const onScroll = () => {
      if (animating) return
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        const g = geom()
        if (!g || animating || pointerDown) return
        const y = window.scrollY
        if (y < g.top || y > g.top + g.span) return
        let best = 0
        for (let i = 1; i < SNAPS.length; i++) if (Math.abs(yOf(g, i) - y) < Math.abs(yOf(g, best) - y)) best = i
        if (Math.abs(yOf(g, best) - y) > 4) animateTo(yOf(g, best))
      }, 220)
    }
    const onPointerDown = () => {
      pointerDown = true
    }
    const onPointerUp = () => {
      pointerDown = false
      onScroll()
    }

    const onGoto = (e: Event) => {
      const i = (e as CustomEvent<number>).detail
      const g = geom()
      if (g && i >= 0 && i < SNAPS.length) animateTo(yOf(g, i))
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener(SNAP_EVENT, onGoto)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settleTimer)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener(SNAP_EVENT, onGoto)
    }
  }, [sectionRef])
}

/** Ask the dive to animate to section `index` of SNAPS. */
export const goToSnap = (index: number) => window.dispatchEvent(new CustomEvent(SNAP_EVENT, { detail: index }))
