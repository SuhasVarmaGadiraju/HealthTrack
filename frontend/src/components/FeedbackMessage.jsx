import { AlertCircle, CheckCircle2, Info, RotateCw } from 'lucide-react'

const VARIANT_STYLES = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-900',
    icon: AlertCircle,
    iconClass: 'text-red-600',
    role: 'alert',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    role: 'status',
  },
  info: {
    container: 'border-slate-200 bg-slate-50 text-slate-800',
    icon: Info,
    iconClass: 'text-teal-600',
    role: 'status',
  },
}

export function FeedbackMessage({ variant = 'info', title, message, onRetry, retryLabel = 'Retry' }) {
  if (!message) {
    return null
  }

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.info
  const Icon = style.icon

  return (
    <div
      role={style.role}
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${style.container}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
        <div>
          {title ? <p className="font-semibold">{title}</p> : null}
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
