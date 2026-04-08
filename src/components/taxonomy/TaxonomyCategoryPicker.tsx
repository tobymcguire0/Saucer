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
    <section className="taxonomy-picker">
      <div className="section-heading">
        <strong>{categoryName}</strong>
        <span>{selectedTags.length} selected</span>
      </div>

      {selectedTags.length > 0 ? (
        <div className="chip-wrap taxonomy-picker-selected">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="chip chip-active"
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="draft-tag-row">
        <label className="field taxonomy-picker-input">
          <input
            aria-label={inputLabel ?? `${categoryName} tag search`}
            value={inputValue}
            onChange={(event) => onInputChange(event.currentTarget.value)}
            placeholder={inputPlaceholder}
          />
        </label>
        {onCreateTag ? (
          <button type="button" className="secondary" onClick={onCreateTag}>
            Add tag
          </button>
        ) : null}
      </div>

      {inputValue.trim() ? (
        matches.length > 0 ? (
          <div className="taxonomy-picker-results">
            {matches.map((match) => (
              <button
                key={match.tag.id}
                type="button"
                className={
                  selectedTags.some((tag) => tag.id === match.tag.id)
                    ? "suggestion suggestion-active"
                    : "suggestion"
                }
                onClick={() => onToggleTag(match.tag.id)}
              >
                <strong>{match.tag.name}</strong>
                <span>
                  {renderMatchMeta
                    ? renderMatchMeta(match)
                    : `${match.matchedAlias ? `Alias: ${match.matchedAlias}` : match.matchType} · ${Math.round(match.score * 100)}%`}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted taxonomy-picker-empty">{emptyMessage}</p>
        )
      ) : null}
    </section>
  );
}

export default TaxonomyCategoryPicker;
