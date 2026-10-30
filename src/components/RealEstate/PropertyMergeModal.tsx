import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  GitMerge,
  ArrowRight,
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { realEstateService } from '@/services/realEstateService';
import type {
  Property,
  DuplicateMatchItem,
} from '@/types/realEstate';
import { formatPropertyCategory } from '@/types/realEstate';

interface PropertyMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryProperty: Property;
  duplicateItem: DuplicateMatchItem;
  onMerged?: (updatedProperty: Property) => void;
}

export const PropertyMergeModal: React.FC<PropertyMergeModalProps> = ({
  isOpen,
  onClose,
  primaryProperty,
  duplicateItem,
  onMerged,
}) => {
  const queryClient = useQueryClient();
  const dup = duplicateItem.duplicate_property;

  // Selected field values mapping: fieldKey -> chosenValue
  const [selectedFieldValues, setSelectedFieldValues] = useState<Record<string, any>>({});
  const [archiveDuplicate, setArchiveDuplicate] = useState<boolean>(true);
  const [showAllFields, setShowAllFields] = useState<boolean>(false);

  // Initialize with intelligent defaults: prefer populated values, and prefer primary property
  useEffect(() => {
    if (!isOpen || !duplicateItem) return;

    const initial: Record<string, any> = {};
    for (const diff of duplicateItem.differences) {
      const pVal = diff.primary_value;
      const dVal = diff.duplicate_value;

      // If primary is empty/zero and duplicate has real data, pick duplicate!
      const pEmpty = pVal === null || pVal === undefined || pVal === '' || pVal === 0;
      const dPopulated = dVal !== null && dVal !== undefined && dVal !== '' && dVal !== 0;

      if (pEmpty && dPopulated) {
        initial[diff.field] = dVal;
      } else {
        initial[diff.field] = pVal ?? dVal;
      }
    }
    setSelectedFieldValues(initial);
  }, [isOpen, duplicateItem]);

  const selectAllFrom = (source: 'primary' | 'duplicate') => {
    const updated: Record<string, any> = {};
    for (const diff of duplicateItem.differences) {
      updated[diff.field] = source === 'primary' ? diff.primary_value : diff.duplicate_value;
    }
    setSelectedFieldValues(updated);
  };

  const setFieldValue = (field: string, val: any) => {
    setSelectedFieldValues((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      return await realEstateService.mergeProperties(primaryProperty.id, {
        duplicate_property_id: dup.id,
        merged_fields: selectedFieldValues,
        archive_duplicate: archiveDuplicate,
      });
    },
    onSuccess: (updatedProp) => {
      toast.success(`Properties merged successfully! Duplicate record deduplicated.`);
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-property', primaryProperty.id] });
      queryClient.invalidateQueries({ queryKey: ['property-duplicates', primaryProperty.id] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      if (onMerged) {
        onMerged(updatedProp);
      }
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to merge properties');
    },
  });

  const differingFields = duplicateItem.differences.filter((d) => d.is_different);
  const fieldsToRender = showAllFields ? duplicateItem.differences : differingFields;

  const formatDisplayVal = (field: string, val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-muted-foreground/60 italic">—</span>;
    }
    if (field === 'property_category') {
      return <Badge variant="outline" className="text-xs">{formatPropertyCategory(String(val))}</Badge>;
    }
    if (field === 'ownership_type') {
      return (
        <Badge variant={val === 'OWNED' ? 'default' : 'secondary'} className="text-xs font-semibold">
          {val}
        </Badge>
      );
    }
    if (field === 'purchase_price' || field === 'monthly_rent') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        return <span className="font-semibold text-emerald-600 dark:text-emerald-400">${num.toLocaleString()}</span>;
      }
    }
    if (field === 'square_feet' || field === 'building_area' || field === 'usable_area') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        return <span className="font-medium">{num.toLocaleString()} sqft</span>;
      }
    }
    return String(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <div className="p-5 border-b border-border bg-card/60">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  Duplicate Property Resolution & Merge
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Review side-by-side differences between the primary and duplicate records, choose which values to apply, and merge them safely.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Match reasons badge */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Match Criteria:</span>
            {duplicateItem.match_reasons.map((reason, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                {reason}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary Cards Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Property Card */}
            <Card className="p-4 border-primary/40 bg-primary/5 space-y-2 relative">
              <div className="flex items-center justify-between pb-1.5 border-b border-primary/20">
                <div className="flex items-center gap-1.5">
                  <Badge variant="default" className="text-[11px] font-semibold">
                    Primary Record (To Keep)
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{primaryProperty.property_code || 'ID: ' + primaryProperty.id.slice(0, 8)}</span>
                </div>
                <Building className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{primaryProperty.name}</h4>
                <p className="text-xs text-muted-foreground">{primaryProperty.address}{primaryProperty.unit_number ? `, Unit ${primaryProperty.unit_number}` : ''}, {primaryProperty.city}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <Badge variant={primaryProperty.ownership_type === 'OWNED' ? 'default' : 'secondary'} className="text-[10px]">
                  {primaryProperty.ownership_type || 'LEASED'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {formatPropertyCategory(primaryProperty.property_category, primaryProperty.ownership_type)}
                </Badge>
                {primaryProperty.square_feet ? (
                  <span className="text-muted-foreground text-[11px]">{primaryProperty.square_feet.toLocaleString()} sqft</span>
                ) : null}
              </div>
            </Card>

            {/* Duplicate Property Card */}
            <Card className="p-4 border-amber-500/40 bg-amber-500/5 space-y-2 relative">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                    Duplicate Record (To Merge & Archive)
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{dup.property_code || 'ID: ' + dup.id.slice(0, 8)}</span>
                </div>
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{dup.name}</h4>
                <p className="text-xs text-muted-foreground">{dup.address}{dup.unit_number ? `, Unit ${dup.unit_number}` : ''}, {dup.city}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <Badge variant={dup.ownership_type === 'OWNED' ? 'default' : 'secondary'} className="text-[10px]">
                  {dup.ownership_type || 'LEASED'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {formatPropertyCategory(dup.property_category, dup.ownership_type)}
                </Badge>
                {dup.square_feet ? (
                  <span className="text-muted-foreground text-[11px]">{dup.square_feet.toLocaleString()} sqft</span>
                ) : null}
              </div>
            </Card>
          </div>

          {/* Transfer notice */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>Zero Data Loss:</strong> Child records linked to the duplicate property (
                {duplicateItem.child_counts.documents} documents, {duplicateItem.child_counts.units} units, {duplicateItem.child_counts.leases} leases
                ) will be re-assigned directly to the primary property.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectAllFrom('primary')}
              >
                Use All Primary
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectAllFrom('duplicate')}
              >
                Use All Duplicate
              </Button>
            </div>
          </div>

          {/* Difference Resolution Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Field-by-Field Values Comparison ({differingFields.length} differences detected)</span>
              <button
                type="button"
                onClick={() => setShowAllFields(!showAllFields)}
                className="text-primary hover:underline text-xs flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                {showAllFields ? 'Show Differing Fields Only' : 'Show All Fields'}
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-card">
              <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-3">Property Field</div>
                <div className="col-span-4">Primary Value</div>
                <div className="col-span-1 text-center">Merge</div>
                <div className="col-span-4">Duplicate Value</div>
              </div>

              {fieldsToRender.map((diff) => {
                const currentChosen = selectedFieldValues[diff.field];
                const isPrimaryChosen = currentChosen === diff.primary_value;
                const isDuplicateChosen = currentChosen === diff.duplicate_value;

                return (
                  <div
                    key={diff.field}
                    className={`grid grid-cols-12 gap-2 p-3 text-xs items-center transition-colors ${
                      diff.is_different ? 'bg-amber-500/[0.03] hover:bg-muted/40' : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* Field label */}
                    <div className="col-span-3">
                      <span className="font-semibold text-foreground block">{diff.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{diff.field}</span>
                    </div>

                    {/* Primary Value Option */}
                    <div
                      onClick={() => setFieldValue(diff.field, diff.primary_value)}
                      className={`col-span-4 p-2 rounded-lg border cursor-pointer transition-all ${
                        isPrimaryChosen
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                          : 'border-border/60 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-1">{formatDisplayVal(diff.field, diff.primary_value)}</div>
                        {isPrimaryChosen && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                    </div>

                    {/* Arrow / Direction */}
                    <div className="col-span-1 flex justify-center text-muted-foreground/60">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>

                    {/* Duplicate Value Option */}
                    <div
                      onClick={() => setFieldValue(diff.field, diff.duplicate_value)}
                      className={`col-span-4 p-2 rounded-lg border cursor-pointer transition-all ${
                        isDuplicateChosen
                          ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30'
                          : 'border-border/60 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-1">{formatDisplayVal(diff.field, diff.duplicate_value)}</div>
                        {isDuplicateChosen && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Archive duplicate option */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center space-x-2">
            <Checkbox
              id="archiveDuplicate"
              checked={archiveDuplicate}
              onCheckedChange={(checked) => setArchiveDuplicate(Boolean(checked))}
            />
            <label
              htmlFor="archiveDuplicate"
              className="text-xs font-medium leading-none cursor-pointer text-foreground"
            >
              Safely archive the duplicate property record ({dup.name}) after information merge
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={mergeMutation.isPending}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={mergeMutation.isPending}
            onClick={() => mergeMutation.mutate()}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
          >
            <GitMerge className="w-4 h-4" />
            {mergeMutation.isPending ? 'Merging Records...' : 'Confirm & Merge Information'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default PropertyMergeModal;
