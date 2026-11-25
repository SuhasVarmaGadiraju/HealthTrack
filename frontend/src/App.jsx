import { Activity } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-teal-600" />
            <span className="text-xl font-semibold tracking-tight text-slate-900">
              HealthTrack
            </span>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            Scaffold Ready
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Patient Symptom Tracking
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Frontend scaffold initialized with React, Vite, Tailwind CSS, Recharts, and Lucide React.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
