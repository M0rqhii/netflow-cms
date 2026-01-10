/**
 * Page Builder Context
 * 
 * Kontekst przechowujący siteId i inne ustawienia page buildera
 * aby komponenty potomne miały dostęp do informacji o aktualnym site.
 */

import React, { createContext, useContext, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface PageBuilderContextValue {
  /** ID aktualnego site'u - wymagane do ładowania/zapisywania mediów */
  siteId: string;
  /** Slug site'u - opcjonalny, do wyświetlania */
  siteSlug?: string;
  /** Czy page builder jest w trybie read-only */
  readOnly?: boolean;
}

interface PageBuilderProviderProps {
  children: React.ReactNode;
  siteId: string;
  siteSlug?: string;
  readOnly?: boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const PageBuilderContext = createContext<PageBuilderContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function PageBuilderProvider({
  children,
  siteId,
  siteSlug,
  readOnly = false,
}: PageBuilderProviderProps) {
  const value = useMemo(
    () => ({
      siteId,
      siteSlug,
      readOnly,
    }),
    [siteId, siteSlug, readOnly]
  );

  return (
    <PageBuilderContext.Provider value={value}>
      {children}
    </PageBuilderContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook do pobierania kontekstu page buildera
 * @throws Error jeśli użyty poza PageBuilderProvider
 */
export function usePageBuilderContext(): PageBuilderContextValue {
  const context = useContext(PageBuilderContext);
  
  if (!context) {
    throw new Error(
      'usePageBuilderContext must be used within a PageBuilderProvider. ' +
      'Make sure your PageBuilder component is wrapped with PageBuilderProvider.'
    );
  }
  
  return context;
}

/**
 * Hook do pobierania siteId z kontekstu
 * @throws Error jeśli użyty poza PageBuilderProvider
 */
export function useSiteId(): string {
  const { siteId } = usePageBuilderContext();
  return siteId;
}

/**
 * Hook do sprawdzania czy jesteśmy w trybie read-only
 */
export function useIsReadOnly(): boolean {
  const { readOnly } = usePageBuilderContext();
  return readOnly ?? false;
}

export default PageBuilderContext;
