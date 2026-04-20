import { resetBrowseStore } from "../features/browse/useBrowseStore";
import { resetSaucerStore } from "../features/saucer/useSaucerStore";
import { resetRecipeEditorStore } from "../features/editor/useRecipeEditorStore";
import { resetStatusStore } from "../features/status/useStatusStore";
import { resetTaxonomyUiStore } from "../features/taxonomy/useTaxonomyUiStore";
import { resetThemeStore } from "../features/theme/useThemeStore";

export function resetAppStores() {
  resetStatusStore();
  resetBrowseStore();
  resetTaxonomyUiStore();
  resetRecipeEditorStore();
  resetSaucerStore();
  resetThemeStore();
}
