/**
 * THE LAW With Gracious · Turso database utilities
 *
 * The provided Turso database is shared with another project. This tool
 * NEVER touches tables outside the `law_by_grace_*` namespace:
 *
 *   npx tsx scripts/turso-db.mts inspect   # read-only schema report
 *   npx tsx scripts/turso-db.mts verify    # read-only: live DB vs prisma/schema.prisma
 *   npx tsx scripts/turso-db.mts init      # create LBG tables (idempotent)
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (from .env or the shell).
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load .env manually so the script works without dotenv tooling.
// Rules: real shell environment wins over the file; within the file, the
// LAST non-empty value wins (like dotenv), so later overrides take effect.
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
    if (realEnv[key]) continue; // real (non-empty) shell env wins
    let value = line.slice(eq + 1).trim();
    if (!value) continue; // blank placeholders never win
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const PREFIX = "law_by_grace_";
const DDL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".next",
  "lbg-schema.sql"
);

function db() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are required");
  }
  return createClient({ url, authToken: token });
}

async function inspect() {
  const client = db();
  try {
    const { rows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const names = rows.map((r: any) => String(r.name));
    const other = names.filter((n) => !n.startsWith(PREFIX));
    const lbg = names.filter((n) => n.startsWith(PREFIX));
    console.log(`Tables/indexes total: ${names.length}`);
    console.log(`Other project objects (UNTOUCHED): ${other.length}`);
    console.log(`  ${other.join(", ") || "(none)"}`);
    console.log(`THE LAW With Gracious objects: ${lbg.length}`);
    console.log(`  ${lbg.join(", ") || "(none)"}`);
  } finally {
    client.close();
  }
}

interface ExpectedTable {
  name: string;
  columns: string[];
}

/** Parse table names + column names out of the generated Prisma DDL (offline). */
function parseExpected(ddl: string): { tables: ExpectedTable[]; indexNames: string[] } {
  const tables: ExpectedTable[] = [];
  const indexNames: string[] = [];
  const tableRe = /CREATE TABLE "?(law_by_grace_[A-Za-z0-9_]+)"?\s*\(([\s\S]*?)\);?/g;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(ddl))) {
    const name = m[1];
    const columns: string[] = [];
    const colRe = /^\s*"([A-Za-z0-9_]+)"\s+[A-Z]+/gm;
    let c: RegExpExecArray | null;
    while ((c = colRe.exec(m[2]))) columns.push(c[1]);
    tables.push({ name, columns });
  }
  const idxRe = /CREATE (?:UNIQUE )?INDEX "?(law_by_grace_[A-Za-z0-9_]+)"?/g;
  while ((m = idxRe.exec(ddl))) indexNames.push(m[1]);
  return { tables, indexNames };
}

/**
 * Read-only audit: compare the live law_by_grace_* schema against
 * prisma/schema.prisma. Never writes. Lists anything missing so `init`
 * (or a targeted column migration) can be applied deliberately.
 */
