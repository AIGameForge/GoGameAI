# GoGameAI（GitHub Pages 小遊戲合集）

這個 repo 用來放 **AI 製作的網頁小遊戲**。每個小遊戲都獨立成一個目錄，並透過 **GitHub Pages** 對外呈現。

## 目錄規範

- `<game-slug>/`：每個小遊戲一個資料夾（放在 repo 根目錄，獨立、可直接開啟）
  - 必須包含 `index.html`
  - 建議把檔案拆開：`style.css`、`main.js`（以及圖片、音效…）都放在該資料夾內
- `docs/`：GitHub Pages 部署輸出（由腳本自動產生，請勿手動編輯）
- `scripts/build-pages.mjs`：掃描 repo 根目錄下的遊戲資料夾，產生 `docs/` 與首頁索引

## 新增一個遊戲（建議流程）

1. 建立資料夾：`my-new-game/`
2. 建立檔案（建議結構）：
   - `my-new-game/index.html`
   - `my-new-game/style.css`
   - `my-new-game/main.js`
3. 產生部署輸出：

```bash
node scripts/build-pages.mjs
```

4. Push 到 GitHub 後，Actions 會自動部署到 GitHub Pages

## GitHub Pages 網址

部署完成後，網址通常是：

- `https://<你的帳號>.github.io/<repo>/`

首頁會列出所有遊戲；每個遊戲網址為：

- `https://<你的帳號>.github.io/<repo>/<game-slug>/`


