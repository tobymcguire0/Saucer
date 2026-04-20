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
    <section className="mt-4 first:mt-0">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 rounded-[var(--radius-control)] border border-panel-10 bg-panel-0 px-4 py-4 text-left transition hover:border-primary-20 hover:bg-primary-5"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="flex flex-col">
          <strong className="text-text-60">{category.name}</strong>
          <span className="mt-1 text-sm text-text-35">
            {category.description} · {tags.length} tags
          </span>
        </span>
        <span className="text-sm font-medium text-primary-70">{collapsed ? "Expand" : "Collapse"}</span>
      </button>

      {collapsed ? null : (
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {tags.map((tag) => (
            <TaxonomyTagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </section>
  );
}

export default CollapsibleTaxonomyCategory;
