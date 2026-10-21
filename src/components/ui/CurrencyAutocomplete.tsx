import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search, Coins, Sparkles } from 'lucide-react';
import { realEstateService } from '@/services/realEstateService';

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
  is_popular?: boolean;
}

export const DEFAULT_CURRENCIES: CurrencyItem[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', is_popular: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', is_popular: true },
  { code: 'EUR', name: 'Euro', symbol: '€', is_popular: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', is_popular: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', is_popular: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', is_popular: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥', is_popular: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', is_popular: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', is_popular: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', is_popular: true },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', is_popular: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', is_popular: true },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'AED', is_popular: false },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', is_popular: false },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', is_popular: false },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', is_popular: false },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', is_popular: false },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', is_popular: false },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', is_popular: false },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', is_popular: false },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', is_popular: false },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', is_popular: false },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', is_popular: false },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', is_popular: false },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', is_popular: false },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', is_popular: false },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', is_popular: false },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', is_popular: false },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', is_popular: false },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', is_popular: false },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', is_popular: false },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', is_popular: false },
];

const POPULAR_CURRENCY_CODES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'CHF', 'SGD', 'HKD', 'MXN', 'INR'];

interface CurrencyAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CurrencyAutocomplete({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select currency...',
}: CurrencyAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { data: currenciesData, isLoading } = useQuery({
    queryKey: ['real-estate-currencies'],
    queryFn: () => realEstateService.getCurrencies().catch(() => ({ currencies: DEFAULT_CURRENCIES, total: DEFAULT_CURRENCIES.length })),
    staleTime: 1000 * 60 * 60,
  });

  const currencies: CurrencyItem[] = useMemo(() => {
    if (currenciesData?.currencies && currenciesData.currencies.length > 0) {
      return currenciesData.currencies;
    }
    return DEFAULT_CURRENCIES;
  }, [currenciesData]);

  const currentCode = (value || 'USD').toUpperCase();

  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.code.toUpperCase() === currentCode);
  }, [currencies, currentCode]);

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currencies;

    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  }, [currencies, searchQuery]);

  const isCustomCode =
    searchQuery.trim().length >= 2 &&
    !currencies.some((c) => c.code.toUpperCase() === searchQuery.trim().toUpperCase());

  const handleSelect = useCallback(
    (code: string) => {
      const upper = code.toUpperCase().trim();
      onChange(upper);
      setOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setHighlightedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        if (currentCode) {
          const el = itemRefs.current.get(currentCode);
          if (el) {
            el.scrollIntoView({ block: 'nearest' });
          }
        }
      }, 50);
    }
  }, [open, currentCode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCurrencies.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCurrencies.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredCurrencies[highlightedIndex]) {
        handleSelect(filteredCurrencies[highlightedIndex].code);
      } else if (isCustomCode) {
        handleSelect(searchQuery.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between h-8 px-2.5 text-xs bg-background border-input hover:bg-accent font-normal ${className}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded text-[10px] border border-primary/20">
              {currentCode}
            </span>
            {selectedCurrency ? (
              <span className="truncate text-foreground text-xs">
                {selectedCurrency.name}{' '}
                {selectedCurrency.symbol && (
                  <span className="text-muted-foreground font-normal">({selectedCurrency.symbol})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[300px] sm:w-[330px] p-0 shadow-xl z-50 flex flex-col border border-border"
        align="start"
      >
        {/* Search header */}
        <div className="flex items-center border-b border-border px-3 py-2 bg-muted/40 shrink-0">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search code, name, or symbol..."
            className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
          />
        </div>

        {/* Quick popular pills */}
        {!searchQuery && (
          <div className="p-2 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
              Popular Currencies
            </div>
            <div className="flex flex-wrap gap-1">
              {POPULAR_CURRENCY_CODES.map((code) => {
                const isSelected = currentCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                        : 'bg-background border border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable list of currencies */}
        <div
          ref={listRef}
          className="max-h-60 overflow-y-auto p-1 divide-y divide-border/40"
        >
          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Coins className="h-4 w-4 animate-spin text-primary" />
              Loading currencies...
            </div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="py-5 px-3 text-center text-xs text-muted-foreground">
              <p>No currencies matching "{searchQuery}"</p>
              {isCustomCode && (
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim().toUpperCase())}
                  className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use custom currency "{searchQuery.trim().toUpperCase()}"
                </button>
              )}
            </div>
          ) : (
            filteredCurrencies.map((c, idx) => {
              const upper = c.code.toUpperCase();
              const isSelected = currentCode === upper;
              const isHighlighted = highlightedIndex === idx;

              return (
                <button
                  key={c.code}
                  ref={(el) => {
                    if (el) itemRefs.current.set(upper, el);
                    else itemRefs.current.delete(upper);
                  }}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : isHighlighted
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-[11px] text-primary w-10 shrink-0">
                      {c.code}
                    </span>
                    <span className="truncate text-foreground">
                      {c.name}
                    </span>
                    {c.symbol && (
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        ({c.symbol})
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CurrencyAutocomplete;
