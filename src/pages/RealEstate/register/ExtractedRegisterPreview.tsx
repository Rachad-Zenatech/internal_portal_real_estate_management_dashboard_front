import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ExtractedRegister, ExtractedRegisterItem, RegisterApplyResult } from '@/types/realEstate';
import { EMPTY, Field, FieldGrid, SimpleTable, StatusBadge, fmtDate, fmtMoney, humanize } from './registerUi';
import type { TableColumn } from './registerUi';

const ENTITY_LABELS: Record<string, string> = {
  property_master: 'Property details',
  agreements: 'Agreements',
  ownerships: 'Ownership records',
  acquisitions: 'Acquisition records',
  insurance_policies: 'Insurance policies',
  utilities: 'Utilities',
  compliance_items: 'Compliance items',
  assets: 'Assets',
  recurring_obligations: 'Recurring charges',
};

/** ✓ when the supporting quote was found in the document, ⚠ when it was not; nothing when the model gave no quote. */
function EvidenceMark({ item, field }: { item: ExtractedRegisterItem; field: string }) {
  const evidence = item.evidence?.[field];
  if (!evidence) return null;
  return evidence.verified ? (
    <span title={`Quote found in the document${evidence.source_page ? ` (page ${evidence.source_page})` : ''}: “${evidence.supporting_text ?? ''}”`}>
      <CheckCircle2 className="inline w-3 h-3 ml-1 text-emerald-600" />
    </span>
  ) : (
    <span title={`The supporting quote was NOT found in the document: “${evidence.supporting_text ?? ''}”. Verify this value.`}>
      <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-600" />
    </span>
  );
}

function DateField({ item, field, label, hint }: { item: ExtractedRegisterItem; field: string; label: string; hint?: string }) {
  const value = item[field] as string | null | undefined;
  return (
    <Field label={label}>
      {value ? (
        <>
          {fmtDate(value)}
          <EvidenceMark item={item} field={field} />
          {hint && <span className="block text-[10px] text-muted-foreground font-normal">{hint}</span>}
        </>
      ) : (
        EMPTY
      )}
    </Field>
  );
}

function ConfidenceBadges({ item }: { item: ExtractedRegisterItem }) {
  const unverified = item.unverified_fields?.length ?? 0;
  return (
    <>
      {item.confidence != null && (
        <Badge variant="outline" className="text-[10px]">{Math.round(item.confidence * 100)}% confidence</Badge>
      )}
      {unverified > 0 && (
        <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
          {unverified} quote{unverified === 1 ? '' : 's'} not found in document
        </Badge>
      )}
    </>
  );
}

function AgreementPreview({ item }: { item: ExtractedRegisterItem }) {
  const parties = (item.parties as Array<{ name: string; role: string }> | undefined) ?? [];
  const derived = (item.derived as { end_date_if_all_options_exercised?: string } | undefined) ?? {};
  const title = item.agreement_number || humanize(item.agreement_type);
  return (
    <div className="p-3 rounded-lg border border-border bg-background space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-xs text-foreground">{title}</span>
        <Badge variant="outline" className="text-[10px]">{humanize(item.agreement_type)}</Badge>
        {item.is_amendment && (
          <Badge className="text-[10px] bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
            Amendment • {humanize(item.amendment_status)}
          </Badge>
        )}
        {item.our_role && <Badge variant="secondary" className="text-[10px]">We are: {humanize(item.our_role)}</Badge>}
        <ConfidenceBadges item={item} />
      </div>
      <FieldGrid>
        <DateField item={item} field="start_date" label="Commencement" />
        <DateField item={item} field="end_date" label="Current end date" />
        <DateField item={item} field="proposed_end_date" label="Proposed end date" hint="Stored separately; does not replace the end date" />
        <DateField item={item} field="max_permissible_end_date" label="Maximum permissible end date" hint={item.max_term_source ? `Source: ${item.max_term_source}` : 'No source cited: needs review'} />
        <DateField item={item} field="original_end_date" label="Original end date" />
        <DateField item={item} field="renewal_notice_deadline" label="Renewal notice deadline" />
        <DateField item={item} field="next_rent_review_date" label="Next rent review" />
        <Field
          label="Rent"
          value={item.rent_amount != null ? `${fmtMoney(item.rent_amount, item.currency)} ${item.rent_frequency ? `/ ${humanize(item.rent_frequency).toLowerCase()}` : ''}` : null}
        />
        <Field label="Security deposit" value={item.security_deposit != null ? fmtMoney(item.security_deposit, item.currency) : null} />
        <Field label="Landlord" value={parties.find((p) => p.role === 'LANDLORD')?.name} />
        <Field label="Tenant" value={parties.find((p) => p.role === 'TENANT')?.name} />
        {derived.end_date_if_all_options_exercised && (
          <Field label="If every renewal option is used" value={`${fmtDate(derived.end_date_if_all_options_exercised)} (computed)`} />
        )}
      </FieldGrid>
    </div>
  );
}

