import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "docs");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

function listGames() {
  const ignore = new Set([
    "docs",
    "scripts",
    ".github",
    "node_modules",
    ".git",
  ]);

  const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
  const games = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const slug = e.name;
    if (ignore.has(slug)) continue;
    if (slug.startsWith(".")) continue;

    const indexPath = path.join(repoRoot, slug, "index.html");
    if (!fs.existsSync(indexPath)) continue;
    games.push({ slug });
  }
  games.sort((a, b) => a.slug.localeCompare(b.slug));
  return games;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderIndexHtml(games) {
  const items =
    games.length === 0
      ? `<p class="muted">目前還沒有遊戲。請在 <code>&lt;game-slug&gt;/index.html</code> 新增一個（放在 repo 根目錄下的一個資料夾）。</p>`
      : `<ul class="grid">
${games
  .map((g) => {
    const name = escapeHtml(g.slug);
    return `  <li class="card">
    <a class="cardLink" href="./${encodeURIComponent(g.slug)}/">
      <div class="cardTitle">${name}</div>
      <div class="cardSub">開啟遊戲 →</div>
    </a>
  </li>`;
  })
  .join("\n")}
</ul>`;

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GoGameAI - 小遊戲</title>
    <meta name="description" content="AI 製作的網頁小遊戲合集（GitHub Pages）" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0b1220;
        --panel: rgba(255, 255, 255, 0.06);
        --border: rgba(255, 255, 255, 0.12);
        --text: rgba(255, 255, 255, 0.92);
        --muted: rgba(255, 255, 255, 0.66);
        --accent: #7c3aed;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f7f7fb;
          --panel: rgba(10, 10, 25, 0.04);
          --border: rgba(10, 10, 25, 0.10);
          --text: rgba(10, 10, 25, 0.92);
          --muted: rgba(10, 10, 25, 0.62);
          --accent: #6d28d9;
        }
      }
      html,
      body {
        height: 100%;
      }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
          Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        background: radial-gradient(
            1200px 800px at 20% 10%,
            rgba(124, 58, 237, 0.22),
            transparent 55%
          ),
          radial-gradient(
            1000px 700px at 90% 20%,
            rgba(14, 165, 233, 0.18),
            transparent 50%
          ),
          var(--bg);
        color: var(--text);
      }
      .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 18px 72px;
      }
      header {
        display: flex;
        gap: 14px;
        align-items: baseline;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      h1 {
        margin: 0;
        font-size: 26px;
        letter-spacing: 0.2px;
      }
      .hint {
        color: var(--muted);
        font-size: 14px;
      }
      .grid {
        list-style: none;
        padding: 0;
        margin: 18px 0 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .card {
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 14px;
        overflow: hidden;
      }
      .cardLink {
        display: block;
        padding: 14px 14px 12px;
        text-decoration: none;
        color: inherit;
      }
      .cardTitle {
        font-weight: 680;
        font-size: 16px;
        margin: 0 0 6px;
      }
      .cardSub {
        font-size: 13px;
        color: var(--muted);
      }
      .card:hover {
        border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
      }
      .muted {
        color: var(--muted);
      }
      code {
        padding: 2px 6px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--panel) 60%, transparent);
      }
      footer {
        margin-top: 26px;
        color: var(--muted);
        font-size: 13px;
      }
      a {
        color: color-mix(in srgb, var(--accent) 80%, var(--text));
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <h1>GoGameAI 小遊戲</h1>
        <div class="hint">每個遊戲在 <code>&lt;game-slug&gt;/</code></div>
      </header>

      ${items}

      <footer>
        由 <code>scripts/build-pages.mjs</code> 自動產生（輸出到 <code>docs/</code>）。
      </footer>
    </div>
  </body>
</html>
`;
}

function main() {
  const games = listGames();

  rmDir(outDir);
  ensureDir(outDir);

  // Copy each game folder -> docs/<slug>/
  for (const g of games) {
    copyDir(path.join(repoRoot, g.slug), path.join(outDir, g.slug));
  }

  // Root index.html
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndexHtml(games), "utf8");

  // Avoid Jekyll processing (keeps underscores etc. safe)
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

  console.log(`[build-pages] games: ${games.length}`);
  console.log(`[build-pages] output: ${path.relative(repoRoot, outDir)}/`);
}

main();


