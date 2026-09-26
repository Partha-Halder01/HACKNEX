/**
 * MangroveLens - Reusable Formatting Helpers
 */

/**
 * Format a number with thousand separators
 */
export function formatNumber(val: number): string {
  if (isNaN(val)) return '0'
  return val.toLocaleString('en-US')
}

/**
 * Format an area in hectares with optional unit
 */
export function formatHectares(val: number, includeUnit = true): string {
  if (isNaN(val)) return includeUnit ? '0 ha' : '0'
  const formatted = val.toLocaleString('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })
  return includeUnit ? `${formatted} ha` : formatted
}

/**
 * Format a percentage value
 */
export function formatPercentage(val: number, decimals = 1): string {
  if (isNaN(val)) return '0%'
  return `${val.toFixed(decimals)}%`
}

/**
 * Format estimated carbon tons (tCO2e)
 */
export function formatCarbon(val: number, includeUnit = true): string {
  if (isNaN(val)) return includeUnit ? '0 tCO₂e' : '0'
  const formatted = val.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
  return includeUnit ? `${formatted} tCO₂e` : formatted
}
