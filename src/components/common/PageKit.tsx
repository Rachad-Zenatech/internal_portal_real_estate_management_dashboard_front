import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The shared look of every page: a soft gradient header, stat cards and rounded section cards.
 * Use these instead of one-off headers so all pages feel the same as the dashboard.
 */

/** Class for any surface card, for places that need the look without the component. */
export const surfaceClass = 'rounded-2xl border border-border/60 bg-card shadow-sm';

export function PageHeader({
  eyebrow, title, description, actions, compact = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Smaller header for inner pages (lists, details). The dashboard uses the large one. */
  compact?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden border border-border/60 bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/10 ${compact ? 'rounded-2xl p-5 sm:p-6' : 'rounded-3xl p-6 sm:p-8'}`}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>}
          <h1 className={`mt-1 font-bold tracking-tight ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{title}</h1>
          {description && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  icon, label, value, hint, tone, to,
}: { icon: ReactNode; label: string; value: ReactNode; hint?: string; tone: string; /** Makes the whole card a link. */ to?: string }) {
  const card = (
    <div className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md${to ? ' h-full cursor-pointer' : ''}`}>
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.12] blur-xl transition-opacity group-hover:opacity-25 ${tone}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-2 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${tone}`}>{icon}</div>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} aria-label={label} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">{card}</Link>
  ) : card;
}

export function SectionCard({
  title, subtitle, actions, children, className = '', flush = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding, for tables and lists that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={`${surfaceClass} ${flush ? '' : 'p-5'} ${className}`}>
      {(title || actions) && (
        <header className={`flex flex-wrap items-start justify-between gap-3 ${flush ? 'border-b border-border/60 p-5' : 'mb-4'}`}>
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
