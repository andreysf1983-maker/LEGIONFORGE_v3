// ============================================================================
// LegionForge — in-browser API bridge for the standalone build.
//
// Intercepts fetch() calls to /api/* (and direct clicks on the export
// endpoints) and serves them from the client-side data layer in
// ./local-store.ts. The page components (dashboard, shop-manager,
// boss-manager, module-manager) are kept byte-identical to the original
// project — they still call fetch("/api/...") exactly as before.
// ============================================================================

import {
  buildShopSql,
  buildWorldBossesSql,
  createShopItem,
  createWorldBoss,
  deleteShopItem,
  deleteWorldBoss,
  listCustomModules,
  listMods,
  listShopItems,
  listWorldBosses,
  patchCustomModule,
  patchMod,
  patchShopItem,
  patchWorldBoss,
  putSettings,
  readSettings,
  type Result,
} from "./local-store";

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(error: string, status: number): Response {
  return json({ error }, status);
}

function parseId(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

function route(pathname: string, method: string, init?: RequestInit, search = ""): Promise<Response> {
  let body: unknown;
  if (init?.body) {
    try {
      body = JSON.parse(String(init.body));
    } catch {
      return Promise.resolve(fail("Некорректный JSON", 400));
    }
  }

  // --- /api/settings ----------------------------------------------------
  if (pathname === "/api/settings") {
    if (method === "PUT" && body) {
      return Promise.resolve(json(putSettings(body as Record<string, unknown>)));
    }
    return Promise.resolve(json(readSettings()));
  }

  // --- /api/mods ----------------------------------------------------------
  if (pathname === "/api/mods") {
    if (method === "PATCH" && body) {
      const res = patchMod(body as { id?: string; enabled?: boolean; notes?: string });
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
    return Promise.resolve(json(listMods()));
  }

  // --- /api/custom-modules --------------------------------------------------
  if (pathname === "/api/custom-modules") {
    if (method === "PATCH" && body) {
      const res = patchCustomModule(body as { id?: string; enabled?: boolean; settings?: Record<string, unknown> });
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
    return Promise.resolve(json(listCustomModules()));
  }

  // --- /api/shop --------------------------------------------------------------
  if (pathname === "/api/shop") {
    if (method === "POST" && body) {
      const res = createShopItem(body);
      return Promise.resolve(res.ok ? json(res.value, 201) : fail(res.error, res.status));
    }
    return Promise.resolve(json(listShopItems()));
  }

  if (pathname === "/api/shop/export") {
    return Promise.resolve(
      new Response(buildShopSql(), {
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": 'attachment; filename="battlepay_shop.sql"',
          "Cache-Control": "no-store",
        },
      }),
    );
  }

  const shopIdMatch = pathname.match(/^\/api\/shop\/(\d+)$/);
  if (shopIdMatch) {
    const id = parseId(shopIdMatch[1]);
    if (id === null) return Promise.resolve(fail("Некорректный ID товара", 400));
    if (method === "PATCH" && body && typeof body === "object") {
      const res = patchShopItem(id, body as Record<string, unknown>);
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
    if (method === "DELETE") {
      const res = deleteShopItem(id);
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
  }

  // --- /api/world-bosses ---------------------------------------------------------
  if (pathname === "/api/world-bosses") {
    if (method === "POST" && body && typeof body === "object") {
      const res = createWorldBoss(body as Record<string, unknown>);
      return Promise.resolve(res.ok ? json(res.value, 201) : fail(res.error, res.status));
    }
    if (method === "PATCH" && body && typeof body === "object") {
      const res = patchWorldBoss(body as Record<string, unknown>);
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
    if (method === "DELETE") {
      const id = new URLSearchParams(search).get("id") ?? "";
      const res: Result<{ ok: boolean; id: string }> = deleteWorldBoss(id);
      return Promise.resolve(res.ok ? json(res.value) : fail(res.error, res.status));
    }
    return Promise.resolve(json(listWorldBosses()));
  }

  if (pathname === "/api/world-bosses/export") {
    return Promise.resolve(
      new Response(buildWorldBossesSql(), {
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": 'attachment; filename="world_bosses.sql"',
          "Cache-Control": "no-store",
        },
      }),
    );
  }

  // --- /api/health ------------------------------------------------------------------
  if (pathname === "/api/health") {
    return Promise.resolve(json({ ok: true }));
  }

  return Promise.resolve(fail(`Неизвестный маршрут: ${pathname}`, 404));
}

// ---------------------------------------------------------------------------
// fetch() interception
// ---------------------------------------------------------------------------

const realFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url: string;
  if (typeof input === "string") url = input;
  else if (input instanceof URL) url = input.toString();
  else url = input.url;

  let parsed: URL | null = null;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    parsed = null;
  }

  if (parsed && parsed.pathname.startsWith("/api/")) {
    const method = (init?.method ?? "GET").toUpperCase();
    return route(parsed.pathname, method, init, parsed.search);
  }

  return realFetch(input as RequestInfo, init);
};

// ---------------------------------------------------------------------------
// Anchor interception — the export buttons are plain <a href="/api/...">
// links in the original markup; turn them into in-browser downloads.
// ---------------------------------------------------------------------------

function downloadText(text: string, res: Response, fallback: string): void {
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? fallback;
  const blob = new Blob([text], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest?.('a[href^="/api/"]') as HTMLAnchorElement | null;
  if (!anchor) return;
  event.preventDefault();
  const href = anchor.getAttribute("href") ?? "";
  let pathname: string;
  try {
    pathname = new URL(href, window.location.origin).pathname;
  } catch {
    return;
  }
  const fallback = pathname.includes("shop") ? "battlepay_shop.sql" : "world_bosses.sql";
  void route(pathname, "GET").then(async (res) => {
    const text = await res.text();
    downloadText(text, res, fallback);
  });
});
