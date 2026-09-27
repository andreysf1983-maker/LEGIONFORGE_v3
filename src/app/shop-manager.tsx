"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { SHOP_CATEGORIES, SHOP_CURRENCY, SHOP_DELIVERY, SHOP_LIMITS, WOW_CLASSES, isExportable, isService } from "@/lib/shop";

export type ShopItem = {
  id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  itemId: number | null;
  quantity: number;
  delivery: string;
  classId: number;
  enabled: boolean;
  sortOrder: number;
};

type Draft = {
  category: string;
  name: string;
  description: string;
  price: string;
  itemId: string;
  quantity: string;
  delivery: string;
  classId: string;
  enabled: boolean;
  sortOrder: string;
};

type SortKey = "order" | "price-asc" | "price-desc" | "name";
type StatusFilter = "all" | "enabled" | "disabled" | "no-id";

const CATEGORY_ICONS: Record<string, IconName> = {
  transmog: "sparkles",
  mounts: "wand",
  pets: "paw",
  toys: "gift",
  services: "users",
  legacy: "book",
  boost: "clock",
  upgrade: "sword",
};

const categoryLabel = new Map<string, string>(SHOP_CATEGORIES.map((c) => [c.key, c.label]));
const categoryOrder = new Map<string, number>(SHOP_CATEGORIES.map((c, i) => [c.key, i]));
const deliveryLabel = new Map<string, string>(SHOP_DELIVERY.map((d) => [d.key, d.label]));
const classLabel = new Map<number, string>(WOW_CLASSES.map((c) => [c.id, c.label]));
const numberFormat = new Intl.NumberFormat("ru-RU");

function emptyDraft(category: string, sortOrder: number): Draft {
  return {
    category,
    name: "",
    description: "",
    price: "1000",
    itemId: "",
    quantity: "1",
    delivery: category === "services" ? "rename" : "item",
    classId: "0",
    enabled: true,
    sortOrder: String(sortOrder),
  };
}

function draftFrom(item: ShopItem): Draft {
  return {
    category: item.category,
    name: item.name,
    description: item.description,
    price: String(item.price),
    itemId: item.itemId === null ? "" : String(item.itemId),
    quantity: String(item.quantity),
    delivery: item.delivery,
    classId: String(item.classId),
    enabled: item.enabled,
    sortOrder: String(item.sortOrder),
  };
}

