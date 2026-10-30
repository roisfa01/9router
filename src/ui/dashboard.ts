import { DASHBOARD_CSS } from "./dashboardCss";
import { renderDashboardBody } from "./dashboardBody";
import { DASHBOARD_SCRIPT } from "./dashboardScript";

export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#f97316" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)" filter="url(#glow)"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">9</text>
</svg>`;

export function renderDashboardHtml(appName = "9Router Edge"): string {
  const faviconUri = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;
  return `<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#f97316" />
  <meta name="color-scheme" content="dark light" />
  <link rel="icon" type="image/svg+xml" href="${faviconUri}" />
  <link rel="shortcut icon" href="${faviconUri}" />
  <link rel="apple-touch-icon" href="${faviconUri}" />
  <title>${appName} — Cloudflare AI Edge Router & Multi-Account Gateway</title>
  <style>
${DASHBOARD_CSS}
  </style>
</head>
<body>
${renderDashboardBody(appName)}
  <script>
${DASHBOARD_SCRIPT}
  </script>
</body>
</html>`;
}
