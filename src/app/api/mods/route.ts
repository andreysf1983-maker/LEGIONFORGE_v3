import { db } from "@/db";
import { modRegistry, type ModEntry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Real integration state for the 7.3.5.26124 build. External AzerothCore
// source trees are intentionally not compiled: compatible behavior is either
// implemented in bundled LegionForge sources or already exists upstream.
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

const SEED: Omit<ModEntry, "installedAt">[] = [
  // NPC Services
  { id: "npc-buffer", category: "NPC Services", name: "NPC Buffer", description: "NPC that applies buffs to players on demand. Removes tedious self-buffing.", repository: "https://github.com/azerothcore/mod-npc-buffer", branch: "master", compatibility: "stable", enabled: false, notes: "Gossip-based buffer NPC. Requires CMake module registration." },
  { id: "npc-enchanter", category: "NPC Services", name: "NPC Enchanter", description: "Creates an NPC that enchants the player's gear with any available enchant.", repository: "https://github.com/azerothcore/mod-npc-enchanter", branch: "master", compatibility: "stable", enabled: false, notes: "Full enchant NPC with category browsing." },
  { id: "npc-beastmaster", category: "NPC Services", name: "NPC Beastmaster", description: "An NPC that lets players tame any beast, customize pet family and appearance.", repository: "https://github.com/azerothcore/mod-npc-beastmaster", branch: "master", compatibility: "stable", enabled: false, notes: "Hunter convenience NPC." },
  { id: "npc-all-mounts", category: "NPC Services", name: "NPC All Mounts", description: "Teaches all available mounts to the player through a single NPC interaction.", repository: "https://github.com/azerothcore/mod-npc-all-mounts", branch: "master", compatibility: "stable", enabled: false, notes: "Mount collection NPC. Configurable mount sets." },
  { id: "npc-services", category: "NPC Services", name: "NPC Services", description: "Combined NPC providing repair, mailbox, auction, gossip and profession services.", repository: "https://github.com/azerothcore/mod-npc-services", branch: "master", compatibility: "stable", enabled: false, notes: "All-in-one convenience NPC." },
  { id: "npc-free-professions", category: "NPC Services", name: "Free Professions", description: "NPC that teaches all primary and secondary professions to maximum skill.", repository: "https://github.com/azerothcore/mod-npc-free-professions", branch: "master", compatibility: "stable", enabled: false, notes: "Profession trainer shortcut." },
  { id: "npc-talent-template", category: "NPC Services", name: "Talent Template NPC", description: "NPC that applies preset talent builds and gear templates per class.", repository: "https://github.com/azerothcore/mod-npc-talent-template", branch: "master", compatibility: "stable", enabled: false, notes: "Quick spec/gear setup for new characters." },
  { id: "npc-spectator", category: "NPC Services", name: "Arena Spectator NPC", description: "NPC allowing players to spectate ongoing arena matches.", repository: "https://github.com/azerothcore/mod-npc-spectator", branch: "master", compatibility: "stable", enabled: false, notes: "PvP entertainment and tournament tool." },
  // Transmog & Cosmetic
  { id: "transmog", category: "Transmog & Cosmetic", name: "Transmogrification", description: "Full transmogrification system based on Rochet2's work. Slot-based appearance changes with persistence.", repository: "https://github.com/azerothcore/mod-transmog", branch: "master", compatibility: "stable", enabled: true, notes: "Core cosmetic module. Free transmog mode compatible." },
  { id: "transmog-plus-ui", category: "Transmog & Cosmetic", name: "Transmog Plus UI", description: "Slot-based transmogrification with per-slot appearance persistence when gear is replaced.", repository: "https://github.com/malinmr/mod-transmog-plus-ui", branch: "master", compatibility: "experimental", enabled: false, notes: "Enhanced UI for transmog. Potential conflict with base mod-transmog." },
  { id: "morphing-flask", category: "Transmog & Cosmetic", name: "Morphing Flask", description: "Custom item that transforms players into random NPC models with a cancelable 30-minute visual buff.", repository: "https://github.com/zyggy123/Morphing-Flask", branch: "master", compatibility: "untested", enabled: false, notes: "Eluna Lua. Fun cosmetic item system." },
  { id: "random-morpher", category: "Transmog & Cosmetic", name: "Random Morpher", description: "Lua-based NPC or item that randomizes player appearance.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "Part of lua-NotOnly-RandomMorpher. Requires Eluna." },
  // PvP
  { id: "1v1-arena", category: "PvP", name: "1v1 Arena", description: "Module enabling dedicated 1v1 arena queues and matchmaking.", repository: "https://github.com/azerothcore/mod-1v1-arena", branch: "master", compatibility: "stable", enabled: false, notes: "Custom arena bracket. Balance depends on class tuning." },
  { id: "cfbg", category: "PvP", name: "Cross-Faction BG", description: "Allows players from both factions to join the same battleground team.", repository: "https://github.com/azerothcore/mod-cfbg", branch: "master", compatibility: "stable", enabled: false, notes: "Reduces queue times dramatically on low-pop servers." },
  { id: "pvp-titles", category: "PvP", name: "PvP Titles", description: "Automatic PvP title assignment based on rating or honor milestones.", repository: "https://github.com/azerothcore/mod-pvp-titles", branch: "master", compatibility: "stable", enabled: false, notes: "Progression reward for PvPers." },
  { id: "pvp-announcer", category: "PvP", name: "PvP Kill Announcer", description: "Announces notable PvP kills server-wide with location and honor info.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "pvp_announcer.lua from Lua scripts collection." },
  { id: "arena-spectator", category: "PvP", name: "Arena Spectator", description: "Full arena spectator system with UI and live match viewing.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "Lua-based arena spectator tools." },
  // Progression & Balance
  { id: "autobalance", category: "Progression & Balance", name: "AutoBalance", description: "Dynamically scales dungeon/raid difficulty based on group size. Enables small groups to clear content.", repository: "https://github.com/azerothcore/mod-autobalance", branch: "master", compatibility: "stable", enabled: true, notes: "Essential for solo/small group play. Highly configurable." },
  { id: "solocraft", category: "Progression & Balance", name: "Solocraft", description: "Scales player power to allow solo completion of group content.", repository: "https://github.com/azerothcore/mod-solocraft", branch: "master", compatibility: "stable", enabled: false, notes: "More aggressive than AutoBalance. Use one or the other." },
  { id: "solo-lfg", category: "Progression & Balance", name: "Solo LFG", description: "Allows queuing for dungeons without a full group.", repository: "https://github.com/azerothcore/mod-solo-lfg", branch: "master", compatibility: "stable", enabled: false, notes: "Pairs well with AutoBalance or Solocraft." },
  { id: "individual-xp", category: "Progression & Balance", name: "Individual XP Rate", description: "Per-player XP rate settings so each player chooses their own leveling speed.", repository: "https://github.com/azerothcore/mod-individual-xp", branch: "master", compatibility: "stable", enabled: false, notes: "Respects slow/fast economy profiles." },
  { id: "level-up-reward", category: "Progression & Balance", name: "Level Up Reward", description: "Rewards players with items or currency when they reach specific levels.", repository: "https://github.com/55Honey/Acore_LevelUpReward", branch: "master", compatibility: "experimental", enabled: false, notes: "Eluna Lua. Pairs with custom currency system." },
  { id: "progression-system", category: "Progression & Balance", name: "Individual Progression", description: "Locks content behind progressive expansion unlocking. Players unlock TBC, WotLK, etc. individually.", repository: "https://github.com/azerothcore/mod-individual-progression", branch: "master", compatibility: "stable", enabled: false, notes: "Enables progressive server experience." },
  // Economy
  { id: "ah-bot", category: "Economy", name: "AH Bot", description: "Autonomous auction house bot that buys and sells items to simulate a living economy.", repository: "https://github.com/azerothcore/mod-ah-bot", branch: "master", compatibility: "stable", enabled: false, notes: "Prevents empty AH on low-pop servers." },
  { id: "junk-to-gold", category: "Economy", name: "Junk to Gold", description: "Automatically sells gray junk items when interacting with a vendor.", repository: "https://github.com/azerothcore/mod-junk-to-gold", branch: "master", compatibility: "stable", enabled: false, notes: "Quality of life. Configurable sell threshold." },
  { id: "black-market-ah", category: "Economy", name: "Black Market Auction House", description: "Implements a Black Market Auction House NPC selling rare items at auction.", repository: "https://github.com/Youpeoples/Black-Market-Auction-House", branch: "master", compatibility: "experimental", enabled: false, notes: "Eluna Lua. End-game economy driver." },
  { id: "lottery", category: "Economy", name: "Lottery System", description: "Server-wide lottery with configurable jackpot, tickets and draw intervals.", repository: "https://github.com/zyggy123/lottery-lua", branch: "master", compatibility: "experimental", enabled: false, notes: "Eluna Lua. Gold sink mechanism." },
  // Playerbots
  { id: "playerbots", category: "Bots", name: "Playerbots", description: "Adds player-like bots that quest, raid, PvP and simulate MMO population. 1.1k stars.", repository: "https://github.com/mod-playerbots/mod-playerbots", branch: "master", compatibility: "stable", enabled: true, notes: "Requires Playerbot branch of AzerothCore. For LegionCore: needs porting." },
  { id: "npcbot-extended", category: "Bots", name: "NPCBot Extended Commands", description: "Extended bot commands including auto-gear, transmog clearing and custom naming.", repository: "https://github.com/Day36512/Npcbot_Extended_Commands", branch: "master", compatibility: "experimental", enabled: false, notes: "Eluna Lua. Works with trickerer's NPCBots." },
  { id: "trinity-bots", category: "Bots", name: "Trinity-Bots (NPCBots)", description: "AI bots that act as party members, with full gear, talents, rotation and role switching.", repository: "https://github.com/trickerer/Trinity-Bots", branch: "master", compatibility: "requires-porting", enabled: false, notes: "3.3.5a origin. LegionCore port requires significant work." },
  // Anti-cheat & Security
  { id: "anticheat", category: "Anti-cheat & Security", name: "Anticheat", description: "Passive anticheat module detecting speed hacks, fly hacks, teleport hacks and other exploits.", repository: "https://github.com/azerothcore/mod-anticheat", branch: "master", compatibility: "stable", enabled: true, notes: "Report-only mode available. Configurable punishment levels." },
  // QoL
  { id: "duel-reset", category: "Quality of Life", name: "Duel Reset", description: "Resets health, mana and cooldowns after a duel finishes.", repository: "https://github.com/azerothcore/mod-duel-reset", branch: "master", compatibility: "stable", enabled: false, notes: "Standard QoL module." },
  { id: "skip-dk", category: "Quality of Life", name: "Skip DK Starting Area", description: "Allows Death Knights to skip the starting zone and begin at level 58/55.", repository: "https://github.com/azerothcore/mod-skip-dk-starting-area", branch: "master", compatibility: "stable", enabled: false, notes: "Time saver for DK alts." },
  { id: "learn-spells", category: "Quality of Life", name: "Auto Learn Spells", description: "Automatically learns class spells on level up without visiting a trainer.", repository: "https://github.com/azerothcore/mod-learn-spells", branch: "master", compatibility: "stable", enabled: false, notes: "Configurable by class and level range." },
  { id: "reagent-bank", category: "Quality of Life", name: "Reagent Bank", description: "Adds a dedicated reagent bank tab to the player bank interface.", repository: "https://github.com/azerothcore/mod-reagent-bank", branch: "master", compatibility: "stable", enabled: false, notes: "QoL for crafters." },
  { id: "world-chat", category: "Quality of Life", name: "World Chat", description: "Global world chat channel accessible to all players across factions.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "world_chat.lua. Community building tool." },
  { id: "boss-announcer", category: "Quality of Life", name: "Boss Kill Announcer", description: "Announces boss kills server-wide with raid name and difficulty.", repository: "https://github.com/azerothcore/mod-boss-announcer", branch: "master", compatibility: "stable", enabled: false, notes: "Motivates PvE competition." },
  { id: "welcome-login", category: "Quality of Life", name: "Welcome on Login", description: "Displays a configurable welcome message when players log in.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "welcomeONLogin.lua. Server branding." },
  // Scripting Engine
  { id: "eluna", category: "Scripting Engine", name: "Eluna Lua Engine", description: "Embedded Lua scripting engine for real-time server scripting without recompilation.", repository: "https://github.com/azerothcore/mod-ale", branch: "master", compatibility: "stable", enabled: false, notes: "Foundation for all Lua-based mods. Requires CMake integration." },
  { id: "eluna-scripts", category: "Scripting Engine", name: "Eluna Script Collection", description: "Massive collection of 60+ Lua scripts: teleporters, vendors, events, QoL, PvP, economy.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "Curated collection. Pick individual scripts to avoid conflicts." },
  { id: "eluna-scripts-alt", category: "Scripting Engine", name: "Eluna Scripts (vhiperdev)", description: "Alternative Lua compilation: buff NPC, teleporter, world chat, PvP announcer, transmog, trainers.", repository: "https://github.com/vhiperdev/AzerothCore-Lua-compilation", branch: "master", compatibility: "experimental", enabled: false, notes: "Overlap with ornfelt collection. Choose one." },
  // Custom Content
  { id: "custom-worldboss", category: "Custom Content", name: "Custom World Bosses", description: "Spawns custom phased world bosses with scripted combat abilities and configurable difficulty.", repository: "https://github.com/55Honey/Acore_eventScripts", branch: "master", compatibility: "experimental", enabled: false, notes: "GM-activated events. Requires Eluna." },
  { id: "exchange-npc", category: "Custom Content", name: "Exchange NPC", description: "NPC that exchanges crafting materials according to configurable rates.", repository: "https://github.com/55Honey/Acore_ExchangeNpc", branch: "master", compatibility: "experimental", enabled: false, notes: "Material trader NPC. Economy stabilizer." },
  { id: "mythic-plus", category: "Custom Content", name: "Mythic+ System", description: "Mythic+ keystone system with scaling difficulty, timers and affixes.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "Acore_Lua_Mythic_Plus. Requires Eluna and careful tuning." },
  { id: "hardcore-mode", category: "Custom Content", name: "Hardcore Mode", description: "Permanent death mode: when a player dies, the character is locked or deleted.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "Lua-HardcoreMode. Niche but popular game mode." },
  { id: "recruit-a-friend", category: "Custom Content", name: "Recruit-a-Friend", description: "Standalone RAF system with XP bonuses, summoning and referral tracking.", repository: "https://github.com/55Honey/Acore_RecruitAFriend", branch: "master", compatibility: "experimental", enabled: false, notes: "Growth mechanic. Requires Eluna." },
  { id: "crime-bounty", category: "Custom Content", name: "Crime Bounty System", description: "Wanted level system that tracks in-game crimes and sends NPC bounty hunters after offending players.", repository: "https://github.com/zyggy123/Crime-Bounty-System", branch: "master", compatibility: "untested", enabled: false, notes: "Eluna Lua. Fun PvP enforcement mechanic." },
  { id: "battlepass", category: "Custom Content", name: "Battle Pass", description: "Seasonal progression system with daily/weekly tasks and tiered rewards.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "lua-battlepass. Engagement mechanic." },
  { id: "paragon-system", category: "Custom Content", name: "Paragon System", description: "Post-max-level prestige reputation system with paragon chests and rewards.", repository: "https://github.com/ornfelt/azerothcore_lua_scripts", branch: "master", compatibility: "experimental", enabled: false, notes: "lua-aio-paragon-system. End-game grind." },
  // Legion-Specific
  { id: "legioncore-reforged", category: "Legion-Specific", name: "LegionCore Reforged", description: "Enhanced LegionCore with Mythic+ fixes, quest markers, legacy honor items. Build 26972.", repository: "https://github.com/Titans-Project/LegionCore-Reforged", branch: "main", compatibility: "requires-porting", enabled: false, notes: "26972 based. Code patterns useful for 26124 porting." },
  { id: "legion-sylvania", category: "Legion-Specific", name: "SylvaniaCore", description: "French Legion 7.3.5 core based on DestinyCore/ArgusCore. Active development.", repository: "https://github.com/BlaMacfly/SylvaniaCore", branch: "main", compatibility: "requires-porting", enabled: false, notes: "Reference for class mechanics and quest fixes." },
  { id: "legion-nordrassil", category: "Legion-Specific", name: "Nordrassil Core 7.3.5", description: "Legion Nordrassil core with custom modifications.", repository: "https://github.com/Legion-Pandaria-Preservation-Project/legion-Nordrassil-core-7.3.5-Gamma", branch: "main", compatibility: "requires-porting", enabled: false, notes: "Additional Legion scripts reference." },
];

async function seedIfNeeded() {
  const existing = await db.select().from(modRegistry).limit(1);
  if (existing.length > 0) return;
  for (const mod of SEED) {
    await db.insert(modRegistry).values(mod).onConflictDoNothing();
  }
}

export async function GET() {
  await seedIfNeeded();
  const rows = await db.select().from(modRegistry).orderBy(modRegistry.category, modRegistry.name);

  const enriched = rows.map((mod) => {
    const integrationStatus = BUNDLED_NATIVE_MOD_IDS.has(mod.id)
      ? "bundled-native"
      : UPSTREAM_CORE_MOD_IDS.has(mod.id)
        ? "upstream-core"
        : "reference-only";
    return {
      ...mod,
      curated: integrationStatus !== "reference-only",
      integrationStatus,
      downloadStatus: integrationStatus,
    };
  });

  return NextResponse.json(enriched);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id: string; enabled?: boolean; notes?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
    updates.installedAt = body.enabled ? new Date() : null;
  }
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  const updated = await db.update(modRegistry).set(updates).where(eq(modRegistry.id, body.id)).returning();
  return NextResponse.json(updated[0] ?? { error: "not found" });
}