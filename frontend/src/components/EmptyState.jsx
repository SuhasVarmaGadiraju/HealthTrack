export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      {Icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-teal-600 shadow-xs ring-1 ring-slate-200/80">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
      ) : null}
    </div>
  )
}
