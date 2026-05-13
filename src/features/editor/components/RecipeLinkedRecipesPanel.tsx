import { useMemo, useState } from "react";

import type { Recipe, RecipeDraft } from "../../../lib/models";

type RecipeLinkedRecipesPanelProps = {
  draft: RecipeDraft;
  allRecipes: Recipe[];
  setDraftLinkedRecipes: (recipeIds: string[]) => void;
};

function RecipeLinkedRecipesPanel({
  draft,
  allRecipes,
  setDraftLinkedRecipes,
}: RecipeLinkedRecipesPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedIds = draft.selectedLinkedRecipeIds ?? [];

  const selectedRecipes = useMemo(
    () =>
      selectedIds
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter((r): r is Recipe => r !== undefined),
    [selectedIds, allRecipes],
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-text-60">Linked recipes</h3>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setPickerOpen(true)}
          data-testid="open-linked-recipe-picker"
        >
          Add linked recipe
        </button>
      </div>
      {selectedRecipes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedRecipes.map((recipe) => (
            <span key={recipe.id} className="chip chip-static flex items-center gap-2">
              {recipe.title}
              <button
                type="button"
                aria-label={`Unlink ${recipe.title}`}
                className="text-text-35 hover:text-text-60"
                onClick={() =>
                  setDraftLinkedRecipes(selectedIds.filter((id) => id !== recipe.id))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-35">
          No recipes linked yet. Use "Add linked recipe" to associate this with related recipes.
        </p>
      )}
      {pickerOpen ? (
        <LinkedRecipePickerModal
          draftId={draft.id}
          allRecipes={allRecipes}
          selectedIds={selectedIds}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids) => {
            setDraftLinkedRecipes(ids);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

type LinkedRecipePickerModalProps = {
  draftId: string | undefined;
  allRecipes: Recipe[];
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
};

function LinkedRecipePickerModal({
  draftId,
  allRecipes,
  selectedIds,
  onClose,
  onConfirm,
}: LinkedRecipePickerModalProps) {
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState<string[]>(selectedIds);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return allRecipes
      .filter((r) => r.id !== draftId)
      .filter((r) => !lower || r.title.toLowerCase().includes(lower))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allRecipes, draftId, query]);

  const toggle = (id: string) => {
    setWorking((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-text-100/55 p-6 backdrop-blur-sm"
      data-testid="linked-recipe-picker"
    >
      <section className="flex max-h-[80vh] w-full max-w-[560px] flex-col rounded-[var(--radius-card)] border border-panel-20 bg-background-0 p-5 shadow-[var(--shadow-floating)]">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tight text-text-60">
            Link recipes
          </h3>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search recipes by title"
          aria-label="Search recipes"
          className="mt-4 w-full rounded-[var(--radius-card)] border border-panel-15 bg-panel-0 px-3 py-2 text-sm text-text-60"
        />
        <div className="mt-3 flex-1 overflow-auto rounded-[var(--radius-card)] border border-panel-10 bg-panel-0">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-text-35">No recipes match your search.</p>
          ) : (
            <ul>
              {filtered.map((recipe) => {
                const checked = working.includes(recipe.id);
                return (
                  <li key={recipe.id} className="border-b border-panel-10 last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-text-60 hover:bg-panel-5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(recipe.id)}
                      />
                      <span className="flex-1">{recipe.title}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onConfirm(working)}
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

export default RecipeLinkedRecipesPanel;
