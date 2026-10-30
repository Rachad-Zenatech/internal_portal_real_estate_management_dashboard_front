import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { realEstateService } from '@/services/realEstateService';
import type { RegisterEntityKey } from '@/types/realEstate';
import { REGISTER_ENTITY_CONFIGS } from './registerEntityConfigs';
import type { RegisterFieldConfig } from './registerEntityConfigs';

type Row = Record<string, unknown>;

const EMPTY_SELECT = '__none__';

function initialValue(field: RegisterFieldConfig, record: Row | null): string {
  if (record) {
    const raw = record[field.key];
    if (raw === null || raw === undefined) return field.type === 'select' && !field.allowEmpty ? field.defaultValue ?? '' : '';
    if (field.type === 'date') return String(raw).slice(0, 10);
    return String(raw);
  }
  return field.defaultValue ?? '';
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Create/edit dialog for one register record. Mount it only while it is open (state resets on mount). */
export function RegisterEntityDialog({
  propertyId,
  entity,
  record,
  financialsRestricted,
  onClose,
}: {
  propertyId: string;
  entity: RegisterEntityKey;
  record: Row | null;
  financialsRestricted: boolean;
  onClose: () => void;
}) {
  const config = REGISTER_ENTITY_CONFIGS[entity];
  const queryClient = useQueryClient();
  const isEdit = record !== null;
  // Financial fields are hidden for users without accounting access; update models also reject create-only fields.
  const fields = config.fields.filter((f) => !(financialsRestricted && f.financial) && !(isEdit && f.createOnly));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initialValue(f, record)])),
  );
  const [error, setError] = useState<string | null>(null);

  const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const current = (values[field.key] ?? '').trim();
      const original = isEdit ? initialValue(field, record).trim() : '';
      if (isEdit && current === original) continue;       // only send what changed
      if (current === '') {
        if (isEdit && original !== '') payload[field.key] = null;   // the user cleared it
        continue;
      }
      if (field.type === 'number') payload[field.key] = Number(current);
      else if (field.type === 'boolean') payload[field.key] = current === 'true';
      else payload[field.key] = current;
    }
    return payload;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit) return realEstateService.updateRegisterRecord(entity, String(record!.id), payload);
      return realEstateService.createRegisterRecord(propertyId, entity, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
      toast.success(`${config.label} ${isEdit ? 'updated' : 'added'}`);
      onClose();
    },
    onError: (err: unknown) => {
      const message = errorText(err, `Could not save the ${config.label.toLowerCase()}`);
      setError(message);
      toast.error(message);
    },
  });

  const missingRequired = fields.some((f) => f.required && (values[f.key] ?? '').trim() === '');
  const noChanges = isEdit && Object.keys(buildPayload()).length === 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${config.label.toLowerCase()}` : `Add ${config.label.toLowerCase()}`}</DialogTitle>
          <DialogDescription className="text-xs">
            Changes are recorded in the property history. Fields marked * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2 text-xs">
          {fields.map((field) => (
            <div key={field.key} className={`space-y-1 ${field.wide ? 'col-span-2' : ''}`}>
              <label htmlFor={`reg-${field.key}`} className="font-medium text-foreground">
                {field.label}{field.required ? ' *' : ''}
              </label>
              {field.type === 'select' ? (
                <Select
                  value={values[field.key] === '' ? EMPTY_SELECT : values[field.key]}
                  onValueChange={(v) => setValue(field.key, v === EMPTY_SELECT ? '' : v)}
                >
                  <SelectTrigger id={`reg-${field.key}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.allowEmpty && <SelectItem value={EMPTY_SELECT}>Not specified</SelectItem>}
                    {field.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={`reg-${field.key}`}
                  rows={2}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className="text-xs"
                />
              ) : field.type === 'boolean' ? (
                <Select value={values[field.key] || EMPTY_SELECT} onValueChange={(v) => setValue(field.key, v === EMPTY_SELECT ? '' : v)}>
                  <SelectTrigger id={`reg-${field.key}`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT}>Not stated</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`reg-${field.key}`}
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  min={field.type === 'number' ? 0 : undefined}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className="h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>

        {financialsRestricted && config.fields.some((f) => f.financial) && (
          <p className="text-[11px] text-muted-foreground">Financial fields are hidden because they require accounting access.</p>
        )}
        {error && (
          <div role="alert" className="p-2.5 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={missingRequired || noChanges || mutation.isPending} onClick={() => { setError(null); mutation.mutate(); }}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : `Add ${config.label.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmation before a record is deleted (soft delete: it stays in the history). */
export function ConfirmDeleteDialog({
  propertyId,
  entity,
  record,
  onClose,
}: {
  propertyId: string;
  entity: RegisterEntityKey;
  record: Row;
  onClose: () => void;
}) {
  const config = REGISTER_ENTITY_CONFIGS[entity];
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => realEstateService.deleteRegisterRecord(entity, String(record.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', propertyId] });
      toast.success(`${config.label} deleted`);
      onClose();
    },
    onError: (err: unknown) => toast.error(errorText(err, `Could not delete the ${config.label.toLowerCase()}`)),
  });

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {config.label.toLowerCase()}?</AlertDialogTitle>
          <AlertDialogDescription>
            It is removed from the register but the deletion stays in the property history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={(e) => { e.preventDefault(); mutation.mutate(); }}
          >
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
