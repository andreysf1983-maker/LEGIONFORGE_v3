import { WORLD_BOSSES_60 } from "../src/lib/boss-seed";
import fs from "fs";
import path from "path";

function sqlEscape(str: string): string {
  return str.replace(/['\\]/g, (char) => (char === "'" ? "\\'" : "\\\\"));
}

const lines: string[] = [
  "-- ============================================================================",
  "-- LegionForge Custom Content: 60 world mini-bosses scattered across Azeroth",
  "-- ============================================================================",
  "-- Idempotent SQL script for LegionCore-7.3.5V2 world database (build 26124).",
  "-- Reserved Entry ID range: 900001 - 900070.",
  "--",
  "-- Loot rules:",
  "--   1. Guaranteed bulk profession drop (Group 1, 100%): 1000 items (ore, leather, cloth, herbs, enchanting).",
  "--   2. Rare unique drop (Group 2, 0.5% - 3%): unique transmog weapon/armor, mount, pet or upgrade reagent.",
  "--",
  "-- Apply:",
  "--   mariadb --host=127.0.0.1 --port=3307 -u legion -p legion_world < custom/sql/world_bosses.sql",
  "-- ============================================================================",
  "",
  "SET NAMES utf8mb4;",
  "START TRANSACTION;",
  "",
  "DELETE FROM `creature_template` WHERE `entry` BETWEEN 900001 AND 900070;",
  "INSERT INTO `creature_template`",
  "  (`entry`, `name`, `subname`, `minlevel`, `maxlevel`, `faction`, `npcflag`, `speed_walk`, `speed_run`, `scale`, `rank`, `unit_class`, `unit_flags`, `type`, `type_flags`, `RegenHealth`, `AIName`, `ScriptName`)",
  "VALUES",
];

WORLD_BOSSES_60.forEach((b, i) => {
  const isLast = i === WORLD_BOSSES_60.length - 1;
  const rank = b.difficulty === "elite" ? 2 : 1;
  const parts = b.level
    .split("-")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
  const minLvl = parts[0] || 110;
  const maxLvl = parts[1] || minLvl;
  // All bosses share one compact C++ AI (custom/src/LegionForge_WorldBoss.cpp,
  // ScriptName 'npc_world_boss_generic'), so a single script covers every boss.
  const scriptName = "npc_world_boss_generic";
  const subname = `Мини-босс (${b.zone})`;
  lines.push(
    `  (${b.entryId}, '${sqlEscape(b.name)}', '${sqlEscape(subname)}', ${minLvl}, ${maxLvl}, 14, 0, 1.0, 1.2, 1.8, ${rank}, 1, 0, 6, 0, 1, '', '${sqlEscape(scriptName)}')${isLast ? ";" : ","}`
  );
});

lines.push("");
lines.push("DELETE FROM `creature_loot_template` WHERE `Entry` BETWEEN 900001 AND 900070;");
lines.push("INSERT INTO `creature_loot_template`");
lines.push("  (`Entry`, `Item`, `Reference`, `Chance`, `QuestRequired`, `LootMode`, `GroupId`, `MinCount`, `MaxCount`, `Comment`)");
lines.push("VALUES");

WORLD_BOSSES_60.forEach((b, i) => {
  const isLast = i === WORLD_BOSSES_60.length - 1;
  const bulkId = b.bulkItemId || 2318;
  const bulkCount = b.bulkItemCount || 1000;
  const rareId = b.rareItemId || 950001 + i;
  const chance = parseFloat(b.rareDropChance.replace("%", "")) || 1.5;
  lines.push(
    `  (${b.entryId}, ${bulkId}, 0, 100, 0, 1, 1, ${bulkCount}, ${bulkCount}, '${sqlEscape(b.bulkLoot)}'),`,
    `  (${b.entryId}, ${rareId}, 0, ${chance}, 0, 1, 2, 1, 1, '${sqlEscape(b.rareLoot)}')${isLast ? ";" : ","}`
  );
});

lines.push("");
lines.push("COMMIT;");
lines.push("");

const outPath = path.resolve(process.cwd(), "custom/sql/world_bosses.sql");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Successfully wrote", lines.length, "lines to", outPath);
