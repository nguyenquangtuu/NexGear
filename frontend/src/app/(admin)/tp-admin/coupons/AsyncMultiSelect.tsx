'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface AsyncMultiSelectProps {
  endpoint: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  labelKey?: string;
  valueKey?: string;
  searchQueryKey?: string;
}

export function AsyncMultiSelect({ 
  endpoint, 
  value, 
  onChange, 
  placeholder, 
  labelKey = 'name', 
  valueKey = 'id',
  searchQueryKey = 'search'
}: AsyncMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedIds = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return; // Only fetch when open to save API calls
    
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const joinChar = endpoint.includes('?') ? '&' : '?';
        const res = await apiFetch(`${endpoint}${joinChar}limit=50&${searchQueryKey}=${encodeURIComponent(search)}`);
        
        if (res.success && res.data) {
          let items: any[] = [];
          if (Array.isArray(res.data)) {
            items = res.data;
          } else {
            // Find first array value in object (like data.products, data.users, data.categories)
            const arrays = Object.values(res.data).filter(Array.isArray);
            if (arrays.length > 0) items = arrays[0] as any[];
          }
          setOptions(items);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchOptions, 300);
    return () => clearTimeout(debounce);
  }, [search, endpoint, searchQueryKey, open]);

  // Load initial selected options if they are not in the current search results
  // For simplicity, we just display the ID if the label isn't found
  
  const toggleOption = (id: string | number) => {
    const stringId = String(id);
    let newSelected = [...selectedIds];
    if (newSelected.includes(stringId)) {
      newSelected = newSelected.filter((v) => v !== stringId);
    } else {
      newSelected.push(stringId);
    }
    onChange(newSelected.join(','));
  };

  const removeSelected = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(selectedIds.filter(v => v !== String(id)).join(','));
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="min-h-[42px] w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm cursor-pointer flex flex-wrap gap-2 items-center"
        onClick={() => setOpen(!open)}
      >
        {selectedIds.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedIds.map(id => {
            const opt = options.find(o => String(o[valueKey]) === String(id));
            const label = opt ? (opt[labelKey] || opt.email || opt.name || opt.title) : `ID: ${id}`;
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                {label}
                <button onClick={(e) => removeSelected(e, id)} className="hover:text-red-500 rounded-full p-0.5"><X size={12} /></button>
              </span>
            );
          })
        )}
        <div className="ml-auto flex-shrink-0"><ChevronsUpDown size={16} className="text-muted-foreground" /></div>
      </div>

      {open && (
        <div className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Tìm kiếm..." 
              className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 relative hidden-scroll">
            {loading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">Đang tải...</div>
            ) : options.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">Không tìm thấy kết quả</div>
            ) : (
              options.map(opt => {
                const isSelected = selectedIds.includes(String(opt[valueKey]));
                const displayLabel = opt[labelKey] || opt.email || opt.name || opt.title || `Item ${opt[valueKey]}`;
                const extraInfo = opt.product_name ? `(${opt.product_name})` : '';
                return (
                  <div 
                    key={opt[valueKey]} 
                    onClick={() => toggleOption(opt[valueKey])}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-secondary/50'}`}
                  >
                    <div className="w-4 flex-shrink-0">{isSelected && <Check size={16} />}</div>
                    <span className="truncate">{displayLabel} <span className="text-muted-foreground text-xs font-normal">{extraInfo}</span></span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
