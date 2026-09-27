import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { buildBattlePaySql } from "@/lib/shop-export";
import { ensureShopSeeded } from "@/lib/shop-store";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureShopSeeded();
  const rows = await db.select().from(shopItems).orderBy(asc(shopItems.sortOrder), asc(shopItems.id));
  const sql = buildBattlePaySql(rows, new Date());
  return new Response(sql, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": 'attachment; filename="battlepay_shop.sql"',
      "Cache-Control": "no-store",
    },
  });
}
