import type { Category, Tag } from "../../lib/models";
import TaxonomyTagCard from "./TaxonomyTagCard";

type CollapsibleTaxonomyCategoryProps = {
  category: Category;
  tags: Tag[];
  collapsed: boolean;
  onToggle: () => void;
};

function CollapsibleTaxonomyCategory({
  category,
  tags,
  collapsed,
  onToggle,
}: CollapsibleTaxonomyCategoryProps) {
  return (
    <section className="taxonomy-category-panel">
      <button
        type="button"
        className="taxonomy-category-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span>
          <strong>{category.name}</strong>
          <span className="muted taxonomy-category-meta">
            {category.description} · {tags.length} tags
          </span>
        </span>
        <span>{collapsed ? "Expand" : "Collapse"}</span>
      </button>

      {collapsed ? null : (
        <div className="taxonomy-card-grid">
          {tags.map((tag) => (
            <TaxonomyTagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </section>
  );
}

export default CollapsibleTaxonomyCategory;
