import type { RecipeDraft } from "../../../lib/models";

type ParsedRecipesHeaderProps = {
  drafts: RecipeDraft[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

function ParsedRecipesHeader({ drafts, currentIndex, onSelect }: ParsedRecipesHeaderProps) {
  if (drafts.length <= 1) return null;

  return (
    <section
      className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-3"
      data-testid="parsed-recipes-header"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-60">
        Parsed Recipes
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {drafts.map((draft, index) => {
          const isCurrent = index === currentIndex;
          const label = draft.title.trim() || `Recipe ${index + 1}`;
          return (
            <button
              key={index}
              type="button"
              className={
                isCurrent
                  ? "font-semibold italic text-text-60"
                  : "text-text-35 hover:text-text-60"
              }
              onClick={() => onSelect(index)}
              aria-current={isCurrent ? "page" : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ParsedRecipesHeader;
