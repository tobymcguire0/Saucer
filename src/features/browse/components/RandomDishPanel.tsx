type RandomDishPanelProps = {
  randomIngredientInput: string;
  updateRandomIngredientSearch: (value: string) => void;
  chooseRandomRecipe: () => void;
};

function RandomDishPanel({
  randomIngredientInput,
  updateRandomIngredientSearch,
  chooseRandomRecipe,
}: RandomDishPanelProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-text-60">Random dish</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-text-35">
        Uses your active tag filters plus optional ingredient keywords.
      </p>
      <label className="field mt-4">
        <span className="text-sm font-medium text-text-50">Required ingredients</span>
        <input
          className="field-input"
          value={randomIngredientInput}
          onChange={(event) => updateRandomIngredientSearch(event.currentTarget.value)}
          placeholder="egg, rice, tomato"
        />
      </label>
      <button type="button" className="btn-primary mt-4 self-start" onClick={chooseRandomRecipe}>
        Pick random recipe
      </button>
    </div>
  );
}

export default RandomDishPanel;
