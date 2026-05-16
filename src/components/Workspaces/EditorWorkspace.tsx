import { useMemo, useRef, useState } from "react";

import type { SourceType } from "../../lib/models";
import {
  rowsFromText,
  rowsToText,
  stepsFromText,
  stepsToText,
  type IngredientRow,
} from "../../lib/ingredientRows";
import { useRecipeEditorViewModel } from "../../features/editor/useRecipeEditorViewModel";
import { useSaucerStore } from "../../features/saucer/useSaucerStore";
import { useSyncStore } from "../../features/sync/useSyncStore";
import StarRating from "../StarRating";

type ImportTab = "url" | "photo" | "paste" | "manual";

const TAB_TO_SOURCE: Record<ImportTab, SourceType> = {
  url: "website",
  photo: "file",
  paste: "text",
  manual: "manual",
};

function sourceTypeToTab(sourceType: SourceType): ImportTab {
  if (sourceType === "website") return "url";
  if (sourceType === "file") return "photo";
  if (sourceType === "text") return "paste";
  return "manual";
}

function EditorWorkspace() {
  const vm = useRecipeEditorViewModel();
  const {
    editorMode,
    draft,
    isImporting,
    visibleDraftSuggestions,
    parsedDrafts,
    parsedDraftIndex,
    updateDraft,
    importFromWebsite,
    importFromFile,
    importFromText,
    toggleDraftTag,
    createDraftTag,
    setDraftLinkedRecipes,
    goToParsedDraft,
    exitEditor,
    saveAndExit,
  } = vm;

  const taxonomy = useSaucerStore((s) => s.taxonomy);
  const allRecipes = useSaucerStore((s) => s.recipes);
  const connected = useSyncStore((s) => s.connected);

  const [activeTab, setActiveTab] = useState<ImportTab>(() => sourceTypeToTab(draft.sourceType));
  const [pasteText, setPasteText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [relatedQuery, setRelatedQuery] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const ingredientRows = useMemo(() => rowsFromText(draft.ingredientsText), [draft.ingredientsText]);
  const stepRows = useMemo(() => stepsFromText(draft.instructionsText), [draft.instructionsText]);

  const tagLookup = useMemo(() => new Map(taxonomy.tags.map((t) => [t.id, t])), [taxonomy.tags]);
  const cuisineTags = useMemo(
    () => taxonomy.tags.filter((t) => t.categoryId === "category-cuisine"),
    [taxonomy.tags],
  );
  const mealTags = useMemo(
    () => taxonomy.tags.filter((t) => t.categoryId === "category-meal-time"),
    [taxonomy.tags],
  );

  const defaultTagCategoryId = useMemo(() => {
    const preferred =
      taxonomy.categories.find((c) => c.id === "category-flavor") ??
      taxonomy.categories.find((c) => c.name.toLowerCase() === "tags") ??
      taxonomy.categories[taxonomy.categories.length - 1] ??
      taxonomy.categories[0];
    return preferred?.id ?? "";
  }, [taxonomy.categories]);

  const isMultiDraft = parsedDrafts.length > 1 && editorMode === "create";
  const isLastDraft = isMultiDraft && parsedDraftIndex === parsedDrafts.length - 1;

  function switchTab(tab: ImportTab) {
    setActiveTab(tab);
    updateDraft({ sourceType: TAB_TO_SOURCE[tab] });
  }

  function updateRows(next: IngredientRow[]) {
    updateDraft({ ingredientsText: rowsToText(next) });
  }
  function updateSteps(next: string[]) {
    updateDraft({ instructionsText: stepsToText(next) });
  }

  function setRow(index: number, patch: Partial<IngredientRow>) {
    const next = ingredientRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    updateRows(next);
  }
  function removeRow(index: number) {
    const next = ingredientRows.filter((_, i) => i !== index);
    updateRows(next.length ? next : [{ qty: "", unit: "", name: "" }]);
  }
  function addRow() {
    updateRows([...ingredientRows, { qty: "", unit: "", name: "" }]);
  }

  function setStep(index: number, text: string) {
    const next = stepRows.map((s, i) => (i === index ? text : s));
    updateSteps(next);
  }
  function removeStep(index: number) {
    const next = stepRows.filter((_, i) => i !== index);
    updateSteps(next.length ? next : [""]);
  }
  function addStep() {
    updateSteps([...stepRows, ""]);
  }

  function handleHeroFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateDraft({ heroImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleTagInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (defaultTagCategoryId) {
        void createDraftTag(defaultTagCategoryId, tagInput.trim());
        setTagInput("");
      }
    }
  }

  const filteredRelated = useMemo(() => {
    const q = relatedQuery.trim().toLowerCase();
    return allRecipes
      .filter((r) => r.id !== draft.id)
      .filter((r) => (q ? r.title.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [allRecipes, relatedQuery, draft.id]);

  const linkedIds = draft.selectedLinkedRecipeIds ?? [];

  function toggleLinked(recipeId: string) {
    const next = linkedIds.includes(recipeId)
      ? linkedIds.filter((id) => id !== recipeId)
      : [...linkedIds, recipeId];
    setDraftLinkedRecipes(next);
  }

  const statusText = isImporting
    ? "Importing…"
    : editorMode === "edit"
      ? "Editing recipe"
      : "Draft ready";

  return (
    <div className="search-shell" style={{ background: "var(--bg)" }}>
      <header className="page-header">
        <div className="page-header-left">
          <button type="button" className="btn btn-ghost btn-sm" onClick={exitEditor}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-semi" style={{ margin: 0 }}>
            {editorMode === "edit" ? "Edit Recipe" : "Import Recipe"}
          </h1>
        </div>
        <div className="page-header-right">
          <span className="text-sm text-muted">{statusText}</span>
        </div>
      </header>

      <div className="import-tabs">
        {(["url", "photo", "paste", "manual"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`import-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => switchTab(tab)}
          >
            {tab === "url" ? "URL" : tab === "photo" ? "Photo" : tab === "paste" ? "Paste" : "Manual"}
          </button>
        ))}
      </div>

      {activeTab === "url" ? (
        <div className="url-import-area">
          <div className="url-row">
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/recipe"
              value={draft.sourceRef}
              onChange={(e) => updateDraft({ sourceRef: e.target.value })}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={isImporting || !draft.sourceRef.trim()}
              onClick={() => void importFromWebsite()}
            >
              {isImporting ? "Fetching…" : "Fetch Recipe"}
            </button>
          </div>
          {isMultiDraft ? (
            <div className="multi-recipe-banner" style={{ marginTop: "var(--sp-4)" }}>
              <span>{parsedDrafts.length} recipes parsed from this page</span>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={parsedDraftIndex === 0}
                  onClick={() => goToParsedDraft(parsedDraftIndex - 1)}
                >
                  ←
                </button>
                <span className="text-sm">
                  {parsedDraftIndex + 1} of {parsedDrafts.length}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={isLastDraft}
                  onClick={() => goToParsedDraft(parsedDraftIndex + 1)}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "photo" ? (
        <div
          className="photo-drop-zone"
          onClick={() => photoInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div style={{ fontSize: "2rem" }}>📷</div>
          <div className="text-base font-semi">Drop a photo or click to upload</div>
          <div className="text-sm text-muted">PNG, JPG up to 10MB</div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              void importFromFile(file ?? undefined);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {activeTab === "paste" ? (
        <div className="url-import-area">
          <textarea
            className="form-textarea"
            rows={6}
            placeholder="Paste recipe text here…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div style={{ marginTop: "var(--sp-3)", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isImporting || !pasteText.trim()}
              onClick={() => void importFromText(pasteText)}
            >
              {isImporting ? "Parsing…" : "Parse Recipe"}
            </button>
          </div>
        </div>
      ) : null}
      {isImporting ? (
            <div className="importing-indicator" role="status" aria-live="polite" aria-label="Importing recipe">
              <div className="importing-indicator-spinner" aria-hidden="true" />
              <div className="importing-indicator-title text-base font-semi">Importing recipe...</div>
              <div className="importing-indicator-subtitle text-sm text-muted">
                Extracting details and preparing your draft
              </div>
            </div>
          ) : null}
      <div className="editor-layout">
        <div className="recipe-form">
          <section className="form-section">
            <div className="form-section-title">Basic Info</div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="Recipe title"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={draft.summary}
                onChange={(e) => updateDraft({ summary: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cuisine</label>
                <select
                  className="form-select"
                  value={draft.cuisine}
                  onChange={(e) => updateDraft({ cuisine: e.target.value })}
                >
                  <option value="">—</option>
                  {cuisineTags.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  className="form-select"
                  value={draft.mealType}
                  onChange={(e) => updateDraft({ mealType: e.target.value })}
                >
                  <option value="">—</option>
                  {mealTags.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row-3" style={{ marginTop: "var(--sp-4)" }}>
              <div className="form-group">
                <label className="form-label">Prep Time</label>
                <input
                  className="form-input"
                  value={draft.prepTime ?? ""}
                  onChange={(e) => updateDraft({ prepTime: e.target.value })}
                  placeholder="20 min"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cook Time</label>
                <input
                  className="form-input"
                  value={draft.cookTime ?? ""}
                  onChange={(e) => updateDraft({ cookTime: e.target.value })}
                  placeholder="35 min"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Servings</label>
                <input
                  className="form-input"
                  value={draft.servings}
                  onChange={(e) => updateDraft({ servings: e.target.value })}
                  placeholder="4"
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-title">Hero Image</div>
            {draft.heroImage ? (
              <div style={{ position: "relative" }}>
                <img
                  src={draft.heroImage}
                  alt="Hero"
                  style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: "var(--r-md)" }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ position: "absolute", top: 8, right: 8 }}
                  onClick={() => updateDraft({ heroImage: undefined })}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                className="image-upload-zone"
                onClick={() => heroInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div style={{ fontSize: "1.5rem" }}>🖼️</div>
                <div className="text-sm text-muted">Click to upload a hero image</div>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    handleHeroFile(e.target.files?.[0] ?? undefined);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="form-section-title">Ingredients</div>
            <div className="ingredient-editor-list">
              {ingredientRows.map((row, i) => (
                <div key={i} className="ingredient-editor-row">
                  <input
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => setRow(i, { qty: e.target.value })}
                  />
                  <input
                    placeholder="Unit"
                    value={row.unit}
                    onChange={(e) => setRow(i, { unit: e.target.value })}
                  />
                  <input
                    placeholder="Ingredient"
                    value={row.name}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeRow(i)}
                    aria-label="Remove ingredient"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-row-btn" onClick={addRow}>
              + Add ingredient
            </button>
          </section>

          <section className="form-section">
            <div className="form-section-title">Instructions</div>
            <div className="step-editor-list">
              {stepRows.map((text, i) => (
                <div key={i} className="step-editor-row">
                  <div className="step-num-badge">{i + 1}</div>
                  <textarea
                    value={text}
                    onChange={(e) => setStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeStep(i)}
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-row-btn" onClick={addStep}>
              + Add step
            </button>
          </section>

          <section className="form-section">
            <div className="form-section-title">Tags</div>
            <div className="tag-input-area">
              {draft.selectedTagIds.map((tagId) => {
                const tag = tagLookup.get(tagId);
                return (
                  <span key={tagId} className="tag-pill">
                    {tag?.name ?? tagId}
                    <button type="button" onClick={() => toggleDraftTag(tagId)} aria-label="Remove tag">
                      ×
                    </button>
                  </span>
                );
              })}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKey}
                placeholder="Add a tag…"
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  flex: 1,
                  minWidth: 120,
                  fontFamily: "var(--font)",
                  fontSize: "0.875rem",
                }}
              />
            </div>
            {visibleDraftSuggestions.length > 0 ? (
              <div className="tag-suggestions">
                {visibleDraftSuggestions
                  .filter((s): s is typeof s & { tagId: string } => Boolean(s.tagId))
                  .filter((s) => !draft.selectedTagIds.includes(s.tagId))
                  .map((s) => {
                    const tag = tagLookup.get(s.tagId);
                    if (!tag) return null;
                    return (
                      <button
                        key={s.tagId}
                        type="button"
                        className="tag-suggestion-chip"
                        onClick={() => toggleDraftTag(s.tagId)}
                      >
                        + {tag.name}
                      </button>
                    );
                  })}
              </div>
            ) : null}
          </section>

          <section className="form-section">
            <div className="form-section-title">Rating</div>
            <StarRating
              rating={0}
              label="Rate draft"
              large
              showValue
              onRate={() => {
                /* rating only persists once recipe is saved */
              }}
            />
          </section>
        </div>

        <aside className="editor-sidebar">
          <section className="editor-sidebar-section">
            <div className="editor-sidebar-title">Related Recipes</div>
            <input
              type="search"
              className="form-input"
              placeholder="Search recipes…"
              value={relatedQuery}
              onChange={(e) => setRelatedQuery(e.target.value)}
              style={{ marginBottom: "var(--sp-3)" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {filteredRelated.length === 0 ? (
                <p className="text-sm text-muted">No matches</p>
              ) : (
                filteredRelated.map((r) => {
                  const isLinked = linkedIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleLinked(r.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--sp-2) var(--sp-3)",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--border)",
                        background: isLinked ? "var(--accent-light)" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span className="text-sm">{r.title}</span>
                      <span className="text-xs text-muted">{isLinked ? "✓" : "+"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="editor-sidebar-section">
            <div className="editor-sidebar-title">Notes</div>
            <textarea
              className="form-textarea"
              rows={6}
              value={draft.notes ?? ""}
              onChange={(e) => updateDraft({ notes: e.target.value })}
              placeholder="Personal notes…"
            />
          </section>
        </aside>
      </div>

      <div className="editor-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "var(--success)" : "var(--muted)",
            }}
          />
          <span className="text-sm text-muted">{connected ? "Synced to cloud" : "Offline"}</span>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <button type="button" className="btn btn-secondary" onClick={exitEditor}>
            Discard
          </button>
          {isMultiDraft && !isLastDraft ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goToParsedDraft(parsedDraftIndex + 1)}
            >
              Next Recipe
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => void saveAndExit()}>
              {isMultiDraft ? `Save All (${parsedDrafts.length})` : "Save Recipe"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditorWorkspace;
