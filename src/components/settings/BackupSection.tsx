import { useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../../features/saucer/useSaucerStore";
import { useStatusStore } from "../../features/status/useStatusStore";
import { ensureDefaultTaxonomy } from "../../lib/taxonomy";

const QUOTA_BYTES = 300 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BackupSection() {
  const { recipes, taxonomy, replaceAll } = useSaucerStore(
    useShallow((s) => ({ recipes: s.recipes, taxonomy: s.taxonomy, replaceAll: s.replaceAll })),
  );
  const updateStatus = useStatusStore((s) => s.updateStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = JSON.stringify({ recipes, taxonomy });
  const used = new Blob([snapshot]).size;
  const percent = Math.min(100, (used / QUOTA_BYTES) * 100);

  const onExportJson = () => {
    downloadFile(`saucer-backup-${new Date().toISOString().slice(0, 10)}.json`, snapshot, "application/json");
    updateStatus("Backup exported as JSON.", "success");
  };
  const onExportCsv = () => {
    const header = "id,title,cuisine,mealType,rating,servings,updatedAt\n";
    const rows = recipes
      .map((r) => [r.id, r.title, r.cuisine ?? "", r.mealType ?? "", r.rating, r.servings ?? "", r.updatedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","))
      .join("\n");
    downloadFile(`saucer-recipes-${new Date().toISOString().slice(0, 10)}.csv`, header + rows, "text/csv");
    updateStatus("Recipe index exported as CSV.", "success");
  };
  const onRestore = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { recipes?: unknown; taxonomy?: unknown };
      if (!Array.isArray(parsed.recipes) || !parsed.taxonomy) {
        throw new Error("Backup file is missing recipes or taxonomy.");
      }
      await replaceAll(parsed.recipes as never, parsed.taxonomy as never, "Library restored from backup.");
    } catch (err) {
      updateStatus(`Restore failed: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    }
  };
  const onDeleteAll = async () => {
    if (!window.confirm("Delete all recipes and reset taxonomy? This cannot be undone.")) return;
    await replaceAll([], ensureDefaultTaxonomy(), "Library wiped.", "info");
  };

  return (
    <div>
      <h2 className="settings-section-title">Backup & Export</h2>

      <div className="settings-group">
        <div className="settings-group-title">Local Storage</div>
        <div className="storage-bar">
          <div className="storage-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="storage-labels">
          <span>{recipes.length} recipes · {formatBytes(used)} used</span>
          <span>~{formatBytes(QUOTA_BYTES - used)} remaining</span>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Export</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Export as JSON</div>
            <div className="settings-row-desc">Full snapshot of recipes and taxonomy.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onExportJson}>Export JSON</button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Export as CSV</div>
            <div className="settings-row-desc">Recipe titles and metadata only.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onExportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Import</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Restore from backup</div>
            <div className="settings-row-desc">Replace the library with a JSON backup.</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onRestore(file);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
            Choose file
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-zone-title">Danger Zone</div>
        <div className="danger-zone-desc">Wipe all recipes and reset the taxonomy to defaults. This cannot be undone.</div>
        <button type="button" className="btn btn-danger" onClick={() => void onDeleteAll()}>
          Delete all library data…
        </button>
      </div>
    </div>
  );
}

export default BackupSection;
