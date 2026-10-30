import {
  ComboConfig,
  Env,
  OpenAIChatRequest,
  ProviderConfig
} from "../types";
import {
  getOrderedApiKeys,
  getOrderedOAuthAccounts,
  getResolvedConfig,
  isProviderReady,
  markKeyCooldown,
  markOAuthAccountCooldown,
  markOAuthAccountSuccess,
  nextRoundRobinIndex,
  recordRequestLog,
  ResolvedRouterConfig,
  updateStreamTokenUsage
} from "../config/store";
import { applyRtkAndCaveman, estimateBodyChars, fitMessagesToBudget } from "../middleware/rtk";
import { sanitizeOpenAIPayloadForProvider } from "../translators/sanitize";
import {
  anthropicResponseToOpenAI,
  anthropicStreamToOpenAIStream,
  openAIToAnthropicRequest
} from "../translators/anthropic";
import {
  callAntigravityAccount,
  resolveAntigravityUpstreamModel
} from "../providers/antigravity";
import { callClaudeOAuthAccount } from "../providers/claude";

export interface RouteTarget {
  provider: ProviderConfig;
  upstreamModel: string;
}

const RETRYABLE_STATUSES = new Set([401, 402, 403, 408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524]);

/** `${accountId}|${model}` -> epoch ms until which the model is known to be unavailable (404) on that account. */
const deadModelCache = new Map<string, number>();

/** Rough prompt size estimate (~4 characters per token) used when upstream omits usage. */
function estimatePromptTokens(body: OpenAIChatRequest): number {
  try {
    return Math.max(1, Math.ceil(JSON.stringify(body.messages || []).length / 4));
  } catch {
    return 1;
  }
}

/**
 * Pass-through SSE wrapper that counts emitted tokens for providers that do not
 * report `usage` on streamed responses, then records the final numbers.
 */
function wrapStreamWithUsage(
  body: ReadableStream<Uint8Array>,
  logId: string,
  modelKey: string,
  promptEstimate: number,
  env: Env
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";
  let completionChars = 0;
  let captured: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
  let reported = false;

  const report = async (): Promise<void> => {
    if (reported) return;
    reported = true;
    let usage = captured;
    if (!usage || usage.totalTokens <= 0) {
      const completionTokens = Math.max(1, Math.ceil(completionChars / 4));
      usage = {
        promptTokens: promptEstimate,
        completionTokens,
        totalTokens: promptEstimate + completionTokens
      };
    }
    await updateStreamTokenUsage(logId, modelKey, usage, env);
  };

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload) as Record<string, unknown>;
            const usage = obj.usage as Record<string, number> | undefined;
            if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
              const p = usage.prompt_tokens || 0;
              const c = usage.completion_tokens || 0;
              captured = { promptTokens: p, completionTokens: c, totalTokens: usage.total_tokens || p + c };
            }
            const choices = obj.choices as Array<Record<string, unknown>> | undefined;
            const delta = (choices?.[0]?.delta || {}) as Record<string, unknown>;
            if (typeof delta.content === "string") completionChars += delta.content.length;
            if (typeof delta.reasoning_content === "string") completionChars += delta.reasoning_content.length;
            if (Array.isArray(delta.tool_calls)) completionChars += JSON.stringify(delta.tool_calls).length;

            // Anthropic-style SSE (Claude OAuth passthrough)
            const anthType = typeof obj.type === "string" ? obj.type : "";
            if (anthType === "message_start") {
              const msg = (obj.message || {}) as Record<string, unknown>;
              const u = (msg.usage || {}) as Record<string, number>;
              captured = {
                promptTokens: u.input_tokens || 0,
                completionTokens: u.output_tokens || 0,
                totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0)
              };
            } else if (anthType === "message_delta") {
              const u = (obj.usage || {}) as Record<string, number>;
              captured = {
                promptTokens: captured?.promptTokens || 0,
                completionTokens: u.output_tokens || captured?.completionTokens || 0,
                totalTokens: (captured?.promptTokens || 0) + (u.output_tokens || captured?.completionTokens || 0)
              };
            } else if (anthType === "content_block_delta") {
              const d = (obj.delta || {}) as Record<string, unknown>;
              if (typeof d.text === "string") completionChars += d.text.length;
              if (typeof d.thinking === "string") completionChars += d.thinking.length;
              if (d.partial_json) completionChars += JSON.stringify(d.partial_json).length;
            }
          } catch {
            // ignore non-JSON keepalive lines
          }
        }
      },
      async flush() {
        await report();
      }
    })
  );
}

function maskKey(k: string): string {
  if (!k) return "";
  const clean = k.trim();
  if (clean.length <= 8) return `${clean.slice(0, 3)}...`;
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 2) return email;
  return `${email.slice(0, 3)}***${email.slice(at)}`;
}

function findProviderByPrefix(providers: ProviderConfig[], prefix: string): ProviderConfig | undefined {
  const lower = prefix.toLowerCase();
  return providers.find(
    (p) => p.id.toLowerCase() === lower || p.aliases.some((a) => a.toLowerCase() === lower)
  );
}

function parseSingleRouteString(
  routeStr: string,
  providers: ProviderConfig[]
): RouteTarget | null {
  const slashIdx = routeStr.indexOf("/");
  if (slashIdx <= 0) return null;
  const prefix = routeStr.slice(0, slashIdx).trim();
  const modelPart = routeStr.slice(slashIdx + 1).trim();
  if (!prefix || !modelPart) return null;

  const provider = findProviderByPrefix(providers, prefix);
  if (!provider) return null;
  return { provider, upstreamModel: modelPart };
}

