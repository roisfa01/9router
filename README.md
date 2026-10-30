# 9Router Edge (Cloudflare Workers) — Universal AI Agent Router untuk OpenCode

**9Router Edge** adalah gateway/router AI *serverless* berkecepatan tinggi yang dirancang khusus untuk di-deploy ke **Cloudflare Workers (100% jalan di akun Gratis!)** agar semua agen koding AI Anda (**OpenCode**, Claude Code, Cursor, Cline, Roo Code, Continue) bisa memakai **semua model AI** lewat **satu endpoint API**.

---

## ✨ Fitur Utama
- **🪐 Multi-Akun Google Antigravity OAuth (Auto-Rotasi & Pindah Akun Instan Saat Limit!)**  
  Hubungkan **banyak akun Google / Antigravity sekaligus** langsung dari Web Dashboard Cloudflare (maupun *Bulk Import* `refresh_token` / `db.json`). Saat Akun #1 terkena limit kuota (`429 RESOURCE_EXHAUSTED`), sistem otomatis menandai jam reset kuotanya dan **langsung berpindah ke Akun #2, #3, dst.** tanpa memutus eksekusi di OpenCode! Mendukung penuh `claude-sonnet-5-5-high`, `claude-opus-5-5-high`, `gemini-4-argon-high`, `gemini-3.8-flash-high`, `gemini-3.1-pro-high`, tool cloaking `_ide`, dan `thoughtSignature`.
- **🌐 19+ Provider Bawaan + Unlimited Custom Provider**  
  Mendukung Antigravity OAuth, Anthropic Claude, OpenAI (GPT & o-series), Google Gemini (AI Studio Free), OpenRouter (300+ model & `:free`), Groq, Cerebras, DeepSeek, GLM / Z.AI, Kimi (Moonshot), MiniMax, xAI Grok, Mistral/Codestral, NVIDIA NIM, GitHub Models, Together, Fireworks, OpenCode Zen, dan Cloudflare Workers AI.
- **⚡ Smart Combos (`9router/auto`, `9router/antigravity`, `9router/coding`, `9router/free`, `9router/reasoning`, `9router/fast`)**  
  Jika seluruh akun Antigravity sedang penuh limit, rute seperti `9router/auto` dan `9router/coding` bahkan bisa langsung melompat ke provider cadangan (Gemini/Groq/Cerebras/OpenRouter)!
- **🔄 Multi-Key Round-Robin & Cooldown**  
  Masukkan banyak API key per provider (1 baris = 1 key). Sistem merotasi pemakaian key secara otomatis dan mengistirahatkan sementara key yang terkena limit.
- **📉 RTK Token Saver & Caveman Mode**  
  Mengompresi output `tool` yang bengkak (`git diff`, `grep`, log terminal ANSI) pada riwayat percakapan lama sehingga menghemat **20–40% token** saat memakai OpenCode.
- **🔀 Bidirectional Format Translator (OpenAI ↔ Anthropic ↔ Antigravity/Gemini)**  
  Mendukung penuh **Streaming SSE** dan **Tool Calling (`tools` / `tool_calls`)** lintas semua model.
- **🚀 Generator `opencode.json` Otomatis di Web Dashboard**  
  Tinggal 1 klik **Copy `opencode.json`** langsung siap dipakai di OpenCode lengkap dengan ukuran *context window* (`limit.context` & `limit.output`).

---

## ☁️ Cara Deploy ke Cloudflare (Gratis!)

### Cara 1: Otomatis 1 Perintah via Terminal (Direkomendasikan)
Cara ini otomatis login ke Cloudflare, membuat database `ROUTER_KV` agar setting Dashboard tersimpan permanen, dan men-deploy Worker Anda:

> **Catatan pengguna PowerShell Windows:** Jika `npm` diblokir oleh *Execution Policy*, gunakan `npm.cmd` dan `npx.cmd` seperti di bawah ini.

```powershell
# 1. Masuk ke folder proyek & install dependency
npm.cmd install

# 2. Jalankan auto-setup KV + deploy ke Cloudflare
npm.cmd run cf:setup
```

Setelah deploy berhasil, amankan password Admin Dashboard & API Key utama Anda dengan Wrangler Secret:
```powershell
npx.cmd wrangler secret put ADMIN_PASSWORD
npx.cmd wrangler secret put ROUTER_API_KEY
```

