import RecipeCard from "../RecipeCard";
import { useBrowseWorkspaceViewModel } from "../../features/browse/useBrowseWorkspaceViewModel";

function BrowseWorkspace() {
  const {
    groupByCategoryId,
    visibleRecipes,
    groupedRecipes,
    deleteRecipe,
    updateRecipeRating,
    openEditEditor,
    openRecipeDetail,
    tagLookup,
    categoryLookup,
  } = useBrowseWorkspaceViewModel();

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
          onEdit={openEditEditor}
          onDelete={deleteRecipe}
          onOpenDetail={openRecipeDetail}
          onRate={updateRecipeRating}
        />
      ))}
    </div>
  );
}

export default BrowseWorkspace;