function payloadFrom(d: Draft) {
  return {
    category: d.category,
    name: d.name,
    description: d.description,
    price: d.price.trim(),
    itemId: d.itemId.trim() === "" ? null : d.itemId.trim(),
    quantity: d.quantity.trim() || "1",
    delivery: d.delivery,
    classId: Number(d.classId),
    enabled: d.enabled,
    sortOrder: d.sortOrder.trim() || "0",
  };
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Неизвестная ошибка";
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : `Ошибка ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

const chip = (active: boolean) =>
  `rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

export default function ShopManager({ notify, onItemsChange }: { notify: (message: string) => void; onItemsChange?: (items: ShopItem[]) => void }) {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("order");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [formError, setFormError] = useState("");

  const onChangeRef = useRef(onItemsChange);
  useEffect(() => {
    onChangeRef.current = onItemsChange;
  });
  useEffect(() => {
    if (items) onChangeRef.current?.(items);
  }, [items]);

  async function load() {
    setLoadError("");
    try {
      setItems(await request<ShopItem[]>("/api/shop"));
    } catch (e) {
      setLoadError(errorText(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items ?? []) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [items]);

  const total = items?.length ?? 0;
  const shown = items?.filter((i) => i.enabled).length ?? 0;
  const withoutId = items?.filter((i) => !isExportable(i)).length ?? 0;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = (items ?? []).filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status === "enabled" && !item.enabled) return false;
      if (status === "disabled" && item.enabled) return false;
      if (status === "no-id" && isExportable(item)) return false;
      if (!query) return true;
      return item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query) || String(item.itemId ?? "").includes(query);
    });
    return list.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price || a.id - b.id;
      if (sort === "price-desc") return b.price - a.price || a.id - b.id;
      if (sort === "name") return a.name.localeCompare(b.name, "ru");
      return (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) || a.sortOrder - b.sortOrder || a.id - b.id;
    });
  }, [items, category, status, search, sort]);

  function startAdd() {
    const target = category === "all" ? "transmog" : category;
    const last = Math.max(0, ...(items ?? []).filter((i) => i.category === target).map((i) => i.sortOrder));
    setAdding(emptyDraft(target, last + 10));
    setEditing(null);
    setConfirmDelete(null);
    setFormError("");
  }

  function startEdit(item: ShopItem) {
    setEditing({ id: item.id, draft: draftFrom(item) });
    setAdding(null);
    setConfirmDelete(null);
    setFormError("");
  }

  async function create(draft: Draft) {
    setBusy("new");
    setFormError("");
    try {
      const created = await request<ShopItem>("/api/shop", { method: "POST", body: JSON.stringify(payloadFrom(draft)) });
      setItems((list) => [...(list ?? []), created]);
      setAdding(null);
      if (category !== "all" && created.category !== category) setCategory(created.category);
      notify(`Товар «${created.name}» добавлен`);
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function save(id: number, draft: Draft) {
    setBusy(id);
    setFormError("");
    try {
      const updated = await request<ShopItem>(`/api/shop/${id}`, { method: "PATCH", body: JSON.stringify(payloadFrom(draft)) });
      setItems((list) => (list ?? []).map((i) => (i.id === id ? updated : i)));
      setEditing(null);
      notify("Изменения сохранены");
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggle(item: ShopItem) {
    setBusy(item.id);
    try {
      const updated = await request<ShopItem>(`/api/shop/${item.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !item.enabled }) });
      setItems((list) => (list ?? []).map((i) => (i.id === item.id ? updated : i)));
      notify(updated.enabled ? "Товар показан в магазине" : "Товар скрыт из магазина");
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: ShopItem) {
    setBusy(item.id);
    try {
      await request(`/api/shop/${item.id}`, { method: "DELETE" });
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
      setConfirmDelete(null);
      notify(`Товар «${item.name}» удалён`);
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const showCategoryColumn = category === "all";
  const columnCount = showCategoryColumn ? 8 : 7;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Каталог внутриигрового магазина</h2>
          <p className="mt-1 text-xs text-slate-400">
            Окно BattlePay (кнопка W) · {total} товаров · {shown} в магазине · цены в {SHOP_CURRENCY.label.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/shop/export" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Icon name="download" size={15} />
            Экспорт SQL
          </a>
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">
            <Icon name="plus" size={15} />
            Добавить товар
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-900">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          «Экспорт SQL» создаёт файл для таблиц <code>battlepay_*</code> мира LegionCore-7.3.5V2 (резервные ID 900000+, данные ядра не затрагиваются). После импорта выполните в игре <code>.battlepay reload</code>. Сейчас ядро списывает оплату с доната аккаунта (<code>GetDonateTokens</code>): для оплаты Сущностями пробуждения (ID {SHOP_CURRENCY.id}) нужен патч BattlePay в ядре.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHOP_CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(active ? "all" : c.key)}
              className={`rounded-xl border p-4 text-left transition ${active ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-lg text-white ${active ? "bg-blue-600" : "bg-slate-900"}`}>
                  <Icon name={CATEGORY_ICONS[c.key]} size={16} />
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{counts.get(c.key) ?? 0} шт.</span>
              </div>
              <div className="mt-3 text-[13px] font-bold">{c.label}</div>
              <div className="mt-1 text-[10px] leading-4 text-slate-400">{c.hint}</div>
              <div className="mt-2 text-[11px] font-semibold text-blue-600">{active ? "Показать все товары ×" : "Открыть каталог →"}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={() => setCategory("all")} className={chip(category === "all")}>
          Все товары · {total}
        </button>
        {category !== "all" && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            <Icon name={CATEGORY_ICONS[category] ?? "bag"} size={14} />
            {categoryLabel.get(category)} · {counts.get(category) ?? 0}
          </span>
        )}
        {withoutId > 0 && (
          <button onClick={() => setStatus(status === "no-id" ? "all" : "no-id")} className={chip(status === "no-id")}>
            Без ID предмета · {withoutId}
          </button>
        )}
        <div className="relative ml-auto">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию или ID…" className="field w-60 pl-8" />
        </div>
        <select className="field w-40" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Фильтр по статусу">
          <option value="all">Любой статус</option>
          <option value="enabled">В магазине</option>
          <option value="disabled">Скрытые</option>
          <option value="no-id">Без ID предмета</option>
        </select>
        <select className="field w-40" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сортировка">
          <option value="order">По порядку</option>
          <option value="price-asc">Цена по возрастанию</option>
          <option value="price-desc">Цена по убыванию</option>
          <option value="name">По названию</option>
        </select>
      </div>

      {adding && (
        <ItemForm
          title="Новый товар"
          draft={adding}
          onChange={setAdding}
          onSubmit={() => create(adding)}
          onCancel={() => {
            setAdding(null);
            setFormError("");
          }}
          busy={busy === "new"}
          error={formError}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {items === null ? (
          <div className="p-12 text-center text-sm text-slate-400">
            {loadError ? (
              <div className="space-y-3">
                <div className="text-red-600">Не удалось загрузить каталог: {loadError}</div>
                <button onClick={() => void load()} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Повторить
                </button>
              </div>
            ) : (
              "Загрузка каталога…"
            )}
          </div>
        ) : visible.length === 0 ? (
          <div className="space-y-3 p-12 text-center text-sm text-slate-400">
            <div>Товары не найдены.</div>
            <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              <Icon name="plus" size={14} />
              Добавить товар
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Товар</th>
                {showCategoryColumn && <th className="px-3 py-3 font-semibold">Категория</th>}
                <th className="px-3 py-3 font-semibold">ID предмета</th>
                <th className="px-3 py-3 font-semibold">Класс</th>
                <th className="px-3 py-3 text-right font-semibold">Кол-во</th>
                <th className="px-3 py-3 text-right font-semibold">Цена</th>
                <th className="px-3 py-3 text-center font-semibold">В магазине</th>
                <th className="px-4 py-3 text-right font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item) =>
                editing?.id === item.id ? (
                  <tr key={item.id}>
                    <td colSpan={columnCount} className="bg-slate-50 p-3">
                      <ItemForm
                        title={`Редактирование товара #${item.id}`}
                        draft={editing.draft}
                        onChange={(draft) => setEditing({ id: item.id, draft })}
                        onSubmit={() => save(item.id, editing.draft)}
                        onCancel={() => {
                          setEditing(null);
                          setFormError("");
                        }}
                        busy={busy === item.id}
                        error={formError}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className={item.enabled ? "hover:bg-slate-50/70" : "bg-slate-50/60 text-slate-400"}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                          <Icon name={CATEGORY_ICONS[item.category] ?? "bag"} size={15} />
                        </span>
                        <div className="min-w-0">
                          <div className={`font-semibold ${item.enabled ? "text-slate-800" : "text-slate-500"}`}>{item.name}</div>
                          {item.description && <div className="mt-0.5 max-w-md truncate text-[11px] text-slate-400">{item.description}</div>}
                          {(isService(item.delivery) || !isExportable(item)) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {isService(item.delivery) && (
                                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">{deliveryLabel.get(item.delivery)}</span>
                              )}
                              {!isExportable(item) && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                  <Icon name="alert" size={11} />
                                  Нет ID — не попадёт в экспорт
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {showCategoryColumn && <td className="px-3 py-3 text-[11px] text-slate-500">{categoryLabel.get(item.category) ?? item.category}</td>}
                    <td className="px-3 py-3">
                      {item.itemId ? (
                        <a
                          href={`https://www.wowhead.com/ru/item=${item.itemId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:underline"
                          title="Открыть предмет на Wowhead"
                        >
                          {item.itemId}
                          <Icon name="external" size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px]">{item.classId ? classLabel.get(item.classId) : <span className="text-slate-300">Все</span>}</td>
                    <td className="px-3 py-3 text-right text-[11px]">{isService(item.delivery) ? <span className="text-slate-300">—</span> : `×${item.quantity}`}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <span className={`font-semibold ${item.enabled ? "text-slate-800" : "text-slate-500"}`}>{numberFormat.format(item.price)}</span>
                      <span className="ml-1 text-[10px] text-slate-400">сущн.</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => void toggle(item)}
                        disabled={busy === item.id}
                        aria-label={item.enabled ? `Скрыть «${item.name}»` : `Показать «${item.name}»`}
                        className={`relative inline-block h-5 w-9 rounded-full transition disabled:opacity-50 ${item.enabled ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${item.enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {confirmDelete === item.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[11px] font-medium text-red-600">Удалить?</span>
                          <button
                            onClick={() => void remove(item)}
                            disabled={busy === item.id}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Да
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                            Нет
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button onClick={() => startEdit(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Изменить" aria-label={`Изменить «${item.name}»`}>
                            <Icon name="pencil" size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDelete(item.id);
                              setEditing(null);
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Удалить"
                            aria-label={`Удалить «${item.name}»`}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ItemForm({
  title,
  draft,
  onChange,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  title: string;
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const service = isService(draft.delivery);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <button type="button" onClick={onCancel} aria-label="Закрыть" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label className="field-label">Название *</label>
          <input className="field" value={draft.name} maxLength={SHOP_LIMITS.nameMax} required autoFocus onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Категория</label>
          <select className="field" value={draft.category} onChange={(e) => set("category", e.target.value)}>
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Тип выдачи</label>
          <select className="field" value={draft.delivery} onChange={(e) => set("delivery", e.target.value)}>
            {SHOP_DELIVERY.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">ID предмета</label>
          <input
            className="field font-mono"
            inputMode="numeric"
            value={service ? "" : draft.itemId}
            disabled={service}
            placeholder={service ? "не нужен для услуги" : "например, 32458"}
            onChange={(e) => set("itemId", e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div>
          <label className="field-label">Количество</label>
          <input
            className="field"
            type="number"
            min={1}
            max={SHOP_LIMITS.quantityMax}
            value={service ? "1" : draft.quantity}
            disabled={service}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Цена, сущностей *</label>
          <input className="field" type="number" min={0} max={SHOP_LIMITS.priceMax} required value={draft.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Класс</label>
          <select className="field" value={draft.classId} onChange={(e) => set("classId", e.target.value)}>
            {WOW_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <label className="field-label">Описание</label>
          <input
            className="field"
            value={draft.description}
            maxLength={SHOP_LIMITS.descriptionMax}
            placeholder="Короткое описание для списка"
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Порядок в категории</label>
          <input className="field" type="number" value={draft.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </div>
      </div>

      {!service && draft.itemId.trim() === "" && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700">
          <Icon name="alert" size={13} />
          Без ID предмета товар сохранится в каталоге, но не попадёт в SQL-экспорт.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-blue-600" />
          Показывать в магазине
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {error && <span className="text-xs font-medium text-red-600">{error}</span>}
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <Icon name="save" size={14} />
            {busy ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </form>
  );
}
