import { useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RegisterWarning, RegisterWarningSeverity } from '@/types/realEstate';

const COLLAPSED_COUNT = 4;

const SEVERITY_STYLES: Record<RegisterWarningSeverity, { row: string; icon: string; label: string }> = {
  CRITICAL: { row: 'border-rose-500/40 bg-rose-500/10', icon: 'text-rose-600', label: 'Critical' },
  HIGH: { row: 'border-rose-500/30 bg-rose-500/5', icon: 'text-rose-500', label: 'High' },
  WARNING: { row: 'border-amber-500/30 bg-amber-500/10', icon: 'text-amber-600', label: 'Warning' },
  INFO: { row: 'border-blue-500/30 bg-blue-500/5', icon: 'text-blue-600', label: 'Info' },
};

function SeverityIcon({ severity }: { severity: RegisterWarningSeverity }) {
  const cls = `w-4 h-4 shrink-0 mt-0.5 ${SEVERITY_STYLES[severity].icon}`;
  if (severity === 'CRITICAL') return <AlertOctagon className={cls} />;
  if (severity === 'INFO') return <Info className={cls} />;
  return <AlertTriangle className={cls} />;
}

/** Which detail tab explains a warning. */
export function tabForWarning(warning: RegisterWarning): string | null {
  switch (warning.related_type) {
    case 'agreement':
      return 'agreements';
    case 'document':
      return 'documents';
    case 'compliance_item':
      return 'compliance';
    case 'insurance_policy':
      return 'utilities';
    default:
      break;
  }
  if (warning.code.startsWith('OBLIGATION')) return 'financials';
  if (warning.code === 'DOCUMENT_MISSING') return 'documents';
  return null;
}

export default function PropertyWarningsBanner({
  warnings,
  onNavigate,
}: {
  warnings: RegisterWarning[];
  onNavigate: (tab: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (warnings.length === 0) return null;

  const visible = expanded ? warnings : warnings.slice(0, COLLAPSED_COUNT);
  const hidden = warnings.length - visible.length;
  const urgent = warnings.filter((w) => w.severity === 'CRITICAL' || w.severity === 'HIGH').length;

  return (
    <Card className="p-4 border-border bg-card shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Attention needed
          <span className="text-xs font-normal text-muted-foreground">
            {warnings.length} item{warnings.length === 1 ? '' : 's'}
            {urgent > 0 ? ` • ${urgent} urgent` : ''}
          </span>
        </h3>
        {warnings.length > COLLAPSED_COUNT && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show fewer' : `Show all ${warnings.length}`}
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {visible.map((w, index) => {
          const target = tabForWarning(w);
          const style = SEVERITY_STYLES[w.severity];
          return (
            <li
              key={`${w.code}-${w.related_id ?? 'p'}-${index}`}
              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${style.row}`}
            >
              <SeverityIcon severity={w.severity} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground mr-1.5">{style.label}</span>
                <span className="text-foreground/90">{w.message}</span>
              </div>
              {target && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-0.5 shrink-0"
                  onClick={() => onNavigate(target)}
                >
                  Review
                  <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && <p className="text-[11px] text-muted-foreground">{hidden} more not shown.</p>}
    </Card>
  );
}
