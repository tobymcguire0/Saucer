import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type TextSize = "normal" | "large";
export type DefaultServings = 2 | 4 | 6;

export interface Preferences {
  themeMode: ThemeMode;
  compactCards: boolean;
  textSize: TextSize;
  showCookTimeOnCards: boolean;
  autoSuggestTagsOnImport: boolean;
  defaultServings: DefaultServings;
}

const defaults: Preferences = {
  themeMode: "system",
  compactCards: false,
  textSize: "normal",
  showCookTimeOnCards: true,
  autoSuggestTagsOnImport: true,
  defaultServings: 4,
};

type PreferencesState = Preferences & {
  setThemeMode: (mode: ThemeMode) => void;
  setCompactCards: (value: boolean) => void;
  setTextSize: (value: TextSize) => void;
  setShowCookTimeOnCards: (value: boolean) => void;
  setAutoSuggestTagsOnImport: (value: boolean) => void;
  setDefaultServings: (value: DefaultServings) => void;
  reset: () => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      setThemeMode: (themeMode) => set({ themeMode }),
      setCompactCards: (compactCards) => set({ compactCards }),
      setTextSize: (textSize) => set({ textSize }),
      setShowCookTimeOnCards: (showCookTimeOnCards) => set({ showCookTimeOnCards }),
      setAutoSuggestTagsOnImport: (autoSuggestTagsOnImport) => set({ autoSuggestTagsOnImport }),
      setDefaultServings: (defaultServings) => set({ defaultServings }),
      reset: () => set(defaults),
    }),
    { name: "saucer-preferences" },
  ),
);
