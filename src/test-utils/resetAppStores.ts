import { resetBrowseStore } from "../features/browse/useBrowseStore";
import { resetSaucerStore } from "../features/saucer/useSaucerStore";
import { resetRecipeStore } from "../features/saucer/recipeStore";
import { resetRecipeEditorStore } from "../features/editor/useRecipeEditorStore";
import { resetStatusStore } from "../features/status/useStatusStore";
import { resetSyncStore } from "../features/sync/useSyncStore";
import { resetTaxonomyUiStore } from "../features/taxonomy/useTaxonomyUiStore";
import { resetThemeStore } from "../features/theme/useThemeStore";

export function resetAppStores() {
  resetStatusStore();
  resetBrowseStore();
  resetTaxonomyUiStore();
  resetRecipeEditorStore();
  resetSaucerStore();
  resetSyncStore();
  resetThemeStore();
  resetRecipeStore();
}
