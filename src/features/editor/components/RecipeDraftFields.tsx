import { useRef } from "react";

import type { RecipeDraft } from "../../../lib/models";

type RecipeDraftFieldsProps = {
  draft: RecipeDraft;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
};

function RecipeDraftFields({ draft, updateDraft }: RecipeDraftFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateDraft({ heroImage: String(reader.result ?? "") });
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      <div
        className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-[calc(var(--radius-card)-0.5rem)] bg-panel-5"
        onClick={() => fileInputRef.current?.click()}
      >
        {draft.heroImage ? (
          <img className="h-full w-full object-cover" src={draft.heroImage} alt="" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-medium text-text-35">
            No image
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-text-100/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="text-sm font-semibold text-white">Click to change image</span>
        </div>
      </div>
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
    </>
  );
}

export default RecipeDraftFields;
