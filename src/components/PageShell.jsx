/**
 * Page wrapper with sticky header and consistent padding
 */
export default function PageShell({ title, subtitle, children, actions }) {
  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>

      {/* Content */}
      <div className="p-6 pb-24 md:pb-6">{children}</div>
    </div>
  );
}
