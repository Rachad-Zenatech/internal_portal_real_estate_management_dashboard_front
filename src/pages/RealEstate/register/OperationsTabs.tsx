import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Box, ClipboardCheck, Droplets, ShieldAlert, ShieldCheck, Umbrella, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { realEstateService } from '@/services/realEstateService';
import type {
  ComplianceIssue, PropertyAsset, PropertyComplianceItem, PropertyInsurancePolicy, PropertyRegister,
  PropertyUtility, PropertyWorkOrder, RegisterEntityKey,
} from '@/types/realEstate';
import {
  EMPTY, EmptyState, RestrictedNotice, Section, SimpleTable, StatusBadge, fmtDate, fmtDateTime, fmtMoney, humanize,
} from './registerUi';
import type { TableColumn } from './registerUi';
import { RegisterAddButton, RegisterRowActions } from './RegisterRowActions';
import { useRegisterEntityEditor } from './useRegisterEntityEditor';

type Editor = ReturnType<typeof useRegisterEntityEditor>;

/** Appends the edit/delete column for managers. */
function withActions<T extends object>(columns: TableColumn<T>[], canManage: boolean, editor: Editor, entity: RegisterEntityKey, label: string): TableColumn<T>[] {
  if (!canManage) return columns;
  return [...columns, {
    header: 'Actions',
    cell: (row: T) => <RegisterRowActions label={label} onEdit={() => editor.openEdit(entity, row)} onDelete={() => editor.requestDelete(entity, row)} />,
  }];
}

const ASSET_COLUMNS: TableColumn<PropertyAsset>[] = [
  { header: 'Code', cell: (a) => <span className="font-mono">{a.asset_code || EMPTY}</span> },
  { header: 'Asset', cell: (a) => <span className="font-semibold text-foreground">{a.name}</span> },
  { header: 'Category', cell: (a) => a.category || EMPTY },
  { header: 'Manufacturer', cell: (a) => a.manufacturer || EMPTY },
  { header: 'Model', cell: (a) => a.model || EMPTY },
  { header: 'Serial no.', cell: (a) => <span className="font-mono">{a.serial_number || EMPTY}</span> },
  { header: 'Installed', cell: (a) => fmtDate(a.installation_date) },
  { header: 'Warranty expires', cell: (a) => fmtDate(a.warranty_expiry_date) },
  { header: 'Replace by', cell: (a) => fmtDate(a.expected_replacement_date) },
  { header: 'Status', cell: (a) => <StatusBadge value={a.status} /> },
];

function workOrderColumns(restricted: boolean): TableColumn<PropertyWorkOrder>[] {
  const cost = (amount?: number | null, currency?: string | null) => (restricted ? EMPTY : fmtMoney(amount, currency));
  return [
    { header: 'Work order', cell: (w) => <span className="font-mono">{w.work_order_number}</span> },
    { header: 'Type', cell: (w) => humanize(w.maintenance_type) },
    { header: 'Priority', cell: (w) => <StatusBadge value={w.priority} /> },
    { header: 'Issue', cell: (w) => w.issue_description, className: 'min-w-52' },
    { header: 'Asset', cell: (w) => w.asset_name || EMPTY },
    { header: 'Reported', cell: (w) => fmtDate(w.reported_date) },
    { header: 'Scheduled', cell: (w) => fmtDate(w.scheduled_date) },
    { header: 'Completed', cell: (w) => fmtDate(w.completed_date) },
    { header: 'Assigned to', cell: (w) => w.assigned_party_name || EMPTY },
    { header: 'Est. cost', cell: (w) => cost(w.estimated_cost, w.currency) },
    { header: 'Actual cost', cell: (w) => cost(w.actual_cost, w.currency) },
    { header: 'Invoice', cell: (w) => (w.invoice_document_id ? 'Attached' : EMPTY) },
    { header: 'Status', cell: (w) => <StatusBadge value={w.status} /> },
  ];
}

const UTILITY_COLUMNS: TableColumn<PropertyUtility>[] = [
  { header: 'Utility', cell: (u) => <span className="font-semibold text-foreground">{humanize(u.utility_type)}</span> },
  { header: 'Provider', cell: (u) => u.provider_name || EMPTY },
  { header: 'Account ref.', cell: (u) => <span className="font-mono">{u.account_reference || EMPTY}</span> },
  { header: 'Responsible party', cell: (u) => u.responsible_name || EMPTY },
  { header: 'Service start', cell: (u) => fmtDate(u.service_start_date) },
  { header: 'Service end', cell: (u) => fmtDate(u.service_end_date) },
  { header: 'Billing', cell: (u) => humanize(u.billing_frequency) },
  { header: 'Status', cell: (u) => <StatusBadge value={u.status} /> },
];

