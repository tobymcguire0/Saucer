import type { Taxonomy } from "../lib/models";

export function sortTagIdsForPreview(
  tagIds: string[],
  tagLookup: Map<string, Taxonomy["tags"][number]>,
  categoryLookup: Map<string, Taxonomy["categories"][number]>,
) {
  return [...tagIds].sort((leftId, rightId) => {
    const leftTag = tagLookup.get(leftId);
    const rightTag = tagLookup.get(rightId);
    const leftCategory = leftTag ? categoryLookup.get(leftTag.categoryId) : undefined;
    const rightCategory = rightTag ? categoryLookup.get(rightTag.categoryId) : undefined;
    const leftPriority = leftCategory?.name === "Ingredients" ? 1 : 0;
    const rightPriority = rightCategory?.name === "Ingredients" ? 1 : 0;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const categoryCompare = (leftCategory?.name ?? "").localeCompare(rightCategory?.name ?? "");
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return (leftTag?.name ?? leftId).localeCompare(rightTag?.name ?? rightId);
  });
}
