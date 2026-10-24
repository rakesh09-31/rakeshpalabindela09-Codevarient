import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light/60 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full rounded-xl border border-gray-green-border bg-white
          pl-10 pr-9 py-2.5 text-sm text-charcoal
          placeholder:text-charcoal-light/50
          transition-colors duration-150
          focus:outline-none focus:border-mint focus:ring-2 focus:ring-mint/20
        "
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-charcoal-light hover:text-charcoal hover:bg-gray-green-light/30 transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

SearchInput.displayName = 'SearchInput';
