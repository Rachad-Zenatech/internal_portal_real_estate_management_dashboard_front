import type { RegisterEntityKey } from '@/types/realEstate';

export type RegisterFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean';

export interface RegisterFieldConfig {
  key: string;
  label: string;
  type: RegisterFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Initial value when creating (selects default to the backend default). */
  defaultValue?: string;
  /** Select that may be left unset. */
  allowEmpty?: boolean;
  /** Hidden for users without accounting access (backend answers 403 for these). */
  financial?: boolean;
  /** Accepted by the create model only; the update model rejects it. */
  createOnly?: boolean;
  placeholder?: string;
  /** Spans both columns. */
  wide?: boolean;
}

export interface RegisterEntityConfig {
  key: RegisterEntityKey;
  /** Sentence-case singular, e.g. "Work order". */
  label: string;
  fields: RegisterFieldConfig[];
}

const opts = (values: string[]) =>
  values.map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') }));

const PARTY_TYPES = opts(['INDIVIDUAL', 'COMPANY', 'GOVERNMENT', 'OTHER', 'UNKNOWN']);
const FREQUENCIES = opts(['ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']);
const BILLING_FREQUENCIES = opts(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'ONE_TIME']);

export const REGISTER_ENTITY_CONFIGS: Record<RegisterEntityKey, RegisterEntityConfig> = {
  ownerships: {
    key: 'ownerships',
    label: 'Ownership',
    fields: [
      { key: 'owner_name', label: 'Owner name', type: 'text', required: true, createOnly: true, placeholder: 'Legal name of the owner' },
      { key: 'owner_type', label: 'Owner type', type: 'select', options: PARTY_TYPES, allowEmpty: true, createOnly: true },
      {
        key: 'ownership_type', label: 'Ownership type', type: 'select', defaultValue: 'UNSPECIFIED',
        options: opts(['FREEHOLD', 'LEASEHOLD', 'STRATA', 'CONDOMINIUM', 'BENEFICIAL', 'JOINT', 'OTHER', 'UNSPECIFIED']),
      },
      { key: 'ownership_percentage', label: 'Ownership share (%)', type: 'number', placeholder: '0 – 100' },
      { key: 'title_reference', label: 'Title reference', type: 'text' },
      { key: 'title_registration_date', label: 'Title registration date', type: 'date' },
      { key: 'start_date', label: 'Owned from', type: 'date' },
      { key: 'end_date', label: 'Owned until', type: 'date', placeholder: 'Only once ownership has ended' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  acquisitions: {
    key: 'acquisitions',
    label: 'Acquisition',
    fields: [
      {
        key: 'acquisition_type', label: 'Acquisition type', type: 'select', defaultValue: 'PURCHASE',
        options: opts(['PURCHASE', 'TRANSFER', 'GIFT', 'INHERITANCE', 'FORECLOSURE', 'MERGER_ACQUISITION', 'OTHER']),
      },
      { key: 'financing_status', label: 'Financing status', type: 'select', defaultValue: 'UNKNOWN', options: opts(['CASH', 'FINANCED', 'PARTIALLY_FINANCED', 'UNKNOWN']) },
      { key: 'acquisition_date', label: 'Acquisition date', type: 'date' },
      { key: 'closing_date', label: 'Closing date', type: 'date' },
      { key: 'purchase_price', label: 'Purchase price', type: 'number', financial: true },
      { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
      { key: 'deposit_amount', label: 'Deposit amount', type: 'number', financial: true },
      { key: 'closing_costs', label: 'Closing costs', type: 'number', financial: true },
      { key: 'land_value', label: 'Land value', type: 'number', financial: true },
      { key: 'building_value', label: 'Building value', type: 'number', financial: true },
      { key: 'seller_name', label: 'Seller', type: 'text' },
      { key: 'mortgage_reference', label: 'Mortgage reference', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  'recurring-obligations': {
    key: 'recurring-obligations',
    label: 'Recurring obligation',
    fields: [
      {
        key: 'category', label: 'Category', type: 'select', required: true, defaultValue: 'RENT',
        options: opts(['RENT', 'MORTGAGE', 'PROPERTY_TAX', 'INSURANCE', 'UTILITIES', 'MAINTENANCE', 'SERVICE_CHARGE', 'CAM', 'OTHER']),
      },
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'EXPENSE', options: opts(['INCOME', 'EXPENSE']), financial: true },
      { key: 'description', label: 'Description', type: 'text', wide: true },
      { key: 'amount', label: 'Amount', type: 'number', required: true, financial: true },
      { key: 'currency', label: 'Currency', type: 'text', defaultValue: 'USD', financial: true },
      { key: 'frequency', label: 'Frequency', type: 'select', defaultValue: 'MONTHLY', options: FREQUENCIES, financial: true },
      { key: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE', options: opts(['ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED']) },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'next_due_date', label: 'Next due date', type: 'date' },
      { key: 'payer_name', label: 'Payer', type: 'text', financial: true },
      { key: 'recipient_name', label: 'Recipient', type: 'text', financial: true },
      { key: 'cost_center', label: 'Cost center', type: 'text', financial: true },
      { key: 'gl_reference', label: 'GL reference', type: 'text', financial: true },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  assets: {
    key: 'assets',
    label: 'Asset',
    fields: [
      { key: 'name', label: 'Asset name', type: 'text', required: true, wide: true },
      { key: 'asset_code', label: 'Asset code', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'serial_number', label: 'Serial number', type: 'text' },
      { key: 'installation_date', label: 'Installation date', type: 'date' },
      { key: 'warranty_expiry_date', label: 'Warranty expiry date', type: 'date' },
      { key: 'expected_replacement_date', label: 'Expected replacement date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE', options: opts(['ACTIVE', 'INACTIVE', 'UNDER_REPAIR', 'DECOMMISSIONED']) },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  'work-orders': {
    key: 'work-orders',
    label: 'Work order',
    fields: [
      { key: 'issue_description', label: 'Issue description', type: 'textarea', required: true, wide: true },
      { key: 'work_order_number', label: 'Work order number', type: 'text', placeholder: 'Generated if left empty' },
      {
        key: 'maintenance_type', label: 'Maintenance type', type: 'select', defaultValue: 'CORRECTIVE',
        options: opts(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION_FOLLOW_UP', 'OTHER']),
      },
      { key: 'priority', label: 'Priority', type: 'select', defaultValue: 'MEDIUM', options: opts(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) },
      {
        key: 'status', label: 'Status', type: 'select', defaultValue: 'OPEN',
        options: opts(['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      },
      { key: 'assigned_party_name', label: 'Assigned vendor', type: 'text' },
      { key: 'reported_date', label: 'Reported date', type: 'date' },
      { key: 'scheduled_date', label: 'Scheduled date', type: 'date' },
      { key: 'completed_date', label: 'Completed date', type: 'date', placeholder: 'Required when completed' },
      { key: 'estimated_cost', label: 'Estimated cost', type: 'number', financial: true },
      { key: 'actual_cost', label: 'Actual cost', type: 'number', financial: true },
      { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  utilities: {
    key: 'utilities',
    label: 'Utility',
    fields: [
      {
        key: 'utility_type', label: 'Utility type', type: 'select', required: true, defaultValue: 'ELECTRICITY',
        options: opts(['ELECTRICITY', 'GAS', 'WATER', 'SEWER', 'INTERNET', 'TELECOM', 'WASTE', 'HEATING_COOLING', 'OTHER']),
      },
      { key: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE', options: opts(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']) },
      { key: 'provider_name', label: 'Provider', type: 'text' },
      { key: 'account_reference', label: 'Account reference', type: 'text' },
      { key: 'responsible_name', label: 'Responsible party', type: 'text' },
      { key: 'billing_frequency', label: 'Billing frequency', type: 'select', defaultValue: 'MONTHLY', options: BILLING_FREQUENCIES },
      { key: 'service_start_date', label: 'Service start', type: 'date' },
      { key: 'service_end_date', label: 'Service end', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  'insurance-policies': {
    key: 'insurance-policies',
    label: 'Insurance policy',
    fields: [
      { key: 'policy_number', label: 'Policy number', type: 'text', required: true },
      { key: 'insurer_name', label: 'Insurer', type: 'text' },
      { key: 'coverage_type', label: 'Coverage type', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', defaultValue: 'ACTIVE', options: opts(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED']) },
      { key: 'coverage_limit', label: 'Coverage limit', type: 'number' },
      { key: 'insured_value', label: 'Insured value', type: 'number' },
      { key: 'deductible', label: 'Deductible', type: 'number' },
      { key: 'premium', label: 'Premium', type: 'number', financial: true },
      { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
      { key: 'policy_start_date', label: 'Policy start', type: 'date' },
      { key: 'policy_end_date', label: 'Policy end', type: 'date' },
      { key: 'renewal_reminder_date', label: 'Renewal reminder', type: 'date', placeholder: 'Defaults to 60 days before the end' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  'compliance-items': {
    key: 'compliance-items',
    label: 'Compliance item',
    fields: [
      { key: 'requirement_name', label: 'Requirement name', type: 'text', required: true, wide: true },
      { key: 'requirement_type', label: 'Requirement type', type: 'text', required: true, placeholder: 'e.g. FIRE, PERMIT' },
      {
        key: 'compliance_status', label: 'Compliance status', type: 'select', defaultValue: 'PENDING',
        options: opts(['COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'EXPIRED', 'WAIVED', 'NOT_APPLICABLE']),
      },
      { key: 'issuing_authority', label: 'Issuing authority', type: 'text' },
      { key: 'reference_number', label: 'Reference number', type: 'text' },
      { key: 'responsible_name', label: 'Responsible person', type: 'text' },
      { key: 'effective_date', label: 'Effective date', type: 'date' },
      { key: 'expiry_date', label: 'Expiry date', type: 'date' },
      { key: 'next_review_date', label: 'Next review date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
};
