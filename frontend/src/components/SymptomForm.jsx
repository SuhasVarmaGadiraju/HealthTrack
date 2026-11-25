import { useState } from 'react'
import { ClipboardPlus, Loader2 } from 'lucide-react'
import { validatePatientId } from '../hooks/usePatientSymptoms'
import { getSeverityMeta } from '../utils/severity'
import { FeedbackMessage } from './FeedbackMessage'

const SEVERITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const MAX_DESCRIPTION_LENGTH = 1000

export function SymptomForm({
  activePatientId,
  isSubmitting,
  submitError,
  submitSuccess,
  onSubmit,
  onClearFeedback,
}) {
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(5)
  const [descriptionError, setDescriptionError] = useState(null)
  const [severityError, setSeverityError] = useState(null)

  const severityMeta = getSeverityMeta(severity)

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value)
    if (descriptionError) {
      setDescriptionError(null)
    }
    if (submitError || submitSuccess) {
      onClearFeedback?.()
    }
  }

  const handleSeveritySelect = (level) => {
    setSeverity(level)
    if (severityError) {
      setSeverityError(null)
    }
    if (submitError || submitSuccess) {
      onClearFeedback?.()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const patientCheck = validatePatientId(activePatientId)
    if (!patientCheck.valid) {
      setDescriptionError(patientCheck.error)
      return
    }

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setDescriptionError('Please enter a symptom description before submitting.')
      return
    }
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`)
      return
    }

    if (!Number.isInteger(severity) || severity < 1 || severity > 10) {
      setSeverityError('Please select a whole-number severity between 1 and 10.')
      return
    }

    setDescriptionError(null)
    setSeverityError(null)

    const succeeded = await onSubmit({
      description: trimmedDescription,
      severity,
    })

    // Preserve user input on failure; reset only after confirmed persistence.
    if (succeeded) {
      setDescription('')
      setSeverity(5)
    }
  }

  return (
    <section
      aria-labelledby="symptom-form-heading"
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="symptom-form-heading" className="text-base font-semibold text-slate-900">
            Log a Symptom
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Record what you are experiencing and rate its intensity to build an accurate timeline.
          </p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          Patient: <strong className="text-slate-900">{activePatientId}</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-1 flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="symptom-description" className="text-sm font-medium text-slate-800">
              Symptom Description
            </label>
            <span
              className={`text-xs ${
                description.length >= MAX_DESCRIPTION_LENGTH ? 'font-medium text-amber-700' : 'text-slate-500'
              }`}
            >
              {description.length} / {MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          <textarea
            id="symptom-description"
            name="description"
            rows={4}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Describe what you are experiencing..."
            aria-invalid={Boolean(descriptionError)}
            aria-describedby={descriptionError ? 'symptom-description-error' : undefined}
            className={`mt-1.5 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              descriptionError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/20'
            }`}
          />
          {descriptionError ? (
            <p
              id="symptom-description-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {descriptionError}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span id="severity-label" className="text-sm font-medium text-slate-800">
              Severity Rating (1–10)
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityMeta.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${severityMeta.dotClass}`} aria-hidden="true" />
              {severity} / 10 · {severityMeta.label}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="severity-label"
            aria-describedby={severityError ? 'severity-error' : 'severity-help'}
            className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10"
          >
            {SEVERITY_LEVELS.map((level) => {
              const isSelected = severity === level
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSeveritySelect(level)}
                  className={`flex h-10 items-center justify-center rounded-xl border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {level}
                </button>
              )
            })}
          </div>

          <p id="severity-help" className="mt-2 text-xs text-slate-500">
            1–3 Mild · 4–6 Moderate · 7–10 Severe (self-reported severity categories, not medical
            diagnoses)
          </p>
          {severityError ? (
            <p id="severity-error" role="alert" className="mt-1 text-xs font-medium text-red-600">
              {severityError}
            </p>
          ) : null}
        </div>

        <FeedbackMessage variant="error" message={submitError} />
        <FeedbackMessage variant="success" message={submitSuccess} />

        <div className="mt-auto pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving symptom...
              </>
            ) : (
              <>
                <ClipboardPlus className="h-4 w-4" aria-hidden="true" />
                Log Symptom
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
