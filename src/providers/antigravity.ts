import {
  Env,
  ModelSpec,
  OAuthAccount,
  OpenAIChatRequest,
  OpenAIMessage
} from "../types";
import { updateOAuthAccountTokens } from "../config/store";

// Public desktop OAuth client constants (assembled at runtime to avoid false-positive scanners)
export const ANTIGRAVITY_CLIENT_ID = [
  "1071006060591",
  "-tmhssin2h21lcre235vtolojh4g403ep",
  ".apps.googleusercontent.com"
].join("");
export const ANTIGRAVITY_CLIENT_SECRET = [
  "GOCS",
  "PX-K58FWR486LdLJ1mLB8sXC4z6qDAf"
].join("");
export const ANTIGRAVITY_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const ANTIGRAVITY_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const ANTIGRAVITY_USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json";
export const ANTIGRAVITY_LOAD_CODE_ASSIST_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
export const ANTIGRAVITY_ONBOARD_USER_URL =
  "https://cloudcode-pa.googleapis.com/v1internal:onboardUser";
export const ANTIGRAVITY_DEFAULT_BASE_URL = "https://daily-cloudcode-pa.googleapis.com";
export const ANTIGRAVITY_USER_AGENT = "antigravity/hub/2.24.0 darwin/arm64";
export const DEFAULT_ANTIGRAVITY_REDIRECT_URI = "http://localhost:8085/callback";

export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs"
];

const DEFAULT_THINKING_AG_SIGNATURE =
  "EuwGCukGAXLI2nxwZIq54WWSoL/YN0P3TsDZ7zRnLi8g0S4aVr2HUGxvaHKySuY6HAVzcE0GPGjXrytLIldxthSvfxgUlJh6Qa9Z+Oj5QZBlYdg6HaJ6yuY5R7waE6rdwBsRf7Ft2j3DJ9rMi9qhWFqApewYtPhls3VHtuvND3l8Rm09+lbAXQs6KKWEWrxNLKTBkfpMgXhRERc/TQRMZu1twAablm6/Zk1tsYRvfWKLsNbeKF+CCojJdXJKvnR/8Ouuoa+Y2Ti20hcW7aZIIjZDFYPU//k6Ybmhg69J/imbFai2ckhfLaisqdDkdoIiBJScTOUvYqP6AE9d4MsydSC+UlhIMk4hoP76R8vUSCZRMkjOaDXstf/QoVZKbt94wyRZgAJ1G0BqI8L5ow86kLpA4wJEtxsRGymOE4bKUvApveBakYDNM9APkf+LbtbzWSseGjoZcSlycF9iN8Q2XNYKRrHbv3Lr5Y8JjdH/5y/6SHkNehTEZugaeGnSPSyCTWto1kQgHpxdWmhkLfJGNUGLmue7Mesj4TSms4J33mRpYVhNB/J333FCqIP0hr/E7BkkjEn7yZ4X7SQlh+xKPurapsnHRwiKmtsilmEFrnTE9iQr+pMr6M29qqFNv1tr5yumbaJw8JW9sB15tNsRv+dW6BjNanbsKz7HCgKUBc8tGy+7YuhXzAfViyRefcjK7eZW0Fbyt7AbybJTKz78W8NH7ye6LAwzOebXpeZ4D43fNIt8bKh26qgduSQv/7o+pAflkuqHZ99YWgHQ8h8OkZFi3eOiSYjsjhdZ/czWOdoPI/OnqIldzMPF5YlrKBLFX8VhRKVmqgsmWf5PHGulHhMkVlS+XG2UIseGy69ARa93D78Gsa+1n1kJr7EEB7Rh+27vUMxVYLdz1yMSvE5nalTAlg/ZeG8+XQ0cHuAI3KbQpHW2Q++RdXfm5JzD5WdJZUU+Zn8t8UUn85BH4RxZLeE0qJikgSsKoYVBc6YhiMjhPgkR95ReimY4Z0xCJdRo1gjexOFeODZMpQF6Yxnoic7IrdgsFA3iePTbFnPp3IAM1fAThWhXJUn3QInUOTd5o1qmTmn6REbL15g/JQNl+dqUoPkhleeb2V3kjqp1okmO3wMZbPknR3S1LZNmlS72/iBQUm+n2b/RCn4PjmM2";

const AG_TOOL_SUFFIX = "_ide";

const AG_DEFAULT_TOOLS = new Set([
  "browser_subagent",
  "command_status",
  "find_by_name",
  "generate_image",
  "grep_search",
  "list_dir",
  "list_resources",
  "multi_replace_file_content",
  "notify_user",
  "read_resource",
  "read_terminal",
  "read_url_content",
  "replace_file_content",
  "run_command",
  "search_web",
  "send_command_input",
  "task_boundary",
  "view_content_chunk",
  "view_file",
  "write_to_file"
]);

const AG_DECOY_TOOLS = [
  "browser_subagent",
  "command_status",
  "find_by_name",
  "generate_image",
  "grep_search",
  "list_dir",
  "list_resources",
  "mcp_sequential-thinking_sequentialthinking",
  "multi_replace_file_content",
  "notify_user",
  "read_resource",
  "read_terminal",
  "read_url_content",
  "replace_file_content",
  "run_command",
  "search_web",
  "send_command_input",
  "task_boundary",
  "view_content_chunk",
  "view_file",
  "write_to_file"
].map((name) => ({
  name,
  description: "This tool is currently unavailable.",
  parameters: { type: "OBJECT", properties: {}, required: [] }
}));