async function verify() {
  const client = db();
  try {
    const { tables: expectedTables, indexNames: expectedIndexes } = parseExpected(generateDdl());

    const { rows: tblRows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const liveTables = new Set(tblRows.map((r: any) => String(r.name)));

    const { rows: idxRows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'law_by_grace_%' ORDER BY name"
    );
    const liveIndexes = new Set(idxRows.map((r: any) => String(r.name)));

    const missingTables: string[] = [];
    const missingColumns: { table: string; columns: string[] }[] = [];
    for (const t of expectedTables) {
      if (!liveTables.has(t.name)) {
        missingTables.push(t.name);
        continue;
      }
      const { rows } = await client.execute(`PRAGMA table_info("${t.name}")`);
      const liveCols = new Set(rows.map((r: any) => String(r.name)));
      const absent = t.columns.filter((col) => !liveCols.has(col));
      if (absent.length > 0) missingColumns.push({ table: t.name, columns: absent });
    }
    const missingIndexes = expectedIndexes.filter((n) => !liveIndexes.has(n));

    const liveLbgTables = [...liveTables].filter((n) => n.startsWith(PREFIX));
    const extraTables = liveLbgTables
      .filter((n) => !expectedTables.some((t) => t.name === n))
      .sort();

    console.log("── THE LAW With Gracious schema audit (read-only) ────────────────");
    console.log(`Expected tables: ${expectedTables.length}, indexes: ${expectedIndexes.length}`);
    console.log(`Live law_by_grace_ tables: ${liveLbgTables.length}`);
    console.log(`Missing tables: ${missingTables.length ? missingTables.join(", ") : "(none)"}`);
    if (missingTables.length === 0 && missingColumns.length === 0 && missingIndexes.length === 0) {
      console.log("✔ Schema is in sync with prisma/schema.prisma.");
    } else {
      if (missingColumns.length > 0) {
        console.log("Missing columns on existing tables (need ALTER TABLE ADD COLUMN):");
        for (const mc of missingColumns) console.log(`  ${mc.table}: ${mc.columns.join(", ")}`);
      }
      if (missingIndexes.length > 0) {
        console.log(`Missing indexes (fixed by \`init\`): ${missingIndexes.join(", ")}`);
      }
    }
    if (extraTables.length > 0) {
      console.log(`Extra law_by_grace_ tables NOT in the schema (legacy leftovers, kept):`);
      for (const t of extraTables) console.log(`  ${t}`);
    }
    const other = [...liveTables].filter((n) => !n.startsWith(PREFIX));
    console.log(`Other-project tables (UNTOUCHED): ${other.length}`);
    console.log("───────────────────────────────────────────────────────────");
  } finally {
    client.close();
  }
}

/** Generate the DDL for the current Prisma schema (offline, no DB writes). */
function generateDdl(): string {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "prisma",
    "schema.prisma"
  );
  const sql = execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
      "--script",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return sql;
}

/**
 * Create (or verify) THE LAW With Gracious administrator account.
 * Credentials come from LAW_BY_GRACE_ADMIN_EMAIL / _PASSWORD / _NAME env vars.
 */
async function ensureAdmin() {
  const email = process.env.LAW_BY_GRACE_ADMIN_EMAIL;
  const password = process.env.LAW_BY_GRACE_ADMIN_PASSWORD;
  const name = process.env.LAW_BY_GRACE_ADMIN_NAME ?? "Grace";
  if (!email || !password) {
    console.error("LAW_BY_GRACE_ADMIN_EMAIL and LAW_BY_GRACE_ADMIN_PASSWORD are required");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Administrator password must be at least 8 characters");
    process.exit(1);
  }
  const client = db();
  try {
    const existing = await client.execute(
      "SELECT id FROM law_by_grace_users WHERE email = ?",
      [email]
    );
    if ((existing.rows as any[]).length > 0) {
      console.log("Administrator already exists:", email);
      return;
    }
    const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ".") || "admin";
    let username = base;
    let suffix = 1;
    for (;;) {
      const clash = await client.execute(
        "SELECT id FROM law_by_grace_users WHERE username = ?",
        [username]
      );
      if ((clash.rows as any[]).length === 0) break;
      username = `${base}${suffix++}`;
    }
    const hash = await bcrypt.hash(password, 12);
    await client.execute(
      `INSERT INTO law_by_grace_users
        (id, name, username, email, password, role, isVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', 1, ?, ?)`,
      [randomUUID(), name, username, email, hash, new Date().toISOString(), new Date().toISOString()]
    );
    console.log("Administrator created:", email);
  } finally {
    client.close();
  }
}

/** Make DDL idempotent: CREATE … IF NOT EXISTS, never DROP/ALTER/TRUNCATE. */
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

async function init() {
  const client = db();
  try {
    const sql = makeIdempotent(generateDdl());
    await client.executeMultiple(sql);
    const { rows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'law_by_grace_%' ORDER BY name"
    );
    const tables = rows.map((r: any) => String(r.name));
    console.log(`THE LAW With Gracious tables present: ${tables.length}`);
    console.log(`  ${tables.join(", ")}`);
    console.log("Init complete. No non-law_by_grace objects were modified.");
  } finally {
    client.close();
  }
}

loadEnv();
const action = process.argv[2] ?? "inspect";
if (action === "inspect") {
  await inspect();
} else if (action === "verify") {
  await verify();
} else if (action === "init") {
  await init();
} else if (action === "admin") {
  await ensureAdmin();
} else {
  console.error('Unknown action. Use "inspect", "verify", "init" or "admin".');
  process.exit(1);
}
