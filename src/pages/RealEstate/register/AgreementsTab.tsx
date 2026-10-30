import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronRight, FilePlus2, FileSignature, Pencil, Plus, Scale, Trash2, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { realEstateService } from '@/services/realEstateService';
import {
  AgreementFormDialog, AgreementStatusDialog, AmendmentDialog, DeleteAgreementDialog, MaxTermReviewDialog, apiErrorMessage,
} from './AgreementDialogs';
import type {
  AgreementAmendment, AgreementPartyRecord, PropertyAgreement, PropertyRegister, RecurringObligation,
} from '@/types/realEstate';
import {
  EMPTY, EmptyState, Field, FieldGrid, RestrictedNotice, SimpleTable, StatusBadge, fmtTriState, fmtDate,
  fmtDateTime, fmtMoney, fmtNumber, humanize,
} from './registerUi';
import type { TableColumn } from './registerUi';

function describeChange(previous: Record<string, unknown>, next: Record<string, unknown>): string {
  const keys = Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]));
  if (keys.length === 0) return EMPTY;
  return keys
    .map((key) => `${humanize(key)}: ${previous[key] ?? EMPTY} → ${next[key] ?? EMPTY}`)
    .join('; ');
}

const PARTY_COLUMNS: TableColumn<AgreementPartyRecord>[] = [
  { header: 'Party', cell: (p) => <span className="font-semibold text-foreground">{p.name}</span> },
  { header: 'Role', cell: (p) => humanize(p.role) },
  { header: 'Primary', cell: (p) => (p.is_primary ? 'Yes' : 'No') },
  { header: 'Signed', cell: (p) => fmtDate(p.signed_date) },
];

function amendmentColumns(canManage: boolean, onApprove: (amendmentId: string) => void, approving: boolean): TableColumn<AgreementAmendment>[] {
  const columns: TableColumn<AgreementAmendment>[] = [
    { header: 'Reference', cell: (a) => a.amendment_reference || EMPTY },
    { header: 'Type', cell: (a) => humanize(a.amendment_type) },
    { header: 'Effective', cell: (a) => fmtDate(a.effective_date) },
    { header: 'Change', cell: (a) => a.description || describeChange(a.previous_values, a.new_values), className: 'min-w-56' },
    { header: 'Status', cell: (a) => <StatusBadge value={a.approved_at ? 'CONFIRMED' : 'PENDING_REVIEW'} /> },
    { header: 'Approved by', cell: (a) => a.approved_by_name || EMPTY },
    { header: 'Recorded', cell: (a) => fmtDateTime(a.created_at) },
  ];
  if (canManage) {
    columns.push({
      header: 'Actions',
      cell: (a) =>
        a.approved_at ? null : (
          <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={approving} onClick={() => onApprove(a.id)}>
            Approve & apply
          </Button>
        ),
    });
  }
  return columns;
}

const CHARGE_COLUMNS: TableColumn<RecurringObligation>[] = [
  { header: 'Category', cell: (r) => humanize(r.category) },
  { header: 'Description', cell: (r) => r.description || EMPTY },
  { header: 'Amount', cell: (r) => fmtMoney(r.amount, r.currency) },
  { header: 'Frequency', cell: (r) => humanize(r.frequency) },
  { header: 'Status', cell: (r) => <StatusBadge value={r.status} /> },
];

