import type { TaxonomyCategoryGroup } from "../../lib/taxonomyView";

export type CategoryForm = { name: string; description: string };
export type TagForm = { categoryId: string; name: string };
export type AliasForm = { tagId: string; alias: string };
export type MergeForm = { sourceTagId: string; targetTagId: string };

type TaxonomyWorkspaceProps = {
  taxonomyGroups: TaxonomyCategoryGroup[];
  categoryForm: CategoryForm;
  tagForm: TagForm;
  aliasForm: AliasForm;
  mergeForm: MergeForm;
  onCategoryFormChange: (patch: Partial<CategoryForm>) => void;
  onTagFormChange: (patch: Partial<TagForm>) => void;
  onAliasFormChange: (patch: Partial<AliasForm>) => void;
  onMergeFormChange: (patch: Partial<MergeForm>) => void;
  onSaveCategory: () => Promise<void>;
  onSaveTag: () => Promise<void>;
  onSaveAlias: () => Promise<void>;
  onMergeSelectedTags: () => Promise<void>;
};

function TaxonomyWorkspace({
  taxonomyGroups,
  categoryForm,
  tagForm,
  aliasForm,
  mergeForm,
  onCategoryFormChange,
  onTagFormChange,
  onAliasFormChange,
  onMergeFormChange,
  onSaveCategory,
  onSaveTag,
  onSaveAlias,
  onMergeSelectedTags,
}: TaxonomyWorkspaceProps) {
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
            onChange={(event) => onCategoryFormChange({ name: event.currentTarget.value })}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            value={categoryForm.description}
            onChange={(event) => onCategoryFormChange({ description: event.currentTarget.value })}
            rows={3}
          />
        </label>
        <button type="button" onClick={() => void onSaveCategory()}>
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
            onChange={(event) => onTagFormChange({ categoryId: event.currentTarget.value })}
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
            onChange={(event) => onTagFormChange({ name: event.currentTarget.value })}
          />
        </label>
        <button type="button" onClick={() => void onSaveTag()}>
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
            onChange={(event) => onAliasFormChange({ tagId: event.currentTarget.value })}
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
            onChange={(event) => onAliasFormChange({ alias: event.currentTarget.value })}
          />
        </label>
        <button type="button" onClick={() => void onSaveAlias()}>
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
            onChange={(event) => onMergeFormChange({ sourceTagId: event.currentTarget.value })}
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
            onChange={(event) => onMergeFormChange({ targetTagId: event.currentTarget.value })}
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
        <button type="button" onClick={() => void onMergeSelectedTags()}>
          Merge tags
        </button>
      </section>

      <section className="panel taxonomy-browser">
        <div className="section-heading">
          <h3>Current taxonomy</h3>
        </div>
        {taxonomyGroups.map(({ category, tags }) => (
          <div key={category.id} className="taxonomy-category">
            <h4>{category.name}</h4>
            <p className="muted">{category.description}</p>
            <div className="taxonomy-tag-list">
              {tags.map((tag) => (
                <div key={tag.id} className="taxonomy-tag">
                  <strong>{tag.name} </strong>
                  <span className="muted">
                    {tag.aliases.length > 0 ? `Aliases: ${tag.aliases.join(", ")}` : "No aliases yet"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default TaxonomyWorkspace;
