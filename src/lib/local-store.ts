// ============================================================================
// LegionForge — client-side data layer (standalone browser build).
//
// The original panel talks to Next.js API routes backed by PostgreSQL
// (drizzle-orm + pg). In this standalone build the same behavior is
// reproduced in the browser: every endpoint's semantics (seeding, validation,
// clamping, ordering, SQL export) is replicated 1:1 and persisted in
// localStorage, so the panel is fully functional without a server.
//
// The original API route files under src/app/api/* are kept untouched as the
// reference implementation for the Next.js/PostgreSQL deployment.
// ============================================================================

import { validateShopItem } from "./shop";
import { buildBattlePaySql } from "./shop-export";
import { SHOP_SEED } from "./shop-seed";
import { WORLD_BOSSES_60 } from "./boss-seed";
import type { ProjectConfig, ModEntry } from "@/db/schema";

// ----------------------------- storage -------------------------------------

const NS = "legionforge.";

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) — keep working in memory
  }
}

// ----------------------------- types ----------------------------------------

export type ShopItemRow = {
  id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  itemId: number | null;
  quantity: number;
  delivery: string;
  classId: number;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ModRow = ModEntry & { installedAt: string | null };

export type WorldBossRow = {
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
  bulkItemId: number;
  bulkItemCount: number;
  rareLoot: string;
  rareItemId: number;
  rareDropChance: string;
  spawnCoords: string;
  enabled: boolean;
  notes: string;
};

export type CustomModuleRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  updatedAt: string;
};

export type SettingsRow = {
  id: number;
  profile: string;
  config: ProjectConfig;
  updatedAt: string;
};

type ShopDb = { items: ShopItemRow[]; nextId: number };
export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

// --------------------------- /api/settings ----------------------------------

const WAKENING_ESSENCE_ID = 1533;

const DEFAULT_CONFIG: ProjectConfig = {
  projectName: "LegionForge",
  realmName: "Azeroth Reborn",
  welcomeMessage: "Добро пожаловать в Azeroth Reborn! Приключение начинается здесь.",
  maxLevel: 120,
  onlineReward: 50,
  onlineRewardMinutes: 60,
  legendaryCap: 1200,
  endgameCap: 1000,
  currencyId: WAKENING_ESSENCE_ID,
  economyRate: "balanced",
  modules: {
    onlineBonus: true,
    legacySpells: true,
    itemUpgrade: true,
    playerbots: true,
    brokenQuests: true,
    battlepay: true,
    worldBosses: true,
    freeTransmog: true,
  },
};

function getSettingsRow(): SettingsRow {
  let row = load<SettingsRow>("settings");
  if (!row) {
    row = { id: 1, profile: "production", config: DEFAULT_CONFIG, updatedAt: new Date().toISOString() };
    save("settings", row);
  }
  // Migrations: old default project name, and the wrong currency ID 1220
  // (Order Resources) -> 1533 (Wakening Essence, used for legendaries).
  const stored = row.config;
  if (stored.projectName === "AzerothCore 7" || stored.currencyId !== WAKENING_ESSENCE_ID) {
    row = {
      ...row,
      config: {
        ...stored,
        projectName: stored.projectName === "AzerothCore 7" ? "LegionForge" : stored.projectName,
        currencyId: WAKENING_ESSENCE_ID,
      },
      updatedAt: new Date().toISOString(),
    };
    save("settings", row);
  }
  return row;
}

export function readSettings(): SettingsRow {
  return getSettingsRow();
}

export function putSettings(body: Partial<ProjectConfig>): SettingsRow {
  const current = getSettingsRow();
  const config: ProjectConfig = {
    ...current.config,
    ...body,
    modules: { ...current.config.modules, ...(body.modules ?? {}) },
    maxLevel: Math.min(255, Math.max(110, Number(body.maxLevel ?? current.config.maxLevel))),
    onlineReward: Math.min(500, Math.max(0, Number(body.onlineReward ?? current.config.onlineReward))),
    onlineRewardMinutes: Math.min(1440, Math.max(30, Number(body.onlineRewardMinutes ?? current.config.onlineRewardMinutes))),
    legendaryCap: 1200,
    endgameCap: 1000,
    currencyId: WAKENING_ESSENCE_ID,
  };
  const row: SettingsRow = { id: 1, profile: "production", config, updatedAt: new Date().toISOString() };
  save("settings", row);
  return row;
}

// ---------------------------- /api/mods --------------------------------------

const BUNDLED_NATIVE_MOD_IDS = new Set([
  "npc-buffer", "npc-enchanter", "npc-all-mounts", "npc-services",
  "npc-free-professions", "npc-talent-template", "transmog", "transmog-plus-ui",
  "morphing-flask", "random-morpher", "pvp-announcer", "individual-xp",
  "level-up-reward", "junk-to-gold", "black-market-ah", "lottery",
  "playerbots", "npcbot-extended", "trinity-bots", "duel-reset", "world-chat",
  "welcome-login", "custom-worldboss", "exchange-npc", "hardcore-mode",
  "crime-bounty", "battlepass", "paragon-system",
]);

const UPSTREAM_CORE_MOD_IDS = new Set([
  "npc-beastmaster", "npc-spectator", "1v1-arena", "arena-spectator",
  "solocraft", "boss-announcer",
]);