function getAntigravityTierFallbacks(upstreamModel: string): string[] {
  const m = upstreamModel.trim().toLowerCase();
  if (m.startsWith("gemini-4-argon")) {
    return ["gemini-3.8-flash-high", "gemini-3-flash", "gemini-2.5-flash", "claude-sonnet-5-5-high", "gemini-2.5-pro"];
  }
  if (m.startsWith("claude-sonnet")) {
    return ["gemini-3.8-flash-high", "claude-opus-5-5-high", "gemini-2.5-pro"];
  }
  if (m.startsWith("claude-opus")) {
    return ["claude-sonnet-5-5-high", "gemini-3.8-flash-high", "gemini-2.5-pro"];
  }
  if (m.startsWith("gemini-3.1-pro") || m === "gemini-pro-agent") {
    return ["gemini-3.8-flash-high", "gemini-3-flash", "gemini-2.5-pro"];
  }
  if (m === "gemini-2.5-pro" || m.startsWith("gemini-2.5-pro")) {
    return ["gemini-3.8-flash-high", "gemini-3-flash", "gemini-2.5-flash", "gemini-3.8-flash-medium", "claude-sonnet-5-5-high"];
  }
  if (m.startsWith("gemini-3.8-flash")) {
    return ["gemini-3-flash", "gemini-2.5-flash", "claude-sonnet-5-5-high", "gpt-oss-120b-medium"];
  }
  if (m.startsWith("gemini-3-flash") || m.startsWith("gemini-2.5-flash")) {
    return ["gemini-3.8-flash-high", "gemini-3.8-flash-medium", "claude-sonnet-5-5-high"];
  }
  return ["gemini-3.8-flash-high", "claude-sonnet-5-5-high", "gemini-2.5-pro"];
}

export function resolveCandidates(
  requestedModel: string,
  config: ResolvedRouterConfig,
  env: Env
): RouteTarget[] {
  let trimmed = (requestedModel || "9router/auto").trim();
  if (trimmed.includes("#")) {
    trimmed = trimmed.split("#")[0].trim();
  }
  let lower = trimmed.toLowerCase();

  // 1. Check exact or shorthand match against Combos (e.g. `9router/auto`, `auto`, `9router/gemini`, `gemini`)
  const matchedCombo: ComboConfig | undefined = config.combos.find(
    (c) =>
      c.id.toLowerCase() === lower ||
      (c.id.toLowerCase().startsWith("9router/") && c.id.slice(8).toLowerCase() === lower) ||
      (`9router/${c.id.toLowerCase()}` === lower) ||
      (lower.startsWith("9router/") && c.id.toLowerCase() === lower.slice(8))
  );

  if (matchedCombo) {
    let rawRoutes = [...matchedCombo.routes];
    if (matchedCombo.strategy === "round-robin" && rawRoutes.length > 1) {
      const start = nextRoundRobinIndex(`combo:${matchedCombo.id}`, rawRoutes.length);
      rawRoutes = [...rawRoutes.slice(start), ...rawRoutes.slice(0, start)];
    }

    const targets: RouteTarget[] = [];
    for (const r of rawRoutes) {
      const parsed = parseSingleRouteString(r, config.providers);
      if (parsed && isProviderReady(parsed.provider, env, config.oauthAccounts)) {
        targets.push(parsed);
      }
    }

    // If none of the hardcoded combo routes matched a ready provider, fallback to first model of every ready provider
    if (targets.length === 0) {
      for (const p of config.providers) {
        if (isProviderReady(p, env, config.oauthAccounts) && p.models.length > 0) {
          targets.push({ provider: p, upstreamModel: p.models[0].id });
        }
      }
    }
    return targets;
  }

  // 2. If starts with `9router/` and not a combo (e.g. `9router/gemini-3.8-flash` or `9router/antigravity/gemini-3.8-flash`), strip `9router/`
  if (lower.startsWith("9router/")) {
    trimmed = trimmed.slice(8).trim();
    lower = trimmed.toLowerCase();
  }

  // 3. Check explicit `provider/model` prefix (e.g. `antigravity/claude-sonnet-4-6` or `ag/gemini-4-argon-high`)
  const direct = parseSingleRouteString(trimmed, config.providers);
  if (direct) {
    // If user specified `gemini/<model>` but provider `gemini` (AI Studio) has no API key,
    // and `antigravity` IS ready, automatically redirect `gemini/<model>` to `antigravity/<model>`!
    if (
      direct.provider.id === "gemini" &&
      !isProviderReady(direct.provider, env, config.oauthAccounts)
    ) {
      const agProvider = config.providers.find((p) => p.id === "antigravity");
      if (agProvider && isProviderReady(agProvider, env, config.oauthAccounts)) {
        return [{ provider: agProvider, upstreamModel: direct.upstreamModel }];
      }
    }

    const candidates: RouteTarget[] = [direct];
    // Do NOT push cross-model fallbacks into candidates here if dialect is antigravity,
    // because antigravity fallback is handled per-account in order!
    if (direct.provider.dialect !== "antigravity" && !isProviderReady(direct.provider, env, config.oauthAccounts)) {
      const orProvider = config.providers.find((p) => p.id === "openrouter");
      if (
        orProvider &&
        isProviderReady(orProvider, env, config.oauthAccounts) &&
        direct.provider.id !== "openrouter"
      ) {
        candidates.push({
          provider: orProvider,
          upstreamModel: `${direct.provider.id}/${direct.upstreamModel}`
        });
      }
    }
    return candidates;
  }

  // 4. Unprefixed raw model ID (e.g. `claude-sonnet-4-6`, `gemini-3.8-flash`, `gemini-2.5-pro`, `gpt-4.1`)
  const heuristicTargets: RouteTarget[] = [];

  for (const p of config.providers) {
    if (!isProviderReady(p, env, config.oauthAccounts)) continue;
    const exactModel = p.models.find((m) => m.id.toLowerCase() === lower);
    if (exactModel) {
      heuristicTargets.push({ provider: p, upstreamModel: exactModel.id });
    }
  }

  // Direct mapping to ready Antigravity provider for standard models
  if (heuristicTargets.length === 0) {
    const agProvider = config.providers.find((p) => p.dialect === "antigravity" && isProviderReady(p, env, config.oauthAccounts));
    if (agProvider) {
      if (lower.includes("argon") || lower.startsWith("gemini-4")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-4-argon" });
      } else if (lower === "gemini-3.8-flash" || lower.startsWith("gemini-3.8")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-3.8-flash" });
      } else if (lower === "gemini-2.5-pro" || lower.startsWith("gemini-2.5-pro")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-2.5-pro" });
      } else if (lower === "gemini-3-flash" || lower.startsWith("gemini-3-flash")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-3-flash" });
      } else if (lower === "gemini-2.5-flash" || lower.startsWith("gemini-2.5-flash")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-2.5-flash" });
      } else if (lower.includes("opus")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "claude-opus-5-5-high" });
        heuristicTargets.push({ provider: agProvider, upstreamModel: "claude-sonnet-5-5-high" });
      } else if (lower.includes("sonnet")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "claude-sonnet-5-5-high" });
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-3.8-flash" });
      } else if (lower.includes("gemini") || lower.includes("flash")) {
        heuristicTargets.push({ provider: agProvider, upstreamModel: "gemini-3.8-flash" });
      }
    }
  }

  // Heuristic vendor family fallback via OpenRouter if OpenRouter is configured
  const orProvider = config.providers.find((p) => p.id === "openrouter");
  if (orProvider && isProviderReady(orProvider, env, config.oauthAccounts)) {
    if (lower.startsWith("claude-")) {
      heuristicTargets.push({ provider: orProvider, upstreamModel: `anthropic/${trimmed}` });
    } else if (lower.startsWith("gemini-")) {
      heuristicTargets.push({ provider: orProvider, upstreamModel: `google/${trimmed}` });
    } else if (lower.startsWith("gpt-") || /^o[134](-|$)/.test(lower)) {
      heuristicTargets.push({ provider: orProvider, upstreamModel: `openai/${trimmed}` });
    } else if (lower.startsWith("deepseek-")) {
      heuristicTargets.push({ provider: orProvider, upstreamModel: `deepseek/${trimmed}` });
    } else if (lower.startsWith("grok-")) {
      heuristicTargets.push({ provider: orProvider, upstreamModel: `x-ai/${trimmed}` });
    } else {
      heuristicTargets.push({ provider: orProvider, upstreamModel: trimmed });
    }
  }

  return heuristicTargets;
}

