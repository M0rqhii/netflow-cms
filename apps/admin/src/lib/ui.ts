"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenu: (v: boolean) => void;
};

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebar: (v: boolean) => set({ sidebarCollapsed: v }),
      toggleMobileMenu: () => set({ mobileMenuOpen: !get().mobileMenuOpen }),
      setMobileMenu: (v: boolean) => set({ mobileMenuOpen: v }),
    }),
    { name: 'nf-ui' }
  )
);

