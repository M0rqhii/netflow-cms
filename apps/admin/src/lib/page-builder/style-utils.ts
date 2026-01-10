/**
 * Style Utilities
 * 
 * Proste dziedziczenie responsive styles:
 * - Klucz istnieje w responsive[breakpoint] → override
 * - Klucz NIE istnieje → dziedziczony z base (desktop)
 * - "Clear override" → usuń klucz
 * 
 * NIE używamy _inherited flag - to logika UI, nie format danych.
 */

import type { BlockProps, BlockStyle, Breakpoint } from './types';

// =============================================================================
// MERGE STYLES
// =============================================================================

/**
 * Merguje base styles z responsive overrides dla danego breakpoint.
 * 
 * @example
 * const styles = mergeStyles(props.style.base, props.style.responsive?.mobile, 'mobile');
 * // base: { padding: '20px', margin: '10px' }
 * // mobile override: { padding: '10px' }
 * // result: { padding: '10px', margin: '10px' }
 */
export function mergeStyles(
  base: Record<string, unknown>,
  responsive: Record<string, unknown> | undefined,
  breakpoint: Breakpoint
): Record<string, unknown> {
  if (breakpoint === 'desktop') {
    return { ...base };
  }
  
  if (!responsive) {
    return { ...base };
  }
  
  // Base + override (klucz w override nadpisuje base)
  return { ...base, ...responsive };
}

/**
 * Merguje styles z BlockStyle object.
 */
export function mergeBlockStyles(
  style: BlockStyle,
  breakpoint: Breakpoint
): Record<string, unknown> {
  return mergeStyles(
    style.base,
    style.responsive?.[breakpoint as 'tablet' | 'mobile'],
    breakpoint
  );
}

// =============================================================================
// OVERRIDE DETECTION
// =============================================================================

/**
 * Sprawdza czy pole jest overridden w danym breakpoint.
 * 
 * @example
 * isOverridden(props, 'mobile', 'padding') // true jeśli padding jest w mobile override
 */
export function isOverridden(
  props: BlockProps,
  breakpoint: Breakpoint,
  key: string
): boolean {
  if (breakpoint === 'desktop') {
    return false; // Desktop to base, nie ma override
  }
  
  return key in (props.style.responsive?.[breakpoint] ?? {});
}

/**
 * Zwraca wszystkie overridden keys dla breakpoint.
 */
export function getOverriddenKeys(
  props: BlockProps,
  breakpoint: Breakpoint
): string[] {
  if (breakpoint === 'desktop') {
    return [];
  }
  
  const override = props.style.responsive?.[breakpoint];
  return override ? Object.keys(override) : [];
}

// =============================================================================
// CLEAR OVERRIDE
// =============================================================================

/**
 * Usuwa override dla klucza (przywraca dziedziczenie z desktop).
 * 
 * @example
 * const newProps = clearOverride(props, 'mobile', 'padding');
 * // Teraz mobile będzie dziedziczyć padding z desktop
 */
export function clearOverride(
  props: BlockProps,
  breakpoint: 'tablet' | 'mobile',
  key: string
): BlockProps {
  const responsive = { ...props.style.responsive };
  const breakpointStyle = { ...responsive[breakpoint] };
  
  delete breakpointStyle[key];
  
  // Clean up empty override objects
  if (Object.keys(breakpointStyle).length === 0) {
    delete responsive[breakpoint];
  } else {
    responsive[breakpoint] = breakpointStyle;
  }
  
  return {
    ...props,
    style: {
      ...props.style,
      responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
    },
  };
}

/**
 * Usuwa wszystkie overrides dla breakpoint.
 */
export function clearAllOverrides(
  props: BlockProps,
  breakpoint: 'tablet' | 'mobile'
): BlockProps {
  const responsive = { ...props.style.responsive };
  delete responsive[breakpoint];
  
  return {
    ...props,
    style: {
      ...props.style,
      responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
    },
  };
}

// =============================================================================
// SET OVERRIDE
// =============================================================================

/**
 * Ustawia override dla klucza w breakpoint.
 * 
 * @example
 * const newProps = setOverride(props, 'mobile', 'padding', '10px');
 */
