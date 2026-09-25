/** Shapes returned by POST /api/analysis/run (see backend/app/analysis/service.py). */

export type Range = [number, number]

export interface AnalysisParams {
  lat: number
  lon: number
  radiusKm: number
  startDate: string
  endDate: string
  windowDays: number
  language: 'en' | 'bn'
  useAi: boolean
}

export interface Capabilities {
  liveEngine: boolean
  engineStatus: string
  engineMessage: string
  geminiConfigured: boolean
  limits: {
    minDate: string
    maxDate: string
    minSpanDays: number
    minRadiusKm: number
    maxRadiusKm: number
    minWindowDays: number
    maxWindowDays: number
  }
  defaults: {
    lat: number
    lon: number
    name: string
    radiusKm: number
    startDate: string
    endDate: string
    windowDays: number
  }
  sundarbanBbox: { south: number; north: number; west: number; east: number }
}

export interface TimelinePoint {
  key: string
  label: string
  startDate: string
  endDate: string
  midDate: string
  decimalYear: number
  mangroveHa: number
  nonMangroveHa: number
  totalHa: number
  lowConfidenceHa: number
  mangrovePct: number
  imageCount: number | null
}

export interface PeriodSummary {
  label: string
  startDate: string
  endDate: string
  mangroveHa: number
  mangrovePct: number
  imageCount: number | null
}

export interface CarbonStock {
  mangroveHa: number
  carbonMgC: number
  co2eMg: number
  uncertaintyPct: number
  carbonRangeMgC: Range
  co2eRangeMg: Range
  pools: { id: string; name: string; densityMgCPerHa: number; carbonMgC: number; sharePct: number; source: string }[]
}

export interface ProjectionPoint {
  yearsAhead: number
  decimalYear: number
  year: number
  mangroveHa: number
  lowHa: number
  highHa: number
  carbonMgC: number
  carbonLowMgC: number
  carbonHighMgC: number
}

export interface Scenario {
  id: 'current_trend' | 'higher_loss' | 'recovery'
  name: string
  nameBn: string
  description: string
  annualNetChangeHa: number
  points: ProjectionPoint[]
}

export interface ClassMetric {
  classId: number
  className: string
  referenceCount: number
  predictedCount: number
  producersAccuracy: number
  usersAccuracy: number
  f1: number
}

export interface Accuracy {
  sampleCount: number
  overallAccuracy: number
  kappa: number
  f1Macro: number
  confusionMatrix: { classes: string[]; matrix: number[][]; orientation: string }
  classMetrics: ClassMetric[]
  testYear: number
  referenceSource: string
  region?: string
  note: string
  areaCheck?: {
    year: number
    referenceHa: number
    modelHa: number
    differenceHa: number
    differencePct: number | null
    agrees: boolean
    rule: string
  } | null
}

export interface AnalysisBundle {
  analysisId: string
  generatedAt: string
  request: {
    lat: number
    lon: number
    radiusKm: number
    startDate: string
    endDate: string
    windowDays: number
    language: 'en' | 'bn'
    aoiAreaHa: number
    spanYears: number
    scaleM: number
    insideSundarban: boolean
  }
  dataSource: { id: string; isRealData: boolean; label: string; modelVersion: string; engineNote?: string }
  warnings: string[]
  summary: { start: PeriodSummary; end: PeriodSummary }
  timeline: TimelinePoint[]
  change: {
    gainHa: number
    lossHa: number
    uncertainHa: number
    stableMangroveHa: number
    netChangeHa: number
    rawAreaDifferenceHa: number
    annualNetChangeHa: number
    percentChange: number
    minMappingUnitHa?: number
    confidenceThreshold?: number
  }
  carbon: {
    areaUncertaintyPct: number
    start: CarbonStock
    end: CarbonStock
    change: {
      netAreaChangeHa: number
      carbonChangeMgC: number
      co2eChangeMg: number
      carbonChangeRangeMgC: Range
      co2eChangeRangeMg: Range
      grossLossCarbonMgC: number
      grossGainCarbonMgC: number
      annualCo2eChangeMg: number
      note: string
    }
    series: {
      key: string
      label: string
      midDate: string
      decimalYear: number
      carbonMgC: number
      carbonLowMgC: number
      carbonHighMgC: number
      co2eMg: number
    }[]
    methodology: {
      tier: string
      densityMgCPerHa: number
      co2ToCRatio: number
      factorUncertaintyPct: number
      defaultAreaUncertaintyPct: number
      disclaimer: string
    }
  }
  projection: {
    method: string
    trendHaPerYear: number
    trendStdErrHaPerYear: number
    observedGrossGainHaPerYear: number
    observedGrossLossHaPerYear: number
    horizonYears: number
    scenarios: Scenario[]
  }
  accuracy: Accuracy | null
  historical: { year: number; mangroveHa: number }[] | null
  tiles: Partial<Record<'trueColorStart' | 'trueColorEnd' | 'classStart' | 'classEnd' | 'change', string>> | null
  training: {
    trainingRegion: string
    trainYears: number[]
    samplesByClass: Record<string, number>
    trees: number
    features: string[]
    referenceAsset: string
  } | null
  methodology: { composite: string; features: string[]; classifier: string; change: string; scaleM: number }
  narrative: {
    source: string
    model: string | null
    en: string[]
    bn: string[]
    disclaimerEn: string
    disclaimerBn: string
    aiStatus: string
    aiIssues?: string[]
  }
  evidence: { id: string; metric: string; label: string; value: number; unit: string }[]
  reliability: Reliability
}

export interface Reliability {
  level: 'high' | 'medium' | 'low' | 'demo'
  problems: { id: string; severity: 'high' | 'medium'; en: string; bn: string }[]
}

export interface FieldPoint {
  lat: number
  lon: number
  observedClass: 'mangrove' | 'other'
  observedOn: string
  observer?: string
  note?: string
  analysisId?: string
  createdAt?: string
}

export interface Basemap {
  available: boolean
  reason?: string
  tileUrl?: string
  year?: number
  season?: string
  bounds?: [[number, number], [number, number]]
  attribution?: string
}
