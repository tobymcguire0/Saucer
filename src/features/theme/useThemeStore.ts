import { create } from "zustand";

import {
  applyThemePalette,
  clearStoredThemePalette,
  defaultThemePalette,
  normalizeHexColor,
  persistThemePalette,
  readStoredThemePalette,
  type ThemeFamily,
  type ThemePalette,
} from "../../lib/theme";

function createInitialState() {
  return {
    palette: readStoredThemePalette(),
  };
}

type ThemeStoreState = ReturnType<typeof createInitialState> & {
  setPaletteColor: (family: ThemeFamily, color: string) => boolean;
  resetPalette: () => void;
  reset: () => void;
};

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  ...createInitialState(),
  setPaletteColor: (family, color) => {
    const normalized = normalizeHexColor(color);

    if (!normalized) {
      return false;
    }

    const nextPalette: ThemePalette = {
      ...get().palette,
      [family]: normalized,
    };

    persistThemePalette(nextPalette);
    applyThemePalette(nextPalette);
    set({ palette: nextPalette });
    return true;
  },
  resetPalette: () => {
    const nextPalette = { ...defaultThemePalette };
    clearStoredThemePalette();
    applyThemePalette(nextPalette);
    set({ palette: nextPalette });
  },
  reset: () => {
    const nextPalette = readStoredThemePalette();
    applyThemePalette(nextPalette);
    set({ palette: nextPalette });
  },
}));

applyThemePalette(useThemeStore.getState().palette);

export function resetThemeStore() {
  useThemeStore.getState().reset();
}
