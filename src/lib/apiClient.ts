const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

// Stable per-device identity sent with every request so the server can attribute
// mutations and avoid echoing a client's own changes back during sync.
function getOrCreateClientId(): string {
  const key = "saucer:clientId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const CLIENT_ID = getOrCreateClientId();

export interface ApiRecipeInput {
  id: string;
  title: string;
  summary?: string;
  sourceType?: string;
  sourceRef?: string;
  heroImage?: string;
  ingredients: Array<{ id: string; name: string; raw: string }>;
  instructions?: string[];
  servings?: string;
  cuisine?: string;
  mealType?: string;
  rating?: number;
  tagIds?: string[];
}

export interface ApiRecipe extends ApiRecipeInput {
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export type ApiMutation =
  | { type: "upsertRecipe"; clientMutationId: string; recipe: ApiRecipeInput }
  | { type: "deleteRecipe"; clientMutationId: string; recipeId: string; revision: number };

export interface ApiTaxonomyCategory {
  id: string;
  name: string;
  description: string;
}

export interface ApiTaxonomyTag {
  id: string;
  categoryId: string;
  name: string;
  aliases: string[];
  description?: string;
}

export interface ApiTaxonomy {
  categories: ApiTaxonomyCategory[];
  tags: ApiTaxonomyTag[];
}

export interface ApiSyncPayload {
  recipes: ApiRecipe[];
  deletedIds: string[];
  cursor: string;
}

export interface ApiBootstrapResponse {
  recipes: ApiRecipe[];
  deletedIds: string[];
  cursor: string;
  taxonomy: ApiTaxonomy;
  taxonomyRevision: number;
}

export interface ApiPhotoExtraction {
  title: string;
  summary: string;
  ingredients: string[];
  instructions: string[];
  servings: string;
  cuisine: string;
  mealType: string;
}

export class ApiClient {
  constructor(private getToken: () => string | null) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Id": CLIENT_ID,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async bootstrap(): Promise<ApiBootstrapResponse> {
    return this.request<ApiBootstrapResponse>("GET", "/api/bootstrap");
  }

  async syncChanges(cursor?: string): Promise<ApiSyncPayload> {
    const query = cursor !== undefined ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<ApiSyncPayload>("GET", `/api/sync/changes${query}`);
  }

  async push(mutations: ApiMutation[]): Promise<ApiSyncPayload> {
    return this.request<ApiSyncPayload>("POST", "/api/sync/push", { mutations });
  }

  async extractPhoto(imageDataUrl: string): Promise<ApiPhotoExtraction> {
    return this.request<ApiPhotoExtraction>("POST", "/api/extract-photo", { imageDataUrl });
  }

  async extractRecipeText(text: string, pageTitle?: string): Promise<ApiPhotoExtraction> {
    return this.request<ApiPhotoExtraction>("POST", "/api/extract-recipe-text", { text, title: pageTitle });
  }
}
