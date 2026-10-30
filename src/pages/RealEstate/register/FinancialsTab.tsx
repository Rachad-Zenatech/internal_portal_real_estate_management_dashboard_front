import { CalendarClock, Landmark, ReceiptText, Repeat } from 'lucide-react';
import type {
  Property, PropertyObligation, PropertyRegister, RecurringObligation, RegisterPayment,
} from '@/types/realEstate';
import {
  EMPTY, EmptyState, Field, FieldGrid, RestrictedNotice, Section, SimpleTable, StatusBadge, fmtDate, fmtDateTime,
  fmtMoney, humanize,
} from './registerUi';
import type { TableColumn } from './registerUi';
import { RegisterAddButton, RegisterRowActions } from './RegisterRowActions';
import { useRegisterEntityEditor } from './useRegisterEntityEditor';

/** Obligation status is computed from payments, exactly as the accounting endpoints do. */
function obligationStatus(o: PropertyObligation, asOf: string): string {
  if (o.status === 'CANCELLED') return 'CANCELLED';
  const outstanding = o.outstanding_balance ?? o.amount_due;
  if (outstanding <= 0) return 'PAID';
  if ((o.payments_recorded ?? 0) > 0) return 'PARTIALLY_PAID';
  if (o.due_date < asOf) return 'OVERDUE';
  if (o.due_date === asOf) return 'DUE';
  return 'UPCOMING';
}

const RECURRING_COLUMNS: TableColumn<RecurringObligation>[] = [
  { header: 'Category', cell: (r) => humanize(r.category) },
  { header: 'Direction', cell: (r) => (r.direction === 'INCOME' ? 'Income' : 'Expense') },
  { header: 'Description', cell: (r) => r.description || EMPTY, className: 'min-w-40' },
  { header: 'Amount', cell: (r) => <span className="font-semibold text-foreground">{fmtMoney(r.amount, r.currency)}</span> },
  { header: 'Frequency', cell: (r) => humanize(r.frequency) },
  { header: 'Start', cell: (r) => fmtDate(r.start_date) },
  { header: 'End', cell: (r) => fmtDate(r.end_date) },
  { header: 'Next due', cell: (r) => fmtDate(r.next_due_date) },
  { header: 'Payer', cell: (r) => r.payer_name || EMPTY },
  { header: 'Recipient', cell: (r) => r.recipient_name || EMPTY },
  { header: 'Cost center', cell: (r) => r.cost_center || EMPTY },
  { header: 'GL ref.', cell: (r) => <span className="font-mono">{r.gl_reference || EMPTY}</span> },
  { header: 'Status', cell: (r) => <StatusBadge value={r.status} /> },
];

function obligationColumns(asOf: string): TableColumn<PropertyObligation>[] {
  return [
    { header: 'Type', cell: (o) => humanize(o.obligation_type) },
    { header: 'Period', cell: (o) => `${fmtDate(o.period_start)} → ${fmtDate(o.period_end)}` },
    { header: 'Due', cell: (o) => fmtDate(o.due_date) },
    { header: 'Amount due', cell: (o) => fmtMoney(o.amount_due, o.currency) },
    { header: 'Paid', cell: (o) => fmtMoney(o.payments_recorded ?? 0, o.currency) },
    { header: 'Outstanding', cell: (o) => fmtMoney(o.outstanding_balance ?? o.amount_due, o.currency) },
    { header: 'Recipient', cell: (o) => o.recipient_entity || EMPTY },
    { header: 'Status', cell: (o) => <StatusBadge value={obligationStatus(o, asOf)} /> },
  ];
}

const TRANSACTION_COLUMNS: TableColumn<RegisterPayment>[] = [
  { header: 'Date', cell: (p) => fmtDate(p.payment_date) },
  { header: 'Type', cell: (p) => humanize(p.transaction_type) },
  { header: 'For', cell: (p) => humanize(p.obligation_type) },
  { header: 'Amount', cell: (p) => fmtMoney(p.amount_paid, p.currency) },
  { header: 'Due date', cell: (p) => fmtDate(p.due_date) },
  { header: 'Method', cell: (p) => p.payment_method || EMPTY },
  { header: 'Invoice / receipt', cell: (p) => <span className="font-mono">{p.invoice_reference || p.transaction_reference || EMPTY}</span> },
  { header: 'Paid at', cell: (p) => fmtDateTime(p.paid_at) },
  { header: 'Status', cell: (p) => <StatusBadge value={p.is_reversed ? 'REVERSED' : p.payment_status} /> },
  { header: 'Verified', cell: (p) => <StatusBadge value={p.verification_status} /> },
];

