// Zustand store for UI-local state ONLY.
//
// This store never mirrors server data (that's React Query's job).
// Only things that are purely client-side UX go here:
//   - sidebar open/closed
//   - which modal is active
//   - active filter/sort panels that aren't worth URL params
//
// Server state (entities, lists, counts) lives in React Query.
// Form state lives in react-hook-form (P4).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveModal =
  | null
  | { type: 'create-area' }
  | { type: 'create-project'; area_id?: string }
  | { type: 'create-task'; project_id?: string; area_id?: string }
  | { type: 'create-resource'; area_id?: string }
  | { type: 'create-sprint' }
  | { type: 'link-picker'; source_type: string; source_id: string };

interface UiState {
  sidebarOpen: boolean;
  activeModal: ActiveModal;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openModal: (modal: Exclude<ActiveModal, null>) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: 'lifeos-ui',
      // Only persist the durable preference. Modal state should reset on reload.
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    },
  ),
);
