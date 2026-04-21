// @vitest-environment jsdom

import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../src/lib/searchIndex", () => ({
  SqliteSearchIndex: class {
    async rebuild() {}

    async queryRecipeIds() {
      return [];
    }
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

import { renderApp, resetMockAuth } from "./renderApp";

describe("upload inputs", () => {
  beforeEach(() => {
    window.localStorage.clear();
    invokeMock.mockReset();
    resetMockAuth();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows only source controls before a website import succeeds", async () => {
    const user = userEvent.setup();

    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));

    const websiteInput = screen.getByPlaceholderText("https://example.com/recipe");
    await user.type(websiteInput, "h");

    expect(screen.getByRole("heading", { name: "Review recipe draft" })).toBeTruthy();
    expect(screen.getByDisplayValue("h")).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
    expect(screen.getByText("Source Type")).toBeTruthy();
  });

  it("shows the full form immediately for manual entry", async () => {
    const user = userEvent.setup();

    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.click(screen.getByRole("button", { name: "manual" }));

    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.queryByPlaceholderText("https://example.com/recipe")).toBeNull();
    expect(screen.getByText("Source Type")).toBeTruthy();
  });

  it("hides source controls after a successful website import and can reopen them", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue({
      url: "https://example.com/recipe",
      html: `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Test Pasta",
                "description": "Imported from the web",
                "recipeIngredient": ["200g spaghetti", "1 lemon"],
                "recipeInstructions": ["Boil pasta", "Toss with lemon"],
                "recipeYield": "2 people",
                "recipeCuisine": ["Italian"],
                "recipeCategory": ["Dinner"]
              }
            </script>
          </head>
          <body></body>
        </html>
      `,
    });

    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.type(screen.getByPlaceholderText("https://example.com/recipe"), "https://example.com/recipe");
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(screen.getByDisplayValue("Test Pasta")).toBeTruthy());

    expect(screen.queryByText("Source Type")).toBeNull();
    expect(screen.queryByPlaceholderText("https://example.com/recipe")).toBeNull();
    expect(screen.getByRole("button", { name: "Change source" })).toBeTruthy();
    expect(screen.getByTestId("status-bar").textContent).toContain("Website recipe imported");

    await user.click(screen.getByRole("button", { name: "Change source" }));

    expect(screen.getByText("Source Type")).toBeTruthy();
    expect(screen.getByPlaceholderText("https://example.com/recipe")).toBeTruthy();
  });

  it("keeps website source controls visible on import failure and marks the upload area as errored", async () => {
    const user = userEvent.setup();
    invokeMock.mockRejectedValue(new Error("failed to fetch"));

    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.type(screen.getByPlaceholderText("https://example.com/recipe"), "https://bad.example.com");
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(screen.getByTestId("status-bar").textContent).toContain("Website import failed: failed to fetch"),
    );

    expect(screen.getByText("Source Type")).toBeTruthy();
    expect(screen.getByPlaceholderText("https://example.com/recipe")).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
    expect(screen.getByTestId("upload-content").getAttribute("data-upload-error")).toBe("true");
  });

  it("hydrates the draft fields after uploading a text recipe file", async () => {
    const user = userEvent.setup();

    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.click(screen.getByRole("button", { name: "text" }));

    expect(screen.queryByLabelText("Title")).toBeNull();

    const fileInput = screen.getByLabelText("Upload Text");
    const file = new File(
      [
        `Lemon Pasta
Bright and quick dinner.

Serves: 4 people

Ingredients
- 300g spaghetti
- 2 lemons
- 60g parmesan

Instructions
1. Cook the pasta.
2. Mix with lemon and parmesan.
`,
      ],
      "lemon-pasta.txt",
      { type: "text/plain" },
    );

    await user.upload(fileInput, file);

    await waitFor(() => expect(screen.getByDisplayValue("Lemon Pasta")).toBeTruthy());

    expect(screen.queryByText("Source Type")).toBeNull();
    expect(screen.getByDisplayValue("Bright and quick dinner.")).toBeTruthy();
    expect(screen.getByDisplayValue("lemon-pasta.txt")).toBeTruthy();
    expect(screen.getByDisplayValue(/300g spaghetti/)).toBeTruthy();
    expect(screen.getByDisplayValue(/1\. Cook the pasta\./)).toBeTruthy();

    const titleInput = screen.getByDisplayValue("Lemon Pasta");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Lemon Pasta");

    expect(screen.getByDisplayValue("Updated Lemon Pasta")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Review recipe draft" })).toBeTruthy();
  });
});