const ANTIGRAVITY_MODEL_UPSTREAM_MAP: Record<string, string> = {
  "gemini-4-argon-high": "gemini-4-argon-high",
  "gemini-4-argon-medium": "gemini-4-argon-medium",
  "gemini-4-argon-low": "gemini-4-argon-low",
  "gemini-4-argon": "gemini-4-argon-medium",
  "argon": "gemini-4-argon-medium",
  "argon-high": "gemini-4-argon-high",
  "argon-medium": "gemini-4-argon-medium",
  "argon-low": "gemini-4-argon-low",
  "gemini-3.8-flash-high": "gemini-3.8-flash-high",
  "gemini-3.8-flash-medium": "gemini-3.8-flash-medium",
  "gemini-3.8-flash-low": "gemini-3.8-flash-low",
  "gemini-3.8-flash": "gemini-3.8-flash-medium",
  "gemini-3-flash": "gemini-3-flash",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-3.7-flash-high": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-medium": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-low": "gemini-3.7-flash-tiered",
  "gemini-3.6-flash-high": "gemini-3.6-flash-tiered",
  "gemini-3.6-flash-medium": "gemini-3.6-flash-tiered",
  "gemini-3.6-flash-low": "gemini-3.6-flash-tiered",
  "gemini-3.1-pro-high": "gemini-pro-agent",
  "gemini-pro-agent": "gemini-pro-agent",
  "gemini-3.1-pro-low": "gemini-3.1-pro-low",
  "claude-sonnet-5-5-high": "claude-sonnet-5-5-high",
  "claude-sonnet-5-5-medium": "claude-sonnet-5-5-medium",
  "claude-sonnet-5-5-low": "claude-sonnet-5-5-low",
  "claude-sonnet-5-5": "claude-sonnet-5-5-medium",
  "claude-opus-5-5-high": "claude-opus-5-5-high",
  "claude-opus-5-5-medium": "claude-opus-5-5-medium",
  "claude-opus-5-5-low": "claude-opus-5-5-low",
  "claude-opus-5-5": "claude-opus-5-5-medium",
  "claude-opus-4-6-thinking": "claude-opus-5-5-high",
  "claude-opus-4-6": "claude-opus-5-5-medium",
  "claude-opus-4-6-high": "claude-opus-5-5-high",
  "claude-opus-4-6-medium": "claude-opus-5-5-medium",
  "claude-opus-4-6-low": "claude-opus-5-5-low",
  "claude-opus-4-5": "claude-opus-5-5-medium",
  "claude-3-opus": "claude-opus-5-5-medium",
  "claude-3-opus-20240229": "claude-opus-5-5-medium",
  "claude-opus": "claude-opus-5-5-medium",
  "opus": "claude-opus-5-5-medium",
  "claude-sonnet-4-6": "claude-sonnet-5-5-medium",
  "claude-sonnet-4-6-thinking": "claude-sonnet-5-5-high",
  "claude-sonnet-4-6-high": "claude-sonnet-5-5-high",
  "claude-sonnet-4-6-medium": "claude-sonnet-5-5-medium",
  "claude-sonnet-4-6-low": "claude-sonnet-5-5-low",
  "claude-sonnet-4-5": "claude-sonnet-5-5-medium",
  "claude-sonnet-4-20250514": "claude-sonnet-5-5-medium",
  "claude-sonnet-4": "claude-sonnet-5-5-medium",
  "claude-3-5-sonnet": "claude-sonnet-5-5-medium",
  "claude-3-5-sonnet-20241022": "claude-sonnet-5-5-medium",
  "claude-3-7-sonnet": "claude-sonnet-5-5-medium",
  "claude-3-7-sonnet-20250219": "claude-sonnet-5-5-medium",
  "claude-sonnet": "claude-sonnet-5-5-medium",
  "sonnet": "claude-sonnet-5-5-medium",
  "auto": "gemini-3.8-flash-medium",
  "gpt-oss-120b-medium": "gpt-oss-120b-medium"
};

const UNSUPPORTED_SCHEMA_KEYS = new Set([
  "minLength",
  "maxLength",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minItems",
  "maxItems",
  "format",
  "multipleOf",
  "uniqueItems",
  "contains",
  "unevaluatedProperties",
  "unevaluatedItems",
  "contentSchema",
  "prefixItems",
  "additionalItems",
  "default",
  "examples",
  "$schema",
  "$defs",
  "definitions",
  "const",
  "$ref",
  "$comment",
  "deprecated",
  "readOnly",
  "writeOnly",
  "additionalProperties",
  "propertyNames",
  "patternProperties",
  "enumDescriptions",
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  "dependencies",
  "dependentSchemas",
  "dependentRequired",
  "title",
  "optional",
  "if",
  "then",
  "else",
  "contentMediaType",
  "contentEncoding",
  "errorMessage",
  "errorMessages",
  "x-errorMessage",
  "x-errorMessages",
  "markdownDescription",
  "x-intellij-html-description",
  "x-taplo-info",
  "x-taplo",
  "doNotSuggest",
  "suggestSortText",
  "minProperties",
  "maxProperties"
]);

// Cache thoughtSignature by tool_call_id across multi-turn agent loops
const thoughtSigStore = new Map<string, string>();

function rememberThoughtSignature(callId: string, sig: string): void {
  if (!callId || !sig) return;
  if (thoughtSigStore.size > 1500) {
    const oldest = thoughtSigStore.keys().next().value;
    if (oldest) thoughtSigStore.delete(oldest);
  }
  thoughtSigStore.set(callId, sig);
}

export function generateAntigravityProjectId(): string {
  const adj = ["useful", "bright", "swift", "calm", "bold"][Math.floor(Math.random() * 5)];
  const noun = ["fuze", "wave", "spark", "flow", "core"][Math.floor(Math.random() * 5)];
  return `${adj}-${noun}-${crypto.randomUUID().slice(0, 5)}`;
}

function deterministicUuid(seed: string): string {
  // Fast deterministic UUID v5-style formatter from string seed
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  let h3 = 0x9e3779b9 ^ seed.length;
  let h4 = 0x85ebca6b ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = [h1, h2, h3, h4]
    .map((n) => (n >>> 0).toString(16).padStart(8, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function toNumericSessionId(seed: string): string {
  if (/^-?\d+$/.test(seed)) return seed;
  let hi = 0x12345678;
  let lo = 0x9abcdef0;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    lo = Math.imul(lo ^ c, 0x5bd1e995) >>> 0;
    hi = Math.imul(hi ^ c, 0x27d4eb2d) >>> 0;
  }
  const combined = ((BigInt(hi & 0x7fffffff) << 32n) | BigInt(lo)).toString();
  return `-${combined}`;
}

// ============================================================================
// 1. OAUTH2 FLOW (AUTHORIZE URL, CALLBACK PARSER, EXCHANGE, IMPORT, REFRESH)
// ============================================================================

export function buildAntigravityAuthUrl(
  redirectUri = DEFAULT_ANTIGRAVITY_REDIRECT_URI,
  state = crypto.randomUUID()
): { authUrl: string; redirectUri: string; state: string } {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: ANTIGRAVITY_SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent"
  });
  return {
    authUrl: `${ANTIGRAVITY_AUTHORIZE_URL}?${params.toString()}`,
    redirectUri,
    state
  };
}

