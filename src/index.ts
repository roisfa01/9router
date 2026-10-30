import {
  ClientApiKey,
  Env,
  OAuthAccount,
  OpenAIChatRequest,
  OpenAIMessage
} from "./types";
import {
  getResolvedConfig,
  getUsageStats,
  isProviderReady,
  loadRawState,
  markOAuthAccountSuccess,
  reorderOAuthAccount,
  reorderOAuthAccountIds,
  setOAuthAccountPriority,
  resetAllUsageStats,
  saveRawState,
  setWaitUntilExecutor,
  upsertOAuthAccount
} from "./config/store";
import { verifyAdminAuth, verifyClientAuth } from "./middleware/auth";
import { buildModelsResponse, routeChatCompletion } from "./router/engine";
import { routeEmbeddings } from "./router/embeddings";
import {
  anthropicRequestToOpenAI,
  openAIResponseToAnthropic,
  openAIStreamToAnthropicStream
} from "./translators/anthropic";
import { generateOpenCodeConfig } from "./opencode/generator";
import { renderDashboardHtml, FAVICON_SVG } from "./ui/dashboard";
import {
  buildAntigravityAuthUrl,
  DEFAULT_ANTIGRAVITY_REDIRECT_URI,
  exchangeAntigravityCallback,
  fetchAntigravityAvailableModels,
  importAntigravityRefreshToken
} from "./providers/antigravity";
import {
  buildClaudeAuthUrl,
  CLAUDE_DEFAULT_REDIRECT_URI,
  exchangeClaudeCallback
} from "./providers/claude";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Api-Key, X-Admin-Password, Anthropic-Version, Anthropic-Beta, X-9Router-RTK, X-Session-Id, OpenAI-Beta",
  "Access-Control-Expose-Headers":
    "x-9router-provider, x-9router-model, x-9router-account, x-9router-attempts, x-9router-rtk-saved-chars"
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" }
    })
  );
}

function sanitizeOAuthAccountForClient(acc: OAuthAccount): Record<string, unknown> {
  return {
    id: acc.id,
    providerId: acc.providerId,
    email: acc.email,
    projectId: acc.projectId,
    tierId: acc.tierId || "legacy-tier",
    enabled: acc.enabled,
    hasRefreshToken: Boolean(acc.refreshToken),
    expiresAt: acc.expiresAt,
    createdAt: acc.createdAt,
    lastUsedAt: acc.lastUsedAt || null,
    lastError: acc.lastError || null,
    quotaResetAt: acc.quotaResetAt || null
  };
}

function generateRandomClientKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "sk-9r-";
  for (const b of bytes) {
    token += chars[b % chars.length];
  }
  return token;
}

