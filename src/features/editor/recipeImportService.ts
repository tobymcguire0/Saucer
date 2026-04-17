import {
  extractDraftFromPhoto,
  extractDraftFromTextFile,
  extractDraftFromWebsite,
} from "../../lib/extraction";
import type { SourceType } from "../../lib/models";

export function normalizeWebsiteImportUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Add a website URL to import from.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid http(s) URL before importing.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) recipe URLs are supported.");
  }

  return parsed.toString();
}

export async function importRecipeDraftFromWebsite(value: string) {
  return extractDraftFromWebsite(normalizeWebsiteImportUrl(value));
}

export async function importRecipeDraftFromFile(file: File, sourceType: SourceType) {
  return sourceType === "photo" ? extractDraftFromPhoto(file) : extractDraftFromTextFile(file);
}
