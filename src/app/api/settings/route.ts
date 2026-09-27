import { db } from "@/db";
import { projectSettings, type ProjectConfig } from "@/db/schema";
import { SHOP_CURRENCY } from "@/lib/shop";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WAKENING_ESSENCE_ID = SHOP_CURRENCY.id;

const defaultConfig: ProjectConfig = {
  projectName: "LegionForge",
  realmName: "Azeroth Reborn",
  welcomeMessage: "Добро пожаловать в Azeroth Reborn! Приключение начинается здесь.",
  maxLevel: 120,
  onlineReward: 50,
  onlineRewardMinutes: 60,
  legendaryCap: 1200,
  endgameCap: 1000,
  currencyId: SHOP_CURRENCY.id,
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

async function getConfig() {
  const existing = await db.select().from(projectSettings).where(eq(projectSettings.id, 1)).limit(1);
  if (existing[0]) {
    const stored = existing[0].config;
    // Migrations: old default project name, and the wrong currency ID 1220
    // (Order Resources) -> 1533 (Wakening Essence, used for legendaries).
    if (stored.projectName === "AzerothCore 7" || stored.currencyId !== WAKENING_ESSENCE_ID) {
      const migrated = {
        ...stored,
        projectName: stored.projectName === "AzerothCore 7" ? "LegionForge" : stored.projectName,
        currencyId: WAKENING_ESSENCE_ID,
      };
      const updated = await db.update(projectSettings)
        .set({ config: migrated, updatedAt: new Date() })
        .where(eq(projectSettings.id, 1))
        .returning();
      return updated[0];
    }
    return existing[0];
  }
  const inserted = await db.insert(projectSettings).values({ id: 1, config: defaultConfig }).returning();
  return inserted[0];
}

export async function GET() {
  return NextResponse.json(await getConfig());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<ProjectConfig>;
  const current = await getConfig();
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
  const updated = await db.update(projectSettings)
    .set({ config, updatedAt: new Date() })
    .where(eq(projectSettings.id, 1))
    .returning();
  return NextResponse.json(updated[0]);
}
