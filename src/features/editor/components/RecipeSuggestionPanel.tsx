import { cn } from "../../../lib/cn";
import type { RecipeDraft, TagSuggestion, Taxonomy } from "../../../lib/models";

type RecipeSuggestionPanelProps = {
  draft: RecipeDraft;
  visibleDraftSuggestions: TagSuggestion[];
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  toggleDraftTag: (tagId: string) => void;
};

function RecipeSuggestionPanel({
  draft,
  visibleDraftSuggestions,
  categoryLookup,
  toggleDraftTag,
}: RecipeSuggestionPanelProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-text-60">Suggested tags</h3>
        <span className="text-sm font-medium text-text-35">{visibleDraftSuggestions.length} matches</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {visibleDraftSuggestions.map((suggestion) => {
          const selected = suggestion.tagId ? draft.selectedTagIds.includes(suggestion.tagId) : false;

          return (
            <button
              key={`${suggestion.categoryId}-${suggestion.input}-${suggestion.tagId ?? suggestion.normalized}`}
              type="button"
              className={cn(
                "flex min-w-[160px] flex-col gap-1 rounded-[var(--radius-control)] border px-4 py-3 text-left transition",
                selected
                  ? "border-accent-35 bg-accent-10 text-accent-80"
                  : "border-primary-15 bg-background-0 text-text-50",
                !suggestion.tagId && "cursor-not-allowed opacity-70",
              )}
              aria-pressed={selected}
              data-selected={selected}
              disabled={!suggestion.tagId}
              onClick={() => suggestion.tagId && toggleDraftTag(suggestion.tagId)}
            >
              <strong>{suggestion.matchedName ?? suggestion.input}</strong>
              <span className="text-sm">
                {categoryLookup.get(suggestion.categoryId)?.name ?? "New"} · {suggestion.status} ·{" "}
                {Math.round(suggestion.confidence * 100)}%
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default RecipeSuggestionPanel;
