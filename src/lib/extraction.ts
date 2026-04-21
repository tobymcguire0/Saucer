import { invoke } from "@tauri-apps/api/core";

import type { SourceType } from "./models";
import { createEmptyDraft } from "./taxonomy";

const cuisineHints = [
  "Italian",
  "French",
  "Spanish",
  "Mexican",
  "Indian",
  "Chinese",
  "Japanese",
  "Thai",
  "American",
  "Mediterranean",
  "Middle Eastern",
] as const;

const mealTypeHints = [
  "Breakfast",
  "Brunch",
  "Lunch",
  "Dinner",
  "Dessert",
  "Snack",
] as const;

function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toText(entry)).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      toText(record.text) ||
      toText(record.name) ||
      toText(record.url) ||
      toText(record["@value"]) ||
      ""
    );
  }

  return "";
}

function inferFromKeywords(input: unknown, values: readonly string[]) {
  const normalized = toText(input).toLowerCase();
  if (!normalized) {
    return "";
  }
  return values.find((value) => normalized.includes(value.toLowerCase())) ?? "";
}

function resolveUrl(value: string, sourceUrl: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  try {
    return new URL(trimmed, sourceUrl).toString();
  } catch {
    return "";
  }
}

function extractImageUrl(value: unknown, sourceUrl: string): string {
  if (typeof value === "string") {
    return resolveUrl(value, sourceUrl);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractImageUrl(entry, sourceUrl);
      if (candidate) {
        return candidate;
      }
    }
    return "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      extractImageUrl(record.url, sourceUrl) ||
      extractImageUrl(record.contentUrl, sourceUrl) ||
      extractImageUrl(record.thumbnailUrl, sourceUrl) ||
      ""
    );
  }

  return "";
}

function cleanLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSection(lines: string[], startMatchers: RegExp[], endMatchers: RegExp[]) {
  const startIndex = lines.findIndex((line) => startMatchers.some((matcher) => matcher.test(line)));
  if (startIndex === -1) {
    return [];
  }

  const nextIndex = lines.findIndex(
    (line, index) => index > startIndex && endMatchers.some((matcher) => matcher.test(line)),
  );

  return lines.slice(startIndex + 1, nextIndex === -1 ? lines.length : nextIndex);
}

export function extractDraftFromPlainText(input: string, sourceType: SourceType = "text") {
  const draft = createEmptyDraft(sourceType);
  const lines = cleanLines(input);
  draft.sourceRef = sourceType === "website" ? "" : "Local text import";
  draft.title = lines[0]?.replace(/^#\s*/, "") || "Imported recipe";

  const summaryLine = lines.find(
    (line) =>
      !/^ingredients|instructions|method|directions|serves|feeds|yield/i.test(line) &&
      line !== draft.title,
  );
  draft.summary = summaryLine ?? "";

  const ingredientLines = extractSection(
    lines,
    [/^ingredients/i],
    [/^instructions/i, /^method/i, /^directions/i],
  );
  const instructionLines = extractSection(
    lines,
    [/^instructions/i, /^method/i, /^directions/i],
    [/^notes/i],
  );

  draft.ingredientsText = (ingredientLines.length > 0
    ? ingredientLines
    : lines.filter((line) => /^[-*•]/.test(line) || /^\d+\s?(g|kg|ml|cup|tbsp|tsp)/i.test(line))
  ).join("\n");

  draft.instructionsText = (instructionLines.length > 0
    ? instructionLines
    : lines.filter((line) => /^\d+[.)]/.test(line))
  ).join("\n");

  const servingsMatch = input.match(/(?:serves|feeds|yield[s]?)\s*:?\s*([^\n.]+)/i);
  draft.servings = servingsMatch?.[1]?.trim() ?? "";
  draft.cuisine = inferFromKeywords(input, cuisineHints);
  draft.mealType = inferFromKeywords(input, mealTypeHints);
  return draft;
}

type RecipeJsonLd = {
  "@type"?: string | string[];
  name?: unknown;
  image?: unknown;
  recipeIngredient?: string[];
  recipeInstructions?: Array<string | { text?: string }> | string;
  recipeYield?: unknown;
  recipeCuisine?: unknown;
  recipeCategory?: unknown;
  description?: unknown;
};

