import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, RotateCw, Search, UserCheck, Users } from 'lucide-react'

export function PatientSelector({
  editablePatientId,
  onEditableChange,
  activePatientId,
  onSelectPatient,
  error,
  isLoading,
  patients = [],
  isLoadingPatients = false,
  patientsError = null,
  onRetryPatients,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return patients
    }
    return patients.filter((pid) => pid.toLowerCase().includes(query))
  }, [patients, searchTerm])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (event) => {
    event.preventDefault()
    onSelectPatient(editablePatientId)
  }

  const handleChoosePatient = (patientId) => {
    setIsOpen(false)
    setSearchTerm('')
    onSelectPatient(patientId)
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
            Select an existing patient or enter a synthetic patient ID to view or log records (demo
            scoping only, not authentication).
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-label="Browse existing patients"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 sm:w-auto"
            >
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-teal-600" aria-hidden="true" />
                <span>
                  {isLoadingPatients ? 'Loading patients...' : `Patients (${patients.length})`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div
                role="region"
                aria-label="Existing patient selector"
                className="absolute left-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:right-0 sm:left-auto"
              >
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search patients..."
                    aria-label="Search patients"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="mt-2 max-h-52 overflow-y-auto">
                  {patientsError ? (
                    <div className="space-y-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-800">
                      <p>{patientsError}</p>
                      {onRetryPatients ? (
                        <button
                          type="button"
                          onClick={onRetryPatients}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        >
                          <RotateCw className="h-3 w-3" aria-hidden="true" />
                          Retry
                        </button>
                      ) : null}
                    </div>
                  ) : isLoadingPatients ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" aria-hidden="true" />
                      Loading patients...
                    </div>
                  ) : patients.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-slate-500">
                      No patients recorded yet. Enter a new ID to log the first symptom.
                    </p>
                  ) : filteredPatients.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-slate-500">
                      No patients matching &ldquo;{searchTerm.trim()}&rdquo;.
                    </p>
                  ) : (
                    <ul role="listbox" aria-label="Available patients" className="space-y-0.5">
                      {filteredPatients.map((pid) => {
                        const isSelected = pid === activePatientId
                        return (
                          <li key={pid} role="option" aria-selected={isSelected}>
                            <button
                              type="button"
                              onClick={() => handleChoosePatient(pid)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                                isSelected
                                  ? 'bg-teal-50 font-semibold text-teal-800'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">{pid}</span>
                              {isSelected ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:w-44 ${
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
          </form>
        </div>
      </div>
    </section>
  )
}
