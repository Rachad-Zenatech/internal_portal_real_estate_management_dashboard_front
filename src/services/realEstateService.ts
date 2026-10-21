import { apiClient } from './apiClient';
import type {
  Location,
  Property,
  Unit,
  MaintenanceBlock,
  Lease,
  LeaseVersion,
  LeaseExtractionJob,
  Stay,
  StayCreateRequest,
  PropertyDocument,
  PropertyObligation,
  PropertyPayment,
  RealEstateSummary,
  AccountingSummary,
  BulkImportPayload,
  BulkImportResponse,
  PropertyExtractionJob,
  PropertyInspection,
  PropertyInspectionFinding,
  PropertyActivityLog,
  ExtractionEngineStatus,
} from '@/types';

export const realEstateService = {
  // Summary KPI & Executive Portfolio Metrics
  async getSummary(): Promise<RealEstateSummary> {
    return apiClient.get<RealEstateSummary>('/api/real-estate/summary');
  },

  // Locations
  async getLocations(): Promise<Location[]> {
    return apiClient.get<Location[]>('/api/real-estate/locations');
  },

  async getLocation(id: string): Promise<Location> {
    return apiClient.get<Location>(`/api/real-estate/locations/${id}`);
  },

  async createLocation(data: Partial<Location>): Promise<Location> {
    return apiClient.post<Location>('/api/real-estate/locations', data);
  },

  async updateLocation(id: string, data: Partial<Location>): Promise<Location> {
    return apiClient.put<Location>(`/api/real-estate/locations/${id}`, data);
  },

  // Properties
  async getProperties(params?: {
    location_id?: string;
    city?: string;
    category?: string;
    ownership_type?: string;
    is_ma?: boolean;
    status?: string;
    inventory_status?: string;
    search?: string;
    include_archived?: boolean;
  }): Promise<Property[]> {
    const query = new URLSearchParams();
    if (params?.location_id) query.set('location_id', params.location_id);
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.ownership_type && params.ownership_type !== 'ALL') query.set('ownership_type', params.ownership_type);
    if (params?.is_ma !== undefined) query.set('is_ma', String(params.is_ma));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.inventory_status && params.inventory_status !== 'ALL') query.set('inventory_status', params.inventory_status);
    if (params?.search) query.set('search', params.search);
    if (params?.include_archived) query.set('include_archived', 'true');
    const qs = query.toString();
    return apiClient.get<Property[]>(`/api/real-estate/properties${qs ? `?${qs}` : ''}`);
  },

  async getPropertyDetails(id: string): Promise<Property> {
    return apiClient.get<Property>(`/api/real-estate/properties/${id}`);
  },

  async createProperty(data: Partial<Property>): Promise<Property> {
    return apiClient.post<Property>('/api/real-estate/properties', data);
  },

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    return apiClient.put<Property>(`/api/real-estate/properties/${id}`, data);
  },

  async verifyInventory(id: string, status: string, notes?: string): Promise<Property> {
    return apiClient.put<Property>(`/api/real-estate/properties/${id}/verify-inventory`, { status, notes });
  },

  async archiveProperty(id: string, archive: boolean = true): Promise<Property> {
    return apiClient.put<Property>(`/api/real-estate/properties/${id}/archive?archive=${archive}`, {});
  },

  // Units & Availability
  async getUnits(params?: {
    property_id?: string;
    location_id?: string;
    city?: string;
    unit_type?: string;
    status?: string;
    is_bookable?: boolean;
    check_in?: string;
    check_out?: string;
    guest_count?: number;
    bedrooms?: number;
    available_only?: boolean;
    include_archived?: boolean;
  }): Promise<Unit[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.location_id) query.set('location_id', params.location_id);
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.unit_type && params.unit_type !== 'ALL') query.set('unit_type', params.unit_type);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.is_bookable !== undefined) query.set('is_bookable', String(params.is_bookable));
    if (params?.check_in) query.set('check_in', params.check_in);
    if (params?.check_out) query.set('check_out', params.check_out);
    if (params?.guest_count) query.set('guest_count', String(params.guest_count));
    if (params?.bedrooms) query.set('bedrooms', String(params.bedrooms));
    if (params?.available_only) query.set('available_only', 'true');
    if (params?.include_archived) query.set('include_archived', 'true');
    const qs = query.toString();
    return apiClient.get<Unit[]>(`/api/real-estate/units${qs ? `?${qs}` : ''}`);
  },

  async createUnit(data: Partial<Unit>): Promise<Unit> {
    return apiClient.post<Unit>('/api/real-estate/units', data);
  },

  async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
    return apiClient.put<Unit>(`/api/real-estate/units/${id}`, data);
  },

  async archiveUnit(id: string, archive: boolean = true): Promise<Unit> {
    return apiClient.put<Unit>(`/api/real-estate/units/${id}/archive?archive=${archive}`, {});
  },

  // Maintenance Blocks
  async getMaintenanceBlocks(unitId?: string): Promise<MaintenanceBlock[]> {
    return apiClient.get<MaintenanceBlock[]>(`/api/real-estate/maintenance-blocks${unitId ? `?unit_id=${unitId}` : ''}`);
  },

  async createMaintenanceBlock(data: { unit_id: string; start_date: string; end_date: string; reason: string; notes?: string }): Promise<MaintenanceBlock> {
    return apiClient.post<MaintenanceBlock>('/api/real-estate/maintenance-blocks', data);
  },

  async deleteMaintenanceBlock(blockId: string): Promise<void> {
    return apiClient.delete(`/api/real-estate/maintenance-blocks/${blockId}`);
  },

  // Stays & Bookings
  async getBookings(params?: {
    city?: string;
    unit_id?: string;
    property_id?: string;
    location_id?: string;
    status?: string;
  }): Promise<Stay[]> {
    const query = new URLSearchParams();
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.unit_id) query.set('unit_id', params.unit_id);
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.location_id) query.set('location_id', params.location_id);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    const qs = query.toString();
    return apiClient.get<Stay[]>(`/api/real-estate/bookings${qs ? `?${qs}` : ''}`);
  },

  async createBooking(data: StayCreateRequest): Promise<Stay> {
    return apiClient.post<Stay>('/api/real-estate/bookings', data);
  },

  async updateBookingStatus(stayId: string, status: string, notes?: string): Promise<Stay> {
    return apiClient.put<Stay>(`/api/real-estate/bookings/${stayId}/status`, { status, notes });
  },

  // Leases & Versions
  async getLeases(propertyId?: string, status?: string): Promise<Lease[]> {
    const query = new URLSearchParams();
    if (propertyId) query.set('property_id', propertyId);
    if (status && status !== 'ALL') query.set('status', status);
    const qs = query.toString();
    return apiClient.get<Lease[]>(`/api/real-estate/leases${qs ? `?${qs}` : ''}`);
  },

  async createLease(data: Partial<Lease>): Promise<Lease> {
    return apiClient.post<Lease>('/api/real-estate/leases', data);
  },

  async updateLease(id: string, data: Partial<Lease>): Promise<Lease> {
    return apiClient.put<Lease>(`/api/real-estate/leases/${id}`, data);
  },

  async getLeaseVersions(leaseId: string): Promise<LeaseVersion[]> {
    return apiClient.get<LeaseVersion[]>(`/api/real-estate/leases/${leaseId}/versions`);
  },

  // Document Vault & PDF Upload
  async getDocuments(params?: {
    property_id?: string;
    document_type?: string;
  }): Promise<PropertyDocument[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.document_type && params.document_type !== 'ALL') {
      query.set('document_type', params.document_type);
    }
    const qs = query.toString();
    return apiClient.get<PropertyDocument[]>(`/api/real-estate/documents${qs ? `?${qs}` : ''}`);
  },

  async uploadDocument(formData: FormData): Promise<PropertyDocument> {
    return apiClient.post<PropertyDocument>('/api/real-estate/documents/upload', formData);
  },

  async uploadLeaseAndExtract(formData: FormData): Promise<LeaseExtractionJob> {
    return apiClient.post<LeaseExtractionJob>('/api/real-estate/leases/upload-and-extract', formData);
  },

  async getExtractionJob(jobId: string): Promise<LeaseExtractionJob> {
    return apiClient.get<LeaseExtractionJob>(`/api/real-estate/extraction-jobs/${jobId}`);
  },

  async confirmLeaseExtraction(jobId: string, data: Record<string, any>): Promise<Lease> {
    return apiClient.post<Lease>(`/api/real-estate/extraction-jobs/${jobId}/confirm`, data);
  },

  // Accounting Workspace
  async getAccountingSummary(): Promise<AccountingSummary> {
    return apiClient.get<AccountingSummary>('/api/real-estate/accounting/summary');
  },

  async getObligations(params?: {
    property_id?: string;
    location_id?: string;
    obligation_type?: string;
    currency?: string;
    status?: string;
    due_from?: string;
    due_to?: string;
  }): Promise<PropertyObligation[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.location_id) query.set('location_id', params.location_id);
    if (params?.obligation_type && params.obligation_type !== 'ALL') query.set('obligation_type', params.obligation_type);
    if (params?.currency && params.currency !== 'ALL') query.set('currency', params.currency);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.due_from) query.set('due_from', params.due_from);
    if (params?.due_to) query.set('due_to', params.due_to);
    const qs = query.toString();
    return apiClient.get<PropertyObligation[]>(`/api/real-estate/accounting/obligations${qs ? `?${qs}` : ''}`);
  },

  async createObligation(data: Partial<PropertyObligation>): Promise<PropertyObligation> {
    return apiClient.post<PropertyObligation>('/api/real-estate/accounting/obligations', data);
  },

  async generateRentObligations(year: number, month: number, propertyId?: string): Promise<{ success: boolean; created_count: number; skipped_count: number }> {
    return apiClient.post('/api/real-estate/accounting/generate-rent-obligations', {
      year,
      month,
      property_id: propertyId,
    });
  },

  async recordPayment(data: {
    obligation_id: string;
    amount_paid: number;
    currency?: string;
    payment_date: string;
    payment_method: string;
    transaction_reference?: string;
    payment_evidence_document_id?: string;
    notes?: string;
  }): Promise<PropertyPayment> {
    return apiClient.post<PropertyPayment>('/api/real-estate/accounting/payments', data);
  },

  async verifyPayment(paymentId: string, verification_status: string, verification_notes?: string): Promise<PropertyPayment> {
    return apiClient.put<PropertyPayment>(`/api/real-estate/accounting/payments/${paymentId}/verify`, {
      verification_status,
      verification_notes,
    });
  },

  async reversePayment(paymentId: string, reversal_reason: string): Promise<PropertyPayment> {
    return apiClient.put<PropertyPayment>(`/api/real-estate/accounting/payments/${paymentId}/reverse`, {
      reversal_reason,
    });
  },

  // Bulk Ingestion
  async bulkImportSpreadsheet(payload: BulkImportPayload): Promise<BulkImportResponse> {
    return apiClient.post<BulkImportResponse>('/api/real-estate/bulk-import', payload);
  },

  // Configuration & Alert Rules
  async getConfiguration(): Promise<Record<string, any>> {
    return apiClient.get<Record<string, any>>('/api/real-estate/configuration');
  },

  async updateConfiguration(settings: Record<string, any>): Promise<Record<string, any>> {
    return apiClient.put<Record<string, any>>('/api/real-estate/configuration', settings);
  },

  async triggerAlertsCheck(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/api/real-estate/alerts/check');
  },

  // Document-Driven Property & Inspection Extraction Pipeline
  async uploadAndExtractDocuments(formData: FormData): Promise<PropertyExtractionJob[]> {
    return apiClient.post<PropertyExtractionJob[]>('/api/real-estate/documents/extract', formData);
  },

  async getPropertyExtractionJobs(status?: string): Promise<PropertyExtractionJob[]> {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<PropertyExtractionJob[]>(`/api/real-estate/property-extraction-jobs${qs}`);
  },

  async getPropertyExtractionJob(jobId: string): Promise<PropertyExtractionJob> {
    return apiClient.get<PropertyExtractionJob>(`/api/real-estate/property-extraction-jobs/${jobId}`);
  },

  async retryPropertyExtractionJob(jobId: string, engineMode?: string, ocrLanguages?: string): Promise<PropertyExtractionJob> {
    const params = new URLSearchParams();
    if (engineMode) params.set('engine_mode', engineMode);
    if (ocrLanguages) params.set('ocr_languages', ocrLanguages);
    const qs = params.toString();
    return apiClient.post<PropertyExtractionJob>(`/api/real-estate/property-extraction-jobs/${jobId}/retry${qs ? `?${qs}` : ''}`);
  },

  async confirmPropertyExtractionJob(
    jobId: string,
    payload: {
      action_type: 'CREATE_NEW' | 'UPDATE_EXISTING' | string;
      target_property_id?: string | null;
      property_data: Record<string, any>;
      create_inspections?: boolean;
    }
  ): Promise<Property> {
    return apiClient.post<Property>(`/api/real-estate/property-extraction-jobs/${jobId}/confirm`, payload);
  },

  async deleteExtractionJob(jobId: string): Promise<void> {
    return apiClient.delete(`/api/real-estate/property-extraction-jobs/${jobId}`);
  },

  async cleanupUnconfirmedExtractionJobs(jobIds?: string[]): Promise<{ count: number }> {
    return apiClient.post<{ count: number }>('/api/real-estate/property-extraction-jobs/cleanup-unconfirmed', jobIds || null);
  },

  async deleteDocument(documentId: string): Promise<void> {
    return apiClient.delete(`/api/real-estate/documents/${documentId}`);
  },

  getDocumentPageImageUrl(documentId: string, pageNum: number): string {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `/api/real-estate/documents/${documentId}/page-image/${pageNum}${query}`;
  },

  getDocumentFileUrl(documentId: string): string {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `/api/real-estate/documents/${documentId}/file${query}`;
  },

  async getCurrencies(): Promise<{ currencies: Array<{ code: string; name: string; symbol: string; is_popular?: boolean }>; total: number }> {
    return apiClient.get('/api/real-estate/currencies');
  },

  async getPropertyInspections(propertyId: string): Promise<PropertyInspection[]> {
    return apiClient.get<PropertyInspection[]>(`/api/real-estate/properties/${propertyId}/inspections`);
  },

  async updateInspectionFinding(
    findingId: string,
    payload: {
      follow_up_status: string;
      responsible_person?: string | null;
      resolution_notes?: string | null;
    }
  ): Promise<PropertyInspectionFinding> {
    return apiClient.patch<PropertyInspectionFinding>(`/api/real-estate/inspections/findings/${findingId}`, payload);
  },

  async getPropertyActivity(propertyId: string): Promise<PropertyActivityLog[]> {
    return apiClient.get<PropertyActivityLog[]>(`/api/real-estate/properties/${propertyId}/activity`);
  },

  async getExtractionEngineStatus(): Promise<ExtractionEngineStatus> {
    return apiClient.get<ExtractionEngineStatus>('/api/real-estate/extraction-engine-status');
  },
};