function extractJsonLdRecipe(document: Document) {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      const entries = Array.isArray(parsed)
        ? parsed
        : "@graph" in parsed && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];

      const recipe = entries.find((entry: RecipeJsonLd) => {
        const type = entry?.["@type"];
        return Array.isArray(type) ? type.includes("Recipe") : type === "Recipe";
      }) as RecipeJsonLd | undefined;

      if (recipe) {
        return recipe;
      }
    } catch {
      continue;
    }
  }
}

type WebsiteImportPayload = {
  url: string;
  html: string;
};

export function parseDraftFromWebsiteHtml(html: string, sourceUrl: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const draft = createEmptyDraft("website");
  draft.sourceRef = sourceUrl;
  const jsonLdRecipe = extractJsonLdRecipe(document);

  if (jsonLdRecipe) {
    draft.title = normalizeExtractedText(jsonLdRecipe.name) || "Imported recipe";
    draft.summary = normalizeExtractedText(jsonLdRecipe.description);
    draft.ingredientsText = normalizeMultilineText(
      (jsonLdRecipe.recipeIngredient ?? []).map((x) => decodeHtmlEntities(String(x))).join("\n"),
    );
    draft.instructionsText = normalizeMultilineText(
      Array.isArray(jsonLdRecipe.recipeInstructions)
        ? jsonLdRecipe.recipeInstructions
            .map((step) => (typeof step === "string" ? step : step.text ?? ""))
            .join("\n")
        : String(jsonLdRecipe.recipeInstructions ?? ""),
    );
    draft.servings = normalizeExtractedText(jsonLdRecipe.recipeYield);
    draft.cuisine =
      inferFromKeywords(jsonLdRecipe.recipeCuisine, cuisineHints) ||
      toText(jsonLdRecipe.recipeCuisine) ||
      (document.body.textContent ? inferFromKeywords(document.body.textContent, cuisineHints) : "");
    draft.mealType =
      inferFromKeywords(jsonLdRecipe.recipeCategory, mealTypeHints) ||
      toText(jsonLdRecipe.recipeCategory) ||
      (document.body.textContent ? inferFromKeywords(document.body.textContent, mealTypeHints) : "");
    return draft;
  }

  const fallbackDraft = extractDraftFromPlainText(document.body.textContent ?? "", "website");
  return {
    ...fallbackDraft,
    sourceRef: sourceUrl,
    title: document.title || fallbackDraft.title,
    summary: fallbackDraft.summary || "Fallback extraction from page text.",
    heroImage: extractImageUrl(
      document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "",
      sourceUrl,
    ),
  };
}

function decodeHtmlEntities(value: string): string {
  if (!value || !value.includes("&")) return value;

  // Decode up to 3 passes to handle double-encoded content like &amp;frac12;
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = current;
    const decoded = textarea.value;
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

function normalizeExtractedText(value: unknown): string {
  return decodeHtmlEntities(toText(value)).trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .split("\n")
    .map((line) => decodeHtmlEntities(line).trimEnd())
    .join("\n")
    .trim();
}

export async function extractDraftFromWebsite(url: string) {
  const payload = await invoke<WebsiteImportPayload>("fetch_recipe_page", { url });
  return parseDraftFromWebsiteHtml(payload.html, payload.url || url);
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function extractDraftFromTextFile(file: File) {
  const text = await readFileAsText(file);
  const draft = extractDraftFromPlainText(text, "text");
  draft.sourceRef = file.name;
  return draft;
}

export async function extractDraftFromPhoto(file: File) {
  const heroImage = await readFileAsDataUrl(file);
  const draft = createEmptyDraft("photo");
  draft.sourceRef = file.name;
  draft.title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  draft.summary =
    "Image imports prefill the photo and filename. OCR and vision extraction can be upgraded behind the extraction adapter later.";
  draft.heroImage = heroImage;
  draft.mealType = inferFromKeywords(file.name, mealTypeHints);
  draft.cuisine = inferFromKeywords(file.name, cuisineHints);
  return draft;
}
