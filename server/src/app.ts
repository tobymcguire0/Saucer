import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { verifyCognitoToken } from "./auth.js";
import { HttpError } from "./errors.js";
import type { AppStore } from "./store.js";
import { uploadToS3 } from "./s3.js";
import {
  parseCursorParam,
  parseMutationsBody,
  parseRecipeIdParam,
  parseTaxonomyBody,
  parseWebsiteImportUrl,
} from "./validation.js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface VerifiedTokenPayload {
  sub: string;
}

type VerifyToken = (token: string) => Promise<VerifiedTokenPayload>;

interface UploadedImage {
  imageUrl: string;
  thumbnailUrl: string;
}

interface AppDependencies {
  store: AppStore;
  verifyToken?: VerifyToken;
  fetchImpl?: typeof fetch;
  uploadImage?: (file: Express.Multer.File) => Promise<UploadedImage>;
}

async function defaultUploadImage(file: Express.Multer.File): Promise<UploadedImage> {
  const imageId = randomUUID();
  const imageBuffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();
  const thumbnailBuffer = await sharp(file.buffer)
    .resize({ width: 480, height: 480, fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();

  const [imageUrl, thumbnailUrl] = await Promise.all([
    uploadToS3(`images/${imageId}.jpg`, imageBuffer, "image/jpeg"),
    uploadToS3(`thumbs/${imageId}.jpg`, thumbnailBuffer, "image/jpeg"),
  ]);

  return { imageUrl, thumbnailUrl };
}

export function createApp({
  store,
  verifyToken = verifyCognitoToken as VerifyToken,
  fetchImpl = fetch,
  uploadImage = defaultUploadImage,
}: AppDependencies) {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({ ok: true });
  });

  const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        response.status(401).json({ error: "Missing Bearer token." });
        return;
      }

      const token = authorization.slice("Bearer ".length);
      const payload = await verifyToken(token);
      request.userId = payload.sub;
      next();
    } catch {
      response.status(401).json({ error: "Invalid or expired token." });
    }
  };

  const apiRouter = express.Router();
  apiRouter.use(requireAuth);

  apiRouter.get("/bootstrap", async (request: Request, response: Response, next: NextFunction) => {
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

  apiRouter.get(
    "/sync/changes",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const cursor = parseCursorParam(request.query.cursor);
        response.json(await store.getSyncPayload(request.userId, cursor));
      } catch (error) {
        next(error);
      }
    },
  );

  apiRouter.post("/sync/push", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mutations = parseMutationsBody(request.body);
      response.json(await store.applyMutations(request.userId, mutations));
    } catch (error) {
      next(error);
    }
  });

  apiRouter.get(
    "/recipes/:id",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const recipeId = parseRecipeIdParam(request.params.id);
        const recipe = await store.getRecipe(request.userId, recipeId);

        if (!recipe) {
          response.status(404).json({ error: "Recipe not found." });
          return;
        }

        response.json(recipe);
      } catch (error) {
        next(error);
      }
    },
  );

  apiRouter.put("/taxonomy", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { taxonomy, baseRevision } = parseTaxonomyBody(request.body);
      const document = await store.saveTaxonomy(request.userId, taxonomy, baseRevision);
      response.json(document);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post(
    "/images/upload",
    upload.single("image"),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.file) {
          response.status(400).json({ error: "Image upload is required." });
          return;
        }

        response.status(201).json(await uploadImage(request.file));
      } catch (error) {
        next(error);
      }
    },
  );

  apiRouter.post(
    "/import/website",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const url = parseWebsiteImportUrl(request.body);
        const fetched = await fetchImpl(url, {
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
    },
  );

  app.use("/api", apiRouter);

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Invalid JSON body." });
      return;
    }

    if (error instanceof multer.MulterError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof HttpError) {
      response.status(error.statusCode).json({ error: error.message });
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
