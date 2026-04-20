import { useEffect, useState } from "react";

import { cn } from "../../../lib/cn";
import {
  normalizeHexColor,
  type ThemeFamily,
  type ThemePalette,
} from "../../../lib/theme";
import { useThemeStore } from "../useThemeStore";

const paletteFields: Array<{
  family: ThemeFamily;
  label: string;
  description: string;
}> = [
  {
    family: "primary",
    label: "Primary",
    description: "Main action color",
  },
  {
    family: "accent",
    label: "Accent",
    description: "Highlights and alerts",
  },
  {
    family: "background",
    label: "Background",
    description: "App canvas and soft surfaces",
  },
  {
    family: "panel",
    label: "Panel",
    description: "Cards, sections, and framing",
  },
  {
    family: "text",
    label: "Text",
    description: "Readable copy and dark contrast",
  },
];

function ThemePalettePanel() {
  const palette = useThemeStore((state) => state.palette);
  const setPaletteColor = useThemeStore((state) => state.setPaletteColor);
  const [draft, setDraft] = useState<ThemePalette>(palette);
  const [invalidFamilies, setInvalidFamilies] = useState<Partial<Record<ThemeFamily, true>>>({});

  useEffect(() => {
    setDraft(palette);
    setInvalidFamilies({});
  }, [palette]);

  function clearFamilyError(family: ThemeFamily) {
    setInvalidFamilies((current) => {
      if (!current[family]) {
        return current;
      }

      const next = { ...current };
      delete next[family];
      return next;
    });
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-text-60">Adjust Color Palette</h2>
      </div>
      <div id="theme-palette-editor" className="mt-4 flex flex-wrap items-center gap-3">
        {paletteFields.map(({ family, label }) => (
          
          <div key={family} 
          >
            <input
            key={family}
            id = {`${family}-color-input`}
            type="color"
            style={{ visibility: "hidden", position: "absolute" }}
            value={draft[family]}
            aria-label={`${label} color picker`}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              clearFamilyError(family);
              setDraft((current) => ({ ...current, [family]: nextValue }));
              setPaletteColor(family, nextValue);
            }}
            />
            <button 
              onClick={() => document.getElementById(`${family}-color-input`)?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-panel-15 bg-background-5 px-3 py-2 hover:bg-background-10 focus:outline-none focus:ring-2 focus:ring-accent-20 focus:ring-offset-2">
              <span
                className="h-4 w-4 rounded-full border border-text-10"
                style={{ backgroundColor: palette[family] }}
              />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-text-35">
                {label}
              </span>
            </button>
            
          </div>
        ))}
      </div>
    </section>
  );
}

export default ThemePalettePanel;
