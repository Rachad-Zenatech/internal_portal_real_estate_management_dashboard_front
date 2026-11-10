import { apiClient } from './apiClient';
import type {
  AddressSuggestion, Property, PropertyDocument, PropertyInput, ResearchRequest, ResearchResult, ResearchStatusInfo,
} from '@/types/realEstate';

export interface PropertyListParams {
  search?: string;
  status?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export const realEstateService = {
  async getProperties(params: PropertyListParams = {}): Promise<Property[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '' && value !== 'ALL') query.set(key, String(value));
    }
    const qs = query.toString();
    return apiClient.get<Property[]>(`/api/real-estate/properties${qs ? `?${qs}` : ''}`);
  },

  async getProperty(id: string): Promise<Property> {
    return apiClient.get<Property>(`/api/real-estate/properties/${id}`);
  },

  /** Address typeahead (OpenStreetMap data through the Photon geocoder). */
  async suggestAddresses(q: string): Promise<AddressSuggestion[]> {
    return apiClient.get<AddressSuggestion[]>(`/api/real-estate/properties/suggest?q=${encodeURIComponent(q)}`, { skipGlobalLoading: true });
  },

  /** Common property types plus any custom type already in use, for the property-type autocomplete. */
  async listPropertyTypes(): Promise<string[]> {
    return apiClient.get<string[]>('/api/real-estate/properties/types', { skipGlobalLoading: true });
  },

  /** Checks the database first and only researches what is missing. Call after an address is chosen, not per keystroke. */
  async researchProperty(body: ResearchRequest): Promise<ResearchResult> {
    return apiClient.post<ResearchResult>('/api/real-estate/properties/research', body, { skipGlobalLoading: true });
  },

  async getResearchStatus(): Promise<ResearchStatusInfo> {
    return apiClient.get<ResearchStatusInfo>('/api/real-estate/properties/research/status', { skipGlobalLoading: true });
  },

  async getResearchJob(jobId: string): Promise<ResearchResult> {
    return apiClient.get<ResearchResult>(`/api/real-estate/properties/research/jobs/${jobId}`, { skipGlobalLoading: true });
  },

  /** Marks values a person typed or reviewed as confirmed; later research never overwrites them. */
  async confirmResearch(body: { cache_key: string; property_id?: string; fields: Record<string, unknown> }): Promise<{ confirmed: string[] }> {
    return apiClient.post<{ confirmed: string[] }>('/api/real-estate/properties/research/confirm', body, { skipGlobalLoading: true });
  },

  async createProperty(data: PropertyInput): Promise<Property> {
    return apiClient.post<Property>('/api/real-estate/properties', data);
  },

  async updateProperty(id: string, data: PropertyInput): Promise<Property> {
    return apiClient.put<Property>(`/api/real-estate/properties/${id}`, data);
  },

  async deleteProperty(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/real-estate/properties/${id}`);
  },

  // ─── Documents ────────────────────────────────────────────────────────────
  async listDocuments(propertyId: string): Promise<PropertyDocument[]> {
    return apiClient.get<PropertyDocument[]>(`/api/real-estate/properties/${propertyId}/documents`, { skipGlobalLoading: true });
  },

  async uploadDocuments(propertyId: string, files: File[]): Promise<PropertyDocument[]> {
    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    return apiClient.post<PropertyDocument[]>(`/api/real-estate/properties/${propertyId}/documents`, body, { actionLabel: 'Uploading documents', actionSubtitle: 'Saving the files to the property...' });
  },

  async deleteDocument(propertyId: string, documentId: string): Promise<void> {
    return apiClient.delete<void>(`/api/real-estate/properties/${propertyId}/documents/${documentId}`);
  },
};
