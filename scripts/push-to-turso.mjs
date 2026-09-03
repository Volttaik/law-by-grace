import { readFileSync } from "fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.replace(/['"]/g, "").trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.replace(/['"]/g, "").trim();

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

// ── 1. Drop all existing tables ──────────────────────────────────────────────
console.log("Dropping existing tables...");
const existing = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
const tableNames = existing.rows.map((r) => String(r[0]));
console.log(`  Found ${tableNames.length} tables: ${tableNames.join(", ")}`);

// Disable FK checks so we can drop in any order
// Turso may still raise FK errors; retry until all tables are gone
await client.execute("PRAGMA foreign_keys = OFF");
let remaining = [...tableNames];
let passes = 0;
while (remaining.length > 0 && passes < 10) {
  const failed = [];
  for (const t of remaining) {
    try {
      await client.execute(`DROP TABLE IF EXISTS "${t}"`);
      console.log(`  ✓ Dropped ${t}`);
    } catch (err) {
      if (err.message?.includes("no such table")) {
        console.log(`  ✓ Already gone: ${t}`);
      } else {
        failed.push(t); // retry next pass
      }
    }
  }
  remaining = failed;
  passes++;
}
await client.execute("PRAGMA foreign_keys = ON");
console.log("All old tables dropped.\n");

// ── 2. Push new schema ───────────────────────────────────────────────────────
const sql = readFileSync("/tmp/schema.sql", "utf-8");

const statements = sql
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Executing ${statements.length} statements against Turso...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await client.execute(stmt);
    if ((i + 1) % 10 === 0 || i === statements.length - 1)
      console.log(`  ✓ ${i + 1}/${statements.length}`);
  } catch (err) {
    if (err.message?.includes("already exists")) continue;
    console.error(
      `\n✗ Statement ${i + 1} failed:\n${stmt.slice(0, 200)}\nError: ${err.message}`
    );
    process.exit(1);
  }
}

await client.close();
console.log("\n✅ Schema pushed to Turso successfully!");