export function setOverride(
  props: BlockProps,
  breakpoint: 'tablet' | 'mobile',
  key: string,
  value: unknown
): BlockProps {
  const responsive = props.style.responsive 
    ? { ...props.style.responsive }
    : {};
  
  responsive[breakpoint] = {
    ...responsive[breakpoint],
    [key]: value,
  };
  
  return {
    ...props,
    style: {
      ...props.style,
      responsive,
    },
  };
}

/**
 * Ustawia wiele overrides naraz.
 */
export function setOverrides(
  props: BlockProps,
  breakpoint: 'tablet' | 'mobile',
  overrides: Record<string, unknown>
): BlockProps {
  const responsive = props.style.responsive 
    ? { ...props.style.responsive }
    : {};
  
  responsive[breakpoint] = {
    ...responsive[breakpoint],
    ...overrides,
  };
  
  return {
    ...props,
    style: {
      ...props.style,
      responsive,
    },
  };
}

// =============================================================================
// GET STYLE VALUE
// =============================================================================

/**
 * Zwraca wartość stylu dla danego breakpoint z info o dziedziczeniu.
 * Używane w UI do pokazania inherited indicator.
 * 
 * @example
 * const { value, isInherited } = getStyleValue(props, 'mobile', 'padding');
 * // value: '10px', isInherited: false (jest override)
 * // lub
 * // value: '20px', isInherited: true (dziedziczone z desktop)
 */
export function getStyleValue(
  props: BlockProps,
  breakpoint: Breakpoint,
  key: string
): { value: unknown; isInherited: boolean } {
  if (breakpoint === 'desktop') {
    return { 
      value: props.style.base[key], 
      isInherited: false,
    };
  }
  
  const override = props.style.responsive?.[breakpoint]?.[key];
  
  if (override !== undefined) {
    return { 
      value: override, 
      isInherited: false,
    };
  }
  
  return { 
    value: props.style.base[key], 
    isInherited: true,
  };
}

// =============================================================================
// SET BASE STYLE
// =============================================================================

/**
 * Ustawia wartość w base style (desktop).
 */
export function setBaseStyle(
  props: BlockProps,
  key: string,
  value: unknown
): BlockProps {
  return {
    ...props,
    style: {
      ...props.style,
      base: {
        ...props.style.base,
        [key]: value,
      },
    },
  };
}

/**
 * Ustawia wiele wartości w base style naraz.
 */
export function setBaseStyles(
  props: BlockProps,
  styles: Record<string, unknown>
): BlockProps {
  return {
    ...props,
    style: {
      ...props.style,
      base: {
        ...props.style.base,
        ...styles,
      },
    },
  };
}

// =============================================================================
// STYLE HELPERS
// =============================================================================

/**
 * Konwertuje spacing value na CSS.
 * Wspiera: '10px', '10', 10, { top: 10, right: 20, bottom: 10, left: 20 }
 */
export function toSpacingCSS(
  value: unknown
): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  
  if (typeof value === 'string') {
    return value.includes('px') || value.includes('%') || value.includes('rem')
      ? value
      : `${value}px`;
  }
  
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    const top = toSpacingCSS(v.top ?? 0);
    const right = toSpacingCSS(v.right ?? 0);
    const bottom = toSpacingCSS(v.bottom ?? 0);
    const left = toSpacingCSS(v.left ?? 0);
    return `${top} ${right} ${bottom} ${left}`;
  }
  
  return '0';
}

/**
 * Generuje CSS object z merged styles.
 */
export function toStyleObject(
  props: BlockProps,
  breakpoint: Breakpoint
): React.CSSProperties {
  const merged = mergeBlockStyles(props.style, breakpoint);
  const css: React.CSSProperties = {};
  
  // Map our style keys to CSS properties
  const mappings: Record<string, keyof React.CSSProperties> = {
    padding: 'padding',
    margin: 'margin',
    backgroundColor: 'backgroundColor',
    color: 'color',
    fontSize: 'fontSize',
    fontWeight: 'fontWeight',
    textAlign: 'textAlign',
    width: 'width',
    maxWidth: 'maxWidth',
    minHeight: 'minHeight',
    borderRadius: 'borderRadius',
  };
  
  for (const [key, cssKey] of Object.entries(mappings)) {
    if (merged[key] !== undefined) {
      if (key === 'padding' || key === 'margin') {
        (css as Record<string, unknown>)[cssKey] = toSpacingCSS(merged[key]);
      } else {
        (css as Record<string, unknown>)[cssKey] = merged[key];
      }
    }
  }
  
  return css;
}
