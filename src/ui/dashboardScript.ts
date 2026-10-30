// Dashboard client-side logic. Extracted from dashboard.ts to keep files manageable.
export const DASHBOARD_SCRIPT = `
    var currentData = null;
    var lastOpenCodeConfig = null;
    var cachedAgRedirectUri = "http://localhost:8085/callback";
    var cachedClaudeVerifier = "";
    var cachedClaudeState = "";
    var draggedRow = null;
    var loginAttempts = 0;
    var loginCooldownUntil = 0;

    var THEME_KEY = "9router_theme";
    var PAGE_META = {
      dashboard: "Dashboard",
      antigravity: "Antigravity",
      claude: "Claude.ai",
      opencode: "Integrasi OpenCode",
      providers: "Provider & API",
      combos: "Smart Combos",
      keys: "Client API Keys",
      playground: "Live Playground"
    };

    function getAdminPass() {
      return localStorage.getItem("9router_admin_pass") || "";
    }

    function applyTheme(theme) {
      var t = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.remove("dark");
      if (t === "dark") document.documentElement.classList.add("dark");
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    }

    function initTheme() {
      var saved = "";
      try { saved = localStorage.getItem(THEME_KEY) || ""; } catch (e) {}
      if (!saved) {
        saved = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
      }
      applyTheme(saved);
    }

    function toggleTheme() {
      var cur = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(cur === "dark" ? "light" : "dark");
    }

    function showToast(msg) {
      var el = document.getElementById("toast");
      if (!el) return;
      el.textContent = msg;
      el.classList.add("show");
      if (showToast._timer) clearTimeout(showToast._timer);
      showToast._timer = setTimeout(function() { el.classList.remove("show"); }, 3500);
    }

    function openSidebar() {
      document.getElementById("appSidebar").classList.add("open");
      document.getElementById("sidebarBackdrop").classList.add("visible");
      document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
      document.getElementById("appSidebar").classList.remove("open");
      document.getElementById("sidebarBackdrop").classList.remove("visible");
      document.body.style.overflow = "";
    }

    function togglePwEye() {
      var inp = document.getElementById("adminPassInput");
      var btn = document.getElementById("pwEyeBtn");
      var use = btn ? btn.querySelector("use") : null;
      if (inp.type === "password") {
        inp.type = "text";
        if (use) use.setAttribute("href", "#i-eye-off");
        btn.title = "Sembunyikan password";
      } else {
        inp.type = "password";
        if (use) use.setAttribute("href", "#i-eye");
        btn.title = "Tampilkan password";
      }
    }

    function switchTab(name, btn) {
      var panels = document.querySelectorAll(".panel");
      for (var i = 0; i < panels.length; i++) panels[i].classList.remove("active");
      var btns = document.querySelectorAll(".tab-btn");
      for (var j = 0; j < btns.length; j++) btns[j].classList.remove("active");

      var targetPanel = document.getElementById("tab-" + name);
      if (targetPanel) targetPanel.classList.add("active");

      if (btn) {
        btn.classList.add("active");
      } else {
        var matchedBtn = document.getElementById("tabBtn-" + name);
        if (matchedBtn) matchedBtn.classList.add("active");
      }

      var titleEl = document.getElementById("pageTitle");
      if (titleEl) titleEl.textContent = PAGE_META[name] || "Dashboard";

      closeSidebar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showLoginError(msg) {
      var errEl = document.getElementById("loginError");
      errEl.textContent = msg;
      errEl.style.display = "block";
      var box = document.getElementById("loginBox");
      box.classList.remove("shake");
      void box.offsetWidth;
      box.classList.add("shake");
      setTimeout(function() { box.classList.remove("shake"); }, 400);
    }

    function hideLoginError() {
      document.getElementById("loginError").style.display = "none";
    }

    function showLoginScreen() {
      var modal = document.getElementById("loginModal");
      modal.classList.add("visible");
      hideLoginError();
      setTimeout(function() {
        var inp = document.getElementById("adminPassInput");
        if (inp) inp.focus();
      }, 100);
    }

    function hideLoginScreen() {
      document.getElementById("loginModal").classList.remove("visible");
    }

    async function submitLogin() {
      var now = Date.now();
      if (now < loginCooldownUntil) {
        var secLeft = Math.ceil((loginCooldownUntil - now) / 1000);
        showLoginError("Terlalu banyak percobaan. Coba lagi dalam " + secLeft + " detik.");
        return;
      }

      var val = document.getElementById("adminPassInput").value.trim();
      if (!val) {
        showLoginError("Masukkan password terlebih dahulu.");
        return;
      }

      var btn = document.getElementById("loginBtn");
      btn.disabled = true;
      btn.innerHTML = '<svg class="ic"><use href="#i-refresh"></use></svg> Memverifikasi...';

      // Verify against backend (dry-run the /api/admin/state with this password)
      try {
        var res = await fetch("/api/admin/state", {
          headers: { "x-admin-password": val }
        });
        if (res.status === 401) {
          loginAttempts++;
          if (loginAttempts >= 5) {
            loginCooldownUntil = Date.now() + 30000;
            loginAttempts = 0;
            showLoginError("Terlalu banyak percobaan gagal. Tunggu 30 detik.");
          } else {
            showLoginError("Password salah. Sisa percobaan: " + (5 - loginAttempts));
          }
          btn.disabled = false;
          btn.innerHTML = '<svg class="ic"><use href="#i-lock"></use></svg> Masuk Dashboard';
          return;
        }
        // Success
        loginAttempts = 0;
        localStorage.setItem("9router_admin_pass", val);
        hideLoginScreen();
        var data = await res.json();
        currentData = data;
        renderAll();
        await refreshOpenCodePreview();
      } catch(e) {
        showLoginError("Gagal terhubung ke server. Coba lagi.");
        btn.disabled = false;
        btn.innerHTML = '<svg class="ic"><use href="#i-lock"></use></svg> Masuk Dashboard';
        return;
      }

      btn.disabled = false;
      btn.innerHTML = '<svg class="ic"><use href="#i-lock"></use></svg> Masuk Dashboard';
    }

    function logoutAdmin() {
      localStorage.removeItem("9router_admin_pass");
      document.getElementById("adminPassInput").value = "";
      showLoginScreen();
    }

    async function apiFetch(path, opts) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      opts.headers["x-admin-password"] = getAdminPass();
      if (opts.body && !opts.headers["content-type"]) {
        opts.headers["content-type"] = "application/json";
      }
      var res = await fetch(path, opts);
      if (res.status === 401) {
        showLoginScreen();
        throw new Error("Unauthorized");
      }
      return res;
    }

    async function loadAdminData() {
      var origin = window.location.origin;
      document.getElementById("endpointBadge").textContent = "Base URL: " + origin + "/v1";

      // Do not wipe form edits while the admin is typing in provider/combo inputs
      var active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
        var inEditor = active.closest && active.closest("#tab-providers, #tab-combos");
        if (inEditor) return;
      }

      var savedPass = getAdminPass();
      if (!savedPass) {
        showLoginScreen();
        return;
      }

      try {
        var res = await apiFetch("/api/admin/state");
        var data = await res.json();
        currentData = data;
        renderAll();
        await refreshOpenCodePreview();
      } catch (e) {
        // Modal will open on 401 via apiFetch
      }
    }

    function renderAll() {
      if (!currentData) return;
      var cfg = currentData.config;
      var stats = currentData.stats;

      var sb = document.getElementById("storageBadge");
      if (cfg.storageMode === "d1-kv") {
        sb.className = "badge ok";
        sb.innerHTML = '<span class="dot"></span><span>D1 SQLite + KV</span>';
      } else if (cfg.storageMode === "kv") {
        sb.className = "badge ok";
        sb.innerHTML = '<span class="dot"></span><span>Cloudflare KV</span>';
      } else {
        sb.className = "badge warn";
        sb.innerHTML = '<span class="dot"></span><span>Memori Sementara</span>';
      }

      var agAccounts = [];
      var claudeAccounts = [];
      var allOAuth = cfg.oauthAccounts || [];
      for (var oa = 0; oa < allOAuth.length; oa++) {
        if (allOAuth[oa].providerId === "claude") {
          claudeAccounts.push(allOAuth[oa]);
        } else {
          agAccounts.push(allOAuth[oa]);
        }
      }

      var activeAg = 0;
      for (var a = 0; a < agAccounts.length; a++) {
        if (agAccounts[a].enabled) activeAg++;
      }
      var activeClaude = 0;
      for (var c = 0; c < claudeAccounts.length; c++) {
        if (claudeAccounts[c].enabled) activeClaude++;
      }

      var readyCount = 0;
      for (var i = 0; i < cfg.providers.length; i++) {
        if (cfg.providers[i].ready) readyCount++;
      }

      var periodFilter = document.getElementById("statsPeriodFilter") ? document.getElementById("statsPeriodFilter").value : "all";
      var displayRequests = stats.totalRequests || 0;
      var displayTokens = stats.totalTokens || 0;
      var displayPrompt = stats.totalPromptTokens || 0;
      var displayCompl = stats.totalCompletionTokens || 0;
      var displayCost = stats.totalCostUsd || 0;

      var todayStr = new Date().toISOString().slice(0, 10);
      var yesterdayDate = new Date(Date.now() - 86400000);
      var yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

      if (periodFilter === "today") {
        var tBucket = (stats.byDate && stats.byDate[todayStr]) || { requests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };
        displayRequests = tBucket.requests || 0;
        displayTokens = tBucket.totalTokens || 0;
        displayPrompt = tBucket.promptTokens || 0;
        displayCompl = tBucket.completionTokens || 0;
        displayCost = tBucket.costUsd || 0;
      } else if (periodFilter === "yesterday") {
        var yBucket = (stats.byDate && stats.byDate[yesterdayStr]) || { requests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };
        displayRequests = yBucket.requests || 0;
        displayTokens = yBucket.totalTokens || 0;
        displayPrompt = yBucket.promptTokens || 0;
        displayCompl = yBucket.completionTokens || 0;
        displayCost = yBucket.costUsd || 0;
      } else if (periodFilter === "7d" || periodFilter === "30d" || periodFilter === "60d" || periodFilter === "90d") {
        var numDays = parseInt(periodFilter, 10) || 7;
        var nowMs = Date.now();
        var byDate = stats.byDate || {};
        displayRequests = 0;
        displayTokens = 0;
        displayPrompt = 0;
        displayCompl = 0;
        displayCost = 0;
        for (var dIdx = 0; dIdx < numDays; dIdx++) {
          var dayKey = new Date(nowMs - dIdx * 86400000).toISOString().slice(0, 10);
          var b = byDate[dayKey];
          if (b) {
            displayRequests += (b.requests || 0);
            displayTokens += (b.totalTokens || 0);
            displayPrompt += (b.promptTokens || 0);
            displayCompl += (b.completionTokens || 0);
            displayCost += (b.costUsd || 0);
          }
        }
      }

      var costText = displayCost > 0 && displayCost < 1 ? displayCost.toFixed(4) : displayCost.toFixed(2);
      document.getElementById("statCostSaved").textContent = "$" + costText;
      document.getElementById("statAgAccounts").textContent = activeAg + " Akun";
      document.getElementById("badgeNavAg").textContent = String(activeAg);
      document.getElementById("badgeNavClaude").textContent = String(activeClaude);
      document.getElementById("statReadyProviders").textContent = readyCount + " / " + cfg.providers.length;
      document.getElementById("statTotalRequests").textContent = displayRequests.toLocaleString();
      document.getElementById("statTotalTokens").textContent = displayTokens.toLocaleString();
      document.getElementById("statTokensSplit").textContent = displayPrompt.toLocaleString() + " / " + displayCompl.toLocaleString();
      document.getElementById("statFallbacks").textContent = (stats.totalFallbacks || 0).toLocaleString();
      document.getElementById("statRtkSaved").textContent = (stats.totalRtkSavedChars || 0).toLocaleString();

      var avgTokens = displayRequests > 0 ? (displayTokens / displayRequests) : 0;
      var avgDisplay = avgTokens >= 100 ? Math.round(avgTokens).toLocaleString() : String(Math.round(avgTokens * 10) / 10);
      var avgEl = document.getElementById("statAvgTokens");
      if (avgEl) avgEl.textContent = avgDisplay;
      var heroReq = document.getElementById("heroRequests");
      if (heroReq) heroReq.textContent = displayRequests.toLocaleString();
      var heroTok = document.getElementById("heroTokens");
      if (heroTok) heroTok.textContent = displayTokens.toLocaleString();
      var heroProv = document.getElementById("heroProviders");
      if (heroProv) heroProv.textContent = readyCount + " / " + cfg.providers.length;
      var agPage = document.getElementById("agPageBadge");
      if (agPage) agPage.textContent = activeAg + " akun aktif";
      var clPage = document.getElementById("claudePageBadge");
      if (clPage) clPage.textContent = activeClaude + " akun aktif";
      var keyBadge = document.getElementById("keysSummaryBadge");
      if (keyBadge) keyBadge.innerHTML = '<span class="dot"></span> ' + ((cfg.clientKeys && cfg.clientKeys.length) || 0) + ' key';

      renderActivityChart(stats, periodFilter);

      document.getElementById("settingRtkEnabled").value = String(cfg.settings.rtkEnabled);
      document.getElementById("settingRtkMaxChars").value = cfg.settings.rtkMaxToolChars;
      document.getElementById("settingCaveman").value = cfg.settings.cavemanMode;
      document.getElementById("settingRequireAuth").value = String(cfg.settings.requireAuth);

      renderAntigravityAccounts(agAccounts);
      renderClaudeAccounts(claudeAccounts);
      renderProviders(cfg.providers);
      renderCombos(cfg.combos);
      renderClientKeys(cfg.clientKeys, stats.byKey || {});
      renderPlaygroundModels(cfg);
      renderKeysStats(stats.byKey || {});
      renderModelsStats(stats.byModel || {});

      var logsToRender = stats.recentLogs || [];
      if (periodFilter === "today") {
        logsToRender = logsToRender.filter(function(l) { return l.timestamp && l.timestamp.slice(0, 10) === todayStr; });
      } else if (periodFilter === "yesterday") {
        logsToRender = logsToRender.filter(function(l) { return l.timestamp && l.timestamp.slice(0, 10) === yesterdayStr; });
      } else if (periodFilter === "7d" || periodFilter === "30d" || periodFilter === "60d" || periodFilter === "90d") {
        var cutoffMs = Date.now() - (parseInt(periodFilter, 10) * 86400000);
        logsToRender = logsToRender.filter(function(l) { return l.timestamp && new Date(l.timestamp).getTime() >= cutoffMs; });
      }
      renderLogs(logsToRender);
      renderOtherToolsSnippet(cfg);
    }

    function renderKeysStats(byKey) {
      var clientTbody = document.getElementById("clientKeysStatsTableBody");
      var oauthTbody = document.getElementById("oauthAccountsStatsTableBody");
      var keys = Object.keys(byKey || {});

      var clientItems = [];
      var oauthItems = [];

      for (var i = 0; i < keys.length; i++) {
        var item = byKey[keys[i]];
        if (item.kind === "client_api_key") {
          clientItems.push(item);
        } else {
          oauthItems.push(item);
        }
      }

      clientItems.sort(function(a, b) {
        return (b.totalTokens || 0) - (a.totalTokens || 0);
      });
      oauthItems.sort(function(a, b) {
        return (b.totalTokens || 0) - (a.totalTokens || 0);
      });

      if (clientTbody) {
        if (!clientItems.length) {
          clientTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Belum ada aktivitas request dari Client API Key.</td></tr>';
        } else {
          var cHtml = "";
          for (var ci = 0; ci < clientItems.length; ci++) {
            var cItem = clientItems[ci];
            var cCostStr = cItem.costUsd ? ('$' + cItem.costUsd.toFixed(2)) : '$0.00';
            cHtml += '<tr>' +
              '<td class="mono t-brand" style="font-weight:600;">' + escapeHtml(cItem.name || "OpenCode Key") + '</td>' +
              '<td class="mono t-dim">' + escapeHtml(cItem.keyIdOrEmail || "-") + '</td>' +
              '<td><b class="t-strong">' + (cItem.requests || 0).toLocaleString() + '</b></td>' +
              '<td class="mono">' + (cItem.promptTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono">' + (cItem.completionTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono t-purple" style="font-weight:700;">' + (cItem.totalTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono t-green" style="font-weight:700;">' + cCostStr + '</td>' +
              '<td class="mono t-dim" style="font-size:11.5px;">' + escapeHtml(formatLocalTime(cItem.lastUsedAt)) + '</td>' +
            '</tr>';
          }
          clientTbody.innerHTML = cHtml;
        }
      }

      if (oauthTbody) {
        if (!oauthItems.length) {
          oauthTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Belum ada data rotasi akun OAuth upstream.</td></tr>';
        } else {
          var oHtml = "";
          for (var oi = 0; oi < oauthItems.length; oi++) {
            var oItem = oauthItems[oi];
            var oBadge = oItem.kind === "oauth_account"
              ? '<span class="badge brand">' + escapeHtml((oItem.providerId || "antigravity").toUpperCase()) + '</span>'
              : '<span class="badge">API KEY</span>';
            var oCostStr = oItem.costUsd ? ('$' + oItem.costUsd.toFixed(2)) : '$0.00';
            oHtml += '<tr>' +
              '<td class="mono t-brand" style="font-weight:600;">' + escapeHtml(oItem.keyIdOrEmail || oItem.name) + '</td>' +
              '<td>' + oBadge + '</td>' +
              '<td><b class="t-strong">' + (oItem.requests || 0).toLocaleString() + '</b></td>' +
              '<td class="mono">' + (oItem.promptTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono">' + (oItem.completionTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono t-purple" style="font-weight:700;">' + (oItem.totalTokens || 0).toLocaleString() + '</td>' +
              '<td class="mono t-green" style="font-weight:700;">' + oCostStr + '</td>' +
              '<td class="mono t-dim" style="font-size:11.5px;">' + escapeHtml(formatLocalTime(oItem.lastUsedAt)) + '</td>' +
            '</tr>';
          }
          oauthTbody.innerHTML = oHtml;
        }
      }
    }

    function renderModelsStats(byModel) {
      var tbody = document.getElementById("modelsStatsTableBody");
      var keys = Object.keys(byModel || {});
      if (!keys.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Belum ada riwayat model. Jalankan request di OpenCode atau Live Playground!</td></tr>';
        return;
      }
      keys.sort(function(a, b) {
        return (byModel[b].totalTokens || 0) - (byModel[a].totalTokens || 0);
      });
      var html = "";
      for (var i = 0; i < keys.length; i++) {
        var m = keys[i];
        var item = byModel[m];
        var costStr = item.costUsd ? ('$' + item.costUsd.toFixed(2)) : '$0.00';

        html += '<tr>' +
          '<td class="mono t-brand" style="font-weight:600;">' + escapeHtml(m) + '</td>' +
          '<td><b class="t-strong">' + (item.requests || 0).toLocaleString() + '</b></td>' +
          '<td class="mono">' + (item.promptTokens || 0).toLocaleString() + '</td>' +
          '<td class="mono">' + (item.completionTokens || 0).toLocaleString() + '</td>' +
          '<td class="mono t-purple" style="font-weight:700;">' + (item.totalTokens || 0).toLocaleString() + '</td>' +
          '<td class="mono t-green" style="font-weight:700;">' + costStr + '</td>' +
        '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderLogs(logs) {
      var tbody = document.getElementById("logsTableBody");
      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">Belum ada trafik request.</td></tr>';
        return;
      }
      var html = "";
      for (var i = 0; i < logs.length; i++) {
        var l = logs[i];
        var ok = l.status >= 200 && l.status < 300;
        var pTok = (l.promptTokens || 0).toLocaleString();
        var cTok = (l.completionTokens || 0).toLocaleString();
        var tTok = (l.totalTokens || 0).toLocaleString();
        var tokenLabel = (l.totalTokens || l.promptTokens) ? (pTok + " / " + cTok + " (" + tTok + ")") : "-";

        var clientKeyLabel = l.clientKeyName ? (l.clientKeyName + " (" + (l.clientKeyMasked || "") + ")") : (l.clientKeyMasked || "-");
        var upAccountLabel = l.accountEmail ? l.accountEmail : (l.upstreamKeyMasked ? (l.resolvedProvider + ":" + l.upstreamKeyMasked) : "-");
        var costStr = l.costUsd ? ('$' + l.costUsd.toFixed(3)) : '$0.00';

        html += '<tr>' +
          '<td class="mono t-dim">' + escapeHtml(formatLocalTime(l.timestamp)) + '</td>' +
          '<td class="mono" style="font-size:11px;">' + escapeHtml(l.action || "chat") + '</td>' +
          '<td class="mono t-blue">' + escapeHtml(clientKeyLabel) + '</td>' +
          '<td class="mono">' + escapeHtml(l.requestedModel) + '</td>' +
          '<td class="mono">' + escapeHtml(l.resolvedProvider + "/" + l.resolvedModel) + '</td>' +
          '<td class="mono t-brand">' + escapeHtml(upAccountLabel) + '</td>' +
          '<td class="mono t-purple">' + escapeHtml(tokenLabel) + '</td>' +
          '<td class="mono t-green" style="font-weight:700;">' + costStr + '</td>' +
          '<td><span class="badge ' + (ok ? 'ok' : 'danger') + '">' + l.status + '</span></td>' +
          '<td class="mono">' + l.attempts + '</td>' +
          '<td class="mono">' + l.latencyMs + ' ms</td>' +
        '</tr>';
      }
      tbody.innerHTML = html;
    }

    async function exportStatsFile(format) {
      try {
        var period = document.getElementById("statsPeriodFilter") ? document.getElementById("statsPeriodFilter").value : "all";
        var res = await apiFetch("/api/admin/stats/export?format=" + format + "&period=" + encodeURIComponent(period));
        var blob = await res.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "9router-stats-" + period + "-" + new Date().toISOString().slice(0, 10) + "." + format;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("✅ File export " + format.toUpperCase() + " (" + period + ") berhasil diunduh!");
      } catch (err) {
        showToast("Gagal export file: " + err.message);
      }
    }

    async function confirmResetStats() {
      if (!confirm("PERINGATAN: Apakah Anda yakin ingin mereset seluruh hitungan token, request, dan log kembali ke 0?")) return;
      try {
        var res = await apiFetch("/api/admin/stats/reset", { method: "POST" });
        var data = await res.json();
        if (data.ok) {
          showToast("✅ Seluruh riwayat statistik berhasil direset ke 0!");
          await loadAdminData();
        }
      } catch (err) {
        showToast("Gagal reset statistik: " + err.message);
      }
    }

    async function fetchAntigravityAuthUrl() {
      var res = await apiFetch("/api/admin/oauth/antigravity/authorize");
      var data = await res.json();
      if (!res.ok || !data.authUrl) throw new Error(data.error || "Gagal membuat URL login Google");
      cachedAgRedirectUri = data.redirectUri || "http://localhost:8085/callback";
      return data.authUrl;
    }

    async function openAntigravityGoogleLogin() {
      try {
        var authUrl = await fetchAntigravityAuthUrl();
        window.open(authUrl, "_blank", "noopener,noreferrer");
        showToast("Halaman login Google dibuka! Setelah klik Allow, copy URL localhost:8085/callback?... lalu paste di langkah 2.");
      } catch (e) {
        showToast("Error: " + e.message);
      }
    }

    async function copyAntigravityGoogleLoginUrl() {
      try {
        var authUrl = await fetchAntigravityAuthUrl();
        await navigator.clipboard.writeText(authUrl);
        showToast("Link login Google disalin! Buka jendela Incognito untuk login akun Google berikutnya.");
      } catch (e) {
        showToast("Error: " + e.message);
      }
    }

    async function submitAntigravityCallback() {
      var inputEl = document.getElementById("agCallbackInput");
      var val = inputEl.value.trim();
      if (!val) {
        showToast("Paste dulu URL http://localhost:8085/callback?code=... dari browser!");
        return;
      }
      var btn = document.getElementById("btnExchangeAg");
      btn.disabled = true;
      btn.innerHTML = '<svg class="ic"><use href="#i-refresh"></use></svg> Menghubungkan...';
      try {
        var res = await apiFetch("/api/admin/oauth/antigravity/exchange", {
          method: "POST",
          body: JSON.stringify({ callbackInput: val, redirectUri: cachedAgRedirectUri })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("Gagal: " + (data.error || res.status));
          return;
        }
        inputEl.value = "";
        showToast("✅ Akun " + data.account.email + " berhasil terhubung!");
        await loadAdminData();
      } catch (e) {
        showToast("Error OAuth: " + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="ic"><use href="#i-check"></use></svg> Hubungkan Akun';
      }
    }

    async function submitBulkRefreshImport() {
      var box = document.getElementById("agBulkRefreshInput");
      var raw = box.value.trim();
      if (!raw) {
        showToast("Masukkan minimal 1 refresh_token atau JSON terlebih dahulu.");
        return;
      }
      var btn = document.getElementById("btnBulkImportAg");
      btn.disabled = true;
      btn.textContent = "⏳ Mengimpor...";
      try {
        var res = await apiFetch("/api/admin/oauth/antigravity/import-refresh", {
          method: "POST",
          body: JSON.stringify({ rawTokens: raw })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("Gagal: " + ((data.errors && data.errors[0]) || data.error || res.status));
          return;
        }
        box.value = "";
        showToast("✅ Berhasil mengimpor " + data.importedCount + " akun Antigravity!");
        await loadAdminData();
      } catch (e) {
        showToast("Error import: " + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="ic"><use href="#i-download"></use></svg> Import Semua Akun';
      }
    }

    async function fetchClaudeAuthUrl() {
      var res = await apiFetch("/api/admin/oauth/claude/authorize");
      var data = await res.json();
      if (!res.ok || !data.authUrl) throw new Error(data.error || "Gagal membuat URL login Claude.ai");
      cachedClaudeVerifier = data.codeVerifier || "";
      cachedClaudeState = data.state || "";
      localStorage.setItem("9router_claude_verifier", cachedClaudeVerifier);
      localStorage.setItem("9router_claude_state", cachedClaudeState);
      return data.authUrl;
    }

    async function openClaudeOAuthLogin() {
      try {
        var authUrl = await fetchClaudeAuthUrl();
        window.open(authUrl, "_blank", "noopener,noreferrer");
        showToast("Halaman login Claude.ai dibuka! Setelah Allow, salin URL localhost:8085/callback?... lalu paste di langkah 2.");
      } catch (e) {
        showToast("Error: " + e.message);
      }
    }

    async function copyClaudeOAuthLoginUrl() {
      try {
        var authUrl = await fetchClaudeAuthUrl();
        await navigator.clipboard.writeText(authUrl);
        showToast("Link login Claude disalin! Buka jendela Incognito untuk login akun Claude berikutnya.");
      } catch (e) {
        showToast("Error: " + e.message);
      }
    }

    async function submitClaudeCallback() {
      var inputEl = document.getElementById("claudeCallbackInput");
      var val = inputEl.value.trim();
      if (!val) {
        showToast("Paste dulu URL http://localhost:8085/callback?code=... dari browser!");
        return;
      }
      var verifier = cachedClaudeVerifier || localStorage.getItem("9router_claude_verifier") || "";
      var state = cachedClaudeState || localStorage.getItem("9router_claude_state") || "";
      if (!verifier) {
        showToast("Klik tombol 1. Buka Login Claude terlebih dahulu agar verifier PKCE dibuat!");
        return;
      }
      var btn = document.getElementById("btnExchangeClaude");
      btn.disabled = true;
      btn.innerHTML = '<svg class="ic"><use href="#i-refresh"></use></svg> Menghubungkan...';
      try {
        var res = await apiFetch("/api/admin/oauth/claude/exchange", {
          method: "POST",
          body: JSON.stringify({ callbackInput: val, codeVerifier: verifier, state: state })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("Gagal: " + (data.error || res.status));
          return;
        }
        inputEl.value = "";
        showToast("✅ Akun Claude " + data.account.email + " berhasil terhubung!");
        await loadAdminData();
      } catch (e) {
        showToast("Error Claude OAuth: " + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="ic"><use href="#i-check"></use></svg> Hubungkan Akun Claude';
      }
    }

    function initTableDnD(tbodyId, providerId) {
      var tbody = document.getElementById(tbodyId);
      if (!tbody) return;
      var rows = tbody.querySelectorAll("tr.draggable-row");
      tbody.onclick = function(ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest("[data-order-act]") : null;
        if (!btn || btn.disabled) return;
        var act = btn.getAttribute("data-order-act");
        var accId = btn.getAttribute("data-acc-id");
        if (!accId) return;
        if (act === "up" || act === "down") moveOAuthAccount(accId, act);
        else if (act === "main") setOAuthAccountPriorityDirect(accId, 1);
      };


      rows.forEach(function(row) {
        row.addEventListener("dragstart", function(e) {
          draggedRow = row;
          row.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", row.getAttribute("data-acc-id"));
        });

        row.addEventListener("dragend", function() {
          row.classList.remove("dragging");
          rows.forEach(function(r) { r.classList.remove("drag-over"); });
          draggedRow = null;
        });

        row.addEventListener("dragover", function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (draggedRow && draggedRow !== row) {
            row.classList.add("drag-over");
          }
        });

        row.addEventListener("dragleave", function() {
          row.classList.remove("drag-over");
        });

        row.addEventListener("drop", async function(e) {
          e.preventDefault();
          row.classList.remove("drag-over");
          if (!draggedRow || draggedRow === row) return;

          var allRows = Array.from(tbody.querySelectorAll("tr.draggable-row"));
          var fromIdx = allRows.indexOf(draggedRow);
          var toIdx = allRows.indexOf(row);

          if (fromIdx < toIdx) {
            row.after(draggedRow);
          } else {
            row.before(draggedRow);
          }

          var newOrderIds = Array.from(tbody.querySelectorAll("tr.draggable-row")).map(function(r) {
            return r.getAttribute("data-acc-id");
          });

          showToast("Menyimpan urutan prioritas...");
          try {
            var res = await apiFetch("/api/admin/oauth/accounts/reorder", {
              method: "POST",
              body: JSON.stringify({ providerId: providerId, orderedIds: newOrderIds })
            });
            var data = await res.json();
            if (data.ok) {
              showToast("✅ Urutan prioritas tersimpan!");
              await loadAdminData();
            }
          } catch (err) {
            showToast("Gagal: " + err.message);
          }
        });

        var handle = row.querySelector(".drag-handle");
        if (handle) {
          handle.addEventListener("touchstart", function() {
            draggedRow = row;
            row.classList.add("dragging");
          }, { passive: true });

          handle.addEventListener("touchmove", function(e) {
            if (!draggedRow) return;
            if (e.cancelable) e.preventDefault();
            var touch = e.touches[0];
            var targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            var targetRow = targetEl ? targetEl.closest("tr.draggable-row") : null;
            rows.forEach(function(r) { r.classList.remove("drag-over"); });
            if (targetRow && targetRow !== draggedRow && targetRow.parentNode === tbody) {
              targetRow.classList.add("drag-over");
            }
          }, { passive: false });

          handle.addEventListener("touchend", async function(e) {
            if (!draggedRow) return;
            var touch = e.changedTouches[0];
            var targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            var targetRow = targetEl ? targetEl.closest("tr.draggable-row") : null;
            row.classList.remove("dragging");
            rows.forEach(function(r) { r.classList.remove("drag-over"); });

            if (targetRow && targetRow !== draggedRow && targetRow.parentNode === tbody) {
              var allRows = Array.from(tbody.querySelectorAll("tr.draggable-row"));
              var fromIdx = allRows.indexOf(draggedRow);
              var toIdx = allRows.indexOf(targetRow);
              if (fromIdx < toIdx) {
                targetRow.after(draggedRow);
              } else {
                targetRow.before(draggedRow);
              }
              var newOrderIds = Array.from(tbody.querySelectorAll("tr.draggable-row")).map(function(r) {
                return r.getAttribute("data-acc-id");
              });
              showToast("Menyimpan urutan...");
              try {
                var res = await apiFetch("/api/admin/oauth/accounts/reorder", {
                  method: "POST",
                  body: JSON.stringify({ providerId: providerId, orderedIds: newOrderIds })
                });
                var data = await res.json();
                if (data.ok) {
                  showToast("✅ Urutan prioritas tersimpan!");
                  await loadAdminData();
                }
              } catch (err) {
                showToast("Gagal: " + err.message);
              }
            }
            draggedRow = null;
          });
        }
      });
    }

    function pickNextAccountId(accounts) {
      var now = Date.now();
      for (var i = 0; i < accounts.length; i++) {
        var a = accounts[i];
        if (a.enabled && !(a.quotaResetAt && a.quotaResetAt > now)) return a.id;
      }
      return null;
    }

    function buildOrderCell(acc, i, total, nextId) {
      var isMain = i === 0;
      var label = isMain ? "Utama" : "Cadangan " + i;
      var id = escapeHtml(acc.id);
      return '<div class="order-cell">' +
        '<span class="drag-handle" title="Tahan &amp; geser untuk mengubah urutan">⠿</span>' +
        '<span class="order-badge' + (isMain ? ' main' : '') + '">' + (i + 1) + '</span>' +
        '<div class="order-meta"><b>' + label + '</b>' +
          (acc.id === nextId ? '<span class="order-live">▶ dipakai sekarang</span>' : '') +
        '</div>' +
        '<div class="order-arrows">' +
          '<button class="order-arrow" data-order-act="up" data-acc-id="' + id + '" title="Naikkan"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button class="order-arrow" data-order-act="down" data-acc-id="' + id + '" title="Turunkan"' + (i === total - 1 ? ' disabled' : '') + '>▼</button>' +
        '</div>' +
      '</div>';
    }

    function renderOrderFlow(containerId, accounts, nextId) {
      var el = document.getElementById(containerId);
      if (!el) return;
      if (!accounts || accounts.length < 2) {
        el.style.display = "none";
        el.innerHTML = "";
        return;
      }
      var now = Date.now();
      var parts = [];
      for (var i = 0; i < accounts.length; i++) {
        var a = accounts[i];
        var cls = "flow-chip";
        if (!a.enabled) cls += " off";
        else if (a.quotaResetAt && a.quotaResetAt > now) cls += " limit";
        else if (a.id === nextId) cls += " live";
        parts.push('<span class="' + cls + '"><i>' + (i + 1) + '</i>' + escapeHtml(a.email) + '</span>');
      }
      el.style.display = "";
      el.innerHTML = '<span class="flow-title">Alur pemakaian:</span>' + parts.join('<span class="flow-arrow">→</span>') +
        '<span class="flow-note">Pakai #1 dulu. Kena limit → otomatis pindah ke urutan berikutnya. Setelah limit reset → balik ke #1.</span>';
    }

    function renderAntigravityAccounts(accounts) {
      var tbody = document.getElementById("agAccountsTableBody");
      if (!tbody) return;
      if (!accounts || accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Belum ada akun Google Antigravity. Klik tombol <b>Buka Login Google</b> di atas untuk menambahkan akun pertama.</td></tr>';
        return;
      }
      var now = Date.now();
      var nextId = pickNextAccountId(accounts);
      renderOrderFlow("agOrderFlow", accounts, nextId);
      var html = "";
      for (var i = 0; i < accounts.length; i++) {
        var acc = accounts[i];
        var statusHtml = "";
        if (!acc.enabled) {
          statusHtml = '<span class="badge"><span class="dot"></span> Nonaktif</span>';
        } else if (acc.quotaResetAt && acc.quotaResetAt > now) {
          var resetTime = formatCooldownUntil(acc.quotaResetAt);
          statusHtml = '<span class="badge warn"><span class="dot"></span> Limit — reset ' + escapeHtml(resetTime) + '</span>';
          if (acc.lastError) {
            statusHtml += '<div class="hint">' + escapeHtml(acc.lastError.slice(0, 90)) + '</div>';
          }
        } else {
          statusHtml = '<span class="badge ok"><span class="dot"></span> Aktif &amp; Siap</span>';
        }

        var lastUsed = acc.lastUsedAt ? formatLocalTime(acc.lastUsedAt) : "-";

        var orderCell = buildOrderCell(acc, i, accounts.length, nextId);

        html += '<tr class="draggable-row" draggable="true" data-acc-id="' + escapeHtml(acc.id) + '">' +
          '<td>' + orderCell + '</td>' +
          '<td class="mono t-strong">' + escapeHtml(acc.email) + '</td>' +
          '<td class="mono t-blue">' + escapeHtml(acc.projectId || "-") + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td class="mono t-dim">' + escapeHtml(lastUsed) + '</td>' +
          '<td>' +
            '<div class="row" style="gap:6px;">' +
              (i > 0 ? '<button class="btn ghost xs" data-order-act="main" data-acc-id="' + escapeHtml(acc.id) + '" title="Jadikan akun utama (#1)">⭐ Jadikan Utama</button>' : '') +
              (acc.quotaResetAt && acc.quotaResetAt > now
                ? '<button class="btn ghost xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="resetAgCooldown(this.getAttribute(\\\'data-acc-id\\\'))">Reset Limit</button>'
                : '') +
              '<button class="btn ghost xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="toggleAgAccount(this.getAttribute(\\\'data-acc-id\\\'))">' + (acc.enabled ? 'Matikan' : 'Aktifkan') + '</button>' +
              '<button class="btn danger xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="deleteAgAccount(this.getAttribute(\\\'data-acc-id\\\'))">Hapus</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }
      tbody.innerHTML = html;
      initTableDnD("agAccountsTableBody", "antigravity");
    }

    function renderClaudeAccounts(accounts) {
      var tbody = document.getElementById("claudeAccountsTableBody");
      if (!tbody) return;
      if (!accounts || accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Belum ada akun Claude.ai terhubung. Klik tombol <b>Buka Login Claude.ai</b> di atas untuk menambahkan akun.</td></tr>';
        return;
      }
      var now = Date.now();
      var nextId = pickNextAccountId(accounts);
      renderOrderFlow("claudeOrderFlow", accounts, nextId);
      var html = "";
      for (var i = 0; i < accounts.length; i++) {
        var acc = accounts[i];
        var statusHtml = "";
        if (!acc.enabled) {
          statusHtml = '<span class="badge"><span class="dot"></span> Nonaktif</span>';
        } else if (acc.quotaResetAt && acc.quotaResetAt > now) {
          var resetTime = formatCooldownUntil(acc.quotaResetAt);
          statusHtml = '<span class="badge warn"><span class="dot"></span> Limit — reset ' + escapeHtml(resetTime) + '</span>';
          if (acc.lastError) {
            statusHtml += '<div class="hint">' + escapeHtml(acc.lastError.slice(0, 90)) + '</div>';
          }
        } else {
          statusHtml = '<span class="badge ok"><span class="dot"></span> Aktif &amp; Siap</span>';
        }

        var lastUsed = acc.lastUsedAt ? formatLocalTime(acc.lastUsedAt) : "-";

        var orderCell = buildOrderCell(acc, i, accounts.length, nextId);

        html += '<tr class="draggable-row" draggable="true" data-acc-id="' + escapeHtml(acc.id) + '">' +
          '<td>' + orderCell + '</td>' +
          '<td class="mono" style="font-weight:700;color:var(--claude);">' + escapeHtml(acc.email) + '</td>' +
          '<td class="mono t-blue">' + escapeHtml(acc.tierId || "claude-pro") + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td class="mono t-dim">' + escapeHtml(lastUsed) + '</td>' +
          '<td>' +
            '<div class="row" style="gap:6px;">' +
              (i > 0 ? '<button class="btn ghost xs" data-order-act="main" data-acc-id="' + escapeHtml(acc.id) + '" title="Jadikan akun utama (#1)">⭐ Jadikan Utama</button>' : '') +
              (acc.quotaResetAt && acc.quotaResetAt > now
                ? '<button class="btn ghost xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="resetAgCooldown(this.getAttribute(\\\'data-acc-id\\\'))">Reset Limit</button>'
                : '') +
              '<button class="btn ghost xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="toggleAgAccount(this.getAttribute(\\\'data-acc-id\\\'))">' + (acc.enabled ? 'Matikan' : 'Aktifkan') + '</button>' +
              '<button class="btn danger xs" data-acc-id="' + escapeHtml(acc.id) + '" onclick="deleteAgAccount(this.getAttribute(\\\'data-acc-id\\\'))">Hapus</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }
      tbody.innerHTML = html;
      initTableDnD("claudeAccountsTableBody", "claude");
    }

    async function moveOAuthAccount(id, dir) {
      var action = dir === "up" ? "move-up" : "move-down";
      var res = await apiFetch("/api/admin/oauth/accounts/" + encodeURIComponent(id) + "/" + action, { method: "POST" });
      var data = await res.json();
      if (data.ok) {
        showToast("Urutan akun diperbarui!");
        await loadAdminData();
      }
    }

    async function setOAuthAccountPriorityDirect(id, newPos) {
      var pos = parseInt(newPos, 10);
      if (!pos || pos < 1) return;
      showToast("Menyimpan prioritas #" + pos + "...");
      try {
        var res = await apiFetch("/api/admin/oauth/accounts/" + encodeURIComponent(id) + "/set-priority", {
          method: "POST",
          body: JSON.stringify({ position: pos })
        });
        var data = await res.json();
        if (data.ok) {
          showToast("✅ Prioritas ke-#" + pos + " berhasil disimpan!");
          await loadAdminData();
        } else {
          showToast("Gagal: " + (data.error || "Error"));
        }
      } catch (err) {
        showToast("Gagal update prioritas: " + err.message);
      }
    }

    async function toggleAgAccount(id) {
      await apiFetch("/api/admin/oauth/accounts/" + encodeURIComponent(id) + "/toggle", { method: "POST" });
      showToast("Status akun diperbarui.");
      await loadAdminData();
    }

    async function resetAgCooldown(id) {
      await apiFetch("/api/admin/oauth/accounts/" + encodeURIComponent(id) + "/reset-cooldown", { method: "POST" });
      showToast("Limit cooldown akun direset!");
      await loadAdminData();
    }

    async function deleteAgAccount(id) {
      if (!confirm("Hapus akun ini dari router?")) return;
      await apiFetch("/api/admin/oauth/accounts/" + encodeURIComponent(id), { method: "DELETE" });
      showToast("Akun berhasil dihapus.");
      await loadAdminData();
    }

    async function checkAntigravityLiveModels() {
      var box = document.getElementById("agAvailableModelsBox");
      box.style.display = "block";
      box.textContent = "⏳ Mengecek model aktif langsung ke server Google Antigravity...";
      try {
        var res = await apiFetch("/api/admin/oauth/antigravity/available-models");
        var data = await res.json();
        if (!res.ok || !data.ok) {
          box.textContent = "❌ Gagal mengecek model: " + (data.error || res.status);
          return;
        }
        var lines = [
          "✅ Akun: " + data.email + " (Project: " + (data.projectId || "-") + ")",
          "Model aktif & siap dipakai di akun ini:"
        ];
        var models = data.models || [];
        for (var i = 0; i < models.length; i++) {
          var m = models[i];
          if (String(m.id).indexOf("-disabled") !== -1) continue;
          lines.push("  • antigravity/" + m.id + (m.displayName ? (" — " + m.displayName) : ""));
        }
        box.textContent = lines.join("\\n");
      } catch (e) {
        box.textContent = "❌ Error: " + e.message;
      }
    }

    function renderOtherToolsSnippet(cfg) {
      var origin = window.location.origin;
      var key = (cfg.clientKeys[0] && cfg.clientKeys[0].key) ? cfg.clientKeys[0].key : "sk-9r-opencode-default";
      var txt = [
        '# 1. OpenAI-Compatible Endpoint (OpenCode, Cursor, Cline, Roo Code, Continue):',
        'Base URL : ' + origin + '/v1',
        'API Key  : ' + key,
        'Model    : gemini-4-argon     (atau gemini-3.8-flash, claude-sonnet-4-6, auto)',
        '',
        '# 2. Anthropic Messages Endpoint (Claude Code CLI via Akun Antigravity!):',
        'export ANTHROPIC_BASE_URL="' + origin + '"',
        'export ANTHROPIC_API_KEY="' + key + '"',
        'claude --model claude-sonnet-4-6',
        '',
        '# 3. Test Cepat via cURL:',
        'curl ' + origin + '/v1/chat/completions \\\\',
        '  -H "Authorization: Bearer ' + key + '" \\\\',
        '  -H "Content-Type: application/json" \\\\',
        '  -d \\\'{"model":"gemini-3.8-flash","messages":[{"role":"user","content":"Halo Antigravity!"}]}\\\''
      ].join("\\n");
      document.getElementById("otherToolsSnippet").textContent = txt;
    }

    async function refreshOpenCodePreview() {
      try {
        var toggle = document.getElementById("showAllModelsToggle");
        var all = toggle ? toggle.checked : false;
        var res = await apiFetch("/api/admin/opencode-config?all=" + (all ? "1" : "0"));
        var json = await res.json();
        lastOpenCodeConfig = json;
        document.getElementById("opencodeJsonBox").textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        // Fallback to public /v1/opencode.json if admin session expired
        try {
          var pubRes = await fetch("/v1/opencode.json", {
            headers: { Authorization: "Bearer sk-9r-opencode-default" }
          });
          if (pubRes.ok) {
            var pubJson = await pubRes.json();
            lastOpenCodeConfig = pubJson;
            document.getElementById("opencodeJsonBox").textContent = JSON.stringify(pubJson, null, 2);
            return;
          }
        } catch (_) {}
        document.getElementById("opencodeJsonBox").textContent = "// Gagal memuat: " + (e && e.message ? e.message : "Error");
      }
    }

    function copyOpenCodeJson() {
      if (!lastOpenCodeConfig) return;
      navigator.clipboard.writeText(JSON.stringify(lastOpenCodeConfig, null, 2));
      showToast("opencode.json berhasil disalin ke Clipboard!");
    }

    function downloadOpenCodeJson() {
      if (!lastOpenCodeConfig) return;
      var blob = new Blob([JSON.stringify(lastOpenCodeConfig, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "opencode.json";
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("opencode.json berhasil diunduh!");
    }

    function copyWindowsCmd() {
      var origin = window.location.origin;
      var key = (lastOpenCodeConfig && lastOpenCodeConfig.provider && lastOpenCodeConfig.provider["9router"] && lastOpenCodeConfig.provider["9router"].options && lastOpenCodeConfig.provider["9router"].options.apiKey) || "sk-9r-opencode-default";
      var cmd = 'New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.config\\opencode"; (Invoke-RestMethod -Uri "' + origin + '/v1/opencode.json" -Headers @{"Authorization"="Bearer ' + key + '"} | ConvertTo-Json -Depth 10) | Set-Content -Path "$env:USERPROFILE\\.config\\opencode\\opencode.json" -Encoding utf8';
      navigator.clipboard.writeText(cmd);
      showToast("Perintah 1-Click PowerShell berhasil disalin!");
    }

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    var PROVIDER_LOGOS = {
      antigravity: { svg: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>', alt: "Google", initial: "G", tint: "\\x234285f4" },
      anthropic: { svg: '<svg viewBox="0 0 24 24" fill="#D97757"><path d="M13.8 3h3.4L24 21h-3.6l-1.8-4.4h-6.8L10 21H6.4L13.8 3zm2.5 10.7-2-5-2.1 5h4.1zM3.6 21H0L7.4 3h3.5L3.6 21z"/></svg>', alt: "Anthropic Claude", initial: "CL", tint: "#d97757" },
      openai: { svg: '<svg viewBox="0 0 24 24" fill="#10A37F"><path d="M22.28 9.37a5.98 5.98 0 0 0-.52-4.98 6.07 6.07 0 0 0-6.52-2.83 6.06 6.06 0 0 0-4.73-2.3 6.08 6.08 0 0 0-5.8 4.2 6.05 6.05 0 0 0-3.93 2.87 6.07 6.07 0 0 0 .74 7.08 5.98 5.98 0 0 0 .51 4.97 6.07 6.07 0 0 0 6.52 2.84 6.07 6.07 0 0 0 4.74 2.3 6.08 6.08 0 0 0 5.8-4.21 6.04 6.04 0 0 0 3.93-2.86 6.07 6.07 0 0 0-.74-7.08zM12 21.48c-1.15 0-2.25-.33-3.2-.95l.17-.1 4.04-2.33a.85.85 0 0 0 .43-.74v-5.7l1.71.99v4.71a5.24 5.24 0 0 1-3.15 4.12zm-8.3-4.8a5.2 5.2 0 0 1-.61-3.23c.18.33.4.63.66.9l3.52 3.52a.85.85 0 0 0 .6.25h.19l-2.02-3.5-2.34 2.06zm-.32-7.85c.42-.76 1-1.39 1.71-1.84l-.17.1-4.04 2.33a.85.85 0 0 0-.43.74v5.7l-1.71-.99V10.16a5.23 5.23 0 0 1 4.64-1.33zm14.77-2.38l-4.04 2.33a.85.85 0 0 0-.43.74v5.7l-1.71-.99V9.52a5.24 5.24 0 0 1 6.18-7.14zm3.93 7.84a5.2 5.2 0 0 1 .61 3.23c-.18-.33-.4-.63-.66-.9l-3.52-3.52a.85.85 0 0 0-.6-.25h-.19l2.02 3.5 2.34-2.06zm-8.08 2.06l-2.45-1.42 2.45-1.41 2.46 1.41-2.46 1.42z"/></svg>', alt: "OpenAI", initial: "AI", tint: "#10a37f" },
      xai: { svg: '<svg viewBox="0 0 24 24" fill="#000000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', alt: "xAI", initial: "X", tint: "#111111" },
      deepseek: { svg: '<svg viewBox="0 0 24 24" fill="#4D6BFE"><path d="M21.5 13.5c-.8 3.7-4 6.5-7.8 6.5-4.4 0-8-3.6-8-8 0-3.8 2.8-7 6.5-7.8-1.2 1.8-1.9 4-1.9 6.3 0 5 4 9 9 9 1 0 1.9-.2 2.2-.5v.5z"/><circle cx="15.5" cy="8.5" r="2" fill="#fff"/></svg>', alt: "DeepSeek", initial: "DS", tint: "#4d6bfe" },
      glm: { domain: "zhipuai.cn", alt: "GLM Zhipu", initial: "GLM", tint: "#1e40af" },
      kimi: { domain: "moonshot.cn", alt: "Kimi Moonshot", initial: "K", tint: "#7c3aed" },
      minimax: { domain: "minimax.io", alt: "MiniMax", initial: "MM", tint: "#f43f5e" },
      mistral: { svg: '<svg viewBox="0 0 24 24" fill="#FA520F"><path d="M3 3h4.5v4.5H3zm13.5 0H21v4.5h-4.5zM3 9.75h4.5v4.5H3zm6.75 0h4.5v4.5h-4.5zm6.75 0H21v4.5h-4.5zM3 16.5h18V21H3z"/></svg>', alt: "Mistral", initial: "M", tint: "#fa520f" },
      together: { domain: "together.ai", alt: "Together AI", initial: "TG", tint: "#0f6fff" },
      fireworks: { domain: "fireworks.ai", alt: "Fireworks AI", initial: "FW", tint: "#ef4444" },
      gemini: { svg: '<svg viewBox="0 0 24 24"><path fill="#8E75B2" d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/></svg>', alt: "Google Gemini", initial: "G", tint: "#8e75b2" },
      openrouter: { svg: '<svg viewBox="0 0 24 24" fill="#8B5CF6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', alt: "OpenRouter", initial: "OR", tint: "#8b5cf6" },
      groq: { svg: '<svg viewBox="0 0 24 24" fill="#F55036"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18h-2v-1.07A6 6 0 1 1 17.93 11H19v2h-1.07A6 6 0 0 1 13 16.93z"/></svg>', alt: "Groq", initial: "GQ", tint: "#f55036" },
      cerebras: { svg: '<svg viewBox="0 0 24 24" fill="#F97316"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 3.3L18.3 8 12 11.5 5.7 8 12 5.3zM5 9.7l6 3.3v6.7l-6-3.3V9.7zm8 10V13l6-3.3v6.7l-6 3.3z"/></svg>', alt: "Cerebras", initial: "CB", tint: "#f97316" },
      nvidia: { svg: '<svg viewBox="0 0 24 24" fill="#76B900"><path d="M6.7 8.3C7.5 7.4 9 7 10.6 7c2.4 0 4.1.9 5.2 2.7l2.2-1.7C16.3 5.7 13.7 4.5 10.6 4.5c-2.7 0-5.1.8-6.6 2.5C2.6 8.5 2 10.5 2 12.8c0 2.3.6 4.3 2 5.8 1.5 1.7 3.9 2.5 6.6 2.5 3.1 0 5.7-1.2 7.4-3.5l-2.2-1.7c-1.1 1.8-2.8 2.7-5.2 2.7-1.6 0-3.1-.4-3.9-1.3-.9-1-1.3-2.5-1.3-4.5 0-2 .4-3.5 1.3-4.5z"/></svg>', alt: "NVIDIA", initial: "NV", tint: "#76b900" },
      github: { svg: '<svg viewBox="0 0 24 24" fill="#181717"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>', alt: "GitHub", initial: "GH", tint: "#181717" },
      "opencode-zen": { domain: "opencode.ai", alt: "OpenCode Zen", initial: "OC", tint: "#0ea5e9" },
      crown: { svg: '<svg viewBox="0 0 24 24" fill="#38BDF8"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>', alt: "Crown AI", initial: "CR", tint: "#38bdf8" },
      cloudflare: { svg: '<svg viewBox="0 0 24 24" fill="#F38020"><path d="M16.8 10.4c-.3-2.6-2.5-4.6-5.2-4.6-2.3 0-4.3 1.5-4.9 3.6-1.9.2-3.4 1.8-3.4 3.8 0 2.1 1.7 3.8 3.8 3.8h9.6c1.8 0 3.3-1.5 3.3-3.3 0-1.7-1.3-3.1-3.2-3.3z"/></svg>', alt: "Cloudflare", initial: "CF", tint: "#f38020" }
    };

    function providerLogoHtml(id, name) {
      var meta = PROVIDER_LOGOS[id] || null;
      var clean = String(name || id || "AI").replace(/[^A-Za-z0-9]/g, "");
      var initial = (meta && meta.initial) ? meta.initial : (clean.slice(0, 2).toUpperCase() || "AI");
      var tint = (meta && meta.tint) ? meta.tint : "#f97316";

      if (meta && meta.svg) {
        return '<span class="prov-logo" style="--logo-tint:' + tint + '">' +
          meta.svg +
        '</span>';
      }

      var favicon = (meta && meta.domain) ? ("https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(meta.domain)) : "";
      return '<span class="prov-logo' + (favicon ? "" : " no-logo") + '" style="--logo-tint:' + tint + '">' +
        (favicon
          ? '<img src="' + favicon + '" alt="' + escapeHtml(meta && meta.alt ? meta.alt : name) + '" loading="lazy" referrerpolicy="no-referrer" onerror="handleLogoError(this)" />'
          : '') +
        '<span class="prov-logo-fb">' + escapeHtml(initial) + '</span>' +
      '</span>';
    }

    function handleLogoError(img) {
      img.style.display = "none";
      if (img.parentNode) img.parentNode.classList.add("no-logo");
    }

    function renderProviders(providers) {
      var container = document.getElementById("providersContainer");
      var html = "";
      for (var i = 0; i < providers.length; i++) {
        var p = providers[i];
        var tierClass = p.tier === "tier1-flagship" ? "tier-1" : (p.tier === "tier2-cheap" ? "tier-2" : "tier-3");
        var tierLabel = p.tier === "tier1-flagship" ? "Flagship" : (p.tier === "tier2-cheap" ? "Hemat" : "Free");
        var modelIds = p.models.map(function(m) { return m.id; }).join(", ");
        var isAg = p.dialect === "antigravity";
        var keyCount = p.keyCount || 0;
        var ready = Boolean(p.ready);

        var authSection = isAg
          ? '<div class="ag-note">' +
              '<div style="margin-bottom:8px;">Provider ini memakai <b>multi-akun Google OAuth</b>.</div>' +
              '<button class="btn soft sm block" onclick="switchTab(\\\'antigravity\\\')">Kelola Akun Antigravity (' + keyCount + ' aktif)</button>' +
              '<input type="hidden" id="prov-keys-' + i + '" value="" />' +
            '</div>'
          : '<div class="field">' +
              '<label for="prov-keys-' + i + '">API Keys <span class="t-dim">(1 baris 1 key untuk rotasi)</span></label>' +
              '<textarea rows="2" id="prov-keys-' + i + '" placeholder="Paste API key di sini...">' + escapeHtml((p.apiKeys || []).join("\\n")) + '</textarea>' +
              '<div class="hint">' + (p.envKey ? 'Env fallback: <code>' + escapeHtml(p.envKey) + '</code>' : 'Disimpan terenkripsi di Cloudflare KV / D1.') + '</div>' +
            '</div>';

        html += '<div class="prov-card ' + (ready ? 'ready' : '') + '" data-prov-idx="' + i + '">' +
          '<div class="prov-top">' +
            '<div class="prov-head-left">' +
              providerLogoHtml(p.id, p.name) +
              '<div class="prov-name-wrap">' +
                '<div class="prov-title">' + escapeHtml(p.name) + '</div>' +
                '<div class="prov-id">' + escapeHtml(p.id) + '/</div>' +
              '</div>' +
            '</div>' +
            '<span class="tier ' + tierClass + '">' + tierLabel + '</span>' +
          '</div>' +
          '<div class="prov-meta">' +
            '<span class="prov-status ' + (ready ? 'on' : 'off') + '"><span class="dot"></span>' + (ready ? ('Siap • ' + keyCount + (isAg ? ' akun' : ' key')) : (isAg ? 'Belum ada akun' : 'Belum ada key')) + '</span>' +
            '<span class="badge">' + escapeHtml(p.dialect || "openai") + '</span>' +
            (p.aliases && p.aliases.length ? '<span class="badge mono">alias: ' + escapeHtml(p.aliases.join(", ")) + '</span>' : '') +
          '</div>' +
          '<div class="prov-notes">' + escapeHtml(p.notes || "") + '</div>' +
          authSection +
          '<div class="field">' +
            '<label for="prov-url-' + i + '">Base URL</label>' +
            '<input type="text" id="prov-url-' + i + '" value="' + escapeHtml(p.baseUrl) + '" />' +
          '</div>' +
          '<div class="field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">' +
              '<label style="margin:0;" for="prov-models-' + i + '">Daftar Model ID (pisahkan koma)</label>' +
              (!isAg ? '<button class="btn ghost xs" onclick="autoFetchProviderModels(' + i + ')">Fetch Models</button>' : '') +
            '</div>' +
            '<input type="text" id="prov-models-' + i + '" value="' + escapeHtml(modelIds) + '" />' +
          '</div>' +
          '<div class="prov-foot">' +
            '<label class="check-row" style="margin:0;">' +
              '<input type="checkbox" id="prov-en-' + i + '" ' + (p.enabled ? 'checked' : '') + ' /> Aktif' +
            '</label>' +
            '<span class="hint" style="margin:0;">' + (isAg ? 'OAuth multi-akun' : (p.envKey ? 'env: ' + escapeHtml(p.envKey) : 'API key manual')) + '</span>' +
          '</div>' +
        '</div>';
      }
      container.innerHTML = html;
    }

    async function autoFetchProviderModels(idx) {
      var baseUrl = document.getElementById("prov-url-" + idx).value.trim();
      var firstKey = document.getElementById("prov-keys-" + idx).value.split(/[\\n,;]+/).map(function(s){return s.trim();}).filter(Boolean)[0] || "";
      showToast("Mengambil daftar model dari " + baseUrl + "...");
      try {
        var res = await apiFetch("/api/admin/fetch-models", {
          method: "POST",
          body: JSON.stringify({ baseUrl: baseUrl, apiKey: firstKey })
        });
        var data = await res.json();
        if (!res.ok || !data.modelIds) {
          showToast("Gagal fetch: " + (data.error || res.status));
          return;
        }
        document.getElementById("prov-models-" + idx).value = data.modelIds.join(", ");
        showToast("Berhasil mengambil " + data.count + " model! Klik Simpan Semua Perubahan.");
      } catch (e) {
        showToast("Error fetch models: " + e.message);
      }
    }

    function promptAddCustomProvider() {
      var id = prompt("Masukkan ID unik provider baru (huruf kecil tanpa spasi, misal: sumopod atau chutes):");
      if (!id) return;
      id = id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
      if (!id) return;
      var name = prompt("Nama Tampilan Provider:", id.toUpperCase()) || id;
      var baseUrl = prompt("Base URL OpenAI-Compatible (akhiri dengan /v1):", "https://api.example.com/v1");
      if (!baseUrl) return;
      var modelId = prompt("Masukkan minimal 1 Model ID:", "gpt-4o-mini") || "default-model";

      currentData.config.providers.push({
        id: id,
        aliases: [],
        name: name,
        tier: "tier2-cheap",
        dialect: "openai",
        baseUrl: baseUrl.trim(),
        enabled: true,
        apiKeys: [],
        models: [{ id: modelId.trim(), name: modelId.trim(), contextLimit: 128000, outputLimit: 16384, toolCall: true }],
        custom: true,
        ready: false,
        keyCount: 0,
        notes: "Custom OpenAI-compatible provider"
      });
      renderProviders(currentData.config.providers);
      showToast("Custom provider ditambahkan! Isi API Key lalu klik Simpan Semua Perubahan.");
    }

    function renderCombos(combos) {
      var el = document.getElementById("combosContainer");
      if (!combos || !combos.length) {
        el.innerHTML = '<div class="empty-state">Belum ada smart combo. Klik <b>Combo Baru</b> untuk membuat rute fallback otomatis.</div>';
        return;
      }
      var html = "";
      for (var i = 0; i < combos.length; i++) {
        var c = combos[i];
        html += '<div class="combo-card">' +
          '<div class="combo-grid">' +
            '<div class="field" style="margin:0;"><label for="combo-id-' + i + '">ID Model Virtual</label><input type="text" id="combo-id-' + i + '" value="' + escapeHtml(c.id) + '" /></div>' +
            '<div class="field" style="margin:0;"><label for="combo-name-' + i + '">Nama Combo</label><input type="text" id="combo-name-' + i + '" value="' + escapeHtml(c.name) + '" /></div>' +
            '<div class="field" style="margin:0;"><label for="combo-strat-' + i + '">Strategi</label><select id="combo-strat-' + i + '">' +
              '<option value="fallback" ' + (c.strategy === "fallback" ? "selected" : "") + '>Auto-Fallback Berurutan</option>' +
              '<option value="round-robin" ' + (c.strategy === "round-robin" ? "selected" : "") + '>Round-Robin + Fallback</option>' +
            '</select></div>' +
            '<button class="btn danger" onclick="removeCombo(' + i + ')"><svg class="ic ic-sm"><use href="#i-trash"></use></svg> Hapus</button>' +
          '</div>' +
          '<div class="combo-routes field">' +
            '<label for="combo-routes-' + i + '">Rute Fallback</label>' +
            '<textarea rows="4" id="combo-routes-' + i + '">' + escapeHtml((c.routes || []).join("\\n")) + '</textarea>' +
            '<div class="hint">1 baris = 1 provider/model, dicoba berurutan dari atas ke bawah.</div>' +
          '</div>' +
        '</div>';
      }
      el.innerHTML = html;
    }

    function addNewCombo() {
      currentData.config.combos.push({
        id: "9router/custom-agent",
        name: "Custom Agent Combo",
        description: "Rute kustom",
        strategy: "fallback",
        contextLimit: 200000,
        outputLimit: 64000,
        routes: ["antigravity/claude-sonnet-4-6", "antigravity/gemini-3.8-flash-high", "gemini/gemini-2.5-flash"]
      });
      renderCombos(currentData.config.combos);
    }

    function removeCombo(idx) {
      currentData.config.combos.splice(idx, 1);
      renderCombos(currentData.config.combos);
    }

    function maskKey(k) {
      if (!k) return "";
      var clean = String(k).trim();
      if (clean.length <= 8) return clean.slice(0, 3) + "...";
      return clean.slice(0, 7) + "..." + clean.slice(-4);
    }

    function quotaBar(label, used, limit, color) {
      var pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
      var remaining = Math.max(0, limit - used);
      return '<div class="quota-row">' +
        '<div class="quota-meta">' +
          '<span>' + label + ': <b class="t-strong">' + used.toLocaleString() + '</b> / ' + limit.toLocaleString() + '</span>' +
          '<span style="color:' + color + ';font-weight:700;">' + pct + '% • sisa ' + remaining.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="quota-track"><div class="quota-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
      '</div>';
    }

    function renderClientKeys(keys, byKey) {
      byKey = byKey || {};
      var el = document.getElementById("clientKeysContainer");
      if (!keys || !keys.length) {
        el.innerHTML = '<div class="empty-state">Belum ada client API key. Klik <b>Buat API Key</b> untuk membuat key pertama.</div>';
        return;
      }
      var html = "";
      var todayStr = new Date().toISOString().slice(0, 10);

      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var masked = maskKey(k.key);
        var kStat = byKey["client:" + masked];
        var dailyTokUsed = (kStat && kStat.dailyDate === todayStr) ? (kStat.dailyTokens || 0) : 0;
        var dailyReqUsed = (kStat && kStat.dailyDate === todayStr) ? (kStat.dailyRequests || 0) : 0;

        var quotaHtml = "";
        if (!k.dailyTokenLimit && !k.dailyRequestLimit) {
          quotaHtml = '<div class="hint" style="margin-top:10px;">Kuota tak terbatas (unlimited)</div>';
        } else {
          var rows = [];
          if (k.dailyTokenLimit && k.dailyTokenLimit > 0) {
            var tokPct = Math.min(100, Math.round((dailyTokUsed / k.dailyTokenLimit) * 100));
            var tokColor = tokPct >= 90 ? "var(--danger)" : (tokPct >= 70 ? "var(--warn)" : "var(--green)");
            rows.push(quotaBar("Token", dailyTokUsed, k.dailyTokenLimit, tokColor));
          }
          if (k.dailyRequestLimit && k.dailyRequestLimit > 0) {
            var reqPct = Math.min(100, Math.round((dailyReqUsed / k.dailyRequestLimit) * 100));
            var reqColor = reqPct >= 90 ? "var(--danger)" : (reqPct >= 70 ? "var(--warn)" : "var(--blue)");
            rows.push(quotaBar("Request", dailyReqUsed, k.dailyRequestLimit, reqColor));
          }
          quotaHtml = '<div class="quota">' + rows.join("") + '</div>';
        }

        var statusBadge = k.enabled
          ? '<span class="badge ok"><span class="dot"></span> Aktif</span>'
          : '<span class="badge danger"><span class="dot"></span> Nonaktif</span>';

        html += '<div class="key-card">' +
          '<div class="key-top">' +
            '<div style="min-width:0;">' +
              '<div class="key-name">' + escapeHtml(k.name) + '</div>' +
              '<div class="key-value">' + escapeHtml(masked) + '</div>' +
            '</div>' +
            '<div class="key-actions">' +
              statusBadge +
              '<button class="btn ghost xs" data-key="' + escapeHtml(k.key) + '" onclick="copyClientKey(this)"><svg class="ic ic-sm"><use href="#i-copy"></use></svg> Copy</button>' +
              '<button class="btn ghost xs" data-kid="' + escapeHtml(k.id) + '" onclick="editClientKeyLimits(this.getAttribute(\\\'data-kid\\\'))">Atur Limit</button>' +
              (k.id !== "env-router-key" ? '<button class="btn danger xs" data-kid="' + escapeHtml(k.id) + '" onclick="deleteClientKey(this.getAttribute(\\\'data-kid\\\'))"><svg class="ic ic-sm"><use href="#i-trash"></use></svg> Hapus</button>' : '') +
            '</div>' +
          '</div>' +
          quotaHtml +
        '</div>';
      }
      el.innerHTML = html;
    }

    function copyClientKey(btn) {
      var key = btn.getAttribute("data-key") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key).then(function() {
          showToast("API Key disalin ke clipboard!");
        }).catch(function() {
          showToast("Gagal menyalin, salin manual dari halaman ini.");
        });
      } else {
        showToast("Clipboard tidak didukung browser ini.");
      }
    }

    async function editClientKeyLimits(id) {
      var k = currentData.config.clientKeys.find(function(item) { return item.id === id; });
      if (!k) return;
      var curTok = k.dailyTokenLimit || 0;
      var curReq = k.dailyRequestLimit || 0;
      var promptTok = prompt("Batas maksimal token per hari untuk '" + k.name + "' (Isi 0 jika tidak ada batas):", curTok);
      if (promptTok === null) return;
      var promptReq = prompt("Batas maksimal request per hari untuk '" + k.name + "' (Isi 0 jika tidak ada batas):", curReq);
      if (promptReq === null) return;

      var tokVal = parseInt(promptTok, 10);
      var reqVal = parseInt(promptReq, 10);

      await apiFetch("/api/admin/client-keys/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify({
          dailyTokenLimit: tokVal > 0 ? tokVal : null,
          dailyRequestLimit: reqVal > 0 ? reqVal : null
        })
      });
      showToast("✅ Limit kuota API Key berhasil diperbarui!");
      await loadAdminData();
    }

    async function generateNewClientKey() {
      var name = prompt("Nama API Key (misal: Laptop OpenCode / Tim Dev):", "OpenCode Agent");
      if (!name) return;
      await apiFetch("/api/admin/client-keys", {
        method: "POST",
        body: JSON.stringify({ name: name })
      });
      showToast("Client API Key baru berhasil dibuat!");
      await loadAdminData();
    }

    async function deleteClientKey(id) {
      if (!confirm("Hapus API Key client ini?")) return;
      await apiFetch("/api/admin/client-keys/" + encodeURIComponent(id), { method: "DELETE" });
      showToast("Client API Key dihapus.");
      await loadAdminData();
    }

    async function saveAllConfig() {
      var providersPayload = {};
      var provs = currentData.config.providers;

      for (var i = 0; i < provs.length; i++) {
        var p = provs[i];
        var rawKeysEl = document.getElementById("prov-keys-" + i);
        var rawKeys = rawKeysEl ? rawKeysEl.value.split(/[\\n,;]+/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
        var urlVal = document.getElementById("prov-url-" + i).value.trim();
        var enVal = document.getElementById("prov-en-" + i).checked;
        var modelIdsRaw = document.getElementById("prov-models-" + i).value
          .split(",").map(function(s) { return s.trim(); }).filter(Boolean);

        var updatedModels = modelIdsRaw.map(function(mid) {
          var existing = p.models.find(function(em) { return em.id === mid; });
          return existing || {
            id: mid,
            name: mid,
            contextLimit: 200000,
            outputLimit: 64000,
            toolCall: true
          };
        });

        providersPayload[p.id] = {
          enabled: enVal,
          baseUrl: urlVal,
          apiKeys: rawKeys,
          models: updatedModels,
          custom: Boolean(p.custom),
          name: p.name,
          aliases: p.aliases,
          tier: p.tier,
          dialect: p.dialect
        };
      }

      var combosPayload = [];
      for (var c = 0; c < currentData.config.combos.length; c++) {
        var idEl = document.getElementById("combo-id-" + c);
        if (!idEl) continue;
        var routes = document.getElementById("combo-routes-" + c).value
          .split("\\n").map(function(r) { return r.trim(); }).filter(Boolean);
        combosPayload.push({
          id: idEl.value.trim(),
          name: document.getElementById("combo-name-" + c).value.trim(),
          description: currentData.config.combos[c].description || "",
          strategy: document.getElementById("combo-strat-" + c).value,
          contextLimit: currentData.config.combos[c].contextLimit || 200000,
          outputLimit: currentData.config.combos[c].outputLimit || 64000,
          routes: routes
        });
      }

      var settingsPayload = {
        rtkEnabled: document.getElementById("settingRtkEnabled").value === "true",
        rtkMaxToolChars: parseInt(document.getElementById("settingRtkMaxChars").value, 10) || 12000,
        cavemanMode: document.getElementById("settingCaveman").value,
        timeoutMs: 90000,
        requireAuth: document.getElementById("settingRequireAuth").value === "true"
      };

      var res = await apiFetch("/api/admin/state", {
        method: "PUT",
        body: JSON.stringify({
          settings: settingsPayload,
          providers: providersPayload,
          combos: combosPayload
        })
      });
      var result = await res.json();
      showToast(result.persistedToKv ? "Tersimpan permanen di Cloudflare KV!" : "Tersimpan di memori Worker!");
      await loadAdminData();
    }

    function renderPlaygroundModels(cfg) {
      var sel = document.getElementById("playModelSelect");
      var prevVal = sel.value;
      var opts = '<option value="9router/auto">9router/auto — Smart Auto</option>' +
                 '<option value="9router/coding">9router/coding — Pro Coding</option>';
      for (var p = 0; p < cfg.providers.length; p++) {
        var prov = cfg.providers[p];
        if (!prov.ready) continue;
        if (prov.dialect === "cloudflare-ai" && (!prov.apiKeys || prov.apiKeys.length === 0)) continue;
        for (var m = 0; m < prov.models.length; m++) {
          var modObj = prov.models[m];
          var mLow = modObj.id.toLowerCase();
          if ((mLow.endsWith("-low") || mLow.endsWith("-medium")) && !mLow.startsWith("gpt-oss")) continue;
          var full = prov.id + "/" + modObj.id;
          opts += '<option value="' + escapeHtml(full) + '">' + escapeHtml(full) + '</option>';
        }
      }
      sel.innerHTML = opts;
      if (prevVal) {
        for (var k = 0; k < sel.options.length; k++) {
          if (sel.options[k].value === prevVal) {
            sel.value = prevVal;
            break;
          }
        }
      }
    }

    async function runPlaygroundTest() {
      var out = document.getElementById("playOutput");
      out.textContent = "⏳ Mengirim request ke 9Router...";
      var model = document.getElementById("playModelSelect").value;
      var promptText = document.getElementById("playPrompt").value;
      var clientKey = (currentData.config.clientKeys[0] && currentData.config.clientKeys[0].key) || "";

      var t0 = Date.now();
      try {
        var res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": "Bearer " + clientKey
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: promptText }]
          })
        });
        var elapsed = Date.now() - t0;
        var usedProv = res.headers.get("x-9router-provider") || "-";
        var usedMod = res.headers.get("x-9router-model") || "-";
        var usedAcc = res.headers.get("x-9router-account") || "";
        var tierFb = res.headers.get("x-9router-tier-fallback") || "";
        var attempts = res.headers.get("x-9router-attempts") || "1";
        var json = await res.json();

        if (!res.ok) {
          out.textContent = "❌ Error (" + res.status + "):\\n" + JSON.stringify(json, null, 2);
        } else {
          var reply = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || JSON.stringify(json, null, 2);
          var accLabel = usedAcc ? (" • Akun: " + usedAcc) : "";
          var fbNote = tierFb ? ("\\nℹ️ Info: Model Paid otomatis dialihkan ke model aktif Free (" + tierFb + ").") : "";
          out.textContent = "✅ Dijawab oleh: " + usedProv + "/" + usedMod + accLabel + " (" + elapsed + " ms, percobaan ke-" + attempts + ")" + fbNote + "\\n\\n" + reply;
        }
      } catch (err) {
        out.textContent = "❌ Request Gagal: " + err.message;
      }
    }

    function renderActivityChart(stats, period) {
      var el = document.getElementById("activityChart");
      if (!el) return;
      period = period || (document.getElementById("statsPeriodFilter") ? document.getElementById("statsPeriodFilter").value : "all");
      var byDate = (stats && stats.byDate) || {};
      var days = [];
      var maxReq = 0;
      var totalReq = 0;

      var numDays = 7;
      if (period === "30d") numDays = 30;
      else if (period === "60d") numDays = 60;
      else if (period === "90d") numDays = 90;
      else if (period === "all") numDays = 14;

      if (numDays > 30) {
        var numWeeks = Math.ceil(numDays / 7);
        var nowMs = Date.now();
        for (var w = numWeeks - 1; w >= 0; w--) {
          var wReq = 0;
          var wTokens = 0;
          var startD = new Date(nowMs - (w * 7 + 6) * 86400000);
          var endD = new Date(nowMs - (w * 7) * 86400000);
          for (var dayOff = 0; dayOff < 7; dayOff++) {
            var curr = new Date(nowMs - (w * 7 + dayOff) * 86400000);
            var k = curr.toISOString().slice(0, 10);
            var bk = byDate[k] || {};
            wReq += (bk.requests || 0);
            wTokens += (bk.totalTokens || 0);
          }
          var startStr = (startD.getMonth() + 1) + "/" + startD.getDate();
          var endStr = (endD.getMonth() + 1) + "/" + endD.getDate();
          days.push({
            key: startStr + " - " + endStr,
            label: endStr,
            req: wReq,
            tokens: wTokens,
            today: w === 0
          });
          totalReq += wReq;
          if (wReq > maxReq) maxReq = wReq;
        }
      } else {
        for (var i = numDays - 1; i >= 0; i--) {
          var d = new Date(Date.now() - i * 86400000);
          var key = d.toISOString().slice(0, 10);
          var bucket = byDate[key] || { requests: 0, totalTokens: 0 };
          var req = bucket.requests || 0;
          var tokens = bucket.totalTokens || 0;
          var isToday = i === 0;
          var isYesterday = i === 1;
          var lbl = numDays <= 7
            ? d.toLocaleDateString("id-ID", { weekday: "short" })
            : (d.getDate() === 1 || i % 5 === 0 || i === 0 ? ((d.getMonth() + 1) + "/" + d.getDate()) : "");
          days.push({
            key: key,
            label: lbl,
            req: req,
            tokens: tokens,
            today: isToday,
            yesterday: isYesterday
          });
          totalReq += req;
          if (req > maxReq) maxReq = req;
        }
      }

      var html = "";
      for (var j = 0; j < days.length; j++) {
        var day = days[j];
        var pct = maxReq > 0 ? Math.max(5, Math.round((day.req / maxReq) * 100)) : 5;
        var colClass = "chart-col";
        if (day.today) colClass += " today";
        if (period === "yesterday" && day.yesterday) colClass += " today";
        var valStr = day.req ? (day.req >= 1000 ? Math.round(day.req / 1000) + "k" : day.req) : "·";
        html += '<div class="' + colClass + '" title="' + escapeHtml(day.key) + ' • ' + day.req + ' request • ' + day.tokens.toLocaleString() + ' token">' +
          '<span class="chart-val">' + valStr + '</span>' +
          '<div class="chart-track"><div class="chart-fill" style="height:' + pct + '%;"></div></div>' +
          '<span class="chart-label">' + escapeHtml(day.label || "·") + '</span>' +
        '</div>';
      }
      el.innerHTML = html;

      var summary = document.getElementById("chartSummary");
      if (summary) {
        var labelPeriod = "7 hari";
        if (period === "today") labelPeriod = "hari ini";
        else if (period === "yesterday") labelPeriod = "kemarin";
        else if (period === "7d") labelPeriod = "7 hari";
        else if (period === "30d") labelPeriod = "30 hari";
        else if (period === "60d") labelPeriod = "60 hari";
        else if (period === "90d") labelPeriod = "90 hari";
        else if (period === "all") labelPeriod = "semua waktu";
        summary.textContent = totalReq.toLocaleString() + " request / " + labelPeriod;
      }

      var titleText = document.getElementById("chartCardTitleText");
      if (titleText) {
        if (period === "today") titleText.textContent = "Aktivitas Hari Ini (7 Hari Terakhir)";
        else if (period === "yesterday") titleText.textContent = "Aktivitas Kemarin (7 Hari Terakhir)";
        else if (period === "7d") titleText.textContent = "Aktivitas 7 Hari Terakhir";
        else if (period === "30d") titleText.textContent = "Aktivitas 30 Hari Terakhir";
        else if (period === "60d") titleText.textContent = "Aktivitas 60 Hari Terakhir (Mingguan)";
        else if (period === "90d") titleText.textContent = "Aktivitas 90 Hari Terakhir (Mingguan)";
        else titleText.textContent = "Tren Aktivitas Harian";
      }
    }

    function formatLocalTime(isoStr) {
      if (!isoStr) return "-";
      try {
        var d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr.slice(11, 19);
        return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        return isoStr.slice(11, 19);
      }
    }

    // Quota cooldowns can last days (e.g. "Resets in 115h"), so show a date when needed.
    function formatCooldownUntil(ms) {
      try {
        var d = new Date(ms);
        var diff = ms - Date.now();
        var hours = Math.max(1, Math.round(diff / 3600000));
        if (diff > 36 * 3600000) {
          return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' +
            d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) +
            ' (' + Math.round(diff / 86400000) + 'h)';
        }
        if (diff > 3600000) return hours + ' jam lagi';
        return Math.max(1, Math.round(diff / 60000)) + ' menit lagi';
      } catch (e) {
        return new Date(ms).toLocaleTimeString();
      }
    }

    initTheme();
    loadAdminData();
    setInterval(loadAdminData, 5000);
  `;
