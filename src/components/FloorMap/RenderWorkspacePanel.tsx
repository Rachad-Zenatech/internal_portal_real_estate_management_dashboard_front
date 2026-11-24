import { useState } from "react";
import { Wand2, RotateCw, Download, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { AuthImage } from "./AuthImage";
import { floorMapService } from "../../services/floorMapService";
import type { FloorMapProject } from "../../types/floorMap";

interface RenderWorkspacePanelProps {
  project: FloorMapProject;
  isGeneratingRender: boolean;
  isImprovingRender: boolean;
  onGenerateRender: (renderType: "2d" | "3d") => void;
  onImproveRender: (instructions: string, baseRenderId?: string) => void;
  onRotateRender: (renderId: string) => void;
  onActivateRender: (renderId: string) => void;
  onDeleteRender: (renderId: string) => void;
}

export function RenderWorkspacePanel({
  project,
  isGeneratingRender,
  isImprovingRender,
  onGenerateRender,
  onImproveRender,
  onRotateRender,
  onActivateRender,
  onDeleteRender,
}: RenderWorkspacePanelProps) {
  const [instructions, setInstructions] = useState("");
  const renders = project.renders || [];
  const activeRender = renders.find((r) => r.is_active) || renders[0] || null;

  const handleImprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructions.trim() || !activeRender) return;
    onImproveRender(instructions.trim(), activeRender.id);
    setInstructions("");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">3. 2D / 3D Floor Map Renders & Revisions</h3>
          <p className="text-xs text-muted-foreground">Generate 2D or 3D floor maps, request revisions, rotate, and export.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onGenerateRender("2d")} disabled={!project.analysis_json || isGeneratingRender}>
            {isGeneratingRender ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Generate 2D
          </Button>
          <Button size="sm" onClick={() => onGenerateRender("3d")} disabled={!project.analysis_json || isGeneratingRender}>
            {isGeneratingRender ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Generate 3D
          </Button>
        </div>
      </div>

      {activeRender && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            <AuthImage
              cacheKey={`${activeRender.id}-${activeRender.image_rotation}`}
              fetchBlob={() => floorMapService.getRenderBlob(activeRender.id, "png")}
              alt={`Render v${activeRender.revision_number}`}
              className="w-full max-h-[420px] object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Rev {activeRender.revision_number} · {activeRender.render_type.toUpperCase()} · {activeRender.model_used}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => onRotateRender(activeRender.id)} className="h-7 text-xs gap-1">
                <RotateCw className="h-3 w-3" /> Rotate 90°
              </Button>
              {(["png", "jpg", "webp"] as const).map((fmt) => (
                <Button key={fmt} size="sm" variant="outline" onClick={() => floorMapService.downloadRender(activeRender.id, fmt)} className="h-7 text-xs gap-1 uppercase">
                  <Download className="h-3 w-3" /> {fmt}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleImprove} className="flex gap-2">
            <input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe a revision (e.g. 'Make meeting room table round and add warm oak flooring')"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
            />
            <Button type="submit" size="sm" disabled={!instructions.trim() || isImprovingRender}>
              {isImprovingRender ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Apply Revision
            </Button>
          </form>
        </div>
      )}

      {renders.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {renders.map((r) => (
            <div key={r.id} className={`rounded-lg border p-2 text-xs space-y-1.5 ${r.is_active ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Rev {r.revision_number} ({r.render_type.toUpperCase()})</span>
                <div className="flex items-center gap-1">
                  {!r.is_active && (
                    <button type="button" onClick={() => onActivateRender(r.id)} title="Set active" className="text-muted-foreground hover:text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => onDeleteRender(r.id)} title="Delete" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {r.improvement_notes && <p className="text-[11px] text-muted-foreground truncate">{r.improvement_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
