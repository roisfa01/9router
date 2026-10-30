import test from "node:test";
import assert from "node:assert/strict";
import esbuild from "esbuild";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// Bundle TypeScript Worker into a temporary ESM module so Node can execute all unit & integration tests natively
const outFile = path.join(os.tmpdir(), `9router-worker-test-${Date.now()}.mjs`);
await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: outFile
});

const workerModule = await import(pathToFileURL(outFile).href);
const worker = workerModule.default;

function createMockKv() {
  const map = new Map();
  return {
    async get(key, type) {
      const val = map.get(key);
      if (val === undefined) return null;
      return type === "json" ? JSON.parse(val) : val;
    },
    async put(key, val) {
      map.set(key, val);
    }
  };
}

test("1. Dashboard HTML renders cleanly and embedded <script> has valid JS syntax", async () => {
  const env = { ADMIN_PASSWORD: "secret-admin", ROUTER_API_KEY: "sk-9r-testkey" };
  const res = await worker.fetch(new Request("https://9router.example.workers.dev/"), env);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("9Router Edge"));
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, "Embedded dashboard script must exist");
  // Parse JS without executing browser globals
  assert.doesNotThrow(() => new Function(scriptMatch[1]));
});

test("2. GET /v1/models and GET /v1/opencode.json match OpenCode schema & model IDs", async () => {
  const env = {
    ROUTER_KV: createMockKv(),
    ROUTER_API_KEY: "sk-9r-opencode-123",
    GEMINI_API_KEY: "gem-key-1",
    GROQ_API_KEY: "groq-key-1"
  };

  const modelsRes = await worker.fetch(new Request("https://9router.example.workers.dev/v1/models"), env);
  assert.equal(modelsRes.status, 200);
  const modelsJson = await modelsRes.json();
  const modelIds = new Set(modelsJson.data.map((m) => m.id));
  assert.ok(modelIds.has("9router/auto"));
  assert.ok(modelIds.has("gemini/gemini-2.5-flash"));
  assert.ok(modelIds.has("groq/llama-3.3-70b-versatile"));
  assert.ok(modelIds.has("crown/zai-org/GLM-5.3-Flash"));
  assert.ok(modelIds.has("crown/deepseek-ai/DeepSeek-V4-Flash-0731"));
  assert.ok(modelIds.has("crown/MiniMaxAI/MiniMax-M2.7"));

  // Unauthorized without client key
  const unauthRes = await worker.fetch(new Request("https://9router.example.workers.dev/v1/opencode.json"), env);
  assert.equal(unauthRes.status, 401);

  // Authorized with client key
  const ocRes = await worker.fetch(
    new Request("https://9router.example.workers.dev/v1/opencode.json", {
      headers: { Authorization: "Bearer sk-9r-opencode-123" }
    }),
    env
  );
  assert.equal(ocRes.status, 200);
  const ocJson = await ocRes.json();
  assert.equal(ocJson.$schema, "https://opencode.ai/config.json");
  assert.equal(ocJson.provider["9router"].npm, "@ai-sdk/openai-compatible");
  assert.equal(ocJson.provider["9router"].options.baseURL, "https://9router.example.workers.dev/v1");
  assert.equal(ocJson.provider["9router"].options.apiKey, "sk-9r-opencode-123");

  // Every model key in opencode.json MUST exist in GET /v1/models
  for (const key of Object.keys(ocJson.provider["9router"].models)) {
    assert.ok(modelIds.has(key), `Model ${key} in opencode.json must exist in /v1/models`);
    assert.ok(ocJson.provider["9router"].models[key].limit.context > 0);
  }
});

