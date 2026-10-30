import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Loader2, Plus, ReceiptText, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { realEstateService } from '@/services/realEstateService';
import type { CurrencyAmount, LeasePaymentRow, LeasePaymentTerms } from '@/types/leasePayments';
import { EMPTY, EmptyState, RestrictedNotice, Section, SimpleTable, StatusBadge, fmtDate, fmtMoney, humanize } from './registerUi';
import type { TableColumn } from './registerUi';

const PAYMENT_METHODS = ['Wire', 'ACH', 'SEPA', 'Check', 'Credit Card', 'Direct Debit'];
const WINDOWS = [
  { value: 'all', label: 'All charges' },
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
  { value: '90', label: 'Next 90 days' },
];

const TERM_LABELS: Record<string, string> = {
  start_date: 'Lease start',
  end_date: 'Lease end',
  rent_amount: 'Base rent',
  rent_frequency: 'Rent frequency',
  currency: 'Currency',
  due_day_rule: 'Due day of the month',
  rent_free_period_days: 'Rent-free days',
  rent_escalation_type: 'Rent increase type',
  rent_escalation_rate: 'Rent increase',
  rent_escalation_frequency_months: 'Increase every (months)',
  next_rent_review_date: 'Next rent review',
};

function periodLabel(start: string, end: string): string {
  const s = new Date(`${start.slice(0, 10)}T00:00:00`);
  const e = new Date(`${end.slice(0, 10)}T00:00:00`);
  const lastOfMonth = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
  if (s.getDate() === 1 && e.getFullYear() === s.getFullYear() && e.getMonth() === s.getMonth() && e.getDate() === lastOfMonth) {
    return s.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }
  return `${fmtDate(start)} → ${fmtDate(end)}`;
}

function Amounts({ items }: { items: CurrencyAmount[] }) {
  const shown = items.filter((i) => Number(i.amount) !== 0);
  if (shown.length === 0) return <span className="text-muted-foreground">{EMPTY}</span>;
  return (
    <>
      {shown.map((i) => (
        <div key={i.currency}>{fmtMoney(Number(i.amount), i.currency)}</div>
      ))}
    </>
  );
}

