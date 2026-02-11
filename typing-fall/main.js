(() => {
  /** @typedef {{ id: number, kind: "normal" | "weapon", weaponType?: "bomb" | "arrow", text: string, zyLen?: 1|2|3, x: number, y: number, speed: number, el: HTMLElement }} FallingWord */

  const $ = (id) => document.getElementById(id);
  const playfield = $("playfield");
  const gameRoot = $("game");

  const elScore = $("score");
  const elCombo = $("combo");
  const elAmmo = $("ammo");
  const elLevel = $("level");
  const elStageProgress = $("stageProgress");
  const elTimeLeft = $("timeLeft");
  const elScoreBar = $("scoreBar");
  const elStatusText = $("statusText");
  const elOverlay = $("overlay");
  const elOverlayTitle = $("overlayTitle");
  const elOverlayDesc = $("overlayDesc");
  const elBanner = $("banner");
  const flash = $("flash");

  const btnStart = $("btnStart");
  const btnPause = $("btnPause");
  const btnReset = $("btnReset");
  const btnOverlayStart = $("btnOverlayStart");
  const btnOverlayFocus = $("btnOverlayFocus");
  const form = $("form");
  const input = $("input");
  const difficultySel = $("difficulty");
  const wordsetSel = $("wordset");
  const elBestTimes = $("bestTimes");

  const WEAPON_BOMB_CHAR = "爆";
  const WEAPON_ARROW_CHAR = "箭";

  const ZY_INITIALS = Array.from("ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ");
  const ZY_FINALS = Array.from("ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ");
  const ZY_TONES = Array.from("ˊˇˋ"); // 不含輕聲 ˙，避免長度/排列困擾

  // 單字字庫：用字串集中管理，避免維護大陣列
  //（常用字：偏日常；進階字：稍偏學習/挑戰）
  const CHARS_COMMON = Array.from(
    "的一是在不了有人我他這個們中來上大為和國地到以說時要就出會可也你對生能而子那得於著下自之年過發後作里用道行所然家種事成方多經么去法學如都同現當沒動面起看定天分還進好小部其些主樣理心她本前開但因只從想實日軍者意無力它與長把機十民第公此已工使情明性知全三又關點正業外將兩高間由問很最重並物手應戰向頭文體政美相見被利什二等產或新己制身果加西斯月話合回特代內信表化老給世位次度門任常先海通教兒原東聲提立及比員解水名真論處走義各入幾口認條平係氣題活爾更別打女變四神總何電數安少報才結反受目太量再感建務做接必場件計管期市直德資命山金指克許統區保至隊形社便空決治展馬科司五基眼書非則聽白卻界達光放強即像難且權思王象完設式色路記南品住告類求據程北邊死張該交規萬取拉格望覺術領共確傳師觀清今切院讓識候帶導爭運笑飛風步改收根干造言聯持組每濟車親極林服快辦議往元英士證近失轉夫令準布始怎呢存未遠叫台單影義"
  );
  const CHARS_ADVANCED = Array.from(
    "繁體練習挑戰穩健專注節奏精準迅速反應耐心毅力沉著觀察推理思辨自律規律習慣輸入鍵盤手指肌肉記憶熟練提升進步成長目標過關關卡連擊得分生命速度密度難度提示設定重來開始暫停繼續命中漏字壓力冷靜別慌先慢後快循序漸進水滴石穿厚積薄發鍥而不捨持之以恆循環迭代改善優化細節品質效率平衡專心一致自信勇氣挑剔苛求踏實務實理性感性思路清晰邏輯嚴謹敏捷靈活沉浸流暢愉快樂趣成就感挑戰性人性化舒服自然"
  );
  const CHARS_PUNCT = Array.from("，。！？；：、（）「」『』《》〈〉…—．·～／");

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    nextId: 1,
    words: /** @type {FallingWord[]} */ ([]),
    lastT: 0,
    lastSpawnT: 0,

    score: 0, // 本關分數（每關重置）
    combo: 0,
    hits: 0, // total hits
    submitStreak: 0, // 連續「送出有命中」次數（送出沒命中就算出錯 -> 歸零）
    ammo: 0,
    hitsSinceAmmo: 0,
    level: 1, // stage number
    stageTargetScore: 0,
    stageDurationMs: 180000,
    stageTimeLeftMs: 180000,
    stageMistakes: 0, // 本關失誤次數（送出未命中、漏字扣分都算）
    stageCleared: false,
    stageAdvanceTimer: 0,
  };

  const STORAGE_KEY = "typing-fall:bestTimes:v1";

  function now() {
    return performance.now();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function pickChar() {
    const set = wordsetSel.value;
    if (set === "advanced")
      return CHARS_ADVANCED[(Math.random() * CHARS_ADVANCED.length) | 0];
    if (set === "punct") return CHARS_PUNCT[(Math.random() * CHARS_PUNCT.length) | 0];
    return CHARS_COMMON[(Math.random() * CHARS_COMMON.length) | 0];
  }

  function pickZhuyin() {
    const r = Math.random();
    if (r < 0.25) {
      // 1 符號：聲母或韻母
      const pool = Math.random() < 0.55 ? ZY_INITIALS : ZY_FINALS;
      return { text: pool[(Math.random() * pool.length) | 0], len: 1 };
    }
    if (r < 0.75) {
      // 2 符號：聲母 + 韻母
      const i = ZY_INITIALS[(Math.random() * ZY_INITIALS.length) | 0];
      const f = ZY_FINALS[(Math.random() * ZY_FINALS.length) | 0];
      return { text: `${i}${f}`, len: 2 };
    }
    // 3 符號：聲母 + 韻母 + 聲調
    const i = ZY_INITIALS[(Math.random() * ZY_INITIALS.length) | 0];
    const f = ZY_FINALS[(Math.random() * ZY_FINALS.length) | 0];
    const t = ZY_TONES[(Math.random() * ZY_TONES.length) | 0];
    return { text: `${i}${f}${t}`, len: 3 };
  }

  function stageTargetScoreFor(level) {
    // 3 分鐘內達標：分數尺度改成 5/3/1（依高度）後，目標要跟著變得更貼近人性
    if (level <= 5) return 60 + (level - 1) * 20; // 60, 80, 100, 120, 140
    return 140 + (level - 5) * 25; // 165, 190, 215...
  }

  function tierPointsByHeight(wordCenterY, playfieldHeight) {
    // 越高命中越高分：高(5) / 中(3) / 低(1)
    const h = Math.max(1, playfieldHeight);
    const r = clamp(wordCenterY / h, 0, 0.999);
    if (r < 1 / 3) return { pts: 5, tier: "高" };
    if (r < 2 / 3) return { pts: 3, tier: "中" };
    return { pts: 1, tier: "低" };
  }

  function weaponChanceFor(level) {
    // 武器字不要太常見：前期少一點，後面稍增加
    return Math.min(0.12, 0.05 + Math.max(0, level - 3) * 0.01);
  }

  function maxOnScreenFor(level) {
    // 循序漸進：前期同屏字數少，之後慢慢增加
    if (level <= 2) return 5;
    if (level <= 4) return 6;
    if (level <= 7) return 7;
    return 8;
  }

  function difficultyParams() {
    const d = difficultySel.value;
    if (d === "easy") {
      return { spawnMs: 1750, baseSpeed: 22, wrongPenalty: 1, dropPenalty: 2 };
    }
    if (d === "hard") {
      return { spawnMs: 1500, baseSpeed: 26, wrongPenalty: 1, dropPenalty: 2 };
    }
    return { spawnMs: 1620, baseSpeed: 24, wrongPenalty: 1, dropPenalty: 2 };
  }

  function stageTargetFor(level) {
    // legacy (kept for patch safety) — no longer used
    return level;
  }

  function speedMultiplierFor(level) {
    // 前 5 關很溫和；第 6 關後才開始更明顯
    if (level <= 5) return 1 + (level - 1) * 0.02;
    return 1 + 4 * 0.02 + (level - 5) * 0.04;
  }

  function spawnMultiplierFor(level) {
    // 掉落密度：前 5 關幾乎不壓迫，之後才慢慢變密
    if (level <= 5) return 1 + (level - 1) * 0.06; // 數值越大 => 間隔越久 => 更慢
    return 1 + 4 * 0.06 + (level - 5) * 0.02;
  }

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function fmtMs(ms) {
    const s = Math.max(0, ms) / 1000;
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    const t = String(Math.floor((s * 1000) % 1000)).padStart(3, "0");
    return `${mm}:${ss}.${t.slice(0, 2)}`;
  }

  function loadBestTimes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      if (!obj || typeof obj !== "object") return {};
      return obj;
    } catch {
      return {};
    }
  }

  function saveBestTimes(bestTimes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bestTimes));
    } catch {
      // ignore
    }
  }

  function renderBestTimes() {
    if (!elBestTimes) return;
    const bestTimes = loadBestTimes();
    const levels = Object.keys(bestTimes)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (levels.length === 0) {
      elBestTimes.textContent = "尚無紀錄";
      return;
    }

    elBestTimes.innerHTML = levels
      .slice(0, 12)
      .map((lv) => {
        const ms = bestTimes[String(lv)];
        return `<div class="bestTimesRow"><b>第 ${lv} 關</b><span>${fmtMs(ms)}</span></div>`;
      })
      .join("");
  }

  function updateHud() {
    elScore.textContent = String(state.score);
    elCombo.textContent = String(state.combo);
    elAmmo.textContent = String(state.ammo);
    elLevel.textContent = String(state.level);
    elStageProgress.textContent = `${state.score}/${state.stageTargetScore}`;
    elTimeLeft.textContent = fmtTime(state.stageTimeLeftMs);
    const frac = state.stageTargetScore > 0 ? state.score / state.stageTargetScore : 0;
    elScoreBar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
  }

  function setStatus(text) {
    elStatusText.textContent = text;
  }

  function showOverlay(title, desc) {
    elOverlayTitle.textContent = title;
    elOverlayDesc.textContent = desc;
    elOverlay.style.display = "";
  }
  function hideOverlay() {
    elOverlay.style.display = "none";
  }

  function showBanner(text, kind = "info") {
    if (!elBanner) return;
    elBanner.textContent = text;
    elBanner.classList.remove("good", "bad", "info", "show");
    elBanner.classList.add(kind);
    // restart animation
    // eslint-disable-next-line no-unused-expressions
    elBanner.offsetWidth;
    elBanner.classList.add("show");
  }

  function flashGood() {
    flash.classList.remove("bad");
    flash.classList.add("show");
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => flash.classList.remove("show"), 120);
  }
  function flashBad() {
    flash.classList.add("bad");
    flash.classList.add("show");
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => flash.classList.remove("show"), 160);
  }

  function popParticles(clientX, clientY, kind) {
    const pf = playfield.getBoundingClientRect();
    const x = clientX - pf.left;
    const y = clientY - pf.top;

    const color =
      kind === "good"
        ? "rgba(34, 197, 94, 0.95)"
        : kind === "bad"
          ? "rgba(239, 68, 68, 0.95)"
          : "rgba(96, 165, 250, 0.95)";

    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = color;

      const a = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 38;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r - 8;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);

      playfield.appendChild(p);
      p.addEventListener("animationend", () => p.remove(), { once: true });
    }
  }

  function celebratePerfectStage() {
    // 簡易煙火：多個 burst 疊加，搭配浮字
    const pf = playfield.getBoundingClientRect();
    const cx = pf.left + pf.width / 2;
    const cy = pf.top + pf.height * 0.28;

    const words = ["Good!", "Awesome!", "Perfect!", "Nice!"];
    const msg = words[(Math.random() * words.length) | 0];
    popFloatText(cx, cy, msg, "good");

    // 連續幾次爆點
    const bursts = 7;
    for (let i = 0; i < bursts; i++) {
      const delay = i * 120;
      window.setTimeout(() => {
        const x = pf.left + pf.width * (0.18 + Math.random() * 0.64);
        const y = pf.top + pf.height * (0.12 + Math.random() * 0.48);
        const kind = i % 2 === 0 ? "good" : "info";
        popParticles(x, y, kind);
        popParticles(x + (Math.random() * 30 - 15), y + (Math.random() * 20 - 10), kind);
      }, delay);
    }
  }

  function popFloatText(clientX, clientY, text, kind = "info") {
    const pf = playfield.getBoundingClientRect();
    const x = clientX - pf.left;
    const y = clientY - pf.top;
    const el = document.createElement("div");
    el.className = `floatText ${kind}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    playfield.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  function setOverlayPrimary(label) {
    btnOverlayStart.textContent = label;
  }

  function clearWords() {
    for (const w of state.words) w.el.remove();
    state.words = [];
  }

  function resetGame(keepDifficultySelection = true) {
    if (state.stageAdvanceTimer) {
      window.clearTimeout(state.stageAdvanceTimer);
      state.stageAdvanceTimer = 0;
    }
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.nextId = 1;
    state.lastT = 0;
    state.lastSpawnT = 0;
    clearWords();

    state.score = 0;
    state.combo = 0;
    state.hits = 0;
    state.submitStreak = 0;
    state.ammo = 0;
    state.hitsSinceAmmo = 0;
    state.level = 1;
    state.stageTargetScore = stageTargetScoreFor(state.level);
    state.stageDurationMs = 180000;
    state.stageTimeLeftMs = state.stageDurationMs;
    state.stageMistakes = 0;
    state.stageCleared = false;
    updateHud();
    setStatus("準備開始");

    input.value = "";
    highlightMatches("");
    showOverlay(
      "準備好了？",
      "按「開始遊戲」後單字會開始掉。請在下方輸入 1 個字並按 Enter 命中得分。"
    );
    setOverlayPrimary("開始遊戲");

    if (!keepDifficultySelection) {
      // no-op for now, reserve for future
    }
  }

  function spawnWord() {
    const rect = playfield.getBoundingClientRect();
    const isWeapon = Math.random() < weaponChanceFor(state.level);
    const weaponType = isWeapon ? (Math.random() < 0.55 ? "bomb" : "arrow") : undefined;
    const set = wordsetSel.value;
    const zy = !isWeapon && set === "zhuyin" ? pickZhuyin() : null;
    const text = isWeapon
      ? weaponType === "bomb"
        ? WEAPON_BOMB_CHAR
        : WEAPON_ARROW_CHAR
      : zy
        ? zy.text
        : pickChar();
    const w = {
      id: state.nextId++,
      kind: isWeapon ? "weapon" : "normal",
      weaponType,
      text,
      zyLen: zy ? zy.len : undefined,
      x: Math.random() * rect.width,
      y: -36,
      speed: 0,
      el: document.createElement("div"),
    };

    const params = difficultyParams();
    const levelFactor = speedMultiplierFor(state.level);
    const jitter = 0.85 + Math.random() * 0.35;
    w.speed = params.baseSpeed * levelFactor * jitter; // px/sec

    w.el.className = "word";
    w.el.textContent = w.text;
    if (w.kind === "weapon") {
      w.el.classList.add("weapon");
      w.el.classList.add(w.weaponType);
    }
    if (w.zyLen) w.el.classList.add(`zy${w.zyLen}`);
    w.el.style.left = `${clamp(w.x, 28, rect.width - 28)}px`;
    w.el.style.top = `${w.y}px`;

    state.words.push(w);
    playfield.appendChild(w.el);

    // If current input is prefix, reflect highlight immediately
    highlightMatches(input.value.trim());
  }

  function onDropMiss(count) {
    const params = difficultyParams();
    const penalty = params.dropPenalty * count;
    state.stageMistakes += 1;
    state.score = Math.max(0, state.score - penalty);
    state.combo = 0;
    state.submitStreak = 0;
    updateHud();
    flashBad();
    setStatus(`漏字 -${penalty}`);
  }

  function gameOver(reason) {
    state.running = false;
    state.paused = false;
    state.gameOver = true;
    updateHud();
    setStatus("遊戲結束");
    showOverlay(
      "遊戲結束",
      `${reason}。本關分數 ${state.score}/${state.stageTargetScore}。按「重來」再挑戰一次。`
    );
    setOverlayPrimary("開始遊戲");
  }

  function stageFail() {
    state.running = false;
    state.paused = false;
    state.gameOver = true;
    updateHud();
    setStatus("時間到");
    showOverlay(
      "時間到",
      `未達標：本關分數 ${state.score}/${state.stageTargetScore}。按「重來」再挑戰一次。`
    );
    setOverlayPrimary("開始遊戲");
  }

  function stageClear() {
    state.stageCleared = true;
    state.running = false;
    state.paused = false;
    updateHud();
    setStatus(`過關！第 ${state.level} 關完成`);

    const usedMs = Math.max(0, state.stageDurationMs - state.stageTimeLeftMs);
    const bestTimes = loadBestTimes();
    const key = String(state.level);
    const prev = bestTimes[key];
    const isNew = typeof prev !== "number" || usedMs < prev;
    if (isNew) {
      bestTimes[key] = usedMs;
      saveBestTimes(bestTimes);
      renderBestTimes();
    }

    const perfect = state.stageMistakes === 0;
    if (perfect) celebratePerfectStage();

    hideOverlay();
    showBanner(
      `第 ${state.level} 關完成！${perfect ? " Perfect!" : ""}${isNew ? " 新紀錄！" : ""}`,
      perfect ? "good" : "info"
    );

    // 1 秒後自動進入下一關
    if (state.stageAdvanceTimer) window.clearTimeout(state.stageAdvanceTimer);
    state.stageAdvanceTimer = window.setTimeout(() => {
      advanceToNextStage();
    }, 1000);
  }

  function advanceToNextStage() {
    state.level += 1;
    state.score = 0;
    state.combo = 0;
    state.submitStreak = 0;
    state.stageMistakes = 0;
    state.stageTargetScore = stageTargetScoreFor(state.level);
    state.stageDurationMs = 180000;
    state.stageTimeLeftMs = state.stageDurationMs;
    state.stageCleared = false;
    clearWords();
    updateHud();

    hideOverlay();
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.lastT = now();
    state.lastSpawnT = now();
    setStatus(`進行中（第 ${state.level} 關）`);
    input.focus();
  }

  function removeWord(w) {
    w.el.remove();
    state.words = state.words.filter((x) => x.id !== w.id);
  }

  function weaponBombAt(cx, cy) {
    // 清除附近幾個字
    const radius = 170;
    const killed = [];
    for (const w of state.words) {
      const dx = w.x - cx;
      const dy = w.y - cy;
      const d = Math.hypot(dx, dy);
      if (d <= radius) killed.push({ w, d });
    }
    killed.sort((a, b) => a.d - b.d);
    const take = killed.slice(0, 7).map((k) => k.w);
    for (const w of take) {
      const r = w.el.getBoundingClientRect();
      popParticles(r.left + r.width / 2, r.top + r.height / 2, "info");
      removeWord(w);
    }
    return take.length;
  }

  function weaponArrowFrom(cx) {
    // 射擊：清掉同一條垂直帶上的字
    const band = 64;
    const killed = state.words
      .filter((w) => Math.abs(w.x - cx) < band)
      .sort((a, b) => b.y - a.y)
      .slice(0, 6);
    for (const w of killed) {
      const r = w.el.getBoundingClientRect();
      popParticles(r.left + r.width / 2, r.top + r.height / 2, "good");
      removeWord(w);
    }
    return killed.length;
  }

  function applyDangerStyles() {
    const rect = playfield.getBoundingClientRect();
    const dangerY = rect.height - 66; // near bottom
    for (const w of state.words) {
      w.el.classList.toggle("danger", w.y > dangerY);
    }
  }

  function highlightMatches(prefix) {
    const p = (prefix || "").trim();
    for (const w of state.words) {
      w.el.classList.toggle("match", p && w.text.startsWith(p));
    }
  }

  function tryHit(text) {
    const t = (text || "").trim();
    if (!t) return { ok: false, msg: "請先輸入文字" };
    if (!state.running || state.paused) return { ok: false, msg: "目前未在進行中" };
    const len = Array.from(t).length;
    const set = wordsetSel.value;
    if (set === "zhuyin") {
      if (len < 1 || len > 3) return { ok: false, msg: "注音請輸入 1～3 個符號" };
    } else {
      if (len !== 1) return { ok: false, msg: "一次打一個字就好" };
    }

    let best = null;
    for (const w of state.words) {
      if (w.text === t) {
        if (!best || w.y > best.y) best = w;
      }
    }
    if (!best) return { ok: false, msg: "沒有命中" };

    const hitRect = best.el.getBoundingClientRect();
    popParticles(hitRect.left + hitRect.width / 2, hitRect.top + hitRect.height / 2, "good");

    // remove (hit)
    removeWord(best);

    // score (依命中高度分三段)
    state.hits += 1;
    state.combo += 1;
    state.submitStreak += 1;
    state.hitsSinceAmmo += 1;
    const pfRect = playfield.getBoundingClientRect();
    const centerY = best.y + 26; // word box ~52px
    const { pts, tier } = tierPointsByHeight(centerY, pfRect.height);
    state.score += pts;
    updateHud();
    flashGood();
    setStatus(`命中（${tier}）+${pts}`);
    popFloatText(hitRect.left + hitRect.width / 2, hitRect.top, `+${pts}`, "good");

    // 武器字效果
    if (best.kind === "weapon") {
      const pf = playfield.getBoundingClientRect();
      const cx = (hitRect.left + hitRect.width / 2 - pf.left);
      const cy = (hitRect.top + hitRect.height / 2 - pf.top);
      let cleared = 0;
      if (best.weaponType === "bomb") cleared = weaponBombAt(cx, cy);
      else cleared = weaponArrowFrom(cx);
      if (cleared > 0) {
        // 武器字的價值是「清場」降低漏字扣分/壓力；不額外加分，避免出現看似莫名其妙的 +10
        popFloatText(
          hitRect.left + hitRect.width / 2,
          hitRect.top - 10,
          `清除 +${cleared}`,
          "info"
        );
      }
    }

    // 連續「送出命中」里程碑：命中+次數（不額外爆分）
    if (state.submitStreak === 5 || state.submitStreak === 10 || state.submitStreak === 20) {
      popFloatText(
        hitRect.left + hitRect.width / 2,
        hitRect.top + hitRect.height / 2,
        `命中 +${state.submitStreak}`,
        "info"
      );
    }

    // 每命中 10 次 -> +1 炮彈
    if (state.hitsSinceAmmo % 10 === 0) {
      state.ammo += 1;
      updateHud();
      popFloatText(hitRect.left + hitRect.width / 2, hitRect.top - 20, "炮彈 +1", "info");
    }

    if (state.score >= state.stageTargetScore) {
      stageClear();
    }
    return { ok: true, msg: "命中！" };
  }

  function tick(t) {
    if (!state.running || state.paused) {
      state.lastT = t;
      requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(0.034, (t - state.lastT) / 1000 || 0); // clamp ~34ms
    state.lastT = t;

    // timer
    state.stageTimeLeftMs -= dt * 1000;
    if (state.stageTimeLeftMs <= 0) {
      state.stageTimeLeftMs = 0;
      updateHud();
      stageFail();
      requestAnimationFrame(tick);
      return;
    }

    // spawn pacing
    const params = difficultyParams();
    const spawnEvery = params.spawnMs * clamp(spawnMultiplierFor(state.level), 1.0, 1.9);
    if (t - state.lastSpawnT > spawnEvery && state.words.length < maxOnScreenFor(state.level)) {
      state.lastSpawnT = t;
      spawnWord();
    }

    const rect = playfield.getBoundingClientRect();
    const bottomY = rect.height + 8;

    for (const w of state.words) {
      w.y += w.speed * dt;
      w.el.style.top = `${w.y}px`;
    }

    // handle misses
    const missed = state.words.filter((w) => w.y > bottomY);
    if (missed.length) {
      for (const w of missed) w.el.remove();
      state.words = state.words.filter((w) => w.y <= bottomY);
      onDropMiss(missed.length);
    }

    applyDangerStyles();
    requestAnimationFrame(tick);
  }

  function startGame() {
    if (state.gameOver) {
      resetGame(true);
    }

    hideOverlay();
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.lastT = now();
    state.lastSpawnT = now();
    setStatus(`進行中（第 ${state.level} 關）`);
    input.focus();
  }

  function togglePause() {
    if (!state.running && !state.gameOver) return;
    if (state.gameOver) return;
    state.paused = !state.paused;
    if (state.paused) {
      setStatus("已暫停");
      showOverlay("已暫停", "按「暫停」或 Esc 可繼續。");
      setOverlayPrimary("繼續");
    } else {
      hideOverlay();
      setStatus("進行中");
      state.lastT = now();
      input.focus();
    }
  }

  // UI wiring
  btnStart.addEventListener("click", startGame);
  btnOverlayStart.addEventListener("click", startGame);
  btnOverlayFocus.addEventListener("click", () => input.focus());
  btnPause.addEventListener("click", togglePause);
  btnReset.addEventListener("click", () => resetGame(true));

  // difficulty change only affects future spawns/penalties; no immediate state mutation needed

  input.addEventListener("input", () => {
    highlightMatches(input.value);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    const r = tryHit(text);
    if (r.ok) {
      input.value = "";
      highlightMatches("");
    } else {
      // 出錯定義：送出後沒命中任何字 -> 重置連擊/連段 + 視覺回饋
      const hadStreak = state.submitStreak;
      const params = difficultyParams();
      state.stageMistakes += 1;
      state.combo = 0;
      state.submitStreak = 0;
      state.score = Math.max(0, state.score - params.wrongPenalty);
      updateHud();
      setStatus(`${r.msg} -${params.wrongPenalty}`);

      const inRect = input.getBoundingClientRect();
      popFloatText(inRect.left + inRect.width * 0.5, inRect.top - 10, "未命中", "bad");
      if (hadStreak >= 5) {
        popFloatText(inRect.left + inRect.width * 0.5, inRect.top - 26, "連段中斷", "bad");
      }
      flashBad();
    }
    input.focus();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      togglePause();
      return;
    }
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      input.value = "";
      highlightMatches("");
      setStatus("已清空輸入框");
    }
  });

  // On resize, keep existing words inside bounds a bit better
  window.addEventListener("resize", () => {
    const rect = playfield.getBoundingClientRect();
    for (const w of state.words) {
      w.x = clamp(w.x, 28, rect.width - 28);
      w.el.style.left = `${w.x}px`;
    }
  });

  // Start animation loop
  resetGame(true);
  renderBestTimes();
  requestAnimationFrame((t) => {
    state.lastT = t;
    requestAnimationFrame(tick);
  });

  // Accessibility: click anywhere in game to focus input (unless overlay is visible)
  gameRoot.addEventListener("pointerdown", (e) => {
    if (elOverlay.style.display !== "none") return;
    if (e.target && e.target.closest && e.target.closest(".word")) return;
    if (e.target && (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT"))
      return;
    input.focus();
  });

  function launchMissileToWord(word) {
    const pf = playfield.getBoundingClientRect();
    const target = word.el.getBoundingClientRect();
    const tx = target.left + target.width / 2 - pf.left;
    const ty = target.top + target.height / 2 - pf.top;
    const sx = pf.width / 2;
    const sy = pf.height + 24;

    const m = document.createElement("div");
    m.className = "missile";
    playfield.appendChild(m);

    const anim = m.animate(
      [
        { transform: `translate(${sx}px, ${sy}px)`, opacity: 0.0 },
        { transform: `translate(${sx}px, ${sy}px)`, opacity: 1.0, offset: 0.08 },
        { transform: `translate(${tx}px, ${ty}px)`, opacity: 1.0 },
      ],
      { duration: 360, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)", fill: "forwards" }
    );

    anim.addEventListener(
      "finish",
      () => {
        m.remove();
        const still = state.words.find((w) => w.id === word.id);
        popParticles(target.left + target.width / 2, target.top + target.height / 2, "bad");
        popParticles(target.left + target.width / 2, target.top + target.height / 2, "info");
        popFloatText(target.left + target.width / 2, target.top - 6, "砲擊！", "info");
        if (still) {
          removeWord(still);
          highlightMatches(input.value.trim());
        }
      },
      { once: true }
    );
  }

  // 點擊落字：消耗炮彈直接炸掉
  playfield.addEventListener("pointerdown", (e) => {
    const targetEl = e.target && e.target.closest ? e.target.closest(".word") : null;
    if (!targetEl) return;
    if (elOverlay.style.display !== "none") return;
    if (!state.running || state.paused) return;
    e.preventDefault();

    const word = state.words.find((w) => w.el === targetEl);
    if (!word) return;

    const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;

    if (state.ammo <= 0) {
      popFloatText(clientX, clientY, "沒有炮彈", "bad");
      flashBad();
      return;
    }

    state.ammo -= 1;
    updateHud();
    popFloatText(clientX, clientY, "炮彈 -1", "info");
    launchMissileToWord(word);
  });
})();


