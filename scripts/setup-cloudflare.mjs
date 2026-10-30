#!/usr/bin/env node
/**
 * Script Otomatis Deploy 9Router ke Cloudflare Workers + KV Storage
 * Jalankan dengan: npm.cmd run cf:setup
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const wranglerPath = path.join(rootDir, "wrangler.toml");
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

function run(cmd, inherit = false) {
  return execSync(cmd, {
    cwd: rootDir,
    stdio: inherit ? "inherit" : ["inherit", "pipe", "pipe"],
    encoding: "utf-8"
  });
}

console.log("\n🚀 [1/3] Memeriksa login Cloudflare Wrangler...");
let needsLogin = false;
try {
  const whoami = run(`${npxCmd} wrangler whoami`);
  if (/not authenticated/i.test(whoami)) {
    needsLogin = true;
  } else {
    console.log(whoami.trim());
  }
} catch {
  needsLogin = true;
}

if (needsLogin) {
  console.log("⚠️ Belum login Cloudflare. Membuka browser untuk login...");
  run(`${npxCmd} wrangler login`, true);
}

let toml = fs.readFileSync(wranglerPath, "utf-8");

// Cek apakah blok aktif [[kv_namespaces]] (bukan yang di-comment `#`) sudah ada
const hasActiveKv = /^\s*\[\[kv_namespaces\]\]/m.test(toml);

if (!hasActiveKv) {
  console.log("\n📦 [2/3] Membuat Cloudflare KV Namespace `ROUTER_KV` untuk penyimpanan permanen Dashboard...");
  let kvId = null;

  try {
    const out = run(`${npxCmd} wrangler kv namespace create ROUTER_KV`);
    console.log(out);
    const idMatch = out.match(/id\s*=\s*"([a-f0-9]{20,})"/i) || out.match(/"id"\s*:\s*"([a-f0-9]{20,})"/i);
    if (idMatch && idMatch[1]) {
      kvId = idMatch[1];
    }
  } catch {
    // Jika namespace bernama ROUTER_KV sudah pernah dibuat sebelumnya, cari lewat `kv namespace list`
    try {
      const listJson = run(`${npxCmd} wrangler kv namespace list`);
      const parsed = JSON.parse(listJson);
      if (Array.isArray(parsed)) {
        const found = parsed.find((ns) => /ROUTER_KV/i.test(ns.title || ""));
        if (found && found.id) {
          kvId = found.id;
        }
      }
    } catch {
      // Abaikan jika gagal parse
    }
  }

  if (kvId) {
    toml += `\n[[kv_namespaces]]\nbinding = "ROUTER_KV"\nid = "${kvId}"\n`;
    fs.writeFileSync(wranglerPath, toml, "utf-8");
    console.log(`✅ Berhasil menghubungkan ROUTER_KV (id: ${kvId}) ke wrangler.toml!`);
  } else {
    console.log("ℹ️ Melanjutkan deploy tanpa KV sementara (tetap jalan normal).");
  }
} else {
  console.log("\n✅ [2/3] ROUTER_KV sudah aktif terkonfigurasi di wrangler.toml.");
}

console.log("\n☁️ [3/3] Melakukan Deploy 9Router Edge ke Cloudflare Workers...");
run(`${npxCmd} wrangler deploy`, true);

console.log("\n🎉 SELESAI! Buka URL `https://9router-ai.<subdomain>.workers.dev` yang muncul di atas untuk:");
console.log("   1. Isi API Key provider di tab 'Providers & API Keys'");
console.log("   2. Klik 'Copy opencode.json' di tab pertama untuk langsung dipakai di OpenCode!\n");
