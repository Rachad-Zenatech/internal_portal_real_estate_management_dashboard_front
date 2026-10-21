export type PropertyCategory = 
  | 'LEASED_OFFICE' 
  | 'OWNED_HQ' 
  | 'COMPANY_CONDO' 
  | 'RD_FACILITY' 
  | 'WAREHOUSE' 
  | 'CO_WORKING';

export type OwnershipType = 'OWNED' | 'LEASED';

export type InventoryVerificationStatus = 'UNVERIFIED' | 'IN_PROGRESS' | 'VERIFIED';

export type TaxResponsibility = 'LANDLORD' | 'TENANT' | 'SHARED' | 'EXEMPT';

export interface Location {
  id: string;
  city: string;
  country: string;
  state_province?: string | null;
  timezone: string;
  currency: string;
  notes?: string | null;
  is_active: boolean;
  property_count?: number;
  unit_count?: number;
  available_units?: number;
  occupied_units?: number;
  verified_properties_count?: number;
  verification_progress_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id: string;
  location_id?: string | null;
  property_code?: string | null;
  name: string;
  city: string;
  country: string;
  address: string;
  postal_code?: string | null;
  timezone?: string;
  location_timezone?: string;
  property_category?: PropertyCategory | string;
  property_type: string;
  ownership_type?: OwnershipType | string;
  responsible_legal_entity?: string | null;
  local_contact_name?: string | null;
  local_contact_email?: string | null;
  local_contact_phone?: string | null;
  description?: string | null;
  notes?: string | null;
  image_url?: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'MAINTENANCE' | string;
  is_archived?: boolean;
  
  // Physical & Occupancy Specs
  square_feet?: number;
  total_square_feet?: number;
  measurement_unit?: 'sqft' | 'sqm' | string;
  max_capacity?: number;
  current_occupancy?: number;
  utilization_rate?: number;
  floor_count?: number;
  floor_plan_url?: string | null;
  floor_plans?: Array<{ title?: string; url?: string; floor_number?: number; sq_ft?: number }>;
  
  // Inventory Verification Status
  inventory_verification_status?: InventoryVerificationStatus | string;
  inventory_verified_by?: string | null;
  inventory_verified_by_name?: string | null;
  inventory_verified_date?: string | null;
  inventory_verification_notes?: string | null;

  // Financials & Operating Costs
  monthly_rent?: number | null;
  monthly_cam?: number | null;
  annual_property_tax?: number | null;
  monthly_utilities_other?: number | null;
  total_monthly_cost_usd?: number;
  currency?: string;
  
  // Property Tax Configuration
  tax_responsibility?: TaxResponsibility | string;
  tax_amount?: number | null;
  tax_currency?: string;
  tax_frequency?: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY' | string;
  tax_due_date?: string | null;
  tax_notes?: string | null;

  // Ownership & Legal Attributes
  state_province?: string | null;
  unit_number?: string | null;
  legal_owner?: string | null;
  owning_company?: string | null;
  ownership_interest?: number | null;
  parcel_id?: string | null;
  title_number?: string | null;

  // Separate Measurements & Normalized SQFT
  land_area?: number | null;
  land_area_unit?: string | null;
  land_area_sqft?: number | null;
  building_area?: number | null;
  building_area_unit?: string | null;
  building_area_sqft?: number | null;
  usable_area?: number | null;
  usable_area_unit?: string | null;
  usable_area_sqft?: number | null;

  // Building & Construction Details
  year_built?: number | null;
  building_count?: number | null;
  construction_type?: string | null;
  zoning?: string | null;
  building_systems?: Record<string, any> | null;

  // Acquisition & Purchase Details
  purchase_date?: string | null;
  purchase_price?: number | null;
  purchase_currency?: string | null;
  effective_date?: string | null;
  document_source_date?: string | null;

  // Geocoding Coordinates
  latitude?: number | null;
  longitude?: number | null;
  is_geocoded?: boolean;
  geocoded_matched_address?: string | null;