export default function FinancialsTab({
  property,
  register,
  propertyId,
  canManage,
}: {
  property: Property;
  register: PropertyRegister | undefined;
  propertyId: string;
  canManage: boolean;
}) {
  const editor = useRegisterEntityEditor(propertyId, register?.financials_restricted ?? true);
  if (!register) return <EmptyState>Loading financial records…</EmptyState>;

  const restricted = register.financials_restricted;
  // Recurring obligations are financial records: without accounting access they cannot be added or edited.
  const canEditSchedules = canManage && !restricted;
  const recurringColumns: TableColumn<RecurringObligation>[] = canEditSchedules
    ? [...RECURRING_COLUMNS, {
        header: 'Actions',
        cell: (r) => (
          <RegisterRowActions
            label="recurring obligation"
            onEdit={() => editor.openEdit('recurring-obligations', r)}
            onDelete={() => editor.requestDelete('recurring-obligations', r)}
          />
        ),
      }]
    : RECURRING_COLUMNS;
  const obligations = property.obligations ?? [];
  const money = (amount?: number | null, currency?: string | null) => (restricted ? EMPTY : fmtMoney(amount, currency));

  return (
    <div className="space-y-4">
      {restricted && <RestrictedNotice what="Recurring obligations, payments and cost figures" />}

      <Section
        title={`Recurring obligations (${register.recurring_obligations.length})`}
        icon={<Repeat className="w-4 h-4 text-primary" />}
        action={canEditSchedules ? <RegisterAddButton label="Add obligation" onClick={() => editor.openCreate('recurring-obligations')} /> : undefined}
      >
        <p className="text-[11px] text-muted-foreground">
          Standing schedules such as rent, mortgage, tax, insurance, utilities and service charges. Individual amounts falling due are tracked below.
        </p>
        <SimpleTable
          columns={recurringColumns}
          rows={register.recurring_obligations}
          getKey={(r) => r.id}
          empty={restricted ? 'Hidden for your role.' : 'No recurring obligations recorded.'}
        />
      </Section>

      <Section title={`Amounts due (${obligations.length})`} icon={<CalendarClock className="w-4 h-4 text-primary" />}>
        <SimpleTable
          columns={obligationColumns(register.as_of)}
          rows={obligations}
          getKey={(o) => o.id}
          empty={restricted ? 'Hidden for your role.' : 'No payment obligations generated yet.'}
        />
      </Section>

      <Section title={`Transactions (${register.payments.length})`} icon={<ReceiptText className="w-4 h-4 text-primary" />}>
        <p className="text-[11px] text-muted-foreground">
          Actual payments, receipts, refunds and adjustments. Several partial payments can settle one obligation. Showing the most recent 100.
        </p>
        <SimpleTable
          columns={TRANSACTION_COLUMNS}
          rows={register.payments}
          getKey={(p) => p.id}
          empty={restricted ? 'Hidden for your role.' : 'No transactions recorded.'}
        />
      </Section>

      <Section title="Cost summary & tax (from property record)" icon={<Landmark className="w-4 h-4 text-primary" />}>
        <FieldGrid>
          <Field label="Monthly rent" value={money(property.monthly_rent, property.currency)} />
          <Field label="Monthly CAM" value={money(property.monthly_cam, property.currency)} />
          <Field label="Annual property tax" value={money(property.annual_property_tax, property.currency)} />
          <Field label="Monthly utilities / other" value={money(property.monthly_utilities_other, property.currency)} />
          <Field label="Tax responsibility" value={humanize(property.tax_responsibility)} />
          <Field label="Tax amount" value={money(property.tax_amount, property.tax_currency)} />
          <Field label="Tax frequency" value={humanize(property.tax_frequency)} />
          <Field label="Tax due date" value={fmtDate(property.tax_due_date)} />
          <Field label="Tax notes" value={property.tax_notes} wide />
        </FieldGrid>
        <p className="text-[11px] text-muted-foreground">
          The purchase price is a historical acquisition cost, not the current market value. Valuations, mortgage balances and depreciation are not tracked yet.
        </p>
      </Section>
      {editor.dialogs}
    </div>
  );
}
