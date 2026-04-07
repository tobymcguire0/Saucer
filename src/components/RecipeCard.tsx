import { useState } from "react";
import type { Recipe, Taxonomy } from "../lib/models";
import { sortTagIdsForPreview } from "./recipeTagPreview";
import StarRating from "./StarRating";

const previewTagLimit = 6;

type RecipeCardProps = {
  recipe: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
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

export default RecipeCard;
