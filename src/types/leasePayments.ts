export type ChargeStatus = 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING' | 'CANCELLED';

export interface LeasePaymentRow {
  id: string;
  lease_id: string | null;
  agreement_number: string | null;
  obligation_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount_due: number;
  settled: number;
  outstanding: number;
  currency: string;
  direction: 'INCOME' | 'EXPENSE';
  recipient_entity: string | null;
  status_computed: ChargeStatus;
  last_paid_date: string | null;
  invoice_document_id: string | null;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface LeasePaymentsResponse {
  as_of: string;
  summary: {
    next_payment: { currency: string; due_date: string; outstanding: number; obligation_type: string }[];
    due_this_month: CurrencyAmount[];
    overdue_balance: CurrencyAmount[];
    paid_this_year: CurrencyAmount[];
    upcoming: Record<string, { currency: string; amount: number; count: number }[]>;
  };
  rows: LeasePaymentRow[];
}

export interface TermEvidence {
  supporting_text: string | null;
  source_page: number | null;
  document_id: string | null;
  document_title: string | null;
}

export interface ScheduleGap {
  period_start: string;
  period_end: string;
  charge: string;
  reason: string;
}

export interface LeasePaymentTerms {
  lease_id: string;
  agreement_number: string | null;
  agreement_type: string | null;
  landlord: string;
  tenant: string;
  our_role: string | null;
  direction: 'INCOME' | 'EXPENSE' | null;
  terms: Record<string, string | number | null>;
  additional_charges: { id: string; category: string; description: string | null; amount: number; currency: string; frequency: string }[];
  evidence: Record<string, TermEvidence>;
  is_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  missing: { field: string; label: string }[];
  gaps: ScheduleGap[];
  rent_free_periods: { period_start: string; period_end: string }[];
  scheduled_periods: number;
  generated_charges: number;
}

export interface GenerateScheduleResult {
  created: number;
  future_charges_rebuilt: number;
  kept_existing: number;
  gaps: ScheduleGap[];
}

export interface ChargeDetail {
  obligation: {
    id: string;
    property_id: string;
    lease_id: string | null;
    obligation_type: string;
    period_start: string;
    period_end: string;
    due_date: string;
    amount_due: number;
    currency: string;
    direction: string;
    recipient_entity: string | null;
    notes: string | null;
    status: string;
  };
  settled: number;
  outstanding: number;
  breakdown: Record<string, string | number | null> | null;
  lease: { id: string; agreement_number: string | null; agreement_type: string | null; landlord_lessor: string; tenant_company: string; start_date: string; end_date: string } | null;
  invoice: { document_id: string; title: string | null; filename: string | null } | null;
  payments: {
    id: string;
    payment_date: string;
    payment_method: string;
    transaction_reference: string | null;
    currency: string;
    amount_paid: number;
    amount_allocated: number;
    verification_status: string;
    is_reversed: boolean;
    reversal_reason: string | null;
    notes: string | null;
    receipt_title: string | null;
    receipt_filename: string | null;
    recorded_by_name: string | null;
  }[];
  history: { activity_type: string; title: string; actor_name: string | null; event_date: string | null; created_at: string }[];
}

export interface LeasePaymentPayload {
  property_id: string;
  amount_paid: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  notes?: string;
  allocations: { obligation_id: string; amount: number }[];
}
