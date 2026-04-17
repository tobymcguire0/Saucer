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
    <section className="panel">
      <div className="section-heading">
        <h3>Suggested tags</h3>
        <span>{visibleDraftSuggestions.length} matches</span>
      </div>
      <div className="suggestion-list">
        {visibleDraftSuggestions.map((suggestion) => (
          <button
            key={`${suggestion.categoryId}-${suggestion.input}-${suggestion.tagId ?? suggestion.normalized}`}
            type="button"
            className={
              suggestion.tagId && draft.selectedTagIds.includes(suggestion.tagId)
                ? "suggestion suggestion-active"
                : "suggestion"
            }
            disabled={!suggestion.tagId}
            onClick={() => suggestion.tagId && toggleDraftTag(suggestion.tagId)}
          >
            <strong>{suggestion.matchedName ?? suggestion.input}</strong>
            <span>
              {categoryLookup.get(suggestion.categoryId)?.name ?? "New"} · {suggestion.status} ·{" "}
              {Math.round(suggestion.confidence * 100)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default RecipeSuggestionPanel;