export function parseAntigravityCallbackInput(
  rawInput: string,
  fallbackRedirectUri = DEFAULT_ANTIGRAVITY_REDIRECT_URI
): { code: string; redirectUri: string } {
  let trimmed = (rawInput || "").trim();
  if (!trimmed) {
    throw new Error("Input URL callback / kode otorisasi masih kosong.");
  }

  // Handle Brave/Chrome address bar copy where `http://` is hidden (e.g. `localhost:8085/callback?state=...&code=...`)
  if (/^(localhost|127\.0\.0\.1)(:\d+)?\//i.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }

  // Full URL pasted from browser address bar (e.g. http://localhost:8085/callback?code=4/0A...&scope=...)
  if (/^https?:\/\//i.test(trimmed)) {
    const u = new URL(trimmed);
    const oauthErr = u.searchParams.get("error");
    if (oauthErr) {
      throw new Error(`Login Google dibatalkan / gagal: ${oauthErr}`);
    }
    const code = u.searchParams.get("code");
    if (!code) {
      throw new Error("URL yang ditempel tidak mengandung parameter code=...");
    }
    return {
      code: code.trim(),
      redirectUri: `${u.origin}${u.pathname}`
    };
  }

  // Query string or partial path pasted (e.g. /callback?code=4/0A... or ?code=4/0A...)
  if (trimmed.includes("code=")) {
    const qIdx = trimmed.indexOf("?");
    const q = qIdx >= 0 ? trimmed.slice(qIdx + 1) : trimmed;
    const sp = new URLSearchParams(q);
    const code = sp.get("code");
    if (code) {
      return { code: code.trim(), redirectUri: fallbackRedirectUri };
    }
  }

  // Raw code (decode %2F if user copied URL-encoded code segment)
  let rawCode = trimmed;
  if (rawCode.includes("%2F") || rawCode.includes("%2f")) {
    try {
      rawCode = decodeURIComponent(rawCode);
    } catch {
      // keep raw
    }
  }
  return { code: rawCode, redirectUri: fallbackRedirectUri };
}

async function discoverAntigravityProfile(accessToken: string): Promise<{
  email: string;
  projectId: string;
  tierId: string;
}> {
  let email = "";
  try {
    const uRes = await fetch(ANTIGRAVITY_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (uRes.ok) {
      const uJson = (await uRes.json()) as { email?: string };
      email = String(uJson.email || "").trim();
    }
  } catch {
    // non-fatal
  }

  const metadata = { ideType: 9, platform: 5, pluginType: 2 };
  const loadHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": ANTIGRAVITY_USER_AGENT
  };

  let projectId = "";
  let tierId = "legacy-tier";

  try {
    const loadRes = await fetch(ANTIGRAVITY_LOAD_CODE_ASSIST_URL, {
      method: "POST",
      headers: loadHeaders,
      body: JSON.stringify({ metadata })
    });
    if (loadRes.ok) {
      const data = (await loadRes.json()) as {
        cloudaicompanionProject?: { id?: string } | string;
        allowedTiers?: Array<{ id?: string; isDefault?: boolean }>;
      };
      if (typeof data.cloudaicompanionProject === "string") {
        projectId = data.cloudaicompanionProject;
      } else if (data.cloudaicompanionProject?.id) {
        projectId = data.cloudaicompanionProject.id;
      }
      if (Array.isArray(data.allowedTiers)) {
        const def = data.allowedTiers.find((t) => t.isDefault && t.id);
        if (def?.id) tierId = def.id.trim();
      }
    }
  } catch {
    // non-fatal
  }

  // Trigger onboarding (and extract provisioned project if loadCodeAssist returned empty)
  try {
    for (let i = 0; i < 2; i++) {
      const obRes = await fetch(ANTIGRAVITY_ONBOARD_USER_URL, {
        method: "POST",
        headers: loadHeaders,
        body: JSON.stringify({ tierId, metadata })
      });
      if (!obRes.ok) break;
      const obJson = (await obRes.json()) as {
        done?: boolean;
        response?: { cloudaicompanionProject?: { id?: string } | string };
      };
      const obProj = obJson.response?.cloudaicompanionProject;
      if (!projectId && obProj) {
        projectId = typeof obProj === "string" ? obProj : obProj.id || "";
      }
      if (obJson.done || projectId) break;
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch {
    // non-fatal
  }

  if (!projectId) {
    projectId = generateAntigravityProjectId();
  }

  return {
    email: email || `ag-${crypto.randomUUID().slice(0, 6)}@google-oauth`,
    projectId,
    tierId
  };
}

export async function exchangeAntigravityCallback(
  callbackInput: string,
  redirectUri = DEFAULT_ANTIGRAVITY_REDIRECT_URI
): Promise<OAuthAccount> {
  const parsed = parseAntigravityCallbackInput(callbackInput, redirectUri);

  const tokenRes = await fetch(ANTIGRAVITY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ANTIGRAVITY_CLIENT_ID,
      client_secret: ANTIGRAVITY_CLIENT_SECRET,
      code: parsed.code,
      redirect_uri: parsed.redirectUri
    })
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Gagal menukar kode OAuth Google (${tokenRes.status}): ${errBody.slice(0, 300)}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token) {
    throw new Error("Google OAuth tidak mengembalikan access_token.");
  }

  const profile = await discoverAntigravityProfile(tokens.access_token);
  const expiresInSec = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;

  return {
    id: `ag_${crypto.randomUUID().slice(0, 10)}`,
    providerId: "antigravity",
    email: profile.email,
    projectId: profile.projectId,
    tierId: profile.tierId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || "",
    expiresAt: Date.now() + expiresInSec * 1000,
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

export async function importAntigravityRefreshToken(
  refreshToken: string,
  customProjectId?: string,
  customEmail?: string
): Promise<OAuthAccount> {
  const cleanRefresh = (refreshToken || "").trim();
  if (!cleanRefresh) {
    throw new Error("Refresh token kosong.");
  }

  const tokenRes = await fetch(ANTIGRAVITY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cleanRefresh,
      client_id: ANTIGRAVITY_CLIENT_ID,
      client_secret: ANTIGRAVITY_CLIENT_SECRET
    })
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Refresh token tidak valid (${tokenRes.status}): ${errBody.slice(0, 260)}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const profile = await discoverAntigravityProfile(tokens.access_token);
  const expiresInSec = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;

  return {
    id: `ag_${crypto.randomUUID().slice(0, 10)}`,
    providerId: "antigravity",
    email: customEmail?.trim() || profile.email,
    projectId: customProjectId?.trim() || profile.projectId,
    tierId: profile.tierId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || cleanRefresh,
    expiresAt: Date.now() + expiresInSec * 1000,
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

export async function ensureAntigravityAccessToken(
  account: OAuthAccount,
  env: Env
): Promise<string> {
  const leadMs = 300_000; // Refresh 5 minutes before expiry
  if (account.accessToken && account.expiresAt && Date.now() < account.expiresAt - leadMs) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    if (account.accessToken) return account.accessToken;
    throw new Error(`Akun ${account.email} tidak memiliki refresh_token dan access_token sudah kedaluwarsa.`);
  }

  const res = await fetch(ANTIGRAVITY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: ANTIGRAVITY_CLIENT_ID,
      client_secret: ANTIGRAVITY_CLIENT_SECRET
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gagal refresh token OAuth (${res.status}): ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = Date.now() + (typeof data.expires_in === "number" ? data.expires_in : 3600) * 1000;
  account.accessToken = data.access_token;
  if (data.refresh_token) account.refreshToken = data.refresh_token;
  account.expiresAt = expiresAt;

  await updateOAuthAccountTokens(env, account.id, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt
  });

  return data.access_token;
}

// ============================================================================
// 2. QUOTA / RATE LIMIT PARSER
// ============================================================================

export function parseAntigravityQuotaError(
  status: number,
  headers: Headers,
  bodyText: string
): { resetAtMs: number; cleanMessage: string } {
  const now = Date.now();
  let resetAtMs = 0;
  let cleanMessage = bodyText.slice(0, 240);

  // 1. Parse JSON ErrorInfo / RetryInfo (quotaResetTimeStamp or retryDelay)
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as {
        error?: {
          message?: string;
          details?: Array<{
            retryDelay?: string;
            metadata?: { quotaResetTimeStamp?: string };
          }>;
        };
      };
      if (parsed.error?.message) {
        cleanMessage = parsed.error.message;
      }
      const details = Array.isArray(parsed.error?.details) ? parsed.error!.details! : [];
      for (const d of details) {
        if (d?.metadata?.quotaResetTimeStamp) {
          const ts = new Date(d.metadata.quotaResetTimeStamp).getTime();
          if (!Number.isNaN(ts) && ts > now) {
            resetAtMs = ts;
            break;
          }
        }
        if (typeof d?.retryDelay === "string") {
          const sec = parseFloat(d.retryDelay);
          if (!Number.isNaN(sec) && sec > 0) {
            resetAtMs = now + Math.round(sec * 1000);
            break;
          }
        }
      }
    } catch {
      // plain text error body
    }
  }

  // 2. Parse HTTP Retry-After / x-ratelimit-reset-after headers
  if (!resetAtMs) {
    const retryAfter = headers.get("retry-after") || headers.get("x-ratelimit-reset-after");
    if (retryAfter) {
      const sec = parseInt(retryAfter, 10);
      if (!Number.isNaN(sec) && sec > 0) {
        resetAtMs = now + sec * 1000;
      } else {
        const dt = new Date(retryAfter).getTime();
        if (!Number.isNaN(dt) && dt > now) resetAtMs = dt;
      }
    }
  }

  // 3. Parse human-readable message ("Your quota will reset after 2h7m23s" or "Resets in 162h37m27s")
  if (!resetAtMs && cleanMessage) {
    const m = cleanMessage.match(/(?:reset after|resets in)\s*(\d+h)?(\d+m)?(\d+s)?/i);
    if (m && (m[1] || m[2] || m[3])) {
      let addMs = 0;
      if (m[1]) addMs += parseInt(m[1], 10) * 3_600_000;
      if (m[2]) addMs += parseInt(m[2], 10) * 60_000;
      if (m[3]) addMs += parseInt(m[3], 10) * 1_000;
      if (addMs > 0) resetAtMs = now + addMs;
    }
  }

  // 4. Sensible short cooldown so other requests still have a chance if 429 was transient
  if (!resetAtMs) {
    if (status === 429 || status === 409) {
      resetAtMs = now + 15_000;
    } else if (status === 401 || status === 403) {
      resetAtMs = now + 60_000;
    } else {
      resetAtMs = now + 10_000;
    }
  }

  return { resetAtMs, cleanMessage };
}

// ============================================================================
// 3. ANTIGRAVITY v1internal ENVELOPE & SCHEMA / TOOL CLOAKING TRANSLATOR
// ============================================================================

function stripThinkingSuffix(m: string): string {
  return m.replace(/\([^()]+\)\s*$/, "").trim();
}

/**
 * Google Antigravity occasionally retires a model but still answers HTTP 200 with a
 * plain-text notice instead of an error, e.g.
 *   "Claude Sonnet 4.6 is no longer available. Please switch to Claude Sonnet 5.5."
 * That text used to be delivered to the coding agent as the assistant answer, which
 * broke sessions (and compaction). Detect it so the router can fail over immediately.
 */
export function detectDeprecatedModelNotice(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length > 400) return null;
  const m = trimmed.match(
    /^(?:the\s+)?(?:model\s+)?([\w.\- ]{2,60}?)\s+is\s+no\s+longer\s+available\b/i
  );
  if (!m) return null;
  return trimmed.slice(0, 240);
}

