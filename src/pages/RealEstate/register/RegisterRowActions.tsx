import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RegisterRowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function RegisterAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" className="h-7 text-xs gap-1" onClick={onClick}>
      <Plus className="w-3 h-3" />
      {label}
    </Button>
  );
}
