/**
 * Sundarban Blue Carbon - Global Application Configuration
 *
 * Non-secret runtime defaults and domain constants.
 */

export const APP_CONFIG = {
  name: 'Sundarban Blue Carbon',
  tagline: 'Measure the Forest. Protect the Carbon.',
  version: '1.0.0',

  // Geospatial Defaults (Gosaba Pilot Zone, Indian Sundarbans)
  map: {
    defaultCenter: [22.165, 88.805] as [number, number],
    defaultZoom: 11,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },

  // Temporal Defaults
  timeline: {
    baselineYear: 2020,
    currentYear: 2025,
    availableYears: ['2020', '2021', '2022', '2023', '2024', '2025'] as const,
  },

  // Carbon Stock Constants — mirrors backend/app/carbon/factors.py (IPCC 2013
  // Wetlands Supplement, Tier 1 / indicative). Stock density, not annual flux.
  carbon: {
    tier: 'Tier 1 / indicative',
    densityMgCPerHa: 283.1, // AGB 74.2 + BGB 28.9 + SOC(0-1m) 180.0
    co2ToCRatio: 44 / 12,
    uncertaintyPercent: 18.3,
    unit: 'Mg CO₂e',
    disclaimer:
      'Carbon values are model-based indicative estimates calculated using published IPCC Tier 1 factors and satellite canopy coverage. They do not constitute certified carbon credits.',
  },

  // Default Pilot Location
  defaultPilotLocation: 'Gosaba',
} as const
