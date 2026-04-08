import { useRecipeEditorContext } from "../context/recipe-editor-context";
import { useTaxonomyFilterUiContext } from "../context/taxonomy-filter-ui-context";
import { useTaxonomyContext } from "../context/taxonomy-context";
import TaxonomyCategoryPicker from "./taxonomy/TaxonomyCategoryPicker";
import { sourceTypes } from "../lib/models";
import { searchTagsInCategory } from "../lib/taxonomy";

function RecipeEditorModal() {
  const {
    editorOpen,
    editorMode,
    draft,
    draftImported,
    showSourceControls,
    uploadErrorActive,
    isImporting,
    visibleDraftSuggestions,
    showSourceSelector,
    showImportControls,
    showDraftForm,
    closeEditor,
    updateDraft,
    clearUploadError,
    revealSourceControls,
    selectSourceType,
    importFromWebsite,
    importFromFile,
    toggleDraftTag,
    createDraftTag,
    saveDraft,
  } = useRecipeEditorContext();
  const { editorCategoryInputs, setCategoryInput } = useTaxonomyFilterUiContext();
  const { taxonomy, taxonomyGroups, categoryLookup, mealTimeCategory } = useTaxonomyContext();

  if (!editorOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="section-heading">
          <h2>{editorMode === "edit" ? "Edit recipe" : "Review recipe draft"}</h2>
          <div className="button-row">
            {editorMode === "create" && draftImported && !showSourceControls ? (
              <button type="button" className="secondary" onClick={revealSourceControls}>
                Change source
              </button>
            ) : null}
            <button type="button" className="secondary" onClick={closeEditor}>
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
                  onClick={() => selectSourceType(sourceType)}
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
                        clearUploadError();
                        updateDraft({ sourceRef: event.currentTarget.value });
                      }}
                      placeholder="https://example.com/recipe"
                    />
                    <button
                      type="button"
                      onClick={() => void importFromWebsite()}
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
                        clearUploadError();
                        void importFromFile(event.currentTarget.files?.[0]);
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
                onChange={(event) => updateDraft({ title: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Source reference</span>
              <input
                value={draft.sourceRef}
                onChange={(event) => updateDraft({ sourceRef: event.currentTarget.value })}
              />
            </label>
            <label className="field field-wide">
              <span>Summary</span>
              <textarea
                value={draft.summary}
                onChange={(event) => updateDraft({ summary: event.currentTarget.value })}
                rows={3}
              />
            </label>
            <label className="field">
              <span>Servings</span>
              <input
                value={draft.servings}
                onChange={(event) => updateDraft({ servings: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Cuisine</span>
              <input
                value={draft.cuisine}
                onChange={(event) => updateDraft({ cuisine: event.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span>Meal type</span>
              <input
                value={draft.mealType}
                onChange={(event) => updateDraft({ mealType: event.currentTarget.value })}
              />
            </label>
            <label className="field field-wide">
              <span>Ingredients</span>
              <textarea
                value={draft.ingredientsText}
                onChange={(event) => updateDraft({ ingredientsText: event.currentTarget.value })}
                rows={8}
              />
            </label>
            <label className="field field-wide">
              <span>Instructions</span>
              <textarea
                value={draft.instructionsText}
                onChange={(event) => updateDraft({ instructionsText: event.currentTarget.value })}
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
        ) : null}

        {showDraftForm ? (
          <section className="panel">
            <div className="section-heading">
              <h3>Edit assigned tags</h3>
              <span>{draft.selectedTagIds.length} selected</span>
            </div>
            {taxonomyGroups.map(({ category, tags }) => (
              <TaxonomyCategoryPicker
                key={category.id}
                categoryName={category.name}
                inputValue={editorCategoryInputs[category.id] ?? ""}
                selectedTags={tags.filter((tag) => draft.selectedTagIds.includes(tag.id))}
                matches={searchTagsInCategory(
                  taxonomy,
                  category.id,
                  editorCategoryInputs[category.id] ?? "",
                )}
                emptyMessage={`No matching ${category.name.toLowerCase()} tags.`}
                inputLabel={`${category.name} tag search`}
                inputPlaceholder={`Search or add a ${category.name} tag`}
                onInputChange={(value) => setCategoryInput("editor", category.id, value)}
                onToggleTag={toggleDraftTag}
                onCreateTag={() =>
                  void createDraftTag(category.id, editorCategoryInputs[category.id] ?? "")
                }
              />
            ))}
          </section>
        ) : null}

        {showDraftForm ? (
          <div className="button-row">
            <button type="button" onClick={() => void saveDraft()}>
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
