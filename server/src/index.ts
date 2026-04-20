import { CognitoJwtVerifier } from "aws-jwt-verify";
import pg from "pg";
import { createApp } from "./app.js";
import { PostgresAppStore } from "./store.js";

const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? "saucer_db",
  user: process.env.POSTGRES_USER ?? "saucer_user",
  password: process.env.POSTGRES_PASSWORD,
});

const store = new PostgresAppStore(pool);
await store.ensureSchema();

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID ?? "",
});

const app = createApp({
  store,
  verifyToken: async (token) => {
    const payload = await verifier.verify(token);
    return { sub: payload.sub };
  },
  fetchImpl: fetch,
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`Saucer server running on port ${PORT}`);
});
