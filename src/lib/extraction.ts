import { invoke } from "@tauri-apps/api/core";
import { createWorker } from "tesseract.js";

import type { ApiPhotoExtraction } from "./apiClient";
import type { RecipeDraft, SourceType } from "./models";
import { canUseTauri } from "./persistence";
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
      toText(record["@value"]) || // JSON-LD RDF literal form
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

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || url.startsWith("data:image/");
  } catch {
    return false;
  }
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
      // JSON-LD may embed multiple typed nodes under an @graph container.
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

export type TextExtractor = (text: string, pageTitle?: string) => Promise<ApiPhotoExtraction>;
export type WebsitePageFetcher = (url: string) => Promise<{ url: string; html: string }>;

export function parseDraftFromWebsiteHtml(
  html: string,
  sourceUrl: string,
  extractText?: TextExtractor,
) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const draft = createEmptyDraft("website");
  draft.sourceRef = sourceUrl;
  const jsonLdRecipe = extractJsonLdRecipe(document);

  if (jsonLdRecipe) {
    // JSON-LD is already structured — no need for LLM extraction.
    draft.title = normalizeExtractedText(jsonLdRecipe.name) || "Imported recipe";
    draft.summary = normalizeExtractedText(jsonLdRecipe.description);
    const extractedImageUrl = extractImageUrl(jsonLdRecipe.image, sourceUrl);
    draft.heroImage = (extractedImageUrl && isValidImageUrl(extractedImageUrl)) ? extractedImageUrl : undefined;
    draft.ingredientsText = normalizeMultilineText(
      (Array.isArray(jsonLdRecipe.recipeIngredient) ? jsonLdRecipe.recipeIngredient : [])
        .map((x) => decodeHtmlEntities(String(x)))
        .join("\n"),
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

  // No JSON-LD: try LLM extraction on the page body text before falling back to heuristics.
  const heroImage = extractImageUrl(
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "",
    sourceUrl,
  );
  const validatedHeroImage = (heroImage && isValidImageUrl(heroImage)) ? heroImage : undefined;
  if (extractText) {
    return extractText(document.body.textContent ?? "", document.title)
      .then((result) => {
        draft.title = result.title || document.title || "Imported recipe";
        draft.summary = result.summary;
        draft.ingredientsText = result.ingredients.join("\n");
        draft.instructionsText = result.instructions.join("\n");
        draft.servings = result.servings;
        draft.cuisine = result.cuisine;
        draft.mealType = result.mealType;
        draft.heroImage = validatedHeroImage;
        return draft;
      })
      .catch(() => {
        // LLM call failed — fall through to heuristic parsing.
        const fallbackDraft = extractDraftFromPlainText(document.body.textContent ?? "", "website");
        return {
          ...fallbackDraft,
          sourceRef: sourceUrl,
          title: document.title || fallbackDraft.title,
          summary: fallbackDraft.summary || "Fallback extraction from page text.",
          heroImage: validatedHeroImage,
        };
      });
  }

  const fallbackDraft = extractDraftFromPlainText(document.body.textContent ?? "", "website");
  return {
    ...fallbackDraft,
    sourceRef: sourceUrl,
    title: document.title || fallbackDraft.title,
    summary: fallbackDraft.summary || "Fallback extraction from page text.",
    heroImage: validatedHeroImage,
  };
}

function decodeHtmlEntities(value: string): string {
  if (!value || !value.includes("&")) return value;
  // Use DOMParser to safely decode HTML entities without innerHTML assignment
  const doc = new DOMParser().parseFromString(value, "text/html");
  return doc.body.textContent ?? value;
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

export async function extractDraftFromWebsite(
  url: string,
  extractText?: TextExtractor,
  fetchPage?: WebsitePageFetcher,
) {
  let payload: WebsiteImportPayload;
  if (canUseTauri()) {
    payload = await invoke<WebsiteImportPayload>("fetch_recipe_page", { url });
  } else if (fetchPage) {
    payload = await fetchPage(url);
  } else {
    throw new Error("Connect to the server to import from websites.");
  }
  return await parseDraftFromWebsiteHtml(payload.html, payload.url || url, extractText);
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

export async function extractDraftFromTextFile(file: File, extractText?: TextExtractor) {
  const text = await readFileAsText(file);

  if (extractText) {
    try {
      const result = await extractText(text);
      const draft = createEmptyDraft("text");
      draft.title = result.title || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      draft.summary = result.summary;
      draft.ingredientsText = result.ingredients.join("\n");
      draft.instructionsText = result.instructions.join("\n");
      draft.servings = result.servings;
      draft.cuisine = result.cuisine;
      draft.mealType = result.mealType;
      draft.sourceRef = file.name;
      return draft;
    } catch {
      // LLM call failed — fall through to local parsing.
    }
  }

  const draft = extractDraftFromPlainText(text, "text");
  draft.sourceRef = file.name;
  return draft;
}
export async function extractDraftFromPhoto(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const worker = await createWorker("eng");
  try {
    const { data: { text } } = await worker.recognize(dataUrl);
    const draft = extractDraftFromPlainText(text, "photo");
    if (!draft.title || draft.title === "Imported recipe") {
      draft.title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    }
    draft.sourceRef = file.name;
    draft.heroImage = dataUrl;
    draft.mealType = draft.mealType || inferFromKeywords(file.name, mealTypeHints);
    draft.cuisine = draft.cuisine || inferFromKeywords(file.name, cuisineHints);
    return draft;
  } finally {
    await worker.terminate();
  }
}

export async function extractDraftFromPhotoViaApi(
  file: File,
  extractPhoto: (dataUrl: string) => Promise<ApiPhotoExtraction>,
): Promise<RecipeDraft> {
  const dataUrl = await readFileAsDataUrl(file);
  const result = await extractPhoto(dataUrl);
  const draft = createEmptyDraft("photo");
  draft.title = result.title || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  draft.summary = result.summary;
  draft.ingredientsText = result.ingredients.join("\n");
  draft.instructionsText = result.instructions.join("\n");
  draft.servings = result.servings;
  draft.cuisine = result.cuisine || inferFromKeywords(file.name, cuisineHints);
  draft.mealType = result.mealType || inferFromKeywords(file.name, mealTypeHints);
  draft.sourceRef = file.name;
  draft.heroImage = dataUrl;
  return draft;
}