function insuranceColumns(restricted: boolean): TableColumn<PropertyInsurancePolicy>[] {
  return [
    { header: 'Insurer', cell: (i) => i.insurer_name || EMPTY },
    { header: 'Policy no.', cell: (i) => <span className="font-mono">{i.policy_number}</span> },
    { header: 'Coverage', cell: (i) => i.coverage_type || EMPTY },
    { header: 'Coverage limit', cell: (i) => fmtMoney(i.coverage_limit, i.currency) },
    { header: 'Insured value', cell: (i) => fmtMoney(i.insured_value, i.currency) },
    { header: 'Deductible', cell: (i) => fmtMoney(i.deductible, i.currency) },
    { header: 'Premium', cell: (i) => (restricted ? EMPTY : fmtMoney(i.premium, i.currency)) },
    { header: 'Policy start', cell: (i) => fmtDate(i.policy_start_date) },
    { header: 'Policy end', cell: (i) => fmtDate(i.policy_end_date) },
    { header: 'Renewal reminder', cell: (i) => fmtDate(i.renewal_reminder_date) },
    { header: 'Document', cell: (i) => i.policy_document_title || EMPTY },
    { header: 'Status', cell: (i) => <StatusBadge value={i.status} /> },
  ];
}

const COMPLIANCE_COLUMNS: TableColumn<PropertyComplianceItem>[] = [
  { header: 'Requirement', cell: (c) => <span className="font-semibold text-foreground">{c.requirement_name}</span>, className: 'min-w-44' },
  { header: 'Type', cell: (c) => humanize(c.requirement_type) },
  { header: 'Issuing authority', cell: (c) => c.issuing_authority || EMPTY },
  { header: 'Reference', cell: (c) => <span className="font-mono">{c.reference_number || EMPTY}</span> },
  { header: 'Effective', cell: (c) => fmtDate(c.effective_date) },
  { header: 'Expires', cell: (c) => fmtDate(c.expiry_date) },
  { header: 'Next review', cell: (c) => fmtDate(c.next_review_date) },
  { header: 'Responsible', cell: (c) => c.responsible_user_name || c.responsible_name || EMPTY },
  { header: 'Document', cell: (c) => c.supporting_document_title || EMPTY },
  { header: 'Status', cell: (c) => <StatusBadge value={c.compliance_status} /> },
];

type IssueAction = { issue: ComplianceIssue; status: 'RESOLVED' | 'DISMISSED' } | null;

