import type { RecipeDraft } from "../../../lib/models";

type RecipeDraftFieldsProps = {
  draft: RecipeDraft;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
};

function RecipeDraftFields({ draft, updateDraft }: RecipeDraftFieldsProps) {
  return (
    <div className="editor-grid">
      <label className="field">
        <span>Title</span>
        <input value={draft.title} onChange={(event) => updateDraft({ title: event.currentTarget.value })} />
      </label>
      <label className="field">
        <span>Source reference</span>
        <input
          value={draft.sourceRef}
          onChange={(event) => updateDraft({ sourceRef: event.currentTarget.value })}
        />
      </label>
      <label className="field field-wide">
        <span>Summary</span>
        <textarea
          value={draft.summary}
          onChange={(event) => updateDraft({ summary: event.currentTarget.value })}
          rows={3}
        />
      </label>
      <label className="field">
        <span>Servings</span>
        <input
          value={draft.servings}
          onChange={(event) => updateDraft({ servings: event.currentTarget.value })}
        />
      </label>
      <label className="field">
        <span>Cuisine</span>
        <input value={draft.cuisine} onChange={(event) => updateDraft({ cuisine: event.currentTarget.value })} />
      </label>
      <label className="field">
        <span>Meal type</span>
        <input
          value={draft.mealType}
          onChange={(event) => updateDraft({ mealType: event.currentTarget.value })}
        />
      </label>
      <label className="field field-wide">
        <span>Ingredients</span>
        <textarea
          value={draft.ingredientsText}
          onChange={(event) => updateDraft({ ingredientsText: event.currentTarget.value })}
          rows={8}
        />
      </label>
      <label className="field field-wide">
        <span>Instructions</span>
        <textarea
          value={draft.instructionsText}
          onChange={(event) => updateDraft({ instructionsText: event.currentTarget.value })}
          rows={8}
        />
      </label>
    </div>
  );
}

export default RecipeDraftFields;
