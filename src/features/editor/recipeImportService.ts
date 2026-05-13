import type { ApiPhotoExtraction } from "../../lib/apiClient";
import {
  extractDraftFromPdfFile,
  extractDraftFromPhoto,
  extractDraftFromPhotoViaApi,
  extractDraftFromRawText,
  extractDraftFromTextFile,
  extractDraftFromWebsite,
  extractDraftsFromPdfFile,
  extractDraftsFromPhotoViaApi,
  extractDraftsFromRawText,
  extractDraftsFromTextFile,
  extractDraftsFromWebsite,
  type MultiPhotoExtractor,
  type MultiTextExtractor,
  type TextExtractor,
  type WebsitePageFetcher,
} from "../../lib/extraction";
import type { RecipeDraft, SourceType } from "../../lib/models";

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

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function importRecipeDraftFromText(text: string, extractText?: TextExtractor) {
  if (!text.trim()) throw new Error("Paste or type recipe text before importing.");
  return extractDraftFromRawText(text, extractText);
}

export async function importRecipeDraftFromFile(
  file: File,
  sourceType: SourceType,
  extractPhoto?: (dataUrl: string) => Promise<ApiPhotoExtraction>,
  extractText?: TextExtractor,
) {
  if (sourceType === "file") {
    if (isImageFile(file)) {
      if (extractPhoto) {
        return extractDraftFromPhotoViaApi(file, extractPhoto);
      }
      return extractDraftFromPhoto(file);
    }
    if (isPdfFile(file)) {
      return extractDraftFromPdfFile(file, extractText);
    }
    return extractDraftFromTextFile(file, extractText);
  }
  return extractDraftFromTextFile(file, extractText);
}

export async function importRecipeDraftsFromWebsite(
  value: string,
  extractText?: MultiTextExtractor,
  fetchPage?: WebsitePageFetcher,
): Promise<RecipeDraft[]> {
  return extractDraftsFromWebsite(normalizeWebsiteImportUrl(value), extractText, fetchPage);
}

export async function importRecipeDraftsFromText(
  text: string,
  extractText?: MultiTextExtractor,
): Promise<RecipeDraft[]> {
  if (!text.trim()) throw new Error("Paste or type recipe text before importing.");
  return extractDraftsFromRawText(text, extractText);
}

export async function importRecipeDraftsFromFile(
  file: File,
  sourceType: SourceType,
  extractPhoto?: MultiPhotoExtractor,
  extractText?: MultiTextExtractor,
): Promise<RecipeDraft[]> {
  if (sourceType === "file") {
    if (isImageFile(file)) {
      if (extractPhoto) {
        return extractDraftsFromPhotoViaApi(file, extractPhoto);
      }
      const draft = await extractDraftFromPhoto(file);
      return [draft];
    }
    if (isPdfFile(file)) {
      return extractDraftsFromPdfFile(file, extractText);
    }
    return extractDraftsFromTextFile(file, extractText);
  }
  return extractDraftsFromTextFile(file, extractText);
}