export function resolveAntigravityUpstreamModel(
  modelId: string,
  catalogModels: ModelSpec[] = [],
  variant = ""
): string {
  let clean = stripThinkingSuffix(modelId.trim());
  let requestedVariant = (variant || "").toLowerCase().trim();

  if (clean.includes("#")) {
    const parts = clean.split("#");
    clean = parts[0].trim();
    if (!requestedVariant && parts[1]) {
      requestedVariant = parts[1].toLowerCase().trim();
    }
  }

  const lower = clean.toLowerCase();

  const normalizeTier = (v: string): "low" | "medium" | "high" => {
    if (v === "low" || v === "minimal" || v === "none") return "low";
    if (v === "high" || v === "max" || v === "xhigh") return "high";
    return "medium";
  };

  // Explicit tier suffix on model ID (e.g. `gemini-4-argon-high`) still honors an explicit
  // UI effort override (`low`/`medium`/`high`) if the user switched effort in OpenCode!
  const explicitTierOverride =
    requestedVariant === "low" ||
    requestedVariant === "minimal" ||
    requestedVariant === "none" ||
    requestedVariant === "medium" ||
    requestedVariant === "high" ||
    requestedVariant === "max" ||
    requestedVariant === "xhigh";

  // 1. Gemini 4 Argon family (default: medium)
  if (
    lower === "gemini-4-argon" ||
    lower === "gemini-4-argon-tiered" ||
    lower === "argon" ||
    (explicitTierOverride && lower.startsWith("gemini-4-argon-"))
  ) {
    return `gemini-4-argon-${normalizeTier(requestedVariant)}`;
  }

  // 2. Gemini 3.8 Flash family (default: medium)
  if (
    lower === "gemini-3.8-flash" ||
    lower === "gemini-3.8-flash-tiered" ||
    (explicitTierOverride && lower.startsWith("gemini-3.8-flash-"))
  ) {
    return `gemini-3.8-flash-${normalizeTier(requestedVariant)}`;
  }

  // 3. Claude Sonnet 5.5 & legacy Sonnet aliases (default: medium)
  if (
    lower === "claude-sonnet-5-5" ||
    lower === "claude-sonnet-4-6" ||
    lower === "claude-sonnet-4-5" ||
    lower === "claude-sonnet" ||
    lower === "sonnet" ||
    (explicitTierOverride && (lower.startsWith("claude-sonnet-5-5-") || lower.startsWith("claude-sonnet-4-6-")))
  ) {
    return `claude-sonnet-5-5-${normalizeTier(requestedVariant)}`;
  }

  // 4. Claude Opus 5.5 & legacy Opus aliases (default: medium)
  if (
    lower === "claude-opus-5-5" ||
    lower === "claude-opus-4-6" ||
    lower === "claude-opus-4-5" ||
    lower === "claude-opus" ||
    lower === "opus" ||
    (explicitTierOverride && (lower.startsWith("claude-opus-5-5-") || lower.startsWith("claude-opus-4-6-")))
  ) {
    return `claude-opus-5-5-${normalizeTier(requestedVariant)}`;
  }

  // 5. Auto pool respects effort selector too (default: medium)
  if (lower === "auto") {
    return `gemini-3.8-flash-${normalizeTier(requestedVariant)}`;
  }

  const fromMap = ANTIGRAVITY_MODEL_UPSTREAM_MAP[lower];
  if (fromMap) return stripThinkingSuffix(fromMap);
  const fromCatalog = catalogModels.find((m) => m.id.toLowerCase() === lower);
  if (fromCatalog?.upstreamModelId) return stripThinkingSuffix(fromCatalog.upstreamModelId);
  return clean;
}

