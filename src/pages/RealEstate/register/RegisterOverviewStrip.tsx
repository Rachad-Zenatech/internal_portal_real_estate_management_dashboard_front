import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { Property, PropertyAgreement, PropertyRegister } from '@/types/realEstate';
import { EMPTY, StatusBadge, fmtDate, humanize } from './registerUi';

/** The agreement that currently governs occupancy: the ACTIVE one that ends last. */
export function currentAgreement(agreements: PropertyAgreement[]): PropertyAgreement | null {
  const active = agreements.filter((a) => a.status === 'ACTIVE');
  if (active.length === 0) return null;
  return [...active].sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
}

function nextDeadline(agreements: PropertyAgreement[], asOf: string): { date: string; label: string } | null {
  const candidates: { date: string; label: string }[] = [];
  for (const a of agreements) {
    if (a.status !== 'ACTIVE') continue;
    if (a.notice_deadline) candidates.push({ date: a.notice_deadline, label: 'Renewal notice' });
    if (a.next_rent_review_date) candidates.push({ date: a.next_rent_review_date, label: 'Rent review' });
    if (a.end_date) candidates.push({ date: a.end_date, label: 'Agreement end' });
  }
  const upcoming = candidates.filter((c) => c.date >= asOf).sort((x, y) => x.date.localeCompare(y.date));
  return upcoming[0] ?? null;
}

export default function RegisterOverviewStrip({
  property,
  register,
}: {
  property: Property;
  register: PropertyRegister | undefined;
}) {
  const tenure = register?.tenure;
  const agreement = register ? currentAgreement(register.agreements) : null;
  const deadline = register ? nextDeadline(register.agreements, register.as_of) : null;
  const urgent = register ? register.warnings.filter((w) => w.severity === 'CRITICAL' || w.severity === 'HIGH').length : 0;

  const items: { label: string; content: ReactNode }[] = [
    {
      label: 'Tenure',
      content: tenure ? (
        <div className="flex flex-col gap-0.5">
          <StatusBadge value={String(tenure.derived_tenure)} className="w-fit" />
          {!tenure.derived_from_records && (
            <span className="text-[10px] text-muted-foreground">from legacy label</span>
          )}
        </div>
      ) : (
        <StatusBadge value={property.ownership_type} className="w-fit" />
      ),
    },
    { label: 'Property status', content: <StatusBadge value={property.status} className="w-fit" /> },
    { label: 'Occupancy', content: <StatusBadge value={property.occupancy_status} className="w-fit" /> },
    { label: 'Usage type', content: property.usage_type ? humanize(property.usage_type) : EMPTY },
    {
      label: 'Current agreement ends',
      content: agreement ? `${fmtDate(agreement.end_date)}` : EMPTY,
    },
    {
      label: 'Next key date',
      content: deadline ? `${deadline.label} • ${fmtDate(deadline.date)}` : EMPTY,
    },
    {
      label: 'Urgent items',
      content: register ? (
        <span className={urgent > 0 ? 'text-rose-600 font-bold' : 'text-foreground'}>{urgent}</span>
      ) : (
        EMPTY
      ),
    },
  ];

  return (
    <Card className="p-3 mb-4 border-border bg-card shadow-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <span className="text-muted-foreground block text-[11px]">{item.label}</span>
            <div className="font-semibold text-foreground mt-0.5 break-words">{item.content}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
