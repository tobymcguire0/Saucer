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
    uploadShakeActive,
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
    <div className="fixed inset-0 z-20 grid place-items-center bg-text-100/55 p-6 backdrop-blur-sm">
      <section className="max-h-[calc(100vh-3rem)] w-full max-w-[1080px] space-y-5 overflow-auto rounded-[var(--radius-card)] border border-panel-20 bg-background-0 p-5 shadow-[var(--shadow-floating)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-60">
              Editor
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text-60">
              {editorMode === "edit" ? "Edit recipe" : "Review recipe draft"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {editorMode === "create" && draftImported && !showSourceControls ? (
              <button type="button" className="btn-secondary" onClick={revealSourceControls}>
                Change source
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={closeEditor}>
              Close
            </button>
          </div>
        </div>

        {showSourceSelector ? (
          <RecipeSourcePanel
            draft={draft}
            showImportControls={showImportControls}
            uploadErrorActive={uploadErrorActive}
            uploadShakeActive={uploadShakeActive}
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
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={() => void saveDraft()}>
              {editorMode === "edit" ? "Save recipe" : "Create recipe"}
            </button>
            {mealTimeCategory ? (
              <span className="text-sm text-text-35">
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
