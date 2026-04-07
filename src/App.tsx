import { useEffect, useMemo, useState } from "react";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import BrowseWorkspace from "./components/Workspaces/BrowseWorkspace";
import RecipeDetailWorkspace from "./components/Workspaces/RecipeDetailWorkspace";
import TaxonomyWorkspace, {
  type AliasForm,
  type CategoryForm,
  type MergeForm,
  type TagForm,
} from "./components/Workspaces/TaxonomyWorkspace";
import { useStatusMessage, type StatusTone } from "./hooks/useStatusMessage";
import { extractDraftFromPhoto, extractDraftFromTextFile, extractDraftFromWebsite } from "./lib/extraction";
import type { Recipe, RecipeDraft, RecipeQuery, SourceType, Taxonomy } from "./lib/models";
import { ObsidianRecipeStore } from "./lib/persistence";
import { SqliteSearchIndex } from "./lib/searchIndex";
import { filterRecipes, groupRecipesByCategory, pickRandomRecipe } from "./lib/selectors";
import {
  addAlias,
  buildTagSuggestions,
  convertDraftToRecipe,
  createEmptyDraft,
  ensureDefaultTaxonomy,
  filterDraftSuggestionsByConfidence,
  getAutoSelectedDraftTagIds,
  getCategoryByName,
  getVisibleDraftTagIds,
  mergeTags,
  normalizeTerm,
  upsertCategory,
  upsertTag,
} from "./lib/taxonomy";
import { buildTaxonomyCategoryGroups } from "./lib/taxonomyView";
import { isDefined } from "./lib/typeGuards";

const recipeStore = new ObsidianRecipeStore();
const searchIndex = new SqliteSearchIndex();

const defaultQuery: RecipeQuery = {
  searchText: "",
  selectedTagIds: [],
  excludedTagIds: [],
  requiredIngredientTerms: [],
  sortBy: "updated",
};

type AppView = "recipes" | "taxonomy" | "recipeDetail";

