import { ComboConfig, ProviderConfig } from "../types";

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  // =========================================================================
  // TIER 1: FLAGSHIP / SUBSCRIPTION CODING MODELS (OAUTH & API)
  // =========================================================================
  {
    id: "antigravity",
    aliases: ["ag"],
    name: "Google Antigravity (Multi-Akun OAuth)",
    tier: "tier1-flagship",
    dialect: "antigravity",
    baseUrl: "https://daily-cloudcode-pa.googleapis.com",
    enabled: true,
    apiKeys: [],
    notes: "Hubungkan banyak akun Google/Antigravity di tab 'Akun Antigravity'. Otomatis rotasi & pindah akun instan saat 1 akun kena limit kuota (429)!",
    models: [
      { id: "gemini-4-argon", name: "Gemini 4 Argon (Next-Gen Flagship Reasoning)", upstreamModelId: "gemini-4-argon-high", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "gemini-4-argon-high", name: "Gemini 4 Argon High", upstreamModelId: "gemini-4-argon-high", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", upstreamModelId: "gemini-3.8-flash-high", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", upstreamModelId: "gemini-2.5-pro", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-3-flash", name: "Gemini 3 Flash", upstreamModelId: "gemini-3-flash", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", upstreamModelId: "gemini-2.5-flash", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", upstreamModelId: "claude-sonnet-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-sonnet-5-5-high", name: "Claude Sonnet 5.5 High", upstreamModelId: "claude-sonnet-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-opus-5-5", name: "Claude Opus 5.5", upstreamModelId: "claude-opus-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-opus-5-5-high", name: "Claude Opus 5.5 High", upstreamModelId: "claude-opus-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet (Auto Sonnet 5.5)", upstreamModelId: "claude-sonnet-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "claude-opus-4-6", name: "Claude Opus (Auto Opus 5.5)", upstreamModelId: "claude-opus-5-5-high", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash High", upstreamModelId: "gemini-3.8-flash-high", contextLimit: 1000000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B", upstreamModelId: "gpt-oss-120b-medium", contextLimit: 128000, outputLimit: 32768, toolCall: true, reasoning: true, free: true }
    ]
  },
  {
    id: "anthropic",
    aliases: ["cc", "claude"],
    name: "Anthropic Claude",
    tier: "tier1-flagship",
    dialect: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    envKey: "ANTHROPIC_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Native Anthropic Messages API dengan translator otomatis ke format OpenAI & OpenCode.",
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", contextLimit: 200000, outputLimit: 32000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", contextLimit: 200000, outputLimit: 8192, toolCall: true, vision: true }
    ]
  },
  {
    id: "openai",
    aliases: ["oa", "codex"],
    name: "OpenAI",
    tier: "tier1-flagship",
    dialect: "openai",
    baseUrl: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Model flagship GPT & seri reasoning o-series untuk AI Coding Agent.",
    models: [
      { id: "gpt-4.1", name: "GPT-4.1", contextLimit: 1000000, outputLimit: 32768, toolCall: true, vision: true },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextLimit: 1000000, outputLimit: 32768, toolCall: true, vision: true },
      { id: "o4-mini", name: "OpenAI o4-mini (Reasoning)", contextLimit: 200000, outputLimit: 100000, toolCall: true, reasoning: true, vision: true },
      { id: "o3", name: "OpenAI o3 (Reasoning)", contextLimit: 200000, outputLimit: 100000, toolCall: true, reasoning: true, vision: true },
      { id: "gpt-4o", name: "GPT-4o", contextLimit: 128000, outputLimit: 16384, toolCall: true, vision: true }
    ]
  },
  {
    id: "xai",
    aliases: ["grok"],
    name: "xAI Grok",
    tier: "tier1-flagship",
    dialect: "openai",
    baseUrl: "https://api.x.ai/v1",
    envKey: "XAI_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Grok Code Fast & Grok 4 dengan dukungan tool-calling cepat.",
    models: [
      { id: "grok-code-fast-1", name: "Grok Code Fast 1", contextLimit: 256000, outputLimit: 32768, toolCall: true, reasoning: true },
      { id: "grok-4", name: "Grok 4", contextLimit: 256000, outputLimit: 32768, toolCall: true, reasoning: true, vision: true },
      { id: "grok-3-mini", name: "Grok 3 Mini", contextLimit: 131072, outputLimit: 16384, toolCall: true, reasoning: true }
    ]
  },

  // =========================================================================
  // TIER 2: CHEAP / HIGH-VALUE CODING PROVIDERS
  // =========================================================================
  {
    id: "deepseek",
    aliases: ["ds"],
    name: "DeepSeek",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    envKey: "DEEPSEEK_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Sangat hemat & tajam untuk coding dan arsitektur agen (V3 & R1).",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3 (Chat/Coding)", contextLimit: 128000, outputLimit: 8192, toolCall: true },
      { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoner)", contextLimit: 128000, outputLimit: 32768, toolCall: true, reasoning: true }
    ]
  },
  {
    id: "glm",
    aliases: ["zhipu", "zai"],
    name: "GLM / Z.AI Coding",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.z.ai/api/paas/v4",
    envKey: "GLM_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "GLM Coding (termasuk GLM-4.5-Flash gratis & GLM-4.7 murah untuk agent).",
    models: [
      { id: "glm-4.7", name: "GLM-4.7 Coding", contextLimit: 200000, outputLimit: 32768, toolCall: true, reasoning: true },
      { id: "glm-4.5", name: "GLM-4.5", contextLimit: 128000, outputLimit: 16384, toolCall: true, reasoning: true },
      { id: "glm-4.5-flash", name: "GLM-4.5 Flash (FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true }
    ]
  },
  {
    id: "kimi",
    aliases: ["moonshot"],
    name: "Kimi (Moonshot AI)",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.moonshot.ai/v1",
    envKey: "KIMI_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Kimi K2 yang sangat kuat untuk agentic tool-use & long context.",
    models: [
      { id: "kimi-k2-0905-preview", name: "Kimi K2 Coding", contextLimit: 256000, outputLimit: 32768, toolCall: true },
      { id: "kimi-k2-thinking", name: "Kimi K2 Thinking", contextLimit: 256000, outputLimit: 32768, toolCall: true, reasoning: true }
    ]
  },
  {
    id: "minimax",
    aliases: ["mm"],
    name: "MiniMax",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.minimax.io/v1",
    envKey: "MINIMAX_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "MiniMax M2 / M2.5 direkomendasikan resmi oleh OpenCode untuk coding hemat.",
    models: [
      { id: "MiniMax-M2.5", name: "MiniMax M2.5", contextLimit: 200000, outputLimit: 32768, toolCall: true, reasoning: true },
      { id: "MiniMax-M2", name: "MiniMax M2", contextLimit: 200000, outputLimit: 32768, toolCall: true }
    ]
  },
  {
    id: "mistral",
    aliases: ["codestral"],
    name: "Mistral & Codestral",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    envKey: "MISTRAL_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Devstral & Codestral dirancang khusus untuk software engineering agent.",
    models: [
      { id: "devstral-medium-latest", name: "Devstral Medium (Agentic Coding)", contextLimit: 128000, outputLimit: 32768, toolCall: true },
      { id: "codestral-latest", name: "Codestral Latest", contextLimit: 256000, outputLimit: 32768, toolCall: true },
      { id: "mistral-large-latest", name: "Mistral Large", contextLimit: 128000, outputLimit: 16384, toolCall: true }
    ]
  },
  {
    id: "together",
    aliases: ["tg"],
    name: "Together AI",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.together.xyz/v1",
    envKey: "TOGETHER_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Koleksi model open-weights berkecepatan tinggi.",
    models: [
      { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8", name: "Qwen3 Coder 480B (Together)", contextLimit: 256000, outputLimit: 32768, toolCall: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3 (Together)", contextLimit: 128000, outputLimit: 16384, toolCall: true }
    ]
  },
  {
    id: "fireworks",
    aliases: ["fw"],
    name: "Fireworks AI",
    tier: "tier2-cheap",
    dialect: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    envKey: "FIREWORKS_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Inferensi ultra cepat untuk Qwen, DeepSeek, dan Kimi.",
    models: [
      { id: "accounts/fireworks/models/qwen3-coder-480b-a35b-instruct", name: "Qwen3 Coder 480B (Fireworks)", contextLimit: 256000, outputLimit: 32768, toolCall: true },
      { id: "accounts/fireworks/models/kimi-k2-instruct", name: "Kimi K2 (Fireworks)", contextLimit: 128000, outputLimit: 16384, toolCall: true }
    ]
  },

  // =========================================================================
  // TIER 3: FREE & UNIVERSAL AGGREGATORS (ZERO COST FALLBACK!)
  // =========================================================================
  {
    id: "gemini",
    aliases: ["google", "gm"],
    name: "Google Gemini (AI Studio)",
    tier: "tier3-free",
    dialect: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKey: "GEMINI_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Gratis API key dari Google AI Studio! Bisa masukkan banyak API key untuk rotasi kuota gratis.",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextLimit: 1000000, outputLimit: 65536, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (FREE Tier)", contextLimit: 1000000, outputLimit: 65536, toolCall: true, reasoning: true, vision: true, free: true },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (FREE Fast)", contextLimit: 1000000, outputLimit: 65536, toolCall: true, vision: true, free: true }
    ]
  },
  {
    id: "openrouter",
    aliases: ["or"],
    name: "OpenRouter (300+ Models & Free Tier)",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    enabled: true,
    apiKeys: [],
    extraHeaders: {
      "HTTP-Referer": "https://9router.cloudflare.workers.dev",
      "X-Title": "9Router Edge AI Agent"
    },
    notes: "Akses 300+ model dengan 1 API key, termasuk puluhan model `:free`!",
    models: [
      { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder (OpenRouter FREE)", contextLimit: 128000, outputLimit: 32768, toolCall: true, free: true },
      { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3 (OpenRouter FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (OpenRouter FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, reasoning: true, free: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (OpenRouter FREE)", contextLimit: 128000, outputLimit: 8192, toolCall: true, free: true },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (OpenRouter)", contextLimit: 1000000, outputLimit: 65536, toolCall: true, reasoning: true, vision: true },
      { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5 (OpenRouter)", contextLimit: 200000, outputLimit: 64000, toolCall: true, reasoning: true, vision: true },
      { id: "openrouter/auto", name: "OpenRouter Auto Router", contextLimit: 200000, outputLimit: 32768, toolCall: true }
    ]
  },
  {
    id: "groq",
    aliases: ["gq"],
    name: "Groq Cloud (Free & LPU Ultra-Fast)",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Free tier sangat cepat untuk Llama 3.3, Kimi K2, dan Qwen.",
    models: [
      { id: "moonshotai/kimi-k2-instruct", name: "Kimi K2 Instruct (Groq)", contextLimit: 131072, outputLimit: 16384, toolCall: true, free: true },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (Groq FREE)", contextLimit: 128000, outputLimit: 32768, toolCall: true, free: true },
      { id: "qwen/qwen3-32b", name: "Qwen3 32B (Groq FREE)", contextLimit: 128000, outputLimit: 32768, toolCall: true, reasoning: true, free: true },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B (Groq FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, reasoning: true, free: true }
    ]
  },
  {
    id: "cerebras",
    aliases: ["cb"],
    name: "Cerebras Inference (Free & 2000+ tok/s)",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    envKey: "CEREBRAS_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Kecepatan ekstrem >2.000 token/detik dengan kuota harian gratis.",
    models: [
      { id: "qwen-3-coder-480b", name: "Qwen3 Coder 480B (Cerebras)", contextLimit: 128000, outputLimit: 32768, toolCall: true, free: true },
      { id: "qwen-3-32b", name: "Qwen3 32B (Cerebras FREE)", contextLimit: 128000, outputLimit: 32768, toolCall: true, reasoning: true, free: true },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B (Cerebras FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true }
    ]
  },
  {
    id: "nvidia",
    aliases: ["nim", "nv"],
    name: "NVIDIA NIM",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    envKey: "NVIDIA_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Free developer credits dari build.nvidia.com untuk model besar.",
    models: [
      { id: "qwen/qwen3-235b-a22b", name: "Qwen3 235B (NVIDIA NIM)", contextLimit: 128000, outputLimit: 16384, toolCall: true, reasoning: true, free: true },
      { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1 (NVIDIA NIM)", contextLimit: 128000, outputLimit: 16384, toolCall: true, reasoning: true, free: true },
      { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B (NVIDIA NIM)", contextLimit: 128000, outputLimit: 8192, toolCall: true, free: true }
    ]
  },
  {
    id: "github",
    aliases: ["gh"],
    name: "GitHub Models (Free via GitHub PAT)",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://models.inference.ai.azure.com",
    envKey: "GITHUB_TOKEN",
    enabled: true,
    apiKeys: [],
    notes: "Gratis menggunakan Personal Access Token (PAT) akun GitHub Anda.",
    models: [
      { id: "gpt-4.1", name: "GPT-4.1 (GitHub Models FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, vision: true, free: true },
      { id: "gpt-4o", name: "GPT-4o (GitHub Models FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, vision: true, free: true },
      { id: "Codestral-2501", name: "Codestral 2501 (GitHub Models FREE)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true }
    ]
  },
  {
    id: "opencode-zen",
    aliases: ["oc", "opencode"],
    name: "OpenCode Zen",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://opencode.ai/zen/v1",
    envKey: "OPENCODE_API_KEY",
    enabled: true,
    apiKeys: [],
    notes: "Upstream resmi OpenCode Zen untuk model gratis/berbayar dari ekosistem OpenCode.",
    models: [
      { id: "big-pickle", name: "OpenCode Big Pickle (Free Promo)", contextLimit: 128000, outputLimit: 32768, toolCall: true, free: true },
      { id: "grok-code", name: "OpenCode Grok Code", contextLimit: 128000, outputLimit: 32768, toolCall: true }
    ]
  },
  {
    id: "crown",
    aliases: ["crownai"],
    name: "Crown AI (Komunitas Free)",
    tier: "tier3-free",
    dialect: "openai",
    baseUrl: "https://api.crown.ai.id/v1",
    envKey: "CROWN_API_KEY",
    enabled: true,
    apiKeys: ["crown-27f7af7aab27f07dfe005f97c6549138"],
    notes: "API key komunitas Crown AI, gratis untuk digunakan. Arahkan klien OpenAI Anda ke base URL ini.",
    models: [
      { id: "zai-org/GLM-5.3-Flash", name: "GLM 5.3 Flash (Crown AI)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true },
      { id: "deepseek-ai/DeepSeek-V4-Flash-0731", name: "DeepSeek V4 Flash (Crown AI)", contextLimit: 128000, outputLimit: 16384, toolCall: true, free: true },
      { id: "MiniMaxAI/MiniMax-M2.7", name: "MiniMax M2.7 (Crown AI)", contextLimit: 200000, outputLimit: 32768, toolCall: true, free: true }
    ]
  },
  {
    id: "cloudflare",
    aliases: ["cf", "workers-ai"],
    name: "Cloudflare Workers AI (Native Edge)",
    tier: "tier3-free",
    dialect: "cloudflare-ai",
    baseUrl: "https://api.cloudflare.com/client/v4",
    envKey: "CLOUDFLARE_API_TOKEN",
    enabled: true,
    apiKeys: [],
    notes: "Berjalan langsung di jaringan Cloudflare (via binding `[ai]` gratis atau CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN).",
    models: [
      { id: "@cf/qwen/qwen2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B (Cloudflare FREE)", contextLimit: 32768, outputLimit: 8192, toolCall: true, free: true },
      { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", name: "Llama 3.3 70B Fast (Cloudflare FREE)", contextLimit: 64000, outputLimit: 8192, toolCall: true, free: true },
      { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Distill 32B (Cloudflare FREE)", contextLimit: 32768, outputLimit: 8192, toolCall: false, reasoning: true, free: true }
    ]
  }
];

export const DEFAULT_COMBOS: ComboConfig[] = [
  {
    id: "9router/auto",
    name: "9Router Smart Auto (Antigravity + 3-Tier Fallback)",
    description: "Rute utama untuk OpenCode & AI Agent: Antigravity Multi-Akun (Claude Sonnet 4.6 -> Opus 4.6 -> Gemini 3.8 Flash -> Gemini 2.5 Pro) -> Tier 1 -> Tier 2 -> Tier 3 GRATIS. Otomatis pindah akun & provider saat kena limit 429!",
    strategy: "fallback",
    contextLimit: 200000,
    outputLimit: 64000,
    routes: [
      "antigravity/claude-sonnet-4-6",
      "antigravity/claude-opus-4-6-thinking",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/gemini-2.5-pro",
      "antigravity/gpt-oss-120b-medium",
      "anthropic/claude-sonnet-4-5",
      "openai/gpt-4.1",
      "xai/grok-code-fast-1",
      "deepseek/deepseek-chat",
      "glm/glm-4.7",
      "kimi/kimi-k2-0905-preview",
      "minimax/MiniMax-M2.5",
      "mistral/devstral-medium-latest",
      "gemini/gemini-2.5-pro",
      "gemini/gemini-2.5-flash",
      "cerebras/qwen-3-coder-480b",
      "groq/moonshotai/kimi-k2-instruct",
      "groq/llama-3.3-70b-versatile",
      "openrouter/qwen/qwen3-coder:free",
      "openrouter/deepseek/deepseek-chat-v3-0324:free",
      "github/gpt-4.1",
      "glm/glm-4.5-flash",
      "crown/zai-org/GLM-5.3-Flash",
      "crown/deepseek-ai/DeepSeek-V4-Flash-0731",
      "crown/MiniMaxAI/MiniMax-M2.7",
      "cloudflare/@cf/qwen/qwen2.5-coder-32b-instruct"
    ]
  },
  {
    id: "9router/antigravity",
    name: "9Router Antigravity Multi-Akun Pool",
    description: "Khusus seluruh model aktif Google Antigravity dengan rotasi & pindah akun otomatis: Claude Sonnet 4.6 -> Claude Opus 4.6 Thinking -> Gemini 3.8 Flash High -> Gemini 2.5 Pro -> GPT-OSS 120B.",
    strategy: "fallback",
    contextLimit: 200000,
    outputLimit: 64000,
    routes: [
      "antigravity/gemini-4-argon",
      "antigravity/claude-sonnet-4-6",
      "antigravity/claude-opus-4-6-thinking",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/gemini-2.5-pro",
      "antigravity/gemini-3-flash",
      "antigravity/gpt-oss-120b-medium"
    ]
  },
  {
    id: "9router/gemini",
    name: "9Router Gemini Multi-Akun (High Speed & Anti-503)",
    description: "Khusus seluruh model Gemini Google Antigravity (Gemini 3.8 Flash High -> Gemini 3 Flash -> Gemini 2.5 Pro -> Gemini 2.5 Flash). Otomatis rotasi akun & auto-fallback jika server 2.5-Pro overload 503!",
    strategy: "fallback",
    contextLimit: 1000000,
    outputLimit: 64000,
    routes: [
      "antigravity/gemini-4-argon",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/gemini-3-flash",
      "antigravity/gemini-2.5-pro",
      "antigravity/gemini-3.8-flash-medium",
      "antigravity/gemini-2.5-flash"
    ]
  },
  {
    id: "9router/coding",
    name: "9Router Pro Coding & Tool-Calling",
    description: "Khusus agent coding berat (OpenCode, Cursor, Cline) yang membutuhkan akurasi tool-calling tinggi.",
    strategy: "fallback",
    contextLimit: 200000,
    outputLimit: 64000,
    routes: [
      "antigravity/claude-sonnet-4-6",
      "antigravity/claude-opus-4-6-thinking",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/gemini-2.5-pro",
      "anthropic/claude-sonnet-4-5",
      "openai/gpt-4.1",
      "gemini/gemini-2.5-pro",
      "deepseek/deepseek-chat",
      "kimi/kimi-k2-0905-preview",
      "minimax/MiniMax-M2.5",
      "cerebras/qwen-3-coder-480b",
      "mistral/codestral-latest",
      "gemini/gemini-2.5-flash",
      "groq/moonshotai/kimi-k2-instruct",
      "openrouter/qwen/qwen3-coder:free",
      "github/gpt-4.1"
    ]
  },
  {
    id: "9router/free",
    name: "9Router 100% FREE Forever Pool",
    description: "Rotasi & fallback khusus model GRATIS anti rate-limit (Antigravity OAuth, Gemini AI Studio, Groq, Cerebras, OpenRouter Free, GitHub Models, GLM Flash, Cloudflare AI).",
    strategy: "fallback",
    contextLimit: 200000,
    outputLimit: 64000,
    routes: [
      "antigravity/claude-sonnet-4-6",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/claude-opus-4-6-thinking",
      "antigravity/gemini-2.5-pro",
      "antigravity/gpt-oss-120b-medium",
      "gemini/gemini-2.5-flash",
      "cerebras/qwen-3-coder-480b",
      "groq/moonshotai/kimi-k2-instruct",
      "groq/llama-3.3-70b-versatile",
      "openrouter/qwen/qwen3-coder:free",
      "openrouter/deepseek/deepseek-chat-v3-0324:free",
      "github/gpt-4.1",
      "glm/glm-4.5-flash",
      "gemini/gemini-2.5-flash-lite",
      "cerebras/qwen-3-32b",
      "nvidia/qwen/qwen3-235b-a22b",
      "crown/zai-org/GLM-5.3-Flash",
      "crown/deepseek-ai/DeepSeek-V4-Flash-0731",
      "crown/MiniMaxAI/MiniMax-M2.7",
      "cloudflare/@cf/qwen/qwen2.5-coder-32b-instruct",
      "cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    ]
  },
  {
    id: "9router/reasoning",
    name: "9Router Deep Reasoning / Architect",
    description: "Rute khusus planning, debugging sulit, dan arsitektur (Claude Opus 4.6 Thinking, Claude Sonnet 4.6, Gemini 3.8 Flash High, o4-mini, DeepSeek R1).",
    strategy: "fallback",
    contextLimit: 200000,
    outputLimit: 64000,
    routes: [
      "antigravity/claude-opus-4-6-thinking",
      "antigravity/claude-sonnet-4-6",
      "antigravity/gemini-3.8-flash-high",
      "antigravity/gemini-2.5-pro",
      "openai/o4-mini",
      "anthropic/claude-opus-4-5",
      "gemini/gemini-2.5-pro",
      "deepseek/deepseek-reasoner",
      "kimi/kimi-k2-thinking",
      "groq/qwen/qwen3-32b",
      "groq/deepseek-r1-distill-llama-70b",
      "openrouter/deepseek/deepseek-r1:free",
      "nvidia/deepseek-ai/deepseek-r1"
    ]
  },
  {
    id: "9router/fast",
    name: "9Router Instant Speed (Sub-Second)",
    description: "Respon super cepat untuk sub-agent, autocomplete, atau tugas ringan.",
    strategy: "round-robin",
    contextLimit: 128000,
    outputLimit: 16384,
    routes: [
      "antigravity/gemini-3.8-flash-medium",
      "antigravity/gemini-3-flash",
      "cerebras/llama-3.3-70b",
      "cerebras/qwen-3-32b",
      "groq/llama-3.3-70b-versatile",
      "gemini/gemini-2.5-flash-lite",
      "openai/gpt-4.1-mini",
      "anthropic/claude-3-5-haiku-latest"
    ]
  }
];
