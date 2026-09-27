import { db } from "@/db";
import { worldBossRegistry } from "@/db/schema";
import { ensureWorldBossesSeeded } from "@/lib/boss-store";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function sqlEscape(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });
}

export async function GET() {
  await ensureWorldBossesSeeded();
  const bosses = await db
    .select()
    .from(worldBossRegistry)
    .orderBy(asc(worldBossRegistry.entryId));

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
      `  (${b.entryId}, ${rareId}, 0, ${chance}, 0, 1, 2, 1, 1, '${sqlEscape(b.rareLoot)}')${isLastBoss ? ";" : ","}`
    );
  });

  lines.push(...lootRows);
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": 'attachment; filename="world_bosses.sql"',
      "Cache-Control": "no-store",
    },
  });
}
