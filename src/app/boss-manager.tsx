"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";

export type WorldBoss = {
  id: string;
  entryId: number;
  name: string;
  zone: string;
  continent: string;
  level: string;
  difficulty: "elite" | "rare-elite" | "mini-boss";
  respawnHours: number;
  mechanic: string;
  bulkLoot: string;
  bulkItemId?: number;
  bulkItemCount?: number;
  rareLoot: string;
  rareItemId?: number;
  rareDropChance: string;
  spawnCoords?: string;
  enabled: boolean;
  notes: string;
};

const CONTINENTS = [
  "Восточные королевства",
  "Калимдор",
  "Запределье",
  "Нордскол",
  "Пандария",
  "Дренор",
  "Расколотые острова",
] as const;

const DIFFICULTIES = [
  { key: "mini-boss", label: "Мини-босс", color: "bg-slate-100 text-slate-700" },
  { key: "rare-elite", label: "Редкий элитный", color: "bg-amber-100 text-amber-800" },
  { key: "elite", label: "Элитный", color: "bg-red-100 text-red-700" },
] as const;

type BossDraft = {
  id?: string;
  entryId: string;
  name: string;
  zone: string;
  continent: string;
  level: string;
  difficulty: "elite" | "rare-elite" | "mini-boss";
  respawnHours: string;
  mechanic: string;
  bulkLoot: string;
  bulkItemId: string;
  bulkItemCount: string;
  rareLoot: string;
  rareItemId: string;
  rareDropChance: string;
  spawnCoords: string;
  enabled: boolean;
  notes: string;
};

function emptyDraft(continent = "Расколотые острова"): BossDraft {
  const randomEntry = 900000 + Math.floor(Math.random() * 800) + 100;
  return {
    entryId: String(randomEntry),
    name: "",
    zone: "",
    continent,
    level: "110",
    difficulty: "mini-boss",
    respawnHours: "4",
    mechanic: "",
    bulkLoot: "Профессиональное сырье x1000",
    bulkItemId: "123918",
    bulkItemCount: "1000",
    rareLoot: "Уникальный трансмог-предмет",
    rareItemId: String(950000 + Math.floor(Math.random() * 900)),
    rareDropChance: "1.5%",
    spawnCoords: "X: 0, Y: 0, Z: 0",
    enabled: true,
    notes: "",
  };
}

function bossToDraft(b: WorldBoss): BossDraft {
  return {
    id: b.id,
    entryId: String(b.entryId),
    name: b.name,
    zone: b.zone,
    continent: b.continent,
    level: b.level,
    difficulty: b.difficulty,
    respawnHours: String(b.respawnHours),
    mechanic: b.mechanic,
    bulkLoot: b.bulkLoot,
    bulkItemId: String(b.bulkItemId || 0),
    bulkItemCount: String(b.bulkItemCount || 1000),
    rareLoot: b.rareLoot,
    rareItemId: String(b.rareItemId || 0),
    rareDropChance: b.rareDropChance,
    spawnCoords: b.spawnCoords || "",
    enabled: b.enabled,
    notes: b.notes || "",
  };
}

