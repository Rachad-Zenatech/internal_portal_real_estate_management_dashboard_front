import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Loader2, Map as MapIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/PageKit";
import { Button } from "@/components/ui/button";
import { AuthImage } from "@/components/FloorMap/AuthImage";
import { floorMapService } from "@/services/floorMapService";
import type { WallMeshData } from "@/types/floorMap";

const InteractiveFloorPlan3D = lazy(() => import("@/components/FloorMap/InteractiveFloorPlan3D"));

function isWallMesh(scene: unknown): scene is WallMeshData {
  return Boolean(scene && typeof scene === "object" && (scene as WallMeshData).kind === "wall_mesh" && Array.isArray((scene as WallMeshData).polygons));
}

interface PropertyFloorPlanSectionProps {
  propertyId: string;
  propertyName: string;
  canEdit: boolean;
}

export default function PropertyFloorPlanSection({
  propertyId,
  propertyName,
  canEdit,
}: PropertyFloorPlanSectionProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"2d" | "3d">("2d");

  const { data: project, isLoading } = useQuery({
    queryKey: ["property-floor-map", propertyId],
    queryFn: () => floorMapService.getPropertyFloorMap(propertyId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => floorMapService.uploadPropertyFloorPlan(propertyId, file, propertyName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-floor-map", propertyId] });
      toast.success("Floor plan uploaded — 2D and 3D models generated & saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renders = project?.renders || [];
  const render2d = renders.find((r) => r.render_type === "2d") || null;
  const render3d = renders.find((r) => r.render_type === "3d") || null;
  const wallMesh = isWallMesh(render3d?.scene_json) ? render3d.scene_json : isWallMesh(project?.scene_json) ? project.scene_json : null;

  const uploadControl = canEdit ? (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
      {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      <span>{upload.isPending ? "Generating 2D & 3D..." : project ? "Replace Floor Plan" : "Upload Floor Plan"}</span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,application/pdf,image/*"
        className="hidden"
        disabled={upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
    </label>
  ) : null;

  return (
    <SectionCard
      title="Floor Plan (2D / 3D)"
      subtitle="Upload a floor plan (PDF or image) to automatically generate and save both 2D and interactive 3D views"
      actions={uploadControl}
    >
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading floor plan...
        </div>
      ) : !project || (!render2d && !render3d) ? (
        <p className="text-sm text-muted-foreground">
          No floor plan uploaded yet. Upload a 2D floor plan to automatically generate and save both 2D and 3D views.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={tab === "2d" ? "default" : "outline"} onClick={() => setTab("2d")} className="gap-1.5">
              <MapIcon className="h-3.5 w-3.5" /> 2D Floor Plan
            </Button>
            <Button size="sm" variant={tab === "3d" ? "default" : "outline"} onClick={() => setTab("3d")} className="gap-1.5">
              <Box className="h-3.5 w-3.5" /> 3D Model
            </Button>
          </div>

          {tab === "2d" && render2d ? (
            <div className="h-[460px] flex items-center justify-center rounded-lg border border-border overflow-hidden bg-slate-100 dark:bg-slate-900/40 p-2">
              <AuthImage
                cacheKey={`${render2d.id}-${project.updated_at}`}
                fetchBlob={() => floorMapService.getRenderBlob(render2d.id, "png")}
                alt={`${propertyName} 2D Floor Plan`}
                className="max-h-full max-w-full object-contain mx-auto"
              />
            </div>
          ) : wallMesh ? (
            <Suspense fallback={<div className="h-[460px] flex items-center justify-center text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading 3D model...</div>}>
              <InteractiveFloorPlan3D
                projectId={project.id}
                cacheKey={`${render3d?.id || project.id}-${project.updated_at}`}
                wallMesh={wallMesh}
              />
            </Suspense>
          ) : render3d ? (
            <div className="h-[460px] flex items-center justify-center rounded-lg border border-border overflow-hidden bg-slate-100 dark:bg-slate-900/40 p-2">
              <AuthImage
                cacheKey={`${render3d.id}-${project.updated_at}`}
                fetchBlob={() => floorMapService.getRenderBlob(render3d.id, "png")}
                alt={`${propertyName} 3D Floor Plan`}
                className="max-h-full max-w-full object-contain mx-auto"
              />
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
