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
  const formCardClass =
    "rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]";

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <section className={formCardClass}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-text-60">Create category</h3>
        </div>
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Category name</span>
          <input
            className="field-input"
            value={categoryForm.name}
            onChange={(event) => updateCategoryForm({ name: event.currentTarget.value })}
          />
        </label>
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Description</span>
          <textarea
            className="field-textarea"
            value={categoryForm.description}
            onChange={(event) => updateCategoryForm({ description: event.currentTarget.value })}
            rows={3}
          />
        </label>
        <button type="button" className="btn-primary mt-4" onClick={() => void saveCategory()}>
          Save category
        </button>
      </section>

      <section className={formCardClass}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-text-60">Create canonical tag</h3>
        </div>
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Category</span>
          <select
            className="field-select"
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
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Tag name</span>
          <input
            className="field-input"
            value={tagForm.name}
            onChange={(event) => updateTagForm({ name: event.currentTarget.value })}
          />
        </label>
        <button type="button" className="btn-primary mt-4" onClick={() => void saveTag()}>
          Save tag
        </button>
      </section>

      <section className={formCardClass}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-text-60">Add alias</h3>
        </div>
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Canonical tag</span>
          <select
            className="field-select"
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
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Alias</span>
          <input
            className="field-input"
            value={aliasForm.alias}
            onChange={(event) => updateAliasForm({ alias: event.currentTarget.value })}
          />
        </label>
        <button type="button" className="btn-primary mt-4" onClick={() => void saveAlias()}>
          Save alias
        </button>
      </section>

      <section className={formCardClass}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-text-60">Merge tags</h3>
        </div>
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Source tag</span>
          <select
            className="field-select"
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
        <label className="field mt-4">
          <span className="text-sm font-medium text-text-50">Target tag</span>
          <select
            className="field-select"
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
        <button type="button" className="btn-primary mt-4" onClick={() => void mergeSelectedTags()}>
          Merge tags
        </button>
      </section>

      <section className={`${formCardClass} [grid-column:1/-1]`}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-text-60">Current taxonomy</h3>
        </div>
        <div className="mt-4">
          {taxonomyGroups.map(({ category, tags }) => (
            <CollapsibleTaxonomyCategory
              key={category.id}
              category={category}
              tags={tags}
              collapsed={collapsedCategoryIds[category.id] ?? true}
              onToggle={() => toggleCategoryCollapsed(category.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default TaxonomyWorkspace;
