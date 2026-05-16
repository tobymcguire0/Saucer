import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../../features/saucer/useSaucerStore";
import { useTaxonomyViewModel } from "../../features/taxonomy/useTaxonomyViewModel";
import { cn } from "../../lib/cn";

const CATEGORY_DOTS: Record<string, string> = {
  Cuisine: "#c4956a",
  "Meal-Time": "#5a9e52",
  Dietary: "#5a7ed4",
  Ingredients: "#d4956a",
  "Cooking-Method": "#c87c20",
  Course: "#d4a020",
  Time: "#10b981",
  Equipment: "#7a5ac4",
  Occasion: "#d47090",
  Flavor: "#ef4444",
};

function TaxonomySection() {
  const { taxonomy, taxonomyGroups } = useTaxonomyViewModel();
  const { recipes, saveCategory, saveTag, saveAlias, removeAlias } = useSaucerStore(
    useShallow((s) => ({
      recipes: s.recipes,
      saveCategory: s.saveCategory,
      saveTag: s.saveTag,
      saveAlias: s.saveAlias,
      removeAlias: s.removeAlias,
    })),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    taxonomy.categories[0]?.id ?? "",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const id of r.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [recipes]);

  const tagsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tag of taxonomy.tags) {
      map.set(tag.categoryId, (map.get(tag.categoryId) ?? 0) + 1);
    }
    return map;
  }, [taxonomy.tags]);

  const selectedCategory = taxonomy.categories.find((c) => c.id === selectedCategoryId);
  const selectedTags = taxonomy.tags.filter((t) => t.categoryId === selectedCategoryId);

  const onAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await saveCategory(name, "");
    setNewCategoryName("");
    setShowNewCategory(false);
  };
  const onAddTag = async () => {
    const name = newTagName.trim();
    if (!name || !selectedCategoryId) return;
    await saveTag(selectedCategoryId, name);
    setNewTagName("");
    setShowNewTag(false);
  };
  const onAddAlias = async (tagId: string) => {
    const value = (aliasDrafts[tagId] ?? "").trim();
    if (!value) return;
    await saveAlias(tagId, value);
    setAliasDrafts((prev) => ({ ...prev, [tagId]: "" }));
  };

  return (
    <div>
      <h2 className="settings-section-title">Taxonomy</h2>
      <div className="taxonomy-layout">
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-3)" }}>
            <h3 className="text-base font-bold">Categories</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewCategory((v) => !v)}>
              + New
            </button>
          </div>
          {showNewCategory ? (
            <div className="new-item-row">
              <input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void onAddCategory()}
                autoFocus
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void onAddCategory()}>Add</button>
            </div>
          ) : null}
          <div className="category-list" style={{ marginTop: "var(--sp-3)" }}>
            {taxonomyGroups.map(({ category }) => (
              <div key={category.id} className={cn("category-item", category.id === selectedCategoryId && "selected")}>
                <button type="button" className="category-header" onClick={() => setSelectedCategoryId(category.id)}>
                  <span className="category-color" style={{ background: CATEGORY_DOTS[category.name] ?? "var(--accent)" }} />
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{tagsByCategory.get(category.id) ?? 0}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="tag-editor">
            <div className="tag-editor-title">
              <span>Tags in {selectedCategory?.name ?? "—"}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!selectedCategoryId}
                onClick={() => setShowNewTag((v) => !v)}
              >
                + New Tag
              </button>
            </div>
            {showNewTag ? (
              <div className="new-item-row">
                <input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void onAddTag()}
                  autoFocus
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void onAddTag()}>Add</button>
              </div>
            ) : null}
            <div className="tag-editor-tag-list">
              {selectedTags.length === 0 ? (
                <p className="text-muted text-sm">No tags in this category yet.</p>
              ) : (
                selectedTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="tag-editor-tag-row"
                    style={{ flexWrap: "wrap", alignItems: "flex-start" }}
                  >
                    <span className="tag-pill-color" style={{ marginTop: 8 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-2)", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                        <span className="tag-editor-tag-name">{tag.name}</span>
                        <span className="category-count" style={{ marginLeft: "auto" }}>
                          {tagCounts.get(tag.id) ?? 0}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {tag.aliases.length === 0 ? (
                          <span className="text-xs text-muted">No aliases</span>
                        ) : (
                          tag.aliases.map((alias) => (
                            <span key={alias} className="tag-pill">
                              {alias}
                              <button
                                type="button"
                                aria-label={`Remove alias ${alias}`}
                                onClick={() => void removeAlias(tag.id, alias)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </span>
                          ))
                        )}
                        <input
                          className="tag-alias-input"
                          placeholder="+ alias"
                          value={aliasDrafts[tag.id] ?? ""}
                          onChange={(e) =>
                            setAliasDrafts((prev) => ({ ...prev, [tag.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void onAddAlias(tag.id);
                            }
                          }}
                          style={{
                            flex: "0 1 140px",
                            minWidth: 100,
                            height: 28,
                            padding: "0 var(--sp-2)",
                            border: "1.5px dashed var(--border)",
                            borderRadius: "var(--r-sm)",
                            fontFamily: "var(--font)",
                            fontSize: "0.8125rem",
                            color: "var(--fg)",
                            background: "transparent",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxonomySection;
