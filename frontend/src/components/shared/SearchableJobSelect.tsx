import { useState, useRef, useEffect } from 'react';

interface Job { id: string; title: string; }

interface Props {
  jobs: Job[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function SearchableJobSelect({ jobs, value, onChange, placeholder = 'Select job...', className = '', label }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = jobs.find(j => j.id === value);
  const filtered = query.trim()
    ? jobs.filter(j => j.title.toLowerCase().includes(query.toLowerCase()))
    : jobs;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center gap-2 pl-3 pr-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-[#7A60F4]/50 outline-none shadow-sm transition-all text-left"
      >
        <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="flex-1 truncate">{selected?.title ?? placeholder}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full min-w-[240px] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-neutral-800">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0].id);
                }}
                placeholder="Search jobs..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-[#7A60F4]/40 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-400 dark:text-neutral-500 text-center">No jobs found</p>
            ) : (
              filtered.map(job => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => handleSelect(job.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    job.id === value
                      ? 'bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 text-[#7A60F4] dark:text-[#9EA4FF] font-bold'
                      : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 font-medium'
                  }`}
                >
                  {job.title}
                </button>
              ))
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <p className="text-[10px] text-gray-400 dark:text-neutral-600">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
