import { DEFAULT_COMBOS, DEFAULT_PROVIDERS } from "./catalog";
import {
  CavemanLevel,
  ClientApiKey,
  ComboConfig,
  Env,
  OAuthAccount,
  ProviderConfig,
  RequestLogEntry,
  RouterSettings,
  RouterState,
  UsageStats
} from "../types";

const KV_STATE_KEY = "9router:state:v1";
const KV_STATS_KEY = "9router:stats:v1";
const CACHE_TTL_MS = 15_000;

let memoryState: RouterState | null = null;
let lastKvLoadAt = 0;
let statsLoadedFromKv = false;
let pendingKvStatsSave: Promise<void> | null = null;
let lastStatsSaveAt = 0;
let statsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let lastD1SyncAt = 0;
const pendingLogInserts = new Map<string, Promise<unknown>>();

const D1_SYNC_TTL_MS = 60_000;

// Cloudflare Workers cancels dangling promises once the response is returned.
// Register the ExecutionContext.waitUntil so stats writes always complete.
let waitUntilExecutor: ((promise: Promise<unknown>) => void) | null = null;

export function setWaitUntilExecutor(fn: ((promise: Promise<unknown>) => void) | null): void {
  waitUntilExecutor = fn;
}

function keepAlive(promise: Promise<unknown>): void {
  const guarded = promise.catch(() => {});
  if (waitUntilExecutor) {
    try {
      waitUntilExecutor(guarded);
      return;
    } catch {
      // fall through
    }
  }
  // Best effort: nothing else we can do without an ExecutionContext.
}

/** Persist runtime stats to KV, debounced so we never exceed the 1 write/sec/key limit. */
function scheduleStatsSave(env?: Env): void {
  if (!env?.ROUTER_KV) return;

  const doSave = () => {
    statsSaveTimer = null;
    lastStatsSaveAt = Date.now();
    pendingKvStatsSave = env.ROUTER_KV!.put(KV_STATS_KEY, JSON.stringify(runtimeStats)).catch(() => {});
    keepAlive(pendingKvStatsSave);
  };

  const elapsed = Date.now() - lastStatsSaveAt;
  if (elapsed >= 2_000) {
    doSave();
    return;
  }
  // Trailing write: make sure the latest counters are flushed once the window passes.
  if (statsSaveTimer) return;
  statsSaveTimer = setTimeout(doSave, 2_000 - elapsed + 50);
}

// In-memory runtime metrics & rate-limit cooldowns (avoids burning Cloudflare KV free daily write quota!)
const keyCooldowns = new Map<string, number>();
const oauthCooldowns = new Map<string, { until: number; reason: string }>();
const oauthLastUsed = new Map<string, string>();
const roundRobinCounters = new Map<string, number>();

const runtimeStats: UsageStats = {
  totalRequests: 0,
  totalFallbacks: 0,
  totalRtkSavedChars: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  byProvider: {},
  byModel: {},
  byKey: {},
  byDate: {},
  recentLogs: []
};

export function estimateModelCostUsd(modelId: string, promptTokens: number, completionTokens: number): number {
  const m = (modelId || "").toLowerCase();
  let inRatePer1M = 2.0;
  let outRatePer1M = 8.0;

  if (m.includes("opus")) {
    inRatePer1M = 15.0;
    outRatePer1M = 75.0;
  } else if (m.includes("sonnet")) {
    inRatePer1M = 3.0;
    outRatePer1M = 15.0;
  } else if (m.includes("argon") || m.includes("pro") || m.includes("gpt-4.1") || m.includes("gpt-4o")) {
    inRatePer1M = 2.5;
    outRatePer1M = 10.0;
  } else if (m.includes("flash") || m.includes("haiku") || m.includes("mini")) {
    inRatePer1M = 0.35;
    outRatePer1M = 1.4;
  } else if (m.includes("deepseek") || m.includes("qwen") || m.includes("llama") || m.includes("gpt-oss")) {
    inRatePer1M = 0.5;
    outRatePer1M = 1.5;
  }

  return Number((((promptTokens / 1_000_000) * inRatePer1M) + ((completionTokens / 1_000_000) * outRatePer1M)).toFixed(6));
}

export function parseKeyList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((k) => String(k).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return [];
}

function defaultSettings(env: Env): RouterSettings {
  const caveman = (env.DEFAULT_CAVEMAN_MODE || "off") as CavemanLevel;
  return {
    rtkEnabled: env.DEFAULT_RTK_ENABLED !== "false",
    rtkMaxToolChars: 12000,
    cavemanMode: ["off", "light", "medium", "ultra"].includes(caveman) ? caveman : "off",
    timeoutMs: 90000,
    requireAuth: true
  };
}

const STALE_AG_COMBO_ROUTES = new Set([
  "antigravity/claude-sonnet-5-5-high",
  "antigravity/claude-opus-5-5-high",
  "antigravity/claude-sonnet-4-6",
  "antigravity/claude-opus-4-6-thinking",
  "antigravity/gemini-3.8-flash-high",
  "antigravity/gemini-3.1-pro-high"
]);

function mergeDefaultAntigravityCombos(savedCombos: ComboConfig[]): ComboConfig[] {
  const result = structuredClone(savedCombos);
  if (!result.some((c) => c.id === "9router/antigravity")) {
    const agCombo = DEFAULT_COMBOS.find((c) => c.id === "9router/antigravity");
    if (agCombo) {
      result.splice(1, 0, structuredClone(agCombo));
    }
  }
  if (!result.some((c) => c.id === "9router/gemini")) {
    const gemCombo = DEFAULT_COMBOS.find((c) => c.id === "9router/gemini");
    if (gemCombo) {
      result.splice(2, 0, structuredClone(gemCombo));
    }
  }

  for (const combo of result) {
    const defaultMatch = DEFAULT_COMBOS.find((dc) => dc.id === combo.id);
    if (!defaultMatch) continue;
    // Automatically upgrade earlier default combos that had Paid-only/deprecated Antigravity IDs at the top
    if (combo.routes.some((r) => STALE_AG_COMBO_ROUTES.has(r))) {
      combo.routes = structuredClone(defaultMatch.routes);
      combo.description = defaultMatch.description;
    } else if (
      combo.id === "9router/auto" &&
      !combo.routes.some((r) => r.startsWith("antigravity/") || r.startsWith("ag/"))
    ) {
      combo.routes.unshift(
        "antigravity/claude-sonnet-4-6",
        "antigravity/claude-opus-4-6-thinking",
        "antigravity/gemini-3.8-flash-high",
        "antigravity/gemini-2.5-pro"
      );
    }
  }
  return result;
}

