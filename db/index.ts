import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type CloudflareEnv = {
  DB?: D1Database;
};

export function getDb() {
  const runtimeEnv = env as unknown as CloudflareEnv;

  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure the DB binding before using the D1 database."
    );
  }

  return drizzle(runtimeEnv.DB, { schema });
}
