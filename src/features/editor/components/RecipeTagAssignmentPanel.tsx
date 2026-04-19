import type { RecipeDraft, Taxonomy } from "../../../lib/models";
import type { TaxonomyCategoryGroup } from "../../../lib/taxonomyView";
import { searchTagsInCategory } from "../../../lib/taxonomy";
import TaxonomyCategoryPicker from "../../../components/taxonomy/TaxonomyCategoryPicker";

type RecipeTagAssignmentPanelProps = {
  draft: RecipeDraft;
  taxonomy: Taxonomy;
  taxonomyGroups: TaxonomyCategoryGroup[];
  editorCategoryInputs: Record<string, string>;
  setCategoryInput: (scope: "editor", categoryId: string, value: string) => void;
  toggleDraftTag: (tagId: string) => void;
  createDraftTag: (categoryId: string, tagName: string) => Promise<void>;
};

function RecipeTagAssignmentPanel({
  draft,
  taxonomy,
  taxonomyGroups,
  editorCategoryInputs,
  setCategoryInput,
  toggleDraftTag,
  createDraftTag,
}: RecipeTagAssignmentPanelProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h3>Edit assigned tags</h3>
        <span>{draft.selectedTagIds.length} selected</span>
      </div>
      {taxonomyGroups.map(({ category, tags }) => (
        <TaxonomyCategoryPicker
          key={category.id}
          categoryName={category.name}
          inputValue={editorCategoryInputs[category.id] ?? ""}
          selectedTags={tags.filter((tag) => draft.selectedTagIds.includes(tag.id))}
          matches={searchTagsInCategory(taxonomy, category.id, editorCategoryInputs[category.id] ?? "")}
          emptyMessage={`No matching ${category.name.toLowerCase()} tags.`}
          inputLabel={`${category.name} tag search`}
          inputPlaceholder={`Search or add a ${category.name} tag`}
          onInputChange={(value) => setCategoryInput("editor", category.id, value)}
          onToggleTag={toggleDraftTag}
          onCreateTag={() => void createDraftTag(category.id, editorCategoryInputs[category.id] ?? "")}
        />
      ))}
    </section>
  );
}

export default RecipeTagAssignmentPanel;
