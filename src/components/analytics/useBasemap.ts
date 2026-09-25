import { useEffect, useState } from 'react'
import { AnalysisApi } from '../../services/analysis'
import type { Basemap } from '../../types/analysis'

// One request per page load, shared by every map that shows the Earth Engine photo.
let pending: Promise<Basemap> | null = null

function load(): Promise<Basemap> {
  if (!pending) {
    pending = AnalysisApi.basemap().catch((e: Error) => {
      pending = null // allow a retry on the next mount
      return { available: false, reason: e.message }
    })
  }
  return pending
}

/** Earth Engine Sentinel-2 basemap: undefined while loading, then the result. */
export function useBasemap(): Basemap | undefined {
  const [basemap, setBasemap] = useState<Basemap>()
  useEffect(() => {
    let alive = true
    load().then((b) => alive && setBasemap(b))
    return () => {
      alive = false
    }
  }, [])
  return basemap
}

export const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const ESRI_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
