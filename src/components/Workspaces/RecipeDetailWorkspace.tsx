import { useCallback, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useRecipeDetailViewModel } from "../../features/browse/useRecipeDetailViewModel";
import StarRating from "../StarRating";
import { sortTagIdsForPreview } from "../recipeTagPreview";

function RecipeDetailWorkspace() {
  const { recipe, closeRecipeDetail, deleteRecipe, updateRecipeRating, openEditEditor, tagLookup, categoryLookup } =
    useRecipeDetailViewModel();
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
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
            <h3 className="text-xl font-semibold text-text-60">Ingredients</h3>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-text-45">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.raw}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
        <h3 className="text-xl font-semibold text-text-60">Instructions</h3>
        <ol className="mt-3 space-y-2 pl-5 text-sm leading-6 text-text-45">
          {recipe.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}

export default RecipeDetailWorkspace;
