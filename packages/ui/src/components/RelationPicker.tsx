import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, CardContent, Input, Select } from '../index';

export interface RelationOption {
  id: string;
  title: string;
  slug?: string;
  data?: Record<string, unknown>;
}

export interface RelationPickerProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  fetchOptions: () => Promise<RelationOption[]>;
  displayField?: string;
  className?: string;
}

export const RelationPicker: React.FC<RelationPickerProps> = ({
  value,
  onChange,
  multiple = false,
  label,
  required,
  error,
  helperText,
  fetchOptions,
  displayField = 'title',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<RelationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchOptions()
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, fetchOptions]);

  const selectedIds: string[] = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (optionId: string) => {
    if (multiple) {
      const newValue = selectedIds.includes(optionId)
        ? selectedIds.filter(id => id !== optionId)
        : [...selectedIds, optionId];
      onChange(newValue);
    } else {
      onChange(optionId);
      setIsOpen(false);
    }
  };

  const filteredOptions = options.filter(opt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const displayValue = String(opt[displayField as keyof RelationOption] || opt.title || '');
    return displayValue.toLowerCase().includes(query) || opt.slug?.toLowerCase().includes(query);
  });

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  const getDisplayValue = (opt: RelationOption) => {
    return String(opt[displayField as keyof RelationOption] || opt.title || opt.id);
  };

  // Simple select for single non-modal
  if (!multiple && !isOpen) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-muted mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Select
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: 'None' },
            ...options.map(opt => ({ value: opt.id, label: getDisplayValue(opt) })),
          ]}
          placeholder="Select..."
          error={error}
          helperText={helperText}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-muted mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Selected Options Preview */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedOptions.map((opt) => (
            <div
              key={opt.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {getDisplayValue(opt)}
              <button
                type="button"
                onClick={() => {
                  if (multiple) {
                    onChange(selectedIds.filter(id => id !== opt.id));
                  } else {
                    onChange('');
                  }
                }}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        {selectedOptions.length > 0
          ? multiple
            ? `Add More (${selectedOptions.length} selected)`
            : 'Change'
          : 'Select'}
      </Button>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-muted">{helperText}</p>}

      {/* Relation Picker Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Relation" size="lg">
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded" />
              ))}
            </div>
          ) : filteredOptions.length === 0 ? (
            <p className="text-muted text-center py-8">No options found</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <Card
                    key={opt.id}
                    variant={isSelected ? 'outlined' : 'default'}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handleSelect(opt.id)}
                  >
                    <CardContent className="p-3">
                      <div className="font-medium">{getDisplayValue(opt)}</div>
                      {opt.slug && <div className="text-sm text-muted">{opt.slug}</div>}
                      {isSelected && <div className="text-xs text-blue-600 mt-1">✓ Selected</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {multiple && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsOpen(false)}>Done ({selectedIds.length} selected)</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

