import { db } from "@/db";
import { worldBossRegistry, type WorldBossEntry } from "@/db/schema";
import { ensureWorldBossesSeeded } from "@/lib/boss-store";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureWorldBossesSeeded();
  const rows = await db
    .select()
    .from(worldBossRegistry)
    .orderBy(asc(worldBossRegistry.continent), asc(worldBossRegistry.zone), asc(worldBossRegistry.entryId));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  let body: Partial<WorldBossEntry> & {
    bulkItemId?: number;
    bulkItemCount?: number;
    rareItemId?: number;
    spawnCoords?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (!body.name || !body.zone || !body.continent) {
    return NextResponse.json({ error: "Укажите имя, зону и континент босса" }, { status: 400 });
  }

  const entryId = Number(body.entryId) || Math.floor(900000 + Math.random() * 90000);
  const id = body.id?.trim() || `custom-boss-${entryId}-${Date.now().toString(36)}`;

  const newBoss = {
    id,
    entryId,
    name: body.name.trim(),
    zone: body.zone.trim(),
    continent: body.continent.trim(),
    level: body.level?.trim() || "110",
    difficulty: (body.difficulty || "mini-boss") as "elite" | "rare-elite" | "mini-boss",
    respawnHours: Math.max(1, Math.min(72, Number(body.respawnHours) || 4)),
    mechanic: body.mechanic?.trim() || "Обычные атаки и способности",
    bulkLoot: body.bulkLoot?.trim() || "Профессиональные материалы x1000",
    bulkItemId: Number(body.bulkItemId) || 0,
    bulkItemCount: Number(body.bulkItemCount) || 1000,
    rareLoot: body.rareLoot?.trim() || "Уникальный предмет",
    rareItemId: Number(body.rareItemId) || 0,
    rareDropChance: body.rareDropChance?.trim() || "1%",
    spawnCoords: body.spawnCoords?.trim() || "",
    enabled: body.enabled !== false,
    notes: body.notes?.trim() || "",
  };

  try {
    const [inserted] = await db.insert(worldBossRegistry).values(newBoss).returning();
    return NextResponse.json(inserted, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ошибка базы данных";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

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
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const [updated] = await db
    .update(worldBossRegistry)
    .set(updates)
    .where(eq(worldBossRegistry.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Босс не найден" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const deleted = await db.delete(worldBossRegistry).where(eq(worldBossRegistry.id, id)).returning({ id: worldBossRegistry.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Босс не найден" }, { status: 404 });

  return NextResponse.json({ ok: true, id });
}
