import type { RecipeDraft } from "../../../lib/models";
import { sourceTypes } from "../../../lib/models";

type RecipeSourcePanelProps = {
  draft: RecipeDraft;
  showImportControls: boolean;
  uploadErrorActive: boolean;
  isImporting: boolean;
  clearUploadError: () => void;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
  selectSourceType: (sourceType: RecipeDraft["sourceType"]) => void;
  importFromWebsite: () => Promise<void>;
  importFromFile: (file: File | undefined) => Promise<void>;
};

function RecipeSourcePanel({
  draft,
  showImportControls,
  uploadErrorActive,
  isImporting,
  clearUploadError,
  updateDraft,
  selectSourceType,
  importFromWebsite,
  importFromFile,
}: RecipeSourcePanelProps) {
  return (
    <section className="panel source-panel">
      <div className="section-heading">
        <h3>Source Type</h3>
        {draft.sourceType !== "manual" ? (
          <span className="muted">Import first to reveal the full recipe form.</span>
        ) : (
          <span className="muted">Manual entry shows the full form immediately.</span>
        )}
      </div>
      <div className="upload-grid">
        {sourceTypes.map((sourceType) => (
          <button
            key={sourceType}
            type="button"
            className={draft.sourceType === sourceType ? "chip chip-active" : "chip"}
            onClick={() => selectSourceType(sourceType)}
          >
            {sourceType}
          </button>
        ))}
      </div>

      {showImportControls ? (
        <div
          className={`upload_content${uploadErrorActive ? " upload_content-error" : ""}`}
          data-testid="upload-content"
        >
          {draft.sourceType === "website" ? (
            <div className="inline-form">
              <input
                value={draft.sourceRef}
                onChange={(event) => {
                  clearUploadError();
                  updateDraft({ sourceRef: event.currentTarget.value });
                }}
                placeholder="https://example.com/recipe"
              />
              <button type="button" onClick={() => void importFromWebsite()} disabled={isImporting}>
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          ) : null}

          {draft.sourceType === "photo" || draft.sourceType === "text" ? (
            <label className="field">
              <span>{draft.sourceType === "photo" ? "Photo file" : "Text file"}</span>
              <input
                type="file"
                accept={draft.sourceType === "photo" ? "image/*" : ".txt,.md,.rtf"}
                onChange={(event) => {
                  clearUploadError();
                  void importFromFile(event.currentTarget.files?.[0]);
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default RecipeSourcePanel;
