import { OpenAIChatRequest, OpenAIMessage } from "../types";

function extractTextFromContent(content: OpenAIMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text" && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function safeParseJson(str: string): Record<string, unknown> {
  if (!str || !str.trim()) return {};
  try {
    const parsed = JSON.parse(str);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { value: parsed };
  } catch {
    return { raw_arguments: str };
  }
}

export function openAIToAnthropicRequest(
  body: OpenAIChatRequest,
  upstreamModel: string
): Record<string, unknown> {
  const systemParts: string[] = [];
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: unknown[] }> = [];

  const pushBlock = (role: "user" | "assistant", blocks: unknown[]) => {
    if (blocks.length === 0) return;
    const prev = anthropicMessages[anthropicMessages.length - 1];
    // Anthropic strictly requires alternating user/assistant messages; merge consecutive same-role turns!
    if (prev && prev.role === role) {
      prev.content.push(...blocks);
    } else {
      anthropicMessages.push({ role, content: [...blocks] });
    }
  };

  for (const msg of body.messages || []) {
    if (msg.role === "system" || msg.role === "developer") {
      const txt = extractTextFromContent(msg.content);
      if (txt) systemParts.push(txt);
      continue;
    }

    if (msg.role === "tool") {
      pushBlock("user", [
        {
          type: "tool_result",
          tool_use_id: msg.tool_call_id || "call_unknown",
          content: extractTextFromContent(msg.content) || "(empty tool output)"
        }
      ]);
      continue;
    }

    if (msg.role === "assistant") {
      const blocks: unknown[] = [];
      const txt = extractTextFromContent(msg.content);
      if (txt) {
        blocks.push({ type: "text", text: txt });
      }
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          blocks.push({
            type: "tool_use",
            id: tc.id || `toolu_${crypto.randomUUID().slice(0, 12)}`,
            name: tc.function.name,
            input: safeParseJson(tc.function.arguments)
          });
        }
      }
      if (blocks.length === 0) {
        blocks.push({ type: "text", text: "..." });
      }
      pushBlock("assistant", blocks);
      continue;
    }

    // User message (text + optional images)
    const userBlocks: unknown[] = [];
    if (typeof msg.content === "string") {
      if (msg.content) userBlocks.push({ type: "text", text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part?.type === "text" && typeof part.text === "string") {
          userBlocks.push({ type: "text", text: part.text });
        } else if (part?.type === "image_url" && part.image_url && typeof part.image_url === "object") {
          const url = String((part.image_url as Record<string, unknown>).url || "");
          const dataMatch = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (dataMatch) {
            userBlocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: dataMatch[1],
                data: dataMatch[2]
              }
            });
          } else if (url.startsWith("http")) {
            userBlocks.push({
              type: "image",
              source: { type: "url", url }
            });
          }
        }
      }
    }
    if (userBlocks.length === 0) {
      userBlocks.push({ type: "text", text: "Continue." });
    }
    pushBlock("user", userBlocks);
  }

  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
    anthropicMessages.unshift({ role: "user", content: [{ type: "text", text: "Hello" }] });
  }

  const maxTokens = body.max_completion_tokens || body.max_tokens || 8192;
  const req: Record<string, unknown> = {
    model: upstreamModel,
    max_tokens: maxTokens,
    messages: anthropicMessages,
    stream: Boolean(body.stream)
  };

  if (systemParts.length > 0) {
    req.system = systemParts.join("\n\n");
  }
  if (typeof body.temperature === "number") {
    req.temperature = body.temperature;
  }
  if (typeof body.top_p === "number") {
    req.top_p = body.top_p;
  }
  if (Array.isArray(body.stop) && body.stop.length > 0) {
    req.stop_sequences = body.stop;
  } else if (typeof body.stop === "string") {
    req.stop_sequences = [body.stop];
  }

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    req.tools = body.tools
      .map((t) => {
        if (t?.type === "function" && t.function && typeof t.function === "object") {
          const fn = t.function as Record<string, unknown>;
          return {
            name: String(fn.name || "tool"),
            description: String(fn.description || ""),
            input_schema:
              fn.parameters && typeof fn.parameters === "object"
                ? fn.parameters
                : { type: "object", properties: {} }
          };
        }
        return null;
      })
      .filter(Boolean);

    if (body.tool_choice === "auto") {
      req.tool_choice = { type: "auto" };
    } else if (body.tool_choice === "required") {
      req.tool_choice = { type: "any" };
    } else if (
      body.tool_choice &&
      typeof body.tool_choice === "object" &&
      (body.tool_choice as Record<string, unknown>).type === "function"
    ) {
      const fn = (body.tool_choice as Record<string, unknown>).function as Record<string, unknown> | undefined;
      if (fn?.name) {
        req.tool_choice = { type: "tool", name: String(fn.name) };
      }
    }
  }

  return req;
}

