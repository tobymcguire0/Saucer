import type { Recipe, Taxonomy } from "../../lib/models";
import RecipeCard from "../RecipeCard";

type BrowseWorkspaceProps = {
  visibleRecipes: Recipe[];
  groupedRecipes: Array<{ id: string; label: string; recipes: Recipe[] }>;
  groupByCategoryId: string;
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
  onOpenDetail: (recipeId: string) => void;
  onRate: (recipeId: string, rating: number) => Promise<void>;
};

function BrowseWorkspace({
  visibleRecipes,
  groupedRecipes,
  groupByCategoryId,
  tagLookup,
  categoryLookup,
  onEdit,
  onDelete,
  onOpenDetail,
  onRate,
}: BrowseWorkspaceProps) {
  if (groupByCategoryId) {
    return (
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
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenDetail={onOpenDetail}
                  onRate={onRate}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="recipe-grid">
      {visibleRecipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          tagLookup={tagLookup}
          categoryLookup={categoryLookup}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenDetail={onOpenDetail}
          onRate={onRate}
        />
      ))}
    </div>
  );
}

export default BrowseWorkspace;