export async function loadRawState(env: Env, forceRefresh = false): Promise<RouterState> {
  const now = Date.now();
  if (env.ROUTER_KV && (forceRefresh || !memoryState || now - lastKvLoadAt > CACHE_TTL_MS)) {
    try {
      const saved = await env.ROUTER_KV.get<RouterState>(KV_STATE_KEY, "json");
      lastKvLoadAt = now;
      if (saved) {
        memoryState = {
          settings: { ...defaultSettings(env), ...(saved.settings || {}) },
          providers: saved.providers || {},
          combos:
            Array.isArray(saved.combos) && saved.combos.length > 0
              ? mergeDefaultAntigravityCombos(saved.combos)
              : structuredClone(DEFAULT_COMBOS),
          clientKeys: Array.isArray(saved.clientKeys) ? saved.clientKeys : [],
          oauthAccounts: Array.isArray(saved.oauthAccounts) ? saved.oauthAccounts : []
        };
      }
    } catch {
      // Fallback to in-memory state if KV read fails
    }
  }

  if (!memoryState) {
    memoryState = {
      settings: defaultSettings(env),
      providers: {},
      combos: structuredClone(DEFAULT_COMBOS),
      clientKeys: [],
      oauthAccounts: []
    };
  }

  if (!Array.isArray(memoryState.oauthAccounts)) {
    memoryState.oauthAccounts = [];
  }

  // Ensure at least one usable client key exists
  if (memoryState.clientKeys.length === 0) {
    const envRouterKey =
      typeof env.ROUTER_API_KEY === "string" && env.ROUTER_API_KEY.trim()
        ? env.ROUTER_API_KEY.trim()
        : "sk-9r-opencode-default";
    memoryState.clientKeys.push({
      id: "default",
      name: "Default OpenCode Key",
      key: envRouterKey,
      createdAt: new Date().toISOString(),
      enabled: true
    });
  }

  return memoryState;
}

export async function saveRawState(env: Env, nextState: RouterState): Promise<{ persistedToKv: boolean }> {
  memoryState = nextState;
  lastKvLoadAt = Date.now();
  if (env.ROUTER_KV) {
    await env.ROUTER_KV.put(KV_STATE_KEY, JSON.stringify(nextState));
    return { persistedToKv: true };
  }
  return { persistedToKv: false };
}

export interface ResolvedRouterConfig {
  settings: RouterSettings;
  providers: ProviderConfig[];
  combos: ComboConfig[];
  clientKeys: ClientApiKey[];
  oauthAccounts: OAuthAccount[];
  storageMode: "d1-kv" | "kv" | "memory-env";
}

export function hydrateOAuthAccountsRuntime(accounts: OAuthAccount[]): OAuthAccount[] {
  const now = Date.now();
  return accounts.map((acc) => {
    const cd = oauthCooldowns.get(acc.id);
    const activeResetAt =
      cd && cd.until > now
        ? cd.until
        : acc.quotaResetAt && acc.quotaResetAt > now
          ? acc.quotaResetAt
          : undefined;
    return {
      ...acc,
      quotaResetAt: activeResetAt,
      lastError: cd && cd.until > now ? cd.reason : acc.lastError,
      lastUsedAt: oauthLastUsed.get(acc.id) || acc.lastUsedAt
    };
  });
}

export async function getResolvedConfig(env: Env, forceRefresh = false): Promise<ResolvedRouterConfig> {
  const state = await loadRawState(env, forceRefresh);
  const providers: ProviderConfig[] = [];
  const seenIds = new Set<string>();

  for (const base of DEFAULT_PROVIDERS) {
    seenIds.add(base.id);
    const override = state.providers[base.id] || {};
    const envKeys = base.envKey ? parseKeyList(env[base.envKey]) : [];
    const defaultKeys = parseKeyList(base.apiKeys);
    const storedKeys = override.apiKeys !== undefined ? parseKeyList(override.apiKeys) : defaultKeys;
    const mergedKeys = Array.from(new Set([...storedKeys, ...envKeys]));

    // Preserve upstreamModelId on default models even when edited from Dashboard
    let resolvedModels = base.models;
    if (Array.isArray(override.models) && override.models.length > 0) {
      resolvedModels = override.models.map((m) => {
        const baseMatch = base.models.find((bm) => bm.id === m.id);
        return baseMatch ? { ...baseMatch, ...m, upstreamModelId: m.upstreamModelId || baseMatch.upstreamModelId } : m;
      });
      // Append any newly added flagship base models (e.g. gemini-4-argon) if not in saved override
      for (const bm of base.models) {
        if (!resolvedModels.some((m) => m.id === bm.id)) {
          resolvedModels.unshift(bm);
        }
      }
    }

    providers.push({
      ...base,
      enabled: override.enabled ?? base.enabled,
      baseUrl: override.baseUrl?.trim() || base.baseUrl,
      extraHeaders: { ...(base.extraHeaders || {}), ...(override.extraHeaders || {}) },
      models: resolvedModels,
      apiKeys: mergedKeys
    });
  }

  // Append custom user-defined providers from Dashboard
  for (const [id, custom] of Object.entries(state.providers)) {
    if (seenIds.has(id) || !custom.custom) continue;
    providers.push({
      id,
      aliases: custom.aliases || [],
      name: custom.name || id,
      tier: custom.tier || "tier2-cheap",
      dialect: custom.dialect || "openai",
      baseUrl: custom.baseUrl || "",
      enabled: custom.enabled ?? true,
      apiKeys: parseKeyList(custom.apiKeys),
      extraHeaders: custom.extraHeaders || {},
      models: custom.models || [],
      custom: true
    });
  }

  // Also include env.ROUTER_API_KEY in accepted keys if set and not already present
  const clientKeys = [...state.clientKeys];
  if (typeof env.ROUTER_API_KEY === "string" && env.ROUTER_API_KEY.trim()) {
    const rk = env.ROUTER_API_KEY.trim();
    if (!clientKeys.some((k) => k.key === rk)) {
      clientKeys.unshift({
        id: "env-router-key",
        name: "ROUTER_API_KEY (Env Secret)",
        key: rk,
        createdAt: new Date().toISOString(),
        enabled: true
      });
    }
  }

  const seenAccountIds = new Set<string>();
  const seenEmails = new Set<string>();
  const deduplicated: OAuthAccount[] = [];

  for (const acc of state.oauthAccounts) {
    const key = `${acc.providerId}:${(acc.email || acc.id).toLowerCase()}`;
    if (!seenAccountIds.has(acc.id) && !seenEmails.has(key)) {
      seenAccountIds.add(acc.id);
      seenEmails.add(key);
      deduplicated.push(acc);
    }
  }
  state.oauthAccounts = deduplicated;

  return {
    settings: state.settings,
    providers,
    combos: state.combos,
    clientKeys,
    oauthAccounts: hydrateOAuthAccountsRuntime(state.oauthAccounts || []),
    storageMode: env.ROUTER_DB && env.ROUTER_KV ? "d1-kv" : env.ROUTER_KV ? "kv" : "memory-env"
  };
}