  // Lease Terms & Critical Dates
  lease_type?: string;
  lease_commencement_date?: string | null;
  lease_expiration_date?: string | null;
  renewal_notice_deadline?: string | null;
  break_option_date?: string | null;
  landlord_name?: string | null;
  landlord_contact?: string | null;
  
  // M&A Impact & Acquisitions Context
  is_ma_acquisition?: boolean;
  acquisition_entity_name?: string | null;
  acquisition_date?: string | null;
  integration_status?: 'INTEGRATED' | 'TRANSITIONING' | 'EXIT_EVALUATION' | string;
  
  primary_contact?: string | null;
  source_spreadsheet_ref?: string | null;
  unit_count?: number;
  available_units?: number;
  occupied_units?: number;
  maintenance_units?: number;
  units?: Unit[];
  current_lease?: Lease | null;
  documents?: PropertyDocument[];
  documents_count?: number;
  inspections?: PropertyInspection[];
  inspections_count?: number;
  activity_logs?: PropertyActivityLog[];
  obligations?: PropertyObligation[];
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_code?: string | null;
  unit_number: string;
  unit_type?: string;
  floor?: string | null;
  floor_area?: number | null;
  area_unit?: 'sqft' | 'sqm' | string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number | null;
  guest_capacity: number;
  max_occupants: number;
  is_bookable: boolean;
  is_archived?: boolean;
  is_available_today?: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'INACTIVE' | string;
  amenities?: string[];
  employee_instructions?: string | null;
  restricted_access_info?: string | null;
  monthly_rent?: number;
  annual_tax?: number;
  monthly_hoa_fees?: number;
  currency: string;
  keybox_code?: string | null;
  access_instructions?: string | null;
  floor_plan_url?: string | null;
  notes?: string | null;
  property_name?: string;
  property_code?: string | null;
  city?: string;
  address?: string;
  country?: string;
  property_timezone?: string;
  current_stay?: Stay | null;
  active_maintenance?: MaintenanceBlock | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceBlock {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
}

export interface Lease {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  lease_code?: string | null;
  landlord_lessor: string;
  tenant_company: string;
  lease_type?: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  currency: string;
  rent_frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | string;
  due_day_rule?: number;
  security_deposit?: number;
  notice_period_days?: number;
  notice_deadline?: string | null;
  break_option_date?: string | null;
  renewal_terms?: string | null;
  floor_area?: number | null;
  area_unit?: string;
  tax_responsibility_terms?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | string;
  source_document_id?: string | null;
  source_document_name?: string | null;
  is_reviewed?: boolean;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  property_name?: string;
  property_city?: string;
  unit_number?: string;
  versions?: LeaseVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface LeaseVersion {
  id: string;
  lease_id: string;
  version_number: number;
  snapshot_data: Record<string, any>;
  changed_by?: string | null;
  changed_by_name?: string | null;
  change_summary?: string | null;
  created_at?: string;
}

export interface LeaseExtractionJob {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  document_id: string;
  document_title?: string | null;
  document_filename?: string | null;
  document_url?: string | null;
  status: 'UPLOADED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'FAILED' | string;
  raw_extracted_data?: Record<string, any> | null;
  extracted_data?: Record<string, any> | null;
  user_corrected_data?: Record<string, any> | null;
  error_message?: string | null;
  confirmed_lease_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyDocument {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  lease_id?: string | null;
  obligation_id?: string | null;
  title: string;
  filename?: string | null;
  stored_path?: string | null;
  document_type: string;
  access_classification: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED_FINANCIAL' | 'CONFIDENTIAL' | string;
  file_url: string;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  uploaded_by_name?: string | null;
  uploaded_by_full_name?: string | null;
  uploaded_date?: string | null;
  version?: number;
  notes?: string | null;
  property_name?: string;
  unit_number?: string;
  can_download?: boolean;
  created_at?: string;
}

export interface Stay {
  id: string;
  unit_id: string;
  employee_user_id?: string | null;
  user_id?: string | null;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  purpose_of_stay?: string | null;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | string;
  special_requests?: string | null;
  notes?: string | null;
  is_my_stay?: boolean;
  property_id?: string | null;
  property_name?: string;
  property_city?: string;
  city?: string;
  address?: string;
  property_timezone?: string;
  unit_number?: string;
  unit_type?: string;
  unit_floor?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StayCreateRequest {
  unit_id: string;
  employee_user_id?: string | null;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  check_in_date: string;
  check_out_date: string;
  guest_count?: number;
  purpose_of_stay?: string;
  status?: string;
  special_requests?: string;
  notes?: string;
}

export interface PropertyPayment {
  id: string;
  obligation_id: string;
  amount_paid: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string | null;
  payment_evidence_document_id?: string | null;
  payment_evidence_filename?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  verification_status: 'UNVERIFIED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | string;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  is_reversed?: boolean;
  reversal_reason?: string | null;
  reversed_by_name?: string | null;
  reversed_at?: string | null;
  created_at?: string;
}

export interface PropertyObligation {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  lease_id?: string | null;
  obligation_type: 'RENT' | 'PROPERTY_TAX' | 'CAM' | 'HOA' | 'UTILITIES' | 'INSURANCE' | 'OTHER' | string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount_due: number;
  amount?: number;
  currency: string;
  recipient_entity?: string | null;
  status: 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | string;
  payment_status?: string;
  invoice_document_id?: string | null;
  invoice_document_title?: string | null;
  payments_recorded?: number;
  outstanding_balance?: number;
  payments?: PropertyPayment[];
  notes?: string | null;
  property_name?: string;
  property_city?: string;
  city?: string;
  paid_by?: string;
  reference_invoice?: string;
  frequency?: string;
  unit_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CurrencyFinancialBucket {
  currency: string;
  total_amount_due: number;
  total_paid: number;
  total_outstanding_balance: number;
  overdue_balance: number;
  upcoming_balance: number;
}

export interface AccountingSummary {
  currencies: CurrencyFinancialBucket[];
  total_obligations_count: number;
  overdue_obligations_count: number;
  pending_verification_count: number;
  unverified_payments_count: number;
}

export interface CriticalDateItem {
  property_id: string;
  property_name: string;
  city: string;
  country: string;
  date_type: 'LEASE_EXPIRATION' | 'RENEWAL_DEADLINE' | 'BREAK_OPTION' | 'TAX_DUE' | string;
  target_date: string;
  days_remaining: number;
  monthly_cost: number;
  currency?: string;
  landlord_name?: string | null;
}

export interface RealEstateSummary {
  active_properties: number;
  total_properties?: number;
  active_units: number;
  available_units?: number;
  total_locations: number;
  locations_count?: number;
  cities_count?: number;
  available_units_today: number;
  occupied_units_today: number;
  maintenance_units_today: number;
  awaiting_inventory_verification: number;
  leases_approaching_expiry: CriticalDateItem[];
  upcoming_critical_dates?: CriticalDateItem[];
  overdue_payments_count: number;
  total_monthly_obligations_usd?: number;
  total_annual_obligations_usd?: number;
  total_square_feet?: number;
  total_headcount_capacity?: number;
  total_current_occupancy?: number;
  global_utilization_rate?: number;
  average_cost_per_sqft_annual?: number;
  ma_impact?: {
    properties_count: number;
    total_ma_properties?: number;
    square_feet: number;
    total_acquired_sqft?: number;
    headcount: number;
    annual_cost_usd: number;
  };
  currency_summaries: CurrencyFinancialBucket[];
  locations: Location[];
}

export interface SpreadsheetRowImport {
  name: string;
  city: string;
  country: string;
  address?: string;
  property_category?: string;
  property_type?: string;
  ownership_type?: string;
  responsible_legal_entity?: string;
  square_feet?: number;
  max_capacity?: number;
  current_occupancy?: number;
  monthly_rent?: number;
  monthly_cam?: number;
  annual_property_tax?: number;
  lease_type?: string;
  lease_commencement_date?: string | null;
  lease_expiration_date?: string | null;
  renewal_notice_deadline?: string | null;
  landlord_name?: string | null;
  is_ma_acquisition?: boolean;
  acquisition_entity_name?: string | null;
  primary_contact?: string | null;
  notes?: string | null;
}

export interface BulkImportPayload {
  source_filename?: string;
  notes?: string;
  rows: SpreadsheetRowImport[];
}

export interface BulkImportResponse {
  success: boolean;
  imported_count: number;
  updated_count: number;
  total_processed: number;
  message: string;
}

// ===========================================================================
// DOCUMENT-DRIVEN EXTRACTION, INSPECTION & AUDIT MODELS
// ===========================================================================

export interface ExtractedFieldEvidence {
  extracted_value?: any;
  normalized_value?: any;
  value?: any;
  unit?: string;
  normalized_sqft?: number | null;
  source_page?: number | null;
  bounding_box?: number[] | null; // [x0, y0, x1, y1] normalized (0..1)
  extraction_method?: string | null;
  confidence?: number;
  supporting_text?: string | null;
  is_verified?: boolean;
  validation_status?: 'VALID' | 'WARNING' | 'MISSING' | 'SUSPICIOUS' | string;
  validation_message?: string | null;
}

export interface PropertyExtractionJob {
  id: string;
  document_id: string;
  property_id?: string | null;
  status: 'UPLOADED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'FAILED' | string;
  progress: number;
  document_type: string;
  pipeline_version?: string;
  extractor_provider?: string;
  extractor_model?: string;
  document_title?: string | null;
  document_filename?: string | null;
  document_url?: string | null;
  page_count?: number;
  file_size_bytes?: number | null;
  raw_extracted_data?: any;
  extracted_properties?: any[];
  validation_warnings?: Array<{ code: string; field: string; severity: string; message: string }>;
  user_corrected_data?: any;
  target_property_id?: string | null;
  target_property_name?: string | null;
  matching_properties?: Property[];
  proposed_diff?: Record<string, { field: string; old_value: any; proposed_value: any }>;
  error_message?: string | null;
  missing_pages?: number[];
  retry_count?: number;
  confirmed_by_name?: string | null;
  confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyInspectionFinding {
  id: string;
  inspection_id: string;
  property_id: string;
  finding_title: string;
  finding_description: string;
  area_location?: string | null;
  reported_severity: string; // original report wording
  suggested_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  recommendation?: string | null;
  follow_up_deadline?: string | null;
  follow_up_status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  responsible_person?: string | null;
  resolution_notes?: string | null;
  source_page_number?: number | null;
  source_bounding_box?: number[] | null;
  source_text_snippet?: string | null;
  photos?: Array<{ title?: string; url?: string; description?: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyInspection {
  id: string;
  property_id: string;
  property_name?: string;
  document_id?: string | null;
  document_title?: string | null;
  document_filename?: string | null;
  inspection_date: string;
  inspection_type: string;
  inspector_name?: string | null;
  inspection_company?: string | null;
  scope?: string | null;
  inspected_areas?: string[];
  overall_condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' | string;
  summary?: string | null;
  findings_count?: number;
  open_findings_count?: number;
  findings: PropertyInspectionFinding[];
  created_at?: string;
  updated_at?: string;
}

export interface PropertyActivityLog {
  id: string;
  property_id: string;
  activity_type: string;
  title: string;
  details?: any;
  diff?: any;
  document_id?: string | null;
  document_filename?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  created_at?: string;
}

export interface ExtractionEngineStatus {
  pipeline_version: string;
  engines: Array<{
    id: string;
    name: string;
    status: 'ONLINE' | 'NOT_CONFIGURED' | 'OFFLINE';
    description: string;
    is_default: boolean;
  }>;
}
