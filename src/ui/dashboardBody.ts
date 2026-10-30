export function renderDashboardBody(appName: string): string {
  return `
  <!-- ICON SPRITE -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></symbol>
    <symbol id="i-orbit" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-28 12 12)"/></symbol>
    <symbol id="i-bot" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01M2 13v2M22 13v2"/></symbol>
    <symbol id="i-rocket" viewBox="0 0 24 24"><path d="M5 15c-1 3-1 4-2 6 2-1 3-1 6-2"/><path d="M9 15l-3-3c1-6 6-9 13-9 0 7-3 12-9 13l-1-1z"/><circle cx="14.5" cy="9.5" r="1.5"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></symbol>
    <symbol id="i-zap" viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></symbol>
    <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5 21 2m-4 4 3 3m-6-1 3 3"/></symbol>
    <symbol id="i-flask" viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3"/><path d="M7 15h10"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></symbol>
    <symbol id="i-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></symbol>
    <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></symbol>
    <symbol id="i-save" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M7 3v6h9M8 21v-7h8v7"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
    <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></symbol>
    <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
    <symbol id="i-coins" viewBox="0 0 24 24"><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6"/><path d="M15 11c3 .3 6 1.5 6 3 0 1.7-2.7 3-6 3-1.2 0-2.3-.2-3.2-.5"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 5.5"/></symbol>
    <symbol id="i-server" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></symbol>
    <symbol id="i-terminal" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9l3 3-3 3M14 15h4"/></symbol>
    <symbol id="i-sparkles" viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"/><path d="M19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1-2.1-.9 2.1-.9L19 15z"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3 3.6"/><path d="M6.6 6.9A17.4 17.4 0 0 0 2 12s3.5 6 10 6a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></symbol>
    <symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l9 16H3l9-16z"/><path d="M12 9v4M12 16h.01"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z"/></symbol>
    <symbol id="i-crown" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></symbol>
  </defs></svg>

  <!-- LOGIN SCREEN -->
  <div id="loginModal" class="login-overlay">
    <div class="login-shell" id="loginBox">
      <aside class="login-aside">
        <div class="login-aside-brand">
          <div class="brand-logo">9</div>
          <div>
            <h2>9Router</h2>
            <p>Cloudflare AI Edge Gateway</p>
          </div>
        </div>
        <div class="login-aside-copy">
          <h3>Satu endpoint untuk semua model AI Anda.</h3>
          <p>Kelola multi-akun OAuth, rotasi API key, smart fallback, dan kuota client dalam satu dashboard yang rapi.</p>
          <div class="login-features">
            <div class="login-feature"><i>✓</i> Multi-akun Google &amp; Claude otomatis</div>
            <div class="login-feature"><i>✓</i> Smart combos dengan fallback instan</div>
            <div class="login-feature"><i>✓</i> Monitoring token &amp; biaya real-time</div>
          </div>
        </div>
        <div class="login-aside-foot">Berjalan penuh di Cloudflare Workers &amp; D1.</div>
      </aside>

      <div class="login-panel">
        <button class="icon-btn theme-toggle" id="loginThemeToggle" type="button" onclick="toggleTheme()" title="Ganti tema" aria-label="Ganti tema">
          <svg class="ic ic-sun"><use href="#i-sun"></use></svg>
          <svg class="ic ic-moon"><use href="#i-moon"></use></svg>
        </button>
        <div class="login-logo-wrap">
          <div class="login-mobile-logo">9</div>
          <div class="login-title">${appName}</div>
          <div class="login-subtitle">Masuk untuk mengelola router, akun OAuth, dan API key Anda.</div>
        </div>
        <div class="login-field">
          <label for="adminPassInput">Password Admin</label>
          <div class="pw-wrap">
            <input type="password" id="adminPassInput" placeholder="Masukkan password admin..." autocomplete="current-password"
              onkeydown="if(event.key==='Enter') submitLogin()" />
            <button class="pw-eye" type="button" onclick="togglePwEye()" id="pwEyeBtn" title="Tampilkan password">
              <svg class="ic"><use href="#i-eye"></use></svg>
            </button>
          </div>
        </div>
        <div class="login-error" id="loginError">Password salah. Periksa kembali password admin Anda.</div>
        <button class="btn block" id="loginBtn" onclick="submitLogin()">
          <svg class="ic"><use href="#i-lock"></use></svg> Masuk Dashboard
        </button>
        <div class="login-footnote">Koneksi aman • Sesi disimpan di perangkat ini</div>
      </div>
    </div>
  </div>

  <!-- TOAST -->
  <div id="toast" class="toast"></div>

  <!-- SIDEBAR BACKDROP (mobile tap-to-close) -->
  <div id="sidebarBackdrop" class="sidebar-backdrop" onclick="closeSidebar()"></div>

  <div class="app-shell">
    <!-- SIDEBAR NAVIGATION -->
    <aside class="app-sidebar" id="appSidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">9</div>
        <div class="brand-info">
          <h1>${appName}</h1>
          <p>AI Edge Multi-Account Router</p>
        </div>
      </div>

      <nav class="sidebar-menu">
        <div class="nav-label">Monitoring</div>
        <button class="tab-btn active" id="tabBtn-dashboard" onclick="switchTab('dashboard', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-grid"></use></svg></span> Dashboard
        </button>

        <div class="nav-label">OAuth Akun AI</div>
        <button class="tab-btn" id="tabBtn-antigravity" onclick="switchTab('antigravity', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-orbit"></use></svg></span> Antigravity
          <span class="tab-badge" id="badgeNavAg">0</span>
        </button>
        <button class="tab-btn" id="tabBtn-claude" onclick="switchTab('claude', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-bot"></use></svg></span> Claude.ai
          <span class="tab-badge" id="badgeNavClaude">0</span>
        </button>

        <div class="nav-label">Routing &amp; Model</div>
        <button class="tab-btn" id="tabBtn-opencode" onclick="switchTab('opencode', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-rocket"></use></svg></span> Integrasi OpenCode
        </button>
        <button class="tab-btn" id="tabBtn-providers" onclick="switchTab('providers', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-globe"></use></svg></span> Provider &amp; API
        </button>
        <button class="tab-btn" id="tabBtn-combos" onclick="switchTab('combos', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-zap"></use></svg></span> Smart Combos
        </button>

        <div class="nav-label">Akses &amp; Testing</div>
        <button class="tab-btn" id="tabBtn-keys" onclick="switchTab('keys', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-key"></use></svg></span> Client API Keys
        </button>
        <button class="tab-btn" id="tabBtn-playground" onclick="switchTab('playground', this)">
          <span class="tab-icon"><svg class="ic"><use href="#i-flask"></use></svg></span> Live Playground
        </button>
      </nav>

      <div class="sidebar-footer">
        <span id="storageBadge" class="badge"><span class="dot"></span><span>Memuat...</span></span>
        <button class="icon-btn" type="button" onclick="logoutAdmin()" title="Logout" aria-label="Logout">
          <svg class="ic"><use href="#i-logout"></use></svg>
        </button>
      </div>
    </aside>

    <!-- MAIN APP CONTAINER -->
    <main class="app-main">
      <header class="app-topbar">
        <div class="topbar-left">
          <button class="menu-toggle" onclick="openSidebar()" aria-label="Buka menu">
            <svg class="ic"><use href="#i-menu"></use></svg>
          </button>
          <div class="crumb">
            <span class="crumb-eyebrow">9Router Console</span>
            <span class="crumb-title" id="pageTitle">Dashboard</span>
          </div>
        </div>
        <div class="topbar-right">
          <span id="endpointBadge" class="badge mono badge-hide-mobile">Base URL: /v1</span>
          <button class="icon-btn theme-toggle" id="themeToggle" type="button" onclick="toggleTheme()" title="Ganti tema" aria-label="Ganti tema">
            <svg class="ic ic-sun"><use href="#i-sun"></use></svg>
            <svg class="ic ic-moon"><use href="#i-moon"></use></svg>
          </button>
          <button class="icon-btn" type="button" onclick="loadAdminData()" title="Refresh data" aria-label="Refresh data">
            <svg class="ic"><use href="#i-refresh"></use></svg>
          </button>
          <button class="btn btn-hide-mobile" onclick="switchTab('playground')">
            <svg class="ic"><use href="#i-play"></use></svg> <span class="btn-text">Test AI</span>
          </button>
        </div>
      </header>

      <div class="content-wrap">

      <!-- TAB 1: DASHBOARD & LOGS -->
      <section id="tab-dashboard" class="panel active">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-chart"></use></svg> Overview</div>
            <h2 class="page-title">Dashboard</h2>
            <p class="page-sub">Ringkasan trafik, token, dan penghematan biaya dari seluruh akun serta provider Anda.</p>
          </div>
          <div class="page-actions">
            <span class="period-picker">
              <label for="statsPeriodFilter">Periode</label>
              <select id="statsPeriodFilter" onchange="renderAll()">
                <option value="today">Hari Ini</option>
                <option value="yesterday">Kemarin</option>
                <option value="7d">Seminggu (7 Hari)</option>
                <option value="30d">Sebulan (30 Hari)</option>
                <option value="60d">2 Bulan (60 Hari)</option>
                <option value="90d">3 Bulan (90 Hari)</option>
                <option value="all" selected>Semua Waktu</option>
              </select>
            </span>
            <button class="btn ghost sm" onclick="exportStatsFile('csv')">
              <svg class="ic ic-sm"><use href="#i-download"></use></svg> CSV
            </button>
            <button class="btn ghost sm" onclick="exportStatsFile('json')">
              <svg class="ic ic-sm"><use href="#i-download"></use></svg> JSON
            </button>
            <button class="btn danger sm" onclick="confirmResetStats()">
              <svg class="ic ic-sm"><use href="#i-trash"></use></svg> Reset
            </button>
          </div>
        </div>

        <!-- HERO COST SAVINGS -->
        <div class="hero">
          <div class="hero-main">
            <div class="hero-icon"><svg class="ic" style="width:26px;height:26px"><use href="#i-coins"></use></svg></div>
            <div>
              <div class="hero-label">Estimasi biaya yang dihemat</div>
              <div class="hero-value" id="statCostSaved">$0.00</div>
              <div class="hero-note">Dihitung dari tarif resmi OpenAI / Anthropic untuk token yang diproses lewat akun gratis Anda.</div>
            </div>
          </div>
          <div class="hero-side">
            <div class="hero-mini"><span>Request</span><b id="heroRequests">0</b></div>
            <div class="hero-mini"><span>Token</span><b id="heroTokens">0</b></div>
            <div class="hero-mini"><span>Provider siap</span><b id="heroProviders">0</b></div>
          </div>
        </div>

        <!-- STAT METRICS -->
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-brand"><svg class="ic"><use href="#i-orbit"></use></svg></span>
            </div>
            <div class="stat-label">Akun Antigravity Aktif</div>
            <div class="stat-value" id="statAgAccounts">0</div>
            <div class="stat-hint">Rotasi OAuth otomatis</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-blue"><svg class="ic"><use href="#i-server"></use></svg></span>
            </div>
            <div class="stat-label">Total Permintaan</div>
            <div class="stat-value" id="statTotalRequests">0</div>
            <div class="stat-hint">Request yang diproses router</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-purple"><svg class="ic"><use href="#i-sparkles"></use></svg></span>
            </div>
            <div class="stat-label">Total Token Terpakai</div>
            <div class="stat-value" id="statTotalTokens">0</div>
            <div class="stat-hint">Prompt + completion</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-green"><svg class="ic"><use href="#i-chart"></use></svg></span>
            </div>
            <div class="stat-label">Prompt / Completion</div>
            <div class="stat-value" id="statTokensSplit" style="font-size:17px;">0 / 0</div>
            <div class="stat-hint">Rasio token masuk &amp; keluar</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-green"><svg class="ic"><use href="#i-shield"></use></svg></span>
            </div>
            <div class="stat-label">Provider Siap Pakai</div>
            <div class="stat-value" id="statReadyProviders">0</div>
            <div class="stat-hint">Memiliki key / akun aktif</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-blue"><svg class="ic"><use href="#i-refresh"></use></svg></span>
            </div>
            <div class="stat-label">Auto-Fallback Berhasil</div>
            <div class="stat-value" id="statFallbacks">0</div>
            <div class="stat-hint">Dialihkan tanpa error</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-warn"><svg class="ic"><use href="#i-zap"></use></svg></span>
            </div>
            <div class="stat-label">RTK Saver</div>
            <div class="stat-value" id="statRtkSaved">0</div>
            <div class="stat-hint">Karakter tool yang dipangkas</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <span class="stat-icon tint-brand"><svg class="ic"><use href="#i-coins"></use></svg></span>
            </div>
            <div class="stat-label">Rata-rata Token / Request</div>
            <div class="stat-value" id="statAvgTokens">0</div>
            <div class="stat-hint">Efisiensi pemakaian konteks</div>
          </div>
        </div>

        <!-- ACTIVITY CHART -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-chart"></use></svg> <span id="chartCardTitleText">Aktivitas Tren Harian</span></div>
              <div class="card-desc">Jumlah request harian dari data D1 SQLite / KV.</div>
            </div>
            <span class="badge info" id="chartSummary">0 request</span>
          </div>
          <div class="chart">
            <div class="chart-bars" id="activityChart"></div>
          </div>
        </div>

        <!-- USAGE PER CLIENT API KEY -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-key"></use></svg> Penggunaan per Client API Key (OpenCode / Eksternal)</div>
              <div class="card-desc">Rincian request, kuota, dan token per API Key yang dibuat untuk klien atau aplikasi.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Client Key</th>
                  <th>Masked Key</th>
                  <th>Total Req</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total Token</th>
                  <th>Hemat ($)</th>
                  <th>Terakhir Dipakai</th>
                </tr>
              </thead>
              <tbody id="clientKeysStatsTableBody"></tbody>
            </table>
          </div>
        </div>

        <!-- USAGE PER OAUTH ACCOUNT -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-shield"></use></svg> Beban Rotasi Akun Upstream (OAuth Google Antigravity &amp; Claude)</div>
              <div class="card-desc">Riwayat pembagian beban kerja request &amp; token antar akun yang terhubung.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email / ID Akun</th>
                  <th>Provider</th>
                  <th>Total Req</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total Token</th>
                  <th>Hemat ($)</th>
                  <th>Terakhir Dipakai</th>
                </tr>
              </thead>
              <tbody id="oauthAccountsStatsTableBody"></tbody>
            </table>
          </div>
        </div>

        <!-- USAGE PER MODEL -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-sparkles"></use></svg> Penggunaan per Model AI</div>
              <div class="card-desc">Statistik token yang tersimpan di Cloudflare D1 SQLite &amp; KV.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model / Provider</th>
                  <th>Total Req</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total Token</th>
                  <th>Hemat ($)</th>
                </tr>
              </thead>
              <tbody id="modelsStatsTableBody"></tbody>
            </table>
          </div>
        </div>

        <!-- RECENT REQUEST LOGS -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-clock"></use></svg> Riwayat Request Terbaru</div>
              <div class="card-desc">Log permintaan, latensi, dan jalur fallback secara real-time.</div>
            </div>
            <button class="btn ghost sm" onclick="loadAdminData()">
              <svg class="ic ic-sm"><use href="#i-refresh"></use></svg> Refresh
            </button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Client Key</th>
                  <th>Diminta</th>
                  <th>Dijawab Oleh</th>
                  <th>Akun / Key Upstream</th>
                  <th>Tokens (P / C / Tot)</th>
                  <th>Nilai ($)</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Latensi</th>
                </tr>
              </thead>
              <tbody id="logsTableBody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: ANTIGRAVITY MULTI-ACCOUNT -->
      <section id="tab-antigravity" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-orbit"></use></svg> OAuth Provider</div>
            <h2 class="page-title">Antigravity Multi-Akun</h2>
            <p class="page-sub">Hubungkan banyak akun Google Antigravity dengan rotasi otomatis dan failover instan saat limit.</p>
          </div>
          <div class="page-actions">
            <span class="badge brand"><span class="dot"></span> <span id="agPageBadge">0 akun aktif</span></span>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-link"></use></svg> Hubungkan Akun Google Antigravity</div>
              <div class="card-desc">Untuk akun ke-2 dan seterusnya, gunakan Copy Link lalu buka di jendela Incognito.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="step">
              <span class="step-num">1</span>
              <div class="step-body">
                <div class="step-title">Buka halaman otorisasi Google</div>
                <div class="step-desc">Login dengan akun Google yang memiliki akses Antigravity, lalu klik <b>Allow / Izinkan</b>.</div>
                <div class="step-actions">
                  <button class="btn" onclick="openAntigravityGoogleLogin()">
                    <svg class="ic"><use href="#i-link"></use></svg> Buka Login Google
                  </button>
                  <button class="btn ghost" onclick="copyAntigravityGoogleLoginUrl()">
                    <svg class="ic"><use href="#i-copy"></use></svg> Copy Link Login
                  </button>
                </div>
              </div>
            </div>

            <div class="step">
              <span class="step-num">2</span>
              <div class="step-body">
                <div class="step-title">Tempel URL callback</div>
                <div class="step-desc">Setelah diizinkan, browser diarahkan ke <code>http://localhost:8085/callback?code=4/0A...</code>. Pesan <i>This site can't be reached</i> adalah normal — salin seluruh URL dari address bar.</div>
                <div class="form-grid-inline" style="margin-top:10px;">
                  <input type="text" id="agCallbackInput" placeholder="http://localhost:8085/callback?code=4/0A..." />
                  <button class="btn" id="btnExchangeAg" onclick="submitAntigravityCallback()">
                    <svg class="ic"><use href="#i-check"></use></svg> Hubungkan Akun
                  </button>
                </div>
              </div>
            </div>

            <details class="advanced">
              <summary><svg class="ic ic-sm"><use href="#i-download"></use></svg> Punya refresh token dari 9Router lokal? Bulk import sekaligus</summary>
              <div class="field">
                <label for="agBulkRefreshInput">Paste refresh token (1 baris 1 token <code>1//0g...</code>) atau JSON dari <code>~/.9router/db.json</code></label>
                <textarea rows="3" id="agBulkRefreshInput" placeholder="1//0gxxxxxxxxxxxxxxxxxxxxxxxxx"></textarea>
              </div>
              <button class="btn ghost" id="btnBulkImportAg" onclick="submitBulkRefreshImport()">
                <svg class="ic"><use href="#i-download"></use></svg> Import Semua Akun
              </button>
            </details>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-users"></use></svg> Akun Antigravity Terhubung</div>
              <div class="card-desc">Akun <b>#1</b> dipakai lebih dulu. Geser <b>⠿</b>, klik <b>▲▼</b>, atau tekan <b>⭐ Jadikan Utama</b> untuk mengatur urutan.</div>
            </div>
            <div class="card-actions">
              <button class="btn ghost sm" onclick="checkAntigravityLiveModels()">
                <svg class="ic ic-sm"><use href="#i-search"></use></svg> Cek Model Aktif
              </button>
              <button class="btn ghost sm" onclick="loadAdminData()">
                <svg class="ic ic-sm"><use href="#i-refresh"></use></svg> Refresh Kuota
              </button>
            </div>
          </div>
          <div id="agOrderFlow" class="order-flow" style="display:none;"></div>
          <pre id="agAvailableModelsBox" style="display:none;margin:14px 20px 0;"></pre>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:250px;">Urutan Prioritas</th>
                  <th>Email Akun</th>
                  <th>Project ID</th>
                  <th>Status &amp; Limit</th>
                  <th>Terakhir Dipakai</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="agAccountsTableBody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 3: CLAUDE.AI MULTI-ACCOUNT -->
      <section id="tab-claude" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-bot"></use></svg> OAuth Provider</div>
            <h2 class="page-title">Claude.ai Multi-Akun</h2>
            <p class="page-sub">Rotasi otomatis multi-akun Claude Pro / Max via OAuth PKCE resmi untuk dialect Anthropic.</p>
          </div>
          <div class="page-actions">
            <span class="badge purple"><span class="dot"></span> <span id="claudePageBadge">0 akun aktif</span></span>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title" style="color:var(--claude);"><svg class="ic" style="color:var(--claude);"><use href="#i-link"></use></svg> Hubungkan Akun Claude.ai</div>
              <div class="card-desc">Gunakan Incognito untuk akun ke-2, ke-3, dan seterusnya.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="step claude">
              <span class="step-num">1</span>
              <div class="step-body">
                <div class="step-title">Buka otorisasi Claude.ai</div>
                <div class="step-desc">Login ke akun Claude Pro / Max Anda, lalu klik <b>Authorize</b>.</div>
                <div class="step-actions">
                  <button class="btn claude" onclick="openClaudeOAuthLogin()">
                    <svg class="ic"><use href="#i-link"></use></svg> Buka Login Claude.ai
                  </button>
                  <button class="btn ghost" onclick="copyClaudeOAuthLoginUrl()">
                    <svg class="ic"><use href="#i-copy"></use></svg> Copy Link Login
                  </button>
                </div>
              </div>
            </div>

            <div class="step claude">
              <span class="step-num">2</span>
              <div class="step-body">
                <div class="step-title">Tempel URL callback</div>
                <div class="step-desc">Salin seluruh URL dari <code>http://localhost:8085/callback?code=...</code> lalu tempel di bawah ini.</div>
                <div class="form-grid-inline" style="margin-top:10px;">
                  <input type="text" id="claudeCallbackInput" placeholder="http://localhost:8085/callback?code=..." />
                  <button class="btn claude" id="btnExchangeClaude" onclick="submitClaudeCallback()">
                    <svg class="ic"><use href="#i-check"></use></svg> Hubungkan Akun Claude
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-users"></use></svg> Akun Claude.ai Terhubung</div>
              <div class="card-desc">Akun <b>#1</b> dipakai lebih dulu. Geser <b>⠿</b>, klik <b>▲▼</b>, atau tekan <b>⭐ Jadikan Utama</b> untuk mengatur urutan.</div>
            </div>
            <button class="btn ghost sm" onclick="loadAdminData()">
              <svg class="ic ic-sm"><use href="#i-refresh"></use></svg> Refresh Kuota
            </button>
          </div>
          <div id="claudeOrderFlow" class="order-flow" style="display:none;"></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:250px;">Urutan Prioritas</th>
                  <th>Email Akun</th>
                  <th>Tier</th>
                  <th>Status &amp; Limit</th>
                  <th>Terakhir Dipakai</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="claudeAccountsTableBody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 4: OPENCODE INTEGRATION -->
      <section id="tab-opencode" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-rocket"></use></svg> Integration</div>
            <h2 class="page-title">Integrasi OpenCode</h2>
            <p class="page-sub">Satu file konfigurasi bersih agar OpenCode Desktop & CLI langsung memakai pool multi-akun Antigravity Anda.</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" onclick="copyOpenCodeJson()">
              <svg class="ic"><use href="#i-copy"></use></svg> Salin JSON
            </button>
            <button class="btn" onclick="downloadOpenCodeJson()">
              <svg class="ic"><use href="#i-download"></use></svg> Unduh JSON
            </button>
            <button class="btn ghost" onclick="copyWindowsCmd()" title="Salin perintah PowerShell untuk otomatis membuat folder dan menyimpan config">
              <svg class="ic"><use href="#i-terminal"></use></svg> 1-Click PowerShell
            </button>
          </div>
        </div>

        <!-- CALLOUT: VARIANT & REASONING EFFORT -->
        <div class="card" style="border-left: 4px solid var(--brand); margin-bottom: 16px;">
          <div class="card-body" style="padding: 16px 20px;">
            <div style="display:flex; align-items:flex-start; gap:14px;">
              <span style="font-size:1.6rem; line-height:1;">💡</span>
              <div>
                <div style="font-weight:700; font-size:1rem; margin-bottom:4px; color:var(--text);">Dukungan Varian & Reasoning Effort OpenCode</div>
                <div class="page-sub" style="margin:0; font-size:0.875rem; line-height:1.6;">
                  OpenCode Desktop sudah menyediakan pemilih varian (<b>High / Medium / Low</b>) dan tingkat pemikiran langsung di antarmuka aplikasinya. Konfigurasi 9Router di bawah menggunakan <b>nama model dasar</b> (misal <code>gemini-3.8-flash</code>) tanpa akhiran tier. Ketika Anda memilih varian di OpenCode, 9Router secara otomatis memetakannya ke upstream Google Antigravity yang sesuai!
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTIVE MODELS REFERENCE TABLE -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-cpu"></use></svg> Model Aktif di OpenCode</div>
              <div class="card-desc">Semua model ini berjalan di atas pool multi-akun Google Antigravity Anda dengan failover instan saat kena batas kuota (429).</div>
            </div>
          </div>
          <div class="card-body" style="padding:0; overflow-x:auto;">
            <table class="table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="padding:10px 16px; text-align:left;">Model ID</th>
                  <th style="padding:10px 16px; text-align:left;">Nama Model</th>
                  <th style="padding:10px 16px; text-align:left;">Varian di OpenCode</th>
                  <th style="padding:10px 16px; text-align:left;">Keunggulan & Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">gemini-4-argon</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Gemini 4 Argon</td>
                  <td style="padding:12px 16px;"><span class="badge purple">High / Medium / Low</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;"><b>Flagship Next-Gen:</b> Model Gemini 4 dengan Deep Reasoning tercanggih &amp; 1M context.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">gemini-3.8-flash</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Gemini 3.8 Flash</td>
                  <td style="padding:12px 16px;"><span class="badge info">High / Medium / Low</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;"><b>Rekomendasi Utama:</b> 1M context, respon ultra-cepat, akurasi coding tinggi.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">gemini-2.5-pro</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Gemini 2.5 Pro</td>
                  <td style="padding:12px 16px;"><span class="badge">Default</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Deep Reasoning untuk perancangan arsitektur, bug rumit, dan refactoring multi-file.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">gemini-3-flash</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Gemini 3 Flash</td>
                  <td style="padding:12px 16px;"><span class="badge">Default</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Generasi baru Gemini 3, sangat responsif untuk interaksi tanya-jawab cepat.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">gemini-2.5-flash</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Gemini 2.5 Flash</td>
                  <td style="padding:12px 16px;"><span class="badge">Default</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Model super hemat kuota yang sangat stabil untuk testing dan automasi harian.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">claude-sonnet-5-5</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Claude Sonnet 5.5 Thinking</td>
                  <td style="padding:12px 16px;"><span class="badge purple">Thinking</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Model coding agent flagship Claude 5.5 terbaru via Antigravity dengan akurasi tool-calling tinggi.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">claude-opus-5-5</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Claude Opus 5.5 Thinking</td>
                  <td style="padding:12px 16px;"><span class="badge purple">Thinking</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Model pemikiran terdalam Claude 5.5 untuk analisis logika rumit dan sintesis arsitektur.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">claude-sonnet-4-6</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Claude Sonnet 4.6 Thinking</td>
                  <td style="padding:12px 16px;"><span class="badge purple">Thinking</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Model coding agent flagship Claude via akun Antigravity dengan akurasi tool-call tinggi.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">claude-opus-4-6</code></td>
                  <td style="padding:12px 16px; font-weight:600;">Claude Opus 4.6 Thinking</td>
                  <td style="padding:12px 16px;"><span class="badge purple">Thinking</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Model pemikiran terdalam dari Anthropic untuk sintesis logika tingkat lanjut.</td>
                </tr>
                <tr style="border-top:1px solid var(--border-soft);">
                  <td style="padding:12px 16px;"><code class="t-brand" style="font-weight:700;">auto</code></td>
                  <td style="padding:12px 16px; font-weight:600;">⚡ 9Router Auto Fallback</td>
                  <td style="padding:12px 16px;"><span class="badge green">Multi-Akun Pool</span></td>
                  <td style="padding:12px 16px; color:var(--text-soft); font-size:0.875rem;">Rotasi otomatis antar semua akun Antigravity Anda dengan failover instan jika limit 429.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- OPENCODE CONFIG FILE PREVIEW -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-terminal"></use></svg> Konfigurasi opencode.json</div>
              <div class="card-desc">Simpan sebagai <code>opencode.json</code> di root proyek Anda atau di folder konfigurasi global.</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn ghost sm" onclick="copyOpenCodeJson()">
                <svg class="ic ic-sm"><use href="#i-copy"></use></svg> Salin JSON
              </button>
              <button class="btn sm" onclick="downloadOpenCodeJson()">
                <svg class="ic ic-sm"><use href="#i-download"></use></svg> Unduh File
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="grid-2" style="margin-bottom:14px;">
              <div class="step">
                <span class="step-num">W</span>
                <div class="step-body">
                  <div class="step-title">Windows</div>
                  <div class="step-desc"><code>%USERPROFILE%\\.config\\opencode\\opencode.json</code></div>
                </div>
              </div>
              <div class="step">
                <span class="step-num">L</span>
                <div class="step-body">
                  <div class="step-title">Linux / macOS</div>
                  <div class="step-desc"><code>~/.config/opencode/opencode.json</code></div>
                </div>
              </div>
            </div>

            <label class="check-row" style="margin-bottom:12px;">
              <input type="checkbox" id="showAllModelsToggle" onchange="refreshOpenCodePreview()" />
              Tampilkan semua katalog model (termasuk provider eksternal jika ada)
            </label>

            <div class="code-head">
              <div class="code-dots"><i></i><i></i><i></i></div>
              <span class="badge info mono">JSON</span>
            </div>
            <pre id="opencodeJsonBox">Memuat konfigurasi opencode.json...</pre>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-globe"></use></svg> Universal Endpoint (Cursor, Cline, Claude Code)</div>
              <div class="card-desc">Konfigurasi endpoint universal untuk Cursor, Cline, Roo Code, Continue, dan Claude Code CLI.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="code-head">
              <div class="code-dots"><i></i><i></i><i></i></div>
              <span class="badge purple mono">shell / env</span>
            </div>
            <pre id="otherToolsSnippet"></pre>
          </div>
        </div>
      </section>

      <!-- TAB 5: PROVIDERS & API KEYS -->
      <section id="tab-providers" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-globe"></use></svg> Routing</div>
            <h2 class="page-title">Provider &amp; API Keys</h2>
            <p class="page-sub">Multi-key rotation untuk OpenAI, Anthropic, Gemini, DeepSeek, Groq, Cloudflare AI, dan lainnya.</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" onclick="promptAddCustomProvider()">
              <svg class="ic"><use href="#i-plus"></use></svg> Custom Provider
            </button>
            <button class="btn" onclick="saveAllConfig()">
              <svg class="ic"><use href="#i-save"></use></svg> Simpan Semua
            </button>
          </div>
        </div>
        <div id="providersContainer" class="provider-grid"></div>
      </section>

      <!-- TAB 6: SMART COMBOS & RTK -->
      <section id="tab-combos" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-zap"></use></svg> Optimization</div>
            <h2 class="page-title">Smart Combos &amp; RTK</h2>
            <p class="page-sub">Hemat kuota dengan kompresi tool output dan rute fallback otomatis antar model.</p>
          </div>
          <div class="page-actions">
            <button class="btn" onclick="saveAllConfig()">
              <svg class="ic"><use href="#i-save"></use></svg> Simpan Pengaturan
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-zap"></use></svg> Penghemat Kuota</div>
              <div class="card-desc">RTK memangkas token berulang dari log terminal &amp; git diff pada agent coding.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="grid-2">
              <div class="field">
                <label for="settingRtkEnabled">RTK Token Saver</label>
                <select id="settingRtkEnabled">
                  <option value="true">AKTIF (Rekomendasi)</option>
                  <option value="false">NONAKTIF</option>
                </select>
              </div>
              <div class="field">
                <label for="settingRtkMaxChars">Batas Karakter Tool Lama</label>
                <input type="number" id="settingRtkMaxChars" value="12000" />
              </div>
              <div class="field">
                <label for="settingCaveman">Caveman Mode</label>
                <select id="settingCaveman">
                  <option value="off">Off (Gaya bahasa normal)</option>
                  <option value="light">Light (Ringkas &amp; padat)</option>
                  <option value="medium">Medium (To-the-point)</option>
                  <option value="ultra">Ultra Caveman (Sangat hemat)</option>
                </select>
              </div>
              <div class="field">
                <label for="settingRequireAuth">Wajibkan Client API Key</label>
                <select id="settingRequireAuth">
                  <option value="true">Wajib (Direkomendasikan)</option>
                  <option value="false">Tanpa Auth (Hanya Localhost)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-shield"></use></svg> Virtual Model Auto-Fallback</div>
              <div class="card-desc">Jika provider utama gagal atau limit, 9Router otomatis mencoba rute berikutnya.</div>
            </div>
            <div class="card-actions">
              <button class="btn ghost sm" onclick="addNewCombo()">
                <svg class="ic ic-sm"><use href="#i-plus"></use></svg> Combo Baru
              </button>
              <button class="btn sm" onclick="saveAllConfig()">
                <svg class="ic ic-sm"><use href="#i-save"></use></svg> Simpan
              </button>
            </div>
          </div>
          <div class="card-body">
            <div id="combosContainer"></div>
          </div>
        </div>
      </section>

      <!-- TAB 7: CLIENT API KEYS -->
      <section id="tab-keys" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-key"></use></svg> Access</div>
            <h2 class="page-title">Client API Keys</h2>
            <p class="page-sub">Buat key <code>sk-9r-...</code> dan tetapkan batas kuota token / request harian.</p>
          </div>
          <div class="page-actions">
            <button class="btn" onclick="generateNewClientKey()">
              <svg class="ic"><use href="#i-plus"></use></svg> Buat API Key
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-key"></use></svg> Daftar Client Key</div>
              <div class="card-desc">Sisa kuota dihitung otomatis dari pemakaian hari ini.</div>
            </div>
            <span class="badge ok" id="keysSummaryBadge"><span class="dot"></span> 0 key</span>
          </div>
          <div class="card-body">
            <div id="clientKeysContainer"></div>
          </div>
        </div>
      </section>

      <!-- TAB 8: PLAYGROUND -->
      <section id="tab-playground" class="panel">
        <div class="page-head">
          <div>
            <div class="eyebrow"><svg class="ic ic-sm"><use href="#i-flask"></use></svg> Testing</div>
            <h2 class="page-title">Live Playground</h2>
            <p class="page-sub">Uji rute model, failover multi-akun, dan latensi Cloudflare Workers secara langsung.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title"><svg class="ic"><use href="#i-flask"></use></svg> Uji Coba Model</div>
              <div class="card-desc">Request dikirim lewat endpoint publik <code>/v1/chat/completions</code>.</div>
            </div>
          </div>
          <div class="card-body">
            <div class="play-grid">
              <div class="field">
                <label for="playModelSelect">Model / Virtual Combo</label>
                <select id="playModelSelect"></select>
              </div>
              <div class="field">
                <label for="playPrompt">Pesan Prompt</label>
                <input type="text" id="playPrompt" value="Halo! Sebutkan model apa kamu dan buat fungsi singkat tambah(a,b) dalam TypeScript." />
              </div>
            </div>
            <button class="btn" onclick="runPlaygroundTest()">
              <svg class="ic"><use href="#i-play"></use></svg> Jalankan Uji Coba
            </button>
            <pre id="playOutput" style="margin-top:14px;min-height:140px;">Hasil respon model akan tampil di sini...</pre>
          </div>
        </div>
      </section>

      </div>
    </main>
  </div><!-- /.app-shell -->
`;
}