function MaxTermAlert({ agreement }: { agreement: PropertyAgreement }) {
  const max = agreement.max_permissible_end_date;
  if (!max || agreement.max_term_review_status === 'NOT_APPLICABLE' || agreement.end_date <= max) return null;
  const confirmed = agreement.max_term_review_status === 'CONFIRMED';
  const Icon = confirmed ? AlertOctagon : AlertTriangle;
  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
        confirmed ? 'border-rose-500/40 bg-rose-500/10' : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${confirmed ? 'text-rose-600' : 'text-amber-600'}`} />
      <div>
        <p className="font-semibold text-foreground">
          {confirmed ? 'Contract end date exceeds the confirmed maximum permissible date' : 'Contract end date exceeds the recorded maximum permissible date'}
        </p>
        <p className="text-muted-foreground mt-0.5">
          Ends {fmtDate(agreement.end_date)}; maximum is {fmtDate(max)}
          {agreement.max_term_review_status !== 'CONFIRMED' ? ` (${humanize(agreement.max_term_review_status).toLowerCase()})` : ''}.
          This needs review. Contract dates are shown as signed and have not been changed.
        </p>
      </div>
    </div>
  );
}

function AgreementCard({
  agreement,
  parent,
  charges,
  restricted,
  defaultOpen,
  propertyId,
  canManage,
}: {
  agreement: PropertyAgreement;
  parent: PropertyAgreement | undefined;
  charges: RecurringObligation[];
  restricted: boolean;
  defaultOpen: boolean;
  propertyId: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [dialog, setDialog] = useState<'edit' | 'amend' | 'review' | 'status' | 'delete' | null>(null);
  const queryClient = useQueryClient();
  const approve = useMutation({
    mutationFn: (amendmentId: string) => realEstateService.approveAmendment(amendmentId),
    onSuccess: () => {
      toast.success('Amendment approved and applied');
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const ref = agreement.agreement_number || agreement.lease_code || agreement.id.slice(0, 8);
  const money = (amount?: number | null, currency?: string | null) => (restricted ? EMPTY : fmtMoney(amount, currency));
  const escalation = restricted
    ? EMPTY
    : agreement.rent_escalation_rate != null
      ? `${agreement.rent_escalation_rate}%`
      : EMPTY;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">{ref}</span>
            <Badge variant="outline" className="text-[10px]">{humanize(agreement.agreement_type)}</Badge>
            <StatusBadge value={agreement.status} />
            {agreement.our_role && <Badge variant="secondary" className="text-[10px]">We are: {humanize(agreement.our_role)}</Badge>}
            {agreement.max_permissible_end_date && agreement.end_date > agreement.max_permissible_end_date &&
              agreement.max_term_review_status !== 'NOT_APPLICABLE' && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">Exceeds max term</Badge>
              )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {fmtDate(agreement.start_date)} → {fmtDate(agreement.end_date)}
            {agreement.counterparty_name ? ` • ${agreement.counterparty_name}` : ''}
          </p>
        </div>
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-4 border-t border-border">
          <div className="pt-4 space-y-4">
            {canManage && (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDialog('edit')}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDialog('amend')}>
                  <FilePlus2 className="w-3 h-3" /> Record amendment
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDialog('review')}>
                  <Scale className="w-3 h-3" /> Review maximum term
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDialog('status')}>
                  <Workflow className="w-3 h-3" /> Change status
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-rose-600" onClick={() => setDialog('delete')}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              </div>
            )}
            <MaxTermAlert agreement={agreement} />

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Agreement identification</h5>
              <FieldGrid>
                <Field label="Agreement number" value={agreement.agreement_number} mono />
                <Field label="Internal code" value={agreement.lease_code} mono />
                <Field label="Agreement type" value={humanize(agreement.agreement_type)} />
                <Field label="Status"><StatusBadge value={agreement.status} /></Field>
                <Field label="Our role" value={humanize(agreement.our_role)} />
                <Field label="Counterparty" value={agreement.counterparty_name} />
                <Field
                  label="Parent agreement"
                  value={parent ? `${parent.agreement_number || parent.lease_code || parent.id.slice(0, 8)} (${humanize(agreement.parent_relationship)})` : null}
                />
                <Field label="Signed agreement document" value={agreement.signed_document_title} />
              </FieldGrid>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Contract dates</h5>
              <FieldGrid>
                <Field label="Contract signing date" value={fmtDate(agreement.signing_date)} />
                <Field label="Effective date" value={fmtDate(agreement.effective_date)} />
                <Field label="Lease commencement date" value={fmtDate(agreement.start_date)} />
                <Field label="Original contractual end date" value={fmtDate(agreement.original_end_date)} />
                <Field label="Current contractual end date" value={fmtDate(agreement.end_date)} />
                <Field label="Proposed end date">
                  {agreement.proposed_end_date ? (
                    <>
                      {fmtDate(agreement.proposed_end_date)}
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        Not yet contractual{agreement.proposed_end_date_source ? `: ${agreement.proposed_end_date_source}` : ''}
                      </span>
                    </>
                  ) : (
                    EMPTY
                  )}
                </Field>
                <Field label="Actual termination date" value={fmtDate(agreement.actual_termination_date)} />
                <Field label="Termination notice date" value={fmtDate(agreement.termination_notice_date)} />
                <Field label="Notice period" value={fmtNumber(agreement.notice_period_days, 'days')} />
              </FieldGrid>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Renewal</h5>
              <FieldGrid>
                <Field label="Renewal option" value={fmtTriState(agreement.renewal_option)} />
                <Field label="Renewal notice deadline" value={fmtDate(agreement.notice_deadline)} />
                <Field label="Renewal term" value={fmtNumber(agreement.renewal_term_months, 'months')} />
                <Field label="Automatic renewal" value={agreement.auto_renewal ? 'Yes' : 'No'} />
                <Field label="Break option date" value={fmtDate(agreement.break_option_date)} />
                <Field label="Renewal terms" value={agreement.renewal_terms} wide />
              </FieldGrid>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Financial terms</h5>
              {restricted && <div className="mb-2"><RestrictedNotice what="Rent and deposit terms" /></div>}
              <FieldGrid>
                <Field label="Base rent" value={money(agreement.rent_amount, agreement.currency)} />
                <Field label="Rent frequency" value={humanize(agreement.rent_frequency)} />
                <Field label="Currency" value={agreement.currency} />
                <Field label="Security deposit" value={money(agreement.security_deposit, agreement.currency)} />
                <Field label="Deposit holder" value={restricted ? null : agreement.deposit_holder} />
                <Field label="Rent-free period" value={restricted ? null : fmtNumber(agreement.rent_free_period_days, 'days')} />
                <Field label="Rent escalation type" value={restricted ? null : humanize(agreement.rent_escalation_type)} />
                <Field label="Rent escalation rate" value={escalation} />
                <Field
                  label="Escalation frequency"
                  value={restricted ? null : fmtNumber(agreement.rent_escalation_frequency_months, 'months')}
                />
                <Field label="Next rent review date" value={fmtDate(agreement.next_rent_review_date)} />
                <Field label="Payment due day" value={agreement.due_day_rule ? `Day ${agreement.due_day_rule}` : null} />
              </FieldGrid>
              {!restricted && charges.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] text-muted-foreground block mb-1">Additional contractual charges</span>
                  <SimpleTable columns={CHARGE_COLUMNS} rows={charges} getKey={(c) => c.id} empty={null} />
                </div>
              )}
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Legal & operational terms</h5>
              <FieldGrid>
                <Field label="Permitted use" value={agreement.permitted_use} />
                <Field label="Subletting permitted" value={fmtTriState(agreement.subletting_permitted)} />
                <Field label="Assignment permitted" value={fmtTriState(agreement.assignment_permitted)} />
                <Field label="Early termination permitted" value={fmtTriState(agreement.early_termination_permitted)} />
                <Field label="Legal / contractual restrictions" value={agreement.legal_restrictions} wide />
                <Field label="Internal notes" value={agreement.notes} wide />
              </FieldGrid>
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Maximum permissible lease term</h5>
              <FieldGrid>
                <Field label="Maximum permissible end date" value={fmtDate(agreement.max_permissible_end_date)} />
                <Field label="Review status"><StatusBadge value={agreement.max_term_review_status} /></Field>
                <Field label="Reviewed at" value={fmtDateTime(agreement.max_term_reviewed_at)} />
                <Field label="Source (clause or regulation)" value={agreement.max_term_source} wide />
              </FieldGrid>
              {!agreement.max_permissible_end_date && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  No maximum term recorded. One is only entered when the governing agreement or a verified legal provision states it; it is never inferred from a purchase date.
                </p>
              )}
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Parties ({agreement.parties.length})</h5>
              <SimpleTable
                columns={PARTY_COLUMNS}
                rows={agreement.parties}
                getKey={(p) => `${p.party_id}-${p.role}`}
                empty="No parties recorded for this agreement."
              />
            </div>

            <div>
              <h5 className="font-semibold text-xs text-foreground mb-2">Amendment history ({agreement.amendments.length})</h5>
              <SimpleTable
                columns={amendmentColumns(canManage, (id) => approve.mutate(id), approve.isPending)}
                rows={agreement.amendments}
                getKey={(a) => a.id}
                empty="No amendments. Original signed terms are preserved; any change is recorded as a new amendment."
              />
            </div>
          </div>
        </div>
      )}

      {dialog === 'edit' && (
        <AgreementFormDialog open onOpenChange={(o) => !o && setDialog(null)} propertyId={propertyId} agreement={agreement} financialsRestricted={restricted} />
      )}
      {dialog === 'amend' && (
        <AmendmentDialog open onOpenChange={(o) => !o && setDialog(null)} propertyId={propertyId} agreement={agreement} financialsRestricted={restricted} />
      )}
      {dialog === 'review' && (
        <MaxTermReviewDialog open onOpenChange={(o) => !o && setDialog(null)} propertyId={propertyId} agreement={agreement} />
      )}
      {dialog === 'status' && (
        <AgreementStatusDialog open onOpenChange={(o) => !o && setDialog(null)} propertyId={propertyId} agreement={agreement} />
      )}
      {dialog === 'delete' && (
        <DeleteAgreementDialog open onOpenChange={(o) => !o && setDialog(null)} propertyId={propertyId} agreement={agreement} />
      )}
    </Card>
  );
}

export default function AgreementsTab({
  register,
  propertyId,
  canManage,
}: {
  register: PropertyRegister | undefined;
  propertyId: string;
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  if (!register) return <EmptyState>Loading agreements…</EmptyState>;

  const { agreements } = register;
  const byId = new Map(agreements.map((a) => [a.id, a]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-primary" />
          Leases & agreements ({agreements.length})
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Active agreements first; historical agreements are kept.</span>
          {canManage && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
              <Plus className="w-3 h-3" /> Add agreement
            </Button>
          )}
        </div>
      </div>
      {adding && (
        <AgreementFormDialog open onOpenChange={(o) => !o && setAdding(false)} propertyId={propertyId} agreement={null} financialsRestricted={register.financials_restricted} />
      )}

      {agreements.length === 0 ? (
        <EmptyState>
          No lease or agreement records for this property. Upload a lease document from the Docs tab to extract one.
        </EmptyState>
      ) : (
        [...agreements]
          .sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') || b.start_date.localeCompare(a.start_date))
          .map((agreement, index) => (
            <AgreementCard
              key={agreement.id}
              agreement={agreement}
              parent={agreement.parent_agreement_id ? byId.get(agreement.parent_agreement_id) : undefined}
              charges={register.recurring_obligations.filter((r) => r.agreement_id === agreement.id && r.category !== 'RENT')}
              restricted={register.financials_restricted}
              defaultOpen={index === 0}
              propertyId={propertyId}
              canManage={canManage}
            />
          ))
      )}
    </div>
  );
}
