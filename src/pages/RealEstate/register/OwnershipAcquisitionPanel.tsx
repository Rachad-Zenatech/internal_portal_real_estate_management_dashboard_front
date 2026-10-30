import { Landmark, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PropertyAcquisition, PropertyOwnership, PropertyRegister } from '@/types/realEstate';
import {
  EMPTY, EmptyState, RestrictedNotice, Section, SimpleTable, StatusBadge, fmtDate, fmtMoney, humanize,
} from './registerUi';
import type { TableColumn } from './registerUi';
import { RegisterAddButton, RegisterRowActions } from './RegisterRowActions';
import { useRegisterEntityEditor } from './useRegisterEntityEditor';

const ARRANGEMENTS: { key: 'is_owned' | 'is_leased' | 'is_subleased' | 'is_lease_to_own' | 'has_other_arrangement'; label: string }[] = [
  { key: 'is_owned', label: 'Owned' },
  { key: 'is_leased', label: 'Leased' },
  { key: 'is_subleased', label: 'Subleased' },
  { key: 'is_lease_to_own', label: 'Lease-to-own' },
  { key: 'has_other_arrangement', label: 'Other contract' },
];

const OWNERSHIP_COLUMNS: TableColumn<PropertyOwnership>[] = [
  { header: 'Owner', cell: (o) => <span className="font-semibold text-foreground">{o.owner_name}</span> },
  { header: 'Type', cell: (o) => humanize(o.ownership_type) },
  { header: 'Share', cell: (o) => (o.ownership_percentage != null ? `${o.ownership_percentage}%` : EMPTY) },
  { header: 'Title reference', cell: (o) => <span className="font-mono">{o.title_reference || EMPTY}</span> },
  { header: 'Title registered', cell: (o) => fmtDate(o.title_registration_date) },
  { header: 'Owned from', cell: (o) => fmtDate(o.start_date) },
  { header: 'Owned until', cell: (o) => (o.is_current ? 'Present' : fmtDate(o.end_date)) },
  {
    header: 'Status',
    cell: (o) => (o.is_current ? <StatusBadge value="ACTIVE" /> : <Badge variant="outline" className="text-[10px]">Historical</Badge>),
  },
  { header: 'Notes', cell: (o) => o.notes || EMPTY, className: 'min-w-40' },
];

function acquisitionColumns(restricted: boolean): TableColumn<PropertyAcquisition>[] {
  const money = (amount?: number | null, currency?: string | null) => (restricted ? EMPTY : fmtMoney(amount, currency));
  return [
    { header: 'Type', cell: (a) => humanize(a.acquisition_type) },
    { header: 'Acquired', cell: (a) => fmtDate(a.acquisition_date) },
    { header: 'Closed', cell: (a) => fmtDate(a.closing_date) },
    { header: 'Price', cell: (a) => money(a.purchase_price, a.currency) },
    { header: 'Deposit', cell: (a) => money(a.deposit_amount, a.currency) },
    { header: 'Closing costs', cell: (a) => money(a.closing_costs, a.currency) },
    { header: 'Land value', cell: (a) => money(a.land_value, a.currency) },
    { header: 'Building value', cell: (a) => money(a.building_value, a.currency) },
    { header: 'Seller', cell: (a) => a.seller_name || EMPTY },
    { header: 'Financing', cell: (a) => <StatusBadge value={a.financing_status} /> },
    { header: 'Mortgage ref.', cell: (a) => <span className="font-mono">{a.mortgage_reference || EMPTY}</span> },
    { header: 'Notes', cell: (a) => a.notes || EMPTY, className: 'min-w-40' },
  ];
}

export default function OwnershipAcquisitionPanel({
  register,
  propertyId,
  canManage,
}: {
  register: PropertyRegister | undefined;
  propertyId: string;
  canManage: boolean;
}) {
  const editor = useRegisterEntityEditor(propertyId, register?.financials_restricted ?? true);
  if (!register) {
    return <EmptyState>Loading ownership and acquisition records…</EmptyState>;
  }
  const { tenure } = register;
  const ownershipColumns: TableColumn<PropertyOwnership>[] = canManage
    ? [...OWNERSHIP_COLUMNS, { header: 'Actions', cell: (o) => <RegisterRowActions label="ownership" onEdit={() => editor.openEdit('ownerships', o)} onDelete={() => editor.requestDelete('ownerships', o)} /> }]
    : OWNERSHIP_COLUMNS;
  const acquisitionCols: TableColumn<PropertyAcquisition>[] = canManage
    ? [...acquisitionColumns(register.financials_restricted), { header: 'Actions', cell: (a) => <RegisterRowActions label="acquisition" onEdit={() => editor.openEdit('acquisitions', a)} onDelete={() => editor.requestDelete('acquisitions', a)} /> }]
    : acquisitionColumns(register.financials_restricted);

  return (
    <div className="space-y-4">
      <Section title="Tenure" icon={<ShieldCheck className="w-4 h-4 text-primary" />}>
        <div className="flex flex-wrap items-center gap-2">
          {tenure && <StatusBadge value={String(tenure.derived_tenure)} className="text-xs px-2.5 py-0.5" />}
          {tenure &&
            ARRANGEMENTS.filter((a) => tenure[a.key]).map((a) => (
              <Badge key={a.key} variant="outline" className="text-[10px]">{a.label}</Badge>
            ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {tenure?.derived_from_records
            ? 'Derived from the ownership and agreement records below. A property can hold several arrangements at once, and historical records stay visible after tenure changes.'
            : `No current ownership or agreement records exist, so tenure is shown from the legacy label (${tenure?.legacy_label ?? 'unknown'}).`}
        </p>
      </Section>

      <Section
        title={`Ownership history (${register.ownerships.length})`}
        icon={<Users className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add owner" onClick={() => editor.openCreate('ownerships')} /> : undefined}
      >
        <SimpleTable
          columns={ownershipColumns}
          rows={register.ownerships}
          getKey={(o) => o.id}
          empty="No ownership records. Legal owner details from the property record are shown below."
        />
      </Section>

      <Section
        title={`Acquisition history (${register.acquisitions.length})`}
        icon={<Landmark className="w-4 h-4 text-primary" />}
        action={canManage ? <RegisterAddButton label="Add acquisition" onClick={() => editor.openCreate('acquisitions')} /> : undefined}
      >
        {register.financials_restricted && register.acquisitions.length > 0 && (
          <RestrictedNotice what="Acquisition prices and values" />
        )}
        <SimpleTable
          columns={acquisitionCols}
          rows={register.acquisitions}
          getKey={(a) => a.id}
          empty="No acquisition records. Purchase details from the property record are shown below."
        />
      </Section>
      {editor.dialogs}
    </div>
  );
}
