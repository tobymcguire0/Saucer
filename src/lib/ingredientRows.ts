export type IngredientRow = { qty: string; unit: string; name: string };

const UNIT_TOKENS = new Set([
  "tsp", "tsps", "teaspoon", "teaspoons",
  "tbsp", "tbsps", "tablespoon", "tablespoons",
  "cup", "cups",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kgs", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters", "litre", "litres",
  "cm", "mm",
  "clove", "cloves",
  "slice", "slices",
  "sheet", "sheets",
  "pack", "packs",
  "can", "cans",
  "bunch", "bunches",
  "pinch", "pinches",
  "dash", "dashes",
  "stick", "sticks",
  "piece", "pieces",
]);

const QTY_REGEX = /^[\d./\s¼½¾⅓⅔⅛⅜⅝⅞]+/;

export function parseIngredientRow(raw: string): IngredientRow {
  const trimmed = raw.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return { qty: "", unit: "", name: "" };

  const qtyMatch = trimmed.match(QTY_REGEX);
  let qty = "";
  let rest = trimmed;
  if (qtyMatch) {
    qty = qtyMatch[0].trim();
    rest = trimmed.slice(qtyMatch[0].length).trim();
  }

  const tokens = rest.split(/\s+/);
  let unit = "";
  if (tokens.length > 1 && UNIT_TOKENS.has(tokens[0].toLowerCase().replace(/[.,]$/, ""))) {
    unit = tokens.shift() ?? "";
    rest = tokens.join(" ");
  } else {
    rest = tokens.join(" ");
  }

  if (!qty && !unit) {
    return { qty: "", unit: "", name: trimmed };
  }
  return { qty, unit, name: rest };
}

export function rowsFromText(text: string): IngredientRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [{ qty: "", unit: "", name: "" }];
  return lines.map(parseIngredientRow);
}

export function rowsToText(rows: IngredientRow[]): string {
  return rows
    .map((r) => [r.qty.trim(), r.unit.trim(), r.name.trim()].filter(Boolean).join(" "))
    .filter(Boolean)
    .join("\n");
}

export function stepsFromText(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
  return lines.length === 0 ? [""] : lines;
}

export function stepsToText(steps: string[]): string {
  return steps
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

export function splitAmountFromRaw(raw: string): { amount: string; name: string} {
  const row = parseIngredientRow(raw);
  const amount = [row.qty, row.unit].filter(Boolean).join(" ").trim();
  return { amount, name: row.name || raw };
}