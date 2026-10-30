export type PropertyCategory =
  | 'COMMERCIAL_OFFICE'
  | 'CORPORATE_HQ'
  | 'COMPANY_CONDO'
  | 'RD_FACILITY'
  | 'WAREHOUSE'
  | 'CO_WORKING'
  | 'RETAIL'
  | 'LEASED_OFFICE'
  | 'OWNED_HQ';

export function formatPropertyCategory(category?: string | null, _ownershipType?: string | null): string {
  if (!category) return 'Commercial Office';
  const cat = category.toUpperCase().trim();
  if (cat === 'LEASED_OFFICE') return 'Commercial Office';
  if (cat === 'OWNED_HQ') return 'Corporate HQ';
  if (cat === 'COMMERCIAL_OFFICE') return 'Commercial Office';
  if (cat === 'CORPORATE_HQ') return 'Corporate HQ';
  if (cat === 'COMPANY_CONDO') return 'Corporate Condo';
  if (cat === 'RD_FACILITY') return 'R&D Facility';
  if (cat === 'WAREHOUSE') return 'Warehouse / Logistics';
  if (cat === 'CO_WORKING') return 'Co-Working Space';
  if (cat === 'RETAIL') return 'Retail';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

export interface HomeHarvestPropertySchema {
  property_url?: string | null;
  property_id?: string | null;
  listing_id?: string | null;
  permalink?: string | null;
  mls?: string | null;
  mls_id?: string | null;
  mls_status?: string | null;
  status?: string | null;
  style?: string | null;
  text?: string | null;
  description?: string | null;
  formatted_address?: string | null;
  matched_address?: string | null;
  full_street_line?: string | null;
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  county?: string | null;
  neighborhoods?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  beds?: number | null;
  full_baths?: number | null;
  half_baths?: number | null;
  sqft?: number | null;
  year_built?: number | null;
  stories?: number | null;
  lot_sqft?: number | null;
  days_on_mls?: number | null;
  list_price?: number | null;
  list_price_min?: number | null;
  list_price_max?: number | null;
  list_date?: string | null;
  pending_date?: string | null;
  sold_price?: number | null;
  last_sold_date?: string | null;
  last_sold_price?: number | null;
  price_per_sqft?: number | null;
  new_construction?: boolean | null;
  hoa_fee?: number | null;
  monthly_fees?: any;
  one_time_fees?: any;
  estimated_value?: number | null;
  assessed_value?: number | null;
  annual_tax?: number | null;
  tax_history?: Array<{
    year?: number;
    tax?: number;
    assessment?: { building?: number; land?: number; total?: number };
  }> | null;
  parking_garage?: number | string | null;
  builder_id?: string | null;
  builder_name?: string | null;
  office_id?: string | null;
  office_mls_set?: string | null;
  office_name?: string | null;
  office_email?: string | null;
  office_phones?: Array<{ number?: string; type?: string; primary?: boolean }> | null;
  nearby_schools?: string | string[] | null;
  primary_photo?: string | null;
  alt_photos?: string[] | string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_phones?: Array<{ number?: string; type?: string; primary?: boolean }> | null;
  agent_mls_set?: string | null;
  broker_id?: string | null;
  broker_name?: string | null;
  flood_zone_code?: string | null;
  land_use_code?: string | null;
  [key: string]: any;
}

export interface Property {
  id: string;
  location_id?: string | null;
  property_code?: string | null;
  name: string;
  building_name?: string | null;
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

  // Property register master fields
  property_subtype?: string | null;
  occupancy_status?: OccupancyStatus | null;
  usage_type?: string | null;
  legal_description?: string | null;
  lot_number?: string | null;
  building_identifier?: string | null;
  parking_spaces?: number | null;
  physical_characteristics?: Record<string, any> | null;
  archived_at?: string | null;
  deleted_at?: string | null;
  derived_tenure?: TenureType | null;

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
  homeharvest_data?: HomeHarvestPropertySchema | Record<string, any> | null;

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
  document_date?: string | null;
  expiry_date?: string | null;
  signature_status?: 'UNKNOWN' | 'NOT_APPLICABLE' | 'UNSIGNED' | 'PARTIALLY_SIGNED' | 'SIGNED' | string;
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

export type AddressCandidateRole =
  | 'PROPERTY_PREMISES'
  | 'BROKER_OFFICE'
  | 'LANDLORD_CORRESPONDENCE'
  | 'TENANT_CORRESPONDENCE'
  | 'PROPERTY_MANAGEMENT_OFFICE'
  | 'NOTICE_OR_SERVICE_ADDRESS'
  | 'OTHER'
  | 'UNKNOWN';

export interface AddressCandidate {
  candidate_id: string;
  raw_text: string;
  street_address: string | null;
  normalized_street_address?: string | null;
  unit_number?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  roles: AddressCandidateRole[];
  role_labels?: string[];
  role_reasons?: string[];
  source_page: number;
  section_context?: string | null;
  supporting_quote?: string | null;
  bounding_box?: number[] | null;
  extraction_method?: 'embedded_pdf_text' | 'ocr' | 'visual_interpretation' | string;
  is_selected_property?: boolean;
  selection_score?: number;
}

export interface SelectedPropertyResolution {
  property_index: number;
  street_address: string | null;
  normalized_street_address?: string | null;
  unit_number?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  source_page?: number | null;
  supporting_quote?: string | null;
  selection_reason?: string | null;
  bounding_box?: number[] | null;
  extraction_method?: string | null;
  supporting_candidate_ids?: string[];
}

export interface AddressReviewMetadata {
  user_confirmed: boolean;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  original_extracted_address?: any;
  corrected_address?: any;
  reprocessed_suggestions_available?: boolean;
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
  file_name?: string | null;
  current_stage?: string | null;
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
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  follow_up_required?: boolean;
  next_inspection_date?: string | null;
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
  event_date?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
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

export interface DuplicatePropertyDiff {
  field: string;
  label: string;
  primary_value: any;
  duplicate_value: any;
  is_different: boolean;
}

export interface DuplicateMatchItem {
  duplicate_property: Property;
  match_reasons: string[];
  differences: DuplicatePropertyDiff[];
  child_counts: {
    units: number;
    leases: number;
    documents: number;
    inspections: number;
  };
}

export interface PropertyDuplicatesResponse {
  property_id: string;
  has_duplicates: boolean;
  duplicates: DuplicateMatchItem[];
}

export interface PropertyMergePayload {
  duplicate_property_id: string;
  merged_fields: Record<string, any>;
  archive_duplicate: boolean;
}

// ---------------------------------------------------------------------------
// Property register (GET /api/real-estate/properties/{id}/register)
// ---------------------------------------------------------------------------

export type OccupancyStatus = 'VACANT' | 'OCCUPIED' | 'PARTIALLY_OCCUPIED' | 'UNDER_RENOVATION' | 'UNKNOWN';
export type TenureType = 'OWNED' | 'LEASED' | 'SUBLEASED' | 'LEASE_TO_OWN' | 'OTHER' | 'MIXED' | 'UNKNOWN';
export type RegisterWarningSeverity = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
export type MaxTermReviewStatus = 'NOT_REVIEWED' | 'PENDING_REVIEW' | 'CONFIRMED' | 'DISPUTED' | 'NOT_APPLICABLE';

export interface PropertyTenure {
  property_id: string;
  is_owned: boolean;
  is_leased: boolean;
  is_subleased: boolean;
  is_lease_to_own: boolean;
  has_other_arrangement: boolean;
  derived_tenure: TenureType | string;
  /** false when no ownership/agreement records exist and the legacy ownership_type label was used instead */
  derived_from_records: boolean;
  legacy_label?: string | null;
}

export interface PropertyAddressRecord {
  id: string;
  property_id: string;
  address_type: 'PHYSICAL' | 'LEGAL' | 'MAILING' | 'BILLING' | string;
  address_line1: string;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_primary: boolean;
}

export interface PropertyOwnership {
  id: string;
  property_id: string;
  owner_party_id: string;
  owner_name: string;
  owner_display_name?: string | null;
  ownership_type: string;
  ownership_percentage?: number | null;
  title_reference?: string | null;
  title_registration_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  notes?: string | null;
}

export interface PropertyAcquisition {
  id: string;
  property_id: string;
  acquisition_type: string;
  acquisition_date?: string | null;
  closing_date?: string | null;
  purchase_price?: number | null;
  currency?: string | null;
  deposit_amount?: number | null;
  closing_costs?: number | null;
  land_value?: number | null;
  building_value?: number | null;
  seller_party_id?: string | null;
  seller_name?: string | null;
  financing_status: string;
  mortgage_reference?: string | null;
  title_document_id?: string | null;
  notes?: string | null;
}

export interface AgreementPartyRecord {
  agreement_id: string;
  party_id: string;
  name: string;
  role: string;
  is_primary: boolean;
  signed_date?: string | null;
}

export interface AgreementAmendment {
  id: string;
  agreement_id: string;
  amendment_reference?: string | null;
  amendment_type: string;
  effective_date: string;
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  description?: string | null;
  document_id?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_at?: string;
}

/** A row of the `leases` table viewed as a property agreement (lease, sublease, lease-to-own, ...). */
export interface PropertyAgreement {
  id: string;
  property_id: string;
  lease_code?: string | null;
  agreement_number?: string | null;
  agreement_type: 'LEASE' | 'SUBLEASE' | 'LEASE_TO_OWN' | 'LICENSE' | 'MANAGEMENT' | 'OTHER' | string;
  status: string;
  our_role?: 'TENANT' | 'LANDLORD' | 'SUBLESSEE' | 'SUBLESSOR' | 'OTHER' | null;
  counterparty_party_id?: string | null;
  counterparty_name?: string | null;
  parent_agreement_id?: string | null;
  parent_relationship?: string | null;
  landlord_lessor?: string | null;
  tenant_company?: string | null;
  // Contract dates
  signing_date?: string | null;
  effective_date?: string | null;
  start_date: string;
  original_end_date?: string | null;
  end_date: string;
  /** A proposed (not yet contractual) end date stated in a document. Never replaces end_date. */
  proposed_end_date?: string | null;
  proposed_end_date_source?: string | null;
  actual_termination_date?: string | null;
  termination_notice_date?: string | null;
  notice_period_days?: number | null;
  renewal_option?: boolean | null;
  notice_deadline?: string | null;
  renewal_term_months?: number | null;
  auto_renewal: boolean;
  renewal_terms?: string | null;
  break_option_date?: string | null;
  // Financial terms (null when the viewer lacks accounting access)
  rent_amount?: number | null;
  rent_frequency?: string | null;
  currency?: string | null;
  security_deposit?: number | null;
  deposit_holder?: string | null;
  rent_free_period_days?: number | null;
  rent_escalation_type?: string | null;
  rent_escalation_rate?: number | null;
  rent_escalation_frequency_months?: number | null;
  next_rent_review_date?: string | null;
  due_day_rule?: number | null;
  // Legal & operational terms
  permitted_use?: string | null;
  subletting_permitted?: boolean | null;
  assignment_permitted?: boolean | null;
  early_termination_permitted?: boolean | null;
  legal_restrictions?: string | null;
  signed_document_id?: string | null;
  signed_document_title?: string | null;
  notes?: string | null;
  // Maximum permissible lease term
  max_permissible_end_date?: string | null;
  max_term_source?: string | null;
  max_term_review_status: MaxTermReviewStatus;
  max_term_reviewed_by?: string | null;
  max_term_reviewed_at?: string | null;
  parties: AgreementPartyRecord[];
  amendments: AgreementAmendment[];
}

export interface RecurringObligation {
  id: string;
  property_id: string;
  agreement_id?: string | null;
  category: string;
  direction: 'INCOME' | 'EXPENSE';
  description?: string | null;
  amount: number;
  currency: string;
  frequency: string;
  start_date?: string | null;
  end_date?: string | null;
  next_due_date?: string | null;
  payer_name?: string | null;
  recipient_name?: string | null;
  cost_center?: string | null;
  gl_reference?: string | null;
  status: string;
}

export interface RegisterPayment {
  id: string;
  obligation_id: string;
  obligation_type: string;
  amount_paid: number;
  currency: string;
  payment_date: string;
  payment_method?: string | null;
  transaction_reference?: string | null;
  transaction_type: 'PAYMENT' | 'RECEIPT' | 'REFUND' | 'ADJUSTMENT' | string;
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | string;
  due_date?: string | null;
  paid_at?: string | null;
  invoice_reference?: string | null;
  verification_status?: string | null;
  is_reversed: boolean;
}

export interface PropertyAsset {
  id: string;
  asset_code?: string | null;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  installation_date?: string | null;
  warranty_expiry_date?: string | null;
  expected_replacement_date?: string | null;
  status: string;
}

export interface PropertyWorkOrder {
  id: string;
  work_order_number: string;
  asset_id?: string | null;
  asset_name?: string | null;
  maintenance_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  issue_description: string;
  reported_date: string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  assigned_party_name?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  currency?: string | null;
  status: string;
  invoice_document_id?: string | null;
}

export interface PropertyUtility {
  id: string;
  utility_type: string;
  provider_name?: string | null;
  account_reference?: string | null;
  responsible_name?: string | null;
  service_start_date?: string | null;
  service_end_date?: string | null;
  billing_frequency: string;
  status: string;
}

export interface PropertyInsurancePolicy {
  id: string;
  insurer_name?: string | null;
  policy_number: string;
  coverage_type?: string | null;
  coverage_limit?: number | null;
  insured_value?: number | null;
  deductible?: number | null;
  premium?: number | null;
  currency?: string | null;
  policy_start_date?: string | null;
  policy_end_date?: string | null;
  renewal_reminder_date?: string | null;
  policy_document_id?: string | null;
  policy_document_title?: string | null;
  status: string;
}

export interface PropertyComplianceItem {
  id: string;
  requirement_type: string;
  requirement_name: string;
  issuing_authority?: string | null;
  reference_number?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  next_review_date?: string | null;
  compliance_status: string;
  supporting_document_id?: string | null;
  supporting_document_title?: string | null;
  responsible_user_name?: string | null;
  responsible_name?: string | null;
}

export interface ComplianceIssue {
  id: string;
  agreement_id?: string | null;
  issue_type: string;
  severity: RegisterWarningSeverity;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED' | string;
  message: string;
  details: Record<string, any>;
  detected_at: string;
}

export interface RegisterWarning {
  code: string;
  severity: RegisterWarningSeverity;
  message: string;
  related_type?: string | null;
  related_id?: string | null;
}

/** Entities managed through POST /properties/{id}/{key}, PUT /{key}/{recordId}, DELETE /{key}/{recordId}. */
export type RegisterEntityKey =
  | 'ownerships'
  | 'acquisitions'
  | 'recurring-obligations'
  | 'assets'
  | 'work-orders'
  | 'utilities'
  | 'insurance-policies'
  | 'compliance-items';

/** One extracted item (agreement, ownership, ...) as returned in job.raw_extracted_data.register. */
export interface ExtractedRegisterItem {
  applies_to_address?: string | null;
  applies_to_unit?: string | null;
  confidence?: number;
  unverified_fields?: string[];
  evidence?: Record<string, { supporting_text?: string | null; source_page?: number | null; verified: boolean }>;
  [key: string]: any;
}

export interface ExtractedRegisterWarning {
  code: string;
  severity: RegisterWarningSeverity | string;
  message: string;
  item_type?: string | null;
  index?: number | null;
}

/** Register data the second AI pass extracted from one document (normalized and quote-verified by the backend). */
export interface ExtractedRegister {
  agreements: ExtractedRegisterItem[];
  ownerships: ExtractedRegisterItem[];
  acquisitions: ExtractedRegisterItem[];
  insurance_policies: ExtractedRegisterItem[];
  utilities: ExtractedRegisterItem[];
  compliance_items: ExtractedRegisterItem[];
  assets: ExtractedRegisterItem[];
  recurring_obligations: ExtractedRegisterItem[];
  property_master?: ExtractedRegisterItem | null;
  document?: { expiry_date?: string | null; signature_status?: string | null };
  warnings: ExtractedRegisterWarning[];
  stats: Record<string, number>;
}

/** What confirming a document actually wrote (job.user_corrected_data.register_result). */
export interface RegisterApplyResult {
  applied: Record<string, Record<string, number>>;
  conflicts: Array<{ entity: string; field: string; existing: unknown; incoming: unknown; index?: number }>;
  issues: Array<{ entity: string; severity: string; code: string; message: string; index?: number }>;
  unmatched_items?: number;
  error?: string;
}

export interface Party {
  id: string;
  party_type: 'INDIVIDUAL' | 'COMPANY' | 'GOVERNMENT' | 'OTHER' | 'UNKNOWN' | string;
  legal_name: string;
  display_name?: string | null;
  registration_reference?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
}

export interface PropertyRegister {
  property_id: string;
  as_of: string;
  financials_restricted: boolean;
  tenure: PropertyTenure | null;
  addresses: PropertyAddressRecord[];
  ownerships: PropertyOwnership[];
  acquisitions: PropertyAcquisition[];
  agreements: PropertyAgreement[];
  recurring_obligations: RecurringObligation[];
  payments: RegisterPayment[];
  assets: PropertyAsset[];
  work_orders: PropertyWorkOrder[];
  utilities: PropertyUtility[];
  insurance_policies: PropertyInsurancePolicy[];
  compliance_items: PropertyComplianceItem[];
  compliance_issues: ComplianceIssue[];
  warnings: RegisterWarning[];
}
