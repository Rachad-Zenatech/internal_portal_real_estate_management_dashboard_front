import { apiClient } from './apiClient';
import type {
  Property,
  Unit,
  Stay,
  StayCreateRequest,
  PropertyDocument,
  PropertyObligation,
  RealEstateSummary,
  BulkImportPayload,
  BulkImportResponse,
} from '@/types';

export const realEstateService = {
  // Summary KPI & CEO Portfolio Metrics
  async getSummary(): Promise<RealEstateSummary> {
    return apiClient.get<RealEstateSummary>('/api/real-estate/summary');
  },

  // Properties
  async getProperties(params?: {
    city?: string;
    category?: string;
    is_ma?: boolean;
    status?: string;
    search?: string;
  }): Promise<Property[]> {
    const query = new URLSearchParams();
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.is_ma !== undefined) query.set('is_ma', String(params.is_ma));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
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

  // Bulk Spreadsheet Ingestion (Vanessa & Team)
  async bulkImportSpreadsheet(payload: BulkImportPayload): Promise<BulkImportResponse> {
    return apiClient.post<BulkImportResponse>('/api/real-estate/bulk-import', payload);
  },

  // Units & Availability
  async getUnits(params?: {
    property_id?: string;
    city?: string;
    status?: string;
    check_in?: string;
    check_out?: string;
  }): Promise<Unit[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.check_in) query.set('check_in', params.check_in);
    if (params?.check_out) query.set('check_out', params.check_out);
    const qs = query.toString();
    return apiClient.get<Unit[]>(`/api/real-estate/units${qs ? `?${qs}` : ''}`);
  },

  async getUnitDetails(id: string): Promise<Unit> {
    return apiClient.get<Unit>(`/api/real-estate/units/${id}`);
  },

  // Stays / Bookings
  async getBookings(params?: {
    unit_id?: string;
    city?: string;
    status?: string;
  }): Promise<Stay[]> {
    const query = new URLSearchParams();
    if (params?.unit_id) query.set('unit_id', params.unit_id);
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    const qs = query.toString();
    return apiClient.get<Stay[]>(`/api/real-estate/bookings${qs ? `?${qs}` : ''}`);
  },

  async createBooking(data: StayCreateRequest): Promise<Stay> {
    return apiClient.post<Stay>('/api/real-estate/bookings', data);
  },

  async updateBookingStatus(
    stayId: string,
    status: string,
    notes?: string
  ): Promise<Stay> {
    return apiClient.put<Stay>(`/api/real-estate/bookings/${stayId}/status`, {
      status,
      notes,
    });
  },

  // Documents & Floor Plans
  async getDocuments(params?: {
    property_id?: string;
    document_type?: string;
    search?: string;
  }): Promise<PropertyDocument[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.document_type && params.document_type !== 'ALL') {
      query.set('document_type', params.document_type);
    }
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiClient.get<PropertyDocument[]>(`/api/real-estate/documents${qs ? `?${qs}` : ''}`);
  },

  async createDocument(data: Partial<PropertyDocument>): Promise<PropertyDocument> {
    return apiClient.post<PropertyDocument>('/api/real-estate/documents', data);
  },

  // Obligations (Rent, CAM, Taxes)
  async getObligations(params?: {
    property_id?: string;
    is_paid?: boolean;
    status?: string;
    obligation_type?: string;
  }): Promise<PropertyObligation[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.is_paid !== undefined) query.set('is_paid', String(params.is_paid));
    if (params?.obligation_type && params.obligation_type !== 'ALL') {
      query.set('obligation_type', params.obligation_type);
    }
    const qs = query.toString();
    return apiClient.get<PropertyObligation[]>(`/api/real-estate/obligations${qs ? `?${qs}` : ''}`);
  },

  async createObligation(data: Partial<PropertyObligation>): Promise<PropertyObligation> {
    return apiClient.post<PropertyObligation>('/api/real-estate/obligations', data);
  },

  async markObligationPaid(
    obligationId: string,
    data: { paid_date?: string; paid_by?: string; reference_number?: string; notes?: string }
  ): Promise<PropertyObligation> {
    return apiClient.put<PropertyObligation>(`/api/real-estate/obligations/${obligationId}/pay`, data);
  },
};
