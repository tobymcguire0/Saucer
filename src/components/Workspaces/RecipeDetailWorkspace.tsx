import { useState } from "react";
import { useRecipeDetailViewModel } from "../../features/browse/useRecipeDetailViewModel";
import { cuisineEmoji, cuisineGradientClass } from "../../lib/cuisineGradients";
import { cn } from "../../lib/cn";
import { parseIngredientRow } from "../../lib/ingredientRows";
import StarRating from "../StarRating";

function parseMinutes(value: string | undefined): number {
  if (!value) return 0;
  const m = value.match(/(\d+)\s*(h|hr|hour|hours)?\s*(\d+)?\s*(m|min|mins|minute|minutes)?/i);
  if (!m) return 0;
  const hours = m[2] ? Number(m[1]) : 0;
  const mins = m[2] ? Number(m[3] ?? 0) : Number(m[1]);
  return hours * 60 + (Number.isFinite(mins) ? mins : 0);
}
function deriveDifficulty(prep?: string, cook?: string): string {
  const total = parseMinutes(prep) + parseMinutes(cook);
  if (total === 0) return "Intermediate";
  if (total <= 30) return "Easy";
  if (total <= 90) return "Intermediate";
  return "Advanced";
}

function parseQty(qty: string): number {
  const s = qty
    .replace(/¼/g, "1/4").replace(/½/g, "1/2").replace(/¾/g, "3/4")
    .replace(/⅓/g, "1/3").replace(/⅔/g, "2/3")
    .replace(/⅛/g, "1/8").replace(/⅜/g, "3/8").replace(/⅝/g, "5/8").replace(/⅞/g, "7/8")
    .trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number.parseFloat(s) || 0;
}

