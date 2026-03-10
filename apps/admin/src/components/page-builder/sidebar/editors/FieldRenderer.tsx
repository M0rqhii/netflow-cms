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
import { useTranslations } from '@/hooks/useTranslations';

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
  const t = useTranslations();
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
          <option value="">{t('sitePanelShell.pageBuilderUi.fieldRenderer.selectPlaceholder')}</option>
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
            placeholder={placeholder || t('sitePanelShell.pageBuilderUi.fieldRenderer.linkPlaceholder')}
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (input: string | undefined) => {
  if (!input) return null;
  const trimmed = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return null;
  const full = trimmed.length === 3 ? trimmed.split('').map((ch) => `${ch}${ch}`).join('') : trimmed;
  return `#${full.toLowerCase()}`;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex) ?? '#3b82f6';
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((part) => clamp(Math.round(part), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsv = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }

  return {
    h: Math.round((h * 60 + 360) % 360),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hn < 60) [rp, gp, bp] = [c, x, 0];
  else if (hn < 120) [rp, gp, bp] = [x, c, 0];
  else if (hn < 180) [rp, gp, bp] = [0, c, x];
  else if (hn < 240) [rp, gp, bp] = [0, x, c];
  else if (hn < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
};

const PRESET_COLORS = [
  '#ff4d6d', '#ff8a00', '#ffd600', '#70e000', '#00d4ff', '#4f8cff', '#7b61ff', '#d946ef',
  '#ffffff', '#e2e8f0', '#94a3b8', '#475569', '#1f2937', '#0f172a', '#000000', '#0ea5e9',
];

const ColorInput: React.FC<{
  value: string | undefined;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(normalizeHex(value) ?? '#3b82f6');
  const colorWrapRef = React.useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorWrapRef.current && !colorWrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const initialRgb = hexToRgb(hexInput);
  const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);
  const [hsv, setHsv] = useState(initialHsv);

  useEffect(() => {
    const normalized = normalizeHex(value) ?? '#3b82f6';
    setHexInput(normalized);
    const rgb = hexToRgb(normalized);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
  }, [value]);

  const applyHsv = useCallback((nextHsv: { h: number; s: number; v: number }) => {
    setHsv(nextHsv);
    const rgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSVPick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    applyHsv({ ...hsv, s, v });
  }, [hsv, applyHsv]);

  const handleHuePick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const h = Math.round((x / rect.width) * 360);
    applyHsv({ ...hsv, h });
  }, [hsv, applyHsv]);

  const hueColor = rgbToHex(...Object.values(hsvToRgb(hsv.h, 100, 100)) as [number, number, number]);
  const currentHex = normalizeHex(hexInput) ?? '#3b82f6';

  return (
    <div className={styles.colorInputWrap} ref={colorWrapRef}>
      <div className={styles.colorInput}>
        <button
          type="button"
          className={styles.colorSwatchButton}
          style={{ backgroundColor: currentHex }}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={t('sitePanelShell.pageBuilderUi.fieldRenderer.openColorPicker')}
        />
        <input
          type="text"
          className={styles.colorText}
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={() => {
            const normalized = normalizeHex(hexInput);
            if (!normalized) {
              setHexInput(currentHex);
              return;
            }
            const rgb = hexToRgb(normalized);
            setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
            setHexInput(normalized);
            onChange(normalized);
          }}
          placeholder="#000000"
        />
      </div>

      {isOpen && (
        <div className={styles.colorPopover}>
          <div
            className={styles.colorSpectrum}
            style={{ backgroundColor: hueColor }}
            onMouseDown={handleSVPick}
            onMouseMove={(e) => {
              if (e.buttons !== 1) return;
              handleSVPick(e);
            }}
          >
            <div className={styles.colorSpectrumWhite} />
            <div className={styles.colorSpectrumBlack} />
            <span
              className={styles.colorSpectrumHandle}
              style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
            />
          </div>

          <div
            className={styles.colorHueBar}
            onMouseDown={handleHuePick}
            onMouseMove={(e) => {
              if (e.buttons !== 1) return;
              handleHuePick(e);
            }}
          >
            <span className={styles.colorHueHandle} style={{ left: `${(hsv.h / 360) * 100}%` }} />
          </div>

          <div className={styles.colorPresets}>
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.colorPreset}
                style={{ backgroundColor: preset }}
                onClick={() => {
                  setHexInput(preset);
                  const rgb = hexToRgb(preset);
                  setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                  onChange(preset);
                }}
                aria-label={t('sitePanelShell.pageBuilderUi.fieldRenderer.useColor', { color: preset })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SpacingInput: React.FC<{
  value: string | undefined;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const t = useTranslations();
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
    // CSS 3-value shorthand: top right bottom (left = right)
    if (parts.length === 3) {
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
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
          title={t('sitePanelShell.pageBuilderUi.fieldRenderer.top')}
        />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.left}`}
          value={spacing.left}
          onChange={(e) => handleChange('left', e.target.value)}
          placeholder="0"
          title={t('sitePanelShell.pageBuilderUi.fieldRenderer.left')}
        />
        <div className={styles.spacingCenter} />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.right}`}
          value={spacing.right}
          onChange={(e) => handleChange('right', e.target.value)}
          placeholder="0"
          title={t('sitePanelShell.pageBuilderUi.fieldRenderer.right')}
        />
        <input
          type="text"
          className={`${styles.spacingField} ${styles.bottom}`}
          value={spacing.bottom}
          onChange={(e) => handleChange('bottom', e.target.value)}
          placeholder="0"
          title={t('sitePanelShell.pageBuilderUi.fieldRenderer.bottom')}
        />
      </div>
    </div>
  );
};

/**
 * Image Input with Media Picker
 *
 * Allows selecting an image from the site media library
 * or entering a URL manually.
 */
const ImageInput: React.FC<{
  value: string | undefined;
  onChange: (value: unknown) => void;
}> = ({ value, onChange }) => {
  const t = useTranslations();
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

  const showPreview = Boolean(value?.trim());

  return (
    <div className={styles.imageInput}>
      {/* Thumbnail preview or broken placeholder */}
      {showPreview && (
        <div className={styles.imagePreview}>
          {!previewError ? (
            <Image
              src={value!}
              alt={t('sitePanelShell.pageBuilderUi.fieldRenderer.preview')}
              width={64}
              height={64}
              sizes="64px"
              className={styles.imageThumbnail}
              unoptimized
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className={styles.imagePreviewBroken} title={value}>
              <FiImage aria-hidden />
              <span>{t('sitePanelShell.pageBuilderUi.fieldRenderer.invalidOrInaccessible')}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className={styles.imageClearButton}
            title={t('sitePanelShell.pageBuilderUi.fieldRenderer.removeImage')}
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
          placeholder={t('sitePanelShell.pageBuilderUi.fieldRenderer.imageUrlPlaceholder')}
        />
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={styles.imageSelectButton}
          title={t('sitePanelShell.pageBuilderUi.fieldRenderer.selectFromMediaLibrary')}
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






