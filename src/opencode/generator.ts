import { Env } from "../types";
import { getResolvedConfig, isProviderReady } from "../config/store";

export async function generateOpenCodeConfig(
  originUrl: string,
  env: Env,
  includeAllCatalog = false
): Promise<Record<string, unknown>> {
  const config = await getResolvedConfig(env);
  const cleanOrigin = originUrl.replace(/\/+$/, "");
  const baseURL = `${cleanOrigin}/v1`;

  const activeClientKey =
    config.clientKeys.find((k) => k.enabled)?.key || "sk-9r-opencode-default";

  const modelsMap: Record<string, Record<string, unknown>> = {};

  const agProvider = config.providers.find((p) => p.dialect === "antigravity");
  const agReady = agProvider ? isProviderReady(agProvider, env, config.oauthAccounts) : false;

  // 1. Antigravity Models with Clean Base Names (Default: Medium, supports Low / Medium / High in OpenCode UI)
  if (agReady || includeAllCatalog) {
    modelsMap["gemini-4-argon"] = {
      name: "Gemini 4 Argon (1M)",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 1000000, output: 64000 }
    };
    modelsMap["gemini-3.8-flash"] = {
      name: "Gemini 3.8 Flash (1M)",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 1000000, output: 64000 }
    };
    modelsMap["claude-sonnet-5-5"] = {
      name: "Claude Sonnet 5.5",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 200000, output: 64000 }
    };
    modelsMap["claude-opus-5-5"] = {
      name: "Claude Opus 5.5",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 200000, output: 64000 }
    };
    modelsMap["gemini-2.5-pro"] = {
      name: "Gemini 2.5 Pro",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 1000000, output: 64000 }
    };
    modelsMap["gemini-3-flash"] = {
      name: "Gemini 3 Flash",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 1000000, output: 64000 }
    };
    modelsMap["gemini-2.5-flash"] = {
      name: "Gemini 2.5 Flash",
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 1000000, output: 64000 }
    };
  }

  // 2. Smart Multi-Account Pool Auto Fallback
  modelsMap["auto"] = {
    name: "9Router Auto",
    modalities: { input: ["text", "image"], output: ["text"] },
    limit: { context: 1000000, output: 64000 }
  };

  // 3. Other ready providers (e.g. OpenAI, Anthropic, Groq, DeepSeek)
  for (const provider of config.providers) {
    if (!provider.enabled || provider.dialect === "antigravity") continue;
    if (provider.dialect === "cloudflare-ai" && !includeAllCatalog && provider.apiKeys.length === 0) continue;
    const ready = isProviderReady(provider, env, config.oauthAccounts);
    if (!includeAllCatalog && !ready) continue;

    for (const m of provider.models) {
      const mLower = m.id.toLowerCase();
      if (!includeAllCatalog && (mLower.endsWith("-low") || mLower.endsWith("-medium"))) {
        if (!mLower.startsWith("gpt-oss")) continue;
      }
      const fullId = `${provider.id}/${m.id}`;
      modelsMap[fullId] = {
        name: `${m.name}`,
        ...(m.vision ? { modalities: { input: ["text", "image"], output: ["text"] } } : {}),
        limit: {
          context: m.contextLimit,
          output: m.outputLimit
        }
      };
    }
  }

  const defaultModel = modelsMap["gemini-4-argon"]
    ? "9router/gemini-4-argon#medium"
    : modelsMap["gemini-3.8-flash"]
      ? "9router/gemini-3.8-flash#medium"
      : "9router/auto#medium";

  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      "9router": {
        npm: "@ai-sdk/openai-compatible",
        name: "9Router Edge (Gemini + Antigravity)",
        options: {
          baseURL,
          apiKey: activeClientKey
        },
        models: modelsMap
      }
    },
    model: defaultModel
  };
}
