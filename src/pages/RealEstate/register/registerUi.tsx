import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const EMPTY = '—';

export function humanize(value?: string | null): string {
  if (!value) return EMPTY;
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fmtDate(value?: string | null): string {
  return value ? value.slice(0, 10) : EMPTY;
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return EMPTY;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function fmtMoney(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined) return EMPTY;
  const formatted = Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
}

export function fmtNumber(value?: number | null, suffix?: string | null): string {
  if (value === null || value === undefined) return EMPTY;
  const formatted = Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return suffix ? `${formatted} ${suffix}` : formatted;
}

/** Booleans that may be unknown: null means the agreement/record does not state it. */
export function fmtTriState(value?: boolean | null): string {
  if (value === null || value === undefined) return 'Not stated';
  return value ? 'Yes' : 'No';
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  bad: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  neutral: '',
};

const GOOD = ['ACTIVE', 'COMPLIANT', 'COMPLETED', 'CONFIRMED', 'OCCUPIED', 'SIGNED', 'PAID', 'VERIFIED', 'OWNED', 'RESOLVED'];
const WARN = [
  'PENDING', 'PENDING_REVIEW', 'NOT_REVIEWED', 'SCHEDULED', 'IN_PROGRESS', 'PARTIALLY_OCCUPIED', 'PARTIALLY_SIGNED',
  'OPEN', 'ON_HOLD', 'PAUSED', 'SUSPENDED', 'UNDER_RENOVATION', 'UNDER_REPAIR', 'ACKNOWLEDGED', 'MIXED', 'MEDIUM',
  'PARTIALLY_PAID', 'WARNING', 'DUE',
];
const BAD = [
  'EXPIRED', 'NON_COMPLIANT', 'DISPUTED', 'FAILED', 'TERMINATED', 'CANCELLED', 'REVERSED', 'URGENT', 'HIGH',
  'CRITICAL', 'DECOMMISSIONED', 'UNSIGNED', 'OVERDUE',
];

function toneFor(value: string): Tone {
  const key = value.toUpperCase();
  if (GOOD.includes(key)) return 'good';
  if (WARN.includes(key)) return 'warn';
  if (BAD.includes(key)) return 'bad';
  return 'neutral';
}

export function StatusBadge({ value, className = '' }: { value?: string | null; className?: string }) {
  if (!value || value.toUpperCase() === 'UNKNOWN') return <span className="text-muted-foreground">{EMPTY}</span>;
  const tone = toneFor(value);
  return (
    <Badge
      variant={tone === 'neutral' ? 'outline' : 'secondary'}
      className={`text-[10px] whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {humanize(value)}
    </Badge>
  );
}

export function Field({
  label,
  value,
  mono = false,
  wide = false,
  children,
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  wide?: boolean;
  children?: ReactNode;
}) {
  const content = children ?? value;
  const isBlank = content === null || content === undefined || content === '';
  return (
    <div className={wide ? 'col-span-full' : undefined}>
      <span className="text-muted-foreground block text-[11px]">{label}</span>
      <span className={`font-medium text-foreground text-xs break-words ${mono ? 'font-mono' : ''}`}>
        {isBlank ? EMPTY : content}
      </span>
    </div>
  );
}

export function FieldGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs ${className}`}>{children}</div>;
}

export function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-4 border-border bg-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h4>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 text-center text-muted-foreground text-xs bg-muted/20 rounded-lg border border-dashed border-border">
      {children}
    </div>
  );
}

export function RestrictedNotice({ what }: { what: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground bg-muted/30 rounded-lg border border-border">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      {what} require accounting access and are hidden for your role.
    </div>
  );
}

export interface TableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function SimpleTable<T>({
  columns,
  rows,
  getKey,
  empty,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            {columns.map((col) => (
              <th key={col.header} className={`py-2 px-3 whitespace-nowrap ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((col) => (
                <td key={col.header} className={`py-2 px-3 align-top ${col.className ?? ''}`}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