type FeeRow = ExtractedRegisterItem & { _key: string };

const FEE_COLUMNS: TableColumn<FeeRow>[] = [
  { header: 'Fee', cell: (o) => <span className="font-medium">{o.description || humanize(o.category)}</span> },
  { header: 'Type', cell: (o) => humanize(o.category) },
  { header: 'Amount', cell: (o) => <span className="tabular-nums">{fmtMoney(o.amount, o.currency)}</span>, className: 'text-right' },
  { header: 'Frequency', cell: (o) => humanize(o.frequency) },
  { header: 'Applies to', cell: (o) => [o.applies_to_unit && `Unit ${o.applies_to_unit}`, o.applies_to_address].filter(Boolean).join(', ') || EMPTY },
  { header: 'From', cell: (o) => (o.start_date ? fmtDate(o.start_date) : EMPTY) },
  { header: 'To', cell: (o) => (o.end_date ? fmtDate(o.end_date) : EMPTY) },
  { header: 'Payer → Recipient', cell: (o) => (o.payer_name || o.recipient_name ? `${o.payer_name || EMPTY} → ${o.recipient_name || EMPTY}` : EMPTY) },
  {
    header: 'Confidence',
    cell: (o) => (o.confidence != null ? `${Math.round(o.confidence * 100)}%` : EMPTY),
  },
];

function Line({ children }: { children: ReactNode }) {
  return <li className="text-[11px] text-foreground/90">{children}</li>;
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-1.5">
      <h6 className="font-semibold text-[11px] text-foreground">{title} ({count})</h6>
      {children}
    </div>
  );
}

export type RegisterGroup = 'master' | 'ownership' | 'agreements' | 'insurance' | 'utilities' | 'compliance' | 'assets' | 'obligations';

/** Which extracted sections (and which warning item types) each dialog tab shows. */
const GROUP_ENTITIES: Record<RegisterGroup, string[]> = {
  master: ['property_master'],
  ownership: ['ownerships', 'acquisitions'],
  agreements: ['agreements', 'register'],
  insurance: ['insurance_policies'],
  utilities: ['utilities'],
  compliance: ['compliance_items'],
  assets: ['assets'],
  obligations: ['recurring_obligations'],
};