function toDraft(recipe: Recipe): RecipeDraft {
  return {
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary,
    sourceType: recipe.sourceType,
    sourceRef: recipe.sourceRef ?? "",
    heroImage: recipe.heroImage,
    ingredientsText: recipe.ingredients.map((ingredient) => ingredient.raw).join("\n"),
    instructionsText: recipe.instructions
      .map((instruction, index) => `${index + 1}. ${instruction}`)
      .join("\n"),
    servings: recipe.servings ?? "",
    cuisine: recipe.cuisine ?? "",
    mealType: recipe.mealType ?? "",
    selectedTagIds: recipe.tagIds,
  };
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(ensureDefaultTaxonomy());
  const [visibleRecipes, setVisibleRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState<RecipeQuery>(defaultQuery);
  const [groupByCategoryId, setGroupByCategoryId] = useState("");
  const [activeView, setActiveView] = useState<AppView>("recipes");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<RecipeDraft>(createEmptyDraft());
  const [loading, setLoading] = useState(true);
  const [randomIngredientInput, setRandomIngredientInput] = useState("");
  const [randomRecipeId, setRandomRecipeId] = useState("");
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ name: "", description: "" });
  const [tagForm, setTagForm] = useState<TagForm>({ categoryId: "", name: "" });
  const [aliasForm, setAliasForm] = useState<AliasForm>({ tagId: "", alias: "" });
  const [mergeForm, setMergeForm] = useState<MergeForm>({ sourceTagId: "", targetTagId: "" });
  const [draftImported, setDraftImported] = useState(false);
  const [showSourceControls, setShowSourceControls] = useState(true);
  const [uploadErrorActive, setUploadErrorActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [draftTagInputs, setDraftTagInputs] = useState<Record<string, string>>({});
  const { statusMessage, statusTone, statusExpanded, updateStatus } = useStatusMessage(
    "Loading cookbook...",
  );

  const draftSuggestions = useMemo(
    () =>
      buildTagSuggestions(
        {
          title: draft.title,
          summary: draft.summary,
          mealType: draft.mealType,
          cuisine: draft.cuisine,
          ingredientsText: draft.ingredientsText,
          instructionsText: draft.instructionsText,
        },
        taxonomy,
      ),
    [
      draft.title,
      draft.summary,
      draft.mealType,
      draft.cuisine,
      draft.ingredientsText,
      draft.instructionsText,
      taxonomy,
    ],
  );

  const visibleDraftSuggestions = useMemo(
    () => filterDraftSuggestionsByConfidence(draftSuggestions),
    [draftSuggestions],
  );

  const visibleEditableTagIds = useMemo(
    () => getVisibleDraftTagIds(draft.selectedTagIds, draftSuggestions),
    [draft.selectedTagIds, draftSuggestions],
  );

  const tagLookup = useMemo(
    () => new Map(taxonomy.tags.map((tag) => [tag.id, tag])),
    [taxonomy.tags],
  );

  const categoryLookup = useMemo(
    () => new Map(taxonomy.categories.map((category) => [category.id, category])),
    [taxonomy.categories],
  );

  const taxonomyGroups = useMemo(() => buildTaxonomyCategoryGroups(taxonomy), [taxonomy]);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  useEffect(() => {
    async function initialize() {
      try {
        const snapshot = await recipeStore.load();
        setRecipes(snapshot.recipes);
        setTaxonomy(snapshot.taxonomy);
        updateStatus("Cookbook loaded from local Obsidian-style storage.", "success");
        await searchIndex.rebuild(snapshot.recipes, snapshot.taxonomy);
      } catch (error) {
        updateStatus(
          `Failed to load saved data: ${error instanceof Error ? error.message : "unknown error"}`,
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function applyQuery() {
      try {
        const ids = await searchIndex.queryRecipeIds(query);
        if (ignore) {
          return;
        }

        const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
        setVisibleRecipes(ids.map((id) => recipesById.get(id)).filter(isDefined));
      } catch {
        setVisibleRecipes(filterRecipes(recipes, query));
      }
    }

    void applyQuery();

    return () => {
      ignore = true;
    };
  }, [query, recipes]);

  function applyImportedDraft(importedDraft: RecipeDraft) {
    const autoSelectedTagIds = getAutoSelectedDraftTagIds(buildTagSuggestions(importedDraft, taxonomy));

    setDraft({
      ...importedDraft,
      selectedTagIds: autoSelectedTagIds,
    });
    setDraftImported(true);
    setShowSourceControls(false);
  }

  function updateDraft(patch: Partial<RecipeDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateCategoryForm(patch: Partial<CategoryForm>) {
    setCategoryForm((current) => ({ ...current, ...patch }));
  }

  function updateTagForm(patch: Partial<TagForm>) {
    setTagForm((current) => ({ ...current, ...patch }));
  }

  function updateAliasForm(patch: Partial<AliasForm>) {
    setAliasForm((current) => ({ ...current, ...patch }));
  }

  function updateMergeForm(patch: Partial<MergeForm>) {
    setMergeForm((current) => ({ ...current, ...patch }));
  }

  function updateDraftTagInput(categoryId: string, value: string) {
    setDraftTagInputs((current) => ({
      ...current,
      [categoryId]: value,
    }));
  }

  async function syncState(
    nextRecipes: Recipe[],
    nextTaxonomy: Taxonomy,
    message: string,
    tone: StatusTone = "success",
  ) {
    const snapshot = await recipeStore.replaceAll(nextRecipes, nextTaxonomy);
    setRecipes(snapshot.recipes);
    setTaxonomy(snapshot.taxonomy);
    updateStatus(message, tone);
    await searchIndex.rebuild(snapshot.recipes, snapshot.taxonomy);
  }

  function openCreateEditor(sourceType: SourceType) {
    setEditorMode("create");
    setDraft(createEmptyDraft(sourceType));
    setEditorOpen(true);
    setDraftImported(false);
    setShowSourceControls(true);
    setUploadErrorActive(false);
    setDraftTagInputs({});
    updateStatus(
      sourceType === "manual"
        ? "Manual recipe entry ready."
        : "Choose a source and import your recipe draft.",
      "info",
    );
  }

  function openEditEditor(recipe: Recipe) {
    setEditorMode("edit");
    setDraft(toDraft(recipe));
    setEditorOpen(true);
    setDraftImported(true);
    setShowSourceControls(false);
    setUploadErrorActive(false);
    setDraftTagInputs({});
    updateStatus(`Editing ${recipe.title}.`, "info");
  }

  async function importFromWebsite() {
    if (!draft.sourceRef.trim()) {
      setUploadErrorActive(true);
      updateStatus("Add a website URL to import from.", "error");
      return;
    }

    setIsImporting(true);
    setUploadErrorActive(false);
    updateStatus("Importing recipe from website...", "info");

    try {
      applyImportedDraft(await extractDraftFromWebsite(draft.sourceRef.trim()));
      updateStatus("Website recipe imported into the review form.", "success");
    } catch (error) {
      setUploadErrorActive(true);
      updateStatus(
        `Website import failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function importFromFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setUploadErrorActive(false);
    updateStatus(`Importing ${file.name}...`, "info");

    try {
      const importedDraft =
        draft.sourceType === "photo"
          ? await extractDraftFromPhoto(file)
          : await extractDraftFromTextFile(file);
      applyImportedDraft(importedDraft);
      updateStatus(`${file.name} imported into the review form.`, "success");
    } catch (error) {
      setUploadErrorActive(true);
      updateStatus(
        `Import failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function saveDraft() {
    const autoTagIds = getAutoSelectedDraftTagIds(draftSuggestions);
    const baseRecipe = convertDraftToRecipe({
      ...draft,
      selectedTagIds: draft.selectedTagIds.length > 0 ? draft.selectedTagIds : autoTagIds,
    });

    const existingRecipe = recipes.find((recipe) => recipe.id === baseRecipe.id);
    const nextRecipe: Recipe = existingRecipe
      ? {
          ...existingRecipe,
          ...baseRecipe,
          createdAt: existingRecipe.createdAt,
          rating: existingRecipe.rating,
          updatedAt: new Date().toISOString(),
        }
      : baseRecipe;

    const nextRecipes = existingRecipe
      ? recipes.map((recipe) => (recipe.id === nextRecipe.id ? nextRecipe : recipe))
      : [nextRecipe, ...recipes];
    await syncState(
      nextRecipes,
      taxonomy,
      editorMode === "edit" ? "Recipe updated." : "Recipe created and indexed.",
    );
    setEditorOpen(false);
    setDraft(createEmptyDraft());
    setDraftImported(false);
    setShowSourceControls(true);
    setUploadErrorActive(false);
  }

  async function deleteRecipe(recipeId: string) {
    const snapshot = await recipeStore.deleteRecipe(recipeId);
    setRecipes(snapshot.recipes);
    setTaxonomy(snapshot.taxonomy);
    if (selectedRecipeId === recipeId) {
      setSelectedRecipeId("");
      setActiveView("recipes");
    }
    updateStatus("Recipe deleted.", "success");
    await searchIndex.rebuild(snapshot.recipes, snapshot.taxonomy);
  }

  async function updateRecipeRating(recipeId: string, rating: number) {
    const nextRecipes = recipes.map((recipe) =>
      recipe.id === recipeId ? { ...recipe, rating, updatedAt: new Date().toISOString() } : recipe,
    );
    await syncState(nextRecipes, taxonomy, "Recipe rating updated.");
  }

  async function saveCategory() {
    const nextTaxonomy = upsertCategory(taxonomy, categoryForm.name, categoryForm.description);
    await syncState(recipes, nextTaxonomy, "Category saved.");
    setCategoryForm({ name: "", description: "" });
  }

  async function saveTag() {
    if (!tagForm.categoryId) {
      updateStatus("Choose a category before creating a tag.", "error");
      return;
    }
    const nextTaxonomy = upsertTag(taxonomy, tagForm.categoryId, tagForm.name);
    await syncState(recipes, nextTaxonomy, "Canonical tag saved.");
    setTagForm((current) => ({ ...current, name: "" }));
  }

  async function saveAlias() {
    if (!aliasForm.tagId) {
      updateStatus("Choose a tag before creating an alias.", "error");
      return;
    }
    const nextTaxonomy = addAlias(taxonomy, aliasForm.tagId, aliasForm.alias);
    await syncState(recipes, nextTaxonomy, "Alias saved.");
    setAliasForm((current) => ({ ...current, alias: "" }));
  }

  async function mergeSelectedTags() {
    const merged = mergeTags(taxonomy, recipes, mergeForm.sourceTagId, mergeForm.targetTagId);
    await syncState(merged.recipes, merged.taxonomy, "Tags merged and recipe assignments updated.");
    setMergeForm({ sourceTagId: "", targetTagId: "" });
  }

  function toggleDraftTag(tagId: string) {
    setDraft((current) => ({
      ...current,
      selectedTagIds: current.selectedTagIds.includes(tagId)
        ? current.selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
        : [...current.selectedTagIds, tagId],
    }));
  }

  function toggleFilterTag(tagId: string) {
    setQuery((current) => ({
      ...current,
      selectedTagIds: current.selectedTagIds.includes(tagId)
        ? current.selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
        : [...current.selectedTagIds, tagId],
    }));
  }

  function setActiveWorkspace(view: AppView) {
    setActiveView(view);
  }

  function updateSearchText(searchText: string) {
    setQuery((current) => ({ ...current, searchText }));
  }

  function updateSortBy(sortBy: RecipeQuery["sortBy"]) {
    setQuery((current) => ({ ...current, sortBy }));
  }

  function updateGroupByCategory(categoryId: string) {
    setGroupByCategoryId(categoryId);
  }

  function updateRandomIngredientSearch(value: string) {
    setRandomIngredientInput(value);
  }

  function chooseRandomRecipe() {
    const recipe = pickRandomRecipe(recipes, {
      requiredTagIds: query.selectedTagIds,
      excludedTagIds: [],
      requiredIngredientTerms: randomIngredientInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setRandomRecipeId(recipe?.id ?? "");
    if (recipe) {
      openRecipeDetail(recipe.id);
      return;
    }
    updateStatus("No recipe matches the current random selection criteria.", "error");
  }

  function selectSourceType(sourceType: SourceType) {
    setUploadErrorActive(false);
    setDraftImported(false);
    setIsImporting(false);
    setShowSourceControls(true);
    setDraft(createEmptyDraft(sourceType));
    updateStatus(
      sourceType === "manual"
        ? "Manual recipe entry ready."
        : `Ready to import from ${sourceType}.`,
      "info",
    );
  }

  function revealSourceControls() {
    setShowSourceControls(true);
    setUploadErrorActive(false);
    updateStatus("Choose a new source to replace this imported draft.", "info");
  }

  function openRecipeDetail(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setActiveView("recipeDetail");
    const recipe = recipes.find((entry) => entry.id === recipeId);
    updateStatus(recipe ? `Viewing ${recipe.title}.` : "Viewing recipe details.", "info");
  }

  function closeRecipeDetail() {
    setActiveView("recipes");
    updateStatus("Returned to recipe browse view.", "info");
  }

  async function createDraftTag(categoryId: string) {
    const inputValue = draftTagInputs[categoryId] ?? "";
    const trimmedName = inputValue.trim();
    if (!trimmedName) {
      updateStatus("Enter a tag name before adding it to the recipe.", "error");
      return;
    }

    const nextTaxonomy = upsertTag(taxonomy, categoryId, trimmedName);
    const createdTag = nextTaxonomy.tags.find(
      (tag) =>
        tag.categoryId === categoryId && normalizeTerm(tag.name) === normalizeTerm(trimmedName),
    );

    await syncState(recipes, nextTaxonomy, `Tag "${trimmedName}" added to the recipe form.`);

    if (createdTag) {
      setDraft((current) => ({
        ...current,
        selectedTagIds: current.selectedTagIds.includes(createdTag.id)
          ? current.selectedTagIds
          : [...current.selectedTagIds, createdTag.id],
      }));
    }

    setDraftTagInputs((current) => ({
      ...current,
      [categoryId]: "",
    }));
  }

  const groupedRecipes = useMemo(
    () =>
      groupByCategoryId ? groupRecipesByCategory(visibleRecipes, taxonomy, groupByCategoryId) : [],
    [groupByCategoryId, taxonomy, visibleRecipes],
  );

  const selectedRandomRecipe = recipes.find((recipe) => recipe.id === randomRecipeId);
  const mealTimeCategory = getCategoryByName(taxonomy, "Meal-Time");
  const showSourceSelector =
    editorMode === "create" && (draft.sourceType === "manual" || showSourceControls);
  const showImportControls =
    editorMode === "create" && draft.sourceType !== "manual" && showSourceControls;
  const showDraftForm = editorMode === "edit" || draft.sourceType === "manual" || draftImported;

  return (
    <main className="app-shell">
      <AppSidebar
        activeView={activeView}
        query={query}
        taxonomyGroups={taxonomyGroups}
        groupByCategoryId={groupByCategoryId}
        randomIngredientInput={randomIngredientInput}
        selectedRandomRecipe={selectedRandomRecipe}
        onUploadRecipe={() => openCreateEditor("website")}
        onViewChange={setActiveWorkspace}
        onSearchTextChange={updateSearchText}
        onSortChange={updateSortBy}
        onGroupByCategoryChange={updateGroupByCategory}
        onRandomIngredientInputChange={updateRandomIngredientSearch}
        onToggleFilterTag={toggleFilterTag}
        onChooseRandomRecipe={chooseRandomRecipe}
      />

      <section className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>
              {activeView === "recipes"
                ? "Browse recipes"
                : activeView === "recipeDetail"
                  ? "Recipe details"
                  : "Manage categories and tags"}
            </h2>
          </div>
        </header>

        {activeView === "recipeDetail" ? (
          <RecipeDetailWorkspace
            recipe={selectedRecipe}
            tagLookup={tagLookup}
            categoryLookup={categoryLookup}
            onBack={closeRecipeDetail}
            onEdit={openEditEditor}
            onDelete={deleteRecipe}
            onRate={updateRecipeRating}
          />
        ) : activeView === "recipes" ? (
          <BrowseWorkspace
            visibleRecipes={visibleRecipes}
            groupedRecipes={groupedRecipes}
            groupByCategoryId={groupByCategoryId}
            tagLookup={tagLookup}
            categoryLookup={categoryLookup}
            onEdit={openEditEditor}
            onDelete={deleteRecipe}
            onOpenDetail={openRecipeDetail}
            onRate={updateRecipeRating}
          />
        ) : (
          <TaxonomyWorkspace
            taxonomyGroups={taxonomyGroups}
            categoryForm={categoryForm}
            tagForm={tagForm}
            aliasForm={aliasForm}
            mergeForm={mergeForm}
            onCategoryFormChange={updateCategoryForm}
            onTagFormChange={updateTagForm}
            onAliasFormChange={updateAliasForm}
            onMergeFormChange={updateMergeForm}
            onSaveCategory={saveCategory}
            onSaveTag={saveTag}
            onSaveAlias={saveAlias}
            onMergeSelectedTags={mergeSelectedTags}
          />
        )}
      </section>

      {editorOpen ? (
        <RecipeEditorModal
          editorMode={editorMode}
          draft={draft}
          taxonomyGroups={taxonomyGroups}
          categoryLookup={categoryLookup}
          draftImported={draftImported}
          showSourceControls={showSourceControls}
          uploadErrorActive={uploadErrorActive}
          isImporting={isImporting}
          draftTagInputs={draftTagInputs}
          visibleDraftSuggestions={visibleDraftSuggestions}
          visibleEditableTagIds={visibleEditableTagIds}
          mealTimeCategory={mealTimeCategory}
          showSourceSelector={showSourceSelector}
          showImportControls={showImportControls}
          showDraftForm={showDraftForm}
          onClose={() => setEditorOpen(false)}
          onDraftChange={updateDraft}
          onClearUploadError={() => setUploadErrorActive(false)}
          onDraftTagInputChange={updateDraftTagInput}
          onRevealSourceControls={revealSourceControls}
          onSelectSourceType={selectSourceType}
          onImportFromWebsite={importFromWebsite}
          onImportFromFile={importFromFile}
          onToggleDraftTag={toggleDraftTag}
          onCreateDraftTag={createDraftTag}
          onSaveDraft={saveDraft}
        />
      ) : null}

      <StatusBar message={statusMessage} tone={statusTone} expanded={statusExpanded} />

      {loading ? <div className="loading-overlay">Loading local cookbook...</div> : null}
    </main>
  );
}

export default App;
