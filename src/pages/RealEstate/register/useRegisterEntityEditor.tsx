import { useState } from 'react';
import type { ReactNode } from 'react';
import type { RegisterEntityKey } from '@/types/realEstate';
import { ConfirmDeleteDialog, RegisterEntityDialog } from './RegisterEntityDialog';

type Row = Record<string, unknown>;
type Editing = { entity: RegisterEntityKey; record: Row | null } | null;
type Deleting = { entity: RegisterEntityKey; record: Row } | null;

/** State for the create/edit and delete dialogs of a panel; render `dialogs` once anywhere in the panel. */
export function useRegisterEntityEditor(propertyId: string, financialsRestricted: boolean) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);

  const dialogs: ReactNode = (
    <>
      {editing && (
        <RegisterEntityDialog
          propertyId={propertyId}
          entity={editing.entity}
          record={editing.record}
          financialsRestricted={financialsRestricted}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog propertyId={propertyId} entity={deleting.entity} record={deleting.record} onClose={() => setDeleting(null)} />
      )}
    </>
  );

  return {
    dialogs,
    openCreate: (entity: RegisterEntityKey) => setEditing({ entity, record: null }),
    openEdit: (entity: RegisterEntityKey, record: object) => setEditing({ entity, record: record as Row }),
    requestDelete: (entity: RegisterEntityKey, record: object) => setDeleting({ entity, record: record as Row }),
  };
}
