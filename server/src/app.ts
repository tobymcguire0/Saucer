import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import type { AppStore } from "./store.js";
import type { Mutation, Taxonomy } from "./types.js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

type VerifyToken = (token: string) => Promise<{ sub: string }>;
type FetchImpl = typeof fetch;

interface AppConfig {
  store: AppStore;
  verifyToken: VerifyToken;
  fetchImpl: FetchImpl;
}

const upload = multer({ storage: multer.memoryStorage() });

export function createApp({ store, verifyToken, fetchImpl }: AppConfig) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token." });
      return;
    }
    const token = authHeader.slice(7);
    verifyToken(token)
      .then(({ sub }) => {
        req.userId = sub;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: "Invalid token." });
      });
  }

  function getClientId(req: Request, res: Response): string | null {
    const clientId = req.headers["x-client-id"];
    if (!clientId || typeof clientId !== "string" || clientId.trim() === "") {
      res.status(400).json({ error: "X-Client-Id header is required." });
      return null;
    }
    return clientId;
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/bootstrap", requireAuth, async (req, res) => {
    const clientId = getClientId(req, res);
    if (!clientId) return;

    const [syncPayload, taxonomyDoc] = await Promise.all([
      store.getSyncPayload(req.userId, clientId),
      store.getTaxonomy(req.userId),
    ]);
    res.json({
      recipes: syncPayload.recipes,
      deletedIds: syncPayload.deletedIds,
      taxonomy: taxonomyDoc.taxonomy,
      taxonomyRevision: taxonomyDoc.revision,
      cursor: syncPayload.cursor,
    });
  });

  app.get("/api/sync/changes", requireAuth, async (req, res) => {
    const clientId = getClientId(req, res);
    if (!clientId) return;

    const cursor = req.query["cursor"] as string | undefined;
    if (cursor !== undefined && !/^\d+$/.test(cursor)) {
      res.status(400).json({ error: "cursor must be a numeric string." });
      return;
    }
    const payload = await store.getSyncPayload(req.userId, clientId, cursor);
    res.json(payload);
  });

  app.post("/api/sync/push", requireAuth, async (req, res) => {
    const clientId = getClientId(req, res);
    if (!clientId) return;

    const body = req.body as { mutations?: unknown };
    if (!Array.isArray(body.mutations)) {
      res.status(400).json({ error: "mutations array is required." });
      return;
    }
    for (const m of body.mutations) {
      const mutation = m as Record<string, unknown>;
      if (mutation["type"] === "upsertRecipe") {
        const recipe = mutation["recipe"] as Record<string, unknown> | undefined;
        if (!recipe?.["id"]) {
          res.status(400).json({ error: "Recipe id is required." });
          return;
        }
      }
    }
    const payload = await store.applyMutations(req.userId, clientId, body.mutations as Mutation[]);
    res.json(payload);
  });

  app.get("/api/recipes/:id", requireAuth, async (req, res) => {
    const recipe = await store.getRecipe(req.userId, req.params["id"] as string);
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json(recipe);
  });

  app.put("/api/taxonomy", requireAuth, async (req, res) => {
    const body = req.body as { categories?: unknown; tags?: unknown };
    if (!Array.isArray(body.categories) || !Array.isArray(body.tags)) {
      res
        .status(400)
        .json({ error: "Taxonomy payload must include categories and tags arrays." });
      return;
    }
    const doc = await store.saveTaxonomy(req.userId, body as unknown as Taxonomy);
    res.json(doc);
  });

  app.post(
    "/api/images/upload",
    requireAuth,
    upload.single("image"),
    async (req, res) => {
      if (!req.file) {
        res.status(400).json({ error: "Image upload is required." });
        return;
      }

      const s3 = new S3Client({ region: process.env["AWS_REGION"] });
      const buffer = await sharp(req.file.buffer).jpeg().toBuffer();
      const key = `images/${req.userId}/${randomUUID()}.jpg`;
      const bucket = process.env["S3_BUCKET_NAME"] ?? "saucer-s3";

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }),
      );

      res.json({ imageUrl: `https://${bucket}.s3.amazonaws.com/${key}` });
    },
  );

  app.post("/api/import/website", requireAuth, async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "A valid http(s) URL is required." });
      return;
    }
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: { "User-Agent": "Saucer/0.1" },
    });
    const html = await response.text();
    res.json({ url: response.url, html });
  });

  return app;
}
