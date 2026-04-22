import type { ApiPhotoExtraction } from "../../lib/apiClient";
import {
  extractDraftFromPhoto,
  extractDraftFromPhotoViaApi,
  extractDraftFromTextFile,
  extractDraftFromWebsite,
  type TextExtractor,
  type WebsitePageFetcher,
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

export async function importRecipeDraftFromWebsite(
  value: string,
  extractText?: TextExtractor,
  fetchPage?: WebsitePageFetcher,
) {
  return extractDraftFromWebsite(normalizeWebsiteImportUrl(value), extractText, fetchPage);
}

export async function importRecipeDraftFromFile(
  file: File,
  sourceType: SourceType,
  extractPhoto?: (dataUrl: string) => Promise<ApiPhotoExtraction>,
  extractText?: TextExtractor,
) {
  if (sourceType === "photo") {
    if (extractPhoto) {
      return extractDraftFromPhotoViaApi(file, extractPhoto);
    }
    return extractDraftFromPhoto(file);
  }
  return extractDraftFromTextFile(file, extractText);
}