function mapStopReason(reason: unknown): string {
  if (reason === "tool_use") return "tool_calls";
  if (reason === "max_tokens") return "length";
  return "stop";
}

export function anthropicResponseToOpenAI(
  data: Record<string, unknown>,
  requestedModel: string
): Record<string, unknown> {
  const contentBlocks = Array.isArray(data.content) ? (data.content as Array<Record<string, unknown>>) : [];
  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: Array<Record<string, unknown>> = [];

  for (const block of contentBlocks) {
    if (block.type === "text" && typeof block.text === "string") {
      textParts.push(block.text);
    } else if (block.type === "thinking" && typeof block.thinking === "string") {
      reasoningParts.push(block.thinking);
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: String(block.id || `call_${crypto.randomUUID().slice(0, 10)}`),
        type: "function",
        function: {
          name: String(block.name || ""),
          arguments: JSON.stringify(block.input || {})
        }
      });
    }
  }

  const usage = (data.usage as Record<string, number> | undefined) || {};
  const promptTokens = usage.input_tokens || 0;
  const completionTokens = usage.output_tokens || 0;

  const message: Record<string, unknown> = {
    role: "assistant",
    content: textParts.length > 0 ? textParts.join("") : toolCalls.length > 0 ? null : ""
  };
  if (reasoningParts.length > 0) {
    message.reasoning_content = reasoningParts.join("\n");
  }
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  return {
    id: String(data.id || `chatcmpl-${crypto.randomUUID()}`),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message,
        finish_reason: mapStopReason(data.stop_reason)
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}

export function anthropicStreamToOpenAIStream(
  upstreamBody: ReadableStream<Uint8Array>,
  requestedModel: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let buffer = "";
  let chatId = `chatcmpl-${crypto.randomUUID().slice(0, 16)}`;
  const created = Math.floor(Date.now() / 1000);
  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallIndex = -1;
  const blockToToolIndex = new Map<number, number>();

  const emitChunk = (
    controller: TransformStreamDefaultController<Uint8Array>,
    delta: Record<string, unknown>,
    finishReason: string | null = null,
    includeUsage = false
  ) => {
    const chunk: Record<string, unknown> = {
      id: chatId,
      object: "chat.completion.chunk",
      created,
      model: requestedModel,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason
        }
      ]
    };
    if (includeUsage) {
      chunk.usage = {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens
      };
    }
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
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
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          const type = evt.type;
          if (type === "message_start" && evt.message && typeof evt.message === "object") {
            const msg = evt.message as Record<string, unknown>;
            if (typeof msg.id === "string") chatId = msg.id;
            const u = msg.usage as Record<string, number> | undefined;
            if (u?.input_tokens) inputTokens = u.input_tokens;
            emitChunk(controller, { role: "assistant", content: "" });
          } else if (type === "content_block_start") {
            const idx = Number(evt.index ?? 0);
            const block = (evt.content_block as Record<string, unknown>) || {};
            if (block.type === "tool_use") {
              toolCallIndex += 1;
              blockToToolIndex.set(idx, toolCallIndex);
              emitChunk(controller, {
                tool_calls: [
                  {
                    index: toolCallIndex,
                    id: String(block.id || `call_${toolCallIndex}`),
                    type: "function",
                    function: {
                      name: String(block.name || ""),
                      arguments: ""
                    }
                  }
                ]
              });
            }
          } else if (type === "content_block_delta") {
            const idx = Number(evt.index ?? 0);
            const delta = (evt.delta as Record<string, unknown>) || {};
            if (delta.type === "text_delta" && typeof delta.text === "string") {
              emitChunk(controller, { content: delta.text });
            } else if (delta.type === "thinking_delta" && typeof delta.thinking === "string") {
              emitChunk(controller, { reasoning_content: delta.thinking });
            } else if (delta.type === "input_json_delta" && typeof delta.partial_json === "string") {
              const tIdx = blockToToolIndex.get(idx) ?? Math.max(0, toolCallIndex);
              emitChunk(controller, {
                tool_calls: [
                  {
                    index: tIdx,
                    function: {
                      arguments: delta.partial_json
                    }
                  }
                ]
              });
            }
          } else if (type === "message_delta") {
            const delta = (evt.delta as Record<string, unknown>) || {};
            const u = (evt.usage as Record<string, number>) || {};
            if (u.output_tokens) outputTokens = u.output_tokens;
            emitChunk(controller, {}, mapStopReason(delta.stop_reason), true);
          }
        }
      },
      flush(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    })
  );
}

