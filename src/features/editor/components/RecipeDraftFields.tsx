import type { RecipeDraft } from "../../../lib/models";

type RecipeDraftFieldsProps = {
  draft: RecipeDraft;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
};

function RecipeDraftFields({ draft, updateDraft }: RecipeDraftFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="field">
        <span className="text-sm font-medium text-text-50">Title</span>
        <input
          className="field-input"
          value={draft.title}
          onChange={(event) => updateDraft({ title: event.currentTarget.value })}
        />
      </label>
      <label className="field">
        <span className="text-sm font-medium text-text-50">Source reference</span>
        <input
          className="field-input"
          value={draft.sourceRef}
          onChange={(event) => updateDraft({ sourceRef: event.currentTarget.value })}
        />
      </label>
      <label className="field md:col-span-2">
        <span className="text-sm font-medium text-text-50">Summary</span>
        <textarea
          className="field-textarea"
          value={draft.summary}
          onChange={(event) => updateDraft({ summary: event.currentTarget.value })}
          rows={3}
        />
      </label>
      <label className="field">
        <span className="text-sm font-medium text-text-50">Servings</span>
        <input
          className="field-input"
          value={draft.servings}
          onChange={(event) => updateDraft({ servings: event.currentTarget.value })}
        />
      </label>
      <label className="field">
        <span className="text-sm font-medium text-text-50">Cuisine</span>
        <input
          className="field-input"
          value={draft.cuisine}
          onChange={(event) => updateDraft({ cuisine: event.currentTarget.value })}
        />
      </label>
      <label className="field">
        <span className="text-sm font-medium text-text-50">Meal type</span>
        <input
          className="field-input"
          value={draft.mealType}
          onChange={(event) => updateDraft({ mealType: event.currentTarget.value })}
        />
      </label>
      <label className="field md:col-span-2">
        <span className="text-sm font-medium text-text-50">Ingredients</span>
        <textarea
          className="field-textarea"
          value={draft.ingredientsText}
          onChange={(event) => updateDraft({ ingredientsText: event.currentTarget.value })}
          rows={8}
        />
      </label>
      <label className="field md:col-span-2">
        <span className="text-sm font-medium text-text-50">Instructions</span>
        <textarea
          className="field-textarea"
          value={draft.instructionsText}
          onChange={(event) => updateDraft({ instructionsText: event.currentTarget.value })}
          rows={8}
        />
      </label>
    </div>
  );
}

export default RecipeDraftFields;