function parseRefreshImportItems(
  rawInput: string
): Array<{ refreshToken: string; email?: string; projectId?: string }> {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) return [];

  // Support pasting JSON array or local 9Router db.json ({ providerConnections: [...] })
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { providerConnections?: unknown[] }).providerConnections)
          ? (parsed as { providerConnections: unknown[] }).providerConnections
          : Array.isArray((parsed as { accounts?: unknown[] }).accounts)
            ? (parsed as { accounts: unknown[] }).accounts
            : [parsed];

      const items: Array<{ refreshToken: string; email?: string; projectId?: string }> = [];
      for (const entry of list) {
        if (!entry || typeof entry !== "object") continue;
        const obj = entry as Record<string, unknown>;
        if (obj.provider && String(obj.provider) !== "antigravity") continue;
        const rt = String(obj.refreshToken || obj.refresh_token || "").trim();
        if (rt) {
          items.push({
            refreshToken: rt,
            email: typeof obj.email === "string" ? obj.email : undefined,
            projectId: typeof obj.projectId === "string" ? obj.projectId : undefined
          });
        }
      }
      if (items.length > 0) return items;
    } catch {
      // Fall back to line-by-line parsing
    }
  }

  return trimmed
    .split(/[\r\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((refreshToken) => ({ refreshToken }));
}

function convertResponsesApiToChatRequest(raw: Record<string, unknown>): OpenAIChatRequest {
  const messages: OpenAIMessage[] = [];
  if (typeof raw.instructions === "string" && raw.instructions.trim()) {
    messages.push({ role: "system", content: raw.instructions });
  }

  if (typeof raw.input === "string") {
    messages.push({ role: "user", content: raw.input });
  } else if (Array.isArray(raw.input)) {
    for (const item of raw.input as Array<Record<string, unknown>>) {
      if (item.role === "user" || item.role === "assistant" || item.role === "system") {
        const content =
          typeof item.content === "string"
            ? item.content
            : Array.isArray(item.content)
              ? item.content
                  .map((c: Record<string, unknown>) => c.text || "")
                  .filter(Boolean)
                  .join("\n")
              : "";
        messages.push({ role: item.role, content });
      }
    }
  }

  if (messages.length === 0) {
    messages.push({ role: "user", content: "Hello" });
  }

  return {
    model: String(raw.model || "9router/auto"),
    messages,
    stream: Boolean(raw.stream),
    max_tokens: typeof raw.max_output_tokens === "number" ? raw.max_output_tokens : undefined,
    temperature: typeof raw.temperature === "number" ? raw.temperature : undefined
  };
}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    if (ctx && typeof ctx.waitUntil === "function") {
      setWaitUntilExecutor((promise) => ctx.waitUntil(promise));
    } else {
      setWaitUntilExecutor(null);
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // ======================================================================
      // 1. WEB DASHBOARD & HEALTH
      // ======================================================================
      if (req.method === "GET" && (path === "/" || path === "/dashboard")) {
        return new Response(renderDashboardHtml(env.APP_NAME || "9Router Edge"), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" }
        });
      }

      if (req.method === "GET" && (path === "/favicon.ico" || path === "/favicon.svg")) {
        return new Response(FAVICON_SVG, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=86400"
          }
        });
      }

      if (req.method === "GET" && path === "/health") {
        const cfg = await getResolvedConfig(env);
        const readyProviders = cfg.providers
          .filter((p) => isProviderReady(p, env, cfg.oauthAccounts))
          .map((p) => p.id);
        const activeAgAccounts = cfg.oauthAccounts.filter(
          (a) => a.providerId === "antigravity" && a.enabled
        ).length;
        return jsonResponse({
          ok: true,
          service: "9router-cloudflare",
          version: "1.1.0",
          storageMode: cfg.storageMode,
          antigravityAccountsCount: activeAgAccounts,
          readyProvidersCount: readyProviders.length,
          readyProviders,
          endpoints: {
            openaiBaseUrl: `${url.origin}/v1`,
            chatCompletions: `${url.origin}/v1/chat/completions`,
            models: `${url.origin}/v1/models`,
            anthropicMessages: `${url.origin}/v1/messages`,
            embeddings: `${url.origin}/v1/embeddings`,
            opencodeConfig: `${url.origin}/v1/opencode.json`
          }
        });
      }

      // ======================================================================
      // 2. ADMIN DASHBOARD API (`/api/admin/*`)
      // ======================================================================
      if (path.startsWith("/api/admin/")) {
        if (!verifyAdminAuth(req, env)) {
          return jsonResponse({ error: "Unauthorized admin password" }, 401);
        }

        if (req.method === "GET" && path === "/api/admin/state") {
          const cfg = await getResolvedConfig(env, true);
          const activeAgCount = cfg.oauthAccounts.filter(
            (a) => a.providerId === "antigravity" && a.enabled
          ).length;

          return jsonResponse({
            config: {
              ...cfg,
              oauthAccounts: cfg.oauthAccounts.map(sanitizeOAuthAccountForClient),
              providers: cfg.providers.map((p) => ({
                ...p,
                ready: isProviderReady(p, env, cfg.oauthAccounts),
                keyCount:
                  p.dialect === "antigravity"
                    ? activeAgCount
                    : p.apiKeys.length + (p.dialect === "cloudflare-ai" && env.AI ? 1 : 0)
              }))
            },
            stats: await getUsageStats(env)
          });
        }

        if (req.method === "PUT" && path === "/api/admin/state") {
          const incoming = (await req.json()) as Record<string, unknown>;
          const current = await loadRawState(env, true);

          const nextState = {
            settings: {
              ...current.settings,
              ...((incoming.settings as Record<string, unknown>) || {})
            },
            providers:
              (incoming.providers as typeof current.providers) || current.providers,
            combos: Array.isArray(incoming.combos)
              ? (incoming.combos as typeof current.combos)
              : current.combos,
            clientKeys: current.clientKeys,
            oauthAccounts: current.oauthAccounts || []
          };

          const saved = await saveRawState(env, nextState);
          return jsonResponse({ ok: true, ...saved });
        }

        // --- Claude.ai Web OAuth Endpoints ---
        if (req.method === "GET" && path === "/api/admin/oauth/claude/authorize") {
          const redirectUri =
            url.searchParams.get("redirect_uri")?.trim() || CLAUDE_DEFAULT_REDIRECT_URI;
          const authData = await buildClaudeAuthUrl(redirectUri);
          return jsonResponse({ ok: true, ...authData });
        }

        if (req.method === "POST" && path === "/api/admin/oauth/claude/exchange") {
          const body = (await req.json()) as {
            callbackInput?: string;
            codeVerifier?: string;
            state?: string;
            redirectUri?: string;
          };
          if (!body.callbackInput?.trim() || !body.codeVerifier?.trim()) {
            return jsonResponse({ error: "Input URL callback dan codeVerifier dibutuhkan." }, 400);
          }

          const newAccount = await exchangeClaudeCallback({
            callbackInput: body.callbackInput,
            codeVerifier: body.codeVerifier,
            state: body.state,
            redirectUri: body.redirectUri || CLAUDE_DEFAULT_REDIRECT_URI
          });
          const upserted = await upsertOAuthAccount(env, newAccount);
          return jsonResponse({
            ok: true,
            account: sanitizeOAuthAccountForClient(upserted.account),
            updatedExisting: upserted.updatedExisting,
            persistedToKv: upserted.persistedToKv
          });
        }

        // --- Antigravity Multi-Account OAuth Endpoints ---
        if (req.method === "GET" && path === "/api/admin/oauth/antigravity/authorize") {
          const redirectUri =
            url.searchParams.get("redirect_uri")?.trim() || DEFAULT_ANTIGRAVITY_REDIRECT_URI;
          const authData = buildAntigravityAuthUrl(redirectUri);
          return jsonResponse({ ok: true, ...authData });
        }

        if (req.method === "GET" && path === "/api/admin/oauth/antigravity/available-models") {
          const current = await loadRawState(env, true);
          const acc = current.oauthAccounts.find((a) => a.providerId === "antigravity" && a.enabled);
          if (!acc) {
            return jsonResponse({ error: "Belum ada akun Antigravity aktif" }, 400);
          }
          const models = await fetchAntigravityAvailableModels(acc, env);
          return jsonResponse({ ok: true, accountEmail: acc.email, count: models.length, models });
        }

        if (req.method === "POST" && path === "/api/admin/oauth/antigravity/exchange") {
          const body = (await req.json()) as {
            callbackInput?: string;
            redirectUri?: string;
          };
          if (!body.callbackInput?.trim()) {
            return jsonResponse({ error: "Tempel URL callback atau kode otorisasi terlebih dahulu." }, 400);
          }

          const newAccount = await exchangeAntigravityCallback(
            body.callbackInput,
            body.redirectUri || DEFAULT_ANTIGRAVITY_REDIRECT_URI
          );
          const upserted = await upsertOAuthAccount(env, newAccount);
          return jsonResponse({
            ok: true,
            account: sanitizeOAuthAccountForClient(upserted.account),
            updatedExisting: upserted.updatedExisting,
            persistedToKv: upserted.persistedToKv
          });
        }

        if (req.method === "POST" && path === "/api/admin/oauth/antigravity/import-refresh") {
          const body = (await req.json()) as { rawTokens?: string };
          const items = parseRefreshImportItems(body.rawTokens || "");
          if (items.length === 0) {
            return jsonResponse({ error: "Tidak ada refresh_token atau JSON akun yang ditemukan." }, 400);
          }

          const imported: Array<Record<string, unknown>> = [];
          const errors: string[] = [];
          let persistedToKv = false;

          for (const item of items) {
            try {
              const acc = await importAntigravityRefreshToken(
                item.refreshToken,
                item.projectId,
                item.email
              );
              const saved = await upsertOAuthAccount(env, acc);
              persistedToKv = saved.persistedToKv;
              imported.push(sanitizeOAuthAccountForClient(saved.account));
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              errors.push(msg);
            }
          }

          return jsonResponse({
            ok: imported.length > 0,
            importedCount: imported.length,
            failedCount: errors.length,
            imported,
            errors,
            persistedToKv
          }, imported.length > 0 ? 200 : 400);
        }

        if (req.method === "POST" && path === "/api/admin/oauth/accounts/reorder") {
          const body = (await req.json()) as { providerId?: "antigravity" | "claude"; orderedIds?: string[] };
          if (!body.providerId || !Array.isArray(body.orderedIds)) {
            return jsonResponse({ error: "providerId dan orderedIds dibutuhkan" }, 400);
          }
          const res = await reorderOAuthAccountIds(env, body.providerId, body.orderedIds);
          return jsonResponse({ ok: res.success, persistedToKv: res.persistedToKv });
        }

        if (req.method === "POST" && path.startsWith("/api/admin/oauth/accounts/")) {
          const rest = path.slice("/api/admin/oauth/accounts/".length);
          const slashIdx = rest.indexOf("/");
          const targetId = decodeURIComponent(slashIdx > 0 ? rest.slice(0, slashIdx) : rest);
          const action = slashIdx > 0 ? rest.slice(slashIdx + 1) : "";

          const current = await loadRawState(env, true);
          const acc = current.oauthAccounts.find((a) => a.id === targetId);
          if (!acc) return jsonResponse({ error: "Akun tidak ditemukan" }, 404);

          if (action === "toggle") {
            acc.enabled = !acc.enabled;
            if (acc.enabled) {
              acc.quotaResetAt = undefined;
              acc.lastError = undefined;
              markOAuthAccountSuccess(acc.id);
            }
            const saved = await saveRawState(env, current);
            return jsonResponse({ ok: true, account: sanitizeOAuthAccountForClient(acc), ...saved });
          }

          if (action === "reset-cooldown") {
            acc.quotaResetAt = undefined;
            acc.lastError = undefined;
            markOAuthAccountSuccess(acc.id);
            const saved = await saveRawState(env, current);
            return jsonResponse({ ok: true, account: sanitizeOAuthAccountForClient(acc), ...saved });
          }

          if (action === "move-up" || action === "move-down") {
            const dir = action === "move-up" ? "up" : "down";
            const res = await reorderOAuthAccount(env, acc.id, dir);
            return jsonResponse({ ok: res.success, persistedToKv: res.persistedToKv });
          }

          if (action === "set-priority") {
            const body = (await req.json().catch(() => ({}))) as { position?: number };
            const pos = Number(body.position);
            if (!pos || pos < 1) {
              return jsonResponse({ error: "Posisi prioritas tidak valid" }, 400);
            }
            const res = await setOAuthAccountPriority(env, acc.id, pos);
            return jsonResponse({ ok: res.success, persistedToKv: res.persistedToKv });
          }
        }

        if (req.method === "DELETE" && path.startsWith("/api/admin/oauth/accounts/")) {
          const targetId = decodeURIComponent(path.slice("/api/admin/oauth/accounts/".length));
          const current = await loadRawState(env, true);
          current.oauthAccounts = current.oauthAccounts.filter((a) => a.id !== targetId);
          const saved = await saveRawState(env, current);
          return jsonResponse({ ok: true, ...saved });
        }

        // --- Stats Reset & Export ---
        if (req.method === "POST" && path === "/api/admin/stats/reset") {
          await resetAllUsageStats(env);
          return jsonResponse({ ok: true });
        }

        if (req.method === "GET" && path === "/api/admin/stats/export") {
          const format = url.searchParams.get("format") || "json";
          const period = url.searchParams.get("period") || "all";
          const stats = await getUsageStats(env);
          let logs = stats.recentLogs;

          if (env.ROUTER_DB) {
            try {
              let query = "SELECT * FROM request_logs";
              const params: unknown[] = [];
              if (period === "today") {
                const todayStr = new Date().toISOString().slice(0, 10);
                query += " WHERE date_str = ?";
                params.push(todayStr);
              } else if (period === "yesterday") {
                const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                query += " WHERE date_str = ?";
                params.push(yesterdayStr);
              } else if (period === "7d" || period === "30d" || period === "60d" || period === "90d") {
                const numDays = parseInt(period, 10) || 7;
                const cutoff = new Date(Date.now() - numDays * 86400000).toISOString();
                query += " WHERE timestamp >= ?";
                params.push(cutoff);
              }
              query += " ORDER BY timestamp DESC LIMIT 1000";

              const dbRes = await env.ROUTER_DB.prepare(query).bind(...params).all();
              if (dbRes.results && dbRes.results.length > 0) {
                logs = dbRes.results.map((r: Record<string, unknown>) => ({
                  id: String(r.id || ""),
                  timestamp: String(r.timestamp || ""),
                  requestedModel: String(r.requested_model || ""),
                  resolvedProvider: String(r.resolved_provider || ""),
                  resolvedModel: String(r.resolved_model || ""),
                  clientKeyName: r.client_key_name ? String(r.client_key_name) : undefined,
                  clientKeyMasked: r.client_key_masked ? String(r.client_key_masked) : undefined,
                  accountEmail: r.account_email ? String(r.account_email) : undefined,
                  action: String(r.action || "chat"),
                  status: Number(r.status || 200),
                  attempts: Number(r.attempts || 1),
                  latencyMs: Number(r.latency_ms || 0),
                  rtkSavedChars: Number(r.rtk_saved_chars || 0),
                  stream: Boolean(r.stream),
                  promptTokens: Number(r.prompt_tokens || 0),
                  completionTokens: Number(r.completion_tokens || 0),
                  totalTokens: Number(r.total_tokens || 0),
                  costUsd: Number(r.cost_usd || 0)
                }));
              }
            } catch {}
          } else {
            if (period === "today") {
              const todayStr = new Date().toISOString().slice(0, 10);
              logs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr));
            } else if (period === "yesterday") {
              const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
              logs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(yesterdayStr));
            } else if (period === "7d" || period === "30d" || period === "60d" || period === "90d") {
              const numDays = parseInt(period, 10) || 7;
              const cutoffMs = Date.now() - numDays * 86400000;
              logs = logs.filter((l) => l.timestamp && new Date(l.timestamp).getTime() >= cutoffMs);
            }
          }

          if (format === "csv") {
            const header = "timestamp,action,client_key,requested_model,resolved_provider,resolved_model,account_email,prompt_tokens,completion_tokens,total_tokens,cost_usd,status,latency_ms";
            const rows = logs.map((l) =>
              [
                l.timestamp,
                l.action || "chat",
                `"${(l.clientKeyName || l.clientKeyMasked || "").replace(/"/g, '""')}"`,
                l.requestedModel,
                l.resolvedProvider,
                l.resolvedModel,
                l.accountEmail || "",
                l.promptTokens || 0,
                l.completionTokens || 0,
                l.totalTokens || 0,
                l.costUsd || 0,
                l.status,
                l.latencyMs
              ].join(",")
            );
            return withCors(
              new Response([header, ...rows].join("\n"), {
                status: 200,
                headers: {
                  "content-type": "text/csv; charset=utf-8",
                  "content-disposition": `attachment; filename="9router-logs-${new Date().toISOString().slice(0, 10)}.csv"`
                }
              })
            );
          }

          return jsonResponse({ exportedAt: new Date().toISOString(), stats, logs });
        }

        // --- Client API Keys ---
        if (req.method === "POST" && path === "/api/admin/client-keys") {
          const body = (await req.json()) as {
            name?: string;
            dailyTokenLimit?: number;
            dailyRequestLimit?: number;
          };
          const current = await loadRawState(env, true);
          const newKey: ClientApiKey = {
            id: crypto.randomUUID().slice(0, 10),
            name: (body.name || "OpenCode Key").trim(),
            key: generateRandomClientKey(),
            createdAt: new Date().toISOString(),
            enabled: true,
            dailyTokenLimit: body.dailyTokenLimit ? Number(body.dailyTokenLimit) : undefined,
            dailyRequestLimit: body.dailyRequestLimit ? Number(body.dailyRequestLimit) : undefined
          };
          current.clientKeys.push(newKey);
          const saved = await saveRawState(env, current);
          return jsonResponse({ ok: true, key: newKey, ...saved });
        }

        if (req.method === "PUT" && path.startsWith("/api/admin/client-keys/")) {
          const targetId = decodeURIComponent(path.slice("/api/admin/client-keys/".length));
          const body = (await req.json()) as {
            dailyTokenLimit?: number | null;
            dailyRequestLimit?: number | null;
            enabled?: boolean;
          };
          const current = await loadRawState(env, true);
          const found = current.clientKeys.find((k) => k.id === targetId);
          if (!found) return jsonResponse({ error: "Client Key tidak ditemukan" }, 404);
          if (body.dailyTokenLimit !== undefined) {
            found.dailyTokenLimit = body.dailyTokenLimit && body.dailyTokenLimit > 0 ? Number(body.dailyTokenLimit) : undefined;
          }
          if (body.dailyRequestLimit !== undefined) {
            found.dailyRequestLimit = body.dailyRequestLimit && body.dailyRequestLimit > 0 ? Number(body.dailyRequestLimit) : undefined;
          }
          if (typeof body.enabled === "boolean") {
            found.enabled = body.enabled;
          }
          const saved = await saveRawState(env, current);
          return jsonResponse({ ok: true, key: found, ...saved });
        }

        if (req.method === "DELETE" && path.startsWith("/api/admin/client-keys/")) {
          const targetId = decodeURIComponent(path.slice("/api/admin/client-keys/".length));
          const current = await loadRawState(env, true);
          current.clientKeys = current.clientKeys.filter((k) => k.id !== targetId);
          const saved = await saveRawState(env, current);
          return jsonResponse({ ok: true, ...saved });
        }

        if (req.method === "GET" && path === "/api/admin/opencode-config") {
          const showAll = url.searchParams.get("all") === "1";
          const ocConfig = await generateOpenCodeConfig(url.origin, env, showAll);
          return jsonResponse(ocConfig);
        }

        if (req.method === "POST" && path === "/api/admin/fetch-models") {
          const body = (await req.json()) as { baseUrl?: string; apiKey?: string };
          const base = (body.baseUrl || "").trim().replace(/\/+$/, "");
          if (!base) return jsonResponse({ error: "baseUrl kosong" }, 400);
          const modelsUrl = base.endsWith("/models") ? base : `${base}/models`;
          const headers: Record<string, string> = { accept: "application/json" };
          if (body.apiKey?.trim()) {
            headers.authorization = `Bearer ${body.apiKey.trim()}`;
            headers["x-api-key"] = body.apiKey.trim();
          }
          const upRes = await fetch(modelsUrl, { headers });
          if (!upRes.ok) {
            const errTxt = (await upRes.text()).slice(0, 250);
            return jsonResponse({ error: `Gagal fetch ${modelsUrl} (${upRes.status}): ${errTxt}` }, 502);
          }
          const upJson = (await upRes.json()) as { data?: Array<{ id?: string }> };
          const ids = Array.isArray(upJson.data)
            ? upJson.data.map((m) => String(m.id || "").trim()).filter(Boolean)
            : [];
          return jsonResponse({ ok: true, count: ids.length, modelIds: ids });
        }
      }

      // ======================================================================
      // 3. PUBLIC MODEL DISCOVERY (`/v1/models` & `/models`)
      // ======================================================================
      if (req.method === "GET" && (path === "/v1/models" || path === "/models")) {
        const includeAll = url.searchParams.get("all") === "true" || url.searchParams.get("all") === "1";
        const modelsPayload = await buildModelsResponse(env, includeAll);
        return jsonResponse(modelsPayload);
      }

      // ======================================================================
      // 4. AUTHENTICATED AI AGENT ENDPOINTS (OpenCode, Cursor, Claude Code...)
      // ======================================================================
      const clientAuth = await verifyClientAuth(req, env);
      if (!clientAuth.ok) {
        const statusCode = clientAuth.status || 401;
        return jsonResponse(
          {
            error: {
              message: clientAuth.error,
              type: statusCode === 429 ? "rate_limit_exceeded" : "authentication_error",
              code: statusCode === 429 ? "daily_quota_exceeded" : "invalid_api_key"
            }
          },
          statusCode
        );
      }
      const clientAuthInfo = {
        name: clientAuth.clientKeyName || "Default Key",
        masked: clientAuth.clientKeyMasked || "sk-9r-..."
      };

      if (req.method === "GET" && (path === "/v1/opencode.json" || path === "/opencode.json")) {
        const includeAll = url.searchParams.get("all") === "true" || url.searchParams.get("all") === "1";
        const ocConfig = await generateOpenCodeConfig(url.origin, env, includeAll);
        return jsonResponse(ocConfig);
      }

      // OpenAI Chat Completions (`/v1/chat/completions` — Primary endpoint for OpenCode!)
      if (req.method === "POST" && (path === "/v1/chat/completions" || path === "/chat/completions")) {
        const body = (await req.json()) as OpenAIChatRequest;
        const response = await routeChatCompletion(body, req, env, clientAuthInfo, "chat");
        return withCors(response);
      }

      // Anthropic Messages API (`/v1/messages` — Primary endpoint for Claude Code!)
      if (req.method === "POST" && (path === "/v1/messages" || path === "/messages")) {
        const anthropicReq = (await req.json()) as Record<string, unknown>;
        const requestedModel = String(anthropicReq.model || "9router/auto");
        const openAIReq = anthropicRequestToOpenAI(anthropicReq);
        const upstreamRes = await routeChatCompletion(openAIReq, req, env, clientAuthInfo, "messages");

        if (!upstreamRes.ok) {
          return withCors(upstreamRes);
        }

        const extraHeaders: Record<string, string> = {
          "x-9router-provider": upstreamRes.headers.get("x-9router-provider") || "",
          "x-9router-model": upstreamRes.headers.get("x-9router-model") || "",
          "x-9router-account": upstreamRes.headers.get("x-9router-account") || ""
        };

        if (openAIReq.stream && upstreamRes.body) {
          const anthropicStream = openAIStreamToAnthropicStream(upstreamRes.body, requestedModel);
          return withCors(
            new Response(anthropicStream, {
              status: 200,
              headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache",
                ...extraHeaders
              }
            })
          );
        }

        const openAIJson = (await upstreamRes.json()) as Record<string, unknown>;
        const anthropicJson = openAIResponseToAnthropic(openAIJson, requestedModel);
        return withCors(
          new Response(JSON.stringify(anthropicJson), {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...extraHeaders
            }
          })
        );
      }

      // OpenAI Responses API Wrapper (`/v1/responses`)
      if (req.method === "POST" && (path === "/v1/responses" || path === "/responses")) {
        const raw = (await req.json()) as Record<string, unknown>;
        const chatReq = convertResponsesApiToChatRequest(raw);
        const res = await routeChatCompletion(chatReq, req, env);
        if (!res.ok || chatReq.stream) {
          return withCors(res);
        }
        const chatJson = (await res.json()) as Record<string, unknown>;
        const choices = (chatJson.choices as Array<Record<string, unknown>>) || [];
        const msg = (choices[0]?.message as Record<string, unknown>) || {};
        return jsonResponse({
          id: String(chatJson.id || `resp_${crypto.randomUUID().slice(0, 12)}`),
          object: "response",
          created_at: Math.floor(Date.now() / 1000),
          model: chatReq.model,
          output_text: msg.content || "",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: String(msg.content || "") }]
            }
          ],
          usage: chatJson.usage || {}
        });
      }

      // OpenAI Embeddings (`/v1/embeddings`)
      if (req.method === "POST" && (path === "/v1/embeddings" || path === "/embeddings")) {
        const body = (await req.json()) as Record<string, unknown>;
        const res = await routeEmbeddings(body, env);
        return withCors(res);
      }

      return jsonResponse(
        {
          error: {
            message: `Route tidak ditemukan: ${req.method} ${path}. Gunakan /v1/chat/completions, /v1/models, /v1/messages, atau buka / untuk Dashboard.`,
            type: "not_found"
          }
        },
        404
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonResponse(
        {
          error: {
            message: `Internal 9Router Error: ${msg}`,
            type: "internal_error"
          }
        },
        500
      );
    }
  }
};
