import { Suspense, lazy, useEffect, useState } from 'react'
import { LandingPage } from './pages/LandingPage'

// Map + chart libraries load only when the analytics page is opened.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))

// Old admin routes (and the removed /login) all land on the one public analytics page.
const ANALYTICS_ROUTES = ['/dashboard', '/monitoring', '/change-detection', '/carbon', '/reports', '/data', '/login']

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/')

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      setCurrentPath(path)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isAnalytics = ANALYTICS_ROUTES.some((r) => currentPath === r || currentPath.startsWith(`${r}/`))
  if (isAnalytics) {
    if (currentPath !== '/dashboard') window.history.replaceState({}, '', `/dashboard${window.location.search}`)
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[#647a72]">Loading…</div>}>
        <AnalyticsPage onNavigate={navigate} />
      </Suspense>
    )
  }
  return <LandingPage onNavigate={navigate} />
}
