import { Pool } from "pg";

// Next.js instrumentation hook: runs once when the production server starts.
// It idempotently ensures the application tables exist so the Control Center
// works even on a fresh database, without relying on an external migrate step.
// Every statement is CREATE TABLE IF NOT EXISTS, so it is safe to run on every
// boot and never touches or drops existing data.
const DDL = `
CREATE TABLE IF NOT EXISTS "shop_items" (
  "id" serial PRIMARY KEY,
  "category" varchar(32) NOT NULL,
  "name" varchar(128) NOT NULL,
  "description" varchar(512) NOT NULL DEFAULT '',
  "price" integer NOT NULL,
  "item_id" integer,
  "quantity" integer NOT NULL DEFAULT 1,
  "delivery" varchar(32) NOT NULL DEFAULT 'item',
  "class_id" integer NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "app_meta" (
  "key" varchar(64) PRIMARY KEY,
  "value" varchar(256) NOT NULL
);
CREATE TABLE IF NOT EXISTS "mod_registry" (
  "id" varchar(96) PRIMARY KEY,
  "category" varchar(48) NOT NULL,
  "name" varchar(128) NOT NULL,
  "description" varchar(512) NOT NULL,
  "repository" varchar(256) NOT NULL,
  "branch" varchar(96) NOT NULL DEFAULT 'master',
  "compatibility" varchar(32) NOT NULL DEFAULT 'untested',
  "enabled" boolean NOT NULL DEFAULT false,
  "installed_at" timestamptz,
  "notes" varchar(1024) NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS "world_boss_registry" (
  "id" varchar(96) PRIMARY KEY,
  "entry_id" integer NOT NULL,
  "name" varchar(128) NOT NULL,
  "zone" varchar(96) NOT NULL,
  "continent" varchar(64) NOT NULL,
  "level" varchar(32) NOT NULL,
  "difficulty" varchar(32) NOT NULL DEFAULT 'mini-boss',
  "respawn_hours" integer NOT NULL DEFAULT 4,
  "mechanic" varchar(256) NOT NULL,
  "bulk_loot" varchar(128) NOT NULL,
  "bulk_item_id" integer NOT NULL DEFAULT 0,
  "bulk_item_count" integer NOT NULL DEFAULT 1000,
  "rare_loot" varchar(256) NOT NULL,
  "rare_item_id" integer NOT NULL DEFAULT 0,
  "rare_drop_chance" varchar(16) NOT NULL DEFAULT '1%',
  "spawn_coords" varchar(128) NOT NULL DEFAULT '',
  "enabled" boolean NOT NULL DEFAULT true,
  "notes" varchar(512) NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS "custom_module_configs" (
  "id" varchar(64) PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "category" varchar(64) NOT NULL,
  "description" varchar(512) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "settings" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "project_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "profile" varchar(64) NOT NULL DEFAULT 'production',
  "config" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
`;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(DDL);
  } catch (error) {
    // Never crash the server on boot because of a transient DB issue; the
    // tables are also created by `drizzle-kit push` during setup.
    console.error("[LegionForge] schema self-heal skipped:", (error as Error).message);
  } finally {
    await pool.end().catch(() => undefined);
  }
}
