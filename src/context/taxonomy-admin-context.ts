import { useShallow } from "zustand/react/shallow";

import { useTaxonomyUiStore } from "../features/taxonomy/useTaxonomyUiStore";
import type { AliasForm, CategoryForm, MergeForm, TagForm } from "../features/taxonomy/types";

export type TaxonomyAdminContextValue = {
  categoryForm: CategoryForm;
  tagForm: TagForm;
  aliasForm: AliasForm;
  mergeForm: MergeForm;
  updateCategoryForm: (patch: Partial<CategoryForm>) => void;
  updateTagForm: (patch: Partial<TagForm>) => void;
  updateAliasForm: (patch: Partial<AliasForm>) => void;
  updateMergeForm: (patch: Partial<MergeForm>) => void;
  saveCategory: () => Promise<void>;
  saveTag: () => Promise<void>;
  saveAlias: () => Promise<void>;
  mergeSelectedTags: () => Promise<void>;
};

export function useTaxonomyAdminContext(): TaxonomyAdminContextValue {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      categoryForm: state.categoryForm,
      tagForm: state.tagForm,
      aliasForm: state.aliasForm,
      mergeForm: state.mergeForm,
      updateCategoryForm: state.updateCategoryForm,
      updateTagForm: state.updateTagForm,
      updateAliasForm: state.updateAliasForm,
      updateMergeForm: state.updateMergeForm,
      saveCategory: state.saveCategory,
      saveTag: state.saveTag,
      saveAlias: state.saveAlias,
      mergeSelectedTags: state.mergeSelectedTags,
    })),
  );
}
