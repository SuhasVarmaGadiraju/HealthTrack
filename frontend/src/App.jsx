import { Calendar } from 'lucide-react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PatientSelector } from './components/PatientSelector'
import { SeverityChart } from './components/SeverityChart'
import { SummaryCards } from './components/SummaryCards'
import { SymptomForm } from './components/SymptomForm'
import { SymptomTable } from './components/SymptomTable'
import { usePatientSymptoms } from './hooks/usePatientSymptoms'
import { formatReadableToday } from './utils/formatters'

function App() {
  const {
    editablePatientId,
    setEditablePatientId,
    activePatientId,
    patientInputError,
    setPatientInputError,
    symptoms,
    trends,
    isLoadingHistory,
    isLoadingTrends,
    historyError,
    trendsError,
    isSubmitting,
    submitError,
    submitSuccess,
    selectPatient,
    retryHistory,
    retryTrends,
    submitSymptom,
    clearFeedback,
  } = usePatientSymptoms()

  const handleEditablePatientChange = (value) => {
    setEditablePatientId(value)
    if (patientInputError) {
      setPatientInputError(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <section
          aria-labelledby="welcome-heading"
          className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
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
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs sm:self-auto">
            <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span>{formatReadableToday()}</span>
          </div>
        </section>

        <PatientSelector
          editablePatientId={editablePatientId}
          onEditableChange={handleEditablePatientChange}
          activePatientId={activePatientId}
          onSelectPatient={selectPatient}
          error={patientInputError}
          isLoading={isLoadingHistory || isLoadingTrends}
        />

        <SummaryCards
          symptoms={symptoms}
          activePatientId={activePatientId}
          isLoading={isLoadingHistory}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SymptomForm
              activePatientId={activePatientId}
              isSubmitting={isSubmitting}
              submitError={submitError}
              submitSuccess={submitSuccess}
              onSubmit={submitSymptom}
              onClearFeedback={clearFeedback}
            />
          </div>
          <div className="lg:col-span-7">
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
