import { Env, OAuthAccount, OpenAIChatRequest } from "../types";
import { updateOAuthAccountTokens } from "../config/store";
import {
  openAIToAnthropicRequest,
  anthropicResponseToOpenAI,
  anthropicStreamToOpenAIStream
} from "../translators/anthropic";

export const CLAUDE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const CLAUDE_AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
export const CLAUDE_TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";
export const CLAUDE_DEFAULT_REDIRECT_URI = "http://localhost:8085/callback";
export const CLAUDE_SCOPES = ["org:create_api_key", "user:profile", "user:inference"];
export const CLAUDE_CLI_VERSION = "2.1.280";

export const CLAUDE_OAUTH_HEADERS: Record<string, string> = {
  "Anthropic-Version": "2023-06-01",
  "Anthropic-Beta":
    "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05,advanced-tool-use-2025-11-20,effort-2025-11-24,structured-outputs-2025-12-15,fast-mode-2026-02-01,redact-thinking-2026-02-12,token-efficient-tools-2026-03-28",
  "Anthropic-Dangerous-Direct-Browser-Access": "true",
  "User-Agent": `claude-cli/${CLAUDE_CLI_VERSION} (external, sdk-cli)`,
  "X-App": "cli",
  "X-Stainless-Helper-Method": "stream",
  "X-Stainless-Retry-Count": "0",
  "X-Stainless-Runtime-Version": "v24.14.0",
  "X-Stainless-Package-Version": "0.80.0",
  "X-Stainless-Runtime": "node",
  "X-Stainless-Lang": "js",
  "X-Stainless-Arch": "arm64",
  "X-Stainless-Os": "MacOS",
  "X-Stainless-Timeout": "600"
};

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const verifier = base64UrlEncode(randomBytes);

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge };
}

export async function buildClaudeAuthUrl(
  redirectUri = CLAUDE_DEFAULT_REDIRECT_URI,
  state = crypto.randomUUID()
): Promise<{ authUrl: string; redirectUri: string; state: string; codeVerifier: string }> {
  const { verifier, challenge } = await generatePkcePair();

  const params = new URLSearchParams({
    code: "true",
    client_id: CLAUDE_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: CLAUDE_SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state
  });

  return {
    authUrl: `${CLAUDE_AUTHORIZE_URL}?${params.toString()}`,
    redirectUri,
    state,
    codeVerifier: verifier
  };
}

export async function exchangeClaudeCallback(opts: {
  callbackInput: string;
  codeVerifier: string;
  state?: string;
  redirectUri?: string;
}): Promise<OAuthAccount> {
  const { callbackInput, codeVerifier, state, redirectUri = CLAUDE_DEFAULT_REDIRECT_URI } = opts;
  let code = callbackInput.trim();
  let codeState = "";

  if (/^https?:\/\//i.test(code)) {
    try {
      const u = new URL(code);
      code = u.searchParams.get("code") || code;
      codeState = u.searchParams.get("state") || "";
    } catch {
      // ignore
    }
  }

  if (code.includes("#")) {
    const parts = code.split("#");
    code = parts[0];
    codeState = parts[1] || "";
  }

  const tokenPayload = {
    code,
    state: codeState || state || "",
    grant_type: "authorization_code",
    client_id: CLAUDE_CLIENT_ID,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  };

  const res = await fetch(CLAUDE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(tokenPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude OAuth token exchange gagal (${res.status}): ${errText}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  // Extract account email / profile
  let email = "claude-user";
  try {
    const profRes = await fetch("https://api.anthropic.com/api/oauth/profile", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json"
      }
    });
    if (profRes.ok) {
      const prof = (await profRes.json()) as { email?: string; account?: { email?: string } };
      email = prof.email || prof.account?.email || email;
    }
  } catch {
    // ignore
  }

  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 86400;

  return {
    id: `claude_${crypto.randomUUID().slice(0, 10)}`,
    providerId: "claude",
    email,
    projectId: "claude-org",
    tierId: "claude-pro",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || "",
    expiresAt: Date.now() + expiresIn * 1000,
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

export async function ensureClaudeAccessToken(account: OAuthAccount, env: Env): Promise<string> {
  const leadMs = 300_000;
  if (account.accessToken && account.expiresAt && Date.now() < account.expiresAt - leadMs) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    if (account.accessToken) return account.accessToken;
    throw new Error(`Akun Claude ${account.email} tidak memiliki refresh token.`);
  }

  const res = await fetch(CLAUDE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: CLAUDE_CLIENT_ID
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gagal refresh token Claude OAuth (${res.status}): ${txt.slice(0, 200)}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 86400;
  account.accessToken = tokens.access_token;
  if (tokens.refresh_token) account.refreshToken = tokens.refresh_token;
  account.expiresAt = Date.now() + expiresIn * 1000;

  await updateOAuthAccountTokens(env, account.id, {
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    expiresAt: account.expiresAt
  });

  return account.accessToken;
}

export async function callClaudeOAuthAccount(opts: {
  account: OAuthAccount;
  upstreamModel: string;
  body: OpenAIChatRequest;
  requestedModel: string;
  timeoutMs: number;
  env: Env;
}): Promise<{
  ok: boolean;
  status: number;
  response?: Response;
  errorText?: string;
  resetAtMs?: number;
}> {
  const { account, upstreamModel, body, requestedModel, timeoutMs, env } = opts;
  const token = await ensureClaudeAccessToken(account, env);

  const anthropicBody = openAIToAnthropicRequest(body, upstreamModel);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("Claude upstream timeout"), timeoutMs);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages?beta=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...CLAUDE_OAUTH_HEADERS
      },
      body: JSON.stringify(anthropicBody),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      let resetAt = Date.now() + 60_000;
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) {
        const sec = parseInt(retryAfter, 10);
        if (!isNaN(sec) && sec > 0) resetAt = Date.now() + sec * 1000;
      }
      return {
        ok: false,
        status: res.status,
        errorText: errText.slice(0, 300),
        resetAtMs: resetAt
      };
    }

    if (body.stream && res.body) {
      const openAIStream = anthropicStreamToOpenAIStream(res.body, requestedModel);
      return {
        ok: true,
        status: 200,
        response: new Response(openAIStream, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache"
          }
        })
      };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const translated = anthropicResponseToOpenAI(data, requestedModel);
    return {
      ok: true,
      status: 200,
      response: new Response(JSON.stringify(translated), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      })
    };
  } finally {
    clearTimeout(timer);
  }
}
