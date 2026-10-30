import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { realEstateService } from '@/services/realEstateService';
import type { MaxTermReviewStatus, PropertyAgreement } from '@/types/realEstate';
import { fmtDate, humanize } from './registerUi';

/** Server message first (validation errors are actionable), then the generic error text. */
export function apiErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { detail?: unknown } }; detail?: unknown; message?: string };
  const detail = e?.response?.data?.detail ?? e?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(1).join('.')}: ${d.msg}`).join('; ');
  }
  return e?.message || 'The request failed';
}

function useInvalidateProperty(propertyId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Agreement form (create + edit)
// ---------------------------------------------------------------------------------------------------------------------
type FieldType = 'text' | 'number' | 'date' | 'select' | 'tristate' | 'textarea' | 'checkbox';
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  financial?: boolean;
  wide?: boolean;
}

const opt = (...values: string[]) => values.map((value) => ({ value, label: humanize(value) }));

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Identification',
    fields: [
      { key: 'agreement_type', label: 'Agreement type', type: 'select', options: opt('LEASE', 'SUBLEASE', 'LEASE_TO_OWN', 'LICENSE', 'MANAGEMENT', 'OTHER') },
      { key: 'agreement_number', label: 'Agreement number', type: 'text' },
      { key: 'our_role', label: 'Our role', type: 'select', options: opt('TENANT', 'LANDLORD', 'SUBLESSEE', 'SUBLESSOR', 'OTHER') },
      { key: 'landlord_lessor', label: 'Landlord / lessor', type: 'text' },
      { key: 'tenant_company', label: 'Tenant / lessee', type: 'text' },
    ],
  },
  {
    title: 'Contract dates',
    fields: [
      { key: 'signing_date', label: 'Contract signing date', type: 'date' },
      { key: 'effective_date', label: 'Effective date', type: 'date' },
      { key: 'start_date', label: 'Lease commencement date', type: 'date', required: true },
      { key: 'end_date', label: 'Current contractual end date', type: 'date', required: true },
      { key: 'original_end_date', label: 'Original contractual end date', type: 'date' },
      { key: 'proposed_end_date', label: 'Proposed end date', type: 'date' },
      { key: 'proposed_end_date_source', label: 'Proposed end date source', type: 'text' },
      { key: 'actual_termination_date', label: 'Actual termination date', type: 'date' },
      { key: 'termination_notice_date', label: 'Termination notice date', type: 'date' },
      { key: 'notice_period_days', label: 'Notice period (days)', type: 'number' },
    ],
  },
  {
    title: 'Renewal',
    fields: [
      { key: 'renewal_option', label: 'Renewal option', type: 'tristate' },
      { key: 'notice_deadline', label: 'Renewal notice deadline', type: 'date' },
      { key: 'renewal_term_months', label: 'Renewal term (months)', type: 'number' },
      { key: 'auto_renewal', label: 'Automatic renewal', type: 'checkbox' },
      { key: 'break_option_date', label: 'Break option date', type: 'date' },
      { key: 'renewal_terms', label: 'Renewal terms', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Financial terms',
    fields: [
      { key: 'rent_amount', label: 'Base rent', type: 'number', financial: true },
      { key: 'rent_frequency', label: 'Rent frequency', type: 'select', options: opt('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'), financial: true },
      { key: 'currency', label: 'Currency (3-letter)', type: 'text', financial: true },
      { key: 'security_deposit', label: 'Security deposit', type: 'number', financial: true },
      { key: 'deposit_holder', label: 'Deposit holder', type: 'text', financial: true },
      { key: 'rent_free_period_days', label: 'Rent-free period (days)', type: 'number', financial: true },
      { key: 'rent_escalation_type', label: 'Rent escalation type', type: 'select', options: opt('NONE', 'FIXED_PERCENT', 'FIXED_AMOUNT', 'CPI', 'MARKET_REVIEW', 'OTHER'), financial: true },
      { key: 'rent_escalation_rate', label: 'Rent escalation rate (%)', type: 'number', financial: true },
      { key: 'rent_escalation_frequency_months', label: 'Escalation frequency (months)', type: 'number', financial: true },
      { key: 'next_rent_review_date', label: 'Next rent review date', type: 'date' },
      { key: 'due_day_rule', label: 'Payment due day (1-31)', type: 'number' },
    ],
  },
  {
    title: 'Legal & operational terms',
    fields: [
      { key: 'permitted_use', label: 'Permitted use', type: 'text' },
      { key: 'subletting_permitted', label: 'Subletting permitted', type: 'tristate' },
      { key: 'assignment_permitted', label: 'Assignment permitted', type: 'tristate' },
      { key: 'early_termination_permitted', label: 'Early termination permitted', type: 'tristate' },
      { key: 'legal_restrictions', label: 'Legal / contractual restrictions', type: 'textarea', wide: true },
      { key: 'notes', label: 'Internal notes', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Maximum permissible lease term',
    fields: [
      { key: 'max_permissible_end_date', label: 'Maximum permissible end date', type: 'date' },
      { key: 'max_term_source', label: 'Source (clause or regulation)', type: 'text', wide: true },
    ],
  },
];
const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

function toFormValue(field: FieldDef, raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (field.type === 'date') return String(raw).slice(0, 10);
  if (field.type === 'tristate' || field.type === 'checkbox') return raw === true ? 'true' : raw === false ? 'false' : '';
  return String(raw);
}

/** Create: only what was filled in. Edit: only what changed (a cleared value becomes null). */
function buildAgreementPayload(values: Record<string, string>, original: PropertyAgreement | null): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of ALL_FIELDS) {
    const current = (values[field.key] ?? '').trim();
    const before = original ? toFormValue(field, (original as unknown as Record<string, unknown>)[field.key]) : '';
    if (original && current === before) continue;
    if (current === '') {
      if (original && before !== '') payload[field.key] = null;
      continue;
    }
    if (field.type === 'number') payload[field.key] = Number(current);
    else if (field.type === 'tristate' || field.type === 'checkbox') payload[field.key] = current === 'true';
    else if (field.key === 'currency') payload[field.key] = current.toUpperCase();
    else payload[field.key] = current;
  }
  return payload;
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const label = (
    <label className="font-medium text-foreground">
      {field.label}
      {field.required ? ' *' : ''}
    </label>
  );
  if (field.type === 'select' || field.type === 'tristate') {
    const options = field.type === 'tristate' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : (field.options ?? []);
    return (
      <div className="space-y-1">
        {label}
        <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{field.type === 'tristate' ? 'Not stated' : '—'}</SelectItem>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <div className="space-y-1">
        {label}
        <Select value={value === 'true' ? 'true' : 'false'} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">No</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div className="space-y-1 col-span-full">
        {label}
        <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="text-xs" />
      </div>
    );
  }
  return (
    <div className={`space-y-1 ${field.wide ? 'col-span-full' : ''}`}>
      {label}
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        min={field.type === 'number' ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

export function AgreementFormDialog({
  open, onOpenChange, propertyId, agreement, financialsRestricted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** null = create a new agreement */
  agreement: PropertyAgreement | null;
  financialsRestricted: boolean;
}) {
  const invalidate = useInvalidateProperty(propertyId);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of ALL_FIELDS) initial[field.key] = toFormValue(field, agreement ? (agreement as unknown as Record<string, unknown>)[field.key] : null);
    if (!agreement) initial.agreement_type = 'LEASE';
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildAgreementPayload(values, agreement);
      if (agreement) {
        if (Object.keys(payload).length === 0) throw new Error('Nothing was changed');
        return realEstateService.updateAgreement(agreement.id, payload);
      }
      return realEstateService.createAgreement(propertyId, payload);
    },
    onSuccess: () => {
      toast.success(agreement ? 'Agreement updated' : 'Agreement added');
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      const message = apiErrorMessage(err);
      setError(message);
      toast.error(message);
    },
  });

  const missingRequired = !agreement && !(values.start_date && values.end_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agreement ? 'Edit agreement' : 'Add agreement'}</DialogTitle>
          <DialogDescription className="text-xs">
            {agreement
              ? 'Corrections are saved with the previous version kept. The signed original end date is preserved. For a formal change to the terms, record an amendment instead.'
              : 'Record a lease, sublease, lease-to-own or other agreement. Leave a field empty when the contract does not state it.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          {GROUPS.map((group) => {
            const fields = group.fields.filter((f) => !(f.financial && financialsRestricted));
            if (fields.length === 0) return null;
            return (
              <div key={group.title} className="space-y-2">
                <h4 className="font-bold text-foreground border-b border-border pb-1">{group.title}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))} />
                  ))}
                </div>
              </div>
            );
          })}
          {agreement && (
            <div className="space-y-1">
              <label className="font-medium text-foreground">Change summary (kept in the version history)</label>
              <Input value={values.change_summary ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, change_summary: e.target.value }))} className="h-8 text-xs" />
            </div>
          )}
          {error && <p className="text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            disabled={mutation.isPending || missingRequired}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? 'Saving…' : agreement ? 'Save changes' : 'Add agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Amendment
// ---------------------------------------------------------------------------------------------------------------------
const AMENDABLE: FieldDef[] = [
  { key: 'end_date', label: 'New end date', type: 'date' },
  { key: 'rent_amount', label: 'New base rent', type: 'number', financial: true },
  { key: 'rent_frequency', label: 'New rent frequency', type: 'select', options: opt('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'), financial: true },
  { key: 'currency', label: 'New currency', type: 'text', financial: true },
  { key: 'security_deposit', label: 'New security deposit', type: 'number', financial: true },
  { key: 'notice_deadline', label: 'New renewal notice deadline', type: 'date' },
  { key: 'next_rent_review_date', label: 'New next rent review date', type: 'date' },
  { key: 'notice_period_days', label: 'New notice period (days)', type: 'number' },
  { key: 'break_option_date', label: 'New break option date', type: 'date' },
  { key: 'permitted_use', label: 'New permitted use', type: 'text' },
];

export function AmendmentDialog({
  open, onOpenChange, propertyId, agreement, financialsRestricted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  agreement: PropertyAgreement;
  financialsRestricted: boolean;
}) {
  const invalidate = useInvalidateProperty(propertyId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reference, setReference] = useState('');
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('TERM_CHANGE');
  const [description, setDescription] = useState('');
  const [applyNow, setApplyNow] = useState('false');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const newValues: Record<string, unknown> = {};
      for (const field of AMENDABLE) {
        const v = (values[field.key] ?? '').trim();
        if (!v) continue;
        newValues[field.key] = field.type === 'number' ? Number(v) : field.key === 'currency' ? v.toUpperCase() : v;
      }
      return realEstateService.createAmendment(agreement.id, {
        amendment_reference: reference.trim() || undefined,
        amendment_type: type,
        effective_date: effective,
        new_values: newValues,
        description: description.trim() || undefined,
        apply_now: applyNow === 'true',
      });
    },
    onSuccess: () => {
      toast.success(applyNow === 'true' ? 'Amendment applied' : 'Amendment recorded and awaiting approval');
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      const message = apiErrorMessage(err);
      setError(message);
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record an amendment</DialogTitle>
          <DialogDescription className="text-xs">
            Amendments are append-only: the previous values are stored with the amendment and the signed original end date ({fmtDate(agreement.original_end_date || agreement.end_date)}) is preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-foreground">Amendment reference</label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Amendment No. 2" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Effective date *</label>
            <Input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Amendment type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['EXTENSION', 'RENT_CHANGE', 'AREA_CHANGE', 'TERM_CHANGE', 'PARTY_CHANGE', 'TERMINATION', 'OTHER'].map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Status</label>
            <Select value={applyNow} onValueChange={setApplyNow}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Record only: awaiting approval</SelectItem>
                <SelectItem value="true">Approved: apply to current terms now</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h4 className="col-span-full font-bold text-foreground border-b border-border pb-1 pt-1">Terms that change</h4>
          {AMENDABLE.filter((f) => !(f.financial && financialsRestricted)).map((f) => (
            <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))} />
          ))}
          <div className="space-y-1 col-span-full">
            <label className="font-medium text-foreground">Description</label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs" />
          </div>
          {error && <p className="col-span-full text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={mutation.isPending || !effective} onClick={() => { setError(null); mutation.mutate(); }}>
            {mutation.isPending ? 'Saving…' : 'Record amendment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Maximum permissible term review
// ---------------------------------------------------------------------------------------------------------------------
export function MaxTermReviewDialog({
  open, onOpenChange, propertyId, agreement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  agreement: PropertyAgreement;
}) {
  const invalidate = useInvalidateProperty(propertyId);
  const [status, setStatus] = useState<MaxTermReviewStatus>(
    agreement.max_term_review_status === 'NOT_REVIEWED' ? 'PENDING_REVIEW' : agreement.max_term_review_status,
  );
  const [maxDate, setMaxDate] = useState((agreement.max_permissible_end_date ?? '').slice(0, 10));
  const [source, setSource] = useState(agreement.max_term_source ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const needsEvidence = status === 'CONFIRMED';

  const mutation = useMutation({
    mutationFn: () =>
      realEstateService.reviewMaxTerm(agreement.id, {
        status,
        max_permissible_end_date: maxDate || null,
        max_term_source: source.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Maximum term review saved');
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      const message = apiErrorMessage(err);
      setError(message);
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review maximum permissible lease term</DialogTitle>
          <DialogDescription className="text-xs">
            Only confirm a maximum that the governing agreement or a verified legal provision states. It is never derived from a purchase date.
            Contract dates are not changed; a breach of a confirmed maximum raises a compliance issue for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Current contractual end date: <strong className="text-foreground">{fmtDate(agreement.end_date)}</strong>
          </p>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Review status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as MaxTermReviewStatus)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['PENDING_REVIEW', 'CONFIRMED', 'DISPUTED', 'NOT_APPLICABLE', 'NOT_REVIEWED'] as MaxTermReviewStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Maximum permissible end date{needsEvidence ? ' *' : ''}</label>
            <Input type="date" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Source: clause or regulation{needsEvidence ? ' *' : ''}</label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Section 4.2 of the Ground Lease" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="font-medium text-foreground">Review notes</label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
          </div>
          {error && <p className="text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={mutation.isPending || (needsEvidence && !(maxDate && source.trim()))} onClick={() => { setError(null); mutation.mutate(); }}>
            {mutation.isPending ? 'Saving…' : 'Save review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Status change + delete
// ---------------------------------------------------------------------------------------------------------------------
export const AGREEMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['EXPIRED', 'TERMINATED', 'RENEWED', 'SUPERSEDED'],
  EXPIRED: ['RENEWED', 'SUPERSEDED', 'ACTIVE'],
  RENEWED: [],
  TERMINATED: [],
  SUPERSEDED: [],
};

export function AgreementStatusDialog({
  open, onOpenChange, propertyId, agreement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  agreement: PropertyAgreement;
}) {
  const invalidate = useInvalidateProperty(propertyId);
  const allowed = AGREEMENT_STATUS_TRANSITIONS[agreement.status] ?? [];
  const [status, setStatus] = useState(allowed[0] ?? '');
  const [termination, setTermination] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      realEstateService.changeAgreementStatus(agreement.id, {
        status,
        actual_termination_date: status === 'TERMINATED' ? termination : null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(`Agreement marked ${humanize(status).toLowerCase()}`);
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      const message = apiErrorMessage(err);
      setError(message);
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change agreement status</DialogTitle>
          <DialogDescription className="text-xs">Currently {humanize(agreement.status).toLowerCase()}. Ending an agreement also ends its recurring charges.</DialogDescription>
        </DialogHeader>
        {allowed.length === 0 ? (
          <p className="text-xs text-muted-foreground">An agreement that is {humanize(agreement.status).toLowerCase()} cannot change status.</p>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">New status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{allowed.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {status === 'TERMINATED' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">Actual termination date</label>
                <Input type="date" value={termination} onChange={(e) => setTermination(e.target.value)} className="h-8 text-xs" />
              </div>
            )}
            <div className="space-y-1">
              <label className="font-medium text-foreground">Notes</label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
            </div>
            {error && <p className="text-rose-600">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={mutation.isPending || allowed.length === 0} onClick={() => { setError(null); mutation.mutate(); }}>
            {mutation.isPending ? 'Saving…' : 'Change status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAgreementDialog({
  open, onOpenChange, propertyId, agreement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  agreement: PropertyAgreement;
}) {
  const invalidate = useInvalidateProperty(propertyId);
  const mutation = useMutation({
    mutationFn: () => realEstateService.deleteAgreement(agreement.id),
    onSuccess: () => {
      toast.success('Agreement removed');
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this agreement?</AlertDialogTitle>
          <AlertDialogDescription>
            {agreement.agreement_number || agreement.lease_code} will be hidden from the register along with its recurring charges and open compliance issues.
            The record and its history are kept in the database and in the property history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()}>Remove agreement</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
