import { db } from "@/db";
import { appMeta, shopItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_SEED } from "./shop-seed";

const SEED_KEY = "shop_catalog_seeded";

/**
 * Inserts the default catalog exactly once. A marker row in app_meta records
 * that seeding happened, so deleting every product never brings them back.
 */
export async function ensureShopSeeded(): Promise<void> {
  const done = await db.select({ key: appMeta.key }).from(appMeta).where(eq(appMeta.key, SEED_KEY)).limit(1);
  if (done.length > 0) return;

  await db.transaction(async (tx) => {
    const claimed = await tx
      .insert(appMeta)
      .values({ key: SEED_KEY, value: new Date().toISOString() })
      .onConflictDoNothing()
      .returning({ key: appMeta.key });
    if (claimed.length === 0) return;
    await tx.insert(shopItems).values(SHOP_SEED);
  });
}
