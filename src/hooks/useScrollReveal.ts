import { useEffect, useRef } from 'react'

interface ScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
  animationClass?: string
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    animationClass = 'reveal-visible',
  } = options

  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      node.classList.add(animationClass)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add(animationClass)
          if (once) {
            observer.unobserve(node)
          }
        } else if (!once) {
          node.classList.remove(animationClass)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, once, animationClass])

  return ref
}
