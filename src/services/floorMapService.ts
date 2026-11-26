import { apiClient } from "./apiClient";
import type {
  FloorMapAnalysis,
  FloorMapDesignStrategy,
  FloorMapProject,
  FloorMapQuestion,
  FloorMapRender,
  FloorMapScene,
  LayoutEvaluation,
} from "../types/floorMap";

const BASE = "/api/floor-map";

export const floorMapService = {
  listProjects(propertyId?: string): Promise<FloorMapProject[]> {
    const qs = propertyId ? `?property_id=${encodeURIComponent(propertyId)}` : "";
    return apiClient.get<FloorMapProject[]>(`${BASE}/projects${qs}`);
  },

  createProject(payload: { name: string; floor_label?: string; property_id?: string }): Promise<FloorMapProject> {
    return apiClient.post<FloorMapProject>(`${BASE}/projects`, payload);
  },

  getProject(projectId: string): Promise<FloorMapProject> {
    return apiClient.get<FloorMapProject>(`${BASE}/projects/${projectId}`);
  },

  deleteProject(projectId: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/projects/${projectId}`);
  },

  uploadFloorplan(projectId: string, file: File): Promise<FloorMapProject> {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<FloorMapProject>(`${BASE}/projects/${projectId}/upload`, form);
  },

  getFloorplanBlob(projectId: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/projects/${projectId}/floorplan-image`);
  },

  analyze(projectId: string): Promise<{ status: string; analysis: FloorMapAnalysis }> {
    return apiClient.post(`${BASE}/projects/${projectId}/analyze`, {});
  },

  generateQuestions(projectId: string): Promise<{ status: string; questions: FloorMapQuestion[] }> {
    return apiClient.post(`${BASE}/projects/${projectId}/questions`, {});
  },

  saveAnswers(
    projectId: string,
    answers: Array<{ question_index: number; selected_answer: string }>
  ): Promise<{ status: string; questions: FloorMapQuestion[] }> {
    return apiClient.post(`${BASE}/projects/${projectId}/answers`, { answers });
  },

  generateDesign(projectId: string): Promise<{ status: string; design_strategy: FloorMapDesignStrategy }> {
    return apiClient.post(`${BASE}/projects/${projectId}/design`, {});
  },

  generateRender(projectId: string, renderType: "2d" | "3d" = "3d"): Promise<FloorMapRender> {
    return apiClient.post<FloorMapRender>(`${BASE}/projects/${projectId}/renders`, { render_type: renderType });
  },

  improveRender(
    projectId: string,
    payload: { instructions: string; base_render_id?: string; mask_data_url?: string }
  ): Promise<FloorMapRender> {
    return apiClient.post<FloorMapRender>(`${BASE}/projects/${projectId}/renders/improve`, payload);
  },

  getRenderBlob(renderId: string, format: "png" | "jpg" | "webp" = "png"): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/renders/${renderId}/image?format=${format}`);
  },

  downloadRender(renderId: string, format: "png" | "jpg" | "webp" = "png"): Promise<void> {
    return apiClient.downloadFile(`${BASE}/renders/${renderId}/image?format=${format}&download=true`, `floor-map-${renderId}.${format}`);
  },

  activateRender(projectId: string, renderId: string): Promise<FloorMapRender> {
    return apiClient.post<FloorMapRender>(`${BASE}/projects/${projectId}/renders/${renderId}/activate`, {});
  },

  rotateRender(renderId: string, degrees = 90): Promise<FloorMapRender> {
    return apiClient.post<FloorMapRender>(`${BASE}/renders/${renderId}/rotate`, { degrees });
  },

  deleteRender(renderId: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/renders/${renderId}`);
  },

  extractScene(
    projectId: string,
    payload: { width_m?: number; wall_height_m?: number } = {}
  ): Promise<{ scene: FloorMapScene; evaluation: LayoutEvaluation }> {
    return apiClient.post(`${BASE}/projects/${projectId}/scene/extract`, payload);
  },

  updateScene(
    projectId: string,
    scene: FloorMapScene
  ): Promise<{ scene: FloorMapScene; evaluation: LayoutEvaluation }> {
    return apiClient.patch(`${BASE}/projects/${projectId}/scene`, { scene });
  },

  evaluateScene(
    projectId: string,
    includeAiCritique = true
  ): Promise<LayoutEvaluation> {
    return apiClient.post(`${BASE}/projects/${projectId}/evaluate`, { include_ai_critique: includeAiCritique });
  },

  getPropertyFloorMap(propertyId: string): Promise<FloorMapProject | null> {
    return apiClient.get<FloorMapProject | null>(`${BASE}/properties/${propertyId}`);
  },

  uploadPropertyFloorPlan(
    propertyId: string,
    file: File,
    propertyName?: string
  ): Promise<FloorMapProject> {
    const form = new FormData();
    form.append("file", file);
    const qs = propertyName ? `?property_name=${encodeURIComponent(propertyName)}` : "";
    return apiClient.post<FloorMapProject>(`${BASE}/properties/${propertyId}/upload${qs}`, form);
  },
};
