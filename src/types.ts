export type ProviderDialect = "openai" | "anthropic" | "gemini" | "cloudflare-ai" | "antigravity";
export type ProviderTier = "tier1-flagship" | "tier2-cheap" | "tier3-free";
export type CavemanLevel = "off" | "light" | "medium" | "ultra";

export interface Env {
  ROUTER_KV?: KVNamespace;
  ROUTER_DB?: D1Database;
  AI?: {
    run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
  };
  APP_NAME?: string;
  DEFAULT_RTK_ENABLED?: string;
  DEFAULT_CAVEMAN_MODE?: string;
  ADMIN_PASSWORD?: string;
  ROUTER_API_KEY?: string;

  // Upstream Provider API Keys (optional via Env / Wrangler Secrets)
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  XAI_API_KEY?: string;
  GLM_API_KEY?: string;
  KIMI_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  GITHUB_TOKEN?: string;
  TOGETHER_API_KEY?: string;
  FIREWORKS_API_KEY?: string;
  OPENCODE_API_KEY?: string;
  CROWN_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  [key: string]: unknown;
}

export interface ModelSpec {
  id: string;
  name: string;
  upstreamModelId?: string;
  contextLimit: number;
  outputLimit: number;
  toolCall: boolean;
  reasoning?: boolean;
  vision?: boolean;
  free?: boolean;
}

export interface OAuthAccount {
  id: string;
  providerId: "antigravity" | "claude";
  email: string;
  projectId: string;
  tierId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  enabled: boolean;
  createdAt: string;
  lastUsedAt?: string;
  lastError?: string;
  quotaResetAt?: number;
}

export interface ProviderConfig {
  id: string;
  aliases: string[];
  name: string;
  tier: ProviderTier;
  dialect: ProviderDialect;
  baseUrl: string;
  envKey?: string;
  enabled: boolean;
  apiKeys: string[];
  extraHeaders?: Record<string, string>;
  models: ModelSpec[];
  custom?: boolean;
  notes?: string;
}

export interface ComboConfig {
  id: string;
  name: string;
  description: string;
  strategy: "fallback" | "round-robin";
  routes: string[];
  contextLimit: number;
  outputLimit: number;
}

export interface ClientApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  enabled: boolean;
  dailyTokenLimit?: number;
  dailyRequestLimit?: number;
  allowedModels?: string[];
}

export interface RouterSettings {
  rtkEnabled: boolean;
  rtkMaxToolChars: number;
  cavemanMode: CavemanLevel;
  timeoutMs: number;
  requireAuth: boolean;
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  requestedModel: string;
  resolvedProvider: string;
  resolvedModel: string;
  clientKeyName?: string;
  clientKeyMasked?: string;
  upstreamKeyMasked?: string;
  accountEmail?: string;
  action?: string;
  status: number;
  attempts: number;
  latencyMs: number;
  rtkSavedChars: number;
  stream: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  error?: string;
}

export interface RouterState {
  settings: RouterSettings;
  providers: Record<string, {
    enabled?: boolean;
    baseUrl?: string;
    apiKeys?: string[];
    extraHeaders?: Record<string, string>;
    models?: ModelSpec[];
    name?: string;
    aliases?: string[];
    tier?: ProviderTier;
    dialect?: ProviderDialect;
    custom?: boolean;
  }>;
  combos: ComboConfig[];
  clientKeys: ClientApiKey[];
  oauthAccounts: OAuthAccount[];
}

export interface ModelUsageStat {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface KeyUsageStat {
  keyIdOrEmail: string;
  name: string;
  kind: "client_api_key" | "oauth_account" | "provider_api_key";
  providerId?: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  dailyRequests?: number;
  dailyTokens?: number;
  dailyDate?: string;
  lastUsedAt: string;
}

export interface DailyStat {
  date: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface UsageStats {
  totalRequests: number;
  totalFallbacks: number;
  totalRtkSavedChars: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, number>;
  byModel: Record<string, ModelUsageStat>;
  byKey: Record<string, KeyUsageStat>;
  byDate: Record<string, DailyStat>;
  recentLogs: RequestLogEntry[];
}

export interface OpenAIMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content?: string | Array<Record<string, unknown>> | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  reasoning_content?: string;
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  stream_options?: { include_usage?: boolean };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  stop?: string | string[];
  response_format?: Record<string, unknown>;
  reasoning_effort?: string;
  [key: string]: unknown;
}
