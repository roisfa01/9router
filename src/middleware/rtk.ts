import { CavemanLevel, OpenAIChatRequest, OpenAIMessage } from "../types";

const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const CAVEMAN_PROMPTS: Record<Exclude<CavemanLevel, "off">, string> = {
  light: "Be concise and direct. Avoid filler intros, outros, and unnecessary repetition while keeping all code and technical accuracy intact.",
  medium: "Reply tersely. Skip pleasantries and verbose prose; use short bullets and complete, accurate code blocks.",
  ultra: "CAVEMAN MODE: Minimal prose tokens. Telegraphic technical notes only. Never truncate or abbreviate actual code edits or tool arguments."
};

function compressToolText(text: string, maxChars: number, isRecentTurn: boolean): string {
  if (!text || text.length < 300) return text;

  // 1. Fast truncation of huge text first using slice (instant O(1) in V8)
  // to avoid CPU timeout on large chat histories in Cloudflare Workers!
  const effectiveMax = isRecentTurn ? maxChars * 3 : maxChars;
  let out = text;
  if (out.length > effectiveMax && effectiveMax >= 1000) {
    const headLen = Math.floor(effectiveMax * 0.65);
    const tailLen = Math.floor(effectiveMax * 0.25);
    const omitted = out.length - headLen - tailLen;
    out =
      out.slice(0, headLen) +
      `\n\n... [9Router RTK Token Saver: compressed ${omitted} chars from older tool output] ...\n\n` +
      out.slice(out.length - tailLen);
  }

  // 2. Strip terminal ANSI escape sequences only if escape character is present
  if (out.includes("\x1B")) {
    out = out.replace(ANSI_REGEX, "");
  }

  // 3. Normalize CRLF and collapse 3+ consecutive blank lines
  out = out.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  // 4. Deduplicate consecutive identical log lines on bounded text
  if (out.length > 500 && out.length <= 60000) {
    const lines = out.split("\n");
    if (lines.length > 20) {
      const deduped: string[] = [];
      let prev = "";
      let repeatCount = 0;
      for (const line of lines) {
        if (line === prev && line.trim().length > 0) {
          repeatCount++;
        } else {
          if (repeatCount > 1) {
            deduped.push(`... [repeated ${repeatCount} more times]`);
          }
          deduped.push(line);
          prev = line;
          repeatCount = 0;
        }
      }
      if (repeatCount > 1) {
        deduped.push(`... [repeated ${repeatCount} more times]`);
      }
      out = deduped.join("\n");
    }
  }

  return out;
}

function messageTextLength(msg: OpenAIMessage): number {
  const c = msg.content;
  if (typeof c === "string") return c.length;
  if (Array.isArray(c)) {
    let n = 0;
    for (const part of c) {
      if (part && part.type === "text" && typeof part.text === "string") n += part.text.length;
    }
    return n;
  }
  return 0;
}

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const headLen = Math.floor(maxChars * 0.6);
  const tailLen = Math.max(0, maxChars - headLen - 80);
  const omitted = text.length - headLen - tailLen;
  return (
    text.slice(0, headLen) +
    `\n... [9Router context guard: ${omitted} chars omitted] ...\n` +
    (tailLen > 0 ? text.slice(text.length - tailLen) : "")
  );
}

function shrinkMessage(msg: OpenAIMessage, maxChars: number): OpenAIMessage {
  const c = msg.content;
  if (typeof c === "string") {
    if (c.length <= maxChars) return msg;
    return { ...msg, content: truncateMiddle(c, maxChars) };
  }
  if (Array.isArray(c)) {
    const parts = c.map((part) => {
      if (part && part.type === "text" && typeof part.text === "string" && part.text.length > maxChars) {
        return { ...part, text: truncateMiddle(part.text, maxChars) };
      }
      return part;
    });
    return { ...msg, content: parts };
  }
  return msg;
}

/**
 * Keeps a request inside the model context window.
 *
 * OpenCode session-compaction sends the WHOLE conversation (often 1M+ tokens).
 * When that hits the upstream limit, Gemini/Antigravity answers with a tiny
 * 40-token message and OpenCode reports
 * "Compaction summary did not match the required template".
 *
 * We progressively shrink old tool/assistant/user blobs while preserving:
 *   - every system/developer instruction,
 *   - the very last message (the compaction/answer instruction),
 *   - message roles/order (tool_call pairing stays intact).
 */