const NAMED_FRACS: [number, string][] = [
  [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"],
  [1 / 2, "½"], [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"],
];

function formatQty(value: number): string {
  if (value <= 0) return "";
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac > 0.04) {
    const closest = NAMED_FRACS.reduce((b, f) => Math.abs(f[0] - frac) < Math.abs(b[0] - frac) ? f : b);
    if (Math.abs(frac - closest[0]) < 0.06)
      return whole > 0 ? `${whole} ${closest[1]}` : closest[1];
    return value.toFixed(1).replace(/\.0$/, "");
  }
  return String(whole);
}

function RecipeDetailWorkspace() {
  const {
    recipe,
    returnToMainView,
    updateRecipeRating,
    openEditEditor,
    tagLookup,
    linkedRecipes,
    openRecipeDetail,
  } = useRecipeDetailViewModel();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());
  const baseServings = (() => {
    const n = Number((recipe?.servings ?? "").match(/\d+/)?.[0]);
    return Number.isFinite(n) && n > 0 ? n : 4;
  })();
  const [servings, setServings] = useState<number>(baseServings);

  if (!recipe) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🍽️</div>
        <div className="empty-title">No recipe selected</div>
        <button type="button" className="btn btn-primary" onClick={returnToMainView}>Back to recipes</button>
      </div>
    );
  }

  const heroClass = cuisineGradientClass(recipe.cuisine);
  const emoji = cuisineEmoji(recipe.cuisine, recipe.mealType);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleStep = (id: string) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="detail-layout">
      <div className="detail-topbar">
        <div className="detail-topbar-left">
          <button type="button" className="btn btn-ghost btn-sm" onClick={returnToMainView}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>
        <div className="detail-topbar-right">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditEditor(recipe)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Share"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title: recipe.title, url: recipe.sourceRef ?? location.href });
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" aria-label="More">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </div>

      <div className={cn("recipe-hero", heroClass)}>
        {recipe.heroImage ? (
          <img src={recipe.heroImage} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="recipe-hero-emoji">{emoji}</span>
        )}
        <div className="recipe-hero-gradient" />
      </div>

      <div className="recipe-header">
        <div className="recipe-eyebrow">
          <span>{recipe.cuisine || "Recipe"}</span>
          {recipe.mealType ? <><span>·</span><span>{recipe.mealType}</span></> : null}
        </div>
        <h1 className="recipe-title">{recipe.title}</h1>
        {recipe.summary ? <p className="text-muted text-base">{recipe.summary}</p> : null}
      </div>

      <div className="recipe-meta-row">
        <div className="recipe-meta-item">
          <span className="recipe-meta-label">Prep</span>
          <span className="recipe-meta-value">{recipe.prepTime || "—"}</span>
        </div>
        <div className="recipe-meta-divider" />
        <div className="recipe-meta-item">
          <span className="recipe-meta-label">Cook</span>
          <span className="recipe-meta-value">{recipe.cookTime || "—"}</span>
        </div>
        <div className="recipe-meta-divider" />
        <div className="recipe-meta-item">
          <span className="recipe-meta-label">Servings</span>
          <span className="recipe-meta-value">{recipe.servings || "—"}</span>
        </div>
        <div className="recipe-meta-divider" />
        <div className="recipe-meta-item">
          <span className="recipe-meta-label">Rating</span>
          <StarRating
            rating={recipe.rating}
            label={`Rate ${recipe.title}`}
            large
            showValue
            onRate={(value) => void updateRecipeRating(recipe.id, value)}
          />
        </div>
        <div className="recipe-meta-divider" />
        <div className="recipe-meta-item">
          <span className="recipe-meta-label">Difficulty</span>
          <span className="recipe-meta-value">{deriveDifficulty(recipe.prepTime, recipe.cookTime)}</span>
        </div>
      </div>

      {recipe.tagIds.length > 0 ? (
        <div className="recipe-tags-row">
          {recipe.tagIds.map((tagId) => (
            <span key={tagId} className="tag tag-accent">{tagLookup.get(tagId)?.name ?? tagId}</span>
          ))}
        </div>
      ) : null}

      <div className="recipe-body">
        <aside className="ingredients-panel">
          <div className="panel-title">
            <span>Ingredients</span>
          </div>
          <div className="panel-title">
            <span>Servings</span>
            <div className="servings-control">
              <button type="button" className="servings-btn" onClick={() => setServings((s) => Math.max(1, s - 1))}>−</button>
              <span className="servings-val">{servings}</span>
              <button type="button" className="servings-btn" onClick={() => setServings((s) => s + 1)}>+</button>
            </div>
          </div>
          <div className="ingredient-list">
            {recipe.ingredients.length === 0 ? (
              <p className="text-muted text-sm">No ingredients recorded.</p>
            ) : (
              recipe.ingredients.map((ing) => {
                const parsed = parseIngredientRow(ing.raw || ing.name);
                const scale = servings / baseServings;
                const scaledQty = parsed.qty ? formatQty(parseQty(parsed.qty) * scale) : "";
                const amount = [scaledQty, parsed.unit].filter(Boolean).join(" ");
                const name = parsed.name || ing.raw || ing.name;
                return (
                  <button
                    key={ing.id}
                    type="button"
                    className={cn("ingredient-item", checkedIngredients.has(ing.id) && "checked")}
                    onClick={() => toggleIngredient(ing.id)}
                  >
                    <span className="ingredient-check" />
                    <span className="ingredient-name">{name}</span>
                    {amount ? <span className="ingredient-amount">{amount}</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="steps-panel">
          <div className="panel-title"><span>Instructions</span></div>
          <ol className="steps-list">
            {recipe.instructions.map((step, idx) => (
              <li key={step.id} className={cn("step-item", doneSteps.has(step.id) && "done")}>
                <div className="step-number">{idx + 1}</div>
                <div>
                  <p className="step-text">{step.text}</p>
                  <button type="button" className="step-done-btn" onClick={() => toggleStep(step.id)}>
                    {doneSteps.has(step.id) ? "✓ Done" : "Mark done"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {linkedRecipes.length > 0 ? (
        <section className="related-section">
          <h3>You might also like</h3>
          <div className="related-grid">
            {linkedRecipes.map((linked) => (
              <button
                key={linked.id}
                type="button"
                className="related-card"
                onClick={() => openRecipeDetail(linked.id)}
              >
                <div className={cn("related-card-img", cuisineGradientClass(linked.cuisine))}>
                  {linked.heroImage ? (
                    <img src={linked.heroImage} alt={linked.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{cuisineEmoji(linked.cuisine, linked.mealType)}</span>
                  )}
                </div>
                <div className="related-card-body">
                  <div className="related-card-title">{linked.title}</div>
                  <div className="related-card-meta">{linked.cuisine || "Recipe"}{linked.servings ? ` · ${linked.servings}` : ""}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {recipe.sourceRef ? (
        <div className="source-bar">
          <span>Source:</span>
          <a href={recipe.sourceRef} target="_blank" rel="noreferrer">{recipe.sourceRef}</a>
          <span>· Saved {new Date(recipe.createdAt).toLocaleDateString()}</span>
        </div>
      ) : null}
    </div>
  );
}

export default RecipeDetailWorkspace;