function SummaryCard({ title, tone, children }: { title: string; tone?: 'bad'; children: React.ReactNode }) {
  return (
    <Card className="p-3.5 border-border bg-card">
      <div className="text-[11px] text-muted-foreground">{title}</div>
      <div className={`mt-1 text-base font-bold tabular-nums ${tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{children}</div>
    </Card>
  );
}

function TermsPanel({ terms, canManage, propertyId }: { terms: LeasePaymentTerms; canManage: boolean; propertyId: string }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lease-payment-terms', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['lease-payments', propertyId] });
  };
  const confirm = useMutation({
    mutationFn: () => realEstateService.confirmLeasePaymentTerms(terms.lease_id),
    onSuccess: () => { toast.success('Payment terms confirmed'); refresh(); },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err?.message || 'Could not confirm the terms'),
  });
  const generate = useMutation({
    mutationFn: () => realEstateService.generateLeasePaymentSchedule(terms.lease_id),
    onSuccess: (r) => {
      toast.success(`${r.created} scheduled charge${r.created === 1 ? '' : 's'} created${r.future_charges_rebuilt ? `, ${r.future_charges_rebuilt} future charge(s) rebuilt` : ''}`);
      refresh();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err?.message || 'Could not generate the schedule'),
  });

  const title = terms.agreement_number || humanize(terms.agreement_type);
  const hasMissing = terms.missing.length > 0;
  return (
    <div className="p-3.5 rounded-xl border border-border bg-background space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-xs text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground">{terms.landlord} → {terms.tenant}</span>
        {terms.direction && (
          <Badge variant="outline" className="text-[10px]">{terms.direction === 'EXPENSE' ? 'Company pays' : 'Company receives'}</Badge>
        )}
        {terms.is_confirmed ? (
          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />Terms confirmed{terms.confirmed_by ? ` by ${terms.confirmed_by}` : ''}
          </Badge>
        ) : (
          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Terms not confirmed</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {Object.entries(TERM_LABELS).map(([key, label]) => {
          const value = terms.terms[key];
          const evidence = terms.evidence[key];
          return (
            <div key={key}>
              <span className="text-muted-foreground block text-[11px]">{label}</span>
              <span className="font-medium text-foreground">
                {value === null || value === undefined || value === '' ? EMPTY : key.includes('frequency') && typeof value === 'string' ? humanize(value) : String(value)}
              </span>
              {evidence?.supporting_text && (
                <span
                  className="block text-[10px] text-muted-foreground cursor-help truncate"
                  title={`“${evidence.supporting_text}”`}
                >
                  <FileText className="inline w-3 h-3 mr-0.5" />
                  {evidence.document_title || 'Source document'}{evidence.source_page ? `, p. ${evidence.source_page}` : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {terms.additional_charges.length > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground text-[11px]">Additional charges</span>
          <ul className="list-disc pl-4">
            {terms.additional_charges.map((c) => (
              <li key={c.id}>{c.description || humanize(c.category)} • {fmtMoney(c.amount, c.currency)} / {humanize(c.frequency).toLowerCase()}</li>
            ))}
          </ul>
        </div>
      )}

      {hasMissing && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/30 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
          <div>
            <div className="font-semibold text-foreground">The schedule cannot be built: these terms are not stated</div>
            <ul className="list-disc pl-4 text-muted-foreground">{terms.missing.map((m) => <li key={m.field}>{m.label}</li>)}</ul>
            <div className="text-muted-foreground mt-1">Add them to the agreement (Leases &amp; Agreements tab); nothing is assumed.</div>
          </div>
        </div>
      )}

      {terms.gaps.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/30 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <div className="font-semibold text-foreground">{terms.gaps.length} period(s) are not scheduled</div>
            <ul className="list-disc pl-4 text-muted-foreground">
              {terms.gaps.slice(0, 6).map((g, i) => <li key={i}>{g.charge} {periodLabel(g.period_start, g.period_end)}: {g.reason}</li>)}
              {terms.gaps.length > 6 && <li>and {terms.gaps.length - 6} more</li>}
            </ul>
          </div>
        </div>
      )}

      {terms.rent_free_periods.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Rent-free, no charge scheduled: {terms.rent_free_periods.map((p) => periodLabel(p.period_start, p.period_end)).join(', ')}.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <span className="text-[11px] text-muted-foreground mr-auto">
          {terms.generated_charges} charge(s) scheduled{!hasMissing ? ` • the schedule would hold ${terms.scheduled_periods}` : ''}
        </span>
        {canManage && !terms.is_confirmed && (
          <Button size="sm" className="h-8 text-xs" disabled={hasMissing || confirm.isPending} onClick={() => confirm.mutate()}>
            {confirm.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Confirm payment terms
          </Button>
        )}
        {canManage && terms.is_confirmed && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={hasMissing || generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Repeat className="w-3.5 h-3.5" />}
            {terms.generated_charges ? 'Rebuild future charges' : 'Generate payment schedule'}
          </Button>
        )}
      </div>
    </div>
  );
}

function ChargeSheet({ chargeId, onClose, onRecord }: { chargeId: string | null; onClose: () => void; onRecord: (id: string) => void; canRecord?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['lease-payment-charge', chargeId],
    queryFn: () => realEstateService.getScheduledChargeDetail(chargeId!),
    enabled: !!chargeId,
  });
  const o = data?.obligation;
  return (
    <Sheet open={!!chargeId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{o ? `${humanize(o.obligation_type)} • ${periodLabel(o.period_start, o.period_end)}` : 'Scheduled charge'}</SheetTitle>
          <SheetDescription>{o ? `Due ${fmtDate(o.due_date)}` : ' '}</SheetDescription>
        </SheetHeader>
        {isLoading || !data || !o ? (
          <div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        ) : (
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div><span className="text-muted-foreground block text-[11px]">Expected</span><b>{fmtMoney(Number(o.amount_due), o.currency)}</b></div>
              <div><span className="text-muted-foreground block text-[11px]">Paid</span><b>{fmtMoney(Number(data.settled), o.currency)}</b></div>
              <div><span className="text-muted-foreground block text-[11px]">Outstanding</span><b>{fmtMoney(Number(data.outstanding), o.currency)}</b></div>
            </div>

            <div className="space-y-1">
              <h5 className="font-semibold text-foreground">Breakdown</h5>
              {data.breakdown ? (
                <ul className="list-disc pl-4 text-muted-foreground">
                  {Object.entries(data.breakdown).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                    <li key={k}>{humanize(k)}: <span className="text-foreground">{String(v)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground">This charge was added manually; no schedule breakdown is stored.</p>}
              <p className="text-muted-foreground">Recipient: <span className="text-foreground">{o.recipient_entity || EMPTY}</span></p>
            </div>

            <div className="space-y-1">
              <h5 className="font-semibold text-foreground">Linked lease</h5>
              {data.lease ? (
                <p>{data.lease.agreement_number || humanize(data.lease.agreement_type)} • {data.lease.landlord_lessor} → {data.lease.tenant_company} • {fmtDate(data.lease.start_date)} to {fmtDate(data.lease.end_date)}</p>
              ) : <p className="text-muted-foreground">Not linked to a lease.</p>}
            </div>

            <div className="space-y-1">
              <h5 className="font-semibold text-foreground">Invoice</h5>
              {data.invoice ? <p>{data.invoice.title || data.invoice.filename}</p> : <p className="text-muted-foreground">No invoice attached.</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-foreground">Payments &amp; receipts ({data.payments.length})</h5>
                {Number(data.outstanding) > 0 && (
                  <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => onRecord(o.id)}><Plus className="w-3 h-3" />Record payment</Button>
                )}
              </div>
              {data.payments.length === 0 ? <p className="text-muted-foreground">No payment has been recorded against this charge.</p> : (
                <ul className="space-y-1.5">
                  {data.payments.map((p) => (
                    <li key={p.id} className="p-2 rounded-lg border border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <b>{fmtMoney(Number(p.amount_allocated), p.currency)}</b>
                        <span className="text-muted-foreground">of a {fmtMoney(Number(p.amount_paid), p.currency)} payment on {fmtDate(p.payment_date)}</span>
                        <StatusBadge value={p.is_reversed ? 'REVERSED' : p.verification_status} />
                      </div>
                      <div className="text-muted-foreground">
                        {p.payment_method}{p.transaction_reference ? ` • ref ${p.transaction_reference}` : ''}{p.recorded_by_name ? ` • by ${p.recorded_by_name}` : ''}
                        {p.receipt_title || p.receipt_filename ? ` • receipt: ${p.receipt_title || p.receipt_filename}` : ''}
                      </div>
                      {p.notes && <div className="text-muted-foreground">{p.notes}</div>}
                      {p.reversal_reason && <div className="text-rose-600">Reversed: {p.reversal_reason}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {o.notes && <div><h5 className="font-semibold text-foreground">Notes</h5><p className="text-muted-foreground whitespace-pre-line">{o.notes}</p></div>}

            <div className="space-y-1">
              <h5 className="font-semibold text-foreground">Change history</h5>
              {data.history.length === 0 ? <p className="text-muted-foreground">No history recorded.</p> : (
                <ul className="space-y-1">
                  {data.history.map((h, i) => (
                    <li key={i} className="text-muted-foreground"><span className="text-foreground">{h.title}</span> • {fmtDate(h.event_date || h.created_at)}{h.actor_name ? ` • ${h.actor_name}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RecordPaymentDialog({
  open, onClose, propertyId, rows, initialChargeId,
}: { open: boolean; onClose: () => void; propertyId: string; rows: LeasePaymentRow[]; initialChargeId: string | null }) {
  const queryClient = useQueryClient();
  const openRows = useMemo(() => rows.filter((r) => Number(r.outstanding) > 0 && r.status_computed !== 'CANCELLED'), [rows]);
  const currencies = useMemo(() => Array.from(new Set(openRows.map((r) => r.currency))), [openRows]);
  const initialCurrency = openRows.find((r) => r.id === initialChargeId)?.currency ?? '';
  const [currency, setCurrency] = useState(initialCurrency);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [paymentDate, setPaymentDate] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const charges = openRows.filter((r) => r.currency === currency);
  const entries = Object.entries(amounts).filter(([, v]) => v !== '' && Number(v) > 0);
  const total = entries.reduce((sum, [, v]) => sum + Number(v), 0);
  const overpaid = entries.some(([id, v]) => Number(v) > Number(charges.find((c) => c.id === id)?.outstanding ?? 0) + 1e-9);
  const valid = !!currency && !!paymentDate && !!method && entries.length > 0 && !overpaid;

  const save = useMutation({
    mutationFn: () => realEstateService.recordLeasePayment({
      property_id: propertyId,
      amount_paid: Math.round(total * 100) / 100,
      currency,
      payment_date: paymentDate,
      payment_method: method,
      transaction_reference: reference || undefined,
      notes: notes || undefined,
      allocations: entries.map(([id, v]) => ({ obligation_id: id, amount: Number(v) })),
    }),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['lease-payments', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['lease-payment-charge'] });
      queryClient.invalidateQueries({ queryKey: ['property-register', propertyId] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err?.message || 'Could not record the payment'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>One payment can cover several charges. Enter how much of it settles each charge.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Currency</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); setAmounts({}); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Payment date</Label>
              <Input type="date" className="h-8 text-xs" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Bank / transaction reference</Label>
              <Input className="h-8 text-xs" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Charges to settle</Label>
            {!currency ? <EmptyState>Select a currency to see its open charges.</EmptyState> : charges.length === 0 ? <EmptyState>No open charges.</EmptyState> : (
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {charges.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2">
                    <div className="flex-1">
                      <div className="font-medium">{humanize(c.obligation_type)} • {periodLabel(c.period_start, c.period_end)}</div>
                      <div className="text-muted-foreground">Due {fmtDate(c.due_date)} • outstanding {fmtMoney(Number(c.outstanding), c.currency)}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setAmounts((a) => ({ ...a, [c.id]: String(c.outstanding) }))}>Full</Button>
                    <Input
                      type="number" min="0" step="0.01" placeholder="0.00" className="h-8 w-28 text-xs"
                      value={amounts[c.id] ?? ''} onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            {overpaid && <p className="text-rose-600">An amount is larger than what is outstanding on that charge.</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Notes</Label>
            <Input className="h-8 text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-muted-foreground">Payment total: <b className="text-foreground">{currency ? fmtMoney(total, currency) : EMPTY}</b>. A recorded payment starts unverified until Accounting verifies it.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeasePaymentsTab({
  propertyId, restricted, canManage,
}: { propertyId: string; restricted: boolean; canManage: boolean }) {
  const [windowDays, setWindowDays] = useState('all');
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [recordFor, setRecordFor] = useState<{ chargeId: string | null } | null>(null);

  const payments = useQuery({
    queryKey: ['lease-payments', propertyId],
    queryFn: () => realEstateService.getLeasePayments(propertyId),
    enabled: !restricted,
  });
  const terms = useQuery({
    queryKey: ['lease-payment-terms', propertyId],
    queryFn: () => realEstateService.getLeasePaymentTerms(propertyId),
    enabled: !restricted,
  });

  const rows = useMemo(() => payments.data?.rows ?? [], [payments.data]);
  const asOf = payments.data?.as_of;
  const visible = useMemo(() => {
    if (windowDays === 'all' || !asOf) return rows;
    const limit = new Date(`${asOf}T00:00:00`);
    limit.setDate(limit.getDate() + Number(windowDays));
    return rows.filter((r) => Number(r.outstanding) > 0 && r.due_date >= asOf && new Date(`${r.due_date}T00:00:00`) <= limit);
  }, [rows, windowDays, asOf]);

  if (restricted) return <RestrictedNotice what="Lease payments" />;

  const summary = payments.data?.summary;
  const columns: TableColumn<LeasePaymentRow>[] = [
    { header: 'Rental period', cell: (r) => <span className="font-medium">{periodLabel(r.period_start, r.period_end)}</span> },
    { header: 'Charge', cell: (r) => humanize(r.obligation_type) },
    { header: 'Due date', cell: (r) => fmtDate(r.due_date) },
    { header: 'Expected', cell: (r) => <span className="tabular-nums">{fmtMoney(Number(r.amount_due), r.currency)}</span> },
    { header: 'Paid', cell: (r) => <span className="tabular-nums">{fmtMoney(Number(r.settled), r.currency)}</span> },
    { header: 'Outstanding', cell: (r) => <span className="tabular-nums font-semibold text-foreground">{fmtMoney(Number(r.outstanding), r.currency)}</span> },
    { header: 'Status', cell: (r) => <StatusBadge value={r.status_computed} /> },
    { header: 'Paid date', cell: (r) => fmtDate(r.last_paid_date) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Next payment">
          {summary && summary.next_payment.length > 0 ? summary.next_payment.map((n) => (
            <div key={n.currency}>{fmtMoney(Number(n.outstanding), n.currency)}<div className="text-[11px] font-normal text-muted-foreground">{humanize(n.obligation_type)} • {fmtDate(n.due_date)}</div></div>
          )) : <span className="text-muted-foreground">{EMPTY}</span>}
        </SummaryCard>
        <SummaryCard title="Due this month"><Amounts items={summary?.due_this_month ?? []} /></SummaryCard>
        <SummaryCard title="Overdue balance" tone={(summary?.overdue_balance ?? []).some((i) => Number(i.amount) > 0) ? 'bad' : undefined}>
          <Amounts items={summary?.overdue_balance ?? []} />
        </SummaryCard>
        <SummaryCard title="Paid this year"><Amounts items={summary?.paid_this_year ?? []} /></SummaryCard>
      </div>

      <Section title="Payment terms" icon={<CalendarClock className="w-4 h-4 text-primary" />}>
        <p className="text-[11px] text-muted-foreground">
          The schedule is built only from terms the lease states. Confirm them first; uploading a lease never marks anything as paid.
        </p>
        {terms.isLoading ? <EmptyState>Loading…</EmptyState> : (terms.data ?? []).length === 0 ? (
          <EmptyState>No agreement is recorded for this property. Add a lease to build a payment schedule.</EmptyState>
        ) : (
          <div className="space-y-3">{terms.data!.map((t) => <TermsPanel key={t.lease_id} terms={t} canManage={canManage} propertyId={propertyId} />)}</div>
        )}
      </Section>

      <Section
        title={`Payment tracking (${visible.length})`}
        icon={<ReceiptText className="w-4 h-4 text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <Select value={windowDays} onValueChange={setWindowDays}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{WINDOWS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
            </Select>
            {canManage && (
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setRecordFor({ chargeId: null })}><Plus className="w-3.5 h-3.5" />Record payment</Button>
            )}
          </div>
        }
      >
        {windowDays !== 'all' && summary && (
          <p className="text-[11px] text-muted-foreground">
            Due in the next {windowDays} days: {(summary.upcoming[windowDays] ?? []).filter((u) => u.count > 0).map((u) => `${fmtMoney(Number(u.amount), u.currency)} (${u.count})`).join(', ') || 'nothing'}.
          </p>
        )}
        {payments.isLoading ? <EmptyState>Loading…</EmptyState> : (
          <div onClick={(e) => {
            const tr = (e.target as HTMLElement).closest('tr');
            const index = tr ? Array.from(tr.parentElement?.children ?? []).indexOf(tr) : -1;
            if (tr?.parentElement?.tagName === 'TBODY' && index >= 0 && visible[index]) setChargeId(visible[index].id);
          }} className="[&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-muted/40">
            <SimpleTable columns={columns} rows={visible} getKey={(r) => r.id} empty="No scheduled charges. Confirm the payment terms above, then generate the schedule." />
          </div>
        )}
      </Section>

      <ChargeSheet chargeId={chargeId} onClose={() => setChargeId(null)} onRecord={(id) => { setChargeId(null); setRecordFor({ chargeId: id }); }} />
      {recordFor && (
        <RecordPaymentDialog open onClose={() => setRecordFor(null)} propertyId={propertyId} rows={rows} initialChargeId={recordFor.chargeId} />
      )}
    </div>
  );
}
