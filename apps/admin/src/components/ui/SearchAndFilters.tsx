"use client";

import React from 'react';
import { useTranslations } from '@/hooks/useTranslations';

type FilterOption = {
  value: string;
  label: string;
};

type SearchAndFiltersProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters?: Array<{
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }>;
  placeholder?: string;
};

export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  filters = [],
  placeholder,
}: SearchAndFiltersProps) {
  const t = useTranslations();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder={placeholder || t('common.search')}
              className="border rounded w-full p-2"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filters */}
          {filters.map((filter) => (
            <div key={filter.key} className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">{filter.label}:</label>
              <select
                className="border rounded p-2 text-sm min-w-[120px]"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




