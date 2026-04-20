import type { Tag } from "../../lib/models";

type TaxonomyTagCardProps = {
  tag: Tag;
};

function TaxonomyTagCard({ tag }: TaxonomyTagCardProps) {
  const aliasPreview = tag.aliases.slice(0, 6);

  return (
    <article className="rounded-[var(--radius-control)] border border-panel-10 bg-background-0 p-4">
      <div className="flex items-center justify-between gap-4">
        <strong className="text-text-60">{tag.name}</strong>
        <span className="text-sm font-medium text-text-35">{tag.aliases.length} aliases</span>
      </div>
      {aliasPreview.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {aliasPreview.map((alias) => (
            <span
              key={alias}
              className="rounded-full border border-primary-10 bg-primary-0 px-3 py-1 text-sm font-medium text-primary-75"
            >
              {alias}
            </span>
          ))}
          {tag.aliases.length > aliasPreview.length ? (
            <span className="rounded-full border border-primary-10 bg-primary-0 px-3 py-1 text-sm font-medium text-primary-75">
              +{tag.aliases.length - aliasPreview.length} more
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-35">No aliases yet</p>
      )}
    </article>
  );
}

export default TaxonomyTagCard;
