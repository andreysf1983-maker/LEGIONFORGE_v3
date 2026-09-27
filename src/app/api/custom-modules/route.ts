import { db } from "@/db";
import { customModuleConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_MODULES = [
  {
    id: "onlineBonus",
    name: "Бонус за онлайн (Online Bonus)",
    category: "Экономика и сервер",
    description: "Автоматическая выдача валюты активным игрокам раз в заданный интервал.",
    enabled: true,
    settings: {
      rewardAmount: 50,
      intervalMinutes: 60,
      currencyId: 1533,
      currencyName: "Сущность пробуждения",
      minLevel: 10,
      afkCheck: true,
      announceToPlayer: true,
      announceMessage: "Вы получили +50 Сущностей Пробуждения за 1 час активной игры!",
    },
  },
  {
    id: "itemUpgrade",
    name: "Улучшение экипировки (Item Upgrade Chain)",
    category: "Предметы и прогресс",
    description: "Прокачка легендарных предметов до 1200 ilvl и эндгейм-вещей 985→1000 ilvl.",
    enabled: true,
    settings: {
      legendaryItemUpgradeId: 950030,
      legendaryItemUpgradeName: "Концентрат силы",
      legendaryStep: 5,
      legendaryCap: 1200,
      endgameItemUpgradeId: 950031,
      endgameItemUpgradeName: "Эссенция закалки",
      endgameMinIlvl: 985,
      endgameCap: 1000,
      costCurrencyId: 1533,
      costEssences: 800,
      preserveSockets: true,
    },
  },
  {
    id: "legacySpells",
    name: "Возвращение Legacy-способностей",
    category: "Классы и способности",
    description: "Обучение удаленным способностям через тома с проверкой класса игрока.",
    enabled: true,
    settings: {
      trainerNpcEntry: 900100,
      trainerNpcName: "Хранитель Забытых Знаний",
      tomeCost: 5000,
      tomeCurrencyId: 1533,
      enforceClassCheck: true,
      spells: [
        { id: 1, name: "Метаморфоза (Демонология)", classId: 9, className: "Чернокнижник", spellId: 103958, tomeItemId: 950101, note: "Возвращает форму демона и демоническую ярость" },
        { id: 2, name: "Темная душа", classId: 9, className: "Чернокнижник", spellId: 113858, tomeItemId: 950102, note: "+30% силы заклинаний на 20 сек" },
        { id: 3, name: "Аспект стаи", classId: 3, className: "Охотник", spellId: 13159, tomeItemId: 950103, note: "Ускорение группы на 30%" },
        { id: 4, name: "Раскаленный доспех", classId: 8, className: "Маг", spellId: 30482, tomeItemId: 950104, note: "Огненная броня мага с критом" },
        { id: 5, name: "Чародейская гениальность", classId: 8, className: "Маг", spellId: 1459, tomeItemId: 950105, note: "Групповой бафф +10% интеллекта" },
        { id: 6, name: "Печать правды", classId: 2, className: "Паладин", spellId: 31801, tomeItemId: 950106, note: "Урон Светом при атаках" },
        { id: 7, name: "Экзорцизм", classId: 2, className: "Паладин", spellId: 879, tomeItemId: 950107, note: "Мгновенный удар Светом" },
        { id: 8, name: "Пронзание разума", classId: 5, className: "Жрец", spellId: 73510, tomeItemId: 950108, note: "Прямой урон Тьмой" },
        { id: 9, name: "Боевой крик", classId: 1, className: "Воин", spellId: 6673, tomeItemId: 950109, note: "+10% силы атаки группе" },
        { id: 10, name: "Опаляющий тотем", classId: 7, className: "Шаман", spellId: 3599, tomeItemId: 950110, note: "Огненный боевой тотем" },
        { id: 11, name: "Власть крови", classId: 6, className: "Рыцарь смерти", spellId: 48263, tomeItemId: 950111, note: "Увеличение урона и вампиризм" },
        { id: 12, name: "Знак дикой природы", classId: 11, className: "Друид", spellId: 1126, tomeItemId: 950112, note: "+5% характеристик рейду" },
        { id: 13, name: "Наследие императора", classId: 10, className: "Монах", spellId: 115921, tomeItemId: 950113, note: "+5% характеристик рейду" },
      ],
    },
  },
  {
    id: "playerbots",
    name: "Система ИИ-ботов (Playerbot AI Integration)",
    category: "Искусственный интеллект",
    description: "Интеллектуальные боты для групп, рейдов, дуэлей, Арен и Полей Боя.",
    enabled: true,
    settings: {
      botPoolCount: 128,
      autoJoinLeaderGroup: true,
      autoAssistLeader: true,
      useCrowdControl: true,
      fillBgSlots: true,
      fillArenaSlots: true,
      chatIntervalMin: 120,
      chatIntervalMax: 240,
      namesCount: 80,
      names: [
        "Александр", "Дмитрий", "Максим", "Сергей", "Андрей", "Алексей", "Артем", "Илья", "Кирилл", "Михаил",
        "Никита", "Матвей", "Роман", "Егор", "Арсений", "Иван", "Денис", "Евгений", "Даниил", "Тимофей",
        "Владислав", "Игорь", "Глеб", "Марк", "Ярослав", "Богдан", "Олег", "Виктор", "Антон", "Константин",
        "Анна", "Мария", "Елена", "Дарья", "Алина", "Ирина", "Екатерина", "Арина", "Полина", "Ольга",
        "Юлия", "Татьяна", "Наталья", "Виктория", "Ксения", "Светлана", "Валерия", "Алиса", "София", "Вероника",
        "Диана", "Елизавета", "Анастасия", "Кристина", "Варвара", "Милана", "Яна", "Надежда", "Любовь", "Марина",
        "Ярополк", "Святослав", "Радомир", "Добрыня", "Любомир", "Владимир", "Всеволод", "Мстислав", "Ростислав", "Борислав",
        "Станислав", "Вячеслав", "Мирослав", "Бронислав", "Яромир", "Святозар", "Велимир", "Ратибор", "Горыня", "Любава"
      ],
    },
  },
  {
    id: "brokenQuests",
    name: "Обработка битых квестов (Auto-Complete)",
    category: "Квесты и мир",
    description: "Мгновенное автозавершение известных багнутых квестов с выдачей наград.",
    enabled: true,
    settings: {
      autoCompleteOnAccept: true,
      notifyPlayer: true,
      compensationEssences: 25,
      notificationText: "Квест автоматически засчитан из-за технической ошибки сервера (награда и компенсация выданы).",
      questIds: [
        { id: 10280, title: "Уничтожить кузницу лагеря", note: "Проблема фазирования мобов" },
        { id: 11524, title: "План побега из Даларана", note: "Застревание скрипта эскорта" },
        { id: 12056, title: "Кровь Древнего Бога", note: "Отсутствует спавн триггера" },
        { id: 13188, title: "Битва у Врат Ангратара", note: "Прерывание кинематика 7.3.5" },
        { id: 25444, title: "Пески Времени Ульдума", note: "Смерть фазового транспорта" },
        { id: 37450, title: "Оплот класса: Первая миссия", note: "Баг интерфейса соратников" },
        { id: 40519, title: "Врата в Мардум", note: "Зависание портала Охотников на демонов" },
        { id: 42880, title: "Испытание Валоджара", note: "Сброс прогресса эвента Одина" },
        { id: 44280, title: "Глаз Азшары: Месть моря", note: "Триггер ритуала наг не срабатывает" },
        { id: 47220, title: "Аргус: Прорыв в Крокуун", note: "Баг фазы посадки на Виндикар" },
      ],
    },
  },
  {
    id: "freeTransmog",
    name: "Свободный трансмог (Cross-Armor / Cross-Weapon)",
    category: "Кастомизация",
    description: "Разрешает трансмогрификацию любых типов брони (латы в ткань) и оружия.",
    enabled: true,
    settings: {
      allowCrossArmor: true,
      allowCrossWeapon: true,
      ignoreClassRequirement: true,
      ignoreLevelRequirement: true,
      allowLegendaryTransmog: true,
      costMultiplier: 1.0,
    },
  },
  {
    id: "battlepay",
    name: "Внутриигровой магазин (BattlePay W-Key)",
    category: "Экономика и сервер",
    description: "Интеграция каталога в клиентское окно Blizzard Store (кнопка W).",
    enabled: true,
    settings: {
      shopEnabled: true,
      openWithWKey: true,
      currencyId: 1533,
      currencyName: "Сущность пробуждения",
      allowCharacterServices: true,
      allowFactionChange: true,
      bannerMessage: "Добро пожаловать в магазин LegionForge! Цены в Сущностях Пробуждения.",
    },
  },
  {
    id: "worldBosses",
    name: "60 мировых мини-боссов (World Bosses)",
    category: "PvE и мир",
    description: "Динамическое масштабирование и управление спавном 60 мировых боссов.",
    enabled: true,
    settings: {
      totalBosses: 60,
      dynamicScaling: true,
      scaleFactorPerPlayer: 0.15,
      minPlayersForFullScaling: 5,
      announceGlobalSpawn: true,
      announceGlobalDefeat: true,
      guaranteedBulkDrop: true,
      bulkQuantity: 1000,
    },
  },
];

async function seedIfNeeded() {
  const existing = await db.select().from(customModuleConfigs);
  if (existing.length < DEFAULT_MODULES.length) {
    for (const mod of DEFAULT_MODULES) {
      await db
        .insert(customModuleConfigs)
        .values({
          id: mod.id,
          name: mod.name,
          category: mod.category,
          description: mod.description,
          enabled: mod.enabled,
          settings: mod.settings,
        })
        .onConflictDoNothing();
    }
  }
}

export async function GET() {
  await seedIfNeeded();
  const rows = await db.select().from(customModuleConfigs);
  return NextResponse.json(rows);
}

export async function PATCH(request: Request) {
  let body: { id: string; enabled?: boolean; settings?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const [current] = await db
    .select()
    .from(customModuleConfigs)
    .where(eq(customModuleConfigs.id, body.id))
    .limit(1);

  if (!current) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.settings && typeof body.settings === "object") {
    updates.settings = { ...current.settings, ...body.settings };
  }

  const [updated] = await db
    .update(customModuleConfigs)
    .set(updates)
    .where(eq(customModuleConfigs.id, body.id))
    .returning();

  return NextResponse.json(updated);
}
