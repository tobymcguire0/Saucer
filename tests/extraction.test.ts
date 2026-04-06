// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { extractDraftFromPlainText, parseDraftFromWebsiteHtml } from "../src/lib/extraction";

describe("text extraction", () => {
  it("parses a recipe-like text blob into a structured draft", () => {
    const draft = extractDraftFromPlainText(`
Lemon Pasta
Bright and quick dinner.

Serves: 4 people

Ingredients
- 300g spaghetti
- 2 lemons
- 60g parmesan

Instructions
1. Cook the pasta.
2. Mix with lemon and parmesan.
`, "text");

    expect(draft.title).toBe("Lemon Pasta");
    expect(draft.summary).toBe("Bright and quick dinner.");
    expect(draft.servings).toBe("4 people");
    expect(draft.ingredientsText).toContain("spaghetti");
    expect(draft.instructionsText).toContain("Cook the pasta");
  });

  it("parses JSON-LD recipe HTML from a website response", () => {
    const draft = parseDraftFromWebsiteHtml(
      `
        <html>
          <head>
            <title>Recipe page</title>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Shakshuka",
                "description": "Eggs simmered in tomato sauce.",
                "recipeIngredient": ["4 eggs", "1 can tomatoes"],
                "recipeInstructions": ["Simmer the sauce", "Poach the eggs"],
                "recipeYield": "2 people",
                "recipeCuisine": ["Middle Eastern"],
                "recipeCategory": ["Dinner"]
              }
            </script>
          </head>
          <body></body>
        </html>
      `,
      "https://example.com/shakshuka",
    );

    expect(draft.title).toBe("Shakshuka");
    expect(draft.summary).toContain("Eggs simmered");
    expect(draft.ingredientsText).toContain("4 eggs");
    expect(draft.instructionsText).toContain("Poach the eggs");
    expect(draft.sourceRef).toBe("https://example.com/shakshuka");
  });

  it("prefers image URLs over image names in JSON-LD objects", () => {
    const draft = parseDraftFromWebsiteHtml(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Toast",
                "image": {
                  "name": "toast.jpg",
                  "url": "https://cdn.example.com/toast.jpg"
                },
                "recipeIngredient": ["2 slices bread"],
                "recipeInstructions": ["Toast the bread"]
              }
            </script>
          </head>
          <body></body>
        </html>
      `,
      "https://example.com/toast",
    );

    expect(draft.heroImage).toBe("https://cdn.example.com/toast.jpg");
  });

  it("resolves relative website image URLs against the source page", () => {
    const draft = parseDraftFromWebsiteHtml(
      `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Cake",
                "image": ["/images/cake.jpg"],
                "recipeIngredient": ["1 cake"],
                "recipeInstructions": ["Serve the cake"]
              }
            </script>
          </head>
          <body></body>
        </html>
      `,
      "https://example.com/recipes/cake",
    );

    expect(draft.heroImage).toBe("https://example.com/images/cake.jpg");
  });

  it("falls back to document text when recipe JSON-LD is missing", () => {
    const draft = parseDraftFromWebsiteHtml(
      `
        <html>
          <head>
            <title>Simple Soup</title>
            <meta property="og:image" content="https://example.com/soup.jpg" />
          </head>
          <body>
            <h1>Simple Soup</h1>
            <p>Quick soup for lunch.</p>
            <h2>Ingredients</h2>
            <p>- 1 onion</p>
            <p>- 2 cups broth</p>
            <h2>Instructions</h2>
            <p>1. Simmer everything.</p>
          </body>
        </html>
      `,
      "https://example.com/soup",
    );

    expect(draft.title).toBe("Simple Soup");
    expect(draft.summary).toContain("Quick soup for lunch.");
    expect(draft.heroImage).toBe("https://example.com/soup.jpg");
    expect(draft.ingredientsText).toContain("1 onion");
    expect(draft.instructionsText).toContain("Simmer everything");
  });

  it("resolves relative og:image URLs in fallback website extraction", () => {
    const draft = parseDraftFromWebsiteHtml(
      `
        <html>
          <head>
            <title>Relative Image Soup</title>
            <meta property="og:image" content="/assets/soup.jpg" />
          </head>
          <body>
            <h1>Relative Image Soup</h1>
          </body>
        </html>
      `,
      "https://example.com/recipes/soup",
    );

    expect(draft.heroImage).toBe("https://example.com/assets/soup.jpg");
  });
});
