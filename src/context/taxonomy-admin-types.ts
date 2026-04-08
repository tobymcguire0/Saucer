export type CategoryForm = { name: string; description: string };
export type TagForm = { categoryId: string; name: string };
export type AliasForm = { tagId: string; alias: string };
export type MergeForm = { sourceTagId: string; targetTagId: string };