export function fitMessagesToBudget(
  body: OpenAIChatRequest,
  maxChars: number
): { request: OpenAIChatRequest; trimmedChars: number } {
  if (!Array.isArray(body.messages) || maxChars <= 0) {
    return { request: body, trimmedChars: 0 };
  }

  const originalChars = body.messages.reduce(
    (sum, m) => sum + messageTextLength(m) + (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0),
    0
  );
  if (originalChars <= maxChars) return { request: body, trimmedChars: 0 };

  const messages = body.messages.slice();
  const lastIdx = messages.length - 1;

  // Progressive compression passes: older messages first, gentlest cap first.
  const caps = [8000, 3000, 1200, 400, 120];
  for (const cap of caps) {
    let total = 0;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isProtected = msg.role === "system" || msg.role === "developer" || i === lastIdx;
      if (!isProtected) {
        messages[i] = shrinkMessage(msg, cap);
      } else if (i === lastIdx && total > maxChars * 1.5) {
        // Last message itself is gigantic (huge pasted file) — trim it too.
        messages[i] = shrinkMessage(msg, Math.max(20000, Math.floor(maxChars / 4)));
      }
      total += messageTextLength(messages[i]) + (messages[i].tool_calls ? JSON.stringify(messages[i].tool_calls).length : 0);
    }
    if (total <= maxChars) {
      return { request: { ...body, messages }, trimmedChars: Math.max(0, originalChars - total) };
    }
  }

  const finalChars = messages.reduce(
    (sum, m) => sum + messageTextLength(m) + (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0),
    0
  );
  return { request: { ...body, messages }, trimmedChars: Math.max(0, originalChars - finalChars) };
}

export function estimateBodyChars(body: OpenAIChatRequest): number {
  if (!Array.isArray(body.messages)) return 0;
  return body.messages.reduce(
    (sum, m) => sum + messageTextLength(m) + (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0),
    0
  );
}

function looksLikeStructuredTask(messages: OpenAIMessage[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;
  const c = lastUser.content;
  const text =
    typeof c === "string"
      ? c
      : Array.isArray(c)
        ? c.map((p) => (p && p.type === "text" && typeof p.text === "string" ? p.text : "")).join("\n")
        : "";
  if (!text) return false;
  return /\b(compact|compaction|summari[sz]e|summary|ringkas|recap|template|required format|output format|structured)\b/i.test(
    text.slice(0, 4000)
  );
}

export function applyRtkAndCaveman(
  body: OpenAIChatRequest,
  options: { rtkEnabled: boolean; rtkMaxToolChars: number; cavemanMode: CavemanLevel }
): { request: OpenAIChatRequest; savedChars: number } {
  if (!Array.isArray(body.messages)) {
    return { request: body, savedChars: 0 };
  }

  let savedChars = 0;
  const totalMessages = body.messages.length;
  const structured = looksLikeStructuredTask(body.messages);
  // Structured jobs (compaction / summaries) need the real tool output, not a stub.
  const toolCap = structured
    ? Math.max(options.rtkMaxToolChars * 3, 24_000)
    : options.rtkMaxToolChars;

  const nextMessages: OpenAIMessage[] = body.messages.map((msg, idx) => {
    const isRecentTurn = idx >= totalMessages - 4;

    if (options.rtkEnabled && msg.role === "tool") {
      if (typeof msg.content === "string") {
        const before = msg.content.length;
        const compressed = compressToolText(msg.content, toolCap, isRecentTurn);
        if (compressed.length < before) {
          savedChars += before - compressed.length;
          return { ...msg, content: compressed };
        }
      } else if (Array.isArray(msg.content)) {
        let changed = false;
        const nextParts = msg.content.map((part) => {
          if (part && part.type === "text" && typeof part.text === "string") {
            const before = part.text.length;
            const compressed = compressToolText(part.text, toolCap, isRecentTurn);
            if (compressed.length < before) {
              savedChars += before - compressed.length;
              changed = true;
              return { ...part, text: compressed };
            }
          }
          return part;
        });
        if (changed) {
          return { ...msg, content: nextParts };
        }
      }
    }

    return msg;
  });

  if (options.cavemanMode !== "off" && !structured) {
    const instruction = CAVEMAN_PROMPTS[options.cavemanMode];
    const sysIdx = nextMessages.findIndex((m) => m.role === "system" || m.role === "developer");
    if (sysIdx >= 0 && typeof nextMessages[sysIdx].content === "string") {
      if (!nextMessages[sysIdx].content.includes(instruction)) {
        nextMessages[sysIdx] = {
          ...nextMessages[sysIdx],
          content: `${nextMessages[sysIdx].content}\n\n${instruction}`
        };
      }
    } else if (sysIdx < 0) {
      nextMessages.unshift({ role: "system", content: instruction });
    }
  }

  return {
    request: {
      ...body,
      messages: nextMessages
    },
    savedChars
  };
}
