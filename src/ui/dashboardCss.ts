// Auto-extracted dashboard design system (light + dark).
// Kept in its own module to keep dashboard.ts readable.
export const DASHBOARD_CSS = `
    /* ============================================================
       9ROUTER UI — DESIGN SYSTEM
       Light + Dark theme, fully responsive
       ============================================================ */
    :root {
      --sidebar-w: 268px;
      --topbar-h: 66px;
      --radius-lg: 18px;
      --radius: 14px;
      --radius-sm: 10px;
      --brand: #f97316;
      --brand-2: #fb923c;
      --brand-soft: rgba(249, 115, 22, 0.12);
      --green: #10b981;
      --green-soft: rgba(16, 185, 129, 0.12);
      --blue: #3b82f6;
      --blue-soft: rgba(59, 130, 246, 0.12);
      --purple: #8b5cf6;
      --purple-soft: rgba(139, 92, 246, 0.12);
      --danger: #ef4444;
      --danger-soft: rgba(239, 68, 68, 0.12);
      --warn: #f59e0b;
      --warn-soft: rgba(245, 158, 11, 0.14);
      --claude: #d97757;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --ease: cubic-bezier(.4, 0, .2, 1);
    }

    /* ---------- DARK ---------- */
    :root[data-theme="dark"] {
      color-scheme: dark;
      --bg: #070b12;
      --bg-soft: #0a0f19;
      --sidebar: #0a0f1a;
      --card: #0f1624;
      --card-2: #131c2d;
      --card-hover: #162134;
      --input: #0a111d;
      --border: #1d2940;
      --border-soft: #172033;
      --border-strong: #2a3a56;
      --text: #eef3fb;
      --text-soft: #b8c5d9;
      --muted: #8fa0ba;
      --dim: #5d7091;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, .4);
      --shadow: 0 10px 30px rgba(0, 0, 0, .35);
      --shadow-lg: 0 24px 70px rgba(0, 0, 0, .55);
      --glow: rgba(249, 115, 22, .16);
      --topbar-bg: rgba(7, 11, 18, .78);
      --code-bg: #050910;
      --skeleton: rgba(255, 255, 255, .06);
      --grid-line: rgba(255, 255, 255, .035);
    }

    /* ---------- LIGHT ---------- */
    :root[data-theme="light"] {
      color-scheme: light;
      --bg: #f4f6fb;
      --bg-soft: #eef2f9;
      --sidebar: #ffffff;
      --card: #ffffff;
      --card-2: #f8fafc;
      --card-hover: #f1f5fb;
      --input: #f8fafc;
      --border: #e2e8f2;
      --border-soft: #edf1f8;
      --border-strong: #cbd5e6;
      --text: #0f172a;
      --text-soft: #334155;
      --muted: #5b6b85;
      --dim: #8896ad;
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, .06);
      --shadow: 0 10px 28px rgba(15, 23, 42, .08);
      --shadow-lg: 0 24px 60px rgba(15, 23, 42, .14);
      --glow: rgba(249, 115, 22, .18);
      --topbar-bg: rgba(244, 246, 251, .82);
      --code-bg: #0b1220;
      --skeleton: rgba(15, 23, 42, .06);
      --grid-line: rgba(15, 23, 42, .05);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      transition: background .25s var(--ease), color .25s var(--ease);
    }
    ::selection { background: var(--brand-soft); color: var(--brand); }
    a { color: var(--brand); }
    code {
      font-family: var(--mono);
      font-size: .86em;
      background: var(--skeleton);
      padding: 2px 6px;
      border-radius: 6px;
      color: var(--text-soft);
      word-break: break-word;
    }
    .ic {
      width: 18px; height: 18px; flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      overflow: visible;
    }
    .ic-sm { width: 15px; height: 15px; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; overflow: hidden;
      clip: rect(0 0 0 0); white-space: nowrap;
    }

    /* ============================================================
       APP SHELL
       ============================================================ */
    .app-shell { display: flex; min-height: 100vh; }

    .app-sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: var(--sidebar-w);
      background: var(--sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      z-index: 60;
      transition: transform .28s var(--ease), width .28s var(--ease);
      overflow: hidden;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 18px 18px;
      border-bottom: 1px solid var(--border-soft);
      flex-shrink: 0;
      min-height: var(--topbar-h);
    }
    .brand-logo {
      width: 38px; height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #fb923c 0%, #f97316 45%, #ec4899 100%);
      color: #fff;
      display: grid; place-items: center;
      font-weight: 900; font-size: 19px;
      box-shadow: 0 6px 20px var(--glow);
      flex-shrink: 0;
    }
    .brand-info { min-width: 0; }
    .brand-info h1 {
      font-size: 15px; font-weight: 800; letter-spacing: -.02em;
      color: var(--text); line-height: 1.2;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .brand-info p { font-size: 10.5px; color: var(--dim); letter-spacing: .01em; }

    .sidebar-menu {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px 18px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }
    .sidebar-menu::-webkit-scrollbar { width: 5px; }
    .sidebar-menu::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
    .nav-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: var(--dim);
      padding: 14px 12px 6px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--muted);
      font-family: inherit;
      font-size: 13px;
      font-weight: 550;
      text-align: left;
      cursor: pointer;
      transition: background .15s, color .15s, border-color .15s;
      white-space: nowrap;
    }
    .tab-btn .tab-icon {
      width: 30px; height: 30px;
      border-radius: 9px;
      display: grid; place-items: center;
      background: var(--skeleton);
      color: var(--muted);
      flex-shrink: 0;
      transition: background .15s, color .15s;
    }
    .tab-btn .tab-icon .ic { width: 16px; height: 16px; }
    .tab-btn:hover { background: var(--card-hover); color: var(--text); }
    .tab-btn:hover .tab-icon { color: var(--brand); }
    .tab-btn.active {
      background: var(--brand-soft);
      border-color: rgba(249, 115, 22, .28);
      color: var(--brand);
      font-weight: 700;
    }
    .tab-btn.active .tab-icon {
      background: linear-gradient(135deg, #fb923c, #f97316);
      color: #fff;
      box-shadow: 0 4px 12px var(--glow);
    }
    .tab-badge {
      margin-left: auto;
      min-width: 22px;
      padding: 1px 7px;
      border-radius: 99px;
      background: var(--skeleton);
      color: var(--dim);
      font-size: 10.5px;
      font-weight: 700;
      text-align: center;
      flex-shrink: 0;
    }
    .tab-btn.active .tab-badge { background: var(--brand); color: #fff; }

    .sidebar-footer {
      padding: 12px 14px 14px;
      border-top: 1px solid var(--border-soft);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .sidebar-footer .badge { flex: 1; min-width: 0; }
    .sidebar-footer .badge span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 8, 15, .55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 55;
      opacity: 0;
      visibility: hidden;
      transition: opacity .25s, visibility .25s;
    }
    .sidebar-backdrop.visible { opacity: 1; visibility: visible; }

    /* ============================================================
       MAIN / TOPBAR
       ============================================================ */
    .app-main {
      flex: 1;
      min-width: 0;
      margin-left: var(--sidebar-w);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background:
        radial-gradient(900px 420px at 88% -8%, rgba(249, 115, 22, .09), transparent 62%),
        radial-gradient(700px 380px at 0% 0%, rgba(139, 92, 246, .07), transparent 55%),
        var(--bg);
      transition: margin-left .28s var(--ease);
    }
    .app-topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      height: var(--topbar-h);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 22px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--topbar-bg);
      backdrop-filter: blur(16px) saturate(140%);
      -webkit-backdrop-filter: blur(16px) saturate(140%);
    }
    .topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 auto; }
    .topbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
    .crumb { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; overflow: hidden; }
    .crumb-eyebrow {
      font-size: 9.5px; font-weight: 800; letter-spacing: .12em;
      text-transform: uppercase; color: var(--dim);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .crumb-title {
      font-size: 15px; font-weight: 750; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .menu-toggle {
      display: none;
      width: 38px; height: 38px;
      align-items: center; justify-content: center;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--card);
      color: var(--text);
      cursor: pointer;
    }
    .icon-btn {
      width: 38px; height: 38px;
      display: inline-grid; place-items: center;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--card);
      color: var(--text-soft);
      cursor: pointer;
      transition: background .15s, color .15s, border-color .15s, transform .1s;
      flex-shrink: 0;
    }
    .icon-btn:hover { background: var(--card-hover); color: var(--brand); border-color: var(--border-strong); }
    .icon-btn:active { transform: scale(.96); }
    .theme-toggle .ic-sun { display: none; }
    .theme-toggle .ic-moon { display: block; }
    :root[data-theme="light"] .theme-toggle .ic-sun { display: block; }
    :root[data-theme="light"] .theme-toggle .ic-moon { display: none; }

    .content-wrap {
      width: 100%;
      max-width: 1320px;
      margin: 0 auto;
      padding: 26px 24px 48px;
    }

    /* ============================================================
       PAGE HEAD
       ============================================================ */
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 22px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: 6px;
    }
    .page-title {
      font-size: clamp(22px, 2.4vw, 28px);
      font-weight: 800;
      letter-spacing: -.03em;
      color: var(--text);
      line-height: 1.15;
    }
    .page-sub {
      font-size: 13px;
      color: var(--muted);
      margin-top: 5px;
      max-width: 720px;
    }
    .page-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* ============================================================
       HERO
       ============================================================ */
    .hero {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 22px;
      flex-wrap: wrap;
      padding: 24px 26px;
      margin-bottom: 20px;
      border: 1px solid rgba(249, 115, 22, .3);
      border-radius: var(--radius-lg);
      background:
        linear-gradient(120deg, rgba(249, 115, 22, .18) 0%, rgba(236, 72, 153, .10) 42%, transparent 78%),
        var(--card);
      box-shadow: var(--shadow);
    }
    .hero::after {
      content: "";
      position: absolute;
      right: -90px; top: -120px;
      width: 320px; height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(249, 115, 22, .28), transparent 68%);
      pointer-events: none;
    }
    .hero-main { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
    .hero-icon {
      width: 56px; height: 56px;
      border-radius: 16px;
      display: grid; place-items: center;
      font-size: 26px;
      background: linear-gradient(135deg, rgba(249, 115, 22, .22), rgba(236, 72, 153, .16));
      border: 1px solid rgba(249, 115, 22, .35);
      flex-shrink: 0;
    }
    .hero-label {
      font-size: 10.5px; font-weight: 800; letter-spacing: .1em;
      text-transform: uppercase; color: var(--muted);
    }
    .hero-value {
      font-size: clamp(28px, 3.6vw, 38px);
      font-weight: 850;
      letter-spacing: -.03em;
      color: var(--green);
      line-height: 1.1;
      margin: 2px 0;
    }
    .hero-note { font-size: 11.5px; color: var(--dim); max-width: 460px; }
    .hero-side {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }
    .hero-mini {
      min-width: 104px;
      padding: 10px 14px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--card) 70%, transparent);
      border: 1px solid var(--border);
      backdrop-filter: blur(6px);
    }
    .hero-mini span {
      display: block;
      font-size: 9.5px; font-weight: 800; letter-spacing: .09em;
      text-transform: uppercase; color: var(--dim);
    }
    .hero-mini b { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -.02em; }

    /* ============================================================
       STAT CARDS
       ============================================================ */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat {
      position: relative;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow-sm);
      transition: transform .15s, border-color .15s, box-shadow .15s;
      overflow: hidden;
    }
    .stat:hover { transform: translateY(-2px); border-color: var(--border-strong); box-shadow: var(--shadow); }
    .stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .stat-icon {
      width: 34px; height: 34px;
      border-radius: 10px;
      display: grid; place-items: center;
      background: var(--skeleton);
      color: var(--muted);
    }
    .stat-icon .ic { width: 17px; height: 17px; }
    .stat-label {
      font-size: 10.5px; font-weight: 750; letter-spacing: .07em;
      text-transform: uppercase; color: var(--dim);
      margin-top: 12px;
    }
    .stat-value {
      font-size: 23px;
      font-weight: 820;
      letter-spacing: -.03em;
      color: var(--text);
      line-height: 1.15;
      margin-top: 2px;
      word-break: break-word;
    }
    .stat-hint { font-size: 11px; color: var(--dim); margin-top: 3px; }
    .tint-brand { background: var(--brand-soft); color: var(--brand); }
    .tint-green { background: var(--green-soft); color: var(--green); }
    .tint-blue { background: var(--blue-soft); color: var(--blue); }
    .tint-purple { background: var(--purple-soft); color: var(--purple); }
    .tint-warn { background: var(--warn-soft); color: var(--warn); }

    /* ============================================================
       CARDS
       ============================================================ */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      margin-bottom: 18px;
      overflow: hidden;
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-soft);
    }
    .card-head.no-border { border-bottom: none; padding-bottom: 4px; }
    .card-title {
      display: flex; align-items: center; gap: 9px;
      font-size: 14.5px; font-weight: 750; color: var(--text);
      letter-spacing: -.01em;
    }
    .card-title .ic { color: var(--brand); }
    .card-desc { font-size: 12px; color: var(--muted); margin-top: 3px; max-width: 780px; }
    .card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .card-body { padding: 18px 20px; }
    .card-body.tight { padding: 14px 20px 18px; }
    .card-body.flush { padding: 0; }

    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }

    /* ============================================================
       BADGES / PILLS
       ============================================================ */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 99px;
      background: var(--card-2);
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
      white-space: nowrap;
      max-width: 100%;
    }
    .badge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .badge.ok { background: var(--green-soft); border-color: rgba(16, 185, 129, .3); color: var(--green); }
    .badge.warn { background: var(--warn-soft); border-color: rgba(245, 158, 11, .32); color: var(--warn); }
    .badge.danger { background: var(--danger-soft); border-color: rgba(239, 68, 68, .32); color: var(--danger); }
    .badge.info { background: var(--blue-soft); border-color: rgba(59, 130, 246, .3); color: var(--blue); }
    .badge.brand { background: var(--brand-soft); border-color: rgba(249, 115, 22, .3); color: var(--brand); }
    .badge.purple { background: var(--purple-soft); border-color: rgba(139, 92, 246, .3); color: var(--purple); }

    /* ============================================================
       BUTTONS
       ============================================================ */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 9px 15px;
      border: 1px solid transparent;
      border-radius: 11px;
      background: linear-gradient(135deg, #fb923c, #f97316);
      color: #fff;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: transform .1s, box-shadow .15s, filter .15s, background .15s;
      box-shadow: 0 4px 14px var(--glow);
      flex-shrink: 0;
    }
    .btn:hover { filter: brightness(1.06); box-shadow: 0 8px 22px var(--glow); }
    .btn:active { transform: translateY(1px) scale(.99); }
    .btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; filter: none; }
    .btn .ic { width: 16px; height: 16px; }
    .btn.ghost {
      background: var(--card);
      color: var(--text-soft);
      border-color: var(--border);
      box-shadow: none;
    }
    .btn.ghost:hover { background: var(--card-hover); color: var(--text); border-color: var(--border-strong); }
    .btn.soft {
      background: var(--brand-soft);
      color: var(--brand);
      border-color: rgba(249, 115, 22, .26);
      box-shadow: none;
    }
    .btn.soft:hover { background: rgba(249, 115, 22, .18); }
    .btn.danger {
      background: var(--danger-soft);
      color: var(--danger);
      border-color: rgba(239, 68, 68, .3);
      box-shadow: none;
    }
    .btn.danger:hover { background: rgba(239, 68, 68, .18); }
    .btn.claude {
      background: linear-gradient(135deg, #e08a68, #d97757);
      box-shadow: 0 4px 14px rgba(217, 119, 87, .24);
    }
    .btn.sm { padding: 6px 10px; font-size: 11.5px; border-radius: 9px; }
    .btn.xs { padding: 4px 8px; font-size: 11px; border-radius: 8px; box-shadow: none; }
    .btn.block { width: 100%; }

    /* ============================================================
       FORMS
       ============================================================ */
    .field { margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    label {
      display: block;
      font-size: 11.5px;
      font-weight: 650;
      color: var(--muted);
      margin-bottom: 6px;
    }
    input[type="text"], input[type="password"], input[type="number"], input[type="url"], textarea, select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--input);
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.45;
      transition: border-color .15s, box-shadow .15s, background .15s;
      -webkit-appearance: none;
      appearance: none;
    }
    select {
      background-image:
        linear-gradient(45deg, transparent 50%, var(--muted) 50%),
        linear-gradient(135deg, var(--muted) 50%, transparent 50%);
      background-position: calc(100% - 18px) calc(50% - 2px), calc(100% - 13px) calc(50% - 2px);
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      padding-right: 34px;
      cursor: pointer;
    }
    select, option, optgroup {
      color-scheme: inherit;
    }
    :root[data-theme="dark"] select,
    :root[data-theme="dark"] option,
    :root[data-theme="dark"] optgroup {
      color-scheme: dark;
      background-color: #0f1624;
      color: #eef3fb;
    }
    :root[data-theme="light"] select,
    :root[data-theme="light"] option,
    :root[data-theme="light"] optgroup {
      color-scheme: light;
      background-color: #ffffff;
      color: #0f172a;
    }
    option {
      background-color: var(--card);
      color: var(--text);
      padding: 6px 10px;
    }
    textarea { resize: vertical; min-height: 74px; font-family: var(--mono); font-size: 12.5px; }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-soft);
    }
    input::placeholder, textarea::placeholder { color: var(--dim); }
    input[type="checkbox"] {
      width: 16px; height: 16px;
      accent-color: var(--brand);
      cursor: pointer;
      vertical-align: middle;
    }
    .check-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--text-soft);
      cursor: pointer;
      user-select: none;
    }
    .input-row { display: flex; gap: 8px; align-items: stretch; }
    .input-row .btn { align-self: stretch; }
    .hint { font-size: 11px; color: var(--dim); margin-top: 5px; }
    .period-picker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 6px 4px 12px;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--card);
      color: var(--muted);
      font-size: 11.5px;
      font-weight: 650;
    }
    .period-picker select {
      width: auto;
      border: none;
      background-color: transparent !important;
      padding: 5px 26px 5px 4px;
      font-size: 12px;
      font-weight: 650;
      color: var(--text);
      box-shadow: none;
      cursor: pointer;
    }
    :root[data-theme="dark"] .period-picker select {
      color-scheme: dark;
    }
    :root[data-theme="dark"] .period-picker select option {
      background-color: #0f1624 !important;
      color: #eef3fb !important;
    }
    :root[data-theme="light"] .period-picker select option {
      background-color: #ffffff !important;
      color: #0f172a !important;
    }
    .period-picker select:focus { box-shadow: none; }

    /* ============================================================
       TABLES
       ============================================================ */
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }
    .table-wrap::-webkit-scrollbar { height: 8px; }
    .table-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
    table {
      width: 100%;
      min-width: 640px;
      border-collapse: collapse;
      font-size: 12.5px;
      text-align: left;
    }
    thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 11px 14px;
      background: var(--card-2);
      border-bottom: 1px solid var(--border);
      color: var(--dim);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-soft);
      color: var(--text-soft);
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr { transition: background .12s; }
    tbody tr:hover td { background: var(--card-hover); }
    td.empty-cell {
      padding: 28px 14px !important;
      text-align: center;
      color: var(--dim) !important;
      font-size: 12.5px;
    }
    .mono { font-family: var(--mono); font-size: 11.5px; }
    .nowrap { white-space: nowrap; }
    .t-strong { color: var(--text); font-weight: 700; }
    .t-brand { color: var(--brand); }
    .t-green { color: var(--green); }
    .t-blue { color: var(--blue); }
    .t-purple { color: var(--purple); }
    .t-danger { color: var(--danger); }
    .t-warn { color: var(--warn); }
    .t-muted { color: var(--muted); }
    .t-dim { color: var(--dim); }

    /* ============================================================
       CHART
       ============================================================ */
    .chart { padding: 6px 20px 20px; }
    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: clamp(2px, 0.8vw, 8px);
      height: 130px;
      padding-top: 10px;
    }
    .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; min-width: 0; }
    .chart-track {
      width: 100%;
      max-width: 46px;
      height: 100px;
      display: flex;
      align-items: flex-end;
      border-radius: 8px;
      background: var(--skeleton);
      overflow: hidden;
    }
    .chart-fill {
      width: 100%;
      border-radius: 8px;
      background: linear-gradient(180deg, var(--brand-2), var(--brand));
      min-height: 3px;
      transition: height .4s var(--ease);
    }
    .chart-col.today .chart-fill { background: linear-gradient(180deg, #34d399, var(--green)); }
    .chart-label { font-size: 10px; color: var(--dim); font-weight: 650; white-space: nowrap; }
    .chart-val { font-size: 10px; color: var(--muted); font-weight: 700; }

    /* ============================================================
       PROVIDER CARDS
       ============================================================ */
    .provider-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 14px;
    }
    .prov-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow-sm);
      transition: border-color .15s, box-shadow .15s;
    }
    .prov-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow); }
    .prov-card.ready { border-color: rgba(16, 185, 129, .34); }
    .prov-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .prov-name { font-size: 14px; font-weight: 750; color: var(--text); letter-spacing: -.01em; }
    .prov-prefix { font-family: var(--mono); font-size: 10.5px; color: var(--blue); margin-top: 2px; }
    .prov-notes { font-size: 11.5px; color: var(--dim); line-height: 1.45; }
    .prov-status {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700;
    }
    .prov-status .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .prov-status.on { color: var(--green); }
    .prov-status.off { color: var(--dim); }
    .tier {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: .06em;
      padding: 3px 8px;
      border-radius: 99px;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .tier-1 { background: var(--purple-soft); color: var(--purple); }
    .tier-2 { background: var(--blue-soft); color: var(--blue); }
    .tier-3 { background: var(--green-soft); color: var(--green); }
    .ag-note {
      padding: 12px;
      border-radius: 11px;
      border: 1px solid rgba(249, 115, 22, .28);
      background: var(--brand-soft);
      font-size: 11.5px;
      color: var(--text-soft);
    }

    /* ============================================================
       COMBO CARDS
       ============================================================ */
    .combo-card {
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card-2);
    }
    .combo-card:last-child { margin-bottom: 0; }
    .combo-grid {
      display: grid;
      grid-template-columns: 1.2fr 1.2fr 1fr auto;
      gap: 10px;
      align-items: end;
    }
    .combo-routes { margin-top: 12px; }

    /* ============================================================
       CLIENT KEY CARDS
       ============================================================ */
    .key-card {
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card-2);
    }
    .key-card:last-child { margin-bottom: 0; }
    .key-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .key-name { font-size: 14px; font-weight: 750; color: var(--text); }
    .key-value {
      font-family: var(--mono);
      font-size: 11.5px;
      color: var(--blue);
      margin-top: 3px;
      word-break: break-all;
    }
    .quota { margin-top: 12px; display: grid; gap: 9px; }
    .quota-row .quota-meta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .quota-track {
      height: 7px;
      border-radius: 99px;
      background: var(--skeleton);
      overflow: hidden;
    }
    .quota-fill {
      height: 100%;
      border-radius: 99px;
      transition: width .35s var(--ease);
    }
    .key-actions { display: flex; gap: 6px; flex-wrap: wrap; }

    /* ============================================================
       STEPS / CODE
       ============================================================ */
    .step {
      display: flex;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius);
      background: var(--card-2);
    }
    .step + .step { margin-top: 10px; }
    .step-num {
      width: 26px; height: 26px;
      border-radius: 8px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, #fb923c, #f97316);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 4px 12px var(--glow);
    }
    .step.claude .step-num { background: linear-gradient(135deg, #e08a68, #d97757); box-shadow: none; }
    .step-body { min-width: 0; flex: 1; }
    .step-title { font-size: 12.5px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
    .step-desc { font-size: 11.5px; color: var(--muted); line-height: 1.5; }
    .step-desc code { font-size: 10.5px; }
    .step-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

    pre {
      margin: 0;
      padding: 16px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--code-bg);
      color: #dbe6f5;
      font-family: var(--mono);
      font-size: 11.5px;
      line-height: 1.65;
      overflow: auto;
      max-height: 520px;
      -webkit-overflow-scrolling: touch;
      tab-size: 2;
    }
    pre::-webkit-scrollbar { width: 8px; height: 8px; }
    pre::-webkit-scrollbar-thumb { background: #24344d; border-radius: 99px; }
    .code-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .code-dots { display: flex; gap: 5px; }
    .code-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--border-strong); display: block; }

    details.advanced {
      border: 1px solid var(--border-soft);
      border-radius: var(--radius);
      background: var(--card-2);
      padding: 12px 14px;
      margin-top: 12px;
    }
    details.advanced summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      color: var(--blue);
      list-style: none;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    details.advanced summary::-webkit-details-marker { display: none; }
    details.advanced[open] summary { margin-bottom: 12px; }

    /* ============================================================
       LOGIN
       ============================================================ */
    .login-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      background: var(--bg);
      padding: 20px;
      overflow-y: auto;
    }
    .login-overlay.visible { display: flex; align-items: center; justify-content: center; }
    .login-shell {
      width: 100%;
      max-width: 940px;
      min-height: 540px;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      border: 1px solid var(--border);
      border-radius: 24px;
      overflow: hidden;
      background: var(--card);
      box-shadow: var(--shadow-lg);
    }
    .login-aside {
      position: relative;
      padding: 40px 38px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 30px;
      color: #fff;
      background:
        radial-gradient(500px 320px at 15% 0%, rgba(255, 255, 255, .2), transparent 60%),
        linear-gradient(150deg, #f97316 0%, #ea580c 45%, #be185d 100%);
      overflow: hidden;
    }
    .login-aside::after {
      content: "";
      position: absolute;
      right: -80px; bottom: -110px;
      width: 300px; height: 300px;
      border-radius: 50%;
      border: 44px solid rgba(255, 255, 255, .08);
    }
    .login-aside-brand { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
    .login-aside-brand .brand-logo { background: rgba(255, 255, 255, .18); box-shadow: none; border: 1px solid rgba(255, 255, 255, .3); }
    .login-aside-brand h2 { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
    .login-aside-brand p { font-size: 11px; opacity: .8; }
    .login-aside-copy { position: relative; z-index: 1; }
    .login-aside-copy h3 {
      font-size: 25px;
      line-height: 1.2;
      font-weight: 820;
      letter-spacing: -.03em;
      margin-bottom: 10px;
    }
    .login-aside-copy p { font-size: 12.5px; opacity: .86; line-height: 1.6; max-width: 340px; }
    .login-features { display: grid; gap: 9px; margin-top: 20px; position: relative; z-index: 1; }
    .login-feature { display: flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 600; }
    .login-feature i {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, .18);
      display: grid; place-items: center;
      font-style: normal;
      font-size: 10px;
      flex-shrink: 0;
    }
    .login-panel {
      padding: 40px 38px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }
    .login-panel .theme-toggle { position: absolute; top: 18px; right: 18px; }
    .login-logo-wrap { margin-bottom: 26px; }
    .login-mobile-logo {
      width: 48px; height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #fb923c, #f97316);
      display: none;
      place-items: center;
      font-weight: 900;
      font-size: 23px;
      color: #fff;
      margin-bottom: 16px;
      box-shadow: 0 8px 22px var(--glow);
    }
    .login-title { font-size: 22px; font-weight: 820; letter-spacing: -.03em; color: var(--text); }
    .login-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 5px; line-height: 1.5; }
    .login-field { margin-bottom: 14px; }
    .pw-wrap { position: relative; }
    .pw-wrap input { padding-right: 46px; }
    .pw-eye {
      position: absolute;
      right: 8px; top: 50%;
      transform: translateY(-50%);
      width: 32px; height: 32px;
      display: grid; place-items: center;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--dim);
      cursor: pointer;
      font-size: 15px;
    }
    .pw-eye:hover { background: var(--skeleton); color: var(--text); }
    .login-error {
      display: none;
      padding: 10px 12px;
      margin-bottom: 14px;
      border: 1px solid rgba(239, 68, 68, .32);
      border-radius: 10px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 12px;
      line-height: 1.45;
    }
    .login-footnote { margin-top: 18px; font-size: 11px; color: var(--dim); text-align: center; }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
    }
    .login-shell.shake, .login-box.shake { animation: shake .35s ease; }

    /* ============================================================
       TOAST / EMPTY
       ============================================================ */
    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%) translateY(16px);
      z-index: 10000;
      max-width: min(560px, calc(100vw - 32px));
      padding: 11px 18px;
      border: 1px solid rgba(249, 115, 22, .35);
      border-radius: 12px;
      background: var(--card);
      color: var(--text);
      font-size: 12.5px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      opacity: 0;
      visibility: hidden;
      transition: opacity .2s, transform .2s, visibility .2s;
    }
    .toast.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
    .empty-state {
      padding: 34px 18px;
      text-align: center;
      color: var(--dim);
      font-size: 12.5px;
      line-height: 1.6;
    }
    .empty-state b { color: var(--text-soft); }

    /* ============================================================
       DRAG & DROP
       ============================================================ */
    tr.draggable-row { cursor: grab; }
    tr.draggable-row:active { cursor: grabbing; }
    tr.draggable-row.dragging { opacity: .35; background: var(--blue-soft) !important; }
    tr.draggable-row.drag-over td { box-shadow: inset 0 2px 0 var(--brand); }
    .drag-handle {
      cursor: grab;
      color: var(--dim);
      padding: 0 4px;
      font-size: 15px;
      touch-action: none;
      user-select: none;
    }
    .drag-handle:hover { color: var(--brand); }
    .priority-select {
      width: auto !important;
      padding: 3px 20px 3px 7px !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      border-radius: 7px !important;
      border: 1px solid var(--border-strong) !important;
      background-color: var(--input) !important;
      color: var(--brand) !important;
      cursor: pointer !important;
    }
    :root[data-theme="dark"] .priority-select {
      background-color: #131c2d !important;
      color: #f97316 !important;
    }
    :root[data-theme="dark"] .priority-select option {
      background-color: #0f1624 !important;
      color: #eef3fb !important;
    }

    /* Account order cell (badge + arrows) & usage-flow bar */
    .order-cell { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; }
    .order-badge {
      width: 30px; height: 30px; flex: none;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 13px; font-weight: 800;
      background: var(--input); color: var(--text-soft);
      border: 1px solid var(--border-strong);
    }
    .order-badge.main { background: var(--brand); color: #fff; border-color: var(--brand); }
    .order-meta { display: flex; flex-direction: column; gap: 2px; min-width: 92px; font-size: 12px; line-height: 1.25; }
    .order-live { font-size: 10.5px; font-weight: 700; color: #16a34a; white-space: nowrap; }
    .order-arrows { display: flex; flex-direction: column; gap: 2px; margin-left: auto; }
    .order-arrow {
      width: 22px; height: 15px; padding: 0; line-height: 1;
      font-size: 8px; cursor: pointer;
      border: 1px solid var(--border-strong); border-radius: 4px;
      background: var(--input); color: var(--text-soft);
    }
    .order-arrow:hover:not(:disabled) { color: var(--brand); border-color: var(--brand); }
    .order-arrow:disabled { opacity: .3; cursor: default; }

    .order-flow {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      margin: 14px 20px 0; padding: 10px 14px;
      border: 1px dashed var(--border-strong); border-radius: 10px;
      background: var(--input); font-size: 12px;
    }
    .flow-title { font-weight: 700; color: var(--text-soft); }
    .flow-arrow { color: var(--dim); font-weight: 700; }
    .flow-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px 3px 4px; border-radius: 999px;
      border: 1px solid var(--border-strong); font-weight: 600;
    }
    .flow-chip i {
      font-style: normal; width: 18px; height: 18px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800; background: var(--border-strong); color: var(--text-soft);
    }
    .flow-chip.live { border-color: #16a34a; color: #16a34a; }
    .flow-chip.live i { background: #16a34a; color: #fff; }
    .flow-chip.limit { border-color: #d97706; color: #d97706; opacity: .85; }
    .flow-chip.off { opacity: .45; text-decoration: line-through; }
    .flow-note { flex-basis: 100%; color: var(--dim); font-size: 11.5px; }

    /* ============================================================
       RESPONSIVE
       ============================================================ */
    @media (max-width: 1200px) {
      .stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 1024px) {
      :root { --sidebar-w: 244px; }
      .content-wrap { padding: 22px 18px 42px; }
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .app-sidebar { transform: translateX(-100%); box-shadow: none; }
      .app-sidebar.open { transform: translateX(0); box-shadow: 24px 0 60px rgba(0, 0, 0, .35); }
      .app-main { margin-left: 0; }
      .menu-toggle { display: inline-flex; }
      .grid-2 { grid-template-columns: 1fr; }
      .provider-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
      .login-shell { grid-template-columns: 1fr; max-width: 440px; min-height: 0; }
      .login-aside { display: none; }
      .login-mobile-logo { display: grid; }
      .login-panel { padding: 32px 26px; }
      .login-panel .theme-toggle { top: 14px; right: 14px; }
    }
    @media (max-width: 768px) {
      .app-topbar { padding: 0 14px; gap: 8px; }
      .content-wrap { padding: 18px 14px 40px; }
      .page-head { align-items: flex-start; margin-bottom: 18px; }
      .page-actions { width: 100%; }
      .page-actions .btn { flex: 1 1 auto; }
      .hero { padding: 18px; gap: 16px; }
      .hero-main { width: 100%; }
      .hero-side { width: 100%; }
      .hero-mini { flex: 1; min-width: 90px; }
      .card-head { padding: 15px 16px; }
      .card-body { padding: 15px 16px; }
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .stat { padding: 14px; }
      .stat-value { font-size: 20px; }
      .grid-3 { grid-template-columns: 1fr; }
      .provider-grid { grid-template-columns: 1fr; }
      .combo-grid { grid-template-columns: 1fr; align-items: stretch; }
      .combo-grid .btn { width: 100%; }
      .btn-hide-mobile { display: none !important; }
      .chart-bars { height: 112px; gap: 5px; }
      .chart-track { height: 84px; }
      .toast { bottom: 16px; }
      pre { font-size: 11px; padding: 13px; }
      .login-overlay { padding: 14px; align-items: flex-start; padding-top: 6vh; }
    }
    @media (max-width: 520px) {
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .page-title { font-size: 21px; }
      .crumb-title { font-size: 14px; }
      .hero-value { font-size: 27px; }
      .hero-icon { width: 48px; height: 48px; font-size: 22px; }
      .key-top { flex-direction: column; }
      .key-actions { width: 100%; }
      .key-actions .btn { flex: 1; }
      .login-panel { padding: 26px 20px; }
      .login-title { font-size: 20px; }
      table { min-width: 580px; }
      .step { flex-direction: column; gap: 9px; }
      .step-num { width: 24px; height: 24px; }
      .topbar-right .btn span.btn-text { display: none; }
      .topbar-right .btn { padding: 9px 11px; }
    }
    @media (max-width: 400px) {
      .stat-grid { grid-template-columns: 1fr; }
      .hero-side { flex-direction: column; }
      .hero-mini { width: 100%; }
      .page-actions .btn { width: 100%; flex: 1 1 100%; }
      .period-picker { width: 100%; }
      .period-picker select { flex: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
    }

    /* ============================================================
       PANELS / UTIL
       ============================================================ */
    .panel { display: none; }
    .panel.active { display: block; animation: panelIn .28s var(--ease); }
    @keyframes panelIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .stack { display: flex; flex-direction: column; gap: 10px; }
    .form-grid-inline {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .play-grid {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .chart-bars { height: 150px; }
    .chart-col { justify-content: flex-end; }
    .chart-track { height: 96px; }
    .chart-empty { padding: 26px 0; text-align: center; color: var(--dim); font-size: 12.5px; }

    /* ============================================================
       PROVIDER LOGOS
       ============================================================ */
    .prov-logo {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      background: #fff;
      border: 1px solid var(--border);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .prov-logo img {
      width: 27px;
      height: 27px;
      object-fit: contain;
      display: block;
    }
    .prov-logo svg {
      width: 27px;
      height: 27px;
      display: block;
    }
    .prov-logo-fb {
      display: none;
      width: 100%;
      height: 100%;
      place-items: center;
      background: var(--logo-tint, #f97316);
      color: #fff;
      font-size: 12.5px;
      font-weight: 900;
      letter-spacing: -.03em;
    }
    .prov-logo.no-logo .prov-logo-fb { display: grid; }
    .prov-head-left { display: flex; align-items: flex-start; gap: 11px; min-width: 0; }
    .prov-name-wrap { min-width: 0; }
    .prov-title { font-size: 14px; font-weight: 750; color: var(--text); letter-spacing: -.01em; }
    .prov-id { font-family: var(--mono); font-size: 10.5px; color: var(--blue); margin-top: 2px; word-break: break-word; }
    .prov-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .prov-status.on { color: var(--green); }
    .prov-status.off { color: var(--dim); }
    .prov-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px dashed var(--border-soft);
    }

    /* ============================================================
       CHART / MISC POLISH
       ============================================================ */
    .brand-mark { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(135deg, #fb923c, #f97316); color: #fff; font-weight: 900; font-size: 19px; flex-shrink: 0; box-shadow: 0 6px 20px var(--glow); }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }
    .hidden { display: none !important; }
    .divider { height: 1px; background: var(--border-soft); margin: 14px 0; }
    .list-clean { list-style: none; display: grid; gap: 7px; }
    .list-clean li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: var(--text-soft); }
    .list-clean li::before { content: "✓"; color: var(--green); font-weight: 800; }
    .stat-trend { font-size: 10.5px; font-weight: 700; color: var(--dim); }
    .period-picker label { margin: 0; }
    .btn-text { display: inline; }
    .login-aside-foot { font-size: 11px; opacity: .8; position: relative; z-index: 1; }
    .theme-toggle .ic-sun, .theme-toggle .ic-moon { display: none; }
    :root[data-theme="dark"] .theme-toggle .ic-moon { display: block; }
    :root[data-theme="light"] .theme-toggle .ic-sun { display: block; }
    .toast.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }

    @media (max-width: 1200px) {
      .badge-hide-mobile { display: none !important; }
    }
    @media (max-width: 1024px) {
      .play-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .form-grid-inline { grid-template-columns: 1fr; }
      .chart-bars { height: 128px; }
      .chart-track { height: 78px; }
      .prov-logo { width: 40px; height: 40px; border-radius: 11px; }
      .prov-logo img { width: 24px; height: 24px; }
    }

`;