/** Resolve / dismiss need notes: the backend refuses to close an issue without them. */
function IssueNotesDialog({ propertyId, action, onClose }: { propertyId: string; action: NonNullable<IssueAction>; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const mutation = useMutation({
    mutationFn: () => realEstateService.updateComplianceIssue(action.issue.id, { status: action.status, resolution_notes: notes.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
      toast.success(action.status === 'RESOLVED' ? 'Issue resolved' : 'Issue dismissed');
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not update the issue'),
  });
  const verb = action.status === 'RESOLVED' ? 'Resolve' : 'Dismiss';
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{verb} compliance issue</DialogTitle>
          <DialogDescription className="text-xs">{action.issue.message}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-xs">
          <label htmlFor="issue-notes" className="font-medium text-foreground">Resolution notes *</label>
          <Textarea id="issue-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" placeholder="What was decided, and on what basis?" />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!notes.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving...' : verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceAssetsTab({ register, propertyId, canManage }: { register: PropertyRegister | undefined; propertyId: string; canManage: boolean }) {
  const editor = useRegisterEntityEditor(propertyId, register?.financials_restricted ?? true);
  if (!register) return <EmptyState>Loading maintenance and assets…</EmptyState>;
  return (
    <div className="space-y-4">
      <Section
        title={`Work orders (${register.work_orders.length})`}
        icon={<Wrench className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add work order" onClick={() => editor.openCreate('work-orders')} /> : undefined}
      >
        {register.financials_restricted && register.work_orders.length > 0 && <RestrictedNotice what="Maintenance costs" />}
        <SimpleTable
          columns={withActions(workOrderColumns(register.financials_restricted), canManage, editor, 'work-orders', 'work order')}
          rows={register.work_orders}
          getKey={(w) => w.id}
          empty="No maintenance work orders recorded."
        />
      </Section>
      <Section
        title={`Assets (${register.assets.length})`}
        icon={<Box className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add asset" onClick={() => editor.openCreate('assets')} /> : undefined}
      >
        <SimpleTable
          columns={withActions(ASSET_COLUMNS, canManage, editor, 'assets', 'asset')}
          rows={register.assets}
          getKey={(a) => a.id}
          empty="No assets recorded."
        />
      </Section>
      {editor.dialogs}
    </div>
  );
}

export function UtilitiesInsuranceTab({ register, propertyId, canManage }: { register: PropertyRegister | undefined; propertyId: string; canManage: boolean }) {
  const editor = useRegisterEntityEditor(propertyId, register?.financials_restricted ?? true);
  if (!register) return <EmptyState>Loading utilities and insurance…</EmptyState>;
  return (
    <div className="space-y-4">
      <Section
        title={`Utilities (${register.utilities.length})`}
        icon={<Droplets className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add utility" onClick={() => editor.openCreate('utilities')} /> : undefined}
      >
        <SimpleTable
          columns={withActions(UTILITY_COLUMNS, canManage, editor, 'utilities', 'utility')}
          rows={register.utilities}
          getKey={(u) => u.id}
          empty="No utility accounts recorded."
        />
      </Section>
      <Section
        title={`Insurance policies (${register.insurance_policies.length})`}
        icon={<Umbrella className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add policy" onClick={() => editor.openCreate('insurance-policies')} /> : undefined}
      >
        {register.financials_restricted && register.insurance_policies.length > 0 && <RestrictedNotice what="Premiums" />}
        <SimpleTable
          columns={withActions(insuranceColumns(register.financials_restricted), canManage, editor, 'insurance-policies', 'insurance policy')}
          rows={register.insurance_policies}
          getKey={(i) => i.id}
          empty="No insurance policies recorded."
        />
      </Section>
      {editor.dialogs}
    </div>
  );
}

export function ComplianceTab({ register, propertyId, canManage }: { register: PropertyRegister | undefined; propertyId: string; canManage: boolean }) {
  const editor = useRegisterEntityEditor(propertyId, register?.financials_restricted ?? true);
  const queryClient = useQueryClient();
  const [issueAction, setIssueAction] = useState<IssueAction>(null);
  const acknowledge = useMutation({
    mutationFn: (issueId: string) => realEstateService.updateComplianceIssue(issueId, { status: 'ACKNOWLEDGED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
      toast.success('Issue acknowledged');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not update the issue'),
  });
  if (!register) return <EmptyState>Loading compliance records…</EmptyState>;

  const issueColumns: TableColumn<ComplianceIssue>[] = [
    { header: 'Severity', cell: (i) => <StatusBadge value={i.severity} /> },
    { header: 'Issue', cell: (i) => humanize(i.issue_type) },
    { header: 'Details', cell: (i) => i.message, className: 'min-w-64' },
    { header: 'Detected', cell: (i) => fmtDateTime(i.detected_at) },
    { header: 'Status', cell: (i) => <StatusBadge value={i.status} /> },
    ...(canManage ? [{
      header: 'Actions',
      cell: (i: ComplianceIssue) => (
        <div className="flex items-center gap-1 justify-end">
          {i.status === 'OPEN' && (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(i.id)}>
              Acknowledge
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setIssueAction({ issue: i, status: 'RESOLVED' })}>Resolve</Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setIssueAction({ issue: i, status: 'DISMISSED' })}>Dismiss</Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <Section
        title={`Open compliance issues (${register.compliance_issues.length})`}
        icon={<ShieldAlert className="w-4 h-4 text-primary" />}
      >
        <SimpleTable
          columns={issueColumns}
          rows={register.compliance_issues}
          getKey={(i) => i.id}
          empty="No open compliance issues have been raised for review."
        />
      </Section>
      <Section
        title={`Requirements, permits & certificates (${register.compliance_items.length})`}
        icon={<ShieldCheck className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add requirement" onClick={() => editor.openCreate('compliance-items')} /> : undefined}
      >
        <SimpleTable
          columns={withActions(COMPLIANCE_COLUMNS, canManage, editor, 'compliance-items', 'compliance item')}
          rows={register.compliance_items}
          getKey={(c) => c.id}
          empty="No compliance requirements recorded."
        />
      </Section>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <ClipboardCheck className="w-3.5 h-3.5" />
        Warnings for expired or expiring items also appear in the “Attention needed” panel above.
      </p>
      {issueAction && <IssueNotesDialog propertyId={propertyId} action={issueAction} onClose={() => setIssueAction(null)} />}
      {editor.dialogs}
    </div>
  );
}