test("3. Smart 3-Tier Auto-Fallback + RTK Token Saver works when Tier 1 returns 429", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    // Simulate Anthropic / OpenAI / DeepSeek rate limit on first provider, success on Groq!
    if (String(url).includes("deepseek")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
    }
    if (String(url).includes("groq")) {
      return new Response(
        JSON.stringify({
          id: "chatcmpl-groq-ok",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "Fallback berhasil!" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("Unexpected upstream", { status: 500 });
  };

  try {
    const env = {
      ROUTER_KV: createMockKv(),
      ROUTER_API_KEY: "sk-9r-opencode-123",
      DEEPSEEK_API_KEY: "ds-limited-key",
      GROQ_API_KEY: "groq-working-key"
    };

    const hugeToolOutput = "\x1b[32mLINE\x1b[0m\n".repeat(4000);
    const chatRes = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer sk-9r-opencode-123"
        },
        body: JSON.stringify({
          model: "9router/auto",
          messages: [
            { role: "user", content: "Run grep" },
            {
              role: "assistant",
              content: "",
              tool_calls: [{ id: "call_1", type: "function", function: { name: "grep", arguments: "{}" } }]
            },
            { role: "tool", tool_call_id: "call_1", content: hugeToolOutput },
            { role: "assistant", content: "Checking..." },
            { role: "user", content: "Summarize" },
            { role: "user", content: "Continue" },
            { role: "user", content: "Final step" },
            { role: "user", content: "Now answer" }
          ]
        })
      }),
      env
    );

    assert.equal(chatRes.status, 200);
    assert.equal(chatRes.headers.get("x-9router-provider"), "groq");
    assert.equal(chatRes.headers.get("x-9router-attempts"), "2");
    assert.ok(Number(chatRes.headers.get("x-9router-rtk-saved-chars")) > 1000, "RTK should compress huge old tool output");

    const json = await chatRes.json();
    assert.equal(json.choices[0].message.content, "Fallback berhasil!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("4. Anthropic streaming SSE + tool_use translates cleanly to OpenAI delta.tool_calls for OpenCode", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).includes("api.anthropic.com/v1/messages"));
    const sentBody = JSON.parse(init.body);
    assert.equal(sentBody.tools[0].name, "read_file");

    const ssePayload = [
      `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { id: "msg_123", usage: { input_tokens: 42 } } })}\n\n`,
      `event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "toolu_abc", name: "read_file" } })}\n\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"path":"src/index.ts"}' } })}\n\n`,
      `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 15 } })}\n\n`,
      `event: message_stop\ndata: {"type":"message_stop"}\n\n`
    ].join("");

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    });
  };

  try {
    const env = {
      ROUTER_KV: createMockKv(),
      ROUTER_API_KEY: "sk-9r-opencode-123",
      ANTHROPIC_API_KEY: "sk-ant-test"
    };

    const res = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer sk-9r-opencode-123"
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-5",
          stream: true,
          messages: [{ role: "user", content: "Read src/index.ts" }],
          tools: [
            {
              type: "function",
              function: {
                name: "read_file",
                description: "Read a file",
                parameters: { type: "object", properties: { path: { type: "string" } } }
              }
            }
          ]
        })
      }),
      env
    );

    assert.equal(res.status, 200);
    const rawSse = await res.text();
    assert.ok(rawSse.includes('"tool_calls"'));
    assert.ok(rawSse.includes('"read_file"'));
    assert.ok(rawSse.includes('\\"path\\":\\"src/index.ts\\"'));
    assert.ok(rawSse.includes('"finish_reason":"tool_calls"'));
    assert.ok(rawSse.includes("data: [DONE]"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("5. Antigravity Multi-Account OAuth connection + instant 429 account switch + _ide tool uncloaking", async () => {
  const originalFetch = globalThis.fetch;
  const mockKv = createMockKv();
  const env = {
    ROUTER_KV: mockKv,
    ADMIN_PASSWORD: "admin-secret",
    ROUTER_API_KEY: "sk-9r-opencode-123"
  };

  let tokenSeq = 0;
  const agEnvelopesSeen = [];

  globalThis.fetch = async (url, init) => {
    const u = String(url);

    // 1. Mock Google OAuth token exchange
    if (u === "https://oauth2.googleapis.com/token") {
      tokenSeq += 1;
      return new Response(
        JSON.stringify({
          access_token: `ya29.acc_${tokenSeq}`,
          refresh_token: `1//0g_refresh_${tokenSeq}`,
          expires_in: 3600
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Mock Google UserInfo
    if (u.startsWith("https://www.googleapis.com/oauth2/v1/userinfo")) {
      const auth = init?.headers?.Authorization || init?.headers?.authorization || "";
      const email = auth.includes("acc_1") ? "akun.pertama@gmail.com" : "akun.kedua@gmail.com";
      return new Response(JSON.stringify({ email }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    // 3. Mock Cloud Code loadCodeAssist & onboardUser
    if (u.includes("v1internal:loadCodeAssist")) {
      const auth = init?.headers?.Authorization || "";
      const proj = auth.includes("acc_1") ? "ag-proj-satu" : "ag-proj-dua";
      return new Response(
        JSON.stringify({
          cloudaicompanionProject: { id: proj },
          allowedTiers: [{ id: "free-tier", isDefault: true }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (u.includes("v1internal:onboardUser")) {
      return new Response(JSON.stringify({ done: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    // 4. Mock Antigravity v1internal:generateContent
    if (u.includes("daily-cloudcode-pa.googleapis.com/v1internal:generateContent")) {
      const auth = init?.headers?.Authorization || "";
      const sentEnvelope = JSON.parse(init.body);
      agEnvelopesSeen.push({ auth, sentEnvelope });

      // Account 1 hits 429 Quota Limit!
      if (auth.includes("acc_1")) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Your quota will reset after 1h30m",
              status: "RESOURCE_EXHAUSTED"
            }
          }),
          { status: 429, headers: { "content-type": "application/json" } }
        );
      }

      // Account 2 succeeds and calls cloaked tool `bash_ide`!
      return new Response(
        JSON.stringify({
          response: {
            responseId: "ag_resp_999",
            candidates: [
              {
                content: {
                  parts: [
                    { text: "Memeriksa direktori kerja...", thought: true, thoughtSignature: "sig_test_123" },
                    {
                      functionCall: {
                        id: "call_ag_1",
                        name: "bash_ide",
                        args: { command: "ls -la" }
                      }
                    }
                  ]
                },
                finishReason: "STOP"
              }
            ],
            usageMetadata: { promptTokenCount: 55, candidatesTokenCount: 18, totalTokenCount: 73 }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(`Unexpected URL: ${u}`, { status: 500 });
  };

  try {
    // Step A: Connect Account #1 via pasted localhost callback URL
    const ex1 = await worker.fetch(
      new Request("https://9router.example.workers.dev/api/admin/oauth/antigravity/exchange", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": "admin-secret"
        },
        body: JSON.stringify({
          callbackInput: "http://localhost:8085/callback?code=4%2F0AeanS0_kode_akun_1&scope=email"
        })
      }),
      env
    );
    assert.equal(ex1.status, 200);
    const ex1Json = await ex1.json();
    assert.equal(ex1Json.account.email, "akun.pertama@gmail.com");
    assert.equal(ex1Json.account.projectId, "ag-proj-satu");

    // Step B: Connect Account #2 via pasted localhost callback URL
    const ex2 = await worker.fetch(
      new Request("https://9router.example.workers.dev/api/admin/oauth/antigravity/exchange", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": "admin-secret"
        },
        body: JSON.stringify({
          callbackInput: "http://localhost:8085/callback?code=4%2F0AeanS0_kode_akun_2&scope=email"
        })
      }),
      env
    );
    assert.equal(ex2.status, 200);
    const ex2Json = await ex2.json();
    assert.equal(ex2Json.account.email, "akun.kedua@gmail.com");

    // Step C: Call /v1/chat/completions on antigravity/claude-sonnet-5-5-high
    // Account #1 returns 429 -> Router MUST automatically switch to Account #2!
    const chatRes = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer sk-9r-opencode-123"
        },
        body: JSON.stringify({
          model: "antigravity/claude-sonnet-5-5-high",
          messages: [
            { role: "system", content: "You are OpenCode, an interactive CLI coding agent." },
            { role: "user", content: "Cek isi folder saat ini" }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "bash",
                description: "Execute shell command",
                parameters: {
                  type: "object",
                  additionalProperties: false,
                  properties: { command: { type: "string" } },
                  required: ["command"]
                }
              }
            }
          ]
        })
      }),
      env
    );

    assert.equal(chatRes.status, 200);
    assert.equal(chatRes.headers.get("x-9router-provider"), "antigravity");
    assert.equal(chatRes.headers.get("x-9router-attempts"), "2");
    assert.equal(chatRes.headers.get("x-9router-account"), "aku***@gmail.com");

    const chatJson = await chatRes.json();
    assert.equal(chatJson.choices[0].finish_reason, "tool_calls");
    assert.equal(chatJson.choices[0].message.reasoning_content, "Memeriksa direktori kerja...");
    // Verify `bash_ide` was uncloaked back to `bash` for OpenCode!
    assert.equal(chatJson.choices[0].message.tool_calls[0].function.name, "bash");
    assert.equal(chatJson.choices[0].message.tool_calls[0].function.arguments, '{"command":"ls -la"}');

    // Verify anti-429 envelope protections sent to Antigravity upstream
    const sent = agEnvelopesSeen[0].sentEnvelope;
    assert.equal(sent.model, "claude-sonnet-5-5-high");
    assert.equal(sent.requestType, undefined, "requestType MUST be omitted on chat requests");
    assert.ok(
      !sent.request.systemInstruction.parts[0].text.toLowerCase().includes("opencode"),
      "OpenCode branding in system prompt must be rewritten to Antigravity"
    );
    assert.equal(sent.request.tools[0].functionDeclarations[0].name, "bash_ide");

    // Step D: Next request should immediately use healthy Account #2 (attempts === 1) because Account #1 is on cooldown!
    const chatRes2 = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer sk-9r-opencode-123"
        },
        body: JSON.stringify({
          model: "9router/auto",
          messages: [{ role: "user", content: "Lanjutkan" }]
        })
      }),
      env
    );
    assert.equal(chatRes2.status, 200);
    assert.equal(chatRes2.headers.get("x-9router-attempts"), "1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("6. Paid-Tier Antigravity model (gemini-4-argon-high) returning 404 on Free Tier auto-fallbacks to gemini-3.8-flash-high without cooldown", async () => {
  const originalFetch = globalThis.fetch;
  const mockKv = createMockKv();
  const env = {
    ROUTER_KV: mockKv,
    ADMIN_PASSWORD: "admin-secret",
    ROUTER_API_KEY: "sk-9r-opencode-123"
  };

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === "https://oauth2.googleapis.com/token") {
      return new Response(
        JSON.stringify({
          access_token: "ya29.free_tier_1",
          refresh_token: "1//0g_free_tier_1",
          expires_in: 3600
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (u.startsWith("https://www.googleapis.com/oauth2/v1/userinfo")) {
      return new Response(JSON.stringify({ email: "freeuser@gmail.com" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    if (u.includes("v1internal:loadCodeAssist")) {
      return new Response(
        JSON.stringify({
          cloudaicompanionProject: { id: "aicode-consumers" },
          allowedTiers: [{ id: "free-tier", isDefault: true }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (u.includes("daily-cloudcode-pa.googleapis.com/v1internal:generateContent")) {
      const sent = JSON.parse(init.body);
      if (sent.model === "gemini-4-argon-high") {
        return new Response(
          JSON.stringify({
            error: { code: 404, message: "Requested entity was not found.", status: "NOT_FOUND" }
          }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }
      if (sent.model === "gemini-3.8-flash-high") {
        return new Response(
          JSON.stringify({
            response: {
              responseId: "ag_fb_ok",
              candidates: [
                {
                  content: { parts: [{ text: "Dijawab oleh Gemini 3.8 Flash High!" }] },
                  finishReason: "STOP"
                }
              ],
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8, totalTokenCount: 18 }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
    }
    return new Response(`Unexpected URL: ${u}`, { status: 500 });
  };

  try {
    await worker.fetch(
      new Request("https://9router.example.workers.dev/api/admin/oauth/antigravity/exchange", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": "admin-secret" },
        body: JSON.stringify({ callbackInput: "http://localhost:8085/callback?code=4%2F0Afree_code" })
      }),
      env
    );

    const res = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer sk-9r-opencode-123" },
        body: JSON.stringify({
          model: "antigravity/gemini-4-argon-high",
          messages: [{ role: "user", content: "Tes fallback otomatis" }]
        })
      }),
      env
    );

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-9router-model"), "gemini-3.8-flash-high");
    assert.equal(res.headers.get("x-9router-tier-fallback"), "gemini-4-argon-high->gemini-3.8-flash-high");
    const json = await res.json();
    assert.equal(json.choices[0].message.content, "Dijawab oleh Gemini 3.8 Flash High!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("7. Web Dashboard Responsive CSS, All 7 Tabs, Account Reorder & Clean OpenCode Filter", async () => {
  const env = {
    ROUTER_KV: createMockKv(),
    ADMIN_PASSWORD: "admin-secret",
    ROUTER_API_KEY: "sk-9r-opencode-123"
  };

  // 1. Check root HTML has responsive mobile CSS & all 7 tabs
  const htmlRes = await worker.fetch(new Request("https://9router.example.workers.dev/"), env);
  assert.equal(htmlRes.status, 200);
  const html = await htmlRes.text();
  assert.ok(html.includes("@media (max-width: 768px)"), "Must include mobile responsive CSS");
  assert.ok(html.includes('id="tab-dashboard"'), "Must include Dashboard tab");
  assert.ok(html.includes('id="tab-antigravity"'), "Must include Antigravity tab");
  assert.ok(html.includes('id="tab-claude"'), "Must include Claude OAuth tab");
  assert.ok(html.includes('id="tab-opencode"'), "Must include OpenCode tab");
  assert.ok(html.includes('id="tab-providers"'), "Must include Providers tab");
  assert.ok(html.includes('id="tab-combos"'), "Must include Combos tab");
  assert.ok(html.includes('id="tab-keys"'), "Must include Client Keys tab");
  assert.ok(html.includes('id="tab-playground"'), "Must include Playground tab");
  assert.ok(html.includes("touchstart"), "Must support mobile touch drag-and-drop");

  // 2. Check Claude OAuth authorize endpoint
  const claudeAuthRes = await worker.fetch(
    new Request("https://9router.example.workers.dev/api/admin/oauth/claude/authorize", {
      headers: { "x-admin-password": "admin-secret" }
    }),
    env
  );
  assert.equal(claudeAuthRes.status, 200);
  const claudeAuthJson = await claudeAuthRes.json();
  assert.equal(claudeAuthJson.ok, true);
  assert.ok(claudeAuthJson.authUrl.startsWith("https://claude.ai/oauth/authorize"));
  assert.ok(claudeAuthJson.codeVerifier.length > 20);

  // 3. Seed 2 Antigravity accounts via state and test batch drag-and-drop reorder
  await env.ROUTER_KV.put(
    "9router:state:v1",
    JSON.stringify({
      settings: { rtkEnabled: true, rtkMaxToolChars: 12000, cavemanMode: "off", timeoutMs: 90000, requireAuth: true },
      providers: {},
      combos: [],
      clientKeys: [{ id: "k1", name: "Main Key", key: "sk-9r-opencode-123", createdAt: new Date().toISOString(), enabled: true }],
      oauthAccounts: [
        { id: "acc_1", providerId: "antigravity", email: "first@gmail.com", projectId: "p1", accessToken: "t1", refreshToken: "r1", expiresAt: Date.now() + 3600000, enabled: true, createdAt: new Date().toISOString() },
        { id: "acc_2", providerId: "antigravity", email: "second@gmail.com", projectId: "p2", accessToken: "t2", refreshToken: "r2", expiresAt: Date.now() + 3600000, enabled: true, createdAt: new Date().toISOString() }
      ]
    })
  );

  // Check clean OpenCode config: only active provider (antigravity), no -low / -medium models, no unconfigured providers
  const ocCleanRes = await worker.fetch(
    new Request("https://9router.example.workers.dev/v1/opencode.json", {
      headers: { Authorization: "Bearer sk-9r-opencode-123" }
    }),
    env
  );
  const ocClean = await ocCleanRes.json();
  const ocModelKeys = Object.keys(ocClean.provider["9router"].models);
  assert.ok(ocModelKeys.includes("gemini-4-argon"));
  assert.ok(ocModelKeys.includes("gemini-3.8-flash"));
  assert.ok(!ocModelKeys.includes("gemini-3.8-flash-low"), "Should hide -low models");
  assert.ok(!ocModelKeys.includes("gemini-3.8-flash-medium"), "Should hide -medium models");
  assert.ok(!ocModelKeys.some((k) => k.startsWith("openai/")), "Should hide unconfigured openai provider");

  // Reorder accounts (acc_2 first, acc_1 second)
  const reorderRes = await worker.fetch(
    new Request("https://9router.example.workers.dev/api/admin/oauth/accounts/reorder", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-password": "admin-secret" },
      body: JSON.stringify({ providerId: "antigravity", orderedIds: ["acc_2", "acc_1"] })
    }),
    env
  );
  assert.equal(reorderRes.status, 200);

  const stateAfterRes = await worker.fetch(
    new Request("https://9router.example.workers.dev/api/admin/state", {
      headers: { "x-admin-password": "admin-secret" }
    }),
    env
  );
  const stateAfter = await stateAfterRes.json();
  assert.equal(stateAfter.config.oauthAccounts[0].email, "second@gmail.com");
  assert.equal(stateAfter.config.oauthAccounts[1].email, "first@gmail.com");

  fs.rmSync(outFile, { force: true });
});

test("8. Streamed requests without upstream usage still record estimated tokens & cost", async () => {
  const originalFetch = globalThis.fetch;
  const mockKv = createMockKv();

  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes("groq"), "Should call the Groq upstream");
    // Deliberately NO `usage` field — mimics Antigravity/Groq streaming behaviour.
    const sse = [
      `data: ${JSON.stringify({ id: "chunk-1", object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant" } }] })}\n\n`,
      `data: ${JSON.stringify({ id: "chunk-1", object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: "Halo! Ini jawaban singkat dari router." } }] })}\n\n`,
      `data: ${JSON.stringify({ id: "chunk-1", object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`,
      "data: [DONE]\n\n"
    ].join("");

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sse));
        controller.close();
      }
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    });
  };

  try {
    const env = {
      ROUTER_KV: mockKv,
      ADMIN_PASSWORD: "admin-secret",
      ROUTER_API_KEY: "sk-9r-opencode-123",
      GROQ_API_KEY: "groq-working-key"
    };

    const res = await worker.fetch(
      new Request("https://9router.example.workers.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer sk-9r-opencode-123"
        },
        body: JSON.stringify({
          model: "groq/llama-3.3-70b-versatile",
          stream: true,
          messages: [{ role: "user", content: "Sapa saya dalam satu kalimat singkat." }]
        })
      }),
      env
    );

    assert.equal(res.status, 200);
    const rawSse = await res.text();
    assert.ok(rawSse.includes("data: [DONE]"));

    const stateRes = await worker.fetch(
      new Request("https://9router.example.workers.dev/api/admin/state", {
        headers: { "x-admin-password": "admin-secret" }
      }),
      env
    );
    const state = await stateRes.json();

    assert.ok(state.stats.totalTokens > 0, "Total tokens must be > 0 for streamed requests");
    assert.ok(state.stats.totalPromptTokens > 0, "Prompt tokens must be estimated");
    assert.ok(state.stats.totalCompletionTokens > 0, "Completion tokens must be estimated");

    const latestLog = state.stats.recentLogs[0];
    assert.ok(latestLog, "A recent log entry must exist");
    assert.ok(latestLog.totalTokens > 0, "Recent log must show the captured tokens");
    assert.ok(latestLog.costUsd > 0, "Cost estimate must be recorded");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