// ============================================================================
// Incoming Anthropic `/v1/messages` -> OpenAI internal format (for Claude Code!)
// ============================================================================
export function anthropicRequestToOpenAI(body: Record<string, unknown>): OpenAIChatRequest {
  const messages: OpenAIMessage[] = [];

  if (typeof body.system === "string" && body.system.trim()) {
    messages.push({ role: "system", content: body.system });
  } else if (Array.isArray(body.system)) {
    const sysText = body.system
      .map((b: Record<string, unknown>) => (typeof b?.text === "string" ? b.text : ""))
      .filter(Boolean)
      .join("\n\n");
    if (sysText) messages.push({ role: "system", content: sysText });
  }

  const rawMsgs = Array.isArray(body.messages) ? (body.messages as Array<Record<string, unknown>>) : [];
  for (const m of rawMsgs) {
    const role = m.role === "assistant" ? "assistant" : "user";
    if (typeof m.content === "string") {
      messages.push({ role, content: m.content });
      continue;
    }

    if (Array.isArray(m.content)) {
      const blocks = m.content as Array<Record<string, unknown>>;
      if (role === "assistant") {
        const texts: string[] = [];
        const toolCalls: NonNullable<OpenAIMessage["tool_calls"]> = [];
        for (const b of blocks) {
          if (b.type === "text" && typeof b.text === "string") texts.push(b.text);
          if (b.type === "tool_use") {
            toolCalls.push({
              id: String(b.id || `call_${crypto.randomUUID().slice(0, 8)}`),
              type: "function",
              function: {
                name: String(b.name || "tool"),
                arguments: JSON.stringify(b.input || {})
              }
            });
          }
        }
        messages.push({
          role: "assistant",
          content: texts.join("\n") || (toolCalls.length > 0 ? null : ""),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
        });
      } else {
        const normalParts: Array<Record<string, unknown>> = [];
        for (const b of blocks) {
          if (b.type === "tool_result") {
            const toolContent =
              typeof b.content === "string"
                ? b.content
                : Array.isArray(b.content)
                  ? b.content.map((x: Record<string, unknown>) => x.text || JSON.stringify(x)).join("\n")
                  : JSON.stringify(b.content ?? "");
            messages.push({
              role: "tool",
              tool_call_id: String(b.tool_use_id || ""),
              content: toolContent
            });
          } else if (b.type === "text" && typeof b.text === "string") {
            normalParts.push({ type: "text", text: b.text });
          }
        }
        if (normalParts.length === 1 && typeof normalParts[0].text === "string") {
          messages.push({ role: "user", content: normalParts[0].text });
        } else if (normalParts.length > 0) {
          messages.push({ role: "user", content: normalParts });
        }
      }
    }
  }

  const tools = Array.isArray(body.tools)
    ? (body.tools as Array<Record<string, unknown>>).map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description || "",
          parameters: t.input_schema || { type: "object", properties: {} }
        }
      }))
    : undefined;

  return {
    model: String(body.model || "9router/auto"),
    messages,
    stream: Boolean(body.stream),
    max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 8192,
    ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    ...(tools && tools.length > 0 ? { tools } : {})
  };
}

export function openAIResponseToAnthropic(
  openAIJson: Record<string, unknown>,
  requestedModel: string
): Record<string, unknown> {
  const choices = Array.isArray(openAIJson.choices)
    ? (openAIJson.choices as Array<Record<string, unknown>>)
    : [];
  const first = choices[0] || {};
  const msg = (first.message as Record<string, unknown>) || {};
  const content: Array<Record<string, unknown>> = [];

  if (typeof msg.content === "string" && msg.content.length > 0) {
    content.push({ type: "text", text: msg.content });
  }

  const toolCalls = Array.isArray(msg.tool_calls)
    ? (msg.tool_calls as Array<Record<string, unknown>>)
    : [];
  for (const tc of toolCalls) {
    const fn = (tc.function as Record<string, unknown>) || {};
    content.push({
      type: "tool_use",
      id: String(tc.id || `toolu_${crypto.randomUUID().slice(0, 10)}`),
      name: String(fn.name || "tool"),
      input: safeParseJson(String(fn.arguments || "{}"))
    });
  }

  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }

  const usage = (openAIJson.usage as Record<string, number>) || {};
  const finish = first.finish_reason;
  const stopReason =
    finish === "tool_calls" || toolCalls.length > 0
      ? "tool_use"
      : finish === "length"
        ? "max_tokens"
        : "end_turn";

  return {
    id: String(openAIJson.id || `msg_${crypto.randomUUID().slice(0, 16)}`),
    type: "message",
    role: "assistant",
    model: requestedModel,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0
    }
  };
}

