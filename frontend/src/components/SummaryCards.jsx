import { Activity, CalendarDays, ClipboardList, Gauge } from 'lucide-react'
import { computeSummaryStats } from '../utils/formatters'
import { getSeverityMeta } from '../utils/severity'

export function SummaryCards({ symptoms, activePatientId, isLoading }) {
  const stats = computeSummaryStats(symptoms)
  const latestMeta =
    stats.latestSeverity !== null ? getSeverityMeta(stats.latestSeverity) : null

  const cards = [
    {
      label: 'Total symptom logs',
      value: isLoading ? '...' : String(stats.totalLogs),
      helper: stats.totalLogs === 1 ? '1 recorded entry' : `${stats.totalLogs} recorded entries`,
      icon: ClipboardList,
    },
    {
      label: 'Average severity',
      value: isLoading
        ? '...'
        : stats.averageSeverity !== null
          ? `${stats.averageSeverity.toFixed(1)} / 10`
          : '—',
      helper: stats.averageSeverity !== null ? 'Mean across all logs' : 'No logs recorded yet',
      icon: Gauge,
    },
    {
      label: 'Latest severity',
      value: isLoading
        ? '...'
        : stats.latestSeverity !== null
          ? `${stats.latestSeverity} / 10`
          : '—',
      helper: latestMeta ? `${latestMeta.label} (latest entry)` : 'No logs recorded yet',
      badge: latestMeta,
      icon: Activity,
    },
    {
      label: 'Days tracked',
      value: isLoading ? '...' : String(stats.daysTracked),
      helper: 'Distinct UTC calendar dates',
      icon: CalendarDays,
    },
  ]

  return (
    <section aria-labelledby="summary-stats-heading" className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="summary-stats-heading" className="text-sm font-semibold text-slate-900">
          Patient Summary
        </h2>
        <p className="text-xs text-slate-500">
          Summary cards reflect all available records for{' '}
          <span className="font-medium text-slate-700">{activePatientId}</span>, not only the last
          30 days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
                {card.badge ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${card.badge.badgeClass}`}
                  >
                    {card.badge.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