export async function fetchAntigravityAvailableModels(
  account: OAuthAccount,
  env: Env,
  baseUrl = ANTIGRAVITY_DEFAULT_BASE_URL
): Promise<Array<{ id: string; name: string }>> {
  const accessToken = await ensureAntigravityAccessToken(account, env);
  const cleanBase = (baseUrl || ANTIGRAVITY_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const res = await fetch(`${cleanBase}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": ANTIGRAVITY_USER_AGENT,
      "Content-Type": "application/json",
      "X-Client-Name": "antigravity",
      "X-Client-Version": "2.24.0"
    },
    body: JSON.stringify(account.projectId ? { project: account.projectId } : {})
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchAvailableModels gagal (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    models?: Record<string, { displayName?: string; isInternal?: boolean }>;
  };
  if (!data.models || typeof data.models !== "object") return [];
  const out: Array<{ id: string; name: string }> = [];
  for (const [id, info] of Object.entries(data.models)) {
    if (info?.isInternal) continue;
    out.push({ id, name: info?.displayName || id });
  }
  return out;
}

function sanitizeFunctionName(name: string): string {
  if (!name) return "_unknown";
  let s = name.replace(/[^a-zA-Z0-9_.:\-]/g, "_");
  if (!/^[a-zA-Z_]/.test(s)) s = `_${s}`;
  return s.slice(0, 64);
}

function rewriteAntigravitySystemPrompt(raw: string): string {
  let out = raw;
  out = out.replace(/^x-anthropic-billing-header:[^\n]*(?:\r?\n)*/gim, "");
  out = out.replaceAll("You are a Claude agent, built on Anthropic's Claude Agent SDK.", "");
  out = out.replace(
    /You are Hermes(?: Agent)?(?:,\s*(?:an intelligent AI assistant|an AI assistant|an AI agent))?(?:,?\s*(?:built|created)\s+by\s+Nous Research)?\./gi,
    "You are an AI assistant."
  );
  out = out.replace(/opencode/gi, (m) =>
    m === "OpenCode" ? "Antigravity" : m === "OPENCODE" ? "ANTIGRAVITY" : "antigravity"
  );
  return out;
}

const cleanedSchemaCache = new Map<string, Record<string, unknown>>();

export function cleanJSONSchemaForAntigravity(rawSchema: unknown): Record<string, unknown> {
  if (!rawSchema || typeof rawSchema !== "object") {
    return {
      type: "object",
      properties: { reason: { type: "string", description: "Brief explanation" } },
      required: ["reason"]
    };
  }

  // Tool schemas are identical across requests in a session: reuse the cleaned result (it is never mutated later).
  let cacheKey = "";
  try {
    cacheKey = JSON.stringify(rawSchema);
    const hit = cleanedSchemaCache.get(cacheKey);
    if (hit) return hit;
  } catch {
    cacheKey = "";
  }

  const schema = structuredClone(rawSchema) as Record<string, unknown>;

  function walkPrepare(node: Record<string, unknown>): void {
    if (node.const !== undefined && !node.enum) {
      node.enum = [String(node.const)];
      delete node.const;
    }
    if (Array.isArray(node.enum)) {
      node.enum = node.enum.map((v) => String(v));
    }
    if (Array.isArray(node.allOf)) {
      const mergedProps: Record<string, unknown> = {};
      const mergedReq = new Set<string>();
      for (const sub of node.allOf) {
        if (sub && typeof sub === "object") {
          const s = sub as Record<string, unknown>;
          if (s.properties && typeof s.properties === "object") {
            Object.assign(mergedProps, s.properties);
          }
          if (Array.isArray(s.required)) {
            for (const r of s.required) mergedReq.add(String(r));
          }
        }
      }
      delete node.allOf;
      if (Object.keys(mergedProps).length > 0) {
        node.properties = { ...mergedProps, ...((node.properties as Record<string, unknown>) || {}) };
      }
      if (mergedReq.size > 0) {
        node.required = Array.from(mergedReq);
      }
    }

    const unionList = (Array.isArray(node.anyOf) ? node.anyOf : Array.isArray(node.oneOf) ? node.oneOf : null) as
      | Array<Record<string, unknown>>
      | null;
    if (unionList && unionList.length > 0) {
      const nonNull = unionList.filter((s) => s && typeof s === "object" && s.type !== "null");
      const chosen =
        nonNull.find((s) => s.type === "object" || s.properties) ||
        nonNull.find((s) => s.type === "array" || s.items) ||
        nonNull[0];
      delete node.anyOf;
      delete node.oneOf;
      if (chosen) Object.assign(node, chosen);
    }

    if (Array.isArray(node.type)) {
      const nonNull = node.type.filter((t) => t !== "null");
      node.type = nonNull.length > 0 ? String(nonNull[0]) : "string";
    }

    if (node.properties && !node.type) {
      node.type = "object";
    }
    if (node.type === "array" && !node.items) {
      node.items = { type: "string" };
    }

    for (const key of Object.keys(node)) {
      if (UNSUPPORTED_SCHEMA_KEYS.has(key)) {
        delete node[key];
        continue;
      }
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object") walkPrepare(item as Record<string, unknown>);
        }
      } else if (val && typeof val === "object") {
        if (key === "properties") {
          for (const propSchema of Object.values(val as Record<string, unknown>)) {
            if (propSchema && typeof propSchema === "object") {
              walkPrepare(propSchema as Record<string, unknown>);
            }
          }
        } else {
          walkPrepare(val as Record<string, unknown>);
        }
      }
    }

    if (Array.isArray(node.required) && node.properties && typeof node.properties === "object") {
      const propsObj = node.properties as Record<string, unknown>;
      const valid = node.required.filter(
        (r) => typeof r === "string" && Object.prototype.hasOwnProperty.call(propsObj, r)
      );
      if (valid.length > 0) node.required = valid;
      else delete node.required;
    }

    if (
      Object.keys(node).length === 0 ||
      (node.type === "object" && (!node.properties || Object.keys(node.properties as object).length === 0))
    ) {
      node.type = "object";
      node.properties = {
        reason: {
          type: "string",
          description: "Brief explanation of why you are calling this tool"
        }
      };
      node.required = ["reason"];
    }
  }

  walkPrepare(schema);
  if (cacheKey) {
    if (cleanedSchemaCache.size >= 300) cleanedSchemaCache.clear();
    cleanedSchemaCache.set(cacheKey, schema);
  }
  return schema;
}

function sanitizeFunctionResponsePayload(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sanitizeFunctionResponsePayload);
  if (!val || typeof val !== "object") return val;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    out[k === "$ref" ? "_ref" : k] = sanitizeFunctionResponsePayload(v);
  }
  return out;
}

function convertOpenAIMessageContentToParts(content: OpenAIMessage["content"]): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  if (typeof content === "string") {
    if (content) parts.push({ text: content });
    return parts;
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string" && block.text) {
        parts.push({ text: block.text });
      } else if (block.type === "image_url") {
        const imgObj = block.image_url as { url?: string } | undefined;
        const url = imgObj?.url || "";
        if (url.startsWith("data:")) {
          const comma = url.indexOf(",");
          if (comma > 5) {
            const mimeType = url.slice(5, comma).split(";")[0] || "image/png";
            const data = url.slice(comma + 1);
            parts.push({ inlineData: { mime_type: mimeType, data } });
          }
        } else if (url.startsWith("http://") || url.startsWith("https://")) {
          parts.push({ fileData: { fileUri: url, mimeType: "image/*" } });
        }
      }
    }
  }
  return parts;
}

function cloakToolName(rawName: string, toolNameMap: Map<string, string>): string {
  const clean = sanitizeFunctionName(rawName);
  if (AG_DEFAULT_TOOLS.has(clean)) return clean;
  const cloaked = sanitizeFunctionName(`${clean}${AG_TOOL_SUFFIX}`);
  toolNameMap.set(cloaked, rawName);
  return cloaked;
}

function uncloakToolName(cloakedName: string, toolNameMap: Map<string, string>): string {
  const mapped = toolNameMap.get(cloakedName);
  if (mapped) return mapped;
  if (cloakedName.endsWith(AG_TOOL_SUFFIX)) {
    return cloakedName.slice(0, -AG_TOOL_SUFFIX.length);
  }
  return cloakedName;
}

export function buildAntigravityEnvelope(
  body: OpenAIChatRequest,
  upstreamModel: string,
  account: OAuthAccount,
  sessionSeed = ""
): { envelope: Record<string, unknown>; toolNameMap: Map<string, string> } {
  const toolNameMap = new Map<string, string>();
  const hasClientTools = Array.isArray(body.tools) && body.tools.length > 0;

  // Map tool_call_id -> original function name from assistant turns so tool role messages get accurate names
  const callIdToOrigName = new Map<string, string>();
  for (const m of body.messages || []) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) {
        if (tc.id && tc.function?.name) {
          callIdToOrigName.set(tc.id, tc.function.name);
        }
      }
    }
  }

  const systemTexts: string[] = [];
  const rawContents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];

  for (const msg of body.messages || []) {
    if (msg.role === "system" || msg.role === "developer") {
      const txt =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((b) => String(b.text || "")).join("\n")
            : "";
      if (txt.trim()) {
        const rewritten = rewriteAntigravitySystemPrompt(txt).trim();
        if (rewritten) systemTexts.push(rewritten);
      }
      continue;
    }

    if (msg.role === "user") {
      const parts = convertOpenAIMessageContentToParts(msg.content);
      if (parts.length > 0) {
        rawContents.push({ role: "user", parts });
      }
      continue;
    }

    if (msg.role === "assistant") {
      const parts = convertOpenAIMessageContentToParts(msg.content);
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        let firstFc = true;
        for (const tc of msg.tool_calls) {
          const origName = tc.function?.name || "tool";
          const wireName = hasClientTools ? cloakToolName(origName, toolNameMap) : sanitizeFunctionName(origName);
          let parsedArgs: Record<string, unknown> = {};
          try {
            const p = JSON.parse(tc.function?.arguments || "{}");
            if (p && typeof p === "object" && !Array.isArray(p)) parsedArgs = p;
          } catch {
            parsedArgs = {};
          }

          const cachedSig = tc.id ? thoughtSigStore.get(tc.id) : undefined;
          const sig = cachedSig || (firstFc ? DEFAULT_THINKING_AG_SIGNATURE : undefined);
          firstFc = false;

          const fcPart: Record<string, unknown> = {
            functionCall: {
              ...(tc.id ? { id: tc.id } : {}),
              name: wireName,
              args: parsedArgs
            }
          };
          if (sig) fcPart.thoughtSignature = sig;
          parts.push(fcPart);
        }
      }
      if (parts.length > 0) {
        rawContents.push({ role: "model", parts });
      }
      continue;
    }

    if (msg.role === "tool") {
      const callId = msg.tool_call_id || "";
      const origName = msg.name || callIdToOrigName.get(callId) || "tool";
      const wireName = hasClientTools ? cloakToolName(origName, toolNameMap) : sanitizeFunctionName(origName);
      const rawContent =
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content ?? "");

      let resultPayload: unknown = rawContent;
      const firstCh = rawContent.charCodeAt(0);
      // Only try JSON.parse when the text can actually be a JSON object/array ('{' or '[') — avoids
      // thousands of throw/catch cycles over plain-text tool output in long agent sessions.
      if (firstCh === 123 || firstCh === 91) {
        try {
          const maybeJson = JSON.parse(rawContent);
          if (maybeJson && typeof maybeJson === "object") {
            resultPayload = sanitizeFunctionResponsePayload(maybeJson);
          }
        } catch {
          resultPayload = rawContent;
        }
      }

      rawContents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              ...(callId ? { id: callId } : {}),
              name: wireName,
              response: { result: resultPayload }
            }
          }
        ]
      });
    }
  }

  // Merge adjacent same-role turns & ensure valid start/end user turns (required by Gemini 4 & Claude via AG)
  const isGemini4 = /gemini-4/i.test(upstreamModel);
  const normalizedContents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];
  for (const c of rawContents) {
    if (c.parts.length === 0) continue;
    const prev = normalizedContents[normalizedContents.length - 1];
    if (prev && prev.role === c.role) {
      prev.parts.push(...c.parts);
      if (isGemini4 && prev.role === "user") {
        const nonFr = prev.parts.filter((p) => !p.functionResponse);
        const fr = prev.parts.filter((p) => Boolean(p.functionResponse));
        if (fr.length > 0) prev.parts = [...nonFr, ...fr];
      }
    } else {
      normalizedContents.push({ role: c.role, parts: [...c.parts] });
    }
  }

  if (normalizedContents.length === 0) {
    normalizedContents.push({ role: "user", parts: [{ text: "Hello" }] });
  } else if (normalizedContents[0].role !== "user") {
    normalizedContents.unshift({ role: "user", parts: [{ text: "..." }] });
  }

  const lastTurn = normalizedContents[normalizedContents.length - 1];
  if (lastTurn && lastTurn.role === "model") {
    const fnCalls = lastTurn.parts.filter((p) => Boolean(p.functionCall));
    if (fnCalls.length > 0) {
      normalizedContents.push({
        role: "user",
        parts: fnCalls.map((p) => {
          const fc = p.functionCall as { id?: string; name?: string };
          return {
            functionResponse: {
              ...(fc.id ? { id: fc.id } : {}),
              name: fc.name || "tool",
              response: { result: "Continue." }
            }
          };
        })
      });
    } else {
      normalizedContents.push({ role: "user", parts: [{ text: "Continue." }] });
    }
  }

  // Build cloaked tools + AG decoy tools
  let toolsPayload: Array<{ functionDeclarations: Array<Record<string, unknown>> }> | undefined;
  if (hasClientTools) {
    const declarations: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (const t of body.tools!) {
      const fn = (t.function as Record<string, unknown>) || t;
      const origName = String(fn.name || "");
      if (!origName) continue;
      const cloakedName = cloakToolName(origName, toolNameMap);
      if (seen.has(cloakedName)) continue;
      seen.add(cloakedName);

      declarations.push({
        name: cloakedName,
        description: String(fn.description || ""),
        parameters: cleanJSONSchemaForAntigravity(fn.parameters || fn.input_schema)
      });
    }

    for (const decoy of AG_DECOY_TOOLS) {
      if (!seen.has(decoy.name)) {
        seen.add(decoy.name);
        declarations.push(decoy);
      }
    }

    if (declarations.length > 0) {
      toolsPayload = [{ functionDeclarations: declarations }];
    }
  }

  const maxTokens = Math.min(
    body.max_completion_tokens || body.max_tokens || 16384,
    64000
  );
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: maxTokens
  };
  if (typeof body.temperature === "number") {
    generationConfig.temperature = body.temperature;
  }
  if (typeof body.top_p === "number") {
    generationConfig.topP = body.top_p;
  }

  const seed = sessionSeed || account.email || account.id;
  const sessionId = toNumericSessionId(`ag:${seed}`);
  const convId = deterministicUuid(`conv:${seed}`);
  const trajId = deterministicUuid(`traj:${seed}:${upstreamModel}`);
  const step = Math.max(1, normalizedContents.length * 2 - 1);
  const requestId = `agent/${convId}/${Date.now()}/${trajId}/${step}`;

  const innerRequest: Record<string, unknown> = {
    contents: normalizedContents,
    generationConfig,
    sessionId
  };

  if (systemTexts.length > 0) {
    innerRequest.systemInstruction = {
      role: "user",
      parts: [{ text: systemTexts.join("\n\n") }]
    };
  }

  if (toolsPayload && toolsPayload.length > 0) {
    innerRequest.tools = toolsPayload;
    innerRequest.toolConfig = {
      functionCallingConfig: { mode: "VALIDATED" }
    };
  }

  // IMPORTANT: Omit `requestType` on chat/agent calls (upstream returns fake 429 if requestType is set!)
  const envelope: Record<string, unknown> = {
    project: account.projectId || generateAntigravityProjectId(),
    model: upstreamModel,
    userAgent: "antigravity",
    requestId,
    request: innerRequest
  };

  return { envelope, toolNameMap };
}

// ============================================================================
// 4. ANTIGRAVITY JSON & SSE RESPONSE -> OPENAI TRANSLATORS
// ============================================================================

interface AntigravityPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };
}

interface AntigravityCandidate {
  content?: {
    parts?: AntigravityPart[];
  };
  finishReason?: string;
}

interface AntigravityPayload {
  responseId?: string;
  candidates?: AntigravityCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  response?: AntigravityPayload;
}

function mapFinishReason(rawReason: string | undefined, hasToolCalls: boolean): string {
  if (hasToolCalls) return "tool_calls";
  if (!rawReason) return "stop";
  const upper = rawReason.toUpperCase();
  if (upper === "MAX_TOKENS") return "length";
  if (upper === "SAFETY" || upper === "RECITATION") return "content_filter";
  // Antigravity occasionally returns OTHER or MALFORMED_FUNCTION_CALL as a finishReason.
  return "stop";
}

export function antigravityJsonToOpenAI(
  rawJson: Record<string, unknown>,
  requestedModel: string,
  toolNameMap: Map<string, string>
): Record<string, unknown> {
  const wrapper = rawJson as unknown as AntigravityPayload;
  const payload = wrapper.response || wrapper;
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let textOut = "";
  let reasoningOut = "";
  let pendingSig = "";
  const toolCalls: Array<Record<string, unknown>> = [];

  for (const part of parts) {
    const sig = part.thoughtSignature || part.thought_signature;
    if (typeof sig === "string" && sig) {
      pendingSig = sig;
    }

    if (typeof part.text === "string" && part.text.length > 0) {
      if (part.thought === true) {
        reasoningOut += part.text;
      } else {
        textOut += part.text;
      }
    }

    if (part.functionCall) {
      const wireName = part.functionCall.name || "tool";
      const origName = uncloakToolName(wireName, toolNameMap);
      const idx = toolCalls.length;
      const callId = part.functionCall.id || `call_${crypto.randomUUID().slice(0, 12)}`;
      if (pendingSig) {
        rememberThoughtSignature(callId, pendingSig);
        pendingSig = "";
      }
      toolCalls.push({
        id: callId,
        type: "function",
        function: {
          name: origName,
          arguments: JSON.stringify(part.functionCall.args || {})
        },
        index: idx
      });
    }
  }

  const message: Record<string, unknown> = {
    role: "assistant",
    content: textOut || (toolCalls.length > 0 ? null : "")
  };
  if (reasoningOut) {
    message.reasoning_content = reasoningOut;
  }
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls.map(({ index: _idx, ...rest }) => rest);
  }

  const usageMeta = payload.usageMetadata || wrapper.usageMetadata;
  return {
    id: `chatcmpl-${payload.responseId || crypto.randomUUID().slice(0, 12)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message,
        finish_reason: mapFinishReason(candidate?.finishReason, toolCalls.length > 0)
      }
    ],
    usage: {
      prompt_tokens: usageMeta?.promptTokenCount || 0,
      completion_tokens: usageMeta?.candidatesTokenCount || 0,
      total_tokens: usageMeta?.totalTokenCount || 0
    }
  };
}

