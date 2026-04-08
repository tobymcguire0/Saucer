import { useAppShellContext } from "../../context/app-shell-context";
import { useRecipeCatalogContext } from "../../context/recipe-catalog-context";
import { useRecipeEditorContext } from "../../context/recipe-editor-context";
import { useSearchContext } from "../../context/search-context";
import { useTaxonomyContext } from "../../context/taxonomy-context";
import RecipeCard from "../RecipeCard";

function BrowseWorkspace() {
  const { openRecipeDetail } = useAppShellContext();
  const { visibleRecipes, groupedRecipes, deleteRecipe, updateRecipeRating } = useRecipeCatalogContext();
  const { openEditEditor } = useRecipeEditorContext();
  const { groupByCategoryId } = useSearchContext();
  const { tagLookup, categoryLookup } = useTaxonomyContext();

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
