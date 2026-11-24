import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { floorMapService } from "../services/floorMapService";

export function useFloorMap() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["floor-map", "projects"],
    queryFn: () => floorMapService.listProjects(),
  });

  const activeProjectId = selectedProjectId || projectsQuery.data?.[0]?.id || null;

  const projectQuery = useQuery({
    queryKey: ["floor-map", "project", activeProjectId],
    queryFn: () => floorMapService.getProject(activeProjectId!),
    enabled: Boolean(activeProjectId),
  });

  const refresh = (projectId?: string) => {
    qc.invalidateQueries({ queryKey: ["floor-map", "projects"] });
    const id = projectId || activeProjectId;
    if (id) qc.invalidateQueries({ queryKey: ["floor-map", "project", id] });
  };

  const createProject = useMutation({
    mutationFn: (payload: { name: string; floor_label?: string }) => floorMapService.createProject(payload),
    onSuccess: (created) => {
      setSelectedProjectId(created.id);
      refresh(created.id);
      toast.success("Floor map project created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => floorMapService.deleteProject(id),
    onSuccess: (_, id) => {
      if (selectedProjectId === id) setSelectedProjectId(null);
      refresh();
      toast.success("Project deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadFloorplan = useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      floorMapService.uploadFloorplan(projectId, file),
    onSuccess: () => {
      refresh();
      toast.success("Floorplan uploaded.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analyze = useMutation({
    mutationFn: (projectId: string) => floorMapService.analyze(projectId),
    onSuccess: () => {
      refresh();
      toast.success("Floorplan analysis complete.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateQuestions = useMutation({
    mutationFn: (projectId: string) => floorMapService.generateQuestions(projectId),
    onSuccess: () => {
      refresh();
      toast.success("Design questions generated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAnswers = useMutation({
    mutationFn: ({
      projectId,
      answers,
    }: {
      projectId: string;
      answers: Array<{ question_index: number; selected_answer: string }>;
    }) => floorMapService.saveAnswers(projectId, answers),
    onSuccess: () => {
      refresh();
      toast.success("Preferences saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateDesign = useMutation({
    mutationFn: (projectId: string) => floorMapService.generateDesign(projectId),
    onSuccess: () => {
      refresh();
      toast.success("Design strategy ready.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateRender = useMutation({
    mutationFn: ({ projectId, renderType }: { projectId: string; renderType: "2d" | "3d" }) =>
      floorMapService.generateRender(projectId, renderType),
    onSuccess: () => {
      refresh();
      toast.success("Floor map render generated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const improveRender = useMutation({
    mutationFn: ({
      projectId,
      instructions,
      baseRenderId,
    }: {
      projectId: string;
      instructions: string;
      baseRenderId?: string;
    }) => floorMapService.improveRender(projectId, { instructions, base_render_id: baseRenderId }),
    onSuccess: () => {
      refresh();
      toast.success("Revision generated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotateRender = useMutation({
    mutationFn: (renderId: string) => floorMapService.rotateRender(renderId, 90),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const activateRender = useMutation({
    mutationFn: ({ projectId, renderId }: { projectId: string; renderId: string }) =>
      floorMapService.activateRender(projectId, renderId),
    onSuccess: () => {
      refresh();
      toast.success("Active render updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRender = useMutation({
    mutationFn: (renderId: string) => floorMapService.deleteRender(renderId),
    onSuccess: () => {
      refresh();
      toast.success("Render deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    projects: projectsQuery.data || [],
    isLoadingProjects: projectsQuery.isLoading,
    activeProject: projectQuery.data || null,
    isLoadingProject: projectQuery.isLoading,
    activeProjectId,
    setSelectedProjectId,
    createProject,
    deleteProject,
    uploadFloorplan,
    analyze,
    generateQuestions,
    saveAnswers,
    generateDesign,
    generateRender,
    improveRender,
    rotateRender,
    activateRender,
    deleteRender,
  };
}
