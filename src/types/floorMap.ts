export interface WallMeshPolygon {
  outer: Array<[number, number]>;
  holes: Array<Array<[number, number]>>;
}

export interface WallMeshData {
  kind: "wall_mesh";
  aspect: number;
  wall_height: number;
  polygons: WallMeshPolygon[];
}

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
  scene_json?: FloorMapScene | WallMeshData | null;
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
  building_type?: "office" | "residential" | string;
  workstations: number;
  meeting_rooms: number;
  pantry: boolean;
  reception: boolean;
  executive_cabins: number;
  layout_type: string;
  density: string;
  zones: string[];
  estimated_capacity: number;
  estimated_width_m?: number | null;
  floor_shape?: string;
  orientation?: string;
  rooms?: Array<{
    name: string;
    room_type: string;
    dimensions?: string;
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

export interface SceneWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  height: number;
  material: "solid" | "glass" | "exterior";
}

export interface SceneDoor {
  id: string;
  x: number;
  y: number;
  width: number;
  angle: number;
}

export interface SceneRoom {
  id: string;
  name: string;
  room_type: string;
  bounds: { x: number; y: number; width: number; depth: number };
  center: { x: number; y: number };
  area_sqm: number;
}

export interface SceneFurniture {
  id: string;
  kind: "workstation" | "meeting_table" | "chair" | "pantry_counter" | "reception_desk" | "lounge" | string;
  shape: "rectangular" | "round" | string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  seats: number;
  room_id?: string | null;
  label?: string;
}

export interface FloorMapScene {
  version: number;
  width_m: number;
  depth_m: number;
  wall_height_m: number;
  image_width_px: number;
  image_height_px: number;
  crop_norm?: { x: number; y: number; w: number; h: number };
  walls: SceneWall[];
  doors: SceneDoor[];
  rooms: SceneRoom[];
  furniture: SceneFurniture[];
}

export interface LayoutIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "circulation" | "ergonomics" | "acoustics" | "wayfinding" | "capacity" | string;
  title: string;
  detail: string;
  recommendation: string;
  x: number;
  y: number;
}

export interface LayoutEvaluation {
  overall_score: number;
  category_scores: {
    circulation: number;
    ergonomics: number;
    acoustics: number;
    capacity: number;
  };
  metrics: {
    total_area_sqm: number;
    total_area_sqft: number;
    workstation_count: number;
    meeting_seats: number;
    seat_count: number;
    sqm_per_seat: number;
    sqft_per_seat: number;
    min_aisle_width_m: number;
    room_count: number;
    wall_count: number;
    has_reception?: boolean;
    has_pantry?: boolean;
  };
  issues: LayoutIssue[];
  ai_summary: string;
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
  scene_json?: FloorMapScene | null;
  evaluation_json?: LayoutEvaluation | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  renders?: FloorMapRender[];
}
