// src/components/SearchableSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  className?: string;
  pinnedOption?: string; // e.g. 'นครราชสีมา' to keep at top
  pinnedLabel?: string;  // e.g. '★ นครราชสีมา (คนโคราช / ท้องถิ่น)'
  allowCustom?: boolean; // allow typing a value not in the list
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '🔍 พิมพ์ค้นหา...',
  className = '',
  pinnedOption,
  pinnedLabel,
  allowCustom = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [value, isOpen]);

  // Filtered options based on user typing
  const cleanQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter(opt => {
    if (!cleanQuery) return true;
    return opt.toLowerCase().includes(cleanQuery);
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input / Trigger */}
      <div 
        className="relative flex items-center cursor-pointer"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : (value || '')}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          placeholder={isOpen ? placeholder : (value || placeholder)}
          className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 transition"
        />

        {isOpen && query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            title="ล้างข้อความค้นหา"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown 
            className={`w-3.5 h-3.5 absolute right-2 text-slate-400 transition-transform duration-200 pointer-events-none ${
              isOpen ? 'rotate-180 text-amber-600' : ''
            }`} 
          />
        )}
      </div>

      {/* Floating Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* Quick status bar */}
          <div className="p-1.5 px-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>
              {query ? `ผลการค้นหา "${query}" (${filteredOptions.length})` : `เลือกจากรายการทั้งหมด (${options.length})`}
            </span>
            <span className="text-amber-600 font-bold">พิมพ์ค้นหาได้ทันที</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {/* Pinned Option (if available and no query or matching query) */}
            {pinnedOption && (!query || pinnedOption.toLowerCase().includes(cleanQuery)) && (
              <div
                onClick={() => handleSelect(pinnedOption)}
                className={`p-2 px-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition text-xs ${
                  value === pinnedOption ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-800 font-bold'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 text-sm">★</span>
                  <span>{pinnedLabel || pinnedOption}</span>
                </div>
                {value === pinnedOption && (
                  <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                )}
              </div>
            )}

            {/* Filtered list */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                if (pinnedOption && opt === pinnedOption) return null; // Already shown pinned
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`p-2 px-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition text-xs ${
                      isSelected ? 'bg-amber-50 font-bold text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 space-y-1.5">
                <div>ไม่พบในตัวเลือกมาตรฐาน</div>
                {allowCustom && query && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    + ใช้ชื่อ "{query.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer note for quick custom selection */}
          {allowCustom && query && filteredOptions.length > 0 && !filteredOptions.includes(query.trim()) && (
            <div 
              onClick={() => handleSelect(query.trim())}
              className="p-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10.5px] font-bold cursor-pointer border-t border-amber-200 transition text-center"
            >
              + หรือใช้ตามที่พิมพ์: <span className="underline">"{query.trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
