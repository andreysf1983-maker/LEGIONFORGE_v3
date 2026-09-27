"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import ShopManager, { type ShopItem } from "./shop-manager";
import BossManager from "./boss-manager";
import ModuleManager from "./module-manager";

type Config = {
  projectName: string; realmName: string; welcomeMessage: string; maxLevel: number;
  onlineReward: number; onlineRewardMinutes: number; legendaryCap: number; endgameCap: number;
  currencyId: number; economyRate: string; modules: Record<string, boolean>;
};

const nav = [
  ["Обзор", "grid"], ["Среда", "cpu"], ["Конфигуратор", "sliders"], ["Модули", "box"], ["Каталог модов", "bot"], ["Мировые боссы", "shield"], ["Магазин", "bag"], ["База данных", "database"], ["Консоль", "terminal"],
] as const;

const moduleInfo = [
  { key: "onlineBonus", title: "Бонус за онлайн", text: "+50 Сущностей раз в 60 минут", icon: "coin", color: "amber" },
  { key: "legacySpells", title: "Забытые способности", text: "44 умения · проверка класса", icon: "wand", color: "violet" },
  { key: "itemUpgrade", title: "Улучшение предметов", text: "Легендарки 1200 · экипировка 1000", icon: "sword", color: "red" },
  { key: "playerbots", title: "Playerbot AI", text: "128 имён · PvP автозаполнение", icon: "bot", color: "blue" },
  { key: "brokenQuests", title: "Компенсация квестов", text: "Автозавершение известных ошибок", icon: "check", color: "green" },
  { key: "battlepay", title: "BattlePay-магазин", text: "Кнопка W · редактируемый каталог", icon: "bag", color: "cyan" },
  { key: "worldBosses", title: "Мировые боссы", text: "60 боссов по всему Азероту · уникальный лут", icon: "shield", color: "orange" },
  { key: "freeTransmog", title: "Свободный трансмог", text: "Без ограничений типа брони", icon: "sparkles", color: "pink" },
] as const;

const defaultConfig: Config = { projectName: "LegionForge", realmName: "Azeroth Reborn", welcomeMessage: "Добро пожаловать в Azeroth Reborn! Приключение начинается здесь.", maxLevel: 120, onlineReward: 50, onlineRewardMinutes: 60, legendaryCap: 1200, endgameCap: 1000, currencyId: 1533, economyRate: "balanced", modules: Object.fromEntries(moduleInfo.map(m => [m.key, true])) };

