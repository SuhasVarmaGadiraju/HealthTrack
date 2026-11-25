/**
 * Date, time, and summary statistic formatting helpers.
 */

export function formatReadableToday(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatLocalDate(isoTimestamp) {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date'
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export function formatLocalTime(isoTimestamp) {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid time'
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

export function getLocalTimezoneLabel() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(
      new Date()
    )
    const tzPart = parts.find((part) => part.type === 'timeZoneName')
    return tzPart ? tzPart.value : 'Local time'
  } catch {
    return 'Local time'
  }
}

export function formatUtcDateLabel(utcDateString) {
  // Parse YYYY-MM-DD explicitly in UTC so local timezone offsets do not shift the calendar day.
  const [year, month, day] = String(utcDateString).split('-').map(Number)
  if (!year || !month || !day) {
    return utcDateString
  }
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate)
}

export function computeSummaryStats(symptoms) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return {
      totalLogs: 0,
      averageSeverity: null,
      latestSeverity: null,
      daysTracked: 0,
    }
  }

  let severitySum = 0
  const utcDays = new Set()

  for (const entry of symptoms) {
    severitySum += Number(entry.severity) || 0
    const parsed = new Date(entry.timestamp)
    if (!Number.isNaN(parsed.getTime())) {
      utcDays.add(parsed.toISOString().slice(0, 10))
    }
  }

  const latestRecord = symptoms[symptoms.length - 1]
  return {
    totalLogs: symptoms.length,
    averageSeverity: Number((severitySum / symptoms.length).toFixed(1)),
    latestSeverity: latestRecord ? latestRecord.severity : null,
    daysTracked: utcDays.size,
  }
}
