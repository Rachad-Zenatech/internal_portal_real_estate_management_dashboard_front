import { useEffect, useState } from "react";
import { MessageSquare, Palette, Loader2, Check } from "lucide-react";
import { Button } from "../ui/button";
import type { FloorMapProject } from "../../types/floorMap";

interface QuestionsAndDesignPanelProps {
  project: FloorMapProject;
  isGeneratingQuestions: boolean;
  isSavingAnswers: boolean;
  isGeneratingDesign: boolean;
  onGenerateQuestions: () => void;
  onSaveAnswers: (answers: Array<{ question_index: number; selected_answer: string }>) => void;
  onGenerateDesign: () => void;
}

export function QuestionsAndDesignPanel({
  project,
  isGeneratingQuestions,
  isSavingAnswers,
  isGeneratingDesign,
  onGenerateQuestions,
  onSaveAnswers,
  onGenerateDesign,
}: QuestionsAndDesignPanelProps) {
  const questions = project.questions_json || [];
  const [picks, setPicks] = useState<Record<number, string>>({});

  useEffect(() => {
    const next: Record<number, string> = {};
    questions.forEach((q) => {
      if (q.selected_answer) next[q.index] = q.selected_answer;
    });
    setPicks(next);
  }, [project.id, project.questions_json]);

  const handleSave = () => {
    const payload = questions.map((q) => ({
      question_index: q.index,
      selected_answer: picks[q.index] || q.options[q.options.length - 1] || "Use AI default",
    }));
    onSaveAnswers(payload);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">2. Design Preferences & Strategy</h3>
          <p className="text-xs text-muted-foreground">Customize 2D/3D style, materials, and furniture finishes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateQuestions}
            disabled={!project.analysis_json || isGeneratingQuestions}
            className="gap-1.5"
          >
            {isGeneratingQuestions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            {questions.length ? "Refresh Questions" : "Generate Questions"}
          </Button>
          {questions.length > 0 && (
            <Button size="sm" variant="secondary" onClick={handleSave} disabled={isSavingAnswers} className="gap-1.5">
              {isSavingAnswers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Answers
            </Button>
          )}
          <Button
            size="sm"
            onClick={onGenerateDesign}
            disabled={!project.analysis_json || isGeneratingDesign}
            className="gap-1.5"
          >
            {isGeneratingDesign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Palette className="h-3.5 w-3.5" />}
            Build Design Strategy
          </Button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {questions.map((q) => (
            <div key={q.index} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium">{q.question}</p>
              <select
                value={picks[q.index] || ""}
                onChange={(e) => setPicks((prev) => ({ ...prev, [q.index]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="">Select an option...</option>
                {q.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {project.design_strategy_json && (
        <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1.5 text-xs">
          <p className="font-medium">Strategy Summary ({project.design_strategy_json.map_type?.toUpperCase()})</p>
          <p className="text-muted-foreground">{project.design_strategy_json.summary}</p>
        </div>
      )}
    </section>
  );
}
