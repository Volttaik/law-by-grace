/**
 * THE LAW With Gracious · Article editor schema migration (additive only)
 *
 * Adds the two schema pieces the article editor needs:
 *   1. law_by_grace_article_drafts      — table (CREATE TABLE IF NOT EXISTS)
 *   2. articles.referenceCourseId       — column (ALTER TABLE ADD COLUMN, only
 *                                         when absent — the shared `db:init`
 *                                         script refuses ALTER by design)
 *
 *   npx tsx scripts/apply-article-schema.mts
 *
 * Never DROPs/ALTERs anything else and never touches non-law_by_grace objects.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PREFIX = "law_by_grace_";

function loadEnv() {
  const envPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".env"
  );
  if (!existsSync(envPath)) return;
  const realEnv: Record<string, boolean> = {};
  for (const key of Object.keys(process.env)) {
    if (process.env[key]) realEnv[key] = true;
  }
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (realEnv[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (!value) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function db() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are required");
  }
  return createClient({ url, authToken: token });
}

/** Generate DDL for the current Prisma schema (offline, no DB writes). */
function generateDdl(): string {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "prisma",
    "schema.prisma"
  );
  return execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
}

function makeIdempotent(sql: string): string {
  const dangerous = /(^|;)\s*(DROP|TRUNCATE|ALTER|REINDEX|VACUUM)\b/i;
  if (dangerous.test(sql)) {
    throw new Error("Refusing to run generated DDL containing destructive statements");
  }
  return sql
    .replace(/CREATE\s+TABLE\s+("?)(law_by_grace_)/gi, "CREATE TABLE IF NOT EXISTS $1$2")
    .replace(/CREATE\s+UNIQUE\s+INDEX\s+("?)/gi, "CREATE UNIQUE INDEX IF NOT EXISTS $1")
    .replace(/CREATE\s+INDEX\s+("?)/gi, "CREATE INDEX IF NOT EXISTS $1");
}

async function main() {
  const client = db();
  try {
    // Step 1 — create any missing law_by_grace_* tables (the drafts table).
    const ddl = makeIdempotent(generateDdl());
    await client.executeMultiple(ddl);
    console.log("✔ Tables ensured (CREATE TABLE IF NOT EXISTS).");

    // Step 2 — add articles.referenceCourseId when absent (additive ALTER).
    const { rows } = await client.execute('PRAGMA table_info("law_by_grace_articles")');
    const cols = new Set(rows.map((r: any) => String(r.name)));
    if (!cols.has("referenceCourseId")) {
      await client.execute(
        'ALTER TABLE "law_by_grace_articles" ADD COLUMN "referenceCourseId" TEXT'
      );
      console.log('✔ Added column law_by_grace_articles."referenceCourseId" TEXT.');
    } else {
      console.log('✔ law_by_grace_articles."referenceCourseId" already present.');
    }

    // Step 3 — confirm.
    const { rows: tables } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'law_by_grace_%' ORDER BY name"
    );
    console.log(`THE LAW With Gracious tables present: ${tables.length}`);
    const { rows: check } = await client.execute('PRAGMA table_info("law_by_grace_articles")');
    console.log(
      "articles columns:",
      (check as any[]).map((r: any) => r.name).join(", ")
    );
    console.log("Migration complete. No non-law_by_grace objects were modified.");
  } finally {
    client.close();
  }
}

loadEnv();
main().catch(err => {
  console.error(err);
  process.exit(1);
});