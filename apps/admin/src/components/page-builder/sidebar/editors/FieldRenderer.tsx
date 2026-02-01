/**
 * Field Renderer Component
 * 
 * Renderuje odpowiedni input na podstawie typu pola.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { FiLink, FiCheck, FiImage, FiX } from 'react-icons/fi';
import type { PropFieldSchema } from '@/lib/page-builder/types';
import { MediaPickerDialog } from './MediaPickerDialog';
import styles from './FieldRenderer.module.css';

type FieldRendererProps = {
  type: PropFieldSchema['type'];
  value: unknown;
  onChange: (value: unknown) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
};

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  type,
  value,
  onChange,
  options,
  placeholder,
  min,
  max,
}) => {
  switch (type) {
    case 'text':
      return (
        <input
          type="text"
          className={styles.textInput}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          className={styles.numberInput}
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
          placeholder={placeholder}
          min={min}
          max={max}
        />
      );
    
    case 'select':
      return (
        <select
          className={styles.select}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    
    case 'color':
      return <ColorInput value={value as string} onChange={onChange} />;
    
    case 'spacing':
      return <SpacingInput value={value as string} onChange={onChange} />;
    
    case 'rich-text':
      return (
        <textarea
          className={styles.textarea}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      );
    
    case 'link':
      return (
        <div className={styles.linkInput}>
          <FiLink className={styles.linkIcon} />
          <input
            type="url"
            className={styles.textInput}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'https://...'}
          />
        </div>
      );
    
    case 'boolean':
      return (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className={styles.checkboxIndicator}>
            {Boolean(value) && <FiCheck />}
          </span>
        </label>
      );
    
    case 'image':
      return <ImageInput value={value as string} onChange={onChange} />;
    
    default:
      return (
        <input
          type="text"
          className={styles.textInput}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
  }
};

// =============================================================================
// SPECIALIZED INPUTS
// =============================================================================

const ColorInput: React.FC<{
  value: string | undefined;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={styles.colorInput}>
      <div
        className={styles.colorPreview}
        style={{ backgroundColor: value || 'transparent' }}
        onClick={() => setIsOpen(!isOpen)}
      />
      <input
        type="text"
        className={styles.colorText}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
      />
      <input
        type="color"
        className={styles.colorPicker}
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

const SpacingInput: React.FC<{
  value: string | undefined;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  // Parse value like "10px 20px" or "10px"
  const parseSpacing = (val: string | undefined) => {
    if (!val) return { top: '', right: '', bottom: '', left: '' };
    const parts = val.split(' ').filter(Boolean);
    
    if (parts.length === 1) {
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    }
    if (parts.length === 2) {
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    }
    if (parts.length === 4) {
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }
    return { top: parts[0] || '', right: parts[1] || '', bottom: parts[2] || '', left: parts[3] || '' };
  };
  
  const spacing = parseSpacing(value);
  
  const handleChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const newSpacing = { ...spacing, [side]: val };
    
    // Format output
    if (newSpacing.top === newSpacing.right && newSpacing.top === newSpacing.bottom && newSpacing.top === newSpacing.left) {
      onChange(newSpacing.top || '0');
    } else if (newSpacing.top === newSpacing.bottom && newSpacing.left === newSpacing.right) {
      onChange(`${newSpacing.top || '0'} ${newSpacing.right || '0'}`);
    } else {
      onChange(`${newSpacing.top || '0'} ${newSpacing.right || '0'} ${newSpacing.bottom || '0'} ${newSpacing.left || '0'}`);
    }
  };
  
  return (
    <div className={styles.spacingInput}>
      <div className={styles.spacingGrid}>
        <input
          type="text"
          className={`${styles.spacingField} ${styles.top}`}
          value={spacing.top}
          onChange={(e) => handleChange('top', e.target.value)}
          placeholder="0"
          title="Top"
        />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.left}`}
          value={spacing.left}
          onChange={(e) => handleChange('left', e.target.value)}
          placeholder="0"
          title="Left"
        />
        <div className={styles.spacingCenter} />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.right}`}
          value={spacing.right}
          onChange={(e) => handleChange('right', e.target.value)}
          placeholder="0"
          title="Right"
        />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.bottom}`}
          value={spacing.bottom}
          onChange={(e) => handleChange('bottom', e.target.value)}
          placeholder="0"
          title="Bottom"
        />
      </div>
    </div>
  );
};

/**
 * Image Input with Media Picker
 * 
 * Pozwala na wybór obrazu z biblioteki mediów site'u
 * lub ręczne wpisanie URL.
 */
const ImageInput: React.FC<{
  value: string | undefined;
  onChange: (value: unknown) => void;
}> = ({ value, onChange }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [value]);

  const handleSelect = useCallback((url: string) => {
    onChange(url);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={styles.imageInput}>
      {/* Thumbnail preview */}
      {value && !previewError && (
        <div className={styles.imagePreview}>
          <Image
            src={value}
            alt="Preview"
            width={64}
            height={64}
            sizes="64px"
            className={styles.imageThumbnail}
            unoptimized
            onError={() => setPreviewError(true)}
          />
          <button
            type="button"
            onClick={handleClear}
            className={styles.imageClearButton}
            title="Remove image"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* URL input + select button */}
      <div className={styles.imageInputRow}>
        <input
          type="text"
          className={styles.textInput}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL..."
        />
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={styles.imageSelectButton}
          title="Select from media library"
        >
          <FiImage />
        </button>
      </div>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelect}
        acceptType="image"
        currentValue={value}
      />
    </div>
  );
};

export default FieldRenderer;
