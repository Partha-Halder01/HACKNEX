import type { AnalysisBundle, AnalysisParams, Basemap, Capabilities, FieldPoint } from '../types/analysis'

// '' → same-origin /api (Vite dev proxy); set VITE_API_URL for a separate backend host.
const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new Error('Cannot reach the analysis server. Is the backend running on port 8000?')
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join('; ')
    } catch {
      /* keep status text */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export const AnalysisApi = {
  capabilities: () => request<Capabilities>('/analysis/capabilities'),
  basemap: () => request<Basemap>('/analysis/basemap'),
  run: (params: AnalysisParams) =>
    request<AnalysisBundle>('/analysis/run', { method: 'POST', body: JSON.stringify(params) }),
  addFieldPoint: (point: FieldPoint) =>
    request<{ saved: boolean; storage: string; point: FieldPoint }>('/analysis/field-points', {
      method: 'POST',
      body: JSON.stringify(point),
    }),
  listFieldPoints: () => request<FieldPoint[]>('/analysis/field-points'),
}
