import { OpenAIChatRequest, OpenAIMessage, ProviderConfig } from "../types";

function stripJsonSchemaUnsupportedKeys(schema: unknown, isGemini: boolean): unknown {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) {
    return schema.map((item) => stripJsonSchemaUnsupportedKeys(item, isGemini));
  }

  const obj = schema as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (k === "$schema") continue;
    if (isGemini && (k === "additionalProperties" || k === "strict" || k === "$defs")) {
      continue;
    }
    cleaned[k] = stripJsonSchemaUnsupportedKeys(v, isGemini);
  }

  if (isGemini && cleaned.type === "object" && !cleaned.properties) {
    cleaned.properties = {};
  }

  return cleaned;
}

export function sanitizeOpenAIPayloadForProvider(
  rawBody: OpenAIChatRequest,
  provider: ProviderConfig,
  upstreamModel: string
): Record<string, unknown> {
  const isOpenAI = provider.id === "openai";
  const isGemini = provider.dialect === "gemini" || provider.id === "gemini";
  const isDeepSeekReasoner = upstreamModel.includes("deepseek-reasoner");
  const isOpenAIReasoning = isOpenAI && /^o[134](-|$)/.test(upstreamModel);

  const payload: Record<string, unknown> = {
    ...rawBody,
    model: upstreamModel
  };

  // Strip vendor-specific top-level fields that cause 400 errors on strict OpenAI-compatible APIs
  delete payload.store;
  delete payload.metadata;
  delete payload.service_tier;
  delete payload.prompt_cache_key;

  if (!isOpenAI && !isGemini && provider.id !== "openrouter" && provider.id !== "groq") {
    delete payload.reasoning_effort;
  }

  if (!payload.stream) {
    delete payload.stream_options;
  } else if (isGemini || provider.id === "github" || provider.id === "glm" || provider.id === "minimax") {
    // Several OpenAI-compat endpoints reject stream_options with 400
    delete payload.stream_options;
  }

  if (isGemini) {
    delete payload.parallel_tool_calls;
    delete payload.frequency_penalty;
    delete payload.presence_penalty;
    delete payload.logit_bias;
  }

  // Normalize messages
  if (Array.isArray(rawBody.messages)) {
    const normalizedMessages: OpenAIMessage[] = rawBody.messages.map((msg) => {
      const copy: OpenAIMessage = { ...msg };

      // Convert `developer` role -> `system` for non-OpenAI providers
      if (copy.role === "developer" && !isOpenAI) {
        copy.role = "system";
      }

      // Ensure assistant messages with tool_calls have string content where required
      if (copy.role === "assistant" && Array.isArray(copy.tool_calls) && copy.tool_calls.length > 0) {
        if (copy.content === undefined || (copy.content === null && (isGemini || provider.id === "mistral"))) {
          copy.content = "";
        }
        if (isDeepSeekReasoner && copy.reasoning_content === undefined) {
          copy.reasoning_content = "";
        }
      }

      // Ensure tool role content is always a string for strict providers
      if (copy.role === "tool" && Array.isArray(copy.content)) {
        copy.content = copy.content
          .map((part) => (typeof part?.text === "string" ? part.text : JSON.stringify(part)))
          .join("\n");
      }

      if (!isDeepSeekReasoner && copy.reasoning_content !== undefined) {
        delete copy.reasoning_content;
      }

      return copy;
    });

    payload.messages = normalizedMessages;
  }

  // Normalize tools array
  if (Array.isArray(payload.tools)) {
    if (payload.tools.length === 0) {
      delete payload.tools;
      delete payload.tool_choice;
    } else {
      payload.tools = (payload.tools as Array<Record<string, unknown>>).map((tool) => {
        if (tool?.type === "function" && tool.function && typeof tool.function === "object") {
          const fn = { ...(tool.function as Record<string, unknown>) };
          if (isGemini) {
            delete fn.strict;
          }
          if (fn.parameters) {
            fn.parameters = stripJsonSchemaUnsupportedKeys(fn.parameters, isGemini);
          }
          return { type: "function", function: fn };
        }
        return tool;
      });
    }
  }

  // OpenAI o-series reasoning parameter adjustments
  if (isOpenAIReasoning) {
    if (payload.max_tokens && !payload.max_completion_tokens) {
      payload.max_completion_tokens = payload.max_tokens;
    }
    delete payload.max_tokens;
    delete payload.temperature;
  } else if (payload.max_completion_tokens && !payload.max_tokens && !isOpenAI) {
    payload.max_tokens = payload.max_completion_tokens;
    delete payload.max_completion_tokens;
  }

  return payload;
}