export function isProviderReady(
  provider: ProviderConfig,
  env: Env,
  oauthAccounts?: OAuthAccount[]
): boolean {
  if (!provider.enabled) return false;
  if (provider.dialect === "antigravity") {
    const list = oauthAccounts ?? memoryState?.oauthAccounts ?? [];
    return list.some(
      (a) => a.providerId === "antigravity" && a.enabled && Boolean(a.refreshToken || a.accessToken)
    );
  }
  if (provider.dialect === "anthropic") {
    const list = oauthAccounts ?? memoryState?.oauthAccounts ?? [];
    const hasClaudeOAuth = list.some(
      (a) => a.providerId === "claude" && a.enabled && Boolean(a.refreshToken || a.accessToken)
    );
    if (hasClaudeOAuth) return true;
    return provider.apiKeys.length > 0;
  }
  if (provider.dialect === "cloudflare-ai") {
    return Boolean(
      env.AI || (env.CLOUDFLARE_ACCOUNT_ID && (provider.apiKeys.length > 0 || env.CLOUDFLARE_API_TOKEN))
    );
  }
  return provider.apiKeys.length > 0;
}

export function getOrderedOAuthAccounts(
  accounts: OAuthAccount[],
  providerId: "antigravity" | "claude" = "antigravity"
): OAuthAccount[] {
  const eligible = accounts.filter(
    (a) => a.providerId === providerId && a.enabled && Boolean(a.refreshToken || a.accessToken)
  );
  if (eligible.length === 0) return [];
  if (eligible.length === 1) return eligible;

  const now = Date.now();
  const healthy: OAuthAccount[] = [];
  const cooling: Array<{ acc: OAuthAccount; until: number }> = [];

  for (let i = 0; i < eligible.length; i++) {
    const acc = eligible[i];
    const memCd = oauthCooldowns.get(acc.id)?.until || 0;
    const until = Math.max(memCd, acc.quotaResetAt || 0);
    if (until > now) {
      cooling.push({ acc, until });
    } else {
      healthy.push(acc);
    }
  }

  // If ANY account is still usable, never waste a request on a quota-limited /
  // cooling account. This keeps failover at 1 attempt instead of looping the
  // whole account list on every request (which caused "gagal setelah 15 percobaan").
  if (healthy.length > 0) return healthy;

  // Everything is cooling: try the one that recovers soonest as a last resort.
  cooling.sort((a, b) => a.until - b.until);
  return cooling.map((c) => c.acc);
}

let lastCooldownSaveAt = 0;

export function markOAuthAccountCooldown(
  accountId: string,
  resetAtMs: number,
  reason: string,
  env?: Env
): void {
  const safeUntil = Math.max(Date.now() + 5_000, resetAtMs);
  oauthCooldowns.set(accountId, { until: safeUntil, reason: reason.slice(0, 220) });
  if (memoryState && Array.isArray(memoryState.oauthAccounts)) {
    const acc = memoryState.oauthAccounts.find((a) => a.id === accountId);
    if (acc) {
      acc.quotaResetAt = safeUntil;
      acc.lastError = reason.slice(0, 220);
    }
  }
  // Persist the quarantine so a fresh Worker isolate does not retry a quota-dead
  // account (debounced: KV allows ~1 write/sec per key).
  if (env && memoryState && Date.now() - lastCooldownSaveAt > 10_000) {
    lastCooldownSaveAt = Date.now();
    keepAlive(saveRawState(env, memoryState));
  }
}

export function markOAuthAccountSuccess(accountId: string): void {
  oauthCooldowns.delete(accountId);
  oauthLastUsed.set(accountId, new Date().toISOString());
  if (memoryState && Array.isArray(memoryState.oauthAccounts)) {
    const acc = memoryState.oauthAccounts.find((a) => a.id === accountId);
    if (acc) {
      acc.quotaResetAt = undefined;
      acc.lastError = undefined;
    }
  }
}

export async function upsertOAuthAccount(
  env: Env,
  incoming: OAuthAccount
): Promise<{ account: OAuthAccount; persistedToKv: boolean; updatedExisting: boolean }> {
  const state = await loadRawState(env, true);
  const idx = state.oauthAccounts.findIndex(
    (a) =>
      a.providerId === incoming.providerId &&
      ((incoming.email && a.email.toLowerCase() === incoming.email.toLowerCase()) || a.id === incoming.id)
  );

  let savedAccount: OAuthAccount;
  let updatedExisting = false;

  if (idx >= 0) {
    updatedExisting = true;
    const prev = state.oauthAccounts[idx];
    savedAccount = {
      ...prev,
      ...incoming,
      id: prev.id,
      refreshToken: incoming.refreshToken || prev.refreshToken,
      projectId: incoming.projectId || prev.projectId,
      createdAt: prev.createdAt,
      lastError: undefined,
      quotaResetAt: undefined
    };
    state.oauthAccounts[idx] = savedAccount;
  } else {
    savedAccount = incoming;
    state.oauthAccounts.push(savedAccount);
  }

  oauthCooldowns.delete(savedAccount.id);
  const res = await saveRawState(env, state);
  return { account: savedAccount, persistedToKv: res.persistedToKv, updatedExisting };
}

export async function updateOAuthAccountTokens(
  env: Env,
  accountId: string,
  patch: { accessToken: string; refreshToken?: string; expiresAt: number; projectId?: string }
): Promise<void> {
  // Always re-read KV right before writing: a stale per-isolate cache would otherwise write back an
  // OLD account order and silently undo the priority order the user just set in the dashboard.
  const state = await loadRawState(env, true);
  const target = state.oauthAccounts.find((a) => a.id === accountId);
  if (!target) return;
  target.accessToken = patch.accessToken;
  if (patch.refreshToken) target.refreshToken = patch.refreshToken;
  target.expiresAt = patch.expiresAt;
  if (patch.projectId) target.projectId = patch.projectId;
  try {
    await saveRawState(env, state);
  } catch {
    // Non-fatal if KV write fails during live token refresh; memoryState is already updated
  }
}

