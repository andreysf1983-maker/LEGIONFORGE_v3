// Shared shop definitions used by both the API and the editor UI.
// Delivery types map to Battlepay::WebsiteType in LegionCore-7.3.5V2
// (src/server/game/BattlePay/BattlePayMgr.h).

export const SHOP_CATEGORIES = [
  { key: "transmog", label: "Трансмог", hint: "Редкое оружие и броня, которые сложно добыть в игре", groupId: 901 },
  { key: "mounts", label: "Средства передвижения", hint: "Легендарные и редкие маунты разных эпох", groupId: 902 },
  { key: "pets", label: "Питомцы", hint: "Коллекционные питомцы", groupId: 903 },
  { key: "toys", label: "Игрушки", hint: "Забавные предметы для коллекции", groupId: 904 },
  { key: "services", label: "Услуги персонажа", hint: "Смена имени, внешности, расы и фракции", groupId: 905 },
  { key: "legacy", label: "Забытые способности", hint: "Тома удалённых умений с проверкой класса", groupId: 906 },
  { key: "boost", label: "Ускорение прогресса", hint: "Наследуемые вещи и удобства без влияния на баланс", groupId: 907 },
  { key: "upgrade", label: "Реагенты улучшения", hint: "Улучшение легендарок до 1200 и экипировки 985 → 1000", groupId: 908 },
] as const;

export type ShopCategoryKey = (typeof SHOP_CATEGORIES)[number]["key"];

export const SHOP_DELIVERY = [
  { key: "item", label: "Предмет в сумку", websiteType: 3 },
  { key: "rename", label: "Услуга: смена имени", websiteType: 5 },
  { key: "customize", label: "Услуга: смена внешности", websiteType: 22 },
  { key: "race", label: "Услуга: смена расы", websiteType: 10 },
  { key: "faction", label: "Услуга: смена фракции", websiteType: 9 },
  { key: "guild-rename", label: "Услуга: переименование гильдии", websiteType: 6 },
  { key: "boost", label: "Услуга: повышение уровня", websiteType: 29 },
] as const;

export type ShopDeliveryKey = (typeof SHOP_DELIVERY)[number]["key"];

export const WOW_CLASSES = [
  { id: 0, label: "Все классы" },
  { id: 1, label: "Воин" },
  { id: 2, label: "Паладин" },
  { id: 3, label: "Охотник" },
  { id: 4, label: "Разбойник" },
  { id: 5, label: "Жрец" },
  { id: 6, label: "Рыцарь смерти" },
  { id: 7, label: "Шаман" },
  { id: 8, label: "Маг" },
  { id: 9, label: "Чернокнижник" },
  { id: 10, label: "Монах" },
  { id: 11, label: "Друид" },
  { id: 12, label: "Охотник на демонов" },
] as const;

// Wakening Essence: the Legion 7.3 currency used for legendary items.
export const SHOP_CURRENCY = { id: 1533, label: "Сущности пробуждения" } as const;

export const SHOP_LIMITS = {
  nameMax: 128,
  descriptionMax: 512,
  priceMax: 1_000_000,
  quantityMax: 1000,
  itemIdMax: 2_147_483_647,
  sortMin: -100_000,
  sortMax: 100_000,
} as const;

export type ShopItemInput = {
  category: ShopCategoryKey;
  name: string;
  description: string;
  price: number;
  itemId: number | null;
  quantity: number;
  delivery: ShopDeliveryKey;
  classId: number;
  enabled: boolean;
  sortOrder: number;
};

export type ShopValidation = { ok: true; value: ShopItemInput } | { ok: false; error: string };

const categoryKeys = new Set<string>(SHOP_CATEGORIES.map((c) => c.key));
const deliveryKeys = new Set<string>(SHOP_DELIVERY.map((d) => d.key));

function asInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function singleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function isService(delivery: string): boolean {
  return delivery !== "item";
}

/** Items delivered as a bag item need an item ID; services never do. */
export function isExportable(item: { delivery: string; itemId: number | null }): boolean {
  return isService(item.delivery) || (item.itemId !== null && item.itemId > 0);
}

export function validateShopItem(raw: unknown): ShopValidation {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Некорректные данные товара" };
  const r = raw as Record<string, unknown>;

  const category = typeof r.category === "string" ? r.category : "";
  if (!categoryKeys.has(category)) return { ok: false, error: "Выберите категорию из списка" };

  const name = typeof r.name === "string" ? singleLine(r.name) : "";
  if (!name) return { ok: false, error: "Укажите название товара" };
  if (name.length > SHOP_LIMITS.nameMax) return { ok: false, error: `Название длиннее ${SHOP_LIMITS.nameMax} символов` };

  const description = typeof r.description === "string" ? singleLine(r.description) : "";
  if (description.length > SHOP_LIMITS.descriptionMax) return { ok: false, error: `Описание длиннее ${SHOP_LIMITS.descriptionMax} символов` };

  const price = asInteger(r.price);
  if (price === null || price < 0 || price > SHOP_LIMITS.priceMax) return { ok: false, error: `Цена — целое число от 0 до ${SHOP_LIMITS.priceMax.toLocaleString("ru-RU")}` };

  const delivery = typeof r.delivery === "string" && r.delivery ? r.delivery : "item";
  if (!deliveryKeys.has(delivery)) return { ok: false, error: "Неизвестный тип выдачи" };

  let itemId: number | null = null;
  let quantity = 1;
  if (!isService(delivery)) {
    if (r.itemId !== null && r.itemId !== undefined && r.itemId !== "") {
      itemId = asInteger(r.itemId);
      if (itemId === null || itemId < 1 || itemId > SHOP_LIMITS.itemIdMax) return { ok: false, error: "ID предмета — положительное целое число" };
    }
    const q = asInteger(r.quantity ?? 1);
    if (q === null || q < 1 || q > SHOP_LIMITS.quantityMax) return { ok: false, error: `Количество — от 1 до ${SHOP_LIMITS.quantityMax}` };
    quantity = q;
  }

  const classId = asInteger(r.classId ?? 0);
  if (classId === null || classId < 0 || classId > 12) return { ok: false, error: "Неизвестный класс" };

  const sortOrder = asInteger(r.sortOrder ?? 0);
  if (sortOrder === null || sortOrder < SHOP_LIMITS.sortMin || sortOrder > SHOP_LIMITS.sortMax) return { ok: false, error: "Порядок — целое число" };

  const enabled = r.enabled === undefined ? true : r.enabled === true;

  return {
    ok: true,
    value: { category: category as ShopCategoryKey, name, description, price, itemId, quantity, delivery: delivery as ShopDeliveryKey, classId, enabled, sortOrder },
  };
}
