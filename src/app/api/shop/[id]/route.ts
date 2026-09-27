import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { validateShopItem } from "@/lib/shop";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Некорректный ID товара" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Некорректные данные товара" }, { status: 400 });
  }

  const [current] = await db.select().from(shopItems).where(eq(shopItems.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });

  // Partial updates are merged with the stored row and validated as a whole,
  // so cross-field rules (services have no item ID) always hold.
  const result = validateShopItem({ ...current, ...body });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const [updated] = await db
    .update(shopItems)
    .set({ ...result.value, updatedAt: new Date() })
    .where(eq(shopItems.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Context) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Некорректный ID товара" }, { status: 400 });

  const deleted = await db.delete(shopItems).where(eq(shopItems.id, id)).returning({ id: shopItems.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, id });
}
