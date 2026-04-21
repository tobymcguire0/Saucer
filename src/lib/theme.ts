const lightMixTarget = "#ffffff";
const darkMixTarget = "#000000";
const maxLightMix = 0.92;
const maxDarkMix = 0.88;

export const themeFamilies = ["primary", "accent", "background", "panel", "text"] as const;
export const themeScaleSteps = [
  0,
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  65,
  70,
  75,
  80,
  85,
  90,
  95,
  100,
] as const;
export const themePaletteStorageKey = "saucer-theme-palette";

export type ThemeFamily = (typeof themeFamilies)[number];
export type ThemeScaleStep = (typeof themeScaleSteps)[number];
export type ThemePalette = Record<ThemeFamily, string>;
export type ThemeScale = Record<ThemeScaleStep, string>;
export type ThemeTokens = Record<ThemeFamily, ThemeScale>;

export const defaultThemePalette: ThemePalette = {
  primary: "rgb(4, 183, 18)",
  accent: "rgb(135, 252, 114)",
  background: "rgb(37, 37, 37)",
  panel: "rgb(60, 60, 60)",
  text: "rgb(21, 20, 31)",
};

function getLocalStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixColors(baseHex: string, mixHex: string, amount: number) {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);

  return rgbToHex({
    r: base.r + (mix.r - base.r) * amount,
    g: base.g + (mix.g - base.g) * amount,
    b: base.b + (mix.b - base.b) * amount,
  });
}

function isPaletteRecord(value: unknown): value is Partial<Record<ThemeFamily, string>> {
  return typeof value === "object" && value !== null;
}

// Step 50 is the base color; steps below 50 mix toward white, steps above mix toward black.
function createScale(baseHex: string): ThemeScale {
  const scale = {} as ThemeScale;

  for (const step of themeScaleSteps) {
    if (step === 50) {
      scale[step] = baseHex;
      continue;
    }

    if (step < 50) {
      const mixAmount = ((50 - step) / 50) * maxLightMix;
      scale[step] = mixColors(baseHex, lightMixTarget, mixAmount);
      continue;
    }

    const mixAmount = ((step - 50) / 50) * maxDarkMix;
    scale[step] = mixColors(baseHex, darkMixTarget, mixAmount);
  }

  return scale;
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();

  if (/^#?[0-9a-f]{3}$/i.test(trimmed)) {
    const expanded = trimmed.replace("#", "");
    return `#${expanded
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^#?[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.replace("#", "").toLowerCase()}`;
  }

  return undefined;
}

export function buildThemeTokens(palette: ThemePalette): ThemeTokens {
  return {
    primary: createScale(palette.primary),
    accent: createScale(palette.accent),
    background: createScale(palette.background),
    panel: createScale(palette.panel),
    text: createScale(palette.text),
  };
}

export function readStoredThemePalette(storage = getLocalStorage()): ThemePalette {
  const raw = storage?.getItem(themePaletteStorageKey);

  if (!raw) {
    return { ...defaultThemePalette };
  }

  try {
    const parsed = JSON.parse(raw);

    if (!isPaletteRecord(parsed)) {
      return { ...defaultThemePalette };
    }

    const palette = {} as ThemePalette;

    for (const family of themeFamilies) {
      const normalized = normalizeHexColor(parsed[family] ?? "");

      if (!normalized) {
        return { ...defaultThemePalette };
      }

      palette[family] = normalized;
    }

    return palette;
  } catch {
    return { ...defaultThemePalette };
  }
}

export function persistThemePalette(palette: ThemePalette, storage = getLocalStorage()) {
  storage?.setItem(themePaletteStorageKey, JSON.stringify(palette));
}

export function clearStoredThemePalette(storage = getLocalStorage()) {
  storage?.removeItem(themePaletteStorageKey);
}

export function applyThemeTokens(tokens: ThemeTokens, target?: HTMLElement) {
  const root = target ?? (typeof document === "undefined" ? undefined : document.documentElement);

  if (!root) {
    return;
  }

  for (const family of themeFamilies) {
    for (const step of themeScaleSteps) {
      root.style.setProperty(`--color-${family}-${step}`, tokens[family][step]);
    }
  }
}

export function applyThemePalette(palette: ThemePalette, target?: HTMLElement) {
  applyThemeTokens(buildThemeTokens(palette), target);
}
