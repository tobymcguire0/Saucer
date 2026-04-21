// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildThemeTokens,
  defaultThemePalette,
  themePaletteStorageKey,
} from "../src/lib/theme";
import { renderApp, resetMockAuth } from "./renderApp";

describe("theme palette editor", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("style");
    resetMockAuth();
  });

  afterEach(() => {
    cleanup();
  });

  it("updates runtime palette tokens and persists the picked color", async () => {
    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    const primaryInput = screen.getByLabelText("Primary color");
    fireEvent.change(primaryInput, { target: { value: "#3366aa" } });

    const expectedTokens = buildThemeTokens({
      ...defaultThemePalette,
      primary: "#3366aa",
    });

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--color-primary-50")).toBe(
        expectedTokens.primary[50],
      ),
    );

    expect(document.documentElement.style.getPropertyValue("--color-primary-5")).toBe(
      expectedTokens.primary[5],
    );
    expect(document.documentElement.style.getPropertyValue("--color-primary-100")).toBe(
      expectedTokens.primary[100],
    );

    const storedPalette = JSON.parse(window.localStorage.getItem(themePaletteStorageKey) ?? "{}");
    expect(storedPalette.primary).toBe("#3366aa");
  });

  it("restores the default palette when reset is clicked", async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Saucer loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    const accentInput = screen.getByLabelText("Accent color");
    fireEvent.change(accentInput, { target: { value: "#ff00aa" } });

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--color-accent-50")).toBe("#ff00aa"),
    );

    await user.click(screen.getByRole("button", { name: /reset palette/i }));

    const expectedTokens = buildThemeTokens(defaultThemePalette);

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--color-accent-50")).toBe(
        expectedTokens.accent[50],
      ),
    );

    expect(window.localStorage.getItem(themePaletteStorageKey)).toBeNull();
  });
});
