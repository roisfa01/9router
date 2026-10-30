import { ClientApiKey, Env } from "../types";
import { getResolvedConfig, getUsageStats } from "../config/store";

export function extractBearerOrApiKey(req: Request): string {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xApiKey = req.headers.get("x-api-key") || req.headers.get("X-Api-Key") || "";
  if (xApiKey.trim()) return xApiKey.trim();

  const googKey = req.headers.get("x-goog-api-key") || "";
  if (googKey.trim()) return googKey.trim();

  const url = new URL(req.url);
  return (url.searchParams.get("key") || "").trim();
}

export function maskKey(k: string): string {
  if (!k) return "";
  const clean = k.trim();
  if (clean.length <= 8) return `${clean.slice(0, 3)}...`;
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

export async function verifyClientAuth(
  req: Request,
  env: Env
): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
  clientKey?: ClientApiKey;
  clientKeyName?: string;
  clientKeyMasked?: string;
}> {
  const config = await getResolvedConfig(env);
  if (!config.settings.requireAuth) {
    const raw = extractBearerOrApiKey(req);
    return { ok: true, clientKeyName: "Public / No Auth", clientKeyMasked: raw ? maskKey(raw) : "anonymous" };
  }

  const token = extractBearerOrApiKey(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing API key. Pass `Authorization: Bearer sk-9r-...` or `x-api-key` header."
    };
  }

  const matched = config.clientKeys.find((k) => k.enabled && k.key === token);
  if (!matched) {
    return {
      ok: false,
      status: 401,
      error: "Invalid or disabled 9Router API key. Check your API key in the 9Router Dashboard."
    };
  }

  const masked = maskKey(matched.key);

  // Enforce per-Client Key Daily Quota Limits if configured!
  if ((matched.dailyTokenLimit && matched.dailyTokenLimit > 0) || (matched.dailyRequestLimit && matched.dailyRequestLimit > 0)) {
    const stats = await getUsageStats(env);
    const kStat = stats.byKey[`client:${masked}`];
    const todayStr = new Date().toISOString().slice(0, 10);

    if (kStat && kStat.dailyDate === todayStr) {
      if (matched.dailyRequestLimit && matched.dailyRequestLimit > 0 && (kStat.dailyRequests || 0) >= matched.dailyRequestLimit) {
        return {
          ok: false,
          status: 429,
          error: `Batas kuota harian tercapai untuk API Key '${matched.name}' (Maksimal ${matched.dailyRequestLimit.toLocaleString()} request/hari). Reset besok!`
        };
      }
      if (matched.dailyTokenLimit && matched.dailyTokenLimit > 0 && (kStat.dailyTokens || 0) >= matched.dailyTokenLimit) {
        return {
          ok: false,
          status: 429,
          error: `Batas kuota token harian tercapai untuk API Key '${matched.name}' (Maksimal ${matched.dailyTokenLimit.toLocaleString()} token/hari). Reset besok!`
        };
      }
    }
  }

  return { ok: true, clientKey: matched, clientKeyName: matched.name, clientKeyMasked: masked };
}

export function getAdminPassword(env: Env): string {
  if (typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.trim()) {
    return env.ADMIN_PASSWORD.trim();
  }
  return "admin123";
}

export function verifyAdminAuth(req: Request, env: Env): boolean {
  const expected = getAdminPassword(env);
  const headerPass =
    req.headers.get("x-admin-password") ||
    extractBearerOrApiKey(req);
  return headerPass === expected;
}