export function openAIStreamToAnthropicStream(
  openAIStream: ReadableStream<Uint8Array>,
  requestedModel: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let buffer = "";
  let started = false;
  let textBlockOpen = false;
  let blockIndex = 0;
  const openToolBlocks = new Set<number>();
  const toolIdxToBlockIdx = new Map<number, number>();
  let stopReason = "end_turn";
  let outputTokens = 0;

  const sendSse = (
    controller: TransformStreamDefaultController<Uint8Array>,
    event: string,
    payload: Record<string, unknown>
  ) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
  };

  return openAIStream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (!started) {
          started = true;
          sendSse(controller, "message_start", {
            type: "message_start",
            message: {
              id: `msg_${crypto.randomUUID().slice(0, 16)}`,
              type: "message",
              role: "assistant",
              model: requestedModel,
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 0, output_tokens: 0 }
            }
          });
        }

        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          const u = data.usage as Record<string, number> | undefined;
          if (u?.completion_tokens) outputTokens = u.completion_tokens;

          const choices = Array.isArray(data.choices)
            ? (data.choices as Array<Record<string, unknown>>)
            : [];
          const choice = choices[0];
          if (!choice) continue;

          if (choice.finish_reason === "tool_calls") stopReason = "tool_use";
          else if (choice.finish_reason === "length") stopReason = "max_tokens";

          const delta = (choice.delta as Record<string, unknown>) || {};
          if (typeof delta.content === "string" && delta.content.length > 0) {
            if (!textBlockOpen) {
              textBlockOpen = true;
              sendSse(controller, "content_block_start", {
                type: "content_block_start",
                index: blockIndex,
                content_block: { type: "text", text: "" }
              });
            }
            sendSse(controller, "content_block_delta", {
              type: "content_block_delta",
              index: blockIndex,
              delta: { type: "text_delta", text: delta.content }
            });
          }

          if (Array.isArray(delta.tool_calls)) {
            if (textBlockOpen) {
              sendSse(controller, "content_block_stop", {
                type: "content_block_stop",
                index: blockIndex
              });
              textBlockOpen = false;
              blockIndex += 1;
            }
            stopReason = "tool_use";

            for (const tc of delta.tool_calls as Array<Record<string, unknown>>) {
              const tIdx = Number(tc.index ?? 0);
              const fn = (tc.function as Record<string, unknown>) || {};
              let bIdx = toolIdxToBlockIdx.get(tIdx);

              if (bIdx === undefined) {
                bIdx = blockIndex++;
                toolIdxToBlockIdx.set(tIdx, bIdx);
                openToolBlocks.add(bIdx);
                sendSse(controller, "content_block_start", {
                  type: "content_block_start",
                  index: bIdx,
                  content_block: {
                    type: "tool_use",
                    id: String(tc.id || `toolu_${crypto.randomUUID().slice(0, 10)}`),
                    name: String(fn.name || "tool"),
                    input: {}
                  }
                });
              }

              if (typeof fn.arguments === "string" && fn.arguments.length > 0) {
                sendSse(controller, "content_block_delta", {
                  type: "content_block_delta",
                  index: bIdx,
                  delta: { type: "input_json_delta", partial_json: fn.arguments }
                });
              }
            }
          }
        }
      },
      flush(controller) {
        if (textBlockOpen) {
          sendSse(controller, "content_block_stop", {
            type: "content_block_stop",
            index: blockIndex
          });
        }
        for (const bIdx of openToolBlocks) {
          sendSse(controller, "content_block_stop", {
            type: "content_block_stop",
            index: bIdx
          });
        }
        sendSse(controller, "message_delta", {
          type: "message_delta",
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: { output_tokens: outputTokens }
        });
        sendSse(controller, "message_stop", { type: "message_stop" });
      }
    })
  );
}
