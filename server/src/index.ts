import "dotenv/config";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import { verifyCognitoToken } from "./auth.js";
import { ConflictError, FileAppStore, NotFoundError } from "./store.js";
import type { Mutation } from "./types.js";
import { uploadToS3 } from "./s3.js";

// Augment Express Request with userId set by auth middleware
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const port = Number(process.env.PORT || 3001);
const dataFile =
  process.env.DATA_FILE || path.resolve(process.cwd(), "server-data.json");

const store = new FileAppStore(dataFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  // ── Public routes───────────────────────────────────────────────────

  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({ ok: true });
  });

  // ── Auth middleware ──────────────────────────────────────────────────

  const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        response.status(401).json({ error: "Missing Bearer token." });
        return;
      }
      const token = authorization.slice("Bearer ".length);
      const payload = await verifyCognitoToken(token);
      request.userId = payload.sub;
      next();
    } catch {
      response.status(401).json({ error: "Invalid or expired token." });
    }
  };

  app.use("/api", requireAuth);

  // ── Protected routes ────────────────────────────────────────────────

  app.get("/api/bootstrap", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = request.userId;
      const [taxonomyDocument, syncPayload] = await Promise.all([
        store.getTaxonomy(userId),
        store.getSyncPayload(userId),
      ]);
      response.json({
        recipes: syncPayload.recipes,
        deletedIds: syncPayload.deletedIds,
        taxonomy: taxonomyDocument.taxonomy,
        taxonomyRevision: taxonomyDocument.revision,
        cursor: syncPayload.cursor,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sync/changes", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const cursor = Array.isArray(request.query.cursor)
        ? request.query.cursor[0]
        : request.query.cursor;
      response.json(
        await store.getSyncPayload(
          request.userId,
          typeof cursor === "string" ? cursor : "",
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sync/push", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mutations: Mutation[] = Array.isArray(request.body?.mutations)
        ? request.body.mutations
        : [];
      response.json(await store.applyMutations(request.userId, mutations));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/recipes/:id", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const recipeId = Array.isArray(request.params.id)
        ? request.params.id[0]
        : request.params.id;
      const recipe = await store.getRecipe(request.userId, recipeId);
      if (!recipe) {
        response.status(404).json({ error: "Recipe not found." });
        return;
      }
      response.json(recipe);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/taxonomy", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const baseRevision =
        typeof request.body?.baseRevision === "number" ? request.body.baseRevision : undefined;
      const document = await store.saveTaxonomy(request.userId, request.body, baseRevision);
      response.json(document);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/images/upload",
    upload.single("image"),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.file) {
          response.status(400).json({ error: "Image upload is required." });
          return;
        }
        const imageId = randomUUID();

        const imageBuffer = await sharp(request.file.buffer).jpeg({ quality: 90 }).toBuffer();
        const thumbnailBuffer = await sharp(request.file.buffer)
          .resize({ width: 480, height: 480, fit: "cover" })
          .jpeg({ quality: 82 })
          .toBuffer();

        const [imageUrl, thumbnailUrl] = await Promise.all([
          uploadToS3(`images/${imageId}.jpg`, imageBuffer, "image/jpeg"),
          uploadToS3(`thumbs/${imageId}.jpg`, thumbnailBuffer, "image/jpeg"),
        ]);

        response.status(201).json({ imageUrl, thumbnailUrl });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/import/website", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const url = String(request.body?.url || "").trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        response.status(400).json({ error: "A valid http(s) URL is required." });
        return;
      }
      const fetched = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Saucer/0.1",
        },
      });
      if (!fetched.ok) {
        response.status(502).json({ error: `Failed to fetch recipe page (${fetched.status}).` });
        return;
      }
      response.json({
        url: fetched.url,
        html: await fetched.text(),
      });
    } catch (error) {
      next(error);
    }
  });

  // ── Error handler ───────────────────────────────────────────────────

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof ConflictError) {
      response.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error) {
      response.status(500).json({ error: error.message });
      return;
    }
    response.status(500).json({ error: "Unknown server error." });
  });

  return app;
}

const app = createApp();
const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  app.listen(port, () => {
    console.log(`Saucer API listening on http://localhost:${port}`);
  });
}

export { app, createApp, store };