async function executeCloudflareNativeAI(
  env: Env,
  upstreamModel: string,
  body: OpenAIChatRequest,
  requestedModel: string
): Promise<Response> {
  if (env.AI) {
    const aiInput: Record<string, unknown> = {
      messages: body.messages,
      stream: Boolean(body.stream)
    };
    if (body.max_tokens) aiInput.max_tokens = body.max_tokens;
    if (typeof body.temperature === "number") aiInput.temperature = body.temperature;
    if (Array.isArray(body.tools) && body.tools.length > 0) aiInput.tools = body.tools;

    const result = await env.AI.run(upstreamModel, aiInput);

    if (body.stream && result instanceof ReadableStream) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let buf = "";
      const chatId = `chatcmpl-cf-${crypto.randomUUID().slice(0, 12)}`;
      const created = Math.floor(Date.now() / 1000);

      const transformed = result.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buf += decoder.decode(chunk, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const raw of lines) {
              const l = raw.trim();
              if (!l.startsWith("data:")) continue;
              const payload = l.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.choices) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                } else if (typeof parsed.response === "string") {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        id: chatId,
                        object: "chat.completion.chunk",
                        created,
                        model: requestedModel,
                        choices: [{ index: 0, delta: { content: parsed.response }, finish_reason: null }]
                      })}\n\n`
                    )
                  );
                }
              } catch {
                // ignore malformed SSE comment
              }
            }
          },
          flush(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  id: chatId,
                  object: "chat.completion.chunk",
                  created,
                  model: requestedModel,
                  choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
                })}\n\ndata: [DONE]\n\n`
              )
            );
          }
        })
      );

      return new Response(transformed, {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache"
        }
      });
    }

    const obj = (result as Record<string, unknown>) || {};
    if (obj.choices) {
      return new Response(JSON.stringify(obj), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    const text = typeof obj.response === "string" ? obj.response : JSON.stringify(obj);
    return new Response(
      JSON.stringify({
        id: `chatcmpl-cf-${crypto.randomUUID().slice(0, 12)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: "stop"
          }
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  throw new Error("Cloudflare Workers AI binding `[ai]` is not enabled and CLOUDFLARE_ACCOUNT_ID is missing.");
}

async function callSingleUpstreamAttempt(
  target: RouteTarget,
  apiKey: string,
  body: OpenAIChatRequest,
  requestedModel: string,
  timeoutMs: number,
  env: Env
): Promise<Response> {
  const { provider, upstreamModel } = target;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("Upstream timeout"), timeoutMs);

  try {
    // 1. Cloudflare Workers AI Dialect
    if (provider.dialect === "cloudflare-ai") {
      if (env.CLOUDFLARE_ACCOUNT_ID && apiKey) {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
        const sanitized = sanitizeOpenAIPayloadForProvider(body, provider, upstreamModel);
        return await fetch(cfUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(sanitized),
          signal: controller.signal
        });
      }
      return await executeCloudflareNativeAI(env, upstreamModel, body, requestedModel);
    }

    // 2. Anthropic Native Messages Dialect
    if (provider.dialect === "anthropic") {
      const base = provider.baseUrl.replace(/\/+$/, "");
      const url = base.endsWith("/messages") ? base : `${base}/messages`;
      const anthropicBody = openAIToAnthropicRequest(body, upstreamModel);

      const upstreamRes = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          ...(provider.extraHeaders || {})
        },
        body: JSON.stringify(anthropicBody),
        signal: controller.signal
      });

      if (!upstreamRes.ok) {
        return upstreamRes;
      }

      if (body.stream && upstreamRes.body) {
        const openAIStream = anthropicStreamToOpenAIStream(upstreamRes.body, requestedModel);
        return new Response(openAIStream, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive"
          }
        });
      }

      const data = (await upstreamRes.json()) as Record<string, unknown>;
      const translated = anthropicResponseToOpenAI(data, requestedModel);
      return new Response(JSON.stringify(translated), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    // 3. OpenAI-Compatible & Google Gemini OpenAI-Compat Dialect
    const base = provider.baseUrl.replace(/\/+$/, "");
    const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    const sanitized = sanitizeOpenAIPayloadForProvider(body, provider, upstreamModel);

    return await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(provider.extraHeaders || {})
      },
      body: JSON.stringify(sanitized),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function routeChatCompletion(
  rawBody: OpenAIChatRequest,
  req: Request,
  env: Env,
  clientAuthInfo?: { name: string; masked: string },
  action = "chat"
): Promise<Response> {
  const startedAt = Date.now();
  const config = await getResolvedConfig(env);
  const rawModel = (rawBody.model || "9router/auto").trim();
  let requestedModel = rawModel;
  let variantFromModel = "";
  if (requestedModel.includes("#")) {
    const parts = requestedModel.split("#");
    requestedModel = parts[0].trim();
    variantFromModel = parts[1]?.toLowerCase().trim() || "";
  }
  const rawVariant = (rawBody as Record<string, unknown>).variant;
  const rawReasoning = (rawBody as Record<string, unknown>).reasoning_effort;
  const requestedVariantStr = variantFromModel ||
    (typeof rawVariant === "string" ? rawVariant : "") ||
    (typeof rawReasoning === "string" ? rawReasoning : "") ||
    "";
  const requestedVariant = requestedVariantStr.toLowerCase().trim();

  const sessionSeed =
    req.headers.get("x-session-id") ||
    req.headers.get("x-claude-code-session-id") ||
    String(rawBody.session_id || "");

  // Header overrides for RTK / Caveman per-request control
  const rtkHeader = req.headers.get("x-9router-rtk");
  const rtkEnabled = rtkHeader ? rtkHeader !== "false" && rtkHeader !== "0" : config.settings.rtkEnabled;

  const { request: optimizedBody, savedChars: rtkSavedChars } = applyRtkAndCaveman(rawBody, {
    rtkEnabled,
    rtkMaxToolChars: config.settings.rtkMaxToolChars,
    cavemanMode: config.settings.cavemanMode
  });
  let savedChars = rtkSavedChars;

  const candidates = resolveCandidates(requestedModel, config, env);

  if (candidates.length === 0) {
    const errMsg =
      `Tidak ada provider/akun aktif untuk model '${requestedModel}'. ` +
      `Buka Dashboard Web 9Router Anda lalu hubungkan Akun Antigravity (OAuth) atau tambahkan minimal 1 API Key.`;
    recordRequestLog({
      id: crypto.randomUUID().slice(0, 8),
      timestamp: new Date().toISOString(),
      requestedModel,
      resolvedProvider: "none",
      resolvedModel: "none",
      clientKeyName: clientAuthInfo?.name,
      clientKeyMasked: clientAuthInfo?.masked,
      action,
      status: 503,
      attempts: 0,
      latencyMs: Date.now() - startedAt,
      rtkSavedChars: savedChars,
      stream: Boolean(rawBody.stream),
      error: errMsg
    }, env);
    return new Response(
      JSON.stringify({
        error: {
          message: errMsg,
          type: "no_ready_provider",
          code: "provider_not_configured"
        }
      }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }

  let attempts = 0;
  const errors: string[] = [];
  const MAX_TOTAL_ATTEMPTS = 8;
  const attemptDeadline = startedAt + Math.max(20_000, Math.min(config.settings.timeoutMs, 60_000));

  for (const target of candidates) {
    // ========================================================================
    // A. MULTI-ACCOUNT OAUTH EXECUTION (ANTIGRAVITY AUTO-SWITCH ON 429 LIMIT!)
    // ========================================================================
    if (target.provider.dialect === "antigravity") {
      const orderedAccounts = getOrderedOAuthAccounts(config.oauthAccounts, "antigravity");
      if (orderedAccounts.length === 0) {
        errors.push("antigravity: belum ada akun OAuth Antigravity yang terhubung");
        continue;
      }

      // If user requested a Paid-tier model (e.g. gemini-4-argon-high), Free-tier accounts will return 404.
      // Filter upstream model so the preferred #1 account is called on its highest working model first!
      const upstreamModelId = resolveAntigravityUpstreamModel(
        target.upstreamModel,
        target.provider.models,
        requestedVariant
      );

      // Context guard: keep the request inside the model window. Huge sessions
      // (OpenCode compaction sends the entire history, often >1M tokens) previously
      // hit the upstream limit and came back with a useless 40-token answer.
      const ctxLimit =
        target.provider.models.find((m) => m.id.toLowerCase() === target.upstreamModel.toLowerCase())?.contextLimit ||
        target.provider.models.find((m) => m.id.toLowerCase() === upstreamModelId.toLowerCase())?.contextLimit ||
        200_000;
      const budgetChars = Math.max(240_000, Math.floor(ctxLimit * 0.7 * 4));
      let targetBody = optimizedBody;
      if (estimateBodyChars(optimizedBody) > budgetChars) {
        const fitted = fitMessagesToBudget(optimizedBody, budgetChars);
        targetBody = fitted.request;
        savedChars += fitted.trimmedChars;
      }

      // Look at token volume, not raw string length: compaction of a big session legitimately
      // takes minutes. Killing it at 45s produced truncated summaries
      // ("Compaction summary did not match the required template").
      const bodyChars = estimateBodyChars(targetBody);
      const upstreamTimeoutMs =
        bodyChars > 400_000
          ? Math.max(config.settings.timeoutMs, 240_000)
          : bodyChars > 120_000
            ? Math.max(config.settings.timeoutMs, 120_000)
            : Math.min(config.settings.timeoutMs, 60_000);

      // Model-level (not account-level) failures must not multiply into a huge retry
      // storm across every account. Keep the fallback chain to one pass per candidate.
      let fallbacksTried = false;

      for (const account of orderedAccounts) {
        if (attempts >= MAX_TOTAL_ATTEMPTS || Date.now() > attemptDeadline) break;
        try {
          // Negative cache: a model that returned 404 on this account is skipped for 30 min, so we go straight
          // to the working fallback instead of paying CPU + latency for a guaranteed-failing first attempt
          // (big contexts + doubled work was pushing the Worker over Cloudflare's resource limits -> HTTP 503).
          const deadKey = `${account.id}|${upstreamModelId}`;
          const knownDead = (deadModelCache.get(deadKey) || 0) > Date.now();
          let result: Awaited<ReturnType<typeof callAntigravityAccount>>;
          if (knownDead) {
            result = { ok: false, status: 404, errorText: "Model tidak tersedia di akun ini (cache 30 menit)" };
          } else {
            attempts += 1;
            result = await callAntigravityAccount({
              account,
              baseUrl: target.provider.baseUrl,
              upstreamModelId,
              body: targetBody,
              requestedModel,
              timeoutMs: upstreamTimeoutMs,
              env,
              sessionSeed
            });
            if (!result.ok && result.status === 404) {
              deadModelCache.set(deadKey, Date.now() + 30 * 60_000);
            }
          }

          if (result.ok && result.response) {
            markOAuthAccountSuccess(account.id);
            if (account.quotaResetAt) {
              account.quotaResetAt = undefined;
              account.lastError = undefined;
            }
            const logId = crypto.randomUUID().slice(0, 8);
            const modelKey = `${target.provider.id}/${target.upstreamModel}`;

            if (errors.length > 0) {
              console.log(`[Antigravity Failover Success] Finally succeeded with ${account.email} after previous errors: ${errors.join(" | ")}`);
            }

            recordRequestLog({
              id: logId,
              timestamp: new Date().toISOString(),
              requestedModel,
              resolvedProvider: target.provider.id,
              resolvedModel: upstreamModelId,
              clientKeyName: clientAuthInfo?.name,
              clientKeyMasked: clientAuthInfo?.masked,
              accountEmail: account.email,
              action,
              status: 200,
              attempts,
              latencyMs: Date.now() - startedAt,
              rtkSavedChars: savedChars,
              stream: Boolean(rawBody.stream),
              promptTokens: result.promptTokens || 0,
              completionTokens: result.completionTokens || 0,
              totalTokens: result.totalTokens || ((result.promptTokens || 0) + (result.completionTokens || 0))
            }, env);

            if (result.onStreamDone) {
              result.onStreamDone((u) => updateStreamTokenUsage(logId, modelKey, u, env));
            }

            const outHeaders = new Headers(result.response.headers);
            outHeaders.set("x-9router-provider", target.provider.id);
            outHeaders.set("x-9router-model", upstreamModelId);
            outHeaders.set("x-9router-account", maskEmail(account.email));
            outHeaders.set("x-9router-attempts", String(attempts));
            outHeaders.set("x-9router-rtk-saved-chars", String(savedChars));
            if (errors.length > 0) {
              outHeaders.set("x-9router-failover-errors", errors.slice(0, 3).join("; "));
            }
            if (upstreamModelId !== target.upstreamModel) {
              outHeaders.set("x-9router-tier-fallback", `${target.upstreamModel}->${upstreamModelId}`);
            } else if (candidates[0] && candidates[0].upstreamModel !== target.upstreamModel) {
              outHeaders.set("x-9router-tier-fallback", `${candidates[0].upstreamModel}->${target.upstreamModel}`);
            }

            return new Response(result.response.body, {
              status: 200,
              headers: outHeaders
            });
          }

          const errInfo = (result.errorText || `HTTP ${result.status}`).slice(0, 260);
          errors.push(`antigravity(${account.email})/${target.upstreamModel} [${result.status}]: ${errInfo}`);
          console.log(`[Antigravity Error] ${account.email} -> ${result.status}: ${errInfo}`);

          // If the account returned 404 (Paid-tier model not unlocked), 400 (not accessible),
          // 503 (server capacity exhausted for this model), or 429 capacity error,
          // fallback THIS SAME ACCOUNT to its verified working models!
          const isCapacityOrModelError =
            result.status === 404 ||
            result.status === 400 ||
            result.status === 503 ||
            (result.status === 429 && errInfo.toLowerCase().includes("capacity"));

          if (isCapacityOrModelError && !fallbacksTried) {
            fallbacksTried = true;

            // Normalize + dedupe: retired IDs (claude-sonnet-4-6, opus-4-6, ...) must go
            // through the alias map, otherwise Google answers with
            // "Claude Sonnet 4.6 is no longer available. Please switch to Claude Sonnet 5.5."
            const triedModels = new Set<string>([upstreamModelId.toLowerCase()]);
            const accountFallbacks: string[] = [];
            for (const rawFb of getAntigravityTierFallbacks(target.upstreamModel)) {
              const normalized = resolveAntigravityUpstreamModel(rawFb, target.provider.models, requestedVariant);
              const key = normalized.toLowerCase();
              if (!normalized || triedModels.has(key)) continue;
              triedModels.add(key);
              accountFallbacks.push(normalized);
            }

            for (const directModel of accountFallbacks) {
              if (attempts >= MAX_TOTAL_ATTEMPTS || Date.now() > attemptDeadline) break;
              try {
                attempts += 1;
                const fbResult = await callAntigravityAccount({
                  account,
                  baseUrl: target.provider.baseUrl,
                  upstreamModelId: directModel,
                  body: targetBody,
                  requestedModel,
                  timeoutMs: upstreamTimeoutMs,
                  env,
                  sessionSeed
                });
                if (fbResult.ok && fbResult.response) {
                  // Deprecation notices are already converted to ok:false by the provider.
                  markOAuthAccountSuccess(account.id);
                  const logId = crypto.randomUUID().slice(0, 8);
                  const modelKey = `${target.provider.id}/${directModel}`;

                  recordRequestLog({
                    id: logId,
                    timestamp: new Date().toISOString(),
                    requestedModel,
                    resolvedProvider: target.provider.id,
                    resolvedModel: directModel,
                    clientKeyName: clientAuthInfo?.name,
                    clientKeyMasked: clientAuthInfo?.masked,
                    accountEmail: account.email,
                    action,
                    status: 200,
                    attempts,
                    latencyMs: Date.now() - startedAt,
                    rtkSavedChars: savedChars,
                    stream: Boolean(rawBody.stream),
                    promptTokens: fbResult.promptTokens || 0,
                    completionTokens: fbResult.completionTokens || 0,
                    totalTokens: fbResult.totalTokens || ((fbResult.promptTokens || 0) + (fbResult.completionTokens || 0))
                  }, env);

                  if (fbResult.onStreamDone) {
                    fbResult.onStreamDone((u) => updateStreamTokenUsage(logId, modelKey, u, env));
                  }

                  const outHeaders = new Headers(fbResult.response.headers);
                  outHeaders.set("x-9router-provider", target.provider.id);
                  outHeaders.set("x-9router-model", directModel);
                  outHeaders.set("x-9router-account", maskEmail(account.email));
                  outHeaders.set("x-9router-attempts", String(attempts));
                  outHeaders.set("x-9router-rtk-saved-chars", String(savedChars));
                  outHeaders.set("x-9router-tier-fallback", `${target.upstreamModel}->${directModel}`);
                  if (errors.length > 0) {
                    outHeaders.set("x-9router-failover-errors", errors.slice(0, 3).join("; "));
                  }

                  return new Response(fbResult.response.body, {
                    status: 200,
                    headers: outHeaders
                  });
                }
                errors.push(`antigravity(${account.email})/${directModel} [${fbResult.status}]: ${fbResult.errorText || fbResult.status}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`antigravity(${account.email})/${directModel} [network]: ${msg}`);
              }
            }

            // Every fallback model for this candidate failed on this account: treat it as
            // a model-level dead end and move to the next candidate instead of burning the
            // same chain on the remaining accounts (that produced "15 percobaan" failures).
            break;
          }

          // Model-capacity errors (503, 429 "capacity") are Google-side for that model, NOT the account's fault.
          // Do not cool the account down (that would reshuffle the user's priority order) — just try the next account.
          if (result.status === 503 || (result.status === 429 && errInfo.toLowerCase().includes("capacity"))) {
            continue;
          }

          // Put rate-limited / errored account on cooldown so traffic switches immediately to next account!
          if (RETRYABLE_STATUSES.has(result.status)) {
            markOAuthAccountCooldown(
              account.id,
              result.resetAtMs || Date.now() + 15_000,
              `[${result.status}] ${errInfo}`,
              env
            );
            continue;
          }

          // Non-retryable 400/404 error when only 1 candidate & 1 account exists
          if (candidates.length === 1 && orderedAccounts.length === 1) {
            const friendlyMsg =
              result.status === 404
                ? `Model '${target.upstreamModel}' tidak tersedia di tier akun Google Antigravity '${account.email}'. Gunakan '9router/auto', 'antigravity/claude-sonnet-5-5-high', 'antigravity/claude-opus-5-5-high', atau 'antigravity/gemini-3.8-flash-high'. (${errInfo})`
                : errInfo;
            recordRequestLog({
              id: crypto.randomUUID().slice(0, 8),
              timestamp: new Date().toISOString(),
              requestedModel,
              resolvedProvider: target.provider.id,
              resolvedModel: target.upstreamModel,
              clientKeyName: clientAuthInfo?.name,
              clientKeyMasked: clientAuthInfo?.masked,
              accountEmail: account.email,
              action,
              status: result.status,
              attempts,
              latencyMs: Date.now() - startedAt,
              rtkSavedChars: savedChars,
              stream: Boolean(rawBody.stream),
              error: friendlyMsg.slice(0, 220)
            }, env);
            return new Response(
              JSON.stringify({
                error: {
                  message: friendlyMsg,
                  type: "upstream_invalid_request",
                  code: String(result.status)
                }
              }),
              { status: result.status, headers: { "content-type": "application/json" } }
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`antigravity(${account.email})/${target.upstreamModel} [network]: ${msg}`);
          markOAuthAccountCooldown(account.id, Date.now() + 15_000, msg, env);
        }
      }

      continue;
    }

    // ========================================================================
    // B. MULTI-ACCOUNT CLAUDE.AI OAUTH EXECUTION (CLAUDE WEB / PRO SUBSCRIPTION)
    // ========================================================================
    if (target.provider.dialect === "anthropic") {
      const claudeAccounts = getOrderedOAuthAccounts(config.oauthAccounts, "claude");
      if (claudeAccounts.length > 0) {
        for (const account of claudeAccounts) {
          attempts += 1;
          try {
            const result = await callClaudeOAuthAccount({
              account,
              upstreamModel: target.upstreamModel,
              body: optimizedBody,
              requestedModel,
              timeoutMs: Math.min(config.settings.timeoutMs, 45_000),
              env
            });

            if (result.ok && result.response) {
              markOAuthAccountSuccess(account.id);
              const logId = crypto.randomUUID().slice(0, 8);

              let claudePromptTokens = 0;
              let claudeCompletionTokens = 0;
              let claudeTotalTokens = 0;
              if (!rawBody.stream) {
                try {
                  const cloned = result.response.clone();
                  const json = (await cloned.json()) as Record<string, unknown>;
                  const usage = (json.usage as Record<string, number>) || {};
                  claudePromptTokens = usage.input_tokens || usage.prompt_tokens || 0;
                  claudeCompletionTokens = usage.output_tokens || usage.completion_tokens || 0;
                  claudeTotalTokens = claudePromptTokens + claudeCompletionTokens;
                } catch {
                  // ignore non-json
                }
              }

              recordRequestLog({
                id: logId,
                timestamp: new Date().toISOString(),
                requestedModel,
                resolvedProvider: target.provider.id,
                resolvedModel: target.upstreamModel,
                clientKeyName: clientAuthInfo?.name,
                clientKeyMasked: clientAuthInfo?.masked,
                accountEmail: account.email,
                action,
                status: 200,
                attempts,
                latencyMs: Date.now() - startedAt,
                rtkSavedChars: savedChars,
                stream: Boolean(rawBody.stream),
                promptTokens: claudePromptTokens,
                completionTokens: claudeCompletionTokens,
                totalTokens: claudeTotalTokens
              }, env);

              const outHeaders = new Headers(result.response.headers);
              outHeaders.set("x-9router-provider", "claude-oauth");
              outHeaders.set("x-9router-model", target.upstreamModel);
              outHeaders.set("x-9router-account", maskEmail(account.email));
              outHeaders.set("x-9router-attempts", String(attempts));
              outHeaders.set("x-9router-rtk-saved-chars", String(savedChars));

              const claudeOutBody =
                rawBody.stream && result.response.body
                  ? wrapStreamWithUsage(
                      result.response.body,
                      logId,
                      `${target.provider.id}/${target.upstreamModel}`,
                      estimatePromptTokens(optimizedBody),
                      env
                    )
                  : result.response.body;

              return new Response(claudeOutBody, {
                status: 200,
                headers: outHeaders
              });
            }

            const errInfo = (result.errorText || `HTTP ${result.status}`).slice(0, 260);
            errors.push(`claude-oauth(${account.email})/${target.upstreamModel} [${result.status}]: ${errInfo}`);

            if (RETRYABLE_STATUSES.has(result.status)) {
              markOAuthAccountCooldown(
                account.id,
                result.resetAtMs || Date.now() + 60_000,
                `[${result.status}] ${errInfo}`,
                env
              );
              continue;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`claude-oauth(${account.email})/${target.upstreamModel} [network]: ${msg}`);
            markOAuthAccountCooldown(account.id, Date.now() + 15_000, msg, env);
          }
        }
      }
    }

    // ========================================================================
    // C. STANDARD API-KEY / CLOUDFLARE EXECUTION
    // ========================================================================
    const orderedKeys =
      target.provider.dialect === "cloudflare-ai" && target.provider.apiKeys.length === 0
        ? [String(env.CLOUDFLARE_API_TOKEN || "binding")]
        : getOrderedApiKeys(target.provider);

    if (orderedKeys.length === 0) {
      errors.push(`${target.provider.id}: API key belum diisi`);
      continue;
    }

    // Try all configured keys for this provider (up to 10) before cascading to next fallback provider
    const maxKeysToTry = Math.min(orderedKeys.length, 10);
    for (let kIdx = 0; kIdx < maxKeysToTry; kIdx++) {
      const key = orderedKeys[kIdx];
      attempts += 1;

      try {
        const res = await callSingleUpstreamAttempt(
          target,
          key,
          optimizedBody,
          requestedModel,
          config.settings.timeoutMs,
          env
        );

        if (res.ok) {
          let promptTokens = 0;
          let completionTokens = 0;
          let totalTokens = 0;
          let responseToSend = res;

          if (!rawBody.stream) {
            try {
              const resCloned = res.clone();
              const json = (await resCloned.json()) as Record<string, unknown>;
              const usage = (json.usage as Record<string, number>) || {};
              promptTokens = usage.prompt_tokens || 0;
              completionTokens = usage.completion_tokens || 0;
              totalTokens = usage.total_tokens || (promptTokens + completionTokens);
            } catch {
              // ignore non-json
            }
          }

          const upKeyMasked = maskKey(key);
          const logId = crypto.randomUUID().slice(0, 8);
          recordRequestLog({
            id: logId,
            timestamp: new Date().toISOString(),
            requestedModel,
            resolvedProvider: target.provider.id,
            resolvedModel: target.upstreamModel,
            clientKeyName: clientAuthInfo?.name,
            clientKeyMasked: clientAuthInfo?.masked,
            upstreamKeyMasked: upKeyMasked,
            action,
            status: res.status,
            attempts,
            latencyMs: Date.now() - startedAt,
            rtkSavedChars: savedChars,
            stream: Boolean(rawBody.stream),
            promptTokens,
            completionTokens,
            totalTokens
          }, env);

          const outHeaders = new Headers(res.headers);
          outHeaders.set("x-9router-provider", target.provider.id);
          outHeaders.set("x-9router-model", target.upstreamModel);
          outHeaders.set("x-9router-attempts", String(attempts));
          outHeaders.set("x-9router-rtk-saved-chars", String(savedChars));

          if (rawBody.stream) {
            outHeaders.set("content-type", "text/event-stream; charset=utf-8");
            outHeaders.set("cache-control", "no-cache, no-transform");
          } else {
            outHeaders.set("content-type", "application/json; charset=utf-8");
          }

          const outBody =
            rawBody.stream && res.body
              ? wrapStreamWithUsage(
                  res.body,
                  logId,
                  `${target.provider.id}/${target.upstreamModel}`,
                  estimatePromptTokens(optimizedBody),
                  env
                )
              : res.body;

          return new Response(outBody, {
            status: res.status,
            headers: outHeaders
          });
        }

        const errText = (await res.text()).slice(0, 400);
        errors.push(`${target.provider.id}/${target.upstreamModel} [${res.status}]: ${errText}`);

        if (res.status === 429 || res.status === 402) {
          markKeyCooldown(target.provider.id, key, 60_000);
        } else if (res.status === 401 || res.status === 403) {
          markKeyCooldown(target.provider.id, key, 300_000);
        }

        if (!RETRYABLE_STATUSES.has(res.status) && candidates.length === 1 && maxKeysToTry === 1) {
          recordRequestLog({
            id: crypto.randomUUID().slice(0, 8),
            timestamp: new Date().toISOString(),
            requestedModel,
            resolvedProvider: target.provider.id,
            resolvedModel: target.upstreamModel,
            clientKeyName: clientAuthInfo?.name,
            clientKeyMasked: clientAuthInfo?.masked,
            upstreamKeyMasked: maskKey(key),
            action,
            status: res.status,
            attempts,
            latencyMs: Date.now() - startedAt,
            rtkSavedChars: savedChars,
            stream: Boolean(rawBody.stream),
            error: errText.slice(0, 180)
          }, env);
          return new Response(errText, {
            status: res.status,
            headers: { "content-type": "application/json" }
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${target.provider.id}/${target.upstreamModel} [network]: ${msg}`);
      }
    }
  }

  const summary = errors.slice(0, 8).join(" | ");
  const hasQuotaOrCapacity = errors.some(
    (e) => e.includes("[429]") || e.includes("[503]") || /quota|capacity/i.test(e)
  );
  recordRequestLog({
    id: crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    requestedModel,
    resolvedProvider: "failed",
    resolvedModel: "failed",
    clientKeyName: clientAuthInfo?.name,
    clientKeyMasked: clientAuthInfo?.masked,
    action,
    status: 502,
    attempts,
    latencyMs: Date.now() - startedAt,
    rtkSavedChars: savedChars,
    stream: Boolean(rawBody.stream),
    error: summary.slice(0, 220)
  }, env);

  return new Response(
    JSON.stringify({
      error: {
        message:
          `Semua akun/rute gagal setelah ${attempts} percobaan. ` +
          (hasQuotaOrCapacity
            ? "Kuota akun atau kapasitas model upstream sedang penuh — coba model lain sebentar lagi. "
            : "") +
          `Detail: ${summary}`,
        type: "all_routes_failed",
        code: "upstream_exhausted",
        attempts
      }
    }),
    {
      status: 502,
      headers: {
        "content-type": "application/json",
        // Ask the client to back off instead of hammering with instant retries.
        "retry-after": "15"
      }
    }
  );
}

export async function buildModelsResponse(env: Env, includeAll = false): Promise<Record<string, unknown>> {
  const config = await getResolvedConfig(env);
  const created = 1735689600;
  const data: Array<Record<string, unknown>> = [];
  const addedIds = new Set<string>();

  const addModel = (id: string, name: string, ownedBy: string, ctx: number, out: number) => {
    if (addedIds.has(id)) return;
    addedIds.add(id);
    data.push({
      id,
      object: "model",
      created,
      owned_by: ownedBy,
      name,
      context_length: ctx,
      max_completion_tokens: out
    });
  };

  // 1. Expose Main Combos
  const mainComboIds = new Set(["9router/auto", "9router/coding"]);
  for (const combo of config.combos) {
    if (!includeAll && !mainComboIds.has(combo.id)) continue;
    addModel(combo.id, combo.name, "9router-combo", combo.contextLimit, combo.outputLimit);
    if (combo.id.startsWith("9router/")) {
      addModel(combo.id.slice(8), combo.name, "9router-combo", combo.contextLimit, combo.outputLimit);
    }
  }

  // 2. Expose models ONLY from Ready providers
  for (const provider of config.providers) {
    if (!provider.enabled) continue;
    if (provider.dialect === "cloudflare-ai" && !includeAll && provider.apiKeys.length === 0) {
      continue;
    }
    const ready = isProviderReady(provider, env, config.oauthAccounts);
    if (!includeAll && !ready) continue;

    for (const m of provider.models) {
      const mLower = m.id.toLowerCase();
      if (!includeAll && (mLower.endsWith("-low") || mLower.endsWith("-medium"))) {
        if (!mLower.startsWith("gpt-oss")) continue;
      }

      addModel(`${provider.id}/${m.id}`, m.name, provider.id, m.contextLimit, m.outputLimit);

      // If provider is antigravity, also expose clean base model ID
      if (provider.dialect === "antigravity") {
        addModel(m.id, m.name, provider.id, m.contextLimit, m.outputLimit);
        if (m.id === "gemini-3.8-flash-high") {
          addModel("gemini-3.8-flash", "Gemini 3.8 Flash", provider.id, m.contextLimit, m.outputLimit);
        }
        if (m.id === "gemini-4-argon-high") {
          addModel("gemini-4-argon", "Gemini 4 Argon", provider.id, m.contextLimit, m.outputLimit);
        }
        if (m.id === "claude-sonnet-5-5-high") {
          addModel("claude-sonnet-5-5", "Claude Sonnet 5.5", provider.id, m.contextLimit, m.outputLimit);
        }
        if (m.id === "claude-opus-5-5-high") {
          addModel("claude-opus-5-5", "Claude Opus 5.5", provider.id, m.contextLimit, m.outputLimit);
        }
      }
    }
  }

  return {
    object: "list",
    data
  };
}
