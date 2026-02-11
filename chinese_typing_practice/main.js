(() => {
  /** @typedef {{ id: number, kind: "normal" | "weapon", weaponType?: "bomb" | "arrow", text: string, zyLen?: 1|2|3, x: number, y: number, speed: number, el: HTMLElement, pending?: boolean }} FallingWord */

  const $ = (id) => document.getElementById(id);
  const playfield = $("playfield");
  const gameRoot = $("game");

  const elScore = $("score");
  const elTotalScore = $("totalScore");
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
  const elSfxEnabled = $("sfxEnabled");
  const elSfxVolume = $("sfxVolume");
  const elBgmEnabled = $("bgmEnabled");
  const elBgmVolume = $("bgmVolume");

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
    totalScore: 0, // 總分（跨關累積）
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
    lastHudSecond: null, // 用來讓倒數時間每秒更新一次
  };

  // localStorage：改名後沿用舊 key 的資料（避免玩家紀錄消失）
  const STORAGE_KEY = "chinese_typing_practice:bestTimes:v1";
  const STORAGE_KEY_OLD = "typing-fall:bestTimes:v1";

  const sfx = (() => {
    /** @type {AudioContext | null} */
    let ctx = null;
    /** @type {GainNode | null} */
    let master = null;
    let enabled = true;
    let volume = 0.4;
    let assetsReady = false;
    /** @type {{ hit: { list: HTMLAudioElement[], i: number } | null, dead: { list: HTMLAudioElement[], i: number } | null, laser: { list: HTMLAudioElement[], i: number } | null }} */
    const pools = { hit: null, dead: null, laser: null };

    function clamp01(v) {
      return Math.max(0, Math.min(1, v));
    }

    function makePool(src, size = 4) {
      const list = [];
      for (let i = 0; i < size; i += 1) {
        const a = new Audio(src);
        a.preload = "auto";
        a.volume = volume;
        list.push(a);
      }
      return { list, i: 0 };
    }

    function ensureAssets() {
      if (!enabled) return;
      if (assetsReady) return;
      assetsReady = true;
      pools.hit = makePool("./hit.wav", 5);
      pools.dead = makePool("./dead.wav", 4);
      pools.laser = makePool("./laser.wav", 3);
    }

    function playPool(pool) {
      if (!enabled) return false;
      ensureAssets();
      if (!pool || !pool.list || pool.list.length === 0) return false;
      const a = pool.list[pool.i % pool.list.length];
      pool.i += 1;
      a.volume = volume;
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        // ignore
      }
      return true;
    }

    function ensure() {
      ensureAssets();
      if (!enabled) return null;
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      return ctx;
    }

    function setEnabled(v) {
      enabled = !!v;
    }

    function setVolume01(v) {
      volume = clamp01(v);
      if (master) master.gain.value = volume;
      for (const key of /** @type {const} */ (["hit", "dead", "laser"])) {
        const pool = pools[key];
        if (!pool) continue;
        for (const a of pool.list) a.volume = volume;
      }
    }

    function nowT() {
      return ctx ? ctx.currentTime : 0;
    }

    function tone({ type = "sine", freq = 440, dur = 0.08, gain = 0.12, detune = 0 }) {
      const c = ensure();
      if (!c || !master) return;
      if (c.state === "suspended") c.resume().catch(() => {});

      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;

      const t0 = nowT();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function sweep({ f0, f1, dur = 0.14, gain = 0.12, type = "sine" }) {
      const c = ensure();
      if (!c || !master) return;
      if (c.state === "suspended") c.resume().catch(() => {});

      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      const t0 = nowT();
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function noise({ dur = 0.10, gain = 0.10, tone = 800 }) {
      const c = ensure();
      if (!c || !master) return;
      if (c.state === "suspended") c.resume().catch(() => {});

      const bufferSize = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

      const src = c.createBufferSource();
      src.buffer = buffer;

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = tone;
      bp.Q.value = 1.2;

      const g = c.createGain();
      const t0 = nowT();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    function hit(pts) {
      if (playPool(pools.hit)) return;
      if (pts === 5) {
        tone({ type: "triangle", freq: 880, dur: 0.08, gain: 0.13 });
        tone({ type: "sine", freq: 1320, dur: 0.06, gain: 0.07, detune: 6 });
      } else if (pts === 3) {
        tone({ type: "triangle", freq: 660, dur: 0.07, gain: 0.11 });
      } else {
        tone({ type: "sine", freq: 440, dur: 0.06, gain: 0.10 });
      }
    }

    function missile(pts) {
      // whoosh sweep
      if (pts === 5) sweep({ f0: 280, f1: 1200, dur: 0.12, gain: 0.10, type: "sawtooth" });
      else if (pts === 3) sweep({ f0: 220, f1: 900, dur: 0.14, gain: 0.09, type: "sawtooth" });
      else sweep({ f0: 180, f1: 700, dur: 0.16, gain: 0.08, type: "sawtooth" });
    }

    function laser() {
      if (playPool(pools.laser)) return;
      // electric zap: bright sweep + short noise crackle
      sweep({ f0: 520, f1: 1900, dur: 0.18, gain: 0.09, type: "triangle" });
      noise({ dur: 0.10, gain: 0.06, tone: 1200 });
    }

    function boom(pts) {
      // explosion noise + low thump
      if (pts === 5) {
        noise({ dur: 0.12, gain: 0.14, tone: 900 });
        tone({ type: "sine", freq: 90, dur: 0.10, gain: 0.12 });
      } else if (pts === 3) {
        noise({ dur: 0.10, gain: 0.11, tone: 800 });
        tone({ type: "sine", freq: 110, dur: 0.08, gain: 0.10 });
      } else {
        noise({ dur: 0.08, gain: 0.09, tone: 700 });
        tone({ type: "sine", freq: 130, dur: 0.06, gain: 0.09 });
      }
    }

    function wrong() {
      sweep({ f0: 220, f1: 70, dur: 0.18, gain: 0.10, type: "square" });
    }

    function drop() {
      if (playPool(pools.dead)) return;
      tone({ type: "sine", freq: 120, dur: 0.10, gain: 0.11 });
      noise({ dur: 0.06, gain: 0.07, tone: 260 });
    }

    function clear(perfect) {
      if (perfect) {
        tone({ type: "triangle", freq: 988, dur: 0.12, gain: 0.10 });
        tone({ type: "triangle", freq: 1318, dur: 0.12, gain: 0.08, detune: -4 });
        tone({ type: "sine", freq: 1760, dur: 0.10, gain: 0.06 });
      } else {
        tone({ type: "triangle", freq: 784, dur: 0.10, gain: 0.09 });
        tone({ type: "sine", freq: 1046, dur: 0.10, gain: 0.07 });
      }
    }

    function ammoUp() {
      tone({ type: "sine", freq: 660, dur: 0.06, gain: 0.08 });
      tone({ type: "sine", freq: 990, dur: 0.06, gain: 0.06, detune: 5 });
    }

    return {
      setEnabled,
      setVolume01,
      hit,
      missile,
      laser,
      boom,
      wrong,
      drop,
      clear,
      ammoUp,
      ensure,
    };
  })();

  const bgm = (() => {
    /** @type {HTMLAudioElement | null} */
    let audio = null;
    let enabled = true;
    let volume = 0.25;

    function ensure() {
      if (audio) return audio;
      audio = new Audio("./pixel_loop.wav");
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = volume;
      return audio;
    }

    function setEnabled(v) {
      enabled = !!v;
      if (!enabled && audio) audio.pause();
    }

    function setVolume01(v) {
      volume = Math.max(0, Math.min(1, v));
      if (audio) audio.volume = volume;
    }

    async function play() {
      if (!enabled) return;
      const a = ensure();
      a.volume = volume;
      try {
        await a.play();
      } catch {
        // autoplay restrictions; ignore
      }
    }

    function pause() {
      if (audio) audio.pause();
    }

    function stop() {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    }

    return { ensure, setEnabled, setVolume01, play, pause, stop };
  })();

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
    // 提高每關成長幅度，讓過關後更有「難度上升」的感覺
    if (level <= 2) return 60 + (level - 1) * 25; // 60, 85
    if (level <= 5) return 110 + (level - 3) * 30; // 110, 140, 170
    return 200 + (level - 6) * 40; // 200, 240, 280...
  }

  function tierPointsByHeight(wordCenterY, playfieldHeight) {
    // 越高命中越高分：高(5) / 中(3) / 低(1)
    const h = Math.max(1, playfieldHeight);
    const r = clamp(wordCenterY / h, 0, 0.999);
    if (r < 1 / 3) return { pts: 5, tier: "高" };
    if (r < 2 / 3) return { pts: 3, tier: "中" };
    return { pts: 1, tier: "低" };
  }

  function maxOnScreenFor(level) {
    // 循序漸進：前期同屏字數少，之後慢慢增加
    if (level <= 1) return 5;
    if (level <= 3) return 6;
    if (level <= 5) return 7;
    if (level <= 7) return 8;
    return 9;
  }

  function difficultyParams() {
    const d = difficultySel.value;
    if (d === "easy") {
      return { spawnMs: 1750, baseSpeed: 22, wrongPenalty: 0, dropPenalty: 2 };
    }
    if (d === "hard") {
      return { spawnMs: 1500, baseSpeed: 26, wrongPenalty: 0, dropPenalty: 2 };
    }
    return { spawnMs: 1620, baseSpeed: 24, wrongPenalty: 0, dropPenalty: 2 };
  }

  function stageTargetFor(level) {
    // legacy (kept for patch safety) — no longer used
    return level;
  }

  function speedMultiplierFor(level) {
    // 前 5 關很溫和；第 6 關後才開始更明顯
    // 讓「過關後變快」更有感，但前兩關仍保留緩衝
    if (level <= 2) return 1 + (level - 1) * 0.03;
    if (level <= 5) return 1 + 1 * 0.03 + (level - 2) * 0.05;
    return 1 + 1 * 0.03 + 3 * 0.05 + (level - 5) * 0.07;
  }

  function spawnMultiplierFor(level) {
    // 掉落密度：數值越大 => 間隔越久（更慢）；這裡讓關卡越高越「更密」
    // 前兩關溫和，之後加速變密
    if (level <= 2) return 1.15 - (level - 1) * 0.06; // 1.15, 1.09
    if (level <= 5) return 1.03 - (level - 2) * 0.06; // 1.03, 0.97, 0.91
    return 0.85 - (level - 5) * 0.04; // 0.85, 0.81, 0.77...
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
      const rawOld = localStorage.getItem(STORAGE_KEY_OLD);
      const obj = raw ? JSON.parse(raw) : {};
      const objOld = !raw && rawOld ? JSON.parse(rawOld) : null;
      // 若新 key 沒資料但舊 key 有，就自動遷移一次
      if (
        (!obj || (typeof obj === "object" && Object.keys(obj).length === 0)) &&
        objOld &&
        typeof objOld === "object"
      ) {
        saveBestTimes(objOld);
        return objOld;
      }
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
    if (elTotalScore) elTotalScore.textContent = String(state.totalScore);
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

  // （已移除：命中爆炸/粒子等特效，改成純打字）

  function celebratePerfectStage() {
    // 純打字模式：只顯示文字即可
    const pf = playfield.getBoundingClientRect();
    const cx = pf.left + pf.width / 2;
    const cy = pf.top + pf.height * 0.28;
    const words = ["Good!", "Awesome!", "Perfect!", "Nice!"];
    const msg = words[(Math.random() * words.length) | 0];
    popFloatText(cx, cy, msg, "good");
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
    state.totalScore = 0;
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
    state.lastHudSecond = null;
    updateHud();
    setStatus("準備開始");
    bgm.stop();

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
    const set = wordsetSel.value;
    const zy = set === "zhuyin" ? pickZhuyin() : null;
    const text = zy ? zy.text : pickChar();
    const w = {
      id: state.nextId++,
      kind: "normal",
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
    state.totalScore = Math.max(0, state.totalScore - penalty);
    state.combo = 0;
    state.submitStreak = 0;
    updateHud();
    flashBad();
    sfx.drop();
    setStatus(`漏字 -${penalty}`);
  }

  function gameOver(reason) {
    state.running = false;
    state.paused = false;
    state.gameOver = true;
    updateHud();
    setStatus("遊戲結束");
    bgm.pause();
    showOverlay(
      "遊戲結束",
      `${reason}。關卡分數 ${state.score}/${state.stageTargetScore}，總分 ${state.totalScore}。按「重來」再挑戰一次。`
    );
    setOverlayPrimary("開始遊戲");
  }

  function stageFail() {
    state.running = false;
    state.paused = false;
    state.gameOver = true;
    updateHud();
    setStatus("時間到");
    bgm.pause();
    showOverlay(
      "時間到",
      `未達標：關卡分數 ${state.score}/${state.stageTargetScore}，總分 ${state.totalScore}。按「重來」再挑戰一次。`
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
    sfx.clear(perfect);

    hideOverlay();
    showBanner(
      `第 ${state.level} 關完成！${perfect ? " Perfect!" : ""}${isNew ? " 新紀錄！" : ""}（總分 ${state.totalScore}）`,
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
    state.lastHudSecond = null;
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
    bgm.play();
  }

  function removeWord(w) {
    w.el.remove();
    state.words = state.words.filter((x) => x.id !== w.id);
  }

  // （已移除：武器字邏輯，改成純打字）

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
      if (w.pending) continue;
      if (w.text === t) {
        if (!best || w.y > best.y) best = w;
      }
    }
    if (!best) return { ok: false, msg: "沒有命中" };

    const hitRect = best.el.getBoundingClientRect();

    // score (依命中高度分三段)
    state.hits += 1;
    state.combo += 1;
    state.submitStreak += 1;
    state.hitsSinceAmmo += 1;
    const pfRect = playfield.getBoundingClientRect();
    const centerY = best.y + 26; // word box ~52px
    const { pts, tier } = tierPointsByHeight(centerY, pfRect.height);
    state.score += pts;
    state.totalScore += pts;
    updateHud();
    flashGood();
    sfx.hit(pts);
    setStatus(`命中（${tier}）+${pts}`);
    popFloatText(hitRect.left + hitRect.width / 2, hitRect.top, `+${pts}`, "good");

    // 純打字：命中即移除
    removeWord(best);
    highlightMatches(input.value.trim());

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

    // 移除任何看似「額外加分」的提示，避免混淆（保留 combo 數字即可）

    // 每命中 10 次 -> +1 大絕
    if (state.hitsSinceAmmo % 10 === 0) {
      state.ammo += 1;
      updateHud();
      sfx.ammoUp();
      popFloatText(hitRect.left + hitRect.width / 2, hitRect.top - 20, "大絕 +1", "info");
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
    // 讓倒數時間（與分數條）至少每秒刷新一次
    const secLeft = Math.ceil(state.stageTimeLeftMs / 1000);
    if (state.lastHudSecond !== secLeft) {
      state.lastHudSecond = secLeft;
      updateHud();
    }

    // spawn pacing
    const params = difficultyParams();
    const spawnEvery = params.spawnMs * clamp(spawnMultiplierFor(state.level), 0.55, 1.6);
    if (t - state.lastSpawnT > spawnEvery && state.words.length < maxOnScreenFor(state.level)) {
      state.lastSpawnT = t;
      spawnWord();
    }

    const rect = playfield.getBoundingClientRect();
    const bottomY = rect.height + 8;

    for (const w of state.words) {
      if (w.pending) continue;
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
    bgm.play();
  }

  function togglePause() {
    if (!state.running && !state.gameOver) return;
    if (state.gameOver) return;
    state.paused = !state.paused;
    if (state.paused) {
      setStatus("已暫停");
      showOverlay("已暫停", "按「暫停」或 Esc 可繼續。");
      setOverlayPrimary("繼續");
      bgm.pause();
    } else {
      hideOverlay();
      setStatus("進行中");
      state.lastT = now();
      input.focus();
      bgm.play();
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
      state.stageMistakes += 1;
      state.combo = 0;
      state.submitStreak = 0;
      updateHud();
      setStatus(r.msg);

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

  function zapWordWithLaser(word) {
    const pf = playfield.getBoundingClientRect();
    const target = word.el.getBoundingClientRect();
    const tx = target.left + target.width / 2 - pf.left;
    const ty = target.top + target.height / 2 - pf.top;
    const sx = pf.width * 0.5;
    const sy = pf.height + 18;

    const angle = Math.atan2(ty - sy, tx - sx);
    const rot = `${(angle * 180) / Math.PI}deg`;
    const dist = Math.hypot(tx - sx, ty - sy);

    // laser beam (slower, stays on target)
    const beam = document.createElement("div");
    beam.className = "laserBeam";
    beam.innerHTML = `<i class="laserNoise"></i><i class="laserArc"></i>`;
    beam.style.width = `${dist}px`;
    beam.style.transform = `translate(${sx}px, ${sy}px) rotate(${rot}) translate(0, -50%) scaleX(0)`;
    playfield.appendChild(beam);

    // freeze target
    word.pending = true;
    word.el.classList.add("pending", "zapped");

    const duration = 760;
    const anim = beam.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) rotate(${rot}) translate(0, -50%) scaleX(0)`, opacity: 0.0 },
        { transform: `translate(${sx}px, ${sy}px) rotate(${rot}) translate(0, -50%) scaleX(1)`, opacity: 1.0, offset: 0.22 },
        { transform: `translate(${sx}px, ${sy}px) rotate(${rot}) translate(0, -50%) scaleX(1)`, opacity: 0.85, offset: 0.78 },
        { transform: `translate(${sx}px, ${sy}px) rotate(${rot}) translate(0, -50%) scaleX(1)`, opacity: 0.0 },
      ],
      { duration, easing: "ease-out", fill: "forwards" }
    );

    const spawnSparks = () => {
      const n = 14;
      for (let i = 0; i < n; i += 1) {
        const sp = document.createElement("div");
        sp.className = "laserSpark";
        sp.style.left = `${tx}px`;
        sp.style.top = `${ty}px`;
        const a = Math.random() * Math.PI * 2;
        const dist = 36 + Math.random() * 44;
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist;
        sp.style.setProperty("--dx", `${dx.toFixed(1)}px`);
        sp.style.setProperty("--dy", `${dy.toFixed(1)}px`);
        sp.style.setProperty("--rot", `${(a * 180) / Math.PI}deg`);
        playfield.appendChild(sp);
        sp.addEventListener("animationend", () => sp.remove(), { once: true });
      }
    };

    const spawnShards = () => {
      const n = 10;
      for (let i = 0; i < n; i += 1) {
        const sh = document.createElement("div");
        sh.className = "laserShard";
        sh.style.left = `${tx}px`;
        sh.style.top = `${ty}px`;
        const a = Math.random() * Math.PI * 2;
        const dist = 42 + Math.random() * 62;
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist;
        sh.style.setProperty("--dx", `${dx.toFixed(1)}px`);
        sh.style.setProperty("--dy", `${dy.toFixed(1)}px`);
        sh.style.setProperty("--rot", `${(Math.random() * 360).toFixed(0)}deg`);
        sh.style.setProperty("--rot2", `${(Math.random() * 720 - 360).toFixed(0)}deg`);
        playfield.appendChild(sh);
        sh.addEventListener("animationend", () => sh.remove(), { once: true });
      }
    };

    const spawnAsh = () => {
      const n = 8;
      for (let i = 0; i < n; i += 1) {
        const puff = document.createElement("div");
        puff.className = "ashPuff";
        puff.style.left = `${tx}px`;
        puff.style.top = `${ty}px`;
        const dx = (Math.random() * 2 - 1) * 48;
        const dy = -Math.random() * 64;
        puff.style.setProperty("--dx", `${dx.toFixed(1)}px`);
        puff.style.setProperty("--dy", `${dy.toFixed(1)}px`);
        playfield.appendChild(puff);
        puff.addEventListener("animationend", () => puff.remove(), { once: true });
      }
    };

    anim.addEventListener(
      "finish",
      () => {
        beam.remove();
        const still = state.words.find((w) => w.id === word.id);
        if (!still) return;

        // impact explosion (distinct from normal remove)
        playfield.classList.remove("shake");
        // reflow to restart animation reliably
        void playfield.offsetWidth;
        playfield.classList.add("shake");

        const flash = document.createElement("div");
        flash.className = "laserFlash";
        flash.style.left = `${tx}px`;
        flash.style.top = `${ty}px`;
        playfield.appendChild(flash);
        flash.addEventListener("animationend", () => flash.remove(), { once: true });

        const impact = document.createElement("div");
        impact.className = "laserImpact";
        impact.style.left = `${tx}px`;
        impact.style.top = `${ty}px`;
        playfield.appendChild(impact);
        impact.addEventListener("animationend", () => impact.remove(), { once: true });

        const sw1 = document.createElement("div");
        sw1.className = "laserShockwave";
        sw1.style.left = `${tx}px`;
        sw1.style.top = `${ty}px`;
        playfield.appendChild(sw1);
        sw1.addEventListener("animationend", () => sw1.remove(), { once: true });

        const sw2 = document.createElement("div");
        sw2.className = "laserShockwave";
        sw2.style.left = `${tx}px`;
        sw2.style.top = `${ty}px`;
        sw2.style.animationDelay = "70ms";
        playfield.appendChild(sw2);
        sw2.addEventListener("animationend", () => sw2.remove(), { once: true });

        spawnSparks();
        spawnShards();
        spawnAsh();
        still.el.classList.add("laserBoom");
        // 不顯示任何技能文字（避免干擾打字）

        still.el.addEventListener(
          "animationend",
          () => {
            const alive = state.words.find((w) => w.id === word.id);
            if (alive) {
              removeWord(alive);
              highlightMatches(input.value.trim());
            }
          },
          { once: true }
        );
      },
      { once: true }
    );
  }

  // 大絕：空白鍵發射，永遠擊碎最低的文字方塊
  let isComposing = false;
  input.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  input.addEventListener("compositionend", () => {
    isComposing = false;
  });

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (elOverlay.style.display !== "none") return;
    if (!state.running || state.paused) return;
    if (isComposing) return; // 避免干擾 IME 選字
    if (document.activeElement === input && input.value.trim() !== "") return; // 有內容就讓使用者正常打字

    if (state.ammo <= 0) return;
    // 找最低的字（y 最大）
    const candidates = state.words.filter((w) => !w.pending);
    if (candidates.length === 0) return;
    let lowest = candidates[0];
    for (const w of candidates) if (w.y > lowest.y) lowest = w;

    e.preventDefault();
    state.ammo -= 1;
    updateHud();
    popFloatText(input.getBoundingClientRect().left + 80, input.getBoundingClientRect().top - 10, "大絕 -1", "info");
    sfx.laser();
    zapWordWithLaser(lowest);
  });

  // 音效設定
  function syncSfxSettings() {
    const on = elSfxEnabled ? elSfxEnabled.checked : true;
    const vol = elSfxVolume ? Number(elSfxVolume.value || 0) / 100 : 0.4;
    sfx.setEnabled(on);
    sfx.setVolume01(vol);
  }
  if (elSfxEnabled) elSfxEnabled.addEventListener("change", syncSfxSettings);
  if (elSfxVolume) elSfxVolume.addEventListener("input", syncSfxSettings);
  syncSfxSettings();

  // 背景音樂設定
  function syncBgmSettings() {
    const on = elBgmEnabled ? elBgmEnabled.checked : true;
    const vol = elBgmVolume ? Number(elBgmVolume.value || 0) / 100 : 0.25;
    bgm.setEnabled(on);
    bgm.setVolume01(vol);
  }
  if (elBgmEnabled) elBgmEnabled.addEventListener("change", syncBgmSettings);
  if (elBgmVolume) elBgmVolume.addEventListener("input", syncBgmSettings);
  syncBgmSettings();

  // 只要有互動就嘗試啟動音訊（避免自動播放限制）
  window.addEventListener(
    "pointerdown",
    () => {
      sfx.ensure();
      bgm.ensure();
    },
    { once: true }
  );
})();


