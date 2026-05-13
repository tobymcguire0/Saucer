import ParsedRecipesHeader from "../features/editor/components/ParsedRecipesHeader";
import RecipeDraftFields from "../features/editor/components/RecipeDraftFields";
import RecipeLinkedRecipesPanel from "../features/editor/components/RecipeLinkedRecipesPanel";
import RecipeSourcePanel from "../features/editor/components/RecipeSourcePanel";
import RecipeSuggestionPanel from "../features/editor/components/RecipeSuggestionPanel";
import RecipeTagAssignmentPanel from "../features/editor/components/RecipeTagAssignmentPanel";
import { useRecipeEditorModalViewModel } from "../features/editor/useRecipeEditorModalViewModel";
import { useSaucerStore } from "../features/saucer/useSaucerStore";

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
    importFromText,
    toggleDraftTag,
    createDraftTag,
    setDraftLinkedRecipes,
    goToParsedDraft,
    parsedDrafts,
    parsedDraftIndex,
    saveDraft,
    editorCategoryInputs,
    setEditorCategoryInput,
    taxonomy,
    taxonomyGroups,
    categoryLookup,
  } = useRecipeEditorModalViewModel();
  const allRecipes = useSaucerStore((state) => state.recipes);

  if (!editorOpen) {
    return null;
  }

  const isMultiDraft = parsedDrafts.length > 1 && editorMode === "create";
  const isLastDraft = isMultiDraft && parsedDraftIndex === parsedDrafts.length - 1;

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-text-100/55 p-6 pb-24 backdrop-blur-sm">
      <section className="max-h-[calc(100vh-9rem)] w-full max-w-[1080px] space-y-5 overflow-auto rounded-[var(--radius-card)] border border-panel-20 bg-background-0 p-5 shadow-[var(--shadow-floating)]">
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
            importFromText={importFromText}
          />
        ) : null}

        {showDraftForm && isMultiDraft ? (
          <ParsedRecipesHeader
            drafts={parsedDrafts}
            currentIndex={parsedDraftIndex}
            onSelect={goToParsedDraft}
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

        {showDraftForm && !isMultiDraft ? (
          <RecipeLinkedRecipesPanel
            draft={draft}
            allRecipes={allRecipes}
            setDraftLinkedRecipes={setDraftLinkedRecipes}
          />
        ) : null}

        {showDraftForm ? (
          <div className="flex flex-wrap items-center gap-3">
            {isMultiDraft ? (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={parsedDraftIndex === 0}
                  onClick={() => goToParsedDraft(parsedDraftIndex - 1)}
                >
                  Previous Recipe
                </button>
                {!isLastDraft ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => goToParsedDraft(parsedDraftIndex + 1)}
                  >
                    Next Recipe
                  </button>
                ) : null}
                {isLastDraft ? (
                  <button type="button" className="btn-primary" onClick={() => void saveDraft()}>
                    Create Recipe
                  </button>
                ) : null}
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={() => void saveDraft()}>
                {editorMode === "edit" ? "Save recipe" : "Create recipe"}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default RecipeEditorModal;
