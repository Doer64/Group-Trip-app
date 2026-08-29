'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass, MapPin, Building2, Globe } from 'lucide-react';
import { useDestinationSuggestions, DestinationEntry } from '@/hooks/useDestinationSuggestions';

interface DestinationInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function DestinationInput({
  label = 'Where are you traveling to?',
  placeholder = 'e.g. Paris, Tokyo, Italy...',
  value,
  onChange,
  error,
  autoFocus = false,
  disabled = false,
}: DestinationInputProps) {
  const { suggestions, search, clearSuggestions, ensureDataLoaded } =
    useDestinationSuggestions();

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isPending, startTransition] = React.useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger search on value change without blocking typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val); // Instant input update
    startTransition(() => {
      search(val);
      setIsOpen(true);
      setHighlightedIndex(-1);
    });
  };

  const handleFocus = () => {
    ensureDataLoaded();
    if (value.trim().length >= 2) {
      search(value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const selectSuggestion = useCallback(
    (entry: DestinationEntry) => {
      const formattedValue =
        entry.type === 'city' && entry.country && entry.country !== entry.name
          ? `${entry.name}, ${entry.country}`
          : entry.name;

      onChange(formattedValue);
      clearSuggestions();
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange, clearSuggestions]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && value.trim().length >= 2) {
        search(value);
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const shouldShowDropdown = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label className="text-xs font-semibold text-slate-700 tracking-wide">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          <Compass className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-200 focus:border-slate-800 focus:ring-slate-100 hover:border-slate-300'
          }`}
        />
      </div>

      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

      {/* Floating Auto-suggestions Dropdown */}
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Suggested Destinations
          </div>

          <div className="divide-y divide-slate-100">
            {suggestions.map((item, index) => {
              const isSelected = highlightedIndex === index;
              const isCity = item.type === 'city';

              return (
                <div
                  key={`${item.name}-${item.country}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur before click registers
                    selectSuggestion(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCity ? (
                        <Building2 className="w-3.5 h-3.5" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="truncate">
                      <span className="text-sm font-semibold block truncate">
                        {item.name}
                      </span>
                      {isCity && item.country && item.country !== item.name && (
                        <span className="text-xs text-slate-400 block truncate">
                          {item.country}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                      isCity
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-indigo-100/70 text-indigo-700'
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
