import RecipeDraftFields from "../features/editor/components/RecipeDraftFields";
import RecipeSourcePanel from "../features/editor/components/RecipeSourcePanel";
import RecipeSuggestionPanel from "../features/editor/components/RecipeSuggestionPanel";
import RecipeTagAssignmentPanel from "../features/editor/components/RecipeTagAssignmentPanel";
import { useRecipeEditorModalViewModel } from "../features/editor/useRecipeEditorModalViewModel";

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
    editorCategoryInputs,
    setEditorCategoryInput,
    taxonomy,
    taxonomyGroups,
    categoryLookup,
    mealTimeCategory,
  } = useRecipeEditorModalViewModel();

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
          <RecipeSourcePanel
            draft={draft}
            showImportControls={showImportControls}
            uploadErrorActive={uploadErrorActive}
            isImporting={isImporting}
            clearUploadError={clearUploadError}
            updateDraft={updateDraft}
            selectSourceType={selectSourceType}
            importFromWebsite={importFromWebsite}
            importFromFile={importFromFile}
          />
        ) : null}

        {showDraftForm ? <RecipeDraftFields draft={draft} updateDraft={updateDraft} /> : null}

        {showDraftForm ? (
          <RecipeSuggestionPanel
            draft={draft}
            visibleDraftSuggestions={visibleDraftSuggestions}
            categoryLookup={categoryLookup}
            toggleDraftTag={toggleDraftTag}
          />
        ) : null}

        {showDraftForm ? (
          <RecipeTagAssignmentPanel
            draft={draft}
            taxonomy={taxonomy}
            taxonomyGroups={taxonomyGroups}
            editorCategoryInputs={editorCategoryInputs}
            setCategoryInput={(_scope, categoryId, value) => setEditorCategoryInput(categoryId, value)}
            toggleDraftTag={toggleDraftTag}
            createDraftTag={createDraftTag}
          />
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
