import { db } from "@/db";
import { worldBossRegistry } from "@/db/schema";
import { WORLD_BOSSES_60 } from "./boss-seed";

/**
 * Idempotently seeds the world-boss registry from the curated 60-boss list.
 * Shared by both the list API and the SQL export API so that exporting the
 * bosses works even if the list view was never opened first.
 */
export async function ensureWorldBossesSeeded(): Promise<void> {
  const existing = await db.select({ id: worldBossRegistry.id }).from(worldBossRegistry);
  if (existing.length >= WORLD_BOSSES_60.length) return;

  for (const boss of WORLD_BOSSES_60) {
    await db
      .insert(worldBossRegistry)
      .values({
        ...boss,
        bulkItemId: boss.bulkItemId,
        bulkItemCount: boss.bulkItemCount,
        rareItemId: boss.rareItemId,
        spawnCoords: boss.spawnCoords,
      })
      .onConflictDoUpdate({
        target: worldBossRegistry.id,
        set: {
          name: boss.name,
          zone: boss.zone,
          continent: boss.continent,
          level: boss.level,
          difficulty: boss.difficulty,
          respawnHours: boss.respawnHours,
          mechanic: boss.mechanic,
          bulkLoot: boss.bulkLoot,
          bulkItemId: boss.bulkItemId,
          bulkItemCount: boss.bulkItemCount,
          rareLoot: boss.rareLoot,
          rareItemId: boss.rareItemId,
          rareDropChance: boss.rareDropChance,
          spawnCoords: boss.spawnCoords,
          notes: boss.notes,
        },
      });
  }
}
