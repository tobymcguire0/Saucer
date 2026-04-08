import type { Tag } from "../../lib/models";

type TaxonomyTagCardProps = {
  tag: Tag;
};

function TaxonomyTagCard({ tag }: TaxonomyTagCardProps) {
  const aliasPreview = tag.aliases.slice(0, 6);

  return (
    <article className="taxonomy-tag-card">
      <div className="section-heading">
        <strong>{tag.name}</strong>
        <span>{tag.aliases.length} aliases</span>
      </div>
      {aliasPreview.length > 0 ? (
        <div className="taxonomy-alias-list">
          {aliasPreview.map((alias) => (
            <span key={alias} className="taxonomy-alias-chip">
              {alias}
            </span>
          ))}
          {tag.aliases.length > aliasPreview.length ? (
            <span className="taxonomy-alias-chip">+{tag.aliases.length - aliasPreview.length} more</span>
          ) : null}
        </div>
      ) : (
        <p className="muted">No aliases yet</p>
      )}
    </article>
  );
}

export default TaxonomyTagCard;
