import { Calendar, HeartPulse, Printer } from 'lucide-react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PatientSelector } from './components/PatientSelector'
import { SeverityChart } from './components/SeverityChart'
import { SummaryCards } from './components/SummaryCards'
import { SymptomForm } from './components/SymptomForm'
import { SymptomTable } from './components/SymptomTable'
import { usePatientSymptoms } from './hooks/usePatientSymptoms'
import { formatReadableToday, getLocalTimezoneLabel } from './utils/formatters'

function App() {
  const {
    editablePatientId,
    setEditablePatientId,
    activePatientId,
    patientInputError,
    setPatientInputError,
    symptoms,
    trends,
    patients,
    isLoadingHistory,
    isLoadingTrends,
    isLoadingPatients,
    historyError,
    trendsError,
    patientsError,
    isSubmitting,
    submitError,
    submitSuccess,
    selectPatient,
    retryHistory,
    retryTrends,
    retryPatients,
    submitSymptom,
    clearFeedback,
  } = usePatientSymptoms()

  const handleEditablePatientChange = (value) => {
    setEditablePatientId(value)
    if (patientInputError) {
      setPatientInputError(null)
    }
  }

  const canShareReport = !isLoadingHistory && symptoms.length > 0
  const handlePrintReport = () => {
    if (!canShareReport) {
      return
    }
    window.print()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 print:bg-white">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:space-y-5 print:px-0 print:py-2">
        <section
          aria-label="Printable patient report header"
          className="hidden border-b border-slate-300 pb-4 print:block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  HealthTrack — Patient Symptom Report
                </h1>
                <p className="text-xs text-slate-600">
                  Patient ID: <strong className="text-slate-900">{activePatientId}</strong> ·
                  Generated: {formatReadableToday()} ({getLocalTimezoneLabel()})
                </p>
              </div>
            </div>
            <p className="text-right text-xs text-slate-500">
              Summary &amp; History: All available records
              <br />
              Severity Trends: Last 30 UTC calendar days
            </p>
          </div>
        </section>

        <section
          aria-labelledby="welcome-heading"
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-teal-700">
              Understand your health, one day at a time.
            </p>
            <h1 id="welcome-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Your Health Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your symptoms, monitor severity, and better understand your health over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs">
              <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <span>{formatReadableToday()}</span>
            </div>
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!canShareReport}
              title={
                canShareReport
                  ? `Print or save PDF report for ${activePatientId}`
                  : 'Log at least one symptom to print or save a report'
              }
              className="inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-white px-3.5 py-2 text-xs font-medium text-teal-700 shadow-xs transition hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Share with Doctor</span>
            </button>
          </div>
        </section>

        <div className="print:hidden">
          <PatientSelector
            editablePatientId={editablePatientId}
            onEditableChange={handleEditablePatientChange}
            activePatientId={activePatientId}
            onSelectPatient={selectPatient}
            error={patientInputError}
            isLoading={isLoadingHistory || isLoadingTrends}
            patients={patients}
            isLoadingPatients={isLoadingPatients}
            patientsError={patientsError}
            onRetryPatients={retryPatients}
          />
        </div>

        <div className="print-avoid-break">
          <SummaryCards
            symptoms={symptoms}
            activePatientId={activePatientId}
            isLoading={isLoadingHistory}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 print:block">
          <div className="lg:col-span-5 print:hidden">
            <SymptomForm
              activePatientId={activePatientId}
              isSubmitting={isSubmitting}
              submitError={submitError}
              submitSuccess={submitSuccess}
              onSubmit={submitSymptom}
              onClearFeedback={clearFeedback}
            />
          </div>
          <div className="lg:col-span-7 print-avoid-break">
            <SeverityChart
              trends={trends}
              isLoading={isLoadingTrends}
              error={trendsError}
              onRetry={retryTrends}
            />
          </div>
        </div>

        <SymptomTable
          symptoms={symptoms}
          isLoading={isLoadingHistory}
          error={historyError}
          onRetry={retryHistory}
        />
      </main>

      <Footer />
    </div>
  )
}

export default App