// Mirrors the seed catalog from src/app/api/mods/route.ts
const MODS_SEED: ModEntry[] = [
  { id: "npc-buffer", category: "NPC Services", name: "NPC Buffer", description: "NPC that applies buffs to players on demand. Removes tedious self-buffing.", repository: "https://github.com/azerothcore/mod-npc-buffer", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Gossip-based buffer NPC. Requires CMake module registration." },
  { id: "npc-enchanter", category: "NPC Services", name: "NPC Enchanter", description: "Creates an NPC that enchants the player's gear with any available enchant.", repository: "https://github.com/azerothcore/mod-npc-enchanter", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Full enchant NPC with category browsing." },
  { id: "npc-beastmaster", category: "NPC Services", name: "NPC Beastmaster", description: "An NPC that lets players tame any beast, customize pet family and appearance.", repository: "https://github.com/azerothcore/mod-npc-beastmaster", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Hunter convenience NPC." },
  { id: "npc-all-mounts", category: "NPC Services", name: "NPC All Mounts", description: "Teaches all available mounts to the player through a single NPC interaction.", repository: "https://github.com/azerothcore/mod-npc-all-mounts", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Mount collection NPC. Configurable mount sets." },
  { id: "npc-services", category: "NPC Services", name: "NPC Services", description: "Combined NPC providing repair, mailbox, auction, gossip and profession services.", repository: "https://github.com/azerothcore/mod-npc-services", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "All-in-one convenience NPC." },
  { id: "npc-free-professions", category: "NPC Services", name: "Free Professions", description: "NPC that teaches all primary and secondary professions to maximum skill.", repository: "https://github.com/azerothcore/mod-npc-free-professions", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Profession trainer shortcut." },
  { id: "npc-talent-template", category: "NPC Services", name: "Talent Template NPC", description: "NPC that applies preset talent builds and gear templates per class.", repository: "https://github.com/azerothcore/mod-npc-talent-template", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Quick spec/gear setup for new characters." },
  { id: "npc-spectator", category: "NPC Services", name: "Arena Spectator NPC", description: "NPC allowing players to spectate ongoing arena matches.", repository: "https://github.com/azerothcore/mod-npc-spectator", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "PvP entertainment and tournament tool." },
  { id: "transmog", category: "Transmog & Cosmetic", name: "Transmogrification", description: "Full transmogrification system based on Rochet2's work. Slot-based appearance changes with persistence.", repository: "https://github.com/azerothcore/mod-transmog", branch: "master", compatibility: "stable", enabled: true, installedAt: null, notes: "Core cosmetic module. Free transmog mode compatible." },
  { id: "transmog-plus-ui", category: "Transmog & Cosmetic", name: "Transmog Plus UI", description: "Slot-based transmogrification with per-slot appearance persistence when gear is replaced.", repository: "https://github.com/malinmr/mod-transmog-plus-ui", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Enhanced UI for transmog. Potential conflict with base mod-transmog." },
  { id: "morphing-flask", category: "Transmog & Cosmetic", name: "Morphing Flask", description: "Custom item that transforms players into random NPC models with a cancelable 30-minute visual buff.", repository: "https://github.com/zyggy123/Morphing-Flask", branch: "master", compatibility: "untested", enabled: false, installedAt: null, notes: "Eluna Lua. Fun cosmetic item system." },
  { id: "random-morpher", category: "Transmog & Cosmetic", name: "Random Morpher", description: "Lua-based NPC or item that randomizes player appearance.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Part of lua-NotOnly-RandomMorpher. Requires Eluna." },
  { id: "1v1-arena", category: "PvP", name: "1v1 Arena", description: "Module enabling dedicated 1v1 arena queues and matchmaking.", repository: "https://github.com/azerothcore/mod-1v1-arena", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Custom arena bracket. Balance depends on class tuning." },
  { id: "cfbg", category: "PvP", name: "Cross-Faction BG", description: "Allows players from both factions to join the same battleground team.", repository: "https://github.com/azerothcore/mod-cfbg", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Reduces queue times dramatically on low-pop servers." },
  { id: "pvp-titles", category: "PvP", name: "PvP Titles", description: "Automatic PvP title assignment based on rating or honor milestones.", repository: "https://github.com/azerothcore/mod-pvp-titles", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Progression reward for PvPers." },
  { id: "pvp-announcer", category: "PvP", name: "PvP Kill Announcer", description: "Announces notable PvP kills server-wide with location and honor info.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "pvp_announcer.lua from Lua scripts collection." },
  { id: "arena-spectator", category: "PvP", name: "Arena Spectator", description: "Full arena spectator system with UI and live match viewing.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Lua-based arena spectator tools." },
  { id: "autobalance", category: "Progression & Balance", name: "AutoBalance", description: "Dynamically scales dungeon/raid difficulty based on group size. Enables small groups to clear content.", repository: "https://github.com/azerothcore/mod-autobalance", branch: "master", compatibility: "stable", enabled: true, installedAt: null, notes: "Essential for solo/small group play. Highly configurable." },
  { id: "solocraft", category: "Progression & Balance", name: "Solocraft", description: "Scales player power to allow solo completion of group content.", repository: "https://github.com/azerothcore/mod-solocraft", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "More aggressive than AutoBalance. Use one or the other." },
  { id: "solo-lfg", category: "Progression & Balance", name: "Solo LFG", description: "Allows queuing for dungeons without a full group.", repository: "https://github.com/azerothcore/mod-solo-lfg", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Pairs well with AutoBalance or Solocraft." },
  { id: "individual-xp", category: "Progression & Balance", name: "Individual XP Rate", description: "Per-player XP rate settings so each player chooses their own leveling speed.", repository: "https://github.com/azerothcore/mod-individual-xp", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Respects slow/fast economy profiles." },
  { id: "level-up-reward", category: "Progression & Balance", name: "Level Up Reward", description: "Rewards players with items or currency when they reach specific levels.", repository: "https://github.com/55Honey/Acore_LevelUpReward", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Eluna Lua. Pairs with custom currency system." },
  { id: "progression-system", category: "Progression & Balance", name: "Individual Progression", description: "Locks content behind progressive expansion unlocking. Players unlock TBC, WotLK, etc. individually.", repository: "https://github.com/azerothcore/mod-individual-progression", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Enables progressive server experience." },
  { id: "ah-bot", category: "Economy", name: "AH Bot", description: "Autonomous auction house bot that buys and sells items to simulate a living economy.", repository: "https://github.com/azerothcore/mod-ah-bot", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Prevents empty AH on low-pop servers." },
  { id: "junk-to-gold", category: "Economy", name: "Junk to Gold", description: "Automatically sells gray junk items when interacting with a vendor.", repository: "https://github.com/azerothcore/mod-junk-to-gold", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Quality of life. Configurable sell threshold." },
  { id: "black-market-ah", category: "Economy", name: "Black Market Auction House", description: "Implements a Black Market Auction House NPC selling rare items at auction.", repository: "https://github.com/Youpeoples/Black-Market-Auction-House", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Eluna Lua. End-game economy driver." },
  { id: "lottery", category: "Economy", name: "Lottery System", description: "Server-wide lottery with configurable jackpot, tickets and draw intervals.", repository: "https://github.com/zyggy123/lottery-lua", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Eluna Lua. Gold sink mechanism." },
  { id: "playerbots", category: "Bots", name: "Playerbots", description: "Adds player-like bots that quest, raid, PvP and simulate MMO population. 1.1k stars.", repository: "https://github.com/mod-playerbots/mod-playerbots", branch: "master", compatibility: "stable", enabled: true, installedAt: null, notes: "Requires Playerbot branch of AzerothCore. For LegionCore: needs porting." },
  { id: "npcbot-extended", category: "Bots", name: "NPCBot Extended Commands", description: "Extended bot commands including auto-gear, transmog clearing and custom naming.", repository: "https://github.com/Day36512/Npcbot_Extended_Commands", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Eluna Lua. Works with trickerer's NPCBots." },
  { id: "trinity-bots", category: "Bots", name: "Trinity-Bots (NPCBots)", description: "AI bots that act as party members, with full gear, talents, rotation and role switching.", repository: "https://github.com/trickerer/Trinity-Bots", branch: "master", compatibility: "requires-porting", enabled: false, installedAt: null, notes: "3.3.5a origin. LegionCore port requires significant work." },
  { id: "anticheat", category: "Anti-cheat & Security", name: "Anticheat", description: "Passive anticheat module detecting speed hacks, fly hacks, teleport hacks and other exploits.", repository: "https://github.com/azerothcore/mod-anticheat", branch: "master", compatibility: "stable", enabled: true, installedAt: null, notes: "Report-only mode available. Configurable punishment levels." },
  { id: "duel-reset", category: "Quality of Life", name: "Duel Reset", description: "Resets health, mana and cooldowns after a duel finishes.", repository: "https://github.com/azerothcore/mod-duel-reset", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Standard QoL module." },
  { id: "skip-dk", category: "Quality of Life", name: "Skip DK Starting Area", description: "Allows Death Knights to skip the starting zone and begin at level 58/55.", repository: "https://github.com/azerothcore/mod-skip-dk-starting-area", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Time saver for DK alts." },
  { id: "learn-spells", category: "Quality of Life", name: "Auto Learn Spells", description: "Automatically learns class spells on level up without visiting a trainer.", repository: "https://github.com/azerothcore/mod-learn-spells", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Configurable by class and level range." },
  { id: "reagent-bank", category: "Quality of Life", name: "Reagent Bank", description: "Adds a dedicated reagent bank tab to the player bank interface.", repository: "https://github.com/azerothcore/mod-reagent-bank", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "QoL for crafters." },
  { id: "world-chat", category: "Quality of Life", name: "World Chat", description: "Global world chat channel accessible to all players across factions.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "world_chat.lua. Community building tool." },
  { id: "boss-announcer", category: "Quality of Life", name: "Boss Kill Announcer", description: "Announces boss kills server-wide with raid name and difficulty.", repository: "https://github.com/azerothcore/mod-boss-announcer", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Motivates PvE competition." },
  { id: "welcome-login", category: "Quality of Life", name: "Welcome on Login", description: "Displays a configurable welcome message when players log in.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "welcomeONLogin.lua. Server branding." },
  { id: "eluna", category: "Scripting Engine", name: "Eluna Lua Engine", description: "Embedded Lua scripting engine for real-time server scripting without recompilation.", repository: "https://github.com/azerothcore/mod-ale", branch: "master", compatibility: "stable", enabled: false, installedAt: null, notes: "Foundation for all Lua-based mods. Requires CMake integration." },
  { id: "eluna-scripts", category: "Scripting Engine", name: "Eluna Script Collection", description: "Massive collection of 60+ Lua scripts: teleporters, vendors, events, QoL, PvP, economy.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Curated collection. Pick individual scripts to avoid conflicts." },
  { id: "eluna-scripts-alt", category: "Scripting Engine", name: "Eluna Scripts (vhiperdev)", description: "Alternative Lua compilation: buff NPC, teleporter, world chat, PvP announcer, transmog, trainers.", repository: "https://github.com/vhiperdev/AzerothCore-Lua-compilation", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Overlap with ornfelt collection. Choose one." },
  { id: "custom-worldboss", category: "Custom Content", name: "Custom World Bosses", description: "Spawns custom phased world bosses with scripted combat abilities and configurable difficulty.", repository: "https://github.com/55Honey/Acore_eventScripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "GM-activated events. Requires Eluna." },
  { id: "exchange-npc", category: "Custom Content", name: "Exchange NPC", description: "NPC that exchanges crafting materials according to configurable rates.", repository: "https://github.com/55Honey/Acore_ExchangeNpc", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Material trader NPC. Economy stabilizer." },
  { id: "mythic-plus", category: "Custom Content", name: "Mythic+ System", description: "Mythic+ keystone system with scaling difficulty, timers and affixes.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Acore_Lua_Mythic_Plus. Requires Eluna and careful tuning." },
  { id: "hardcore-mode", category: "Custom Content", name: "Hardcore Mode", description: "Permanent death mode: when a player dies, the character is locked or deleted.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Lua-HardcoreMode. Niche but popular game mode." },
  { id: "recruit-a-friend", category: "Custom Content", name: "Recruit-a-Friend", description: "Standalone RAF system with XP bonuses, summoning and referral tracking.", repository: "https://github.com/55Honey/Acore_RecruitAFriend", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "Growth mechanic. Requires Eluna." },
  { id: "crime-bounty", category: "Custom Content", name: "Crime Bounty System", description: "Wanted level system that tracks in-game crimes and sends NPC bounty hunters after offending players.", repository: "https://github.com/zyggy123/Crime-Bounty-System", branch: "master", compatibility: "untested", enabled: false, installedAt: null, notes: "Eluna Lua. Fun PvP enforcement mechanic." },
  { id: "battlepass", category: "Custom Content", name: "Battle Pass", description: "Seasonal progression system with daily/weekly tasks and tiered rewards.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "lua-battlepass. Engagement mechanic." },
  { id: "paragon-system", category: "Custom Content", name: "Paragon System", description: "Post-max-level prestige reputation system with paragon chests and rewards.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, installedAt: null, notes: "lua-aio-paragon-system. End-game grind." },
  { id: "legioncore-reforged", category: "Legion-Specific", name: "LegionCore Reforged", description: "Enhanced LegionCore with Mythic+ fixes, quest markers, legacy honor items. Build 26972.", repository: "https://github.com/Titans-Project/LegionCore-Reforged", branch: "main", compatibility: "requires-porting", enabled: false, installedAt: null, notes: "26972 based. Code patterns useful for 26124 porting." },
  { id: "legion-sylvania", category: "Legion-Specific", name: "SylvaniaCore", description: "French Legion 7.3.5 core based on DestinyCore/ArgusCore. Active development.", repository: "https://github.com/BlaMacfly/SylvaniaCore", branch: "main", compatibility: "requires-porting", enabled: false, installedAt: null, notes: "Reference for class mechanics and quest fixes." },
  { id: "legion-nordrassil", category: "Legion-Specific", name: "Nordrassil Core 7.3.5", description: "Legion Nordrassil core with custom modifications.", repository: "https://github.com/Legion-Pandaria-Preservation-Project/legion-Nordrassil-core-7.3.5-Gamma", branch: "main", compatibility: "requires-porting", enabled: false, installedAt: null, notes: "Additional Legion scripts reference." },
];

function seedModsIfEmpty(): void {
  const existing = load<ModRow[]>("mods");
  if (existing && existing.length > 0) return;
  save("mods", MODS_SEED);
}

function integrationStatusOf(id: string): "bundled-native" | "upstream-core" | "reference-only" {
  if (BUNDLED_NATIVE_MOD_IDS.has(id)) return "bundled-native";
  if (UPSTREAM_CORE_MOD_IDS.has(id)) return "upstream-core";
  return "reference-only";
}

export function listMods(): ModRow[] {
  seedModsIfEmpty();
  const rows = load<ModRow[]>("mods") ?? [];
  const sorted = [...rows].sort(
    (a, b) => a.category.localeCompare(b.category, "ru") || a.name.localeCompare(b.name, "ru"),
  );
  return sorted.map((mod) => {
    const integrationStatus = integrationStatusOf(mod.id);
    return { ...mod, curated: integrationStatus !== "reference-only", integrationStatus, downloadStatus: integrationStatus };
  });
}

export function patchMod(body: { id?: string; enabled?: boolean; notes?: string }): Result<ModRow> {
  if (!body.id) return { ok: false, error: "id is required", status: 400 };
  const rows = load<ModRow[]>("mods") ?? [];
  const idx = rows.findIndex((m) => m.id === body.id);
  if (idx === -1) return { ok: false, error: "not found", status: 404 };

  const updates: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
    updates.installedAt = body.enabled ? new Date().toISOString() : null;
  }
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (Object.keys(updates).length === 0) return { ok: false, error: "nothing to update", status: 400 };

  const updated = { ...rows[idx], ...updates };
  rows[idx] = updated;
  save("mods", rows);
  return { ok: true, value: updated };
}

// ---------------------------- /api/shop --------------------------------------

function shopDb(): ShopDb {
  let db = load<ShopDb>("shop");
  if (!db) {
    const now = new Date().toISOString();
    const items: ShopItemRow[] = SHOP_SEED.map((s, i) => ({
      id: i + 1,
      category: s.category,
      name: s.name,
      description: s.description,
      price: s.price,
      itemId: s.itemId,
      quantity: s.quantity,
      delivery: s.delivery,
      classId: s.classId,
      enabled: s.enabled,
      sortOrder: s.sortOrder,
      createdAt: now,
      updatedAt: now,
    }));
    db = { items, nextId: items.length + 1 };
    save("shop", db);
  }
  return db;
}

function shopSorted(db: ShopDb): ShopItemRow[] {
  return [...db.items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export function listShopItems(): ShopItemRow[] {
  return shopSorted(shopDb());
}

export function createShopItem(body: unknown): Result<ShopItemRow> {
  const result = validateShopItem(body);
  if (!result.ok) return { ok: false, error: result.error, status: 400 };
  const db = shopDb();
  const now = new Date().toISOString();
  const row: ShopItemRow = {
    id: db.nextId,
    category: result.value.category,
    name: result.value.name,
    description: result.value.description,
    price: result.value.price,
    itemId: result.value.itemId,
    quantity: result.value.quantity,
    delivery: result.value.delivery,
    classId: result.value.classId,
    enabled: result.value.enabled,
    sortOrder: result.value.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  db.items.push(row);
  db.nextId += 1;
  save("shop", db);
  return { ok: true, value: row };
}

export function patchShopItem(id: number, body: Record<string, unknown>): Result<ShopItemRow> {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректные данные товара", status: 400 };
  const db = shopDb();
  const idx = db.items.findIndex((i) => i.id === id);
  if (idx === -1) return { ok: false, error: "Товар не найден", status: 404 };
  // Partial updates are merged with the stored row and validated as a whole,
  // so cross-field rules (services have no item ID) always hold.
  const merged = { ...db.items[idx], ...body };
  const result = validateShopItem(merged);
  if (!result.ok) return { ok: false, error: result.error, status: 400 };
  const updated: ShopItemRow = {
    ...db.items[idx],
    ...result.value,
    createdAt: db.items[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  db.items[idx] = updated;
  save("shop", db);
  return { ok: true, value: updated };
}

export function deleteShopItem(id: number): Result<{ ok: boolean; id: number }> {
  const db = shopDb();
  const idx = db.items.findIndex((i) => i.id === id);
  if (idx === -1) return { ok: false, error: "Товар не найден", status: 404 };
  db.items.splice(idx, 1);
  save("shop", db);
  return { ok: true, value: { ok: true, id } };
}

export function buildShopSql(): string {
  return buildBattlePaySql(listShopItems(), new Date());
}

// ------------------------ /api/world-bosses ----------------------------------

function bossDb(): WorldBossRow[] {
  let rows = load<WorldBossRow[]>("bosses");
  if (!rows) {
    rows = WORLD_BOSSES_60.map((b) => ({ ...b }));
    save("bosses", rows);
  }
  return rows;
}

export function listWorldBosses(): WorldBossRow[] {
  const rows = bossDb();
  return [...rows].sort(
    (a, b) =>
      a.continent.localeCompare(b.continent, "ru") ||
      a.zone.localeCompare(b.zone, "ru") ||
      a.entryId - b.entryId,
  );
}

export function createWorldBoss(body: Record<string, unknown>): Result<WorldBossRow> {
  if (!body.name || !body.zone || !body.continent) {
    return { ok: false, error: "Укажите имя, зону и континент босса", status: 400 };
  }
  const entryId = Number(body.entryId) || Math.floor(900000 + Math.random() * 90000);
  const id = (typeof body.id === "string" && body.id.trim() ? body.id.trim() : `custom-boss-${entryId}-${Date.now().toString(36)}`);

  const newBoss: WorldBossRow = {
    id,
    entryId,
    name: String(body.name).trim(),
    zone: String(body.zone).trim(),
    continent: String(body.continent).trim(),
    level: body.level ? String(body.level).trim() : "110",
    difficulty: (body.difficulty || "mini-boss") as WorldBossRow["difficulty"],
    respawnHours: Math.max(1, Math.min(72, Number(body.respawnHours) || 4)),
    mechanic: body.mechanic ? String(body.mechanic).trim() : "Обычные атаки и способности",
    bulkLoot: body.bulkLoot ? String(body.bulkLoot).trim() : "Профессиональные материалы x1000",
    bulkItemId: Number(body.bulkItemId) || 0,
    bulkItemCount: Number(body.bulkItemCount) || 1000,
    rareLoot: body.rareLoot ? String(body.rareLoot).trim() : "Уникальный предмет",
    rareItemId: Number(body.rareItemId) || 0,
    rareDropChance: body.rareDropChance ? String(body.rareDropChance).trim() : "1%",
    spawnCoords: body.spawnCoords ? String(body.spawnCoords).trim() : "",
    enabled: body.enabled !== false,
    notes: body.notes ? String(body.notes).trim() : "",
  };
  const rows = bossDb();
  rows.push(newBoss);
  save("bosses", rows);
  return { ok: true, value: newBoss };
}

export function patchWorldBoss(body: Record<string, unknown>): Result<WorldBossRow> {
  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return { ok: false, error: "id обязателен", status: 400 };

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.zone === "string") updates.zone = body.zone.trim();
  if (typeof body.continent === "string") updates.continent = body.continent.trim();
  if (typeof body.level === "string") updates.level = body.level.trim();
  if (typeof body.difficulty === "string") updates.difficulty = body.difficulty;
  if (typeof body.respawnHours === "number") updates.respawnHours = Math.max(1, Math.min(72, body.respawnHours));
  if (typeof body.mechanic === "string") updates.mechanic = body.mechanic.trim();
  if (typeof body.bulkLoot === "string") updates.bulkLoot = body.bulkLoot.trim();
  if (typeof body.bulkItemId === "number") updates.bulkItemId = body.bulkItemId;
  if (typeof body.bulkItemCount === "number") updates.bulkItemCount = body.bulkItemCount;
  if (typeof body.rareLoot === "string") updates.rareLoot = body.rareLoot.trim();
  if (typeof body.rareItemId === "number") updates.rareItemId = body.rareItemId;
  if (typeof body.rareDropChance === "string") updates.rareDropChance = body.rareDropChance.trim();
  if (typeof body.spawnCoords === "string") updates.spawnCoords = body.spawnCoords.trim();
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (typeof body.notes === "string") updates.notes = body.notes.trim();

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Нет данных для обновления", status: 400 };
  }

  const rows = bossDb();
  const idx = rows.findIndex((b) => b.id === id);
  if (idx === -1) return { ok: false, error: "Босс не найден", status: 404 };
  const updated = { ...rows[idx], ...updates };
  rows[idx] = updated;
  save("bosses", rows);
  return { ok: true, value: updated };
}

export function deleteWorldBoss(id: string): Result<{ ok: boolean; id: string }> {
  if (!id) return { ok: false, error: "id обязателен", status: 400 };
  const rows = bossDb();
  const idx = rows.findIndex((b) => b.id === id);
  if (idx === -1) return { ok: false, error: "Босс не найден", status: 404 };
  rows.splice(idx, 1);
  save("bosses", rows);
  return { ok: true, value: { ok: true, id } };
}

// SQL export — identical format to src/app/api/world-bosses/export/route.ts
function sqlEscape(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%": return "\\" + char;
      default: return char;
    }
  });
}

export function buildWorldBossesSql(): string {
  const bosses = [...bossDb()].sort((a, b) => a.entryId - b.entryId);
  const lines: string[] = [
    "-- ============================================================================",
    "-- LegionForge Custom Content: 60 World Mini-Bosses across Azeroth",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total configured bosses: ${bosses.length}`,
    "-- Target: LegionCore-7.3.5V2 world database, client 7.3.5.26124",
    "-- Reserved Custom ID Range: 900001 - 900070",
    "--",
    "-- Import: mariadb --host=127.0.0.1 --port=3307 -u legion -p legion_world < world_bosses.sql",
    "-- Apply:  .reload creature_template and .reload creature_loot_template in game",
    "-- ============================================================================",
    "",
    "SET NAMES utf8mb4;",
    "START TRANSACTION;",
    "",
    "-- 1. Clean existing custom boss templates in range 900001 - 900100",
    "DELETE FROM `creature_template` WHERE `entry` BETWEEN 900001 AND 900100;",
    "INSERT INTO `creature_template`",
    "  (`entry`, `name`, `subname`, `minlevel`, `maxlevel`, `faction`, `npcflag`, `speed_walk`, `speed_run`, `scale`, `rank`, `unit_class`, `unit_flags`, `type`, `type_flags`, `RegenHealth`, `AIName`, `ScriptName`)",
    "VALUES",
  ];

  const templateRows = bosses.map((b, i) => {
    const isLast = i === bosses.length - 1;
    const rank = b.difficulty === "elite" ? 2 : b.difficulty === "rare-elite" ? 1 : 1;
    const levels = b.level.split("-").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    const minLvl = levels[0] || 110;
    const maxLvl = levels[1] || minLvl;
    const scriptName = `boss_${b.id.replace(/-/g, "_")}`;
    const subname = `Мини-босс (${b.zone})`;
    return `  (${b.entryId}, '${sqlEscape(b.name)}', '${sqlEscape(subname)}', ${minLvl}, ${maxLvl}, 14, 0, 1.0, 1.2, 1.8, ${rank}, 1, 0, 6, 0, 1, '', '${sqlEscape(scriptName)}')${isLast ? ";" : ","}`;
  });

  lines.push(...templateRows);
  lines.push("");
  lines.push("-- 2. Clean and populate creature_loot_template (Bulk reagent Group 1, Unique rare drop Group 2)");
  lines.push("DELETE FROM `creature_loot_template` WHERE `Entry` BETWEEN 900001 AND 900100;");
  lines.push("INSERT INTO `creature_loot_template`");
  lines.push("  (`Entry`, `Item`, `Reference`, `Chance`, `QuestRequired`, `LootMode`, `GroupId`, `MinCount`, `MaxCount`, `Comment`)");
  lines.push("VALUES");

  const lootRows: string[] = [];
  bosses.forEach((b, i) => {
    const isLastBoss = i === bosses.length - 1;
    const bulkId = b.bulkItemId || 2318;
    const bulkCount = b.bulkItemCount || 1000;
    const rareId = b.rareItemId || 950001 + i;
    const chance = parseFloat(b.rareDropChance.replace("%", "")) || 1.5;
    lootRows.push(
      `  (${b.entryId}, ${bulkId}, 0, 100, 0, 1, 1, ${bulkCount}, ${bulkCount}, '${sqlEscape(b.bulkLoot)}'),`,
      `  (${b.entryId}, ${rareId}, 0, ${chance}, 0, 1, 2, 1, 1, '${sqlEscape(b.rareLoot)}')${isLastBoss ? ";" : ","}`,
    );
  });

  lines.push(...lootRows);
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

// ----------------------- /api/custom-modules ---------------------------------

// Mirrors the default module configs from src/app/api/custom-modules/route.ts
const DEFAULT_MODULES: CustomModuleRow[] = [
  {
    id: "onlineBonus",
    name: "Бонус за онлайн (Online Bonus)",
    category: "Экономика и сервер",
    description: "Автоматическая выдача валюты активным игрокам раз в заданный интервал.",
    enabled: true,
    settings: {
      rewardAmount: 50,
      intervalMinutes: 60,
      currencyId: 1533,
      currencyName: "Сущность пробуждения",
      minLevel: 10,
      afkCheck: true,
      announceToPlayer: true,
      announceMessage: "Вы получили +50 Сущностей Пробуждения за 1 час активной игры!",
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "itemUpgrade",
    name: "Улучшение экипировки (Item Upgrade Chain)",
    category: "Предметы и прогресс",
    description: "Прокачка легендарных предметов до 1200 ilvl и эндгейм-вещей 985→1000 ilvl.",
    enabled: true,
    settings: {
      legendaryItemUpgradeId: 950030,
      legendaryItemUpgradeName: "Концентрат силы",
      legendaryStep: 5,
      legendaryCap: 1200,
      endgameItemUpgradeId: 950031,
      endgameItemUpgradeName: "Эссенция закалки",
      endgameMinIlvl: 985,
      endgameCap: 1000,
      costCurrencyId: 1533,
      costEssences: 800,
      preserveSockets: true,
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "legacySpells",
    name: "Возвращение Legacy-способностей",
    category: "Классы и способности",
    description: "Обучение удаленным способностям через тома с проверкой класса игрока.",
    enabled: true,
    settings: {
      trainerNpcEntry: 900100,
      trainerNpcName: "Хранитель Забытых Знаний",
      tomeCost: 5000,
      tomeCurrencyId: 1533,
      enforceClassCheck: true,
      spells: [
        { id: 1, name: "Метаморфоза (Демонология)", classId: 9, className: "Чернокнижник", spellId: 103958, tomeItemId: 950101, note: "Возвращает форму демона и демоническую ярость" },
        { id: 2, name: "Темная душа", classId: 9, className: "Чернокнижник", spellId: 113858, tomeItemId: 950102, note: "+30% силы заклинаний на 20 сек" },
        { id: 3, name: "Аспект стаи", classId: 3, className: "Охотник", spellId: 13159, tomeItemId: 950103, note: "Ускорение группы на 30%" },
        { id: 4, name: "Раскаленный доспех", classId: 8, className: "Маг", spellId: 30482, tomeItemId: 950104, note: "Огненная броня мага с критом" },
        { id: 5, name: "Чародейская гениальность", classId: 8, className: "Маг", spellId: 1459, tomeItemId: 950105, note: "Групповой бафф +10% интеллекта" },
        { id: 6, name: "Печать правды", classId: 2, className: "Паладин", spellId: 31801, tomeItemId: 950106, note: "Урон Светом при атаках" },
        { id: 7, name: "Экзорцизм", classId: 2, className: "Паладин", spellId: 879, tomeItemId: 950107, note: "Мгновенный удар Светом" },
        { id: 8, name: "Пронзание разума", classId: 5, className: "Жрец", spellId: 73510, tomeItemId: 950108, note: "Прямой урон Тьмой" },
        { id: 9, name: "Боевой крик", classId: 1, className: "Воин", spellId: 6673, tomeItemId: 950109, note: "+10% силы атаки группе" },
        { id: 10, name: "Опаляющий тотем", classId: 7, className: "Шаман", spellId: 3599, tomeItemId: 950110, note: "Огненный боевой тотем" },
        { id: 11, name: "Власть крови", classId: 6, className: "Рыцарь смерти", spellId: 48263, tomeItemId: 950111, note: "Увеличение урона и вампиризм" },
        { id: 12, name: "Знак дикой природы", classId: 11, className: "Друид", spellId: 1126, tomeItemId: 950112, note: "+5% характеристик рейду" },
        { id: 13, name: "Наследие императора", classId: 10, className: "Монах", spellId: 115921, tomeItemId: 950113, note: "+5% характеристик рейду" },
      ],
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "playerbots",
    name: "Система ИИ-ботов (Playerbot AI Integration)",
    category: "Искусственный интеллект",
    description: "Интеллектуальные боты для групп, рейдов, дуэлей, Арен и Полей Боя.",
    enabled: true,
    settings: {
      botPoolCount: 128,
      autoJoinLeaderGroup: true,
      autoAssistLeader: true,
      useCrowdControl: true,
      fillBgSlots: true,
      fillArenaSlots: true,
      chatIntervalMin: 120,
      chatIntervalMax: 240,
      namesCount: 80,
      names: [
        "Александр", "Дмитрий", "Максим", "Сергей", "Андрей", "Алексей", "Артем", "Илья", "Кирилл", "Михаил",
        "Никита", "Матвей", "Роман", "Егор", "Арсений", "Иван", "Денис", "Евгений", "Даниил", "Тимофей",
        "Владислав", "Игорь", "Глеб", "Марк", "Ярослав", "Богдан", "Олег", "Виктор", "Антон", "Константин",
        "Анна", "Мария", "Елена", "Дарья", "Алина", "Ирина", "Екатерина", "Арина", "Полина", "Ольга",
        "Юлия", "Татьяна", "Наталья", "Виктория", "Ксения", "Светлана", "Валерия", "Алиса", "София", "Вероника",
        "Диана", "Елизавета", "Анастасия", "Кристина", "Варвара", "Милана", "Яна", "Надежда", "Любовь", "Марина",
        "Ярополк", "Святослав", "Радомир", "Добрыня", "Любомир", "Владимир", "Всеволод", "Мстислав", "Ростислав", "Борислав",
        "Станислав", "Вячеслав", "Мирослав", "Бронислав", "Яромир", "Святозар", "Велимир", "Ратибор", "Горыня", "Любава",
      ],
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "brokenQuests",
    name: "Обработка битых квестов (Auto-Complete)",
    category: "Квесты и мир",
    description: "Мгновенное автозавершение известных багнутых квестов с выдачей наград.",
    enabled: true,
    settings: {
      autoCompleteOnAccept: true,
      notifyPlayer: true,
      compensationEssences: 25,
      notificationText: "Квест автоматически засчитан из-за технической ошибки сервера (награда и компенсация выданы).",
      questIds: [
        { id: 10280, title: "Уничтожить кузницу лагеря", note: "Проблема фазирования мобов" },
        { id: 11524, title: "План побега из Даларана", note: "Застревание скрипта эскорта" },
        { id: 12056, title: "Кровь Древнего Бога", note: "Отсутствует спавн триггера" },
        { id: 13188, title: "Битва у Врат Ангратара", note: "Прерывание кинематика 7.3.5" },
        { id: 25444, title: "Пески Времени Ульдума", note: "Смерть фазового транспорта" },
        { id: 37450, title: "Оплот класса: Первая миссия", note: "Баг интерфейса соратников" },
        { id: 40519, title: "Врата в Мардум", note: "Зависание портала Охотников на демонов" },
        { id: 42880, title: "Испытание Валоджара", note: "Сброс прогресса эвента Одина" },
        { id: 44280, title: "Глаз Азшары: Месть моря", note: "Триггер ритуала наг не срабатывает" },
        { id: 47220, title: "Аргус: Прорыв в Крокуун", note: "Баг фазы посадки на Виндикар" },
      ],
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "freeTransmog",
    name: "Свободный трансмог (Cross-Armor / Cross-Weapon)",
    category: "Кастомизация",
    description: "Разрешает трансмогрификацию любых типов брони (латы в ткань) и оружия.",
    enabled: true,
    settings: {
      allowCrossArmor: true,
      allowCrossWeapon: true,
      ignoreClassRequirement: true,
      ignoreLevelRequirement: true,
      allowLegendaryTransmog: true,
      costMultiplier: 1.0,
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "battlepay",
    name: "Внутриигровой магазин (BattlePay W-Key)",
    category: "Экономика и сервер",
    description: "Интеграция каталога в клиентское окно Blizzard Store (кнопка W).",
    enabled: true,
    settings: {
      shopEnabled: true,
      openWithWKey: true,
      currencyId: 1533,
      currencyName: "Сущность пробуждения",
      allowCharacterServices: true,
      allowFactionChange: true,
      bannerMessage: "Добро пожаловать в магазин LegionForge! Цены в Сущностях Пробуждения.",
    },
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "worldBosses",
    name: "60 мировых мини-боссов (World Bosses)",
    category: "PvE и мир",
    description: "Динамическое масштабирование и управление спавном 60 мировых боссов.",
    enabled: true,
    settings: {
      totalBosses: 60,
      dynamicScaling: true,
      scaleFactorPerPlayer: 0.15,
      minPlayersForFullScaling: 5,
      announceGlobalSpawn: true,
      announceGlobalDefeat: true,
      guaranteedBulkDrop: true,
      bulkQuantity: 1000,
    },
    updatedAt: new Date(0).toISOString(),
  },
];

function seedModulesIfMissing(): void {
  const existing = load<CustomModuleRow[]>("modules") ?? [];
  if (existing.length >= DEFAULT_MODULES.length) return;
  const known = new Set(existing.map((m) => m.id));
  for (const mod of DEFAULT_MODULES) {
    if (!known.has(mod.id)) existing.push({ ...mod });
  }
  save("modules", existing);
}

export function listCustomModules(): CustomModuleRow[] {
  seedModulesIfMissing();
  return load<CustomModuleRow[]>("modules") ?? [];
}

export function patchCustomModule(body: { id?: string; enabled?: boolean; settings?: Record<string, unknown> }): Result<CustomModuleRow> {
  if (!body.id) return { ok: false, error: "id обязателен", status: 400 };
  const rows = load<CustomModuleRow[]>("modules") ?? [];
  const idx = rows.findIndex((m) => m.id === body.id);
  if (idx === -1) return { ok: false, error: "Модуль не найден", status: 404 };

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.settings && typeof body.settings === "object") {
    updates.settings = { ...rows[idx].settings, ...body.settings };
  }

  const updated = { ...rows[idx], ...updates };
  rows[idx] = updated;
  save("modules", rows);
  return { ok: true, value: updated };
}
