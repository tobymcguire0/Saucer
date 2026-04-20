import { cn } from "../../lib/cn";
import type { Tag } from "../../lib/models";
import type { TaxonomyTagMatch } from "../../lib/taxonomy";

type TaxonomyCategoryPickerProps = {
  categoryName: string;
  inputValue: string;
  selectedTags: Tag[];
  matches: TaxonomyTagMatch[];
  emptyMessage: string;
  inputLabel?: string;
  inputPlaceholder: string;
  onInputChange: (value: string) => void;
  onToggleTag: (tagId: string) => void;
  onCreateTag?: () => void;
  renderMatchMeta?: (match: TaxonomyTagMatch) => string;
};

function TaxonomyCategoryPicker({
  categoryName,
  inputValue,
  selectedTags,
  matches,
  emptyMessage,
  inputLabel,
  inputPlaceholder,
  onInputChange,
  onToggleTag,
  onCreateTag,
  renderMatchMeta,
}: TaxonomyCategoryPickerProps) {
  return (
    <section className="border-t border-panel-10 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-4">
        <strong className="text-text-60">{categoryName}</strong>
        <span className="text-sm font-medium text-text-35">{selectedTags.length} selected</span>
      </div>

      {selectedTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="chip chip-active"
              aria-pressed={true}
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
        ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="field">
          <input
            className="field-input"
            aria-label={inputLabel ?? `${categoryName} tag search`}
            value={inputValue}
            onChange={(event) => onInputChange(event.currentTarget.value)}
            placeholder={inputPlaceholder}
          />
        </label>
        {onCreateTag ? (
          <button type="button" className="btn-secondary" onClick={onCreateTag}>
            Add tag
          </button>
        ) : null}
      </div>

      {inputValue.trim() ? (
        matches.length > 0 ? (
          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            {matches.map((match) => {
              const selected = selectedTags.some((tag) => tag.id === match.tag.id);

              return (
                <button
                  key={match.tag.id}
                  type="button"
                  className={cn(
                    "flex rounded-[var(--radius-control)] border px-4 py-3 text-left transition",
                    selected
                      ? "border-accent-35 bg-accent-10 text-accent-80"
                      : "border-primary-15 bg-background-0 text-text-50",
                  )}
                  aria-pressed={selected}
                  data-selected={selected}
                  onClick={() => onToggleTag(match.tag.id)}
                >
                  <span className="flex flex-col gap-1">
                    <strong>{match.tag.name}</strong>
                    <span className="text-sm">
                      {renderMatchMeta
                        ? renderMatchMeta(match)
                        : `${match.matchedAlias ? `Alias: ${match.matchedAlias}` : match.matchType} · ${Math.round(match.score * 100)}%`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-35">{emptyMessage}</p>
        )
      ) : null}
    </section>
  );
}

export default TaxonomyCategoryPicker;
