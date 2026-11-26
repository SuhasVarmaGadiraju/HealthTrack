import { ClipboardList, Loader2 } from 'lucide-react'
import { formatLocalDate, formatLocalTime, getLocalTimezoneLabel } from '../utils/formatters'
import { getSeverityMeta } from '../utils/severity'
import { EmptyState } from './EmptyState'
import { FeedbackMessage } from './FeedbackMessage'

export function SymptomTable({ symptoms, isLoading, error, onRetry }) {
  const timezoneLabel = getLocalTimezoneLabel()

  return (
    <section
      aria-labelledby="symptom-history-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="symptom-history-heading" className="text-base font-semibold text-slate-900">
            Symptom History
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Chronological log ordered oldest first, with the latest entries at the bottom.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            {symptoms.length} {symptoms.length === 1 ? 'record' : 'records'}
          </span>
          <span>Times shown in {timezoneLabel}</span>
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <FeedbackMessage
            variant="error"
            title="Could not load symptom history"
            message={error}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
            Loading symptom history...
          </div>
        ) : symptoms.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No symptoms logged yet"
            description="Use the Log a Symptom form above to record the first symptom entry for this patient."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Symptom Description
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {symptoms.map((record) => {
                  const meta = getSeverityMeta(record.severity)
                  return (
                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                        {formatLocalDate(record.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatLocalTime(record.timestamp)}
                      </td>
                      <td className="max-w-md break-words px-4 py-3.5 text-slate-700">
                        {record.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
                            aria-hidden="true"
                          />
                          {record.severity} / 10 · {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
