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
      <div className="flex flex-col gap-5">
        {groupedRecipes.map((section) => (
          <section key={section.id}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-text-60">{section.label}</h3>
              <span className="text-sm font-medium text-text-35">{section.recipes.length} recipes</span>
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
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
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
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
