import { useMemo, useRef } from "react";

import { cn } from "../../../lib/cn";
import type { RecipeDraft } from "../../../lib/models";
import { detectIngredientUsages } from "../../../lib/recipeSteps";

type RecipeDraftFieldsProps = {
  draft: RecipeDraft;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
};

function parseLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function RecipeDraftFields({ draft, updateDraft }: RecipeDraftFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ingredientLines = useMemo(() => parseLines(draft.ingredientsText), [draft.ingredientsText]);
  const instructionLines = useMemo(
    () => parseLines(draft.instructionsText).map((line) => line.replace(/^\d+[.)]\s*/, "")),
    [draft.instructionsText],
  );
  const stepIngredientMap = draft.stepIngredientMap ?? {};

  const toggleStepIngredient = (stepIndex: number, ingredientIndex: number) => {
    const current = stepIngredientMap[stepIndex] ?? [];
    const next = current.includes(ingredientIndex)
      ? current.filter((idx) => idx !== ingredientIndex)
      : [...current, ingredientIndex];
    const nextMap = { ...stepIngredientMap };
    if (next.length === 0) {
      delete nextMap[stepIndex];
    } else {
      nextMap[stepIndex] = next;
    }
    updateDraft({ stepIngredientMap: nextMap });
  };

  const autoFillMapping = () => {
    const stubIngredients = ingredientLines.map((raw, index) => ({
      id: `stub-${index}`,
      name: raw.replace(/^[-*]\s*/, ""),
      raw,
    }));
    const ingredientIdToIndex = new Map(stubIngredients.map((ing, idx) => [ing.id, idx]));
    const next: Record<number, number[]> = {};
    instructionLines.forEach((text, stepIndex) => {
      const usages = detectIngredientUsages(text, stubIngredients);
      const indices = usages
        .map((u) => ingredientIdToIndex.get(u.ingredientId))
        .filter((idx): idx is number => idx !== undefined);
      if (indices.length > 0) {
        next[stepIndex] = indices;
      }
    });
    updateDraft({ stepIngredientMap: next });
  };

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
    {ingredientLines.length > 0 && instructionLines.length > 0 ? (
      <section
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-panel-15 bg-panel-0 p-4"
        data-testid="step-ingredient-mapper"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-60">Map ingredients to steps</h3>
            <p className="text-xs text-text-35">
              Pick the ingredients used in each step so cooks see exactly what they need at a glance.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={autoFillMapping}>
            Auto-fill from text
          </button>
        </div>
        <ol className="flex flex-col gap-3">
          {instructionLines.map((stepText, stepIndex) => {
            const selected = new Set(stepIngredientMap[stepIndex] ?? []);
            return (
              <li
                key={`step-${stepIndex}`}
                className="rounded-[calc(var(--radius-card)-0.5rem)] border border-panel-10 bg-panel-5 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-60">
                  Step {stepIndex + 1}
                </p>
                <p className="mt-1 text-sm text-text-50">{stepText}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ingredientLines.map((ingredientRaw, ingredientIndex) => {
                    const active = selected.has(ingredientIndex);
                    return (
                      <button
                        key={`step-${stepIndex}-ing-${ingredientIndex}`}
                        type="button"
                        aria-pressed={active}
                        className={cn(
                          "chip",
                          active ? "chip-active" : "chip-static hover:border-primary-40",
                        )}
                        onClick={() => toggleStepIngredient(stepIndex, ingredientIndex)}
                      >
                        {ingredientRaw.replace(/^[-*]\s*/, "")}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    ) : null}
    </>
  );
}

export default RecipeDraftFields;
