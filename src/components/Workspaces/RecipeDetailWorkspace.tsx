import { useEffect, useState } from "react";
import type { Recipe, Taxonomy } from "../../lib/models";
import { sortTagIdsForPreview } from "../recipeTagPreview";
import StarRating from "../StarRating";

type RecipeDetailWorkspaceProps = {
  recipe?: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

function RecipeDetailWorkspace({
  recipe,
  tagLookup,
  categoryLookup,
  onBack,
  onEdit,
  onDelete,
  onRate,
}: RecipeDetailWorkspaceProps) {
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const sortedTagIds = recipe
    ? sortTagIdsForPreview(recipe.tagIds, tagLookup, categoryLookup)
    : [];

  useEffect(() => {
    setDeleteConfirming(false);
  }, [recipe?.id]);

  if (!recipe) {
    return (
      <section className="recipe-detail-view">
        <div className="recipe-detail-header">
          <div>
            <p className="eyebrow">Recipe detail</p>
            <h2>No recipe selected</h2>
          </div>
          <button type="button" className="secondary" onClick={onBack}>
            Back to browse
          </button>
        </div>
      </section>
    );
  }

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

export default RecipeDetailWorkspace;
