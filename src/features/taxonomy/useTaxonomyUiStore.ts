import { create } from "zustand";

import { useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import type {
  AliasForm,
  CategoryForm,
  MergeForm,
  TagForm,
  TaxonomyFilterScope,
} from "./types";

function createInitialState() {
  return {
    sidebarCategoryInputs: {} as Record<string, string>,
    editorCategoryInputs: {} as Record<string, string>,
    collapsedCategoryIds: {} as Record<string, boolean>,
    categoryForm: { name: "", description: "" } as CategoryForm,
    tagForm: { categoryId: "", name: "" } as TagForm,
    aliasForm: { tagId: "", alias: "" } as AliasForm,
    mergeForm: { sourceTagId: "", targetTagId: "" } as MergeForm,
  };
}

type TaxonomyUiStoreState = ReturnType<typeof createInitialState> & {
  setCategoryInput: (scope: TaxonomyFilterScope, categoryId: string, value: string) => void;
  resetCategoryInputs: (scope: TaxonomyFilterScope) => void;
  syncCollapsedCategoryIds: (categoryIds: string[]) => void;
  toggleCategoryCollapsed: (categoryId: string) => void;
  updateCategoryForm: (patch: Partial<CategoryForm>) => void;
  updateTagForm: (patch: Partial<TagForm>) => void;
  updateAliasForm: (patch: Partial<AliasForm>) => void;
  updateMergeForm: (patch: Partial<MergeForm>) => void;
  saveCategory: () => Promise<void>;
  saveTag: () => Promise<void>;
  saveAlias: () => Promise<void>;
  mergeSelectedTags: () => Promise<void>;
  reset: () => void;
};

export const useTaxonomyUiStore = create<TaxonomyUiStoreState>((set, get) => ({
  ...createInitialState(),
  setCategoryInput: (scope, categoryId, value) =>
    set((state) => ({
      ...(scope === "sidebar"
        ? {
            sidebarCategoryInputs: {
              ...state.sidebarCategoryInputs,
              [categoryId]: value,
            },
          }
        : {
            editorCategoryInputs: {
              ...state.editorCategoryInputs,
              [categoryId]: value,
            },
          }),
    })),
  resetCategoryInputs: (scope) =>
    set(scope === "sidebar" ? { sidebarCategoryInputs: {} } : { editorCategoryInputs: {} }),
  syncCollapsedCategoryIds: (categoryIds) =>
    set((state) => ({
      collapsedCategoryIds: Object.fromEntries(
        categoryIds.map((categoryId) => [categoryId, state.collapsedCategoryIds[categoryId] ?? true]),
      ),
    })),
  toggleCategoryCollapsed: (categoryId) =>
    set((state) => ({
      collapsedCategoryIds: {
        ...state.collapsedCategoryIds,
        [categoryId]: !state.collapsedCategoryIds[categoryId],
      },
    })),
  updateCategoryForm: (patch) =>
    set((state) => ({
      categoryForm: {
        ...state.categoryForm,
        ...patch,
      },
    })),
  updateTagForm: (patch) =>
    set((state) => ({
      tagForm: {
        ...state.tagForm,
        ...patch,
      },
    })),
  updateAliasForm: (patch) =>
    set((state) => ({
      aliasForm: {
        ...state.aliasForm,
        ...patch,
      },
    })),
  updateMergeForm: (patch) =>
    set((state) => ({
      mergeForm: {
        ...state.mergeForm,
        ...patch,
      },
    })),
  saveCategory: async () => {
    const { categoryForm } = get();
    await useSaucerStore.getState().saveCategory(categoryForm.name, categoryForm.description);
    set({ categoryForm: { name: "", description: "" } });
  },
  saveTag: async () => {
    const { tagForm } = get();
    if (!tagForm.categoryId) {
      useStatusStore.getState().updateStatus("Choose a category before creating a tag.", "error");
      return;
    }

    await useSaucerStore.getState().saveTag(tagForm.categoryId, tagForm.name);
    set((state) => ({
      tagForm: {
        ...state.tagForm,
        name: "",
      },
    }));
  },
  saveAlias: async () => {
    const { aliasForm } = get();
    if (!aliasForm.tagId) {
      useStatusStore.getState().updateStatus("Choose a tag before creating an alias.", "error");
      return;
    }

    await useSaucerStore.getState().saveAlias(aliasForm.tagId, aliasForm.alias);
    set((state) => ({
      aliasForm: {
        ...state.aliasForm,
        alias: "",
      },
    }));
  },
  mergeSelectedTags: async () => {
    const { mergeForm } = get();
    await useSaucerStore
      .getState()
      .mergeSelectedTags(mergeForm.sourceTagId, mergeForm.targetTagId);
    set({ mergeForm: { sourceTagId: "", targetTagId: "" } });
  },
  reset: () => set(createInitialState()),
}));

export function resetTaxonomyUiStore() {
  useTaxonomyUiStore.getState().reset();
}