function RegisterOfOneDocument({
  register,
  matches,
  groups,
}: {
  register: ExtractedRegister;
  matches: (item: ExtractedRegisterItem) => boolean;
  groups: RegisterGroup[];
}) {
  const shows = (g: RegisterGroup) => groups.includes(g);
  const warningEntities = groups.flatMap((g) => GROUP_ENTITIES[g]);
  const keep = (items: ExtractedRegisterItem[] | undefined) => (items ?? []).filter(matches);
  const agreements = shows('agreements') ? keep(register.agreements) : [];
  const ownerships = shows('ownership') ? keep(register.ownerships) : [];
  const acquisitions = shows('ownership') ? keep(register.acquisitions) : [];
  const insurance = shows('insurance') ? keep(register.insurance_policies) : [];
  const utilities = shows('utilities') ? keep(register.utilities) : [];
  const compliance = shows('compliance') ? keep(register.compliance_items) : [];
  const assets = shows('assets') ? keep(register.assets) : [];
  // Every payment found: standalone charges, plus the rent and additional charges stated inside each lease.
  const leaseCharges: ExtractedRegisterItem[] = shows('obligations')
    ? keep(register.agreements).flatMap((a) => {
        const label = a.agreement_number || humanize(a.agreement_type);
        const rent = a.rent_amount != null && a.rent_amount > 0
          ? [{ category: 'RENT', description: `Rent (${label})`, amount: a.rent_amount, currency: a.currency, frequency: a.rent_frequency,
              start_date: a.start_date, end_date: a.end_date, applies_to_address: a.applies_to_address, applies_to_unit: a.applies_to_unit,
              confidence: a.confidence } as ExtractedRegisterItem]
          : [];
        const extras = ((a.additional_charges as ExtractedRegisterItem[] | undefined) ?? []).map((c) => ({
          ...c, description: c.description ? `${c.description} (${label})` : `${humanize(c.category)} (${label})`,
          start_date: a.start_date, end_date: a.end_date, applies_to_address: a.applies_to_address, applies_to_unit: a.applies_to_unit,
          confidence: a.confidence,
        }));
        return [...rent, ...extras];
      })
    : [];
  const obligations = shows('obligations') ? [...keep(register.recurring_obligations), ...leaseCharges] : [];
  const master = shows('master') && register.property_master && matches(register.property_master) ? register.property_master : null;
  const masterEntries = master
    ? Object.entries(master).filter(([k, v]) => !k.startsWith('applies_to') && k !== 'evidence' && v !== null && v !== '')
    : [];

  const warnings = register.warnings.filter((w) => warningEntities.includes(w.item_type || 'register'));
  const total = agreements.length + ownerships.length + acquisitions.length + insurance.length + utilities.length + compliance.length +
    assets.length + obligations.length + masterEntries.length;
  if (total === 0 && warnings.length === 0) {
    return <p className="text-[11px] text-muted-foreground">Nothing of this kind was found in this document for this property.</p>;
  }

  return (
    <div className="space-y-3">
      <Group title="Agreements" count={agreements.length}>
        <div className="space-y-2">{agreements.map((a, i) => <AgreementPreview key={i} item={a} />)}</div>
      </Group>
      <Group title="Ownership" count={ownerships.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {ownerships.map((o, i) => (
            <Line key={i}>
              <strong>{o.owner_name}</strong>
              {o.ownership_percentage != null ? ` • ${o.ownership_percentage}%` : ''}
              {o.title_reference ? ` • title ${o.title_reference}` : ''}
              {o.start_date ? ` • from ${fmtDate(o.start_date)}` : ''}
              {o.end_date ? ` to ${fmtDate(o.end_date)}` : ''}
            </Line>
          ))}
        </ul>
      </Group>
      <Group title="Acquisition" count={acquisitions.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {acquisitions.map((a, i) => (
            <Line key={i}>
              {humanize(a.acquisition_type)}
              {a.closing_date || a.acquisition_date ? ` • ${fmtDate(a.closing_date || a.acquisition_date)}` : ''}
              {a.purchase_price != null ? ` • ${fmtMoney(a.purchase_price, a.currency)}` : ''}
              {a.seller_name ? ` • seller ${a.seller_name}` : ''}
              {a.mortgage_reference ? ` • mortgage ${a.mortgage_reference}` : ''}
            </Line>
          ))}
        </ul>
      </Group>
      <Group title="Insurance" count={insurance.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {insurance.map((p, i) => (
            <Line key={i}>
              {p.policy_number}{p.insurer_name ? ` • ${p.insurer_name}` : ''}{p.coverage_type ? ` • ${p.coverage_type}` : ''}
              {p.policy_end_date ? ` • ends ${fmtDate(p.policy_end_date)}` : ''}
            </Line>
          ))}
        </ul>
      </Group>
      <Group title="Compliance" count={compliance.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {compliance.map((c, i) => (
            <Line key={i}>{c.requirement_name}{c.issuing_authority ? ` • ${c.issuing_authority}` : ''}{c.expiry_date ? ` • expires ${fmtDate(c.expiry_date)}` : ''}</Line>
          ))}
        </ul>
      </Group>
      <Group title="Utilities" count={utilities.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {utilities.map((u, i) => <Line key={i}>{humanize(u.utility_type)}{u.provider_name ? ` • ${u.provider_name}` : ''}{u.account_reference ? ` • ${u.account_reference}` : ''}</Line>)}
        </ul>
      </Group>
      <Group title="Assets" count={assets.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {assets.map((a, i) => <Line key={i}>{a.name}{a.manufacturer ? ` • ${a.manufacturer}` : ''}{a.serial_number ? ` • SN ${a.serial_number}` : ''}</Line>)}
        </ul>
      </Group>
      <Group title="Recurring charges" count={obligations.length}>
        <SimpleTable
          columns={FEE_COLUMNS}
          rows={obligations.map((o, i) => ({ ...o, _key: String(i) }))}
          getKey={(o) => o._key}
          empty="No charges found."
        />
      </Group>
      <Group title="Property details" count={masterEntries.length}>
        <ul className="list-disc pl-4 space-y-0.5">
          {masterEntries.map(([k, v]) => <Line key={k}>{humanize(k)}: <strong>{String(v)}</strong></Line>)}
        </ul>
      </Group>
      {warnings.length > 0 && (
        <div className="space-y-1">
          <h6 className="font-semibold text-[11px] text-foreground">Needs review ({warnings.length})</h6>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/90">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface RegisterPreviewJob {
  id: string;
  label: string;
  register?: ExtractedRegister | null;
  /** The document describes several properties: items without an address/unit are then not applied to any of them. */
  manyProperties?: boolean;
}

/**
 * Everything the register pass found in the documents of one property record. Items that belong to another unit or
 * building (`matches` is false) are left out, exactly as they will be when the property is saved.
 */
export function ExtractedRegisterPreview({
  jobs,
  matches,
  groups,
  title,
}: {
  jobs: RegisterPreviewJob[];
  matches: (item: ExtractedRegisterItem, manyProperties: boolean) => boolean;
  groups: RegisterGroup[];
  title: string;
}) {
  const withContent = jobs.filter((j) => j.register);
  return (
    <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground pb-1.5 border-b border-violet-500/20">
        <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        These fill the property&apos;s Lease & Agreements, Ownership & Acquisition, Insurance and Compliance tabs when you save. Values already on the property are never overwritten by a later document; differences are listed for review.
        <CheckCircle2 className="inline w-3 h-3 mx-1 text-emerald-600" /> quote found in the document,
        <AlertTriangle className="inline w-3 h-3 mx-1 text-amber-600" /> quote not found, so verify.
      </p>
      {withContent.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No register details were extracted for these documents.</p>
      ) : (
        withContent.map((job) => (
          <div key={job.id} className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <FileText className="w-3 h-3 text-primary" />
              <span className="truncate">{job.label}</span>
            </div>
            <RegisterOfOneDocument register={job.register!} matches={(item) => matches(item, !!job.manyProperties)} groups={groups} />
          </div>
        ))
      )}
    </div>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** What saving the documents wrote to the property, plus anything that needs a person's attention. */
export function RegisterApplyResultPanel({ results }: { results: RegisterApplyResult[] }) {
  const totals: Record<string, Record<string, number>> = {};
  for (const result of results) {
    for (const [entity, counts] of Object.entries(result.applied ?? {})) {
      totals[entity] = totals[entity] ?? {};
      for (const [action, n] of Object.entries(counts)) totals[entity][action] = (totals[entity][action] ?? 0) + n;
    }
  }
  const issues = results.flatMap((r) => r.issues ?? []);
  const conflicts = results.flatMap((r) => r.conflicts ?? []);
  const unmatched = results.reduce((sum, r) => sum + (r.unmatched_items ?? 0), 0);
  const errors = results.map((r) => r.error).filter(Boolean) as string[];
  const entries = Object.entries(totals);

  return (
    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 text-[11px]">
      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Filled in from the documents</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">No agreement, ownership or other register records were added.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {entries.map(([entity, counts]) => (
            <li key={entity} className="px-2 py-0.5 rounded-md bg-background border border-border">
              <strong>{ENTITY_LABELS[entity] ?? humanize(entity)}</strong>:{' '}
              {Object.entries(counts).map(([action, n]) => `${n} ${action.replace('_', ' ')}`).join(', ')}
            </li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <p className="text-rose-600">The property was saved, but register details could not be applied: {errors.join('; ')}</p>
      )}
      {issues.length > 0 && (
        <div className="space-y-1">
          <span className="font-semibold text-foreground">Needs your attention ({issues.length})</span>
          <ul className="space-y-0.5">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <StatusBadge value={issue.severity} className="shrink-0" />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Differs from what is already recorded ({plural(conflicts.length, 'value')}; the existing value was kept)</span>
          <ul className="space-y-0.5 text-muted-foreground">
            {conflicts.map((c, i) => (
              <li key={i}>
                {ENTITY_LABELS[c.entity] ?? humanize(c.entity)} • {humanize(c.field)}: kept “{String(c.existing)}”, document says “{String(c.incoming)}”
              </li>
            ))}
          </ul>
        </div>
      )}
      {unmatched > 0 && (
        <p className="text-muted-foreground">
          {plural(unmatched, 'item')} in the documents belong to a different unit or building and were not added to this property.
        </p>
      )}
    </div>
  );
}