export async function reorderOAuthAccountIds(
  env: Env,
  providerId: "antigravity" | "claude",
  orderedIds: string[]
): Promise<{ success: boolean; persistedToKv: boolean }> {
  const state = await loadRawState(env, true);
  const otherAccounts = state.oauthAccounts.filter((a) => a.providerId !== providerId);
  const matchingAccounts = state.oauthAccounts.filter((a) => a.providerId === providerId);

  const reordered: OAuthAccount[] = [];
  for (const id of orderedIds) {
    const found = matchingAccounts.find((a) => a.id === id);
    if (found) reordered.push(found);
  }
  for (const acc of matchingAccounts) {
    if (!reordered.some((a) => a.id === acc.id)) {
      reordered.push(acc);
    }
  }

  state.oauthAccounts = [...reordered, ...otherAccounts];
  const saved = await saveRawState(env, state);
  return { success: true, persistedToKv: saved.persistedToKv };
}

export async function setOAuthAccountPriority(
  env: Env,
  accountId: string,
  targetPosition: number
): Promise<{ success: boolean; persistedToKv: boolean }> {
  const state = await loadRawState(env, true);
  const targetAcc = state.oauthAccounts.find((a) => a.id === accountId);
  if (!targetAcc) return { success: false, persistedToKv: false };

  const providerId = targetAcc.providerId;
  const otherAccounts = state.oauthAccounts.filter((a) => a.providerId !== providerId);
  const matchingAccounts = state.oauthAccounts.filter((a) => a.providerId === providerId);

  const curIdx = matchingAccounts.findIndex((a) => a.id === accountId);
  if (curIdx === -1) return { success: false, persistedToKv: false };

  // Remove from current position and insert at desired 0-based target index
  matchingAccounts.splice(curIdx, 1);
  const insertIdx = Math.max(0, Math.min(matchingAccounts.length, targetPosition - 1));
  matchingAccounts.splice(insertIdx, 0, targetAcc);

  state.oauthAccounts = [...matchingAccounts, ...otherAccounts];
  const saved = await saveRawState(env, state);
  return { success: true, persistedToKv: saved.persistedToKv };
}

export async function reorderOAuthAccount(
  env: Env,
  accountId: string,
  direction: "up" | "down"
): Promise<{ success: boolean; persistedToKv: boolean }> {
  const state = await loadRawState(env, true);
  const idx = state.oauthAccounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return { success: false, persistedToKv: false };

  const currentAcc = state.oauthAccounts[idx];
  const targetProviderId = currentAcc.providerId;

  // Find adjacent index within the same providerId
  let swapIdx = -1;
  if (direction === "up") {
    for (let i = idx - 1; i >= 0; i--) {
      if (state.oauthAccounts[i].providerId === targetProviderId) {
        swapIdx = i;
        break;
      }
    }
  } else {
    for (let i = idx + 1; i < state.oauthAccounts.length; i++) {
      if (state.oauthAccounts[i].providerId === targetProviderId) {
        swapIdx = i;
        break;
      }
    }
  }

  if (swapIdx === -1) return { success: false, persistedToKv: false };

  const temp = state.oauthAccounts[idx];
  state.oauthAccounts[idx] = state.oauthAccounts[swapIdx];
  state.oauthAccounts[swapIdx] = temp;

  const saved = await saveRawState(env, state);
  return { success: true, persistedToKv: saved.persistedToKv };
}

export function getOrderedApiKeys(provider: ProviderConfig): string[] {
  const keys = provider.apiKeys;
  if (keys.length <= 1) return keys;

  const now = Date.now();
  const counterKey = `key:${provider.id}`;
  const start = roundRobinCounters.get(counterKey) || 0;
  roundRobinCounters.set(counterKey, (start + 1) % keys.length);

  const active: string[] = [];
  const cooling: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const k = keys[(start + i) % keys.length];
    const until = keyCooldowns.get(`${provider.id}:${k}`) || 0;
    if (until > now) {
      cooling.push(k);
    } else {
      active.push(k);
    }
  }

  return [...active, ...cooling];
}

export function nextRoundRobinIndex(bucket: string, length: number): number {
  if (length <= 1) return 0;
  const idx = roundRobinCounters.get(bucket) || 0;
  roundRobinCounters.set(bucket, (idx + 1) % length);
  return idx % length;
}

export function markKeyCooldown(providerId: string, apiKey: string, durationMs = 45_000): void {
  if (!apiKey) return;
  keyCooldowns.set(`${providerId}:${apiKey}`, Date.now() + durationMs);
}

export async function resetAllUsageStats(env?: Env): Promise<void> {
  lastD1SyncAt = 0;
  if (statsSaveTimer) {
    clearTimeout(statsSaveTimer);
    statsSaveTimer = null;
  }
  runtimeStats.totalRequests = 0;
  runtimeStats.totalFallbacks = 0;
  runtimeStats.totalRtkSavedChars = 0;
  runtimeStats.totalPromptTokens = 0;
  runtimeStats.totalCompletionTokens = 0;
  runtimeStats.totalTokens = 0;
  runtimeStats.totalCostUsd = 0;
  runtimeStats.byProvider = {};
  runtimeStats.byModel = {};
  runtimeStats.byKey = {};
  runtimeStats.byDate = {};
  runtimeStats.recentLogs = [];

  if (env?.ROUTER_KV) {
    await env.ROUTER_KV.delete(KV_STATS_KEY);
  }
  if (env?.ROUTER_DB) {
    try {
      await env.ROUTER_DB.prepare("DELETE FROM request_logs").run();
    } catch {}
  }
}