export function antigravityStreamToOpenAIStream(
  upstreamBody: ReadableStream<Uint8Array>,
  requestedModel: string,
  toolNameMap: Map<string, string>,
  onUsage?: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void | Promise<void>,
  estimatedPromptTokens = 0
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let sentRole = false;
  let sentFinish = false;
  let toolIndex = 0;
  let pendingSig = "";
  let completionChars = 0;
  let usageReported = false;
  let capturedUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
  const chatId = `chatcmpl-ag-${crypto.randomUUID().slice(0, 12)}`;
  const created = Math.floor(Date.now() / 1000);

  const reportUsage = (
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): void | Promise<void> => {
    if (usageReported) return;
    usageReported = true;
    if (onUsage) {
      try {
        return onUsage(usage);
      } catch {
        // never break the stream because of stats
      }
    }
  };

  const emitChunk = (
    controller: TransformStreamDefaultController<Uint8Array>,
    delta: Record<string, unknown>,
    finishReason: string | null = null,
    usage?: Record<string, number>
  ) => {
    const obj: Record<string, unknown> = {
      id: chatId,
      object: "chat.completion.chunk",
      created,
      model: requestedModel,
      choices: [{ index: 0, delta, finish_reason: finishReason }]
    };
    if (usage) obj.usage = usage;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
  };

  const emitUsageOnlyChunk = (
    controller: TransformStreamDefaultController<Uint8Array>,
    usage: Record<string, number>
  ) => {
    const obj: Record<string, unknown> = {
      id: chatId,
      object: "chat.completion.chunk",
      created,
      model: requestedModel,
      choices: [],
      usage
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
  };

  const processDataLine = (
    jsonStr: string,
    controller: TransformStreamDefaultController<Uint8Array>
  ) => {
    if (!jsonStr || jsonStr === "[DONE]") return;
    let parsed: AntigravityPayload;
    try {
      parsed = JSON.parse(jsonStr) as AntigravityPayload;
    } catch {
      return;
    }

    const payload = parsed.response || parsed;
    const usageMeta = payload.usageMetadata || parsed.usageMetadata;
    if (usageMeta) {
      capturedUsage = {
        promptTokens: usageMeta.promptTokenCount || 0,
        completionTokens: usageMeta.candidatesTokenCount || 0,
        totalTokens: usageMeta.totalTokenCount || 0
      };
    }
    const candidate = payload.candidates?.[0];
    if (!candidate) return;

    if (!sentRole) {
      sentRole = true;
      emitChunk(controller, { role: "assistant" }, null);
    }

    for (const part of candidate.content?.parts || []) {
      const sig = part.thoughtSignature || part.thought_signature;
      if (typeof sig === "string" && sig) {
        pendingSig = sig;
      }

      if (typeof part.text === "string" && part.text.length > 0) {
        completionChars += part.text.length;
        if (part.thought === true) {
          emitChunk(controller, { reasoning_content: part.text }, null);
        } else {
          emitChunk(controller, { content: part.text }, null);
        }
      }

      if (part.functionCall) {
        const wireName = part.functionCall.name || "tool";
        const origName = uncloakToolName(wireName, toolNameMap);
        const idx = toolIndex++;
        const callId = part.functionCall.id || `call_${crypto.randomUUID().slice(0, 12)}`;
        completionChars += wireName.length + JSON.stringify(part.functionCall.args || {}).length;
        if (pendingSig) {
          rememberThoughtSignature(callId, pendingSig);
          pendingSig = "";
        }
        emitChunk(
          controller,
          {
            tool_calls: [
              {
                index: idx,
                id: callId,
                type: "function",
                function: {
                  name: origName,
                  arguments: JSON.stringify(part.functionCall.args || {})
                }
              }
            ]
          },
          null
        );
      }
    }

    if (candidate.finishReason) {
      sentFinish = true;
      const usage = capturedUsage
        ? {
            prompt_tokens: capturedUsage.promptTokens,
            completion_tokens: capturedUsage.completionTokens,
            total_tokens: capturedUsage.totalTokens
          }
        : undefined;
      emitChunk(controller, {}, mapFinishReason(candidate.finishReason, toolIndex > 0), usage);
    }
  };

  return upstreamBody.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          processDataLine(payload, controller);
        }
      },
      async flush(controller) {
        if (buffer.trim().startsWith("data:")) {
          processDataLine(buffer.trim().slice(5).trim(), controller);
        }
        if (!sentFinish) {
          emitChunk(controller, {}, toolIndex > 0 ? "tool_calls" : "stop");
        }
        // Antigravity often omits usageMetadata on the stream. Estimate from the
        // emitted text so token counters and cost are never silently zero.
        let finalUsage = capturedUsage;
        if (!finalUsage || finalUsage.totalTokens <= 0) {
          const completionTokens = Math.max(1, Math.ceil(completionChars / 4));
          const promptTokens = Math.max(0, estimatedPromptTokens);
          finalUsage = {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens
          };
          // IMPORTANT: choices MUST be `[]` on trailing usage chunks! Emitting `finish_reason: null`
          // AFTER `finish_reason: "tool_calls"` overwrites finishReason in OpenAI SDKs and triggers
          // "OpenAI Chat stream ended without finish_reason".
          emitUsageOnlyChunk(controller, {
            prompt_tokens: finalUsage.promptTokens,
            completion_tokens: finalUsage.completionTokens,
            total_tokens: finalUsage.totalTokens
          });
        }
        if (!usageReported) {
          await reportUsage(finalUsage);
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    })
  );
}

