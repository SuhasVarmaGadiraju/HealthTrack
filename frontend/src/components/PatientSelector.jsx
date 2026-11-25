import { Loader2, UserCheck, Users } from 'lucide-react'

const QUICK_PATIENTS = ['PAT001', 'PAT002']

export function PatientSelector({
  editablePatientId,
  onEditableChange,
  activePatientId,
  onSelectPatient,
  error,
  isLoading,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSelectPatient(editablePatientId)
  }

  return (
    <section
      aria-labelledby="patient-selector-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="patient-selector-heading"
              className="flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              <Users className="h-4 w-4 text-teal-600" aria-hidden="true" />
              Patient Record Selection
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
              Active Patient: <strong className="text-slate-900">{activePatientId}</strong>
            </span>
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading patient data...
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Select a synthetic patient ID to view or log records (demo scoping only, not
            authentication).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1">
            <label htmlFor="patient-id-input" className="sr-only">
              Patient ID
            </label>
            <div className="flex items-center gap-2">
              <input
                id="patient-id-input"
                type="text"
                value={editablePatientId}
                onChange={(e) => onEditableChange(e.target.value)}
                maxLength={100}
                placeholder="e.g. PAT001"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'patient-id-error' : undefined}
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:w-48 ${
                  error
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/20'
                }`}
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Load Patient
              </button>
            </div>
            {error ? (
              <p id="patient-id-error" role="alert" className="text-xs font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5 sm:pt-1">
            <span className="text-xs text-slate-500">Demo IDs:</span>
            {QUICK_PATIENTS.map((demoId) => {
              const isActive = activePatientId === demoId
              return (
                <button
                  key={demoId}
                  type="button"
                  onClick={() => onSelectPatient(demoId)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isActive
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {demoId}
                </button>
              )
            })}
          </div>
        </form>
      </div>
    </section>
  )
}