export async function updateStreamTokenUsage(
  logId: string,
  modelKey: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  env?: Env
): Promise<void> {
  const pTokens = usage.promptTokens || 0;
  const cTokens = usage.completionTokens || 0;
  const tTokens = usage.totalTokens || (pTokens + cTokens);

  if (tTokens <= 0) return;

  const cost = estimateModelCostUsd(modelKey, pTokens, cTokens);

  runtimeStats.totalPromptTokens += pTokens;
  runtimeStats.totalCompletionTokens += cTokens;
  runtimeStats.totalTokens += tTokens;
  runtimeStats.totalCostUsd = Number((runtimeStats.totalCostUsd + cost).toFixed(4));

  if (runtimeStats.byModel[modelKey]) {
    runtimeStats.byModel[modelKey].promptTokens += pTokens;
    runtimeStats.byModel[modelKey].completionTokens += cTokens;
    runtimeStats.byModel[modelKey].totalTokens += tTokens;
    runtimeStats.byModel[modelKey].costUsd = Number(((runtimeStats.byModel[modelKey].costUsd || 0) + cost).toFixed(4));
  }

  const log = runtimeStats.recentLogs.find((l) => l.id === logId);
  if (log) {
    log.promptTokens = pTokens;
    log.completionTokens = cTokens;
    log.totalTokens = tTokens;
    log.costUsd = cost;

    // Update byKey stats associated with this log
    const clientKeyId = log.clientKeyMasked ? `client:${log.clientKeyMasked}` : "";
    if (clientKeyId && runtimeStats.byKey[clientKeyId]) {
      runtimeStats.byKey[clientKeyId].promptTokens += pTokens;
      runtimeStats.byKey[clientKeyId].completionTokens += cTokens;
      runtimeStats.byKey[clientKeyId].totalTokens += tTokens;
      runtimeStats.byKey[clientKeyId].dailyTokens = (runtimeStats.byKey[clientKeyId].dailyTokens || 0) + tTokens;
      runtimeStats.byKey[clientKeyId].costUsd = Number(((runtimeStats.byKey[clientKeyId].costUsd || 0) + cost).toFixed(4));
    }
    const upstreamId = log.accountEmail
      ? `oauth:${log.accountEmail}`
      : (log.upstreamKeyMasked ? `prov:${log.resolvedProvider}:${log.upstreamKeyMasked}` : "");
    if (upstreamId && runtimeStats.byKey[upstreamId]) {
      runtimeStats.byKey[upstreamId].promptTokens += pTokens;
      runtimeStats.byKey[upstreamId].completionTokens += cTokens;
      runtimeStats.byKey[upstreamId].totalTokens += tTokens;
      runtimeStats.byKey[upstreamId].costUsd = Number(((runtimeStats.byKey[upstreamId].costUsd || 0) + cost).toFixed(4));
    }

    // Update daily date bucket
    const dateStr = log.timestamp.slice(0, 10);
    if (!runtimeStats.byDate[dateStr]) {
      runtimeStats.byDate[dateStr] = {
        date: dateStr,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0
      };
    }
    const dStat = runtimeStats.byDate[dateStr];
    dStat.promptTokens += pTokens;
    dStat.completionTokens += cTokens;
    dStat.totalTokens += tTokens;
    dStat.costUsd = Number((dStat.costUsd + cost).toFixed(4));
  }

  // Persist the final (streamed) token usage into D1 so permanent logs stop showing 0.
  // Awaited by the stream flush: waitUntil() is unreliable once the response is open.
  if (env?.ROUTER_DB) {
    // Make sure the initial INSERT finished first, otherwise the UPDATE hits no row.
    const pendingInsert = pendingLogInserts.get(logId);
    if (pendingInsert) {
      try {
        await pendingInsert;
      } catch {
        // ignore
      }
    }
    try {
      await env.ROUTER_DB.prepare(
        `UPDATE request_logs
            SET prompt_tokens = ?, completion_tokens = ?, total_tokens = ?, cost_usd = ?
          WHERE id = ?`
      )
        .bind(pTokens, cTokens, tTokens, cost, logId)
        .run();
    } catch {
      // non-fatal
    }
    pendingLogInserts.delete(logId);
  }

  scheduleStatsSave(env);
}

