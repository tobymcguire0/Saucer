import { createRequiredContext } from "./createRequiredContext";
import type { AliasForm, CategoryForm, MergeForm, TagForm } from "./taxonomy-admin-types";

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

export const [TaxonomyAdminContext, useTaxonomyAdminContext] =
  createRequiredContext<TaxonomyAdminContextValue>("TaxonomyAdminContext");
