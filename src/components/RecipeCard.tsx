import { useState } from "react";
import { cn } from "../lib/cn";
import type { Recipe, Taxonomy } from "../lib/models";
import { sortTagIdsForPreview } from "./recipeTagPreview";
import StarRating from "./StarRating";

const previewTagLimit = 6;

type RecipeCardProps = {
  recipe: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<boolean>;
  onOpenDetail: (recipeId: string) => void;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

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
  const [shaking, setShaking] = useState(false);
  const sortedTagIds = sortTagIdsForPreview(recipe.tagIds, tagLookup, categoryLookup);
  const hasOverflow = sortedTagIds.length > previewTagLimit;
  const previewTagIds = hasOverflow
    ? sortedTagIds.slice(0, previewTagLimit - 1)
    : sortedTagIds.slice(0, previewTagLimit);
  const remainingTagCount = Math.max(sortedTagIds.length - previewTagIds.length, 0);

  return (
    <article
      className={cn(
        "group flex min-h-full cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] border bg-panel-5 shadow-[var(--shadow-panel)] transition duration-150",
        "border-panel-15 hover:-translate-y-0.5 hover:border-accent-60 hover:shadow-[var(--shadow-floating)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-10",
        deleteConfirming && "border-accent-30",
      )}
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
        <img className="h-48 w-full bg-panel-10 object-cover" src={recipe.heroImage} alt={recipe.title} />
      ) : (
        <div className="grid h-48 w-full place-items-center bg-panel-5 text-sm font-medium text-text-35">
          No image
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-text-60">{recipe.title}</h3>
            <p className="mt-1 text-sm text-text-35">
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
        <p className="line-clamp-3 text-sm leading-6 text-text-45">{recipe.summary}</p>
        <div
          className={cn(
            "relative mt-auto min-h-0",
            remainingTagCount > 0 &&
              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-4 after:bg-gradient-to-b after:from-transparent after:to-background-0",
          )}
        >
          <div className="flex max-h-[4.75rem] flex-wrap content-start gap-2 overflow-hidden pr-1">
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
        <div className="relative z-10 flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            className="btn-primary"
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
            className={cn(
              deleteConfirming
                ? "btn-primary border-accent-55 bg-accent-50 hover:border-accent-60 hover:bg-accent-55 active:bg-accent-60"
                : "btn-secondary",
              shaking && "animate-shake",
            )}
            onClick={async (event) => {
              event.stopPropagation();
              if (deleteConfirming) {
                const deleted = await onDelete(recipe.id);
                if (!deleted) {
                  setShaking(true);
                  setTimeout(() => setShaking(false), 500);
                }
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

export default RecipeCard;
