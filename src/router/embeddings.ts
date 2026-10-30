import { Env } from "../types";
import { getOrderedApiKeys, getResolvedConfig, isProviderReady } from "../config/store";

export async function routeEmbeddings(
  body: Record<string, unknown>,
  env: Env
): Promise<Response> {
  const config = await getResolvedConfig(env);
  const requested = String(body.model || "openai/text-embedding-3-small").trim();

  let providerId = "openai";
  let upstreamModel = requested;

  const slashIdx = requested.indexOf("/");
  if (slashIdx > 0) {
    providerId = requested.slice(0, slashIdx);
    upstreamModel = requested.slice(slashIdx + 1);
  }

  const candidates = config.providers.filter(
    (p) =>
      isProviderReady(p, env) &&
      p.dialect !== "anthropic" &&
      (p.id === providerId || p.aliases.includes(providerId) || ["openai", "gemini", "openrouter", "mistral", "nvidia", "together", "fireworks"].includes(p.id))
  );

  // Prioritize exact requested provider first
  candidates.sort((a, b) => {
    const aMatch = a.id === providerId || a.aliases.includes(providerId) ? 0 : 1;
    const bMatch = b.id === providerId || b.aliases.includes(providerId) ? 0 : 1;
    return aMatch - bMatch;
  });

  for (const p of candidates) {
    const keys = getOrderedApiKeys(p);
    if (keys.length === 0) continue;

    const modelToUse =
      p.id === providerId || p.aliases.includes(providerId)
        ? upstreamModel
        : p.id === "gemini"
          ? "text-embedding-004"
          : "text-embedding-3-small";

    const url = `${p.baseUrl.replace(/\/+$/, "")}/embeddings`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${keys[0]}`,
          ...(p.extraHeaders || {})
        },
        body: JSON.stringify({ ...body, model: modelToUse })
      });
      if (res.ok) {
        return new Response(res.body, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-9router-provider": p.id
          }
        });
      }
    } catch {
      // try next candidate
    }
  }

  return new Response(
    JSON.stringify({
      error: {
        message: "Tidak ada provider embeddings aktif yang berhasil memproses request.",
        type: "embeddings_unavailable"
      }
    }),
    { status: 503, headers: { "content-type": "application/json" } }
  );
}