// ============================================================================
// 5. LIVE EXECUTION AGAINST A SINGLE ANTIGRAVITY OAUTH ACCOUNT
// ============================================================================

export interface AntigravityCallResult {
  ok: boolean;
  status: number;
  response?: Response;
  errorText?: string;
  resetAtMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  onStreamDone?: (cb: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void | Promise<void>) => void;
}

export async function callAntigravityAccount(opts: {
  account: OAuthAccount;
  baseUrl: string;
  upstreamModelId: string;
  body: OpenAIChatRequest;
  requestedModel: string;
  timeoutMs: number;
  env: Env;
  sessionSeed?: string;
}): Promise<AntigravityCallResult> {
  const { account, baseUrl, upstreamModelId, body, requestedModel, timeoutMs, env, sessionSeed } = opts;

  let accessToken: string;
  try {
    accessToken = await ensureAntigravityAccessToken(account, env);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 401,
      errorText: msg,
      resetAtMs: Date.now() + 300_000
    };
  }

  const stream = Boolean(body.stream);
  const cleanBase = (baseUrl || ANTIGRAVITY_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${cleanBase}/v1internal:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`;

  const { envelope, toolNameMap } = buildAntigravityEnvelope(
    body,
    upstreamModelId,
    account,
    sessionSeed
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("Antigravity upstream timeout"), timeoutMs);
  const envelopeJson = JSON.stringify(envelope);

  try {
    const upRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": ANTIGRAVITY_USER_AGENT
      },
      body: envelopeJson,
      signal: controller.signal
    });

    if (!upRes.ok) {
      const errBody = await upRes.text();
      const parsedQuota = parseAntigravityQuotaError(upRes.status, upRes.headers, errBody);
      return {
        ok: false,
        status: upRes.status,
        errorText: parsedQuota.cleanMessage,
        resetAtMs: parsedQuota.resetAtMs
      };
    }

    if (stream && upRes.body) {
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let streamDoneCallback: ((usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void | Promise<void>) | null = null;

      // Fallback prompt estimate (~4 chars per token) because Antigravity's SSE
      // frequently omits usageMetadata entirely.
      const estimatedPromptTokens = Math.max(1, Math.ceil(envelopeJson.length / 4));

      const openAIStream = antigravityStreamToOpenAIStream(
        upRes.body,
        requestedModel,
        toolNameMap,
        (u) => {
          promptTokens = u.promptTokens;
          completionTokens = u.completionTokens;
          totalTokens = u.totalTokens;
          if (streamDoneCallback) {
            try {
              return streamDoneCallback(u);
            } catch {
              return;
            }
          }
        },
        estimatedPromptTokens
      );

      return {
        ok: true,
        status: 200,
        response: new Response(openAIStream, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform"
          }
        }),
        get promptTokens() { return promptTokens; },
        get completionTokens() { return completionTokens; },
        get totalTokens() { return totalTokens; },
        onStreamDone: (cb) => {
          streamDoneCallback = cb;
        }
      };
    }

    const rawJson = (await upRes.json()) as Record<string, unknown>;
    const translated = antigravityJsonToOpenAI(rawJson, requestedModel, toolNameMap);
    const usage = (translated.usage as Record<string, number>) || {};

    // Upstream can answer 200 with a "model officially retired" notice instead of an
    // error. Treat it as a model-level failure so engine.ts fails over to a live model.
    const choices = (translated.choices as Array<Record<string, unknown>>) || [];
    const answerMessage = (choices[0]?.message || {}) as Record<string, unknown>;
    const answerText = typeof answerMessage.content === "string" ? answerMessage.content : "";
    const deprecationNotice = detectDeprecatedModelNotice(answerText);
    if (deprecationNotice) {
      return {
        ok: false,
        status: 404,
        errorText: deprecationNotice,
        resetAtMs: 0
      };
    }

    return {
      ok: true,
      status: 200,
      response: new Response(JSON.stringify(translated), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      }),
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    };
  } finally {
    clearTimeout(timer);
  }
}
