import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStatusMessage, type StatusTone } from "../hooks/useStatusMessage";
import { extractDraftFromPhoto, extractDraftFromTextFile, extractDraftFromWebsite } from "../lib/extraction";
import type { Recipe, RecipeDraft, RecipeQuery, SourceType, Taxonomy } from "../lib/models";
import { ObsidianRecipeStore } from "../lib/persistence";
import { SqliteSearchIndex } from "../lib/searchIndex";
import { filterRecipes, groupRecipesByCategory, pickRandomRecipe } from "../lib/selectors";
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
} from "../lib/taxonomy";
import { buildTaxonomyCategoryGroups } from "../lib/taxonomyView";
import { isDefined } from "../lib/typeGuards";
import { AppShellContext, type AppView } from "./app-shell-context";
import { RecipeCatalogContext } from "./recipe-catalog-context";
import { RecipeEditorContext } from "./recipe-editor-context";
import { SearchContext } from "./search-context";
import { StatusContext } from "./status-context";
import { TaxonomyAdminContext } from "./taxonomy-admin-context";
import type { AliasForm, CategoryForm, MergeForm, TagForm } from "./taxonomy-admin-types";
import { TaxonomyBrowserUiContext } from "./taxonomy-browser-ui-context";
import { TaxonomyFilterUiContext, type TaxonomyFilterScope } from "./taxonomy-filter-ui-context";
import { TaxonomyContext } from "./taxonomy-context";

const recipeStore = new ObsidianRecipeStore();
const searchIndex = new SqliteSearchIndex();

const defaultQuery: RecipeQuery = {
  searchText: "",
  selectedTagIds: [],
  excludedTagIds: [],
  requiredIngredientTerms: [],
  sortBy: "updated",
};

type AppProviderProps = {
  children: ReactNode;
};

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

