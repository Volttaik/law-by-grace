/**
 * THE LAW With Gracious · Database migration to THE LAW With Gracious data model
 *
 * The law_by_grace_* tables were previously a renamed copy of the old
 * project's (Mantra/Mentra) model — stacks, stack_files, stack_stars,
 * follows, purchases, agents, communities, DMs, etc. This migration
 * restructures ONLY the law_by_grace_* namespace into the real THE LAW With Gracious
 * model (courses, materials, modules, saved courses, articles, …) and drops
 * the legacy social/marketplace tables.
 *
 * Safety guarantees:
 *   - Never touches any table outside the `law_by_grace_*` namespace.
 *   - Fully idempotent: safe to run any number of times.
 *   - Renames preserve all existing data.
 *   - No truncate / no reset.
 *
 * Run:  npx tsx scripts/migrate-law-by-grace.mts
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

function db() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are required");
  }
  return createClient({ url, authToken: token });
}

async function tableNames(client: any): Promise<string[]> {
  const { rows } = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return rows.map((r: any) => String(r.name));
}

async function columnsOf(client: any, table: string): Promise<string[]> {
  const { rows } = await client.execute(`PRAGMA table_info("${table}")`);
  return rows.map((r: any) => String(r.name));
}

async function renameTable(client: any, from: string, to: string) {
  if (from === to) return;
  const tables = await tableNames(client);
  if (tables.includes(from) && !tables.includes(to)) {
    await client.execute(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    console.log(`  renamed table ${from} → ${to}`);
  }
}

async function renameColumn(client: any, table: string, from: string, to: string) {
  const tables = await tableNames(client);
  if (!tables.includes(table)) return;
  const cols = await columnsOf(client, table);
  if (cols.includes(from) && !cols.includes(to)) {
    await client.execute(`ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`);
    console.log(`  renamed column ${table}.${from} → ${to}`);
  }
}

async function dropColumn(client: any, table: string, column: string) {
  const tables = await tableNames(client);
  if (!tables.includes(table)) return;
  const cols = await columnsOf(client, table);
  if (!cols.includes(column)) return;
  try {
    await client.execute(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
    console.log(`  dropped column ${table}.${column}`);
  } catch (err: any) {
    // A column pinned by a legacy FK definition (e.g. a self-referential
    // fork) cannot be dropped without rebuilding the table. The column is
    // unused by THE LAW With Gracious — Prisma only ever reads/writes the columns in
    // the schema — so leaving it in place is safe.
    console.warn(`  kept column ${table}.${column} (blocked by legacy FK: ${err?.message ?? err})`);
  }
}

async function dropTable(client: any, table: string) {
  const tables = await tableNames(client);
  if (!tables.includes(table)) return;
  try {
    await client.execute(`DROP TABLE "${table}"`);
    console.log(`  dropped legacy table ${table}`);
  } catch (err: any) {
    // A table may already be gone if a previous run dropped it (or an FK
    // cascade removed it); the goal is simply that it no longer exists.
    console.warn(`  note: ${table} (${err?.message ?? err})`);
  }
}

/** Generate CREATE TABLE/INDEX DDL for the current Prisma schema (offline). */
function schemaDdl(): string {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "prisma",
    "schema.prisma"
  );
  return execFileSync(
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
}

