"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

export type CustomModule = {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  settings: Record<string, any>;
  updatedAt: string;
};

export default function ModuleManager({ notify }: { notify: (msg: string) => void }) {
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("onlineBonus");
  const [saving, setSaving] = useState(false);

  // New spell draft for Legacy Spells editor
  const [newSpell, setNewSpell] = useState({ name: "", className: "Чернокнижник", classId: 9, spellId: "", tomeItemId: "", note: "" });
  // New quest draft for Broken Quests editor
  const [newQuest, setNewQuest] = useState({ id: "", title: "", note: "" });
  // New name for Playerbots
  const [newName, setNewName] = useState("");

  async function loadModules() {
    setLoading(true);
    try {
      const res = await fetch("/api/custom-modules");
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch {
      notify("Не удалось загрузить конфигурации модулей");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

  const currentMod = modules.find((m) => m.id === activeModuleId);

  async function updateModuleSettings(modId: string, enabled: boolean, settings: Record<string, any>) {
    setSaving(true);
    try {
      const res = await fetch("/api/custom-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modId, enabled, settings }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModules((prev) => prev.map((m) => (m.id === modId ? updated : m)));
        notify(`Настройки модуля «${updated.name}» сохранены`);
      } else {
        const err = await res.json();
        notify(err.error || "Ошибка сохранения");
      }
    } catch {
      notify("Ошибка соединения при сохранении");
    } finally {
      setSaving(false);
    }
  }

  function handleSettingChange(key: string, value: any) {
    if (!currentMod) return;
    const newSettings = { ...currentMod.settings, [key]: value };
    setModules((prev) =>
      prev.map((m) => (m.id === currentMod.id ? { ...m, settings: newSettings } : m))
    );
  }

  function toggleModule(modId: string, enabled: boolean) {
    const mod = modules.find((m) => m.id === modId);
    if (!mod) return;
    updateModuleSettings(modId, enabled, mod.settings);
  }

  // Spell management helper
  function addSpellToLegacy() {
    if (!currentMod || !newSpell.name || !newSpell.spellId) {
      notify("Заполните название и SpellID");
      return;
    }
    const spells = Array.isArray(currentMod.settings.spells) ? [...currentMod.settings.spells] : [];
    spells.push({
      id: Date.now(),
      name: newSpell.name,
      className: newSpell.className,
      classId: Number(newSpell.classId),
      spellId: Number(newSpell.spellId),
      tomeItemId: Number(newSpell.tomeItemId) || 950000 + spells.length + 1,
      note: newSpell.note,
    });
    handleSettingChange("spells", spells);
    setNewSpell({ name: "", className: "Чернокнижник", classId: 9, spellId: "", tomeItemId: "", note: "" });
    notify("Способность добавлена в список обучения");
  }

  function removeSpellFromLegacy(spellIdToRemove: number) {
    if (!currentMod || !Array.isArray(currentMod.settings.spells)) return;
    const spells = currentMod.settings.spells.filter((s: any) => s.id !== spellIdToRemove && s.spellId !== spellIdToRemove);
    handleSettingChange("spells", spells);
  }

  // Quest management helper
  function addQuestToBroken() {
    if (!currentMod || !newQuest.id || !newQuest.title) {
      notify("Укажите ID и название квеста");
      return;
    }
    const questIds = Array.isArray(currentMod.settings.questIds) ? [...currentMod.settings.questIds] : [];
    questIds.push({
      id: Number(newQuest.id),
      title: newQuest.title,
      note: newQuest.note || "Ручное добавление через панель",
    });
    handleSettingChange("questIds", questIds);
    setNewQuest({ id: "", title: "", note: "" });
    notify(`Квест #${newQuest.id} добавлен в список автозавершения`);
  }

  function removeQuestFromBroken(qId: number) {
    if (!currentMod || !Array.isArray(currentMod.settings.questIds)) return;
    const questIds = currentMod.settings.questIds.filter((q: any) => q.id !== qId);
    handleSettingChange("questIds", questIds);
  }

  // Name management helper for bots
  function addBotName() {
    if (!currentMod || !newName.trim()) return;
    const names = Array.isArray(currentMod.settings.names) ? [...currentMod.settings.names] : [];
    if (!names.includes(newName.trim())) {
      names.push(newName.trim());
      handleSettingChange("names", names);
      handleSettingChange("namesCount", names.length);
      setNewName("");
      notify(`Имя «${newName.trim()}» добавлено в пул ботов`);
    }
  }

  function removeBotName(nameToRemove: string) {
    if (!currentMod || !Array.isArray(currentMod.settings.names)) return;
    const names = currentMod.settings.names.filter((n: string) => n !== nameToRemove);
    handleSettingChange("names", names);
    handleSettingChange("namesCount", names.length);
  }

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-400">Загрузка модулей...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-[#141d30] via-[#1c2e4d] to-[#174868] p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Конфигурационный центр LegionForge
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Управление кастомными модулями ядра</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">
              Глубокая настройка каждого из 8 кастомных расширений: лимиты улучшения экипировки, обучение удаленным скиллам, пул русских имен ИИ-ботов, списки компенсируемых квестов, правила свободного трансмога и дроп мировых боссов.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
            <div className="text-2xl font-bold">{modules.filter((m) => m.enabled).length} / {modules.length}</div>
            <div className="text-[10px] text-slate-300">модулей активно</div>
          </div>
        </div>
      </section>

      {/* Main Layout: Master list on left, deep settings editor on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Modules List Navigation */}
        <div className="space-y-2">
          {modules.map((mod) => {
            const isSelected = mod.id === activeModuleId;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveModuleId(mod.id)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{mod.name.split("(")[0].trim()}</span>
                      {mod.enabled ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" title="Включен" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" title="Отключен" />
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">{mod.category}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleModule(mod.id, !mod.enabled);
                    }}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      mod.enabled ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        mod.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Module Settings Form */}
        {currentMod ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">{currentMod.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    currentMod.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}>
                    {currentMod.enabled ? "АКТИВЕН" : "ОТКЛЮЧЕН"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{currentMod.description}</p>
              </div>
              <button
                disabled={saving}
                onClick={() => updateModuleSettings(currentMod.id, currentMod.enabled, currentMod.settings)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                <Icon name="save" size={15} />
                {saving ? "Сохранение..." : "Сохранить параметры"}
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* 1. ONLINE BONUS */}
              {currentMod.id === "onlineBonus" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">Награда за интервал (Сущностей)</label>
                      <input
                        type="number"
                        value={currentMod.settings.rewardAmount || 50}
                        onChange={(e) => handleSettingChange("rewardAmount", Number(e.target.value))}
                        className="field font-semibold text-amber-700"
                      />
                    </div>
                    <div>
                      <label className="field-label">Интервал начисления (минут)</label>
                      <input
                        type="number"
                        value={currentMod.settings.intervalMinutes || 60}
                        onChange={(e) => handleSettingChange("intervalMinutes", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">ID валюты в ядре</label>
                      <input
                        type="number"
                        value={currentMod.settings.currencyId || 1533}
                        onChange={(e) => handleSettingChange("currencyId", Number(e.target.value))}
                        className="field font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Минимальный уровень персонажа</label>
                      <input
                        type="number"
                        value={currentMod.settings.minLevel || 10}
                        onChange={(e) => handleSettingChange("minLevel", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div className="flex items-center gap-6 pt-5">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={currentMod.settings.afkCheck !== false}
                          onChange={(e) => handleSettingChange("afkCheck", e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        Не начислять игрокам в статусе AFK
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Системное сообщение в чат игроку</label>
                    <input
                      value={currentMod.settings.announceMessage || ""}
                      onChange={(e) => handleSettingChange("announceMessage", e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              )}

              {/* 2. ITEM UPGRADE CHAIN */}
              {currentMod.id === "itemUpgrade" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                      Лимиты прокачки экипировки (Строго зафиксированы по ТЗ)
                    </h4>
                    <p className="mt-1 text-[11px] text-red-700">
                      Легендарки улучшаются до 1200 ilvl шагами по +5 ступеней. Эндгейм-экипировка 985 улучшается до 1000 ilvl.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="field-label">ID «Концентрата силы»</label>
                      <input
                        type="number"
                        value={currentMod.settings.legendaryItemUpgradeId || 950030}
                        onChange={(e) => handleSettingChange("legendaryItemUpgradeId", Number(e.target.value))}
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="field-label">Шаг прокачки легендарки (+ilvl)</label>
                      <input
                        type="number"
                        value={currentMod.settings.legendaryStep || 5}
                        onChange={(e) => handleSettingChange("legendaryStep", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Максимальный ilvl легендарок</label>
                      <input
                        type="number"
                        value={currentMod.settings.legendaryCap || 1200}
                        onChange={(e) => handleSettingChange("legendaryCap", Number(e.target.value))}
                        className="field font-bold text-red-700"
                      />
                    </div>
                    <div>
                      <label className="field-label">Стоимость в Сущностях</label>
                      <input
                        type="number"
                        value={currentMod.settings.costEssences || 800}
                        onChange={(e) => handleSettingChange("costEssences", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">ID «Эссенции закалки» (985→1000)</label>
                      <input
                        type="number"
                        value={currentMod.settings.endgameItemUpgradeId || 950031}
                        onChange={(e) => handleSettingChange("endgameItemUpgradeId", Number(e.target.value))}
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="field-label">Мин. ilvl для эндгейм апгрейда</label>
                      <input
                        type="number"
                        value={currentMod.settings.endgameMinIlvl || 985}
                        onChange={(e) => handleSettingChange("endgameMinIlvl", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Макс. ilvl эндгейм экипировки</label>
                      <input
                        type="number"
                        value={currentMod.settings.endgameCap || 1000}
                        onChange={(e) => handleSettingChange("endgameCap", Number(e.target.value))}
                        className="field font-bold text-amber-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.preserveSockets !== false}
                        onChange={(e) => handleSettingChange("preserveSockets", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Корректно сохранять сокеты Легиона и наложенные чары при апгрейде
                    </label>
                  </div>
                </div>
              )}

              {/* 3. LEGACY SPELLS */}
              {currentMod.id === "legacySpells" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">ID NPC-продавца томов</label>
                      <input
                        type="number"
                        value={currentMod.settings.trainerNpcEntry || 900100}
                        onChange={(e) => handleSettingChange("trainerNpcEntry", Number(e.target.value))}
                        className="field font-mono"
                      />
                    </div>
                    <div>
                      <label className="field-label">Стоимость тома (Сущностей)</label>
                      <input
                        type="number"
                        value={currentMod.settings.tomeCost || 5000}
                        onChange={(e) => handleSettingChange("tomeCost", Number(e.target.value))}
                        className="field font-semibold text-amber-700"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={currentMod.settings.enforceClassCheck !== false}
                          onChange={(e) => handleSettingChange("enforceClassCheck", e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        Строгая проверка класса (воин не учит спеллы ханта)
                      </label>
                    </div>
                  </div>

                  {/* Add Spell to List */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Добавить удаленную способность в список обучения
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="field-label">Название умения</label>
                        <input
                          value={newSpell.name}
                          onChange={(e) => setNewSpell({ ...newSpell, name: e.target.value })}
                          className="field"
                          placeholder="Например, Ожог души"
                        />
                      </div>
                      <div>
                        <label className="field-label">Класс</label>
                        <select
                          value={newSpell.classId}
                          onChange={(e) => {
                            const cId = Number(e.target.value);
                            const names: Record<number, string> = {
                              1: "Воин", 2: "Паладин", 3: "Охотник", 4: "Разбойник", 5: "Жрец",
                              6: "Рыцарь смерти", 7: "Шаман", 8: "Маг", 9: "Чернокнижник", 10: "Монах",
                              11: "Друид", 12: "Охотник на демонов",
                            };
                            setNewSpell({ ...newSpell, classId: cId, className: names[cId] || "Общий" });
                          }}
                          className="field"
                        >
                          <option value={9}>Чернокнижник</option>
                          <option value={8}>Маг</option>
                          <option value={2}>Паладин</option>
                          <option value={1}>Воин</option>
                          <option value={3}>Охотник</option>
                          <option value={5}>Жрец</option>
                          <option value={6}>Рыцарь смерти</option>
                          <option value={7}>Шаман</option>
                          <option value={11}>Друид</option>
                          <option value={10}>Монах</option>
                          <option value={4}>Разбойник</option>
                          <option value={12}>Охотник на демонов</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Spell ID</label>
                        <input
                          type="number"
                          value={newSpell.spellId}
                          onChange={(e) => setNewSpell({ ...newSpell, spellId: e.target.value })}
                          className="field font-mono"
                          placeholder="103958"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={addSpellToLegacy}
                          className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Icon name="plus" size={14} /> Добавить
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of configured legacy spells */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">
                      Активные тома способностей ({Array.isArray(currentMod.settings.spells) ? currentMod.settings.spells.length : 0}):
                    </div>
                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                      {Array.isArray(currentMod.settings.spells) &&
                        currentMod.settings.spells.map((s: any) => (
                          <div key={s.id || s.spellId} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50">
                            <div>
                              <div className="font-bold text-slate-800">{s.name}</div>
                              <div className="text-[10px] text-slate-400">
                                Класс: <b className="text-slate-600">{s.className}</b> · SpellID: <code className="text-blue-600">#{s.spellId}</code> · ItemID тома: <code className="text-violet-600">#{s.tomeItemId}</code>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSpellFromLegacy(s.id || s.spellId)}
                              className="rounded p-1 text-slate-400 hover:text-red-600"
                              title="Удалить"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PLAYERBOTS */}
              {currentMod.id === "playerbots" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">Размер пула ботов</label>
                      <input
                        type="number"
                        value={currentMod.settings.botPoolCount || 128}
                        onChange={(e) => handleSettingChange("botPoolCount", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Мин. интервал фраз чата (сек)</label>
                      <input
                        type="number"
                        value={currentMod.settings.chatIntervalMin || 120}
                        onChange={(e) => handleSettingChange("chatIntervalMin", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Макс. интервал фраз чата (сек)</label>
                      <input
                        type="number"
                        value={currentMod.settings.chatIntervalMax || 240}
                        onChange={(e) => handleSettingChange("chatIntervalMax", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.autoJoinLeaderGroup !== false}
                        onChange={(e) => handleSettingChange("autoJoinLeaderGroup", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Автоприем в группу лидером
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.autoAssistLeader !== false}
                        onChange={(e) => handleSettingChange("autoAssistLeader", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Ассист лидеру группы в бою
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.useCrowdControl !== false}
                        onChange={(e) => handleSettingChange("useCrowdControl", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Использование контроля (станы, корни)
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.fillBgSlots !== false}
                        onChange={(e) => handleSettingChange("fillBgSlots", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Заполнять пустые слоты на Полях Боя
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.fillArenaSlots !== false}
                        onChange={(e) => handleSettingChange("fillArenaSlots", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Заполнять пустые слоты на Аренах
                    </label>
                  </div>

                  {/* Russian Names Pool Manager */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Пул русских имен для ботов ({Array.isArray(currentMod.settings.names) ? currentMod.settings.names.length : 0} имен)
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Новое русское имя..."
                          className="field w-44 !py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={addBotName}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg bg-white p-3 border border-slate-200">
                      {Array.isArray(currentMod.settings.names) &&
                        currentMod.settings.names.map((name: string) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-red-50 hover:text-red-700"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removeBotName(name)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. BROKEN QUESTS */}
              {currentMod.id === "brokenQuests" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.autoCompleteOnAccept !== false}
                        onChange={(e) => handleSettingChange("autoCompleteOnAccept", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Мгновенное выполнение квеста при взятии
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.notifyPlayer !== false}
                        onChange={(e) => handleSettingChange("notifyPlayer", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Уведомлять игрока о технической компенсации
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Бонус Сущностей при компенсации</label>
                      <input
                        type="number"
                        value={currentMod.settings.compensationEssences || 25}
                        onChange={(e) => handleSettingChange("compensationEssences", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Текст системного уведомления</label>
                      <input
                        value={currentMod.settings.notificationText || ""}
                        onChange={(e) => handleSettingChange("notificationText", e.target.value)}
                        className="field"
                      />
                    </div>
                  </div>

                  {/* Add Quest */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Добавить багнутый квест в список
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="field-label">Quest ID *</label>
                        <input
                          type="number"
                          value={newQuest.id}
                          onChange={(e) => setNewQuest({ ...newQuest, id: e.target.value })}
                          className="field font-mono"
                          placeholder="10280"
                        />
                      </div>
                      <div>
                        <label className="field-label">Название квеста *</label>
                        <input
                          value={newQuest.title}
                          onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                          className="field"
                          placeholder="Например, Оплот класса: Первая миссия"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={addQuestToBroken}
                          className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Icon name="plus" size={14} /> Добавить квест
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of broken quests */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">
                      Список автоматически завершаемых квестов ({Array.isArray(currentMod.settings.questIds) ? currentMod.settings.questIds.length : 0}):
                    </div>
                    <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                      {Array.isArray(currentMod.settings.questIds) &&
                        currentMod.settings.questIds.map((q: any) => (
                          <div key={q.id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50">
                            <div>
                              <div className="font-bold text-slate-800">
                                #{q.id} — {q.title}
                              </div>
                              <div className="text-[10px] text-slate-400">{q.note}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeQuestFromBroken(q.id)}
                              className="rounded p-1 text-slate-400 hover:text-red-600"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. FREE TRANSMOG */}
              {currentMod.id === "freeTransmog" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-900">
                      Свободный трансмогрификатор
                    </h4>
                    <p className="mt-1 text-[11px] text-pink-700">
                      Паладин в латах может трансмогрифицировать ткань или кожу. Сняты ограничения типов брони и оружия.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.allowCrossArmor !== false}
                        onChange={(e) => handleSettingChange("allowCrossArmor", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Разрешить трансмог брони любого типа (Латы ↔ Ткань / Кожа / Кольчуга)
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.allowCrossWeapon !== false}
                        onChange={(e) => handleSettingChange("allowCrossWeapon", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Разрешить трансмог любого оружия (Мечи ↔ Топоры / Дробящее / Кинжалы)
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.allowLegendaryTransmog !== false}
                        onChange={(e) => handleSettingChange("allowLegendaryTransmog", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Разрешить трансмог легендарного оружия (Аззиноты, Темная Скорбь)
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.ignoreLevelRequirement !== false}
                        onChange={(e) => handleSettingChange("ignoreLevelRequirement", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Игнорировать требования по уровню предмета
                    </label>
                  </div>

                  <div className="w-52">
                    <label className="field-label">Множитель стоимости трансмога</label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentMod.settings.costMultiplier || 1.0}
                      onChange={(e) => handleSettingChange("costMultiplier", parseFloat(e.target.value))}
                      className="field"
                    />
                  </div>
                </div>
              )}

              {/* 7. BATTLEPAY */}
              {currentMod.id === "battlepay" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.wKeyEnabled !== false}
                        onChange={(e) => handleSettingChange("wKeyEnabled", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Открывать магазин по нажатию кнопки W (Blizzard Store)
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.allowCharacterServices !== false}
                        onChange={(e) => handleSettingChange("allowCharacterServices", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Разрешить услуги персонажа (смена расы, фракции, внешности)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Валюта магазина</label>
                      <input
                        value={currentMod.settings.currencyName || "Сущность пробуждения"}
                        onChange={(e) => handleSettingChange("currencyName", e.target.value)}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">ID валюты (1533)</label>
                      <input
                        type="number"
                        value={currentMod.settings.currencyId || 1533}
                        onChange={(e) => handleSettingChange("currencyId", Number(e.target.value))}
                        className="field font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Приветственное сообщение магазина</label>
                    <input
                      value={currentMod.settings.bannerMessage || ""}
                      onChange={(e) => handleSettingChange("bannerMessage", e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              )}

              {/* 8. WORLD BOSSES MODULE */}
              {currentMod.id === "worldBosses" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="field-label">Количество боссов в мире</label>
                      <input
                        type="number"
                        value={currentMod.settings.totalBosses || 60}
                        onChange={(e) => handleSettingChange("totalBosses", Number(e.target.value))}
                        className="field font-bold text-violet-700"
                      />
                    </div>
                    <div>
                      <label className="field-label">Мин. игроков для макс. скалирования</label>
                      <input
                        type="number"
                        value={currentMod.settings.minPlayersForFullScaling || 5}
                        onChange={(e) => handleSettingChange("minPlayersForFullScaling", Number(e.target.value))}
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="field-label">Коэффициент скалирования на игрока</label>
                      <input
                        type="number"
                        step="0.05"
                        value={currentMod.settings.scaleFactorPerPlayer || 0.15}
                        onChange={(e) => handleSettingChange("scaleFactorPerPlayer", parseFloat(e.target.value))}
                        className="field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.dynamicScaling !== false}
                        onChange={(e) => handleSettingChange("dynamicScaling", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Динамическое масштабирование здоровья и урона под число игроков
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.announceGlobalSpawn !== false}
                        onChange={(e) => handleSettingChange("announceGlobalSpawn", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Глобальные анонсы спавна боссов в мировой чат
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.announceGlobalDefeat !== false}
                        onChange={(e) => handleSettingChange("announceGlobalDefeat", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Глобальные анонсы победы над боссом с указанием группы
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={currentMod.settings.guaranteedBulkDrop !== false}
                        onChange={(e) => handleSettingChange("guaranteedBulkDrop", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      Гарантированный профессиональный лут x1000
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