function AppProvider({ children }: AppProviderProps) {
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
  const [sidebarCategoryInputs, setSidebarCategoryInputs] = useState<Record<string, string>>({});
  const [editorCategoryInputs, setEditorCategoryInputs] = useState<Record<string, string>>({});
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>({});
  const { statusMessage, statusTone, statusExpanded, updateStatus } = useStatusMessage(
    "Loading Saucer...",
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

  const groupedRecipes = useMemo(
    () =>
      groupByCategoryId ? groupRecipesByCategory(visibleRecipes, taxonomy, groupByCategoryId) : [],
    [groupByCategoryId, taxonomy, visibleRecipes],
  );

  const selectedRandomRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === randomRecipeId),
    [recipes, randomRecipeId],
  );

  const mealTimeCategory = useMemo(() => getCategoryByName(taxonomy, "Meal-Time"), [taxonomy]);

  const showSourceSelector = editorMode === "create" && (draft.sourceType === "manual" || showSourceControls);
  const showImportControls =
    editorMode === "create" && draft.sourceType !== "manual" && showSourceControls;
  const showDraftForm = editorMode === "edit" || draft.sourceType === "manual" || draftImported;

  useEffect(() => {
    setCollapsedCategoryIds((current) => {
      const nextEntries = taxonomyGroups.map(({ category }) => [category.id, current[category.id] ?? true] as const);
      return Object.fromEntries(nextEntries);
    });
  }, [taxonomyGroups]);

  useEffect(() => {
    async function initialize() {
      try {
        const snapshot = await recipeStore.load();
        setRecipes(snapshot.recipes);
        setTaxonomy(snapshot.taxonomy);
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
  }, [updateStatus]);

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

  const syncState = useCallback(
    async (
      nextRecipes: Recipe[],
      nextTaxonomy: Taxonomy,
      message: string,
      tone: StatusTone = "success",
    ) => {
      const snapshot = await recipeStore.replaceAll(nextRecipes, nextTaxonomy);
      setRecipes(snapshot.recipes);
      setTaxonomy(snapshot.taxonomy);
      updateStatus(message, tone);
      await searchIndex.rebuild(snapshot.recipes, snapshot.taxonomy);
    },
    [updateStatus],
  );

  const applyImportedDraft = useCallback(
    (importedDraft: RecipeDraft) => {
      const autoSelectedTagIds = getAutoSelectedDraftTagIds(buildTagSuggestions(importedDraft, taxonomy));

      setDraft({
        ...importedDraft,
        selectedTagIds: autoSelectedTagIds,
      });
      setDraftImported(true);
      setShowSourceControls(false);
    },
    [taxonomy],
  );

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditorCategoryInputs({});
  }, []);

  const updateDraft = useCallback((patch: Partial<RecipeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updateCategoryForm = useCallback((patch: Partial<CategoryForm>) => {
    setCategoryForm((current) => ({ ...current, ...patch }));
  }, []);

  const updateTagForm = useCallback((patch: Partial<TagForm>) => {
    setTagForm((current) => ({ ...current, ...patch }));
  }, []);

  const updateAliasForm = useCallback((patch: Partial<AliasForm>) => {
    setAliasForm((current) => ({ ...current, ...patch }));
  }, []);

  const updateMergeForm = useCallback((patch: Partial<MergeForm>) => {
    setMergeForm((current) => ({ ...current, ...patch }));
  }, []);

  const setCategoryInput = useCallback(
    (scope: TaxonomyFilterScope, categoryId: string, value: string) => {
      const updateInputs = scope === "sidebar" ? setSidebarCategoryInputs : setEditorCategoryInputs;
      updateInputs((current) => ({
        ...current,
        [categoryId]: value,
      }));
    },
    [],
  );

  const resetCategoryInputs = useCallback((scope: TaxonomyFilterScope) => {
    if (scope === "sidebar") {
      setSidebarCategoryInputs({});
      return;
    }

    setEditorCategoryInputs({});
  }, []);

  const setActiveWorkspace = useCallback((view: AppView) => {
    setActiveView(view);
  }, []);

  const openCreateEditor = useCallback(
    (sourceType: SourceType) => {
      setEditorMode("create");
      setDraft(createEmptyDraft(sourceType));
      setEditorOpen(true);
      setDraftImported(false);
      setShowSourceControls(true);
      setUploadErrorActive(false);
      setIsImporting(false);
      setEditorCategoryInputs({});
      updateStatus(
        sourceType === "manual"
          ? "Manual recipe entry ready."
          : "Choose a source and import your recipe draft.",
        "info",
      );
    },
    [updateStatus],
  );

  const openEditEditor = useCallback(
    (recipe: Recipe) => {
      setEditorMode("edit");
      setDraft(toDraft(recipe));
      setEditorOpen(true);
      setDraftImported(true);
      setShowSourceControls(false);
      setUploadErrorActive(false);
      setIsImporting(false);
      setEditorCategoryInputs({});
      updateStatus(`Editing ${recipe.title}.`, "info");
    },
    [updateStatus],
  );

  const importFromWebsite = useCallback(async () => {
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
  }, [applyImportedDraft, draft.sourceRef, updateStatus]);

  const importFromFile = useCallback(
    async (file: File | undefined) => {
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
    },
    [applyImportedDraft, draft.sourceType, updateStatus],
  );

  const saveDraft = useCallback(async () => {
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
    setIsImporting(false);
    setEditorCategoryInputs({});
  }, [draft, draftSuggestions, editorMode, recipes, syncState, taxonomy]);

  const deleteRecipe = useCallback(
    async (recipeId: string) => {
      const snapshot = await recipeStore.deleteRecipe(recipeId);
      setRecipes(snapshot.recipes);
      setTaxonomy(snapshot.taxonomy);
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId("");
        setActiveView("recipes");
      }
      updateStatus("Recipe deleted.", "success");
      await searchIndex.rebuild(snapshot.recipes, snapshot.taxonomy);
    },
    [selectedRecipeId, updateStatus],
  );

  const updateRecipeRating = useCallback(
    async (recipeId: string, rating: number) => {
      const nextRecipes = recipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, rating, updatedAt: new Date().toISOString() } : recipe,
      );
      await syncState(nextRecipes, taxonomy, "Recipe rating updated.");
    },
    [recipes, syncState, taxonomy],
  );

  const saveCategory = useCallback(async () => {
    const nextTaxonomy = upsertCategory(taxonomy, categoryForm.name, categoryForm.description);
    await syncState(recipes, nextTaxonomy, "Category saved.");
    setCategoryForm({ name: "", description: "" });
  }, [categoryForm.description, categoryForm.name, recipes, syncState, taxonomy]);

  const saveTag = useCallback(async () => {
    if (!tagForm.categoryId) {
      updateStatus("Choose a category before creating a tag.", "error");
      return;
    }
    const nextTaxonomy = upsertTag(taxonomy, tagForm.categoryId, tagForm.name);
    await syncState(recipes, nextTaxonomy, "Canonical tag saved.");
    setTagForm((current) => ({ ...current, name: "" }));
  }, [recipes, syncState, tagForm.categoryId, tagForm.name, taxonomy, updateStatus]);

  const saveAlias = useCallback(async () => {
    if (!aliasForm.tagId) {
      updateStatus("Choose a tag before creating an alias.", "error");
      return;
    }
    const nextTaxonomy = addAlias(taxonomy, aliasForm.tagId, aliasForm.alias);
    await syncState(recipes, nextTaxonomy, "Alias saved.");
    setAliasForm((current) => ({ ...current, alias: "" }));
  }, [aliasForm.alias, aliasForm.tagId, recipes, syncState, taxonomy, updateStatus]);

  const mergeSelectedTags = useCallback(async () => {
    const merged = mergeTags(taxonomy, recipes, mergeForm.sourceTagId, mergeForm.targetTagId);
    await syncState(merged.recipes, merged.taxonomy, "Tags merged and recipe assignments updated.");
    setMergeForm({ sourceTagId: "", targetTagId: "" });
  }, [mergeForm.sourceTagId, mergeForm.targetTagId, recipes, syncState, taxonomy]);

  const toggleDraftTag = useCallback((tagId: string) => {
    setDraft((current) => ({
      ...current,
      selectedTagIds: current.selectedTagIds.includes(tagId)
        ? current.selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
        : [...current.selectedTagIds, tagId],
    }));
  }, []);

  const toggleFilterTag = useCallback((tagId: string) => {
    setQuery((current) => ({
      ...current,
      selectedTagIds: current.selectedTagIds.includes(tagId)
        ? current.selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
        : [...current.selectedTagIds, tagId],
    }));
  }, []);

  const updateSearchText = useCallback((searchText: string) => {
    setQuery((current) => ({ ...current, searchText }));
  }, []);

  const updateSortBy = useCallback((sortBy: RecipeQuery["sortBy"]) => {
    setQuery((current) => ({ ...current, sortBy }));
  }, []);

  const updateGroupByCategory = useCallback((categoryId: string) => {
    setGroupByCategoryId(categoryId);
  }, []);

  const updateRandomIngredientSearch = useCallback((value: string) => {
    setRandomIngredientInput(value);
  }, []);

  const openRecipeDetail = useCallback(
    (recipeId: string) => {
      setSelectedRecipeId(recipeId);
      setActiveView("recipeDetail");
      const recipe = recipes.find((entry) => entry.id === recipeId);
      updateStatus(recipe ? `Viewing ${recipe.title}.` : "Viewing recipe details.", "info");
    },
    [recipes, updateStatus],
  );

  const closeRecipeDetail = useCallback(() => {
    setActiveView("recipes");
    updateStatus("Returned to recipe browse view.", "info");
  }, [updateStatus]);

  const chooseRandomRecipe = useCallback(() => {
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
  }, [openRecipeDetail, query.selectedTagIds, randomIngredientInput, recipes, updateStatus]);

  const clearUploadError = useCallback(() => {
    setUploadErrorActive(false);
  }, []);

  const selectSourceType = useCallback(
    (sourceType: SourceType) => {
      setUploadErrorActive(false);
      setDraftImported(false);
      setIsImporting(false);
      setShowSourceControls(true);
      setDraft(createEmptyDraft(sourceType));
      setEditorCategoryInputs({});
      updateStatus(
        sourceType === "manual"
          ? "Manual recipe entry ready."
          : `Ready to import from ${sourceType}.`,
        "info",
      );
    },
    [updateStatus],
  );

  const revealSourceControls = useCallback(() => {
    setShowSourceControls(true);
    setUploadErrorActive(false);
    updateStatus("Choose a new source to replace this imported draft.", "info");
  }, [updateStatus]);

  const createDraftTag = useCallback(
    async (categoryId: string, inputValue: string) => {
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

      setEditorCategoryInputs((current) => ({
        ...current,
        [categoryId]: "",
      }));
    },
    [recipes, syncState, taxonomy, updateStatus],
  );

  const toggleCategoryCollapsed = useCallback((categoryId: string) => {
    setCollapsedCategoryIds((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  }, []);

  const appShellValue = useMemo(
    () => ({
      activeView,
      loading,
      setActiveWorkspace,
      openRecipeDetail,
      closeRecipeDetail,
    }),
    [activeView, closeRecipeDetail, loading, openRecipeDetail, setActiveWorkspace],
  );

  const recipeCatalogValue = useMemo(
    () => ({
      recipes,
      visibleRecipes,
      groupedRecipes,
      selectedRecipe,
      selectedRandomRecipe,
      deleteRecipe,
      updateRecipeRating,
    }),
    [
      deleteRecipe,
      groupedRecipes,
      recipes,
      selectedRandomRecipe,
      selectedRecipe,
      updateRecipeRating,
      visibleRecipes,
    ],
  );

  const searchValue = useMemo(
    () => ({
      query,
      groupByCategoryId,
      randomIngredientInput,
      updateSearchText,
      updateSortBy,
      updateGroupByCategory,
      updateRandomIngredientSearch,
      toggleFilterTag,
      chooseRandomRecipe,
    }),
    [
      chooseRandomRecipe,
      groupByCategoryId,
      query,
      randomIngredientInput,
      toggleFilterTag,
      updateGroupByCategory,
      updateRandomIngredientSearch,
      updateSearchText,
      updateSortBy,
    ],
  );

  const taxonomyValue = useMemo(
    () => ({
      taxonomy,
      taxonomyGroups,
      tagLookup,
      categoryLookup,
      mealTimeCategory,
    }),
    [categoryLookup, mealTimeCategory, tagLookup, taxonomy, taxonomyGroups],
  );

  const taxonomyAdminValue = useMemo(
    () => ({
      categoryForm,
      tagForm,
      aliasForm,
      mergeForm,
      updateCategoryForm,
      updateTagForm,
      updateAliasForm,
      updateMergeForm,
      saveCategory,
      saveTag,
      saveAlias,
      mergeSelectedTags,
    }),
    [
      aliasForm,
      categoryForm,
      mergeForm,
      mergeSelectedTags,
      saveAlias,
      saveCategory,
      saveTag,
      tagForm,
      updateAliasForm,
      updateCategoryForm,
      updateMergeForm,
      updateTagForm,
    ],
  );

  const taxonomyFilterUiValue = useMemo(
    () => ({
      sidebarCategoryInputs,
      editorCategoryInputs,
      setCategoryInput,
      resetCategoryInputs,
    }),
    [editorCategoryInputs, resetCategoryInputs, setCategoryInput, sidebarCategoryInputs],
  );

  const taxonomyBrowserUiValue = useMemo(
    () => ({
      collapsedCategoryIds,
      toggleCategoryCollapsed,
    }),
    [collapsedCategoryIds, toggleCategoryCollapsed],
  );

  const recipeEditorValue = useMemo(
    () => ({
      editorOpen,
      editorMode,
      draft,
      draftImported,
      showSourceControls,
      uploadErrorActive,
      isImporting,
      visibleDraftSuggestions,
      visibleEditableTagIds,
      showSourceSelector,
      showImportControls,
      showDraftForm,
      closeEditor,
      openCreateEditor,
      openEditEditor,
      updateDraft,
      clearUploadError,
      revealSourceControls,
      selectSourceType,
      importFromWebsite,
      importFromFile,
      toggleDraftTag,
      createDraftTag,
      saveDraft,
    }),
    [
      clearUploadError,
      closeEditor,
      createDraftTag,
      draft,
      draftImported,
      editorMode,
      editorOpen,
      importFromFile,
      importFromWebsite,
      isImporting,
      openCreateEditor,
      openEditEditor,
      revealSourceControls,
      saveDraft,
      selectSourceType,
      showDraftForm,
      showImportControls,
      showSourceControls,
      showSourceSelector,
      toggleDraftTag,
      updateDraft,
      uploadErrorActive,
      visibleDraftSuggestions,
      visibleEditableTagIds,
    ],
  );

  const statusValue = useMemo(
    () => ({
      statusMessage,
      statusTone,
      statusExpanded,
      updateStatus,
    }),
    [statusExpanded, statusMessage, statusTone, updateStatus],
  );

  return (
    <StatusContext.Provider value={statusValue}>
      <AppShellContext.Provider value={appShellValue}>
        <SearchContext.Provider value={searchValue}>
          <TaxonomyContext.Provider value={taxonomyValue}>
            <TaxonomyFilterUiContext.Provider value={taxonomyFilterUiValue}>
              <TaxonomyBrowserUiContext.Provider value={taxonomyBrowserUiValue}>
                <TaxonomyAdminContext.Provider value={taxonomyAdminValue}>
                  <RecipeCatalogContext.Provider value={recipeCatalogValue}>
                    <RecipeEditorContext.Provider value={recipeEditorValue}>
                      {children}
                    </RecipeEditorContext.Provider>
                  </RecipeCatalogContext.Provider>
                </TaxonomyAdminContext.Provider>
              </TaxonomyBrowserUiContext.Provider>
            </TaxonomyFilterUiContext.Provider>
          </TaxonomyContext.Provider>
        </SearchContext.Provider>
      </AppShellContext.Provider>
    </StatusContext.Provider>
  );
}

export default AppProvider;
