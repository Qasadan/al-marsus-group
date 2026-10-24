import { create } from "zustand";

interface SettingsState {
  currency: string;
  taxRate: number;
  loaded: boolean;
  load: () => Promise<void>;
}

// Client-side store for commonly used company settings (currency for
// formatting money). Loaded once from /api/settings.
export const useSettingsStore = create<SettingsState>((set, get) => ({
  currency: "KES",
  taxRate: 0,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/settings");
      const payload = await res.json();
      if (payload?.success) {
        set({ currency: payload.data.currency, taxRate: payload.data.taxRate, loaded: true });
      }
    } catch {
      // keep defaults
    }
  },
}));