export default function BossManager({ notify }: { notify: (msg: string) => void }) {
  const [bosses, setBosses] = useState<WorldBoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContinent, setSelectedContinent] = useState("all");
  const [selectedDiff, setSelectedDiff] = useState("all");
  const [editingBoss, setEditingBoss] = useState<BossDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function fetchBosses() {
    setLoading(true);
    try {
      const res = await fetch("/api/world-bosses");
      if (res.ok) {
        const data = await res.json();
        setBosses(data);
      }
    } catch {
      notify("Не удалось загрузить мировых боссов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBosses();
  }, []);

  async function toggleBoss(id: string, enabled: boolean) {
    try {
      const res = await fetch("/api/world-bosses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) {
        setBosses((prev) => prev.map((b) => (b.id === id ? { ...b, enabled } : b)));
        notify(enabled ? "Босс активирован" : "Босс отключен");
      }
    } catch {
      notify("Ошибка при переключении статуса босса");
    }
  }

  async function saveBoss(draft: BossDraft) {
    setBusy(true);
    try {
      const payload = {
        id: draft.id,
        entryId: Number(draft.entryId),
        name: draft.name,
        zone: draft.zone,
        continent: draft.continent,
        level: draft.level,
        difficulty: draft.difficulty,
        respawnHours: Number(draft.respawnHours) || 4,
        mechanic: draft.mechanic,
        bulkLoot: draft.bulkLoot,
        bulkItemId: Number(draft.bulkItemId) || 0,
        bulkItemCount: Number(draft.bulkItemCount) || 1000,
        rareLoot: draft.rareLoot,
        rareItemId: Number(draft.rareItemId) || 0,
        rareDropChance: draft.rareDropChance,
        spawnCoords: draft.spawnCoords,
        enabled: draft.enabled,
        notes: draft.notes,
      };

      if (isNew) {
        const res = await fetch("/api/world-bosses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setBosses((prev) => [...prev, created]);
          setEditingBoss(null);
          notify(`Босс «${created.name}» успешно добавлен`);
        } else {
          const err = await res.json();
          notify(err.error || "Ошибка при добавлении");
        }
      } else {
        const res = await fetch("/api/world-bosses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setBosses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          setEditingBoss(null);
          notify(`Босс «${updated.name}» обновлен`);
        } else {
          const err = await res.json();
          notify(err.error || "Ошибка при сохранении");
        }
      }
    } catch {
      notify("Ошибка сети при сохранении");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBoss(id: string) {
    try {
      const res = await fetch(`/api/world-bosses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBosses((prev) => prev.filter((b) => b.id !== id));
        setConfirmDeleteId(null);
        notify("Босс удален из мира");
      }
    } catch {
      notify("Ошибка при удалении");
    }
  }

  const filtered = useMemo(() => {
    return bosses.filter((b) => {
      const matchSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.zone.toLowerCase().includes(search.toLowerCase()) ||
        b.mechanic.toLowerCase().includes(search.toLowerCase()) ||
        String(b.entryId).includes(search);
      const matchContinent = selectedContinent === "all" || b.continent === selectedContinent;
      const matchDiff = selectedDiff === "all" || b.difficulty === selectedDiff;
      return matchSearch && matchContinent && matchDiff;
    });
  }, [bosses, search, selectedContinent, selectedDiff]);

  const activeCount = bosses.filter((b) => b.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-[#19102b] via-[#2a1343] to-[#3a1555] p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-violet-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              60 мировых мини-боссов Азерота
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Каталог и настройка мировых боссов</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">
              Полный контроль над 60 боссами, распределенными по 7 континентам мира. Гарантированный дроп профессиональных ресурсов (по 1000 единиц) + эксклюзивный редкий лут (0.5%–3%), недоступный в обычном мире. Все изменения сохраняются в БД.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <a
              href="/api/world-bosses/export"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              <Icon name="download" size={15} />
              Экспорт world_bosses.sql
            </a>
            <button
              onClick={() => {
                setEditingBoss(emptyDraft(selectedContinent === "all" ? "Расколотые острова" : selectedContinent));
                setIsNew(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500"
            >
              <Icon name="plus" size={15} />
              Добавить босса
            </button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Всего боссов в базе</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{bosses.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Активно в игре</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Континентов охвачено</div>
          <div className="mt-1 text-2xl font-bold text-violet-600">7</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Гарантированный лут</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">x1000 рег.</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, зоне, механике или ID..."
            className="field pl-9"
          />
        </div>
        <select
          value={selectedContinent}
          onChange={(e) => setSelectedContinent(e.target.value)}
          className="field w-48"
        >
          <option value="all">Все континенты</option>
          {CONTINENTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={selectedDiff}
          onChange={(e) => setSelectedDiff(e.target.value)}
          className="field w-40"
        >
          <option value="all">Любая сложность</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">Показано: {filtered.length} из {bosses.length}</span>
      </div>

      {/* Edit / Add Modal Form */}
      {editingBoss && (
        <div className="rounded-2xl border-2 border-blue-400 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isNew ? "Создание нового мирового босса" : `Редактирование босса: ${editingBoss.name}`}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Укажите параметры моба, механику боя и гарантированный/редкий лут
              </p>
            </div>
            <button
              onClick={() => setEditingBoss(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBoss(editingBoss);
            }}
            className="mt-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="field-label">Имя босса *</label>
                <input
                  required
                  value={editingBoss.name}
                  onChange={(e) => setEditingBoss({ ...editingBoss, name: e.target.value })}
                  className="field"
                  placeholder="Например, Гримджо Лесной Владыка"
                />
              </div>
              <div>
                <label className="field-label">Entry ID (Creature ID) *</label>
                <input
                  required
                  type="number"
                  value={editingBoss.entryId}
                  onChange={(e) => setEditingBoss({ ...editingBoss, entryId: e.target.value })}
                  className="field font-mono"
                  placeholder="900001"
                />
              </div>
              <div>
                <label className="field-label">Континент *</label>
                <select
                  value={editingBoss.continent}
                  onChange={(e) => setEditingBoss({ ...editingBoss, continent: e.target.value })}
                  className="field"
                >
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Игровая зона *</label>
                <input
                  required
                  value={editingBoss.zone}
                  onChange={(e) => setEditingBoss({ ...editingBoss, zone: e.target.value })}
                  className="field"
                  placeholder="Например, Элвиннский лес"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">Уровень (или диапазон)</label>
                <input
                  value={editingBoss.level}
                  onChange={(e) => setEditingBoss({ ...editingBoss, level: e.target.value })}
                  className="field"
                  placeholder="110 или 108-112"
                />
              </div>
              <div>
                <label className="field-label">Сложность</label>
                <select
                  value={editingBoss.difficulty}
                  onChange={(e) =>
                    setEditingBoss({
                      ...editingBoss,
                      difficulty: e.target.value as "elite" | "rare-elite" | "mini-boss",
                    })
                  }
                  className="field"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Время респавна (часы)</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={editingBoss.respawnHours}
                  onChange={(e) => setEditingBoss({ ...editingBoss, respawnHours: e.target.value })}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Механика боя / Способности</label>
              <textarea
                rows={2}
                value={editingBoss.mechanic}
                onChange={(e) => setEditingBoss({ ...editingBoss, mechanic: e.target.value })}
                className="field resize-none"
                placeholder="Опишите способности босса (например, АоЕ оглушение, призыв аддов, иммунитет к магии)"
              />
            </div>

            {/* Loot Configuration Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                Настройка лута (Гарантированный x1000 + Уникальный Редкий)
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="field-label">Гарантированный лут (Описание)</label>
                  <input
                    value={editingBoss.bulkLoot}
                    onChange={(e) => setEditingBoss({ ...editingBoss, bulkLoot: e.target.value })}
                    className="field"
                    placeholder="Плотная кожа x1000"
                  />
                </div>
                <div>
                  <label className="field-label">ID предмета сырья (Item ID)</label>
                  <input
                    type="number"
                    value={editingBoss.bulkItemId}
                    onChange={(e) => setEditingBoss({ ...editingBoss, bulkItemId: e.target.value })}
                    className="field font-mono"
                    placeholder="2318"
                  />
                </div>
                <div>
                  <label className="field-label">Количество сырья</label>
                  <input
                    type="number"
                    value={editingBoss.bulkItemCount}
                    onChange={(e) => setEditingBoss({ ...editingBoss, bulkItemCount: e.target.value })}
                    className="field"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="field-label">Редкий предмет (Описание)</label>
                  <input
                    value={editingBoss.rareLoot}
                    onChange={(e) => setEditingBoss({ ...editingBoss, rareLoot: e.target.value })}
                    className="field"
                    placeholder="Клык Лесного Владыки (трансмог)"
                  />
                </div>
                <div>
                  <label className="field-label">ID редкого предмета (Custom Item ID)</label>
                  <input
                    type="number"
                    value={editingBoss.rareItemId}
                    onChange={(e) => setEditingBoss({ ...editingBoss, rareItemId: e.target.value })}
                    className="field font-mono"
                    placeholder="950001"
                  />
                </div>
                <div>
                  <label className="field-label">Шанс выпадения (%)</label>
                  <input
                    value={editingBoss.rareDropChance}
                    onChange={(e) => setEditingBoss({ ...editingBoss, rareDropChance: e.target.value })}
                    className="field"
                    placeholder="1.5%"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Координаты спавна (X, Y, Z)</label>
                <input
                  value={editingBoss.spawnCoords}
                  onChange={(e) => setEditingBoss({ ...editingBoss, spawnCoords: e.target.value })}
                  className="field font-mono text-xs"
                  placeholder="X: -9450, Y: -920, Z: 58"
                />
              </div>
              <div>
                <label className="field-label">Заметки / Локация</label>
                <input
                  value={editingBoss.notes}
                  onChange={(e) => setEditingBoss({ ...editingBoss, notes: e.target.value })}
                  className="field text-xs"
                  placeholder="Ориентир на карте, привязка к профессии"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editingBoss.enabled}
                  onChange={(e) => setEditingBoss({ ...editingBoss, enabled: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Активировать босса в мире
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBoss(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Icon name="save" size={15} />
                  {busy ? "Сохранение..." : "Сохранить босса"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Bosses List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Загрузка каталога мировых боссов...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
          Боссы не найдены по заданному фильтру.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((b) => {
            const diffInfo = DIFFICULTIES.find((d) => d.key === b.difficulty) || DIFFICULTIES[0];
            return (
              <div
                key={b.id}
                className={`group rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                  b.enabled ? "border-violet-200 bg-white" : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-900/20">
                    <Icon name="shield" size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{b.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${diffInfo.color}`}>
                        {diffInfo.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        ур. {b.level}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        #{b.entryId}
                      </code>
                      {!b.enabled && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          ОТКЛЮЧЕН
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{b.zone} ({b.continent})</span>
                      <span>·</span>
                      <span>Респавн: <b>{b.respawnHours} ч</b></span>
                      {b.spawnCoords && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-slate-400">{b.spawnCoords}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Механика:</span> {b.mechanic}
                    </div>

                    {/* Loot preview cards */}
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Гарантированный лут (100%)
                          </div>
                          <div className="text-xs font-semibold text-slate-800">{b.bulkLoot}</div>
                        </div>
                        {b.bulkItemId ? (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            ID {b.bulkItemId}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-700">
                            Редкий дроп ({b.rareDropChance})
                          </div>
                          <div className="text-xs font-semibold text-amber-900">{b.rareLoot}</div>
                        </div>
                        {b.rareItemId ? (
                          <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[10px] text-amber-800">
                            ID {b.rareItemId}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {b.notes && (
                      <div className="mt-2 text-[11px] italic text-slate-400">
                        {b.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <button
                      onClick={() => toggleBoss(b.id, !b.enabled)}
                      className={`relative h-6 w-11 rounded-full transition ${
                        b.enabled ? "bg-violet-600" : "bg-slate-300"
                      }`}
                      title={b.enabled ? "Отключить босса" : "Включить босса"}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          b.enabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingBoss(bossToDraft(b));
                          setIsNew(false);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Редактировать параметры босса"
                      >
                        <Icon name="pencil" size={15} />
                      </button>

                      {confirmDeleteId === b.id ? (
                        <div className="flex items-center gap-1 rounded-lg bg-red-50 p-1">
                          <button
                            onClick={() => deleteBoss(b.id)}
                            className="rounded px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-100"
                          >
                            Да
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(b.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          title="Удалить босса"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
