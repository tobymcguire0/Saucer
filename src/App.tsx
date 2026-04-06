import { useEffect, useMemo, useRef, useState } from "react";
import {
  extractDraftFromPhoto,
  extractDraftFromTextFile,
  extractDraftFromWebsite,
  hydrateDraftSuggestions,
} from "./lib/extraction";
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
  getCategoryByName,
  mergeTags,
  normalizeTerm,
  upsertCategory,
  upsertTag,
} from "./lib/taxonomy";

const recipeStore = new ObsidianRecipeStore();
const searchIndex = new SqliteSearchIndex();

const defaultQuery: RecipeQuery = {
  searchText: "",
  selectedTagIds: [],
  excludedTagIds: [],
  requiredIngredientTerms: [],
  sortBy: "updated",
};

type StatusTone = "info" | "success" | "error";
type AppView = "recipes" | "taxonomy" | "recipeDetail";

const previewTagLimit = 6;

function sortTagIdsForPreview(
  tagIds: string[],
  tagLookup: Map<string, Taxonomy["tags"][number]>,
  categoryLookup: Map<string, Taxonomy["categories"][number]>,
) {
  return [...tagIds].sort((leftId, rightId) => {
    const leftTag = tagLookup.get(leftId);
    const rightTag = tagLookup.get(rightId);
    const leftCategory = leftTag ? categoryLookup.get(leftTag.categoryId) : undefined;
    const rightCategory = rightTag ? categoryLookup.get(rightTag.categoryId) : undefined;
    const leftPriority = leftCategory?.name === "Ingredients" ? 1 : 0;
    const rightPriority = rightCategory?.name === "Ingredients" ? 1 : 0;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const categoryCompare = (leftCategory?.name ?? "").localeCompare(rightCategory?.name ?? "");
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return (leftTag?.name ?? leftId).localeCompare(rightTag?.name ?? rightId);
  });
}

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
    suggestedTags: [],
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
  const [statusMessage, setStatusMessage] = useState("Loading cookbook...");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [statusExpanded, setStatusExpanded] = useState(false);
  const statusExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomIngredientInput, setRandomIngredientInput] = useState("");
  const [randomRecipeId, setRandomRecipeId] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [tagForm, setTagForm] = useState({ categoryId: "", name: "" });
  const [aliasForm, setAliasForm] = useState({ tagId: "", alias: "" });
  const [mergeForm, setMergeForm] = useState({ sourceTagId: "", targetTagId: "" });
  const [draftImported, setDraftImported] = useState(false);
  const [showSourceControls, setShowSourceControls] = useState(true);
  const [uploadErrorActive, setUploadErrorActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [draftTagInputs, setDraftTagInputs] = useState<Record<string, string>>({});

  function updateStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
    setStatusExpanded(true);
    if (statusExpandTimerRef.current) clearTimeout(statusExpandTimerRef.current);
    statusExpandTimerRef.current = setTimeout(() => setStatusExpanded(false), 5000);
  }

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

  const tagLookup = useMemo(
    () => new Map(taxonomy.tags.map((tag) => [tag.id, tag])),
    [taxonomy.tags],
  );

  const categoryLookup = useMemo(
    () => new Map(taxonomy.categories.map((category) => [category.id, category])),
    [taxonomy.categories],
  );

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  useEffect(() => {
    return () => {
      if (statusExpandTimerRef.current) {
        clearTimeout(statusExpandTimerRef.current);
      }
    };
  }, []);

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
        setVisibleRecipes(ids.map((id) => recipesById.get(id)).filter(Boolean) as Recipe[]);
      } catch {
        setVisibleRecipes(filterRecipes(recipes, query));
      }
    }

    void applyQuery();

    return () => {
      ignore = true;
    };
  }, [query, recipes]);

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
      const imported = await extractDraftFromWebsite(draft.sourceRef.trim());
      const hydrated = hydrateDraftSuggestions(imported, taxonomy);
      setDraft({
        ...hydrated,
        selectedTagIds: hydrated.suggestedTags
          .map((suggestion) => suggestion.tagId)
          .filter((tagId): tagId is string => Boolean(tagId)),
      });
      setDraftImported(true);
      setShowSourceControls(false);
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
      const imported =
        draft.sourceType === "photo"
          ? await extractDraftFromPhoto(file)
          : await extractDraftFromTextFile(file);
      const hydrated = hydrateDraftSuggestions(imported, taxonomy);
      setDraft({
        ...hydrated,
        selectedTagIds: hydrated.suggestedTags
          .map((suggestion) => suggestion.tagId)
          .filter((tagId): tagId is string => Boolean(tagId)),
      });
      setDraftImported(true);
      setShowSourceControls(false);
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
    const autoTagIds = draftSuggestions
      .map((suggestion) => suggestion.tagId)
      .filter((tagId): tagId is string => Boolean(tagId));
    const baseRecipe = convertDraftToRecipe({
      ...draft,
      selectedTagIds: draft.selectedTagIds.length > 0 ? draft.selectedTagIds : autoTagIds,
      suggestedTags: draftSuggestions,
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
    updateStatus(
      recipe
        ? `Random recipe ready: ${recipe.title}`
        : "No recipe matches the current random selection criteria.",
      recipe ? "success" : "error",
    );
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
      groupByCategoryId
        ? groupRecipesByCategory(visibleRecipes, taxonomy, groupByCategoryId)
        : [],
    [groupByCategoryId, taxonomy, visibleRecipes],
  );

  const selectedRandomRecipe = recipes.find((recipe) => recipe.id === randomRecipeId);
  const mealTimeCategory = getCategoryByName(taxonomy, "Meal-Time");
  const showSourceSelector = editorMode === "create" && (draft.sourceType === "manual" || showSourceControls);
  const showImportControls =
    editorMode === "create" && draft.sourceType !== "manual" && showSourceControls;
  const showDraftForm = editorMode === "edit" || draft.sourceType === "manual" || draftImported;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-section">
          <p className="eyebrow">Cookbook</p>
          <h1>Recipe aggregator</h1>
          <p className="muted">
            Obsidian-style markdown storage, canonical tags, editable aliases, and
            searchable recipe drafts.
          </p>
          <div className="button-row">
            <button type="button" onClick={() => openCreateEditor("website")}>
              Upload Recipe
            </button>
          </div>
          <div className="button-row">
            <button type="button" className={activeView === "recipes" || activeView === "recipeDetail" ? "secondary nav-active" : "secondary"} onClick={() => setActiveView("recipes")}>
              Browse recipes
            </button>
            <button type="button" className={activeView === "taxonomy" ? "secondary nav-active" : "secondary"} onClick={() => setActiveView("taxonomy")}>
              Manage taxonomy
            </button>
          </div>
          
        </div>

        <div className="sidebar-section">
          <div className="section-heading">
            <h2>Search and filter</h2>
          </div>
          <label className="field">
            <span>Search</span>
            <input
              value={query.searchText}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setQuery((current) => ({ ...current, searchText: value }));
              }}
              placeholder="Search title, ingredients, or instructions"
            />
          </label>

          <div className="two-column">
            <label className="field">
              <span>Sort by</span>
              <select
                value={query.sortBy}
                onChange={(event) => {
                  const value = event.currentTarget.value as RecipeQuery["sortBy"];
                  setQuery((current) => ({
                    ...current,
                    sortBy: value,
                  }));
                }}
              >
                <option value="updated">Recently updated</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
                <option value="cuisine">Cuisine</option>
                <option value="mealType">Meal type</option>
              </select>
            </label>
            <label className="field">
              <span>Group by</span>
              <select
                value={groupByCategoryId}
                onChange={(event) => {
                  setGroupByCategoryId(event.currentTarget.value);
                }}
              >
                <option value="">No grouping</option>
                {taxonomy.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filter-groups">
            {taxonomy.categories.map((category) => (
              <section key={category.id} className="filter-group">
                <h3>{category.name}</h3>
                <div className="chip-wrap">
                  {taxonomy.tags
                    .filter((tag) => tag.categoryId === category.id)
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={query.selectedTagIds.includes(tag.id) ? "chip chip-active" : "chip"}
                        onClick={() => toggleFilterTag(tag.id)}
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-heading">
            <h2>Random dish</h2>
          </div>
          <p className="muted">Uses your active tag filters plus optional ingredient keywords.</p>
          <label className="field">
            <span>Required ingredients</span>
            <input
              value={randomIngredientInput}
              onChange={(event) => {
                setRandomIngredientInput(event.currentTarget.value);
              }}
              placeholder="egg, rice, tomato"
            />
          </label>
          <button type="button" onClick={chooseRandomRecipe}>
            Pick random recipe
          </button>
          {selectedRandomRecipe ? (
            <div className="random-card">
              <strong>{selectedRandomRecipe.title}</strong>
              <span>{selectedRandomRecipe.summary}</span>
            </div>
          ) : null}
        </div>
      </aside>

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
          selectedRecipe ? (
            <RecipeDetailView
              recipe={selectedRecipe}
              tagLookup={tagLookup}
              categoryLookup={categoryLookup}
              onBack={closeRecipeDetail}
              onEdit={openEditEditor}
              onDelete={deleteRecipe}
              onRate={updateRecipeRating}
            />
          ) : (
            <section className="recipe-detail-view">
              <div className="recipe-detail-header">
                <div>
                  <p className="eyebrow">Recipe detail</p>
                  <h2>No recipe selected</h2>
                </div>
                <button type="button" className="secondary" onClick={closeRecipeDetail}>
                  Back to browse
                </button>
              </div>
            </section>
          )
        ) : activeView === "recipes" ? (
          groupByCategoryId ? (
            <div className="section-stack">
              {groupedRecipes.map((section) => (
                <section key={section.id}>
                  <div className="section-heading">
                    <h3>{section.label}</h3>
                    <span>{section.recipes.length} recipes</span>
                  </div>
                  <div className="recipe-grid">
                    {section.recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        tagLookup={tagLookup}
                        categoryLookup={categoryLookup}
                        onEdit={openEditEditor}
                        onDelete={deleteRecipe}
                        onOpenDetail={openRecipeDetail}
                        onRate={updateRecipeRating}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="recipe-grid">
              {visibleRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  tagLookup={tagLookup}
                  categoryLookup={categoryLookup}
                  onEdit={openEditEditor}
                  onDelete={deleteRecipe}
                  onOpenDetail={openRecipeDetail}
                  onRate={updateRecipeRating}
                />
              ))}
            </div>
          )
        ) : (
          <div className="taxonomy-layout">
            <section className="panel">
              <div className="section-heading">
                <h3>Create category</h3>
              </div>
              <label className="field">
                <span>Category name</span>
                <input
                  value={categoryForm.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCategoryForm((current) => ({ ...current, name: value }));
                  }}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={categoryForm.description}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCategoryForm((current) => ({
                      ...current,
                      description: value,
                    }));
                  }}
                  rows={3}
                />
              </label>
              <button type="button" onClick={saveCategory}>
                Save category
              </button>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h3>Create canonical tag</h3>
              </div>
              <label className="field">
                <span>Category</span>
                <select
                  value={tagForm.categoryId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setTagForm((current) => ({ ...current, categoryId: value }));
                  }}
                >
                  <option value="">Choose a category</option>
                  {taxonomy.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tag name</span>
                <input
                  value={tagForm.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setTagForm((current) => ({ ...current, name: value }));
                  }}
                />
              </label>
              <button type="button" onClick={saveTag}>
                Save tag
              </button>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h3>Add alias</h3>
              </div>
              <label className="field">
                <span>Canonical tag</span>
                <select
                  value={aliasForm.tagId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setAliasForm((current) => ({ ...current, tagId: value }));
                  }}
                >
                  <option value="">Choose a tag</option>
                  {taxonomy.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Alias</span>
                <input
                  value={aliasForm.alias}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setAliasForm((current) => ({ ...current, alias: value }));
                  }}
                />
              </label>
              <button type="button" onClick={saveAlias}>
                Save alias
              </button>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h3>Merge tags</h3>
              </div>
              <label className="field">
                <span>Source tag</span>
                <select
                  value={mergeForm.sourceTagId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setMergeForm((current) => ({ ...current, sourceTagId: value }));
                  }}
                >
                  <option value="">Choose a source tag</option>
                  {taxonomy.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Target tag</span>
                <select
                  value={mergeForm.targetTagId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setMergeForm((current) => ({ ...current, targetTagId: value }));
                  }}
                >
                  <option value="">Choose a target tag</option>
                  {taxonomy.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={mergeSelectedTags}>
                Merge tags
              </button>
            </section>

            <section className="panel taxonomy-browser">
              <div className="section-heading">
                <h3>Current taxonomy</h3>
              </div>
              {taxonomy.categories.map((category) => (
                <div key={category.id} className="taxonomy-category">
                  <h4>{category.name}</h4>
                  <p className="muted">{category.description}</p>
                  <div className="taxonomy-tag-list">
                    {taxonomy.tags
                      .filter((tag) => tag.categoryId === category.id)
                      .map((tag) => (
                        <div key={tag.id} className="taxonomy-tag">
                          <strong>{tag.name} </strong>
                          <span className="muted">
                            {tag.aliases.length > 0 ? `Aliases: ${tag.aliases.join(", ")}` : "No aliases yet"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </section>

      {editorOpen ? (
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
                <button type="button" className="secondary" onClick={() => setEditorOpen(false)}>
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
                  {(["website", "photo", "text", "manual"] as const).map((sourceType) => (
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
                            const value = event.currentTarget.value;
                            setUploadErrorActive(false);
                            setDraft((current) => ({ ...current, sourceRef: value }));
                          }}
                          placeholder="https://example.com/recipe"
                        />
                        <button type="button" onClick={importFromWebsite} disabled={isImporting}>
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
                            setUploadErrorActive(false);
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
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, title: value }));
                    }}
                  />
                </label>
                <label className="field">
                  <span>Source reference</span>
                  <input
                    value={draft.sourceRef}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, sourceRef: value }));
                    }}
                  />
                </label>
                <label className="field field-wide">
                  <span>Summary</span>
                  <textarea
                    value={draft.summary}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, summary: value }));
                    }}
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Servings</span>
                  <input
                    value={draft.servings}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, servings: value }));
                    }}
                  />
                </label>
                <label className="field">
                  <span>Cuisine</span>
                  <input
                    value={draft.cuisine}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, cuisine: value }));
                    }}
                  />
                </label>
                <label className="field">
                  <span>Meal type</span>
                  <input
                    value={draft.mealType}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({ ...current, mealType: value }));
                    }}
                  />
                </label>
                <label className="field field-wide">
                  <span>Ingredients</span>
                  <textarea
                    value={draft.ingredientsText}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({
                        ...current,
                        ingredientsText: value,
                      }));
                    }}
                    rows={8}
                  />
                </label>
                <label className="field field-wide">
                  <span>Instructions</span>
                  <textarea
                    value={draft.instructionsText}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) => ({
                        ...current,
                        instructionsText: value,
                      }));
                    }}
                    rows={8}
                  />
                </label>
              </div>
            ) : null}

            {showDraftForm ? (
              <section className="panel">
                <div className="section-heading">
                  <h3>Suggested tags</h3>
                  <span>{draftSuggestions.length} matches</span>
                </div>
                <div className="suggestion-list">
                  {draftSuggestions.map((suggestion) => (
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
                {taxonomy.categories.map((category) => (
                  <div key={category.id} className="filter-group">
                    <h4>{category.name}</h4>
                    <div className="chip-wrap">
                      {taxonomy.tags
                        .filter((tag) => tag.categoryId === category.id)
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            className={
                              draft.selectedTagIds.includes(tag.id) ? "chip chip-active" : "chip"
                            }
                            onClick={() => toggleDraftTag(tag.id)}
                          >
                            {tag.name}
                          </button>
                        ))}
                    </div>
                    <div className="draft-tag-row">
                      <input
                        value={draftTagInputs[category.id] ?? ""}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDraftTagInputs((current) => ({
                            ...current,
                            [category.id]: value,
                          }));
                        }}
                        placeholder={`Add a ${category.name} tag`}
                      />
                      <button type="button" className="secondary" onClick={() => void createDraftTag(category.id)}>
                        Add tag
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            {showDraftForm ? (
              <div className="button-row">
                <button type="button" onClick={saveDraft}>
                  {editorMode === "edit" ? "Save recipe" : "Create recipe"}
                </button>
                {mealTimeCategory ? (
                  <span className="muted">
                    Group browsing is ready for {mealTimeCategory.name.toLowerCase()} and every other category.
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      <div
        className={`status-bar status-bar-${statusTone}${statusExpanded ? " status-bar-expanded" : ""}`}
        role="status"
        aria-live="polite"
        data-testid="status-bar"
      >
        <span className="status-bar-label">Status</span>
        <span className="status-bar-message">{statusMessage}</span>
      </div>

      {loading ? <div className="loading-overlay">Loading local cookbook...</div> : null}
    </main>
  );
}

type RecipeCardProps = {
  recipe: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
  onOpenDetail: (recipeId: string) => void;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

type StarRatingProps = {
  rating: number;
  label: string;
  onRate: (rating: number) => void;
  compact?: boolean;
  stopPropagation?: boolean;
};

function StarRating({
  rating,
  label,
  onRate,
  compact = false,
  stopPropagation = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || rating;

  return (
    <div
      className={`star-rating${compact ? " star-rating-compact" : ""}`}
      aria-label={label}
      onMouseLeave={() => setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={value <= displayValue ? "rating-star rating-star-filled" : "rating-star"}
          aria-label={`${label}: ${value} star${value === 1 ? "" : "s"}`}
          onMouseEnter={() => setHoverValue(value)}
          onFocus={() => setHoverValue(value)}
          onBlur={() => setHoverValue(0)}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
            onRate(value);
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type RecipeDetailViewProps = {
  recipe: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

function RecipeDetailView({
  recipe,
  tagLookup,
  categoryLookup,
  onBack,
  onEdit,
  onDelete,
  onRate,
}: RecipeDetailViewProps) {
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const sortedTagIds = sortTagIdsForPreview(recipe.tagIds, tagLookup, categoryLookup);

  useEffect(() => {
    setDeleteConfirming(false);
  }, [recipe.id]);

  return (
    <section className="recipe-detail-view" data-testid="recipe-detail-view">
      <div className="recipe-detail-header">
        <div>
          <p className="eyebrow">Recipe detail</p>
          <h2>{recipe.title}</h2>
          <p className="muted">
            {recipe.cuisine || "Unknown cuisine"} · {recipe.mealType || "Any meal"} ·{" "}
            {recipe.servings || "Servings not set"}
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDeleteConfirming(false);
              onBack();
            }}
          >
            Back to browse
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirming(false);
              onEdit(recipe);
            }}
          >
            Edit recipe
          </button>
          <button
            type="button"
            className={deleteConfirming ? "" : "secondary"}
            onClick={() => {
              if (deleteConfirming) {
                void onDelete(recipe.id);
                return;
              }
              setDeleteConfirming(true);
            }}
          >
            {deleteConfirming ? "Confirm delete" : "Delete recipe"}
          </button>
        </div>
      </div>

      <div className="recipe-detail-grid">
        <div className="recipe-detail-primary panel">
          {recipe.heroImage ? (
            <img className="recipe-detail-image" src={recipe.heroImage} alt={recipe.title} />
          ) : (
            <div className="recipe-detail-image recipe-image-placeholder">No image</div>
          )}
          <p>{recipe.summary}</p>
          <div className="recipe-detail-rating">
            <span className="muted">Your rating: </span>
            <StarRating
              rating={recipe.rating}
              label={`Rate ${recipe.title}`}
              onRate={(value) => {
                setDeleteConfirming(false);
                void onRate(recipe.id, value);
              }}
            />
          </div>
          <div className="chip-wrap">
            {sortedTagIds.map((tagId) => (
              <span key={tagId} className="chip chip-static">
                {tagLookup.get(tagId)?.name ?? tagId}
              </span>
            ))}
          </div>
        </div>

        <div className="recipe-detail-secondary">
          <section className="panel">
            <h3>Ingredients</h3>
            <ul>
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.raw}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <section className="recipe-detail-instructions panel">
            <h3>Instructions</h3>
            <ol>
              {recipe.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </section>
    </section>
  );
}

function RecipeCard({
  recipe,
  tagLookup,
  categoryLookup,
  onEdit,
  onDelete,
  onOpenDetail,
  onRate,
}: RecipeCardProps) {
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const sortedTagIds = sortTagIdsForPreview(recipe.tagIds, tagLookup, categoryLookup);
  const hasOverflow = sortedTagIds.length > previewTagLimit;
  const previewTagIds = hasOverflow
    ? sortedTagIds.slice(0, previewTagLimit - 1)
    : sortedTagIds.slice(0, previewTagLimit);
  const remainingTagCount = Math.max(sortedTagIds.length - previewTagIds.length, 0);

  return (
    <article
      className="recipe-card recipe-card-clickable"
      data-testid={`recipe-card-${recipe.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Open ${recipe.title}`}
      onClick={() => onOpenDetail(recipe.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail(recipe.id);
        }
      }}
      onMouseLeave={() => setDeleteConfirming(false)}
    >
      {recipe.heroImage ? (
        <img className="recipe-image" src={recipe.heroImage} alt={recipe.title} />
      ) : (
        <div className="recipe-image recipe-image-placeholder">No image</div>
      )}
      <div className="recipe-card-body recipe-card-preview">
        <div className="section-heading">
          <div>
            <h3>{recipe.title}</h3>
            <p className="muted">
              {recipe.cuisine || "Unknown cuisine"} · {recipe.mealType || "Any meal"} ·{" "}
              {recipe.servings || "Servings not set"}
            </p>
          </div>
          <StarRating
            rating={recipe.rating}
            label={`Rate ${recipe.title}`}
            compact
            stopPropagation
            onRate={(value) => {
              setDeleteConfirming(false);
              void onRate(recipe.id, value);
            }}
          />
        </div>
        <p className="recipe-card-summary">{recipe.summary}</p>
        <div
          className={
            remainingTagCount > 0
              ? "recipe-card-tag-area recipe-card-tag-area-overflow"
              : "recipe-card-tag-area"
          }
        >
          <div className="chip-wrap recipe-card-tags">
            {previewTagIds.map((tagId) => (
              <span key={tagId} className="chip chip-static">
                {tagLookup.get(tagId)?.name ?? tagId}
              </span>
            ))}
            {remainingTagCount > 0 ? (
              <span className="chip chip-static">+{remainingTagCount} more</span>
            ) : null}
          </div>
        </div>
        <div className="button-row recipe-card-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteConfirming(false);
              onEdit(recipe);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={deleteConfirming ? "" : "secondary"}
            onClick={(event) => {
              event.stopPropagation();
              if (deleteConfirming) {
                void onDelete(recipe.id);
                return;
              }
              setDeleteConfirming(true);
            }}
          >
            {deleteConfirming ? "Confirm delete" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default App;
