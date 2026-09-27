import { boolean, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: varchar("description", { length: 512 }).notNull().default(""),
  price: integer("price").notNull(),
  itemId: integer("item_id"),
  quantity: integer("quantity").notNull().default(1),
  delivery: varchar("delivery", { length: 32 }).notNull().default("item"),
  classId: integer("class_id").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShopItemRow = typeof shopItems.$inferSelect;

export const appMeta = pgTable("app_meta", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: varchar("value", { length: 256 }).notNull(),
});

export type ProjectConfig = {
  projectName: string;
  realmName: string;
  welcomeMessage: string;
  maxLevel: number;
  onlineReward: number;
  onlineRewardMinutes: number;
  legendaryCap: number;
  endgameCap: number;
  currencyId: number;
  economyRate: string;
  modules: Record<string, boolean>;
};

export type ModEntry = {
  id: string;
  category: string;
  name: string;
  description: string;
  repository: string;
  branch: string;
  compatibility: "stable" | "experimental" | "requires-porting" | "untested";
  enabled: boolean;
  installedAt: string | null;
  notes: string;
};

export const modRegistry = pgTable("mod_registry", {
  id: varchar("id", { length: 96 }).primaryKey(),
  category: varchar("category", { length: 48 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  repository: varchar("repository", { length: 256 }).notNull(),
  branch: varchar("branch", { length: 96 }).notNull().default("master"),
  compatibility: varchar("compatibility", { length: 32 }).notNull().default("untested"),
  enabled: boolean("enabled").notNull().default(false),
  installedAt: timestamp("installed_at", { withTimezone: true }),
  notes: varchar("notes", { length: 1024 }).notNull().default(""),
});

export type WorldBossEntry = {
  id: string;
  entryId: number;
  name: string;
  zone: string;
  continent: string;
  level: string;
  difficulty: "elite" | "rare-elite" | "mini-boss";
  respawnHours: number;
  mechanic: string;
  bulkLoot: string;
  bulkItemId?: number;
  bulkItemCount?: number;
  rareLoot: string;
  rareItemId?: number;
  rareDropChance: string;
  spawnCoords?: string;
  enabled: boolean;
  notes: string;
};

export const worldBossRegistry = pgTable("world_boss_registry", {
  id: varchar("id", { length: 96 }).primaryKey(),
  entryId: integer("entry_id").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  zone: varchar("zone", { length: 96 }).notNull(),
  continent: varchar("continent", { length: 64 }).notNull(),
  level: varchar("level", { length: 32 }).notNull(),
  difficulty: varchar("difficulty", { length: 32 }).notNull().default("mini-boss"),
  respawnHours: integer("respawn_hours").notNull().default(4),
  mechanic: varchar("mechanic", { length: 256 }).notNull(),
  bulkLoot: varchar("bulk_loot", { length: 128 }).notNull(),
  bulkItemId: integer("bulk_item_id").notNull().default(0),
  bulkItemCount: integer("bulk_item_count").notNull().default(1000),
  rareLoot: varchar("rare_loot", { length: 256 }).notNull(),
  rareItemId: integer("rare_item_id").notNull().default(0),
  rareDropChance: varchar("rare_drop_chance", { length: 16 }).notNull().default("1%"),
  spawnCoords: varchar("spawn_coords", { length: 128 }).notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  notes: varchar("notes", { length: 512 }).notNull().default(""),
});

export type CustomModuleConfigRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  updatedAt: Date;
};

export const customModuleConfigs = pgTable("custom_module_configs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectSettings = pgTable("project_settings", {
  id: integer("id").primaryKey().default(1),
  profile: varchar("profile", { length: 64 }).notNull().default("production"),
  config: jsonb("config").$type<ProjectConfig>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
