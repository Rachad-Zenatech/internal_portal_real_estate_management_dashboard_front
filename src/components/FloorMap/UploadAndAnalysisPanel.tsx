import { Upload, Sparkles, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { AuthImage } from "./AuthImage";
import { floorMapService } from "../../services/floorMapService";
import type { FloorMapProject } from "../../types/floorMap";

interface UploadAndAnalysisPanelProps {
  project: FloorMapProject;
  isUploading: boolean;
  isAnalyzing: boolean;
  onUpload: (file: File) => void;
  onAnalyze: () => void;
}

export function UploadAndAnalysisPanel({
  project,
  isUploading,
  isAnalyzing,
  onUpload,
  onAnalyze,
}: UploadAndAnalysisPanelProps) {
  const analysis = project.analysis_json;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">1. Upload & AI Vision Analysis</h3>
          <p className="text-xs text-muted-foreground">Upload a 2D floor plan image (PNG, JPG, WEBP) and run Bedrock Vision analysis.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>{project.has_floorplan_image ? "Replace Floorplan" : "Upload Floorplan"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button size="sm" onClick={onAnalyze} disabled={!project.has_floorplan_image || isAnalyzing} className="gap-1.5">
            {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Analyze Floorplan
          </Button>
        </div>
      </div>

      {project.has_floorplan_image && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            <AuthImage
              cacheKey={`${project.id}-${project.updated_at}`}
              fetchBlob={() => floorMapService.getFloorplanBlob(project.id)}
              alt={project.name}
              className="w-full max-h-64 object-contain"
            />
          </div>
          {analysis ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Workstations:</span> <strong>{analysis.workstations}</strong></div>
                <div><span className="text-muted-foreground">Meeting Rooms:</span> <strong>{analysis.meeting_rooms}</strong></div>
                <div><span className="text-muted-foreground">Executive Cabins:</span> <strong>{analysis.executive_cabins}</strong></div>
                <div><span className="text-muted-foreground">Capacity:</span> <strong>{analysis.estimated_capacity}</strong></div>
                <div><span className="text-muted-foreground">Layout:</span> <strong>{analysis.layout_type}</strong></div>
                <div><span className="text-muted-foreground">Pantry / Reception:</span> <strong>{analysis.pantry ? "Yes" : "No"} / {analysis.reception ? "Yes" : "No"}</strong></div>
              </div>
              {analysis.zones?.length > 0 && (
                <p className="text-muted-foreground pt-1">
                  Zones: <span className="text-foreground">{analysis.zones.join(", ")}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-lg">
              Click <strong>Analyze Floorplan</strong> to detect rooms, workstations, meeting tables, and zones.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
