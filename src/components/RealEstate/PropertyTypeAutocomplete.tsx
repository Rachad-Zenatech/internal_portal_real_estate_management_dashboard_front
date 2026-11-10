import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { realEstateService } from '@/services/realEstateService';

/** Used until the list loads, or if it cannot be loaded. Kept in step with PROPERTY_TYPES in the backend model. */
const FALLBACK_TYPES = [
  'Condo', 'Apartment', 'Townhouse', 'Single-family house', 'Duplex', 'Triplex', 'Fourplex', 'Multi-family',
  'Studio', 'Loft', 'Penthouse', 'Villa', 'Cottage', 'Mobile home', 'Co-op',
  'Office', 'Retail', 'Shopping centre', 'Restaurant', 'Hotel', 'Mixed-use', 'Medical office', 'Coworking space',
  'Industrial', 'Warehouse', 'Manufacturing', 'Flex space', 'Self-storage',
  'Land', 'Vacant lot', 'Farm / agricultural', 'Parking', 'Garage', 'Student housing', 'Senior living', 'Other',
];

interface Props {
  id?: string;
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}

/** Free-text input with a suggestion dropdown: pick a common type or keep typing a custom one. */
export default function PropertyTypeAutocomplete({ id, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data } = useQuery({
    queryKey: ['real-estate', 'property-types'],
    queryFn: () => realEstateService.listPropertyTypes(),
    staleTime: 5 * 60 * 1000,
  });
  const all = data && data.length > 0 ? data : FALLBACK_TYPES;

  const text = value ?? '';
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return all;
    // an exact match alone would hide the other options, so show everything again until the text changes
    const matches = all.filter((t) => t.toLowerCase().includes(q));
    return matches.length === 1 && matches[0].toLowerCase() === q ? all : matches;
  }, [all, text]);

  const pick = (t: string) => {
    onChange(t);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h < filtered.length - 1 ? h + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h > 0 ? h - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && open && highlight >= 0 && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={text}
        placeholder="Select or type a property type"
        className="pr-8"
        onChange={(e) => {
          onChange(e.target.value || null);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          clearTimeout(closeTimer.current);
          setOpen(true);
        }}
        // delay so a click on an option registers before the list closes
        onBlur={() => { closeTimer.current = setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {open && !disabled && filtered.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {filtered.map((t, i) => {
            const selected = t.toLowerCase() === text.trim().toLowerCase();
            return (
              <li
                key={t}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => { e.preventDefault(); pick(t); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 ${i === highlight ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <span className="truncate">{t}</span>
                {selected && <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
