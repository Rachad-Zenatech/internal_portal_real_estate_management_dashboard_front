export interface FloorMapRender {
  id: string;
  project_id: string;
  render_type: string;
  mime_type: string;
  prompt_used: string;
  model_used: string;
  image_size: string;
  revision_number: number;
  image_rotation: number;
  improvement_notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FloorMapQuestion {
  index: number;
  category: string;
  question: string;
  options: string[];
  selected_answer?: string | null;
}

export interface FloorMapAnalysis {
  workstations: number;
  meeting_rooms: number;
  pantry: boolean;
  reception: boolean;
  executive_cabins: number;
  layout_type: string;
  density: string;
  zones: string[];
  estimated_capacity: number;
  floor_shape?: string;
  orientation?: string;
  rooms?: Array<{
    name: string;
    room_type: string;
    seat_count: number;
    table_shape: string;
    position: string;
  }>;
  workstation_groups?: Array<{
    name: string;
    desk_count: number;
    seat_count: number;
    arrangement: string;
    position: string;
  }>;
}

export interface FloorMapDesignStrategy {
  summary: string;
  map_type: "2d" | "3d" | string;
  color_palette: string[];
  materials: Record<string, string>;
  lighting: string;
  zoning_notes: string[];
  render_prompt: string;
}

export interface FloorMapProject {
  id: string;
  property_id?: string | null;
  user_id: string;
  name: string;
  floor_label?: string | null;
  has_floorplan_image: boolean;
  floorplan_mime_type?: string | null;
  analysis_json?: FloorMapAnalysis | null;
  questions_json?: FloorMapQuestion[] | null;
  design_strategy_json?: FloorMapDesignStrategy | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  renders?: FloorMapRender[];
}
