import CollapsibleTaxonomyCategory from "../taxonomy/CollapsibleTaxonomyCategory";
import { useTaxonomyWorkspaceViewModel } from "../../features/taxonomy/useTaxonomyWorkspaceViewModel";

function TaxonomyWorkspace() {
  const {
    taxonomyGroups,
    collapsedCategoryIds,
    toggleCategoryCollapsed,
    categoryForm,
    tagForm,
    aliasForm,
    mergeForm,
    updateCategoryForm,
    updateTagForm,
    updateAliasForm,
    updateMergeForm,
    saveCategory,
    saveTag,
    saveAlias,
    mergeSelectedTags,
  } = useTaxonomyWorkspaceViewModel();

  return (
    <div className="taxonomy-layout">
      <section className="panel">
        <div className="section-heading">
          <h3>Create category</h3>
        </div>
        <label className="field">
          <span>Category name</span>
          <input
            value={categoryForm.name}
            onChange={(event) => updateCategoryForm({ name: event.currentTarget.value })}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            value={categoryForm.description}
            onChange={(event) => updateCategoryForm({ description: event.currentTarget.value })}
            rows={3}
          />
        </label>
        <button type="button" onClick={() => void saveCategory()}>
          Save category
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Create canonical tag</h3>
        </div>
        <label className="field">
          <span>Category</span>
          <select
            value={tagForm.categoryId}
            onChange={(event) => updateTagForm({ categoryId: event.currentTarget.value })}
          >
            <option value="">Choose a category</option>
            {taxonomyGroups.map(({ category }) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tag name</span>
          <input
            value={tagForm.name}
            onChange={(event) => updateTagForm({ name: event.currentTarget.value })}
          />
        </label>
        <button type="button" onClick={() => void saveTag()}>
          Save tag
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Add alias</h3>
        </div>
        <label className="field">
          <span>Canonical tag</span>
          <select
            value={aliasForm.tagId}
            onChange={(event) => updateAliasForm({ tagId: event.currentTarget.value })}
          >
            <option value="">Choose a tag</option>
            {taxonomyGroups.flatMap(({ tags }) =>
              tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              )),
            )}
          </select>
        </label>
        <label className="field">
          <span>Alias</span>
          <input
            value={aliasForm.alias}
            onChange={(event) => updateAliasForm({ alias: event.currentTarget.value })}
          />
        </label>
        <button type="button" onClick={() => void saveAlias()}>
          Save alias
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Merge tags</h3>
        </div>
        <label className="field">
          <span>Source tag</span>
          <select
            value={mergeForm.sourceTagId}
            onChange={(event) => updateMergeForm({ sourceTagId: event.currentTarget.value })}
          >
            <option value="">Choose a source tag</option>
            {taxonomyGroups.flatMap(({ tags }) =>
              tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              )),
            )}
          </select>
        </label>
        <label className="field">
          <span>Target tag</span>
          <select
            value={mergeForm.targetTagId}
            onChange={(event) => updateMergeForm({ targetTagId: event.currentTarget.value })}
          >
            <option value="">Choose a target tag</option>
            {taxonomyGroups.flatMap(({ tags }) =>
              tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              )),
            )}
          </select>
        </label>
        <button type="button" onClick={() => void mergeSelectedTags()}>
          Merge tags
        </button>
      </section>

      <section className="panel taxonomy-browser">
        <div className="section-heading">
          <h3>Current taxonomy</h3>
        </div>
        {taxonomyGroups.map(({ category, tags }) => (
          <CollapsibleTaxonomyCategory
            key={category.id}
            category={category}
            tags={tags}
            collapsed={collapsedCategoryIds[category.id] ?? true}
            onToggle={() => toggleCategoryCollapsed(category.id)}
          />
        ))}
      </section>
    </div>
  );
}

export default TaxonomyWorkspace;
