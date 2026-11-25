import { HeartPulse } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">
              HealthTrack
            </p>
            <p className="text-xs text-slate-500">Personal Health Monitoring</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden="true" />
          Demo Environment
        </span>
      </div>
    </header>
  )
}
