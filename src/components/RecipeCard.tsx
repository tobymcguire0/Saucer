import { cn } from "../lib/cn";
import type { Recipe, Taxonomy } from "../lib/models";
import { cuisineEmoji, cuisineGradientClass } from "../lib/cuisineGradients";
import { usePreferencesStore } from "../features/preferences/usePreferencesStore";
import StarRating from "./StarRating";

type RecipeCardProps = {
  recipe: Recipe;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup?: Map<string, Taxonomy["categories"][number]>;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<boolean>;
  onOpenDetail: (recipeId: string) => void;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

function RecipeCard({ recipe, tagLookup, onEdit, onDelete, onOpenDetail, onRate }: RecipeCardProps) {
  const showCookTime = usePreferencesStore((s) => s.showCookTimeOnCards);
  const gradient = cuisineGradientClass(recipe.cuisine);
  const emoji = cuisineEmoji(recipe.cuisine, recipe.mealType);
  const tags = recipe.tagIds.slice(0, 2);

  return (
    <article
      className="recipe-card"
      onClick={() => onOpenDetail(recipe.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(recipe.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={cn("recipe-card-image", gradient)}>
        {recipe.heroImage ? (
          <img src={recipe.heroImage} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="card-emoji">{emoji}</span>
        )}
        <div className="recipe-card-overlay">
          <button
            type="button"
            className="recipe-card-menu-btn"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          </button>
          <button
            type="button"
            className="recipe-card-menu-btn"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); void onDelete(recipe.id); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-meta">
          <span className="recipe-card-cuisine">{recipe.cuisine || "Recipe"}</span>
          {showCookTime && recipe.servings ? (
            <>
              <span className="recipe-card-dot">·</span>
              <span className="recipe-card-cuisine">{recipe.servings}</span>
            </>
          ) : null}
        </div>
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <div className="recipe-card-footer">
          <div className="recipe-card-tags">
            {tags.map((tagId) => (
              <span key={tagId} className="tag tag-accent">{tagLookup.get(tagId)?.name ?? tagId}</span>
            ))}
          </div>
          <StarRating
            rating={recipe.rating}
            label={`Rate ${recipe.title}`}
            compact
            stopPropagation
            onRate={(value) => void onRate(recipe.id, value)}
          />
        </div>
      </div>
    </article>
  );
}

export default RecipeCard;