### Cara 2: Deploy Manual Cepat (Tanpa Buat KV Terlebih Dahulu)
File [`wrangler.toml`](./wrangler.toml) sudah dirancang agar bisa langsung di-deploy tanpa error meskipun KV belum dibuat:
```powershell
npm.cmd install
npx.cmd wrangler deploy
```
Lalu masukkan API Key provider lewat **Cloudflare Dashboard → Workers & Pages → `9router-ai` → Settings → Variables and Secrets** (misal `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `ADMIN_PASSWORD`, `ROUTER_API_KEY`).

### Cara 3: Deploy Lewat GitHub + Cloudflare Dashboard (Tanpa CLI)
1. Upload / push folder proyek ini ke repositori GitHub Anda.
2. Buka **Cloudflare Dashboard → Workers & Pages → Create → Import a repository**.
3. Pilih repo ini, biarkan *Build command* kosong dan *Deploy command* `npx wrangler deploy`, lalu klik **Deploy**.
4. Di menu **Settings → Bindings**, tambahkan **KV Namespace** dengan nama variabel **`ROUTER_KV`** agar perubahan di Web Dashboard tersimpan permanen.

---

## 🖥️ Cara Setting & Mengambil API ke OpenCode

### Langkah 1: Buka Dashboard 9Router Anda
Buka URL hasil deploy Cloudflare Anda di browser, misalnya:
```text
https://9router-ai.nama-akun.workers.dev
```
1. Masuk ke tab **🌐 Providers & API Keys**, tempelkan API key model yang Anda miliki (misalnya API Key gratis dari Google AI Studio `GEMINI_API_KEY`, Groq, Cerebras, OpenRouter, atau DeepSeek/Claude/OpenAI), lalu klik **Simpan Semua Perubahan**.
2. Masuk ke tab **🔑 Client API Keys** untuk menyalin atau membuat key `sk-9r-...` Anda.

### Langkah 2: Pasang di OpenCode (`opencode.json`)
Buka tab pertama **🚀 Ambil API ke OpenCode** di Dashboard, klik tombol **📋 Copy `opencode.json`**, lalu simpan ke konfigurasi global OpenCode:

- **Windows:** `%USERPROFILE%\.config\opencode\opencode.json`  
  *(Contoh: `C:\Users\roisf\.config\opencode\opencode.json`)*
- **Linux / macOS:** `~/.config/opencode/opencode.json`

Contoh isi `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "9Router Edge (Cloudflare)",
      "options": {
        "baseURL": "https://9router-ai.nama-akun.workers.dev/v1",
        "apiKey": "sk-9r-api-key-anda"
      },
      "models": {
        "9router/auto": {
          "name": "⚡ 9Router Smart Auto (3-Tier Fallback)",
          "limit": { "context": 200000, "output": 32768 }
        },
        "9router/coding": {
          "name": "⚡ 9Router Pro Coding & Tool-Calling",
          "limit": { "context": 200000, "output": 64000 }
        },
        "9router/free": {
          "name": "⚡ 9Router 100% FREE Forever Pool",
          "limit": { "context": 128000, "output": 32768 }
        },
        "9router/reasoning": {
          "name": "⚡ 9Router Deep Reasoning / Architect",
          "limit": { "context": 200000, "output": 64000 }
        }
      }
    }
  },
  "model": "9router/9router/auto"
}
```

**Atau tarik langsung `opencode.json` lewat PowerShell dengan 1 perintah:**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode" | Out-Null
Invoke-RestMethod -Uri "https://9router-ai.nama-akun.workers.dev/v1/opencode.json" -Headers @{ Authorization = "Bearer sk-9r-api-key-anda" } | ConvertTo-Json -Depth 10 | Set-Content "$env:USERPROFILE\.config\opencode\opencode.json"
```

### Langkah 3: Jalankan OpenCode!
Buka terminal di proyek mana pun, ketik:
```bash
opencode
```
Lalu ketik `/models` di dalam OpenCode untuk memilih `9router/auto`, `9router/coding`, `9router/free`, atau model spesifik seperti `gemini/gemini-2.5-pro`, `anthropic/claude-sonnet-4-5`, `deepseek/deepseek-chat`, `groq/moonshotai/kimi-k2-instruct`, dll.!

---

## 🛠️ Daftar Endpoint API yang Tersedia

| Endpoint | Fungsi | Kompatibilitas |
|---|---|---|
| `GET /` | Web Dashboard UI (Kelola Provider, Key, Combo, Playground) | Browser |
| `GET /v1/models` | Daftar semua Combo & Model aktif | OpenCode, Cursor, Cline, OpenAI SDK |
| `POST /v1/chat/completions` | Chat, Streaming SSE, & Tool Calling | OpenCode (`@ai-sdk/openai-compatible`), Cursor, Cline, Roo |
| `POST /v1/messages` | Anthropic Messages API (Streaming & Tool Use) | Claude Code CLI, Anthropic SDK |
| `POST /v1/responses` | OpenAI Responses API | Codex CLI / OpenAI SDK v5 |
| `POST /v1/embeddings` | Vektor Embeddings | Codebase Indexing / RAG |
| `GET /v1/opencode.json` | Unduh konfigurasi `opencode.json` otomatis | CLI / Script |
| `GET /health` | Cek status Worker & jumlah provider aktif | Monitoring |

---

## 🧪 Menjalankan Secara Lokal sebelum Deploy
```powershell
Copy-Item .dev.vars.example .dev.vars
npm.cmd run dev
```
Dashboard lokal akan terbuka di `http://localhost:20128` dan API di `http://localhost:20128/v1`.
