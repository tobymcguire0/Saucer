import "dotenv/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { FileAppStore } from "./store.js";

const requestedPort = Number(process.env.PORT || 3001);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
const dataFile = process.env.DATA_FILE || path.resolve(process.cwd(), "server-data.json");

const store = new FileAppStore(dataFile);
const app = createApp({ store });
const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  app.listen(port, () => {
    console.log(`Saucer API listening on http://localhost:${port}`);
  });
}

export { app, createApp, store };