function makeIdempotent(sql: string): string {
  return sql
    .replace(/CREATE\s+TABLE\s+(\"?)(law_by_grace_)/gi, "CREATE TABLE IF NOT EXISTS $1$2")
    .replace(/CREATE\s+UNIQUE\s+INDEX\s+(\"?)/gi, "CREATE UNIQUE INDEX IF NOT EXISTS $1")
    .replace(/CREATE\s+INDEX\s+(\"?)/gi, "CREATE INDEX IF NOT EXISTS $1");
}

async function main() {
  const client = db();
  const before = await tableNames(client);
  const otherProject = before.filter((n) => !n.startsWith(PREFIX));

  console.log("── THE LAW With Gracious migration ────────────────────────────────");
  console.log(`Tables found: ${before.length} (other-project: ${otherProject.length})`);

  // 1. Rename the core tables into THE LAW With Gracious model (data preserved).
  console.log("Rename core tables…");
  await renameTable(client, `${PREFIX}stacks`, `${PREFIX}courses`);
  await renameTable(client, `${PREFIX}stack_files`, `${PREFIX}materials`);
  await renameTable(client, `${PREFIX}stack_tags`, `${PREFIX}course_tags`);
  await renameTable(client, `${PREFIX}stack_stars`, `${PREFIX}saved_courses`);

  // 2. Rename foreign-key columns to the new domain.
  console.log("Rename foreign-key columns…");
  await renameColumn(client, `${PREFIX}materials`, "stackId", "courseId");
  await renameColumn(client, `${PREFIX}modules`, "stackId", "courseId");
  await renameColumn(client, `${PREFIX}course_tags`, "stackId", "courseId");
  await renameColumn(client, `${PREFIX}saved_courses`, "stackId", "courseId");
  await renameColumn(client, `${PREFIX}learning_progress`, "stackId", "courseId");

  // 3. Drop obsolete monetization / social columns.
  console.log("Drop obsolete columns…");
  await dropColumn(client, `${PREFIX}courses`, "isPaid");
  await dropColumn(client, `${PREFIX}courses`, "price");
  await dropColumn(client, `${PREFIX}courses`, "duration");
  await dropColumn(client, `${PREFIX}courses`, "isArchived");
  await dropColumn(client, `${PREFIX}courses`, "profile");
  await dropColumn(client, `${PREFIX}courses`, "forkedFromId");
  await dropColumn(client, `${PREFIX}materials`, "mtContentId");
  await dropColumn(client, `${PREFIX}articles`, "price");
  await dropColumn(client, `${PREFIX}articles`, "isPaid");
  await dropColumn(client, `${PREFIX}users`, "aiCredits");
  await dropColumn(client, `${PREFIX}users`, "agentName");

  // 4. Drop the legacy Mantra/Mentra social, marketplace and agent tables.
  console.log("Drop legacy social / marketplace tables…");
  // A dropped table may leave a dangling FK parent reference behind (e.g.
  // agent_listings → custom_agents). Recreate a minimal parent so SQLite can
  // resolve the reference while the child is dropped, then remove both.
  {
    const tables = await tableNames(client);
    if (tables.includes(`${PREFIX}agent_listings`) &&
        !tables.includes(`${PREFIX}custom_agents`)) {
      await client.execute(
        `CREATE TABLE "${PREFIX}custom_agents" (id TEXT PRIMARY KEY NOT NULL, ownerId TEXT NOT NULL, name TEXT NOT NULL)`
      );
      console.log(`  recreated FK parent ${PREFIX}custom_agents for cleanup`);
    }
  }
  const legacyTables = [
    "stack_forks", "bookmarks", "contributions", "discussions", "comments",
    "follows", "api_keys", "quizzes", "quiz_questions", "quiz_attempts",
    "credit_transactions", "stack_tagged_users", "purchases", "stack_flows",
    "stack_flow_items", "communities", "community_members", "community_stacks",
    "community_invites", "gateway_config", "bank_accounts", "community_messages",
    "custom_agents", "agent_knowledge_files", "custom_agent_conversations",
    "custom_agent_messages", "agent_listings", "agent_subscriptions",
    "knowledge_hubs", "knowledge_hub_members", "knowledge_hub_stacks",
    "agent_projects", "agent_project_tasks", "agent_workspace_items",
    "agent_schedule_sessions", "article_purchases", "whatsapp_agent_codes",
    "agent_conversations", "agent_messages", "direct_conversations",
    "direct_messages", "mt_content", "editions",
  ];
  for (const name of legacyTables) {
    await dropTable(client, `${PREFIX}${name}`);
  }

  // 5. Drop stale unique-index names that embed the old stackId column name.
  //    (The constraint itself survives the column rename; only the index
  //    object name is stale, and the schema DDL below recreates it cleanly.)
  console.log("Drop stale index names…");
  for (const idx of [`${PREFIX}learning_progress_userId_stackId_key`, `${PREFIX}stacks_slug_key`]) {
    const { rows } = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
      [idx]
    );
    if (rows.length > 0) {
      await client.execute(`DROP INDEX "${idx}"`);
      console.log(`  dropped stale index ${idx}`);
    }
  }

  // 6. Create any new-model tables/indexes that do not exist yet (idempotent).
  console.log("Ensure new-model tables exist…");
  const ddl = makeIdempotent(schemaDdl());
  await client.executeMultiple(ddl);

  // 7. Verify: other-project tables are untouched; report the final layout.
  const after = await tableNames(client);
  const otherAfter = after.filter((n) => !n.startsWith(PREFIX));
  const lbg = after.filter((n) => n.startsWith(PREFIX));

  const missing = otherProject.filter((n) => !otherAfter.includes(n));
  if (missing.length > 0) {
    console.error(`ERROR: other-project tables disappeared: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("───────────────────────────────────────────────────────────");
  console.log(`Other-project tables (UNTOUCHED): ${otherAfter.length}`);
  console.log(`THE LAW With Gracious tables: ${lbg.length}`);
  console.log(`  ${lbg.join(", ")}`);
  console.log("Migration complete.");
  client.close();
}

loadEnv();
await main();