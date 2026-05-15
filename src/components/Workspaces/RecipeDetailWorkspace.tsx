import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useRecipeDetailViewModel } from "../../features/browse/useRecipeDetailViewModel";
import StarRating from "../StarRating";
import { sortTagIdsForPreview } from "../recipeTagPreview";

function RecipeDetailWorkspace() {
  const {
    recipe,
    closeRecipeDetail,
    deleteRecipe,
    updateRecipeRating,
    openEditEditor,
    tagLookup,
    categoryLookup,
    linkedRecipes,
    openRecipeDetail,
  } = useRecipeDetailViewModel();
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!recipe) return;
    const deleted = await deleteRecipe(recipe.id);
    if (!deleted) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, [recipe, deleteRecipe]);
  const sortedTagIds = recipe
    ? sortTagIdsForPreview(recipe.tagIds, tagLookup, categoryLookup)
    : [];

  const ingredientLookup = useMemo(
    () => new Map((recipe?.ingredients ?? []).map((ingredient) => [ingredient.id, ingredient])),
    [recipe],
  );

  useEffect(() => {
    setDeleteConfirming(false);
  }, [recipe?.id]);

  if (!recipe) {
    return (
      <section className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-60">
              Recipe detail
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text-60">
              No recipe selected
            </h2>
          </div>
          <button type="button" className="btn-secondary" onClick={closeRecipeDetail}>
            Back to browse
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-5 rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]"
      data-testid="recipe-detail-view"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-60">
            Recipe detail
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text-60">{recipe.title}</h2>
          <p className="mt-2 text-sm text-text-35">
            {recipe.cuisine || "Unknown cuisine"} · {recipe.mealType || "Any meal"} ·{" "}
            {recipe.servings || "Servings not set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setDeleteConfirming(false);
              closeRecipeDetail();
            }}
          >
            Back to browse
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setDeleteConfirming(false);
              openEditEditor(recipe);
            }}
          >
            Edit recipe
          </button>
          <button
            type="button"
            className={cn(
              deleteConfirming
                ? "btn-primary border-accent-55 bg-accent-50 hover:border-accent-60 hover:bg-accent-55 active:bg-accent-60"
                : "btn-secondary",
              shaking && "animate-shake",
            )}
            onClick={() => {
              if (deleteConfirming) {
                void handleDelete();
                return;
              }
              setDeleteConfirming(true);
            }}
          >
            {deleteConfirming ? "Confirm delete" : "Delete recipe"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
          {recipe.heroImage ? (
            <img
              className="min-h-[260px] w-full rounded-[calc(var(--radius-card)-0.35rem)] bg-panel-10 object-cover"
              src={recipe.heroImage}
              alt={recipe.title}
            />
          ) : (
            <div className="grid min-h-[260px] w-full place-items-center rounded-[calc(var(--radius-card)-0.35rem)] bg-panel-5 text-sm font-medium text-text-35">
              No image
            </div>
          )}
          <p className="text-sm leading-6 text-text-45">{recipe.summary}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-text-35">Your rating:</span>
            <StarRating
              rating={recipe.rating}
              label={`Rate ${recipe.title}`}
              onRate={(value) => {
                setDeleteConfirming(false);
                void updateRecipeRating(recipe.id, value);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedTagIds.map((tagId) => (
              <span key={tagId} className="chip chip-static">
                {tagLookup.get(tagId)?.name ?? tagId}
              </span>
            ))}
          </div>
          {linkedRecipes.length > 0 ? (
            <div className="flex flex-col gap-2" data-testid="linked-recipes">
              <span className="text-sm font-medium text-text-35">Linked recipes:</span>
              <div className="flex flex-wrap gap-2">
                {linkedRecipes.map((linked) => (
                  <button
                    key={linked.id}
                    type="button"
                    className="chip chip-static hover:border-primary-40"
                    onClick={() => openRecipeDetail(linked.id)}
                  >
                    {linked.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
            <h3 className="text-xl font-semibold text-text-60">All ingredients</h3>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-text-45">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.raw}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section
        className="flex flex-col gap-4"
        aria-label="Recipe steps"
        data-testid="recipe-steps"
      >
        <h3 className="text-xl font-semibold text-text-60">Steps</h3>
        {recipe.instructions.length === 0 ? (
          <p className="text-sm text-text-35">No instructions for this recipe yet.</p>
        ) : (
          recipe.instructions.map((step, index) => {
            const stepNumber = index + 1;
            const stepIngredients = step.ingredientUsages
              .map((usage) => ingredientLookup.get(usage.ingredientId))
              .filter((ing): ing is NonNullable<typeof ing> => Boolean(ing));
            return (
              <article
                key={step.id}
                className="overflow-hidden rounded-[var(--radius-card)] border-2 border-panel-15 bg-panel-0 shadow-[var(--shadow-panel)]"
                data-testid={`recipe-step-${stepNumber}`}
              >
                <header className="flex items-center justify-between gap-3 border-b border-panel-15 bg-panel-5 px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-60">
                    Step {stepNumber}
                  </span>
                  <span className="text-xs font-medium text-text-35">
                    {stepIngredients.length > 0
                      ? `${stepIngredients.length} ingredient${stepIngredients.length === 1 ? "" : "s"}`
                      : "No specific ingredients"}
                  </span>
                </header>
                <div className="flex flex-col gap-3 p-4">
                  <section
                    className="rounded-[calc(var(--radius-card)-0.5rem)] border border-dashed border-panel-15 bg-panel-5 p-3"
                    aria-label={`Step ${stepNumber} ingredients`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-35">
                      Step {stepNumber} Ingredients
                    </p>
                    {stepIngredients.length === 0 ? (
                      <p className="mt-2 text-sm italic text-text-35">
                        No specific ingredients for this step.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1 pl-5 text-sm leading-6 text-text-50">
                        {stepIngredients.map((ingredient) => (
                          <li key={ingredient.id}>{ingredient.raw}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section aria-label={`Step ${stepNumber} instruction`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-35">
                      Step {stepNumber}
                    </p>
                    <p className="mt-2 text-base leading-7 text-text-50">{step.text}</p>
                  </section>
                </div>
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}

export default RecipeDetailWorkspace;
