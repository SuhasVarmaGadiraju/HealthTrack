import { TrendingUp, Loader2 } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatUtcDateLabel } from '../utils/formatters'
import { EmptyState } from './EmptyState'
import { FeedbackMessage } from './FeedbackMessage'

function TrendsTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{formatUtcDateLabel(label)} (UTC)</p>
      <p className="mt-1 text-slate-700">
        Average severity:{' '}
        <span className="font-semibold text-teal-700">
          {point.average_severity !== null ? `${point.average_severity} / 10` : 'No logs'}
        </span>
      </p>
      <p className="text-slate-500">
        Symptoms logged: <span className="font-medium text-slate-800">{point.symptom_count}</span>
      </p>
    </div>
  )
}

export function SeverityChart({ trends, isLoading, error, onRetry }) {
  const hasRecordedData =
    Array.isArray(trends) && trends.some((point) => point.symptom_count > 0)

  return (
    <section
      aria-labelledby="severity-trends-heading"
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="severity-trends-heading" className="text-base font-semibold text-slate-900">
            Severity Trends
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Daily average severity over the last 30 days.
          </p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          UTC Calendar Dates
        </span>
      </div>

      <div className="mt-5 flex-1">
        {error ? (
          <FeedbackMessage
            variant="error"
            title="Could not load severity trends"
            message={error}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
            Loading 30-day trends...
          </div>
        ) : !hasRecordedData ? (
          <EmptyState
            icon={TrendingUp}
            title="No trend data in the last 30 days"
            description="Daily average severity points will appear here once symptoms are logged within the 30-day UTC window."
          />
        ) : (
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatUtcDateLabel}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  minTickGap={28}
                />
                <YAxis
                  domain={[1, 10]}
                  ticks={[1, 3, 5, 7, 10]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<TrendsTooltip />} />
                <Line
                  type="monotone"
                  dataKey="average_severity"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 4, fill: '#0D9488', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Gaps indicate UTC days with no recorded symptoms (missing days are not plotted as zero).
      </p>
    </section>
  )
}
