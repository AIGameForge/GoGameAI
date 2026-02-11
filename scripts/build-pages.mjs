import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "docs");

function readTextIfExists(p) {
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  } catch {
    return "";
  }
}

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

function extractGameMeta(slug) {
  const indexPath = path.join(repoRoot, slug, "index.html");
  const html = readTextIfExists(indexPath);
  const title =
    (html.match(/<title>\s*([^<]{1,120}?)\s*<\/title>/i)?.[1] || slug).trim();
  const desc =
    (
      html.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']{1,240})["']\s*\/?>/i
      )?.[1] || ""
    ).trim();
  return { title, desc };
}

function renderGameWelcomeHtml({ slug, title, desc }) {
  const safeTitle = escapeHtml(title || slug);
  const safeSlug = escapeHtml(slug);
  const safeDesc = escapeHtml(desc || "點選開始即可進入遊戲。");
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0b1220;
        --panel: rgba(255, 255, 255, 0.06);
        --border: rgba(255, 255, 255, 0.12);
        --text: rgba(255, 255, 255, 0.92);
        --muted: rgba(255, 255, 255, 0.66);
        --accent: #22d3ee;
        --accent2: #22c55e;
        --accent3: #facc15;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f7f7fb;
          --panel: rgba(10, 10, 25, 0.04);
          --border: rgba(10, 10, 25, 0.10);
          --text: rgba(10, 10, 25, 0.92);
          --muted: rgba(10, 10, 25, 0.62);
          --accent: #0891b2;
          --accent2: #16a34a;
          --accent3: #ca8a04;
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
            rgba(34, 211, 238, 0.18),
            transparent 55%
          ),
          radial-gradient(
            1000px 700px at 90% 20%,
            rgba(34, 197, 94, 0.14),
            transparent 50%
          ),
          radial-gradient(
            900px 650px at 70% 85%,
            rgba(250, 204, 21, 0.10),
            transparent 55%
          ),
          var(--bg);
        color: var(--text);
      }
      .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 44px 18px 72px;
      }
      a {
        color: color-mix(in srgb, var(--accent) 80%, var(--text));
      }
      .top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: baseline;
        margin-bottom: 18px;
      }
      h1 {
        margin: 0;
        font-size: 26px;
        letter-spacing: 0.2px;
      }
      .sub {
        color: var(--muted);
        font-size: 14px;
      }
      .card {
        margin-top: 14px;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 16px;
        padding: 18px;
        overflow: hidden;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 14px;
        align-items: start;
      }
      @media (max-width: 720px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }
      .badge {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--panel) 70%, transparent);
        color: var(--muted);
        font-size: 13px;
        margin-top: 10px;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
      }
      .btn {
        appearance: none;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--panel) 78%, transparent);
        color: var(--text);
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }
      .btnPrimary {
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--accent) 28%, transparent),
          color-mix(in srgb, var(--accent2) 20%, transparent),
          color-mix(in srgb, var(--accent3) 14%, transparent)
        );
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.06) inset,
          0 18px 40px rgba(0, 0, 0, 0.18);
      }
      .btn:hover {
        border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <div class="sub"><a href="../">← 回遊戲列表</a></div>
        <div class="sub">遊戲目錄：<code>${safeSlug}</code></div>
      </div>
      <div class="card">
        <div class="hero">
          <div>
            <h1>${safeTitle}</h1>
            <div class="sub" style="margin-top: 8px">${safeDesc}</div>
            <div class="badge">入口頁（歡迎頁）→ 再進入遊戲本體</div>
          </div>
          <div class="actions">
            <a class="btn btnPrimary" href="./play/">開始遊戲</a>
            <a class="btn" href="./play/#skipWelcome">直接開始（略過）</a>
          </div>
        </div>
        <div class="footer">
          小提醒：如果你想把此頁當作「遊戲介紹」，可以在遊戲資料夾內加一個 <code>README.md</code>，之後我也能讓首頁自動讀取顯示。
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

function renderIndexHtml(games) {
  const count = games.length;
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
      <div class="cardSub">入口（歡迎頁）→</div>
    </a>
    <div style="padding: 0 14px 14px">
      <a class="cardSub" href="./${encodeURIComponent(g.slug)}/play/">直接開始 →</a>
    </div>
  </li>`;
  })
  .join("\n")}
</ul>`;

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GoGameAI - 歡迎</title>
    <meta name="description" content="歡迎來到 GoGameAI：AI 製作的網頁小遊戲合集（GitHub Pages）。" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0b1220;
        --panel: rgba(255, 255, 255, 0.06);
        --border: rgba(255, 255, 255, 0.12);
        --text: rgba(255, 255, 255, 0.92);
        --muted: rgba(255, 255, 255, 0.66);
        --accent: #22d3ee;
        --accent2: #22c55e;
        --accent3: #facc15;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f7f7fb;
          --panel: rgba(10, 10, 25, 0.04);
          --border: rgba(10, 10, 25, 0.10);
          --text: rgba(10, 10, 25, 0.92);
          --muted: rgba(10, 10, 25, 0.62);
          --accent: #0891b2;
          --accent2: #16a34a;
          --accent3: #ca8a04;
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
            rgba(34, 211, 238, 0.18),
            transparent 55%
          ),
          radial-gradient(
            1000px 700px at 90% 20%,
            rgba(34, 197, 94, 0.14),
            transparent 50%
          ),
          radial-gradient(
            900px 650px at 70% 85%,
            rgba(250, 204, 21, 0.10),
            transparent 55%
          ),
          var(--bg);
        color: var(--text);
      }
      .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 18px 72px;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.2px;
      }
      .hint {
        color: var(--muted);
        font-size: 14px;
      }
      .hero {
        border: 1px solid var(--border);
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--accent) 18%, transparent),
          color-mix(in srgb, var(--accent2) 14%, transparent),
          color-mix(in srgb, var(--accent3) 10%, transparent)
        );
        border-radius: 16px;
        padding: 18px;
        overflow: hidden;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
      }
      .heroTop {
        display: flex;
        gap: 14px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      .heroSub {
        margin-top: 8px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
      }
      .heroActions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
      }
      .btn {
        appearance: none;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--panel) 78%, transparent);
        color: var(--text);
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 800;
        cursor: pointer;
        text-decoration: none;
      }
      .btnPrimary {
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--accent) 28%, transparent),
          color-mix(in srgb, var(--accent2) 20%, transparent),
          color-mix(in srgb, var(--accent3) 14%, transparent)
        );
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
      }
      .btn:hover {
        border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
      }
      .sectionTitle {
        margin: 18px 0 10px;
        font-size: 14px;
        letter-spacing: 0.2px;
        color: var(--muted);
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
      <div class="hero">
        <div class="heroTop">
          <h1>歡迎來到 GoGameAI</h1>
          <div class="heroActions">
            <a class="btn btnPrimary" href="#games">開始挑一個遊戲</a>
            ${count > 0 ? `<a class="btn" href="./${encodeURIComponent(games[0].slug)}/play/">隨機先玩一下</a>` : ""}
          </div>
        </div>
        <div class="heroSub">
          這裡收錄我用 AI 製作的網頁小遊戲（GitHub Pages）。每個遊戲都有自己的入口頁與「直接開始」連結。<br />
          目前共有 <b>${count}</b> 個小遊戲。
        </div>
      </div>

      <div class="sectionTitle" id="games">小遊戲列表（點選超連結進入）</div>

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

  // Copy each game folder -> docs/<slug>/play/ (and generate docs/<slug>/ as welcome page)
  for (const g of games) {
    const { title, desc } = extractGameMeta(g.slug);
    const gameOutDir = path.join(outDir, g.slug);
    const playOutDir = path.join(gameOutDir, "play");

    copyDir(path.join(repoRoot, g.slug), playOutDir);

    // Generate welcome page: docs/<slug>/index.html
    fs.writeFileSync(
      path.join(gameOutDir, "index.html"),
      renderGameWelcomeHtml({ slug: g.slug, title, desc }),
      "utf8"
    );

    // Patch the copied game's "back home" link to go to the list, not to the welcome page
    const playIndex = path.join(playOutDir, "index.html");
    const html = readTextIfExists(playIndex);
    if (html) {
      const patched = html
        .replaceAll('href="../">← 回首頁', 'href="../../">← 回遊戲列表')
        .replaceAll('href="../">← 回首頁</a>', 'href="../../">← 回遊戲列表</a>');
      if (patched !== html) fs.writeFileSync(playIndex, patched, "utf8");
    }
  }

  // Root index.html
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndexHtml(games), "utf8");

  // Avoid Jekyll processing (keeps underscores etc. safe)
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

  console.log(`[build-pages] games: ${games.length}`);
  console.log(`[build-pages] output: ${path.relative(repoRoot, outDir)}/`);
}

main();