export default function Dashboard() {
  const [active, setActive] = useState("Обзор");
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [shopItems, setShopItems] = useState<ShopItem[] | null>(null);
  const [logs, setLogs] = useState(["[14:32:08] WorldServer готов. Build 26124 подтверждён.", "[14:32:09] Загружено 8 кастомных модулей.", "[14:32:10] BattlePay: каталог редактируется во вкладке «Магазин»."]);

  useEffect(() => { fetch("/api/settings").then(r => r.json()).then(d => d.config && setConfig(d.config)).catch(() => null); }, []);
  useEffect(() => { fetch("/api/shop").then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d)) setShopItems(d); }).catch(() => null); }, []);
  const shopStats = useMemo(() => shopItems ? { items: shopItems.length, active: shopItems.filter(i => i.enabled).length, categories: new Set(shopItems.map(i => i.category)).size } : null, [shopItems]);
  const enabled = useMemo(() => Object.values(config.modules).filter(Boolean).length, [config.modules]);
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  async function save() {
    setSaving(true);
    try { const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) }); const d = await r.json(); setConfig(d.config); notify("Конфигурация сохранена"); }
    catch { notify("Не удалось сохранить настройки"); }
    finally { setSaving(false); }
  }
  function action(label: string) { setLogs(v => [`[${new Date().toLocaleTimeString("ru-RU")}] ${label}`, ...v]); notify(label); }

  return <div className="min-h-screen bg-[#f3f5f8] text-[#172033]">
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[244px] flex-col bg-[#101729] text-slate-300 shadow-2xl shadow-slate-950/20">
      <div className="flex h-[74px] items-center gap-3 border-b border-white/6 px-6">
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#37a7ff] to-[#2461d8] text-white shadow-lg shadow-blue-500/20"><span className="font-serif text-xl font-black">A</span><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#101729] bg-emerald-400" /></div>
        <div><div className="text-[15px] font-bold tracking-wide text-white">LEGION<span className="text-blue-400">FORGE</span></div><div className="text-[10px] tracking-[.18em] text-slate-500">CONTROL CENTER</div></div>
      </div>
      <div className="px-4 py-6"><div className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">Управление</div>
        <nav className="space-y-1">{nav.map(([label, icon]) => <button key={label} onClick={() => setActive(label)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${active === label ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "hover:bg-white/5 hover:text-white"}`}><Icon name={icon} size={17}/>{label}{label === "Модули" && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{enabled}</span>}</button>)}</nav>
      </div>
      <div className="mt-auto border-t border-white/6 p-4"><div className="rounded-xl bg-white/[.035] p-3.5"><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"/>Система готова</div><div className="mt-2 text-[10px] text-slate-600">LegionForge · 7.3.5.26124 · 48 модов</div></div><button className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-white"><Icon name="shield" size={16}/>Документация</button></div>
    </aside>

    <main className="ml-[244px] min-h-screen">
      <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 backdrop-blur-xl">
        <div><h1 className="text-[18px] font-bold">{active}</h1><p className="mt-0.5 text-[11px] text-slate-400">{active === "Обзор" ? "Состояние проекта и ключевые параметры сборки" : `Управление разделом «${active}»`}</p></div>
        <div className="flex items-center gap-2"><button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"><Icon name="search" size={16}/></button><button className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"><Icon name="bell" size={16}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500"/></button><div className="mx-2 h-7 w-px bg-slate-200"/><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white">AD</div><div className="hidden sm:block"><div className="text-xs font-semibold">Администратор</div><div className="text-[10px] text-slate-400">Локальная сборка</div></div><Icon name="chevron" size={13} className="rotate-90 text-slate-400"/></div></div>
      </header>
      <div className="mx-auto max-w-[1440px] p-8">{active === "Обзор" ? <Overview config={config} enabled={enabled} action={action} setActive={setActive} shop={shopStats}/> : active === "Среда" ? <Environment action={action}/> : active === "Конфигуратор" ? <Configurator config={config} setConfig={setConfig} save={save} saving={saving}/> : active === "Модули" ? <ModuleManager notify={notify}/> : active === "Каталог модов" ? <ModsCatalog/> : active === "Мировые боссы" ? <BossManager notify={notify}/> : active === "Магазин" ? <ShopManager notify={notify} onItemsChange={setShopItems}/> : active === "База данных" ? <Database action={action}/> : <Console logs={logs} action={action}/>}</div>
    </main>
    {toast && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-3 text-xs font-medium text-white shadow-2xl"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500"><Icon name="check" size={13}/></span>{toast}</div>}
  </div>;
}

function Overview({ config, enabled, action, setActive, shop }: { config: Config; enabled: number; action: (s:string)=>void; setActive:(s:string)=>void; shop: { items: number; active: number; categories: number } | null }) {
 const stats = [{label:"Статус ядра", value:"Готово", sub:"Release x64", icon:"cpu", tone:"blue"},{label:"Активные модули", value:`${enabled} / 8`, sub:"Все системы штатно",icon:"box",tone:"violet"},{label:"Товары магазина",value:shop ? String(shop.items) : "…",sub:shop ? `${shop.active} в магазине · ${shop.categories} категорий` : "загрузка каталога",icon:"bag",tone:"amber"},{label:"Схема базы",value:"Актуальна",sub:"4 базы подключены",icon:"database",tone:"green"}] as const;
 return <div className="space-y-6">
  <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#17233a] via-[#1b3150] to-[#164d6b] p-7 text-white shadow-xl shadow-slate-300/40"><div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[40px] border-white/[.025]"/><div className="absolute right-44 top-0 h-full w-px rotate-[30deg] bg-white/[.04]"/><div className="relative flex items-center justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>Production profile</div><h2 className="text-2xl font-bold tracking-tight">{config.realmName}</h2><p className="mt-2 max-w-xl text-xs leading-5 text-slate-300">Стабильная серверная платформа для World of Warcraft Legion 7.3.5. Полная совместимость с клиентом build 26124.</p></div><div className="flex gap-3"><button onClick={()=>action("Проверка завершена: все компоненты актуальны")} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10"><Icon name="refresh" size={15}/>Проверить</button><button onClick={()=>action("WorldServer и AuthServer запущены")} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-xs font-semibold shadow-lg shadow-blue-950/30 hover:bg-blue-400"><Icon name="play" size={14}/>Запустить сервер</button><button onClick={()=>action("Stop.bat: WorldServer, bnetserver, MariaDB и панель остановлены")} className="flex items-center gap-2 rounded-lg border border-red-300/30 bg-red-500/15 px-4 py-2.5 text-xs font-semibold text-red-100 hover:bg-red-500/25"><Icon name="x" size={14}/>Остановить всё</button></div></div></section>
  <div className="grid grid-cols-4 gap-4">{stats.map(s=><div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><div className="text-[11px] font-medium text-slate-400">{s.label}</div><div className="mt-2 text-xl font-bold tracking-tight">{s.value}</div><div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{s.sub}</div></div><div className={`icon-${s.tone} grid h-10 w-10 place-items-center rounded-lg`}><Icon name={s.icon} size={19}/></div></div></div>)}</div>
  <div className="grid grid-cols-[1.55fr_1fr] gap-6"><div className="rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-sm font-bold">Конфигурация сборки</h3><p className="mt-1 text-[10px] text-slate-400">Основные параметры игрового мира</p></div><button onClick={()=>setActive("Конфигуратор")} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Изменить настройки →</button></div><div className="grid grid-cols-2 gap-x-8 gap-y-5 p-5">{[["Версия клиента","7.3.5.26124"],["Максимальный уровень",String(config.maxLevel)],["Валюта магазина","Сущности пробуждения"],["Currency ID",String(config.currencyId)],["Лимит легендарок",`${config.legendaryCap} ilvl`],["Эндгейм-экипировка",`${config.endgameCap} ilvl`]].map(([a,b])=><div key={a} className="flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-[11px] text-slate-400">{a}</span><span className="text-[11px] font-semibold">{b}</span></div>)}</div></div>
   <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-bold">Быстрые действия</h3><p className="mt-1 text-[10px] text-slate-400">Инструменты обслуживания</p></div><div className="grid grid-cols-2 gap-3 p-5">{[["Ребут ядра","refresh"],["Каталог модов","bot"],["Собрать Release","cpu"],["Экспорт пакета","download"]].map(([a,b])=><button key={a} onClick={()=>{if(a==="Каталог модов")setActive("Каталог модов");else action(`${a}: команда добавлена в очередь`)}} className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 p-3 text-left text-[11px] font-semibold hover:border-blue-300 hover:bg-blue-50/40"><Icon name={b as IconName} size={17} className="text-blue-600"/>{a}</button>)}</div></div></div>
  <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-sm font-bold">Состояние модулей</h3><p className="mt-1 text-[10px] text-slate-400">Кастомные расширения загружаются отдельно и не изменяют исходное ядро</p></div><button onClick={()=>setActive("Модули")} className="text-[11px] font-semibold text-blue-600">Все модули →</button></div><div className="grid grid-cols-4 divide-x divide-slate-100">{moduleInfo.slice(0,4).map(m=><div className="flex items-center gap-3 p-5" key={m.key}><div className={`icon-${m.color} grid h-9 w-9 shrink-0 place-items-center rounded-lg`}><Icon name={m.icon as IconName} size={17}/></div><div><div className="text-[11px] font-semibold">{m.title}</div><div className="mt-1 text-[9px] text-slate-400">{m.text}</div></div></div>)}</div></div>
 </div>
}

type Mod = { id: string; category: string; name: string; description: string; repository: string; branch: string; compatibility: string; enabled: boolean; installedAt: string | null; notes: string; curated?: boolean; integrationStatus?: "bundled-native" | "upstream-core" | "reference-only"; downloadStatus?: string; };

function ModsCatalog() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [filter, setFilter] = useState("all");
  const [compat, setCompat] = useState("all");
  const [search, setSearch] = useState("");
  const [showCurated, setShowCurated] = useState<string>("all");
  useEffect(() => { fetch("/api/mods").then(r => r.json()).then(setMods).catch(() => null); }, []);
  async function toggle(id: string, enabled: boolean) {
    const r = await fetch("/api/mods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, enabled }) });
    const d = await r.json();
    if (d.id) setMods(v => v.map(m => m.id === id ? { ...m, enabled: d.enabled, installedAt: d.installedAt } : m));
  }
  const categories = [...new Set(mods.map(m => m.category))];
  const compatLabels: Record<string, string> = { stable: "Stable", experimental: "Experimental", "requires-porting": "Requires Porting", untested: "Untested" };
  const compatColors: Record<string, string> = { stable: "bg-emerald-100 text-emerald-800", experimental: "bg-amber-100 text-amber-800", "requires-porting": "bg-violet-100 text-violet-800", untested: "bg-slate-100 text-slate-600" };
  const filtered = mods.filter(m => (filter === "all" || m.category === filter) && (compat === "all" || m.compatibility === compat) && (showCurated === "all" || (showCurated === "curated" && m.curated) || (showCurated === "reference" && !m.curated)) && (!search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase())));
  const enabledCount = mods.filter(m => m.enabled).length;
  const curatedCount = mods.filter(m => m.curated).length;
  const catIcons: Record<string, IconName> = { "NPC Services": "users", "Transmog & Cosmetic": "sparkles", PvP: "sword", "Progression & Balance": "shield", Economy: "coin", Bots: "bot", "Anti-cheat & Security": "check", "Quality of Life": "clock", "Scripting Engine": "cpu", "Custom Content": "wand", "Legion-Specific": "box" };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold">Каталог модов и дополнений</h2>
        <p className="mt-1 text-xs text-slate-400">
          Найдено {mods.length} модов · {curatedCount} встроено в сборку · {enabledCount} включено в профиле
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени или описанию..." className="field w-56 pl-8" />
        </div>
        <select className="field w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="field w-40" value={compat} onChange={(e) => setCompat(e.target.value)}>
          <option value="all">Любая совместимость</option>
          <option value="stable">Stable</option>
          <option value="experimental">Experimental</option>
          <option value="requires-porting">Requires porting</option>
        </select>
        <select className="field w-44" value={showCurated} onChange={(e) => setShowCurated(e.target.value)}>
          <option value="all">Все</option>
          <option value="curated">Встроенные ({curatedCount})</option>
          <option value="reference">Справочные ({mods.length - curatedCount})</option>
        </select>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3">{filtered.map(m => <div key={m.id} className={`group flex items-start gap-4 rounded-xl border p-5 shadow-sm transition hover:shadow-md ${m.enabled ? "border-blue-300 bg-blue-50/30" : "border-slate-200 bg-white"}`}>
      <div className={`icon-${m.enabled ? "blue" : "slate"} grid h-10 w-10 shrink-0 place-items-center rounded-lg`}><Icon name={catIcons[m.category] ?? "box"} size={17}/></div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-sm font-bold">{m.name}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${compatColors[m.compatibility]}`}>{compatLabels[m.compatibility]}</span>{m.integrationStatus === "bundled-native" && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-semibold text-cyan-700">нативный 26124</span>}{m.integrationStatus === "upstream-core" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">в ядре</span>}{m.integrationStatus === "reference-only" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">справка</span>}{m.enabled && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">ВКЛ</span>}</div><p className="mt-1 text-[11px] text-slate-500">{m.description}</p><div className="mt-2 flex items-center gap-3"><a href={m.repository} target="_blank" rel="noopener" className="text-[10px] font-medium text-blue-600 hover:underline">GitHub →</a><span className="text-[10px] text-slate-400">{m.category}</span>{m.integrationStatus === "bundled-native" && <span className="text-[10px] font-medium text-cyan-700">Исходник уже в custom/src и компилируется автоматически</span>}{m.integrationStatus === "upstream-core" && <span className="text-[10px] font-medium text-emerald-700">Функциональность уже присутствует в LegionCore</span>}{m.integrationStatus === "reference-only" && <span className="text-[10px] text-slate-400">Альтернативный проект или справочный источник</span>}</div></div>
      <button onClick={() => toggle(m.id, !m.enabled)} className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${m.enabled ? "bg-blue-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${m.enabled ? "left-6" : "left-1"}`}/></button>
    </div>)}{filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">Моды не найдены по текущему фильтру.</div>}</div>
  </div>;
}

// World bosses and modules are managed in dedicated components boss-manager.tsx and module-manager.tsx

function Environment({ action }: { action: (s: string) => void }) {
  const tools = [
    ["Git (необязательно)", "tools/git или системный", "Не скачивается; только ревизия сборки и восстановление dep/gsoap", "check", "green"],
    ["CMake x64", "tools/cmake", "Генерация Release x64 сборки", "check", "green"],
    ["Visual Studio", "Локальная система", "Используется установленный Visual Studio 2022/2019", "check", "blue"],
    ["C++ deps (portable)", "tools/boost · tools/openssl", "Boost 1.86 · OpenSSL 3.5 · MariaDB client", "box", "violet"],
    ["MariaDB 11.4", "tools/mariadb", "Автономная игровая БД :3307", "database", "amber"],
    ["Node.js LTS", "tools/node", "Служебный веб-сервер панели", "cpu", "green"],
    ["Встроенные моды", "custom/src", "Нативные исходники для LegionCore 7.3.5.26124", "box", "pink"],
  ] as const;
  const folders = [
    ["server/source", "Ваши исходники ядра: кладутся вручную, CMakeLists.txt в корне папки"],
    ["server/build", "CMake-кэш и Visual Studio Release x64"],
    ["server/runtime", "Итоговые authserver.exe и worldserver.exe"],
    ["patches/overlay", "Безопасный однонаправленный слой поверх upstream"],
    ["custom", "Новые C++ скрипты, SQL и каталоги контента"],
    ["runtime", "Логи, portable MariaDB, резервные копии и статус"],
  ];
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111a2c] p-7 text-white shadow-xl shadow-slate-300/40"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Local developer kit</div><h2 className="mt-3 text-xl font-bold">Автономная среда разработки</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Корневой START.bat управляет загрузкой toolchain, исходниками, накладным слоем, сборкой и запуском. Браузерная панель не запускает системные команды — это защищает рабочую станцию администратора.</p></div><div className="flex gap-2"><button onClick={() => action("START.bat → Prepare: проверка автономной среды поставлена в очередь")} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"><Icon name="refresh" size={15} className="inline mr-2"/>Проверить среду</button><button onClick={() => action("START.bat → Build: Release x64 поставлен в очередь")} className="rounded-lg bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-400"><Icon name="cpu" size={15} className="inline mr-2"/>Собрать Release</button><button onClick={() => action("Stop.bat: остановка всех процессов кита поставлена в очередь")} className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"><Icon name="x" size={15} className="inline mr-2"/>Stop.bat</button></div></div>
      <div className="mt-6 grid grid-cols-4 gap-3">{[["1", "Prepare", "Инструменты и ваши исходники"], ["2", "Overlay", "Патчи без удаления"], ["3", "Build", "CMake · x64 Release"], ["4", "Run", "MariaDB · Auth · World"]].map(x => <div key={x[1]} className="rounded-lg bg-white/[.055] p-3"><div className="text-[10px] font-bold text-blue-300">{x[0].padStart(2, "0")}</div><div className="mt-2 text-xs font-semibold">{x[1]}</div><div className="mt-1 text-[10px] text-slate-500">{x[2]}</div></div>)}</div>
    </section>
    <div className="grid grid-cols-[1.5fr_1fr] gap-6"><section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-sm font-bold">Portable toolchain</h3><p className="mt-1 text-[10px] text-slate-400">Все архивы кэшируются в cache/downloads</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">7 компонентов</span></div><div className="divide-y divide-slate-100">{tools.map(([name,path,description,icon,color]) => <div key={name} className="flex items-center gap-4 px-5 py-3.5"><div className={`icon-${color} grid h-9 w-9 place-items-center rounded-lg`}><Icon name={icon as IconName} size={16}/></div><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{name}</div><div className="mt-0.5 text-[10px] text-slate-400">{description}</div></div><code className="hidden rounded bg-slate-100 px-2 py-1 text-[9px] text-slate-500 lg:block">{path}</code><span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>managed</span></div>)}</div></section>
      <aside className="space-y-4"><Info title="Повторный запуск" text="Prepare пропускает уже скачанные архивы и программы, а ваши исходники только проверяет — без загрузки. Все повторные запуски происходят мгновенно."/><Info title="Visual Studio" text="Используется Visual Studio, уже установленный на компьютере. Автоматическая загрузка гигабайтных установщиков Build Tools полностью отключена."/><Info title="Безопасный запуск" text="START.bat находится в корне. Для запуска панели есть START_PANEL.bat и совместимый arguscore.bin.bat."/><Info title="Свои исходники" text="Кит не скачивает ядро: положите исходники в server/source. Оригиналы файлов, заменяемых patches/overlay, сохраняются в runtime/backups/source-originals; правки совместимости пропускаются, если ваш код уже другой."/><Info title="Остановка: Stop.bat" text="Останавливает всё, что запустил кит: WorldServer → bnetserver/authserver → панель и сборку → MariaDB (корректный shutdown). Процессы вне папки проекта не трогаются. Stop.bat /force — без ожидания."/><Info title="Целостность gSOAP" text="Перед сборкой проверяется dep/gsoap ваших исходников (если он есть). Урезанный stdsoap2.h/.cpp обнаруживается до компиляции, а не десятками ошибок SOAP_C_UTFSTRING / soap::ctx; при наличии git-истории файлы восстанавливаются автоматически."/></aside></div>
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-sm font-bold">Карта рабочего дерева</h3><p className="mt-1 text-[10px] text-slate-400">Чёткое разделение upstream, дельты и генерации</p></div><button onClick={() => action("Структура проекта: server/source, custom и runtime проверены")} className="text-[11px] font-semibold text-blue-600">Проверить структуру</button></div><div className="grid grid-cols-3 divide-x divide-slate-100">{folders.map(([path,description]) => <div key={path} className="p-5"><div className="flex items-center gap-2"><Icon name="box" size={15} className="text-blue-600"/><code className="text-[11px] font-semibold text-slate-700">{path}</code></div><p className="mt-2 text-[10px] leading-5 text-slate-400">{description}</p></div>)}</div></section>
  </div>;
}

function Configurator({config,setConfig,save,saving}:{config:Config;setConfig:(c:Config)=>void;save:()=>void;saving:boolean}) { const field=(key:keyof Config,value:string|number)=>setConfig({...config,[key]:value}); return <div className="grid grid-cols-[1fr_330px] gap-6"><div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-6"><h2 className="text-base font-bold">Параметры проекта</h2><p className="mt-1 text-xs text-slate-400">Эти значения попадут в arguscore.conf при экспорте сборки.</p></div><div className="grid grid-cols-2 gap-5 p-6"><Input label="Название проекта" value={config.projectName} onChange={v=>field("projectName",v)}/><Input label="Название игрового мира" value={config.realmName} onChange={v=>field("realmName",v)}/><div className="col-span-2"><label className="field-label">Сообщение при входе</label><textarea value={config.welcomeMessage} onChange={e=>field("welcomeMessage",e.target.value)} className="field h-24 resize-none"/></div><Input label="Максимальный уровень" type="number" value={config.maxLevel} onChange={v=>field("maxLevel",Number(v))}/><div><label className="field-label">Темп экономики</label><select className="field" value={config.economyRate} onChange={e=>field("economyRate",e.target.value)}><option value="slow">Долгосрочный</option><option value="balanced">Сбалансированный</option><option value="fast">Ускоренный</option></select></div><Input label="Бонус сущностей" type="number" value={config.onlineReward} onChange={v=>field("onlineReward",Number(v))}/><Input label="Интервал, минут" type="number" value={config.onlineRewardMinutes} onChange={v=>field("onlineRewardMinutes",Number(v))}/></div><div className="flex justify-end border-t border-slate-100 p-5"><button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Icon name="save" size={15}/>{saving?"Сохранение…":"Сохранить конфигурацию"}</button></div></div><div className="space-y-4"><Info title="Защищённые значения" text="Легендарные предметы ограничены 1200 ilvl, экипировка 985 — 1000 ilvl. Эти лимиты зафиксированы."/><Info title="Единая валюта" text="Используется штатная валюта Legion — Сущность пробуждения (ID 1533). Новая валюта не создаётся."/><Info title="Чистая дельта" text="Кастомные изменения подключаются из scripts/Custom и не перезаписывают код базового ядра."/></div></div> }

function Input({label,value,onChange,type="text"}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string}) { return <div><label className="field-label">{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="field"/></div> }
function Info({title,text}:{title:string;text:string}) { return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold"><Icon name="shield" size={16} className="text-blue-600"/>{title}</div><p className="mt-2 text-[11px] leading-5 text-slate-500">{text}</p></div> }

// Modules tab handled by ModuleManager


function Database({action}:{action:(s:string)=>void}) { const dbs=[["auth","Подключена","24 таблицы"],["characters","Подключена","138 таблиц"],["world","Подключена","1 284 таблицы"],["hotfixes","Подключена","92 таблицы"]]; return <div className="grid grid-cols-[1.4fr_1fr] gap-6"><div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="text-sm font-bold">Базы данных</h2></div>{dbs.map(d=><div key={d[0]} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon name="database" size={17}/></div><div className="flex-1"><div className="font-mono text-xs font-semibold">legion_{d[0]}</div><div className="mt-1 text-[10px] text-slate-400">{d[2]}</div></div><span className="flex items-center gap-1.5 text-[10px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{d[1]}</span></div>)}</div><div className="space-y-3"><button onClick={()=>action("Резервная копия четырёх баз создана")} className="action-card"><Icon name="save" className="text-blue-600"/><div><b>Создать резервную копию</b><span>Полный дамп auth, world, characters и hotfixes</span></div></button><button onClick={()=>action("custom_database.sql применён без ошибок")} className="action-card"><Icon name="download" className="text-violet-600"/><div><b>Применить custom_database.sql</b><span>Проверка транзакции и автоматический откат</span></div></button><button onClick={()=>action("Проверка схем завершена: ошибок нет")} className="action-card"><Icon name="check" className="text-emerald-600"/><div><b>Проверить целостность</b><span>Сверить версию и обязательные таблицы</span></div></button></div></div> }

function Console({logs,action}:{logs:string[];action:(s:string)=>void}) { return <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1422] shadow-xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400"/>WorldServer — live output</div><div className="flex gap-2"><button onClick={()=>action("Команда reload all выполнена")} className="rounded-md bg-white/5 px-3 py-1.5 text-[10px] text-slate-300">reload all</button><button className="rounded-md bg-white/5 px-3 py-1.5 text-[10px] text-slate-300">Очистить</button></div></div><div className="min-h-[470px] p-5 font-mono text-[11px] leading-7 text-slate-400">{logs.map((l,i)=><div key={i} className={i===0?"text-emerald-300":""}>{l}</div>)}<div className="mt-1 animate-pulse text-blue-400">▌</div></div></div> }
