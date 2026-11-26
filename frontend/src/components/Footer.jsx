export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white print:border-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:px-0 print:py-4">
        <p className="font-medium text-slate-700">HealthTrack — Personal Health Monitoring</p>
        <p className="max-w-2xl leading-relaxed">
          This report/application contains patient-reported symptom information for demonstration
          purposes. It does not provide medical diagnoses or replace professional medical advice.
          Use fictional patient data only.
        </p>
      </div>
    </footer>
  )
}
