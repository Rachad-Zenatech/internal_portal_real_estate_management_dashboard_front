import { Map } from "lucide-react";
import { useFloorMap } from "../../hooks/useFloorMap";
import { ProjectSidebar } from "../../components/FloorMap/ProjectSidebar";
import { UploadAndAnalysisPanel } from "../../components/FloorMap/UploadAndAnalysisPanel";
import { QuestionsAndDesignPanel } from "../../components/FloorMap/QuestionsAndDesignPanel";
import { RenderWorkspacePanel } from "../../components/FloorMap/RenderWorkspacePanel";

export default function FloorMapPage() {
  const fm = useFloorMap();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Map className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Floor Map AI (2D / 3D Converter)</h1>
          <p className="text-xs text-muted-foreground">
            Upload a floor plan, analyze layout & furniture with AWS Bedrock AI, customize finishes, and generate 2D/3D renders.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <ProjectSidebar
          projects={fm.projects}
          activeId={fm.activeProjectId}
          isLoading={fm.isLoadingProjects}
          isCreating={fm.createProject.isPending}
          onSelect={fm.setSelectedProjectId}
          onCreate={(payload) => fm.createProject.mutate(payload)}
          onDelete={(id) => fm.deleteProject.mutate(id)}
        />

        <div className="flex-1 min-w-0 space-y-4 w-full">
          {!fm.activeProject ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground">
              Select or create a floor map project on the left to get started.
            </div>
          ) : (
            <>
              <UploadAndAnalysisPanel
                project={fm.activeProject}
                isUploading={fm.uploadFloorplan.isPending}
                isAnalyzing={fm.analyze.isPending}
                onUpload={(file) => fm.uploadFloorplan.mutate({ projectId: fm.activeProject!.id, file })}
                onAnalyze={() => fm.analyze.mutate(fm.activeProject!.id)}
              />
              <QuestionsAndDesignPanel
                project={fm.activeProject}
                isGeneratingQuestions={fm.generateQuestions.isPending}
                isSavingAnswers={fm.saveAnswers.isPending}
                isGeneratingDesign={fm.generateDesign.isPending}
                onGenerateQuestions={() => fm.generateQuestions.mutate(fm.activeProject!.id)}
                onSaveAnswers={(answers) => fm.saveAnswers.mutate({ projectId: fm.activeProject!.id, answers })}
                onGenerateDesign={() => fm.generateDesign.mutate(fm.activeProject!.id)}
              />
              <RenderWorkspacePanel
                project={fm.activeProject}
                isGeneratingRender={fm.generateRender.isPending}
                isImprovingRender={fm.improveRender.isPending}
                onGenerateRender={(renderType) => fm.generateRender.mutate({ projectId: fm.activeProject!.id, renderType })}
                onImproveRender={(instructions, baseRenderId) =>
                  fm.improveRender.mutate({ projectId: fm.activeProject!.id, instructions, baseRenderId })
                }
                onRotateRender={(renderId) => fm.rotateRender.mutate(renderId)}
                onActivateRender={(renderId) => fm.activateRender.mutate({ projectId: fm.activeProject!.id, renderId })}
                onDeleteRender={(renderId) => fm.deleteRender.mutate(renderId)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
