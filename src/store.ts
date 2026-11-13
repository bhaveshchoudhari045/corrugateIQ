import { create } from 'zustand';
import { DEFAULT_FILTERS, NO_LEVERS } from './engine';
import type { Filters, Levers, MachineId } from './types';

type Theme = 'light' | 'dark';
export type DrawerState = { kind: 'machine'; id: MachineId } | { kind: 'thermal' } | { kind: 'queue' } | { kind: 'whatif' } | null;
export type WasteSel = 'good' | 'trim' | 'reject' | 'diecut' | null;

const initialTheme = (): Theme => {
  try { const t = localStorage.getItem('ciq-theme'); if (t === 'dark' || t === 'light') return t; } catch { /* ignore */ }
  return 'dark';
};
const applyTheme = (t: Theme) => {
  document.documentElement.classList.toggle('dark', t === 'dark');
  try { localStorage.setItem('ciq-theme', t); } catch { /* ignore */ }
};

interface S {
  theme: Theme; toggleTheme: () => void;
  filters: Filters; setFilter: (p: Partial<Filters>) => void; resetFilters: () => void;
  levers: Levers; setLevers: (l: Levers) => void; resetLevers: () => void;
  drawer: DrawerState; openDrawer: (d: DrawerState) => void; closeDrawer: () => void;
  wasteSel: WasteSel; setWasteSel: (w: WasteSel) => void;
}

export const useStore = create<S>((set, get) => {
  const t = initialTheme();
  applyTheme(t);
  return {
    theme: t,
    toggleTheme: () => { const n: Theme = get().theme === 'dark' ? 'light' : 'dark'; applyTheme(n); set({ theme: n }); },
    filters: DEFAULT_FILTERS,
    setFilter: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
    resetFilters: () => set({ filters: DEFAULT_FILTERS }),
    levers: NO_LEVERS,
    setLevers: (l) => set({ levers: l }),
    resetLevers: () => set({ levers: NO_LEVERS }),
    drawer: null,
    openDrawer: (d) => set({ drawer: d }),
    closeDrawer: () => set({ drawer: null }),
    wasteSel: null,
    setWasteSel: (w) => set((s) => ({ wasteSel: s.wasteSel === w ? null : w })),
  };
});
