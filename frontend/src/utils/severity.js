/**
 * Self-reported severity category metadata (1-3 Mild, 4-6 Moderate, 7-10 Severe).
 */

export function getSeverityMeta(severity) {
  const num = Number(severity)
  if (num >= 7) {
    return {
      label: 'Severe',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
      textClass: 'text-red-700',
    }
  }
  if (num >= 4) {
    return {
      label: 'Moderate',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700',
    }
  }
  return {
    label: 'Mild',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
  }
}
