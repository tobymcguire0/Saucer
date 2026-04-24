import { useRef, useState } from "react";

import { cn } from "../../../lib/cn";
import type { RecipeDraft } from "../../../lib/models";
import { sourceTypes } from "../../../lib/models";

type RecipeSourcePanelProps = {
  draft: RecipeDraft;
  showImportControls: boolean;
  uploadErrorActive: boolean;
  uploadShakeActive: boolean;
  isImporting: boolean;
  clearUploadError: () => void;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
  selectSourceType: (sourceType: RecipeDraft["sourceType"]) => void;
  importFromWebsite: () => Promise<void>;
  importFromFile: (file: File | undefined) => Promise<void>;
  importFromText: (text: string) => Promise<void>;
};

function RecipeSourcePanel({
  draft,
  showImportControls,
  uploadErrorActive,
  uploadShakeActive,
  isImporting,
  clearUploadError,
  updateDraft,
  selectSourceType,
  importFromWebsite,
  importFromFile,
  importFromText,
}: RecipeSourcePanelProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-panel-10 bg-panel-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h3 className="text-xl font-semibold text-text-60">Source Type</h3>
        <span className="max-w-md text-sm text-text-35">
          {draft.sourceType !== "manual"
            ? "Import first to reveal the full recipe form."
            : "Manual entry shows the full form immediately."}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {sourceTypes.map((sourceType) => {
          const selected = draft.sourceType === sourceType;

          return (
            <button
              key={sourceType}
              type="button"
              className={selected ? "chip chip-active" : "chip"}
              aria-pressed={selected}
              onClick={() => selectSourceType(sourceType)}
            >
              {sourceType}
            </button>
          );
        })}
      </div>

      {showImportControls ? (
        <div
          className={cn(
            "mt-4 rounded-[var(--radius-card)] border p-4 transition-colors",
            uploadErrorActive
              ? "border-accent-35 bg-accent-5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-25)_55%,transparent)]"
              : "border-panel-15 bg-background-0",
            uploadShakeActive && "animate-shake",
          )}
          data-testid="upload-content"
          data-upload-error={uploadErrorActive}
        >
          {draft.sourceType === "website" ? (
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="field-input"
                value={draft.sourceRef}
                onChange={(event) => {
                  clearUploadError();
                  updateDraft({ sourceRef: event.currentTarget.value });
                }}
                placeholder="https://example.com/recipe"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => void importFromWebsite()}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          ) : null}

          {draft.sourceType === "file" ? (
            <FileUploadButton
              isImporting={isImporting}
              clearUploadError={clearUploadError}
              importFromFile={importFromFile}
            />
          ) : null}

          {draft.sourceType === "text" ? (
            <TextInputArea
              isImporting={isImporting}
              clearUploadError={clearUploadError}
              importFromText={importFromText}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function FileUploadButton({
  isImporting,
  clearUploadError,
  importFromFile,
}: {
  isImporting: boolean;
  clearUploadError: () => void;
  importFromFile: (file: File | undefined) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex justify-center">
      <button
        type="button"
        className="btn-primary active:scale-95"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
      >
        {isImporting ? "Processing..." : "Upload File"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload File"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
        accept="image/*,.txt,.md,.rtf,.pdf"
        onChange={(event) => {
          clearUploadError();
          void importFromFile(event.currentTarget.files?.[0]);
        }}
      />
    </div>
  );
}

function TextInputArea({
  isImporting,
  clearUploadError,
  importFromText,
}: {
  isImporting: boolean;
  clearUploadError: () => void;
  importFromText: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="field-input min-h-[8rem] resize-y"
        value={text}
        placeholder="Paste or type your recipe here..."
        disabled={isImporting}
        onChange={(event) => {
          clearUploadError();
          setText(event.currentTarget.value);
        }}
      />
      <div className="flex justify-center">
        <button
          type="button"
          className="btn-primary"
          disabled={isImporting || !text.trim()}
          onClick={() => void importFromText(text)}
        >
          {isImporting ? "Importing..." : "Import"}
        </button>
      </div>
    </div>
  );
}

export default RecipeSourcePanel;
