import { useState } from "react";
import { Plus, Trash2, Map, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import type { FloorMapProject } from "../../types/floorMap";

interface ProjectSidebarProps {
  projects: FloorMapProject[];
  activeId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  onSelect: (id: string) => void;
  onCreate: (payload: { name: string; floor_label?: string }) => void;
  onDelete: (id: string) => void;
}

export function ProjectSidebar({
  projects,
  activeId,
  isLoading,
  isCreating,
  onSelect,
  onCreate,
  onDelete,
}: ProjectSidebarProps) {
  const [name, setName] = useState("");
  const [floorLabel, setFloorLabel] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), floor_label: floorLabel.trim() || undefined });
    setName("");
    setFloorLabel("");
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Map className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Floor Map Projects</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name (e.g. HQ Suite 400)"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        />
        <div className="flex gap-2">
          <input
            value={floorLabel}
            onChange={(e) => setFloorLabel(e.target.value)}
            placeholder="Floor (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          />
          <Button type="submit" size="sm" disabled={isCreating || !name.trim()} className="shrink-0 gap-1">
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            New
          </Button>
        </div>
      </form>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
        {isLoading && <p className="text-xs text-muted-foreground py-4 text-center">Loading projects...</p>}
        {!isLoading && projects.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">Create a project to upload a floor plan.</p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`group flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
              p.id === activeId ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {p.floor_label ? `${p.floor_label} · ` : ""}
                {p.status}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
