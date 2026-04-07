import { useMemo } from "react";
import { sourceTypes, type RecipeDraft, type SourceType, type TagSuggestion, type Taxonomy } from "../lib/models";
import type { TaxonomyCategoryGroup } from "../lib/taxonomyView";

type RecipeEditorModalProps = {
  editorMode: "create" | "edit";
  draft: RecipeDraft;
  taxonomyGroups: TaxonomyCategoryGroup[];
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  draftImported: boolean;
  showSourceControls: boolean;
  uploadErrorActive: boolean;
  isImporting: boolean;
  draftTagInputs: Record<string, string>;
  visibleDraftSuggestions: TagSuggestion[];
  visibleEditableTagIds: string[];
  mealTimeCategory?: Taxonomy["categories"][number];
  showSourceSelector: boolean;
  showImportControls: boolean;
  showDraftForm: boolean;
  onClose: () => void;
  onDraftChange: (patch: Partial<RecipeDraft>) => void;
  onClearUploadError: () => void;
  onDraftTagInputChange: (categoryId: string, value: string) => void;
  onRevealSourceControls: () => void;
  onSelectSourceType: (sourceType: SourceType) => void;
  onImportFromWebsite: () => Promise<void>;
  onImportFromFile: (file: File | undefined) => Promise<void>;
  onToggleDraftTag: (tagId: string) => void;
  onCreateDraftTag: (categoryId: string) => Promise<void>;
  onSaveDraft: () => Promise<void>;
};

function RecipeEditorModal({
  editorMode,
  draft,
  taxonomyGroups,
  categoryLookup,
  draftImported,
  showSourceControls,
  uploadErrorActive,
  isImporting,
  draftTagInputs,
  visibleDraftSuggestions,
  visibleEditableTagIds,
  mealTimeCategory,
  showSourceSelector,
  showImportControls,
  showDraftForm,
  onClose,
  onDraftChange,
  onClearUploadError,
  onDraftTagInputChange,
  onRevealSourceControls,
  onSelectSourceType,
  onImportFromWebsite,
  onImportFromFile,
  onToggleDraftTag,
  onCreateDraftTag,
  onSaveDraft,
}: RecipeEditorModalProps) {
  const visibleEditableTagIdSet = useMemo(
    () => new Set(visibleEditableTagIds),
    [visibleEditableTagIds],
  );

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="section-heading">
          <h2>{editorMode === "edit" ? "Edit recipe" : "Review recipe draft"}</h2>
          <div className="button-row">
            {editorMode === "create" && draftImported && !showSourceControls ? (
              <button type="button" className="secondary" onClick={onRevealSourceControls}>
                Change source
              </button>
            ) : null}
            <button type="button" className="secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {showSourceSelector ? (
          <section className="panel source-panel">
            <div className="section-heading">
              <h3>Source Type</h3>
              {draft.sourceType !== "manual" ? (
                <span className="muted">Import first to reveal the full recipe form.</span>
              ) : (
                <span className="muted">Manual entry shows the full form immediately.</span>
              )}
            </div>
            <div className="upload-grid">
              {sourceTypes.map((sourceType) => (
                <button
                  key={sourceType}
                  type="button"
                  className={draft.sourceType === sourceType ? "chip chip-active" : "chip"}
                  onClick={() => onSelectSourceType(sourceType)}
                >
                  {sourceType}
                </button>
              ))}
            </div>

            {showImportControls ? (
              <div
                className={`upload_content${uploadErrorActive ? " upload_content-error" : ""}`}
                data-testid="upload-content"
              >
                {draft.sourceType === "website" ? (
                  <div className="inline-form">
                    <input
                      value={draft.sourceRef}
                      onChange={(event) => {
                        onClearUploadError();
                        onDraftChange({ sourceRef: event.currentTarget.value });
                      }}
                      placeholder="https://example.com/recipe"
                    />
                    <button
                      type="button"
                      onClick={() => void onImportFromWebsite()}
                      disabled={isImporting}
                    >
                      {isImporting ? "Importing..." : "Import"}
                    </button>
                  </div>
                ) : null}

                {draft.sourceType === "photo" || draft.sourceType === "text" ? (
                  <label className="field">
                    <span>{draft.sourceType === "photo" ? "Photo file" : "Text file"}</span>
                    <input
                      type="file"
                      accept={draft.sourceType === "photo" ? "image/*" : ".txt,.md,.rtf"}
                      onChange={(event) => {
                        onClearUploadError();
                        void onImportFromFile(event.currentTarget.files?.[0]);
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {showDraftForm ? (
          <div className="editor-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => onDraftChange({ title: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Source reference</span>
              <input
                value={draft.sourceRef}
                onChange={(event) => onDraftChange({ sourceRef: event.currentTarget.value })}
              />
            </label>
            <label className="field field-wide">
              <span>Summary</span>
              <textarea
                value={draft.summary}
                onChange={(event) => onDraftChange({ summary: event.currentTarget.value })}
                rows={3}
              />
            </label>
            <label className="field">
              <span>Servings</span>
              <input
                value={draft.servings}
                onChange={(event) => onDraftChange({ servings: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Cuisine</span>
              <input
                value={draft.cuisine}
                onChange={(event) => onDraftChange({ cuisine: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Meal type</span>
              <input
                value={draft.mealType}
                onChange={(event) => onDraftChange({ mealType: event.currentTarget.value })}
              />
            </label>
            <label className="field field-wide">
              <span>Ingredients</span>
              <textarea
                value={draft.ingredientsText}
                onChange={(event) => onDraftChange({ ingredientsText: event.currentTarget.value })}
                rows={8}
              />
            </label>
            <label className="field field-wide">
              <span>Instructions</span>
              <textarea
                value={draft.instructionsText}
                onChange={(event) => onDraftChange({ instructionsText: event.currentTarget.value })}
                rows={8}
              />
            </label>
          </div>
        ) : null}

        {showDraftForm ? (
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
                  onClick={() => suggestion.tagId && onToggleDraftTag(suggestion.tagId)}
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
        ) : null}

        {showDraftForm ? (
          <section className="panel">
            <div className="section-heading">
              <h3>Edit assigned tags</h3>
              <span>{draft.selectedTagIds.length} selected</span>
            </div>
            {taxonomyGroups.map(({ category, tags }) => (
              <div key={category.id} className="filter-group">
                <h4>{category.name}</h4>
                <div className="chip-wrap">
                  {tags
                    .filter((tag) => visibleEditableTagIdSet.has(tag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={draft.selectedTagIds.includes(tag.id) ? "chip chip-active" : "chip"}
                        onClick={() => onToggleDraftTag(tag.id)}
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
                <div className="draft-tag-row">
                  <input
                    value={draftTagInputs[category.id] ?? ""}
                    onChange={(event) => onDraftTagInputChange(category.id, event.currentTarget.value)}
                    placeholder={`Add a ${category.name} tag`}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void onCreateDraftTag(category.id)}
                  >
                    Add tag
                  </button>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {showDraftForm ? (
          <div className="button-row">
            <button type="button" onClick={() => void onSaveDraft()}>
              {editorMode === "edit" ? "Save recipe" : "Create recipe"}
            </button>
            {mealTimeCategory ? (
              <span className="muted">
                Group browsing is ready for {mealTimeCategory.name.toLowerCase()} and every other
                category.
              </span>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default RecipeEditorModal;
