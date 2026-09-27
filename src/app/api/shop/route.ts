import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { validateShopItem } from "@/lib/shop";
import { ensureShopSeeded } from "@/lib/shop-store";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureShopSeeded();
  const rows = await db.select().from(shopItems).orderBy(asc(shopItems.sortOrder), asc(shopItems.id));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const result = validateShopItem(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await ensureShopSeeded();
  const [created] = await db.insert(shopItems).values(result.value).returning();
  return NextResponse.json(created, { status: 201 });
}
