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
    <div className="sidebar-section">
      <div className="section-heading">
        <h2>Random dish</h2>
      </div>
      <p className="muted">Uses your active tag filters plus optional ingredient keywords.</p>
      <label className="field">
        <span>Required ingredients</span>
        <input
          value={randomIngredientInput}
          onChange={(event) => updateRandomIngredientSearch(event.currentTarget.value)}
          placeholder="egg, rice, tomato"
        />
      </label>
      <button type="button" onClick={chooseRandomRecipe}>
        Pick random recipe
      </button>
    </div>
  );
}

export default RandomDishPanel;
