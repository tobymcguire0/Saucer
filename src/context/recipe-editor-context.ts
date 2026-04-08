import type { Recipe, RecipeDraft, SourceType, TagSuggestion } from "../lib/models";
import { createRequiredContext } from "./createRequiredContext";

export type RecipeEditorMode = "create" | "edit";

export type RecipeEditorContextValue = {
  editorOpen: boolean;
  editorMode: RecipeEditorMode;
  draft: RecipeDraft;
  draftImported: boolean;
  showSourceControls: boolean;
  uploadErrorActive: boolean;
  isImporting: boolean;
  visibleDraftSuggestions: TagSuggestion[];
  visibleEditableTagIds: string[];
  showSourceSelector: boolean;
  showImportControls: boolean;
  showDraftForm: boolean;
  closeEditor: () => void;
  openCreateEditor: (sourceType: SourceType) => void;
  openEditEditor: (recipe: Recipe) => void;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
  clearUploadError: () => void;
  revealSourceControls: () => void;
  selectSourceType: (sourceType: SourceType) => void;
  importFromWebsite: () => Promise<void>;
  importFromFile: (file: File | undefined) => Promise<void>;
  toggleDraftTag: (tagId: string) => void;
  createDraftTag: (categoryId: string, tagName: string) => Promise<void>;
  saveDraft: () => Promise<void>;
};

export const [RecipeEditorContext, useRecipeEditorContext] =
  createRequiredContext<RecipeEditorContextValue>("RecipeEditorContext");