export function recordRequestLog(entry: RequestLogEntry, env?: Env): void {
  runtimeStats.totalRequests += 1;
  if (entry.attempts > 1) {
    runtimeStats.totalFallbacks += 1;
  }
  runtimeStats.totalRtkSavedChars += entry.rtkSavedChars;

  const pTokens = entry.promptTokens || 0;
  const cTokens = entry.completionTokens || 0;
  const tTokens = entry.totalTokens || (pTokens + cTokens);
  const cost = estimateModelCostUsd(entry.resolvedModel || entry.requestedModel, pTokens, cTokens);
  entry.costUsd = cost;

  runtimeStats.totalPromptTokens += pTokens;
  runtimeStats.totalCompletionTokens += cTokens;
  runtimeStats.totalTokens += tTokens;
  runtimeStats.totalCostUsd = Number((runtimeStats.totalCostUsd + cost).toFixed(4));

  if (entry.resolvedProvider && entry.resolvedProvider !== "none" && entry.resolvedProvider !== "failed") {
    runtimeStats.byProvider[entry.resolvedProvider] =
      (runtimeStats.byProvider[entry.resolvedProvider] || 0) + 1;
  }

  const modelKey = entry.resolvedModel && entry.resolvedModel !== "none" && entry.resolvedModel !== "failed"
    ? `${entry.resolvedProvider || "unknown"}/${entry.resolvedModel}`
    : (entry.requestedModel || "unknown");

  if (!runtimeStats.byModel[modelKey]) {
    runtimeStats.byModel[modelKey] = {
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0
    };
  }
  const mStat = runtimeStats.byModel[modelKey];
  mStat.requests += 1;
  mStat.promptTokens += pTokens;
  mStat.completionTokens += cTokens;
  mStat.totalTokens += tTokens;
  mStat.costUsd = Number(((mStat.costUsd || 0) + cost).toFixed(4));

  const todayStr = entry.timestamp.slice(0, 10);

  // Track by Client API Key (with daily limit reset check)
  if (entry.clientKeyMasked) {
    const kId = `client:${entry.clientKeyMasked}`;
    if (!runtimeStats.byKey[kId]) {
      runtimeStats.byKey[kId] = {
        keyIdOrEmail: entry.clientKeyMasked,
        name: entry.clientKeyName || "Client Key",
        kind: "client_api_key",
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        dailyRequests: 0,
        dailyTokens: 0,
        dailyDate: todayStr,
        lastUsedAt: entry.timestamp
      };
    }
    const kStat = runtimeStats.byKey[kId];
    if (kStat.dailyDate !== todayStr) {
      kStat.dailyDate = todayStr;
      kStat.dailyRequests = 0;
      kStat.dailyTokens = 0;
    }
    kStat.requests += 1;
    kStat.dailyRequests = (kStat.dailyRequests || 0) + 1;
    kStat.promptTokens += pTokens;
    kStat.completionTokens += cTokens;
    kStat.totalTokens += tTokens;
    kStat.dailyTokens = (kStat.dailyTokens || 0) + tTokens;
    kStat.costUsd = Number(((kStat.costUsd || 0) + cost).toFixed(4));
    kStat.lastUsedAt = entry.timestamp;
  }

  // Track by Upstream Account / API Key
  if (entry.accountEmail) {
    const aId = `oauth:${entry.accountEmail}`;
    if (!runtimeStats.byKey[aId]) {
      runtimeStats.byKey[aId] = {
        keyIdOrEmail: entry.accountEmail,
        name: `OAuth Antigravity (${entry.accountEmail})`,
        kind: "oauth_account",
        providerId: "antigravity",
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        lastUsedAt: entry.timestamp
      };
    }
    const aStat = runtimeStats.byKey[aId];
    aStat.requests += 1;
    aStat.promptTokens += pTokens;
    aStat.completionTokens += cTokens;
    aStat.totalTokens += tTokens;
    aStat.costUsd = Number(((aStat.costUsd || 0) + cost).toFixed(4));
    aStat.lastUsedAt = entry.timestamp;
  } else if (entry.upstreamKeyMasked && entry.resolvedProvider) {
    const pId = `prov:${entry.resolvedProvider}:${entry.upstreamKeyMasked}`;
    if (!runtimeStats.byKey[pId]) {
      runtimeStats.byKey[pId] = {
        keyIdOrEmail: entry.upstreamKeyMasked,
        name: `${entry.resolvedProvider.toUpperCase()} Key (${entry.upstreamKeyMasked})`,
        kind: "provider_api_key",
        providerId: entry.resolvedProvider,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        lastUsedAt: entry.timestamp
      };
    }
    const pStat = runtimeStats.byKey[pId];
    pStat.requests += 1;
    pStat.promptTokens += pTokens;
    pStat.completionTokens += cTokens;
    pStat.totalTokens += tTokens;
    pStat.costUsd = Number(((pStat.costUsd || 0) + cost).toFixed(4));
    pStat.lastUsedAt = entry.timestamp;
  }

  // Track by Date (Today vs Yesterday)
  if (!runtimeStats.byDate[todayStr]) {
    runtimeStats.byDate[todayStr] = {
      date: todayStr,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0
    };
  }
  const dateBucket = runtimeStats.byDate[todayStr];
  dateBucket.requests += 1;
  dateBucket.promptTokens += pTokens;
  dateBucket.completionTokens += cTokens;
  dateBucket.totalTokens += tTokens;
  dateBucket.costUsd = Number((dateBucket.costUsd + cost).toFixed(4));

  runtimeStats.recentLogs.unshift(entry);
  if (runtimeStats.recentLogs.length > 50) {
    runtimeStats.recentLogs.length = 50;
  }

  // Save to Cloudflare D1 asynchronously for permanent log storage (unlimited reads/writes!)
  if (env?.ROUTER_DB) {
    const insertPromise = env.ROUTER_DB.prepare(
        `INSERT OR REPLACE INTO request_logs 
         (id, timestamp, date_str, requested_model, resolved_provider, resolved_model, client_key_name, client_key_masked, upstream_key_masked, account_email, action, status, attempts, latency_ms, rtk_saved_chars, stream, prompt_tokens, completion_tokens, total_tokens, cost_usd, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        entry.id,
        entry.timestamp,
        todayStr,
        entry.requestedModel,
        entry.resolvedProvider,
        entry.resolvedModel,
        entry.clientKeyName || null,
        entry.clientKeyMasked || null,
        entry.upstreamKeyMasked || null,
        entry.accountEmail || null,
        entry.action || "chat",
        entry.status,
        entry.attempts,
        entry.latencyMs,
        entry.rtkSavedChars,
        entry.stream ? 1 : 0,
        pTokens,
        cTokens,
        tTokens,
        cost,
        entry.error || null
      ).run().catch(() => {});

    pendingLogInserts.set(entry.id, insertPromise);
    keepAlive(insertPromise);
    if (pendingLogInserts.size > 100) {
      const oldest = pendingLogInserts.keys().next().value;
      if (oldest) pendingLogInserts.delete(oldest);
    }
  }

  // Persist to KV (debounced to respect the 1 write/sec/key limit, with a trailing flush).
  scheduleStatsSave(env);
}

export async function getUsageStats(env?: Env): Promise<UsageStats> {
  if (env?.ROUTER_KV && !statsLoadedFromKv) {
    statsLoadedFromKv = true;
    try {
      const raw = await env.ROUTER_KV.get(KV_STATS_KEY, "json");
      if (raw && typeof raw === "object") {
        const saved = raw as Partial<UsageStats>;
        runtimeStats.totalRequests = Math.max(runtimeStats.totalRequests, saved.totalRequests || 0);
        runtimeStats.totalFallbacks = Math.max(runtimeStats.totalFallbacks, saved.totalFallbacks || 0);
        runtimeStats.totalRtkSavedChars = Math.max(runtimeStats.totalRtkSavedChars, saved.totalRtkSavedChars || 0);
        runtimeStats.totalPromptTokens = Math.max(runtimeStats.totalPromptTokens, saved.totalPromptTokens || 0);
        runtimeStats.totalCompletionTokens = Math.max(runtimeStats.totalCompletionTokens, saved.totalCompletionTokens || 0);
        runtimeStats.totalTokens = Math.max(runtimeStats.totalTokens, saved.totalTokens || 0);
        runtimeStats.totalCostUsd = Math.max(runtimeStats.totalCostUsd, saved.totalCostUsd || 0);
        
        if (saved.byProvider) {
          for (const [k, v] of Object.entries(saved.byProvider)) {
            runtimeStats.byProvider[k] = Math.max(runtimeStats.byProvider[k] || 0, v);
          }
        }
        if (saved.byModel) {
          for (const [mKey, mVal] of Object.entries(saved.byModel)) {
            if (!runtimeStats.byModel[mKey]) {
              runtimeStats.byModel[mKey] = mVal;
            } else {
              runtimeStats.byModel[mKey].requests = Math.max(runtimeStats.byModel[mKey].requests, mVal.requests);
              runtimeStats.byModel[mKey].promptTokens = Math.max(runtimeStats.byModel[mKey].promptTokens, mVal.promptTokens);
              runtimeStats.byModel[mKey].completionTokens = Math.max(runtimeStats.byModel[mKey].completionTokens, mVal.completionTokens);
              runtimeStats.byModel[mKey].totalTokens = Math.max(runtimeStats.byModel[mKey].totalTokens, mVal.totalTokens);
              runtimeStats.byModel[mKey].costUsd = Math.max(runtimeStats.byModel[mKey].costUsd || 0, mVal.costUsd || 0);
            }
          }
        }
        if (saved.byKey) {
          for (const [kId, kVal] of Object.entries(saved.byKey)) {
            if (!runtimeStats.byKey[kId]) {
              runtimeStats.byKey[kId] = kVal;
            } else {
              runtimeStats.byKey[kId].requests = Math.max(runtimeStats.byKey[kId].requests, kVal.requests);
              runtimeStats.byKey[kId].promptTokens = Math.max(runtimeStats.byKey[kId].promptTokens, kVal.promptTokens);
              runtimeStats.byKey[kId].completionTokens = Math.max(runtimeStats.byKey[kId].completionTokens, kVal.completionTokens);
              runtimeStats.byKey[kId].totalTokens = Math.max(runtimeStats.byKey[kId].totalTokens, kVal.totalTokens);
              runtimeStats.byKey[kId].costUsd = Math.max(runtimeStats.byKey[kId].costUsd || 0, kVal.costUsd || 0);
            }
          }
        }
        if (saved.byDate) {
          for (const [dStr, dVal] of Object.entries(saved.byDate)) {
            if (!runtimeStats.byDate[dStr]) {
              runtimeStats.byDate[dStr] = dVal;
            } else {
              runtimeStats.byDate[dStr].requests = Math.max(runtimeStats.byDate[dStr].requests, dVal.requests);
              runtimeStats.byDate[dStr].totalTokens = Math.max(runtimeStats.byDate[dStr].totalTokens, dVal.totalTokens);
              runtimeStats.byDate[dStr].costUsd = Math.max(runtimeStats.byDate[dStr].costUsd, dVal.costUsd);
            }
          }
        }
        if (Array.isArray(saved.recentLogs) && runtimeStats.recentLogs.length === 0) {
          runtimeStats.recentLogs = saved.recentLogs.slice(0, 50);
        }

        // Backfill totalCostUsd if older logs had 0 costUsd
        if (runtimeStats.totalCostUsd === 0 && runtimeStats.totalTokens > 0) {
          let sum = 0;
          for (const [mKey, mVal] of Object.entries(runtimeStats.byModel)) {
            const c = estimateModelCostUsd(mKey, mVal.promptTokens, mVal.completionTokens);
            mVal.costUsd = c;
            sum += c;
          }
          runtimeStats.totalCostUsd = Number(sum.toFixed(4));
        }
      }
    } catch {
      // non-fatal
    }
  }
  // ── D1 is the durable source of truth ───────────────────────────────────
  // KV writes are rate-limited and Worker isolates restart often, so merge the
  // permanent D1 aggregates. Throttled (5s) to avoid extra D1 reads per request.
  if (env?.ROUTER_DB && Date.now() - lastD1SyncAt > D1_SYNC_TTL_MS) {
    lastD1SyncAt = Date.now();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [totalsRes, modelRes, dateRes, clientRes, upstreamRes, logsRes] = await env.ROUTER_DB.batch([
        env.ROUTER_DB.prepare(
          `SELECT COUNT(*) AS requests,
                  COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
                  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                  COALESCE(SUM(total_tokens), 0) AS total_tokens,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  COALESCE(SUM(rtk_saved_chars), 0) AS rtk_saved_chars,
                  COALESCE(SUM(CASE WHEN attempts > 1 THEN 1 ELSE 0 END), 0) AS fallbacks
             FROM request_logs`
        ),
        env.ROUTER_DB.prepare(
          `SELECT resolved_provider AS provider,
                  resolved_model AS model,
                  COUNT(*) AS requests,
                  COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
                  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                  COALESCE(SUM(total_tokens), 0) AS total_tokens,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd
             FROM request_logs
            GROUP BY resolved_provider, resolved_model`
        ),
        env.ROUTER_DB.prepare(
          `SELECT date_str,
                  COUNT(*) AS requests,
                  COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
                  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                  COALESCE(SUM(total_tokens), 0) AS total_tokens,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd
             FROM request_logs
            GROUP BY date_str`
        ),
        env.ROUTER_DB.prepare(
          `SELECT client_key_masked AS masked_key,
                  MAX(client_key_name) AS name,
                  COUNT(*) AS requests,
                  COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
                  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                  COALESCE(SUM(total_tokens), 0) AS total_tokens,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  COALESCE(SUM(CASE WHEN date_str = ? THEN 1 ELSE 0 END), 0) AS daily_requests,
                  COALESCE(SUM(CASE WHEN date_str = ? THEN total_tokens ELSE 0 END), 0) AS daily_tokens,
                  MAX(timestamp) AS last_used
             FROM request_logs
            WHERE client_key_masked IS NOT NULL AND client_key_masked != ''
            GROUP BY client_key_masked`
        ).bind(today, today),
        env.ROUTER_DB.prepare(
          `SELECT account_email,
                  upstream_key_masked,
                  resolved_provider AS provider,
                  COUNT(*) AS requests,
                  COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
                  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                  COALESCE(SUM(total_tokens), 0) AS total_tokens,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  MAX(timestamp) AS last_used
             FROM request_logs
            WHERE (account_email IS NOT NULL AND account_email != '')
               OR (upstream_key_masked IS NOT NULL AND upstream_key_masked != '')
            GROUP BY account_email, upstream_key_masked, resolved_provider`
        ),
        env.ROUTER_DB.prepare(
          `SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT 50`
        )
      ]);

      const num = (v: unknown): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const round4 = (n: number): number => Number(n.toFixed(4));

      const totals = (totalsRes.results?.[0] || {}) as Record<string, unknown>;
      runtimeStats.totalRequests = Math.max(runtimeStats.totalRequests, num(totals.requests));
      runtimeStats.totalFallbacks = Math.max(runtimeStats.totalFallbacks, num(totals.fallbacks));
      runtimeStats.totalRtkSavedChars = Math.max(runtimeStats.totalRtkSavedChars, num(totals.rtk_saved_chars));
      runtimeStats.totalPromptTokens = Math.max(runtimeStats.totalPromptTokens, num(totals.prompt_tokens));
      runtimeStats.totalCompletionTokens = Math.max(runtimeStats.totalCompletionTokens, num(totals.completion_tokens));
      runtimeStats.totalTokens = Math.max(runtimeStats.totalTokens, num(totals.total_tokens));
      runtimeStats.totalCostUsd = Math.max(runtimeStats.totalCostUsd, round4(num(totals.cost_usd)));

      for (const row of modelRes.results || []) {
        const r = row as Record<string, unknown>;
        const providerId = String(r.provider || "");
        const modelId = String(r.model || "");
        const modelKey =
          providerId && providerId !== "none" && providerId !== "failed"
            ? `${providerId}/${modelId}`
            : modelId || "unknown";
        const existing = runtimeStats.byModel[modelKey];
        const requests = num(r.requests);
        const p = num(r.prompt_tokens);
        const c = num(r.completion_tokens);
        const t = num(r.total_tokens);
        const cost = num(r.cost_usd);
        if (!existing) {
          runtimeStats.byModel[modelKey] = {
            requests,
            promptTokens: p,
            completionTokens: c,
            totalTokens: t,
            costUsd: cost
          };
        } else {
          existing.requests = Math.max(existing.requests, requests);
          existing.promptTokens = Math.max(existing.promptTokens, p);
          existing.completionTokens = Math.max(existing.completionTokens, c);
          existing.totalTokens = Math.max(existing.totalTokens, t);
          existing.costUsd = round4(Math.max(existing.costUsd || 0, cost));
        }
        if (providerId && providerId !== "none" && providerId !== "failed") {
          runtimeStats.byProvider[providerId] = Math.max(
            runtimeStats.byProvider[providerId] || 0,
            requests
          );
        }
      }

      for (const row of dateRes.results || []) {
        const r = row as Record<string, unknown>;
        const dateStr = String(r.date_str || "");
        if (!dateStr) continue;
        const requests = num(r.requests);
        const p = num(r.prompt_tokens);
        const c = num(r.completion_tokens);
        const t = num(r.total_tokens);
        const cost = num(r.cost_usd);
        const existing = runtimeStats.byDate[dateStr];
        if (!existing) {
          runtimeStats.byDate[dateStr] = {
            date: dateStr,
            requests,
            promptTokens: p,
            completionTokens: c,
            totalTokens: t,
            costUsd: cost
          };
        } else {
          existing.requests = Math.max(existing.requests, requests);
          existing.promptTokens = Math.max(existing.promptTokens, p);
          existing.completionTokens = Math.max(existing.completionTokens, c);
          existing.totalTokens = Math.max(existing.totalTokens, t);
          existing.costUsd = round4(Math.max(existing.costUsd, cost));
        }
      }

      for (const row of clientRes.results || []) {
        const r = row as Record<string, unknown>;
        const masked = String(r.masked_key || "");
        if (!masked) continue;
        const id = `client:${masked}`;
        const requests = num(r.requests);
        const p = num(r.prompt_tokens);
        const c = num(r.completion_tokens);
        const t = num(r.total_tokens);
        const cost = num(r.cost_usd);
        const dailyRequests = num(r.daily_requests);
        const dailyTokens = num(r.daily_tokens);
        const lastUsedAt = String(r.last_used || "");
        const existing = runtimeStats.byKey[id];
        if (!existing) {
          runtimeStats.byKey[id] = {
            keyIdOrEmail: masked,
            name: String(r.name || "Client Key"),
            kind: "client_api_key",
            requests,
            promptTokens: p,
            completionTokens: c,
            totalTokens: t,
            costUsd: cost,
            dailyRequests,
            dailyTokens,
            dailyDate: today,
            lastUsedAt
          };
        } else {
          existing.requests = Math.max(existing.requests, requests);
          existing.promptTokens = Math.max(existing.promptTokens, p);
          existing.completionTokens = Math.max(existing.completionTokens, c);
          existing.totalTokens = Math.max(existing.totalTokens, t);
          existing.costUsd = round4(Math.max(existing.costUsd || 0, cost));
          existing.dailyRequests = Math.max(existing.dailyRequests || 0, dailyRequests);
          existing.dailyTokens = Math.max(existing.dailyTokens || 0, dailyTokens);
          existing.dailyDate = today;
          if (lastUsedAt > (existing.lastUsedAt || "")) existing.lastUsedAt = lastUsedAt;
        }
      }

      for (const row of upstreamRes.results || []) {
        const r = row as Record<string, unknown>;
        const email = String(r.account_email || "");
        const masked = String(r.upstream_key_masked || "");
        const providerId = String(r.provider || "");
        const id = email ? `oauth:${email}` : masked ? `prov:${providerId}:${masked}` : "";
        if (!id) continue;
        const requests = num(r.requests);
        const p = num(r.prompt_tokens);
        const c = num(r.completion_tokens);
        const t = num(r.total_tokens);
        const cost = num(r.cost_usd);
        const lastUsedAt = String(r.last_used || "");
        const existing = runtimeStats.byKey[id];
        if (!existing) {
          runtimeStats.byKey[id] = {
            keyIdOrEmail: email || masked,
            name: email
              ? `OAuth ${providerId ? providerId.charAt(0).toUpperCase() + providerId.slice(1) : "Account"} (${email})`
              : `${providerId.toUpperCase()} Key (${masked})`,
            kind: email ? "oauth_account" : "provider_api_key",
            providerId: providerId || undefined,
            requests,
            promptTokens: p,
            completionTokens: c,
            totalTokens: t,
            costUsd: cost,
            lastUsedAt
          };
        } else {
          existing.requests = Math.max(existing.requests, requests);
          existing.promptTokens = Math.max(existing.promptTokens, p);
          existing.completionTokens = Math.max(existing.completionTokens, c);
          existing.totalTokens = Math.max(existing.totalTokens, t);
          existing.costUsd = round4(Math.max(existing.costUsd || 0, cost));
          if (lastUsedAt > (existing.lastUsedAt || "")) existing.lastUsedAt = lastUsedAt;
        }
      }

      // Merge the newest permanent logs (keep whichever version has token data).
      if (logsRes.results && logsRes.results.length > 0) {
        const byId = new Map<string, RequestLogEntry>();
        for (const l of runtimeStats.recentLogs) byId.set(l.id, l);
        for (const row of logsRes.results) {
          const r = row as Record<string, unknown>;
          const id = String(r.id || "");
          if (!id) continue;
          const mapped: RequestLogEntry = {
            id,
            timestamp: String(r.timestamp || ""),
            requestedModel: String(r.requested_model || ""),
            resolvedProvider: String(r.resolved_provider || ""),
            resolvedModel: String(r.resolved_model || ""),
            clientKeyName: r.client_key_name ? String(r.client_key_name) : undefined,
            clientKeyMasked: r.client_key_masked ? String(r.client_key_masked) : undefined,
            upstreamKeyMasked: r.upstream_key_masked ? String(r.upstream_key_masked) : undefined,
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
            costUsd: Number(r.cost_usd || 0),
            error: r.error ? String(r.error) : undefined
          };
          const existing = byId.get(id);
          if (!existing || (mapped.totalTokens || 0) >= (existing.totalTokens || 0)) {
            byId.set(id, mapped);
          }
        }
        runtimeStats.recentLogs = Array.from(byId.values())
          .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
          .slice(0, 50);
      }
    } catch {
      // D1 unavailable or quota exceeded — back off 10 minutes to protect CPU and prevent repeat exceptions
      lastD1SyncAt = Date.now() + 600_000;
    }
  }

  return runtimeStats;
}
