import type { ShopItemRow } from "@/db/schema";
import { SHOP_CATEGORIES, SHOP_CURRENCY, SHOP_DELIVERY, isExportable } from "./shop";

// Table and column names match the queries in LegionCore-7.3.5V2
// src/server/game/Globals/BattlePayData.cpp. Only reserved ID ranges are
// replaced, so upstream BattlePay data stays untouched.
const ID_BASE = 900000;
const ID_MAX = 999999;
const GROUP_MIN = 901;
const GROUP_MAX = 999;

function sqlString(value: string): string {
  return "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/[\r\n\t\0]+/g, " ") + "'";
}

function commentText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\*\//g, "* /");
}

function insert(table: string, columns: string[], rows: string[][], comments?: string[]): string[] {
  if (rows.length === 0) return [];
  const head = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES`;
  const body = rows.map((row, i) => {
    const sep = i === rows.length - 1 ? ";" : ",";
    const note = comments?.[i] ? ` -- ${commentText(comments[i])}` : "";
    return `(${row.join(", ")})${sep}${note}`;
  });
  return [head, ...body, ""];
}

export function buildBattlePaySql(items: ShopItemRow[], generatedAt: Date): string {
  const deliveries = new Map<string, number>(SHOP_DELIVERY.map((d) => [d.key, d.websiteType]));
  const categoryOrder = new Map<string, number>(SHOP_CATEGORIES.map((c, i) => [c.key, i]));

  const exportable: ShopItemRow[] = [];
  const skipped: { item: ShopItemRow; reason: string }[] = [];
  for (const item of items) {
    if (!item.enabled) skipped.push({ item, reason: "скрыт в панели" });
    else if (!categoryOrder.has(item.category)) skipped.push({ item, reason: "неизвестная категория" });
    else if (!deliveries.has(item.delivery)) skipped.push({ item, reason: "неизвестный тип выдачи" });
    else if (!isExportable(item)) skipped.push({ item, reason: "не указан ID предмета" });
    else if (ID_BASE + item.id > ID_MAX) skipped.push({ item, reason: "ID вне резервного диапазона" });
    else exportable.push(item);
  }

  exportable.sort(
    (a, b) =>
      (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) ||
      a.sortOrder - b.sortOrder ||
      a.id - b.id,
  );

  const usedCategories = SHOP_CATEGORIES.filter((c) => exportable.some((i) => i.category === c.key));
  const groupRows = usedCategories.map((c, i) => [String(c.groupId), sqlString(c.label), "0", "0", String(i + 1)]);
  const groupLocaleRows = usedCategories.map((c) => [String(c.groupId), "'ruRU'", sqlString(c.label)]);

  const displayRows: string[][] = [];
  const displayLocaleRows: string[][] = [];
  const productRows: string[][] = [];
  const productComments: string[] = [];
  const productItemRows: string[][] = [];
  const entryRows: string[][] = [];
  const positionInGroup = new Map<string, number>();

  for (const item of exportable) {
    const pid = String(ID_BASE + item.id);
    const group = SHOP_CATEGORIES.find((c) => c.key === item.category)!;
    const classMask = item.classId > 0 ? 1 << (item.classId - 1) : 0;
    const position = (positionInGroup.get(item.category) ?? 0) + 1;
    positionInGroup.set(item.category, position);

    displayRows.push([pid, "0", "0", "0", sqlString(item.name), "''", "''", "''"]);
    displayLocaleRows.push([pid, "'ruRU'", sqlString(item.name), "''", "''", "''"]);
    productRows.push([pid, String(item.price), String(item.price), "0", String(deliveries.get(item.delivery)), "0", "0", pid, String(classMask), "''"]);
    productComments.push(item.name);
    if (item.delivery === "item" && item.itemId) {
      productItemRows.push([pid, pid, String(item.itemId), String(item.quantity), "0", "0"]);
    }
    entryRows.push([pid, String(group.groupId), pid, String(position), "0", "0", "0"]);
  }

  const lines: string[] = [
    "-- ============================================================================",
    "-- LegionForge: BattlePay shop export (in-game shop window, W button)",
    `-- Generated: ${generatedAt.toISOString()}`,
    "-- Target: LegionCore-7.3.5V2 world database, client 7.3.5.26124",
    `-- Products: ${exportable.length} exported, ${skipped.length} skipped`,
    "--",
    "-- Only reserved rows are replaced, upstream BattlePay data is not touched:",
    `--   battlepay_product_group(_locales): GroupID ${GROUP_MIN}-${GROUP_MAX}`,
    `--   battlepay_product, _product_item, _shop_entry, _display_info(_locales): ${ID_BASE}-${ID_MAX}`,
    "--",
    "-- Import:   mariadb --host=127.0.0.1 --port=3307 -u legion -p legion_world < battlepay_shop.sql",
    "-- Apply:    in game as administrator: .battlepay reload",
    "--",
    `-- Prices are stored as-is. Panel currency: ${SHOP_CURRENCY.label} (currency ${SHOP_CURRENCY.id}).`,
    "-- LegionCore-7.3.5V2 charges BattlePay purchases from the account donate balance",
    "-- (Player::GetDonateTokens in BattlePayHandler.cpp) unless the core is patched.",
    "-- ============================================================================",
    "",
    "SET NAMES utf8mb4;",
    "START TRANSACTION;",
    "",
    `DELETE FROM \`battlepay_shop_entry\` WHERE \`EntryID\` BETWEEN ${ID_BASE} AND ${ID_MAX};`,
    `DELETE FROM \`battlepay_product_item\` WHERE \`ID\` BETWEEN ${ID_BASE} AND ${ID_MAX};`,
    `DELETE FROM \`battlepay_product\` WHERE \`ProductID\` BETWEEN ${ID_BASE} AND ${ID_MAX};`,
    `DELETE FROM \`battlepay_display_info_locales\` WHERE \`Id\` BETWEEN ${ID_BASE} AND ${ID_MAX};`,
    `DELETE FROM \`battlepay_display_info\` WHERE \`DisplayInfoId\` BETWEEN ${ID_BASE} AND ${ID_MAX};`,
    `DELETE FROM \`battlepay_product_group_locales\` WHERE \`GroupID\` BETWEEN ${GROUP_MIN} AND ${GROUP_MAX};`,
    `DELETE FROM \`battlepay_product_group\` WHERE \`GroupID\` BETWEEN ${GROUP_MIN} AND ${GROUP_MAX};`,
    "",
    ...insert("battlepay_product_group", ["GroupID", "Name", "IconFileDataID", "DisplayType", "Ordering"], groupRows),
    ...insert("battlepay_product_group_locales", ["GroupID", "Locale", "Name"], groupLocaleRows),
    ...insert("battlepay_display_info", ["DisplayInfoId", "CreatureDisplayInfoID", "FileDataID", "Flags", "Name1", "Name2", "Name3", "Name4"], displayRows),
    ...insert("battlepay_display_info_locales", ["Id", "Locale", "Name1", "Name2", "Name3", "Name4"], displayLocaleRows),
    ...insert(
      "battlepay_product",
      ["ProductID", "NormalPriceFixedPoint", "CurrentPriceFixedPoint", "Type", "WebsiteType", "ChoiceType", "Flags", "DisplayInfoID", "ClassMask", "ScriptName"],
      productRows,
      productComments,
    ),
    ...insert("battlepay_product_item", ["ID", "ProductID", "ItemID", "Quantity", "DisplayID", "PetResult"], productItemRows),
    ...insert("battlepay_shop_entry", ["EntryID", "GroupID", "ProductID", "Ordering", "Flags", "BannerType", "DisplayInfoID"], entryRows),
    "COMMIT;",
    "",
  ];

  if (skipped.length > 0) {
    lines.push(`-- Skipped products (${skipped.length}):`);
    for (const { item, reason } of skipped) lines.push(`--   #${item.id} ${commentText(item.name)}: ${reason}`);
    lines.push("");
  }

  return lines.join("\n");
}
