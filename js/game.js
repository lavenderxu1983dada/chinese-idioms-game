(() => {
  const $ = id => document.getElementById(id);

  // Precompute the pool of distinct characters per difficulty for distractor selection.
  const CHARS = {};
  IDIOMS.forEach(d => [...d.w].forEach(c => {
    (CHARS[d.lvl] = CHARS[d.lvl] || []).push(c);
  }));
  const ALL_CHARS = [...new Set(IDIOMS.flatMap(d => [...d.w]))];

  const DIFFS = { all:"All", 1:"Easy", 2:"Medium", 3:"Hard" };

  let state;

  const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  function activePool(){
    return state.diff === "all" ? IDIOMS : IDIOMS.filter(d => d.lvl === state.diff);
  }

  function setNote(msg){
    const el = $("accountNote");
    if(el) el.textContent = msg || "";
  }

  // Merge the user's cloud best into state and re-render if higher.
  async function refreshServerBest(){
    if(!(window.Auth && Auth.currentUser)){ setNote(""); return; }
    setNote("Synced to your account");
    const s = await Auth.getScore();
    if(!s) return;
    if((s.best||0) > state.best){ state.best = s.best; updateStats(); }
  }

  function newGame(){
    const diff = (state && state.diff) || "all";
    const showPinyin = (state && state.showPinyin) || false;
    state = {
      score:0, combo:0, lives:3,
      diff, showPinyin,
      best: +(localStorage.getItem("cig_best")||0),
      seen:[],            // indexes of idioms already shown this run
      locked:false        // true while a breakdown/end overlay is up
    };
    $("best").textContent = state.best;
    $("endOverlay").classList.remove("show");
    state.locked = false;
    renderLives();
    nextIdiom();
    refreshServerBest();
  }

  function nextIdiom(){
    const pool = activePool();
    if(!pool.length) return;

    // avoid repeating until the whole pool has been seen
    let candidates = pool.filter(d => !state.seen.includes(IDIOMS.indexOf(d)));
    if(!candidates.length){ state.seen = []; candidates = pool; }
    const item = pick(candidates);
    const idx = IDIOMS.indexOf(item);
    state.seen.push(idx);
    state.current = item;
    state.slots = ["","","",""];
    state.hinted = new Set();

    // 4 distractors, preferring same-level characters
    const correct = [...item.w];
    const sameLvl = [...new Set((CHARS[item.lvl]||ALL_CHARS).filter(c => !correct.includes(c)))];
    const distractors = [];
    const source = shuffle(sameLvl).concat(shuffle(ALL_CHARS.filter(c=>!correct.includes(c)&&!sameLvl.includes(c))));
    for(const c of source){ if(distractors.length>=4) break; if(!distractors.includes(c)) distractors.push(c); }

    state.pool = shuffle([...correct, ...distractors]).map((ch,i)=>({ch,i,used:false}));
    renderIdiom();
  }

  function renderIdiom(){
    $("emoji").textContent = state.current.e;
    $("meaning").textContent = state.current.en;
    renderSlots();
    renderPool();
    $("breakdown").innerHTML = "";
    $("breakdown").style.display = "none";
    $("btnNext").style.display = "none";
  }

  function renderSlots(){
    const el = $("slots"); el.innerHTML = "";
    state.slots.forEach((s,i) => {
      const d = document.createElement("div");
      const filled = s !== "";
      d.className = "slot" + (filled ? " filled" : "");
      if(filled){
        const ch = document.createElement("div"); ch.textContent = state.pool[s].ch; d.appendChild(ch);
        if(state.showPinyin){ const py = document.createElement("div"); py.className="py"; py.textContent = state.current.pw[i]; d.appendChild(py); }
      }
      d.onclick = () => {
        if(state.locked) return;
        if(state.slots[i] !== ""){
          const idx = state.slots[i];
          if(state.hinted.has(i)) return;            // locked-in hint
          state.slots[i] = "";
          state.pool[idx].used = false;
          renderSlots(); renderPool();
        }
      };
      el.appendChild(d);
    });
  }

  function renderPool(){
    const el = $("pool"); el.innerHTML = "";
    state.pool.forEach(p => {
      const d = document.createElement("div");
      d.className = "chip" + (p.used ? " used" : "");
      d.textContent = p.ch;
      d.onclick = () => placeChar(p);
      el.appendChild(d);
    });
  }

  function placeChar(p){
    if(state.locked || p.used) return;
    let target = state.slots.findIndex((s,i) => s === "" && !state.hinted.has(i));
    if(target === -1) target = state.slots.findIndex(s => s === "");
    if(target === -1) return;
    state.slots[target] = p.i;
    p.used = true;
    renderSlots(); renderPool();
    if(state.slots.every(s => s !== "")) check();
  }

  function check(){
    const guess = state.slots.map(i => state.pool[i].ch).join("");
    const ans = state.current.w;
    if(guess === ans){
      state.locked = true;
      const gain = 10 + state.combo * 2;
      state.combo++;
      state.score += gain;
      [...document.querySelectorAll(".slot")].forEach(s => s.classList.add("correct"));
      toast("Correct!  +" + gain, "good");
      updateStats();
      setTimeout(() => reveal(true), 750);
    } else {
      state.locked = true;
      state.combo = 0;
      state.lives--;
      [...document.querySelectorAll(".slot")].forEach(s => s.classList.add("wrong"));
      toast("Not quite \u2014 see the answer", "bad");
      updateStats(); renderLives();
      setTimeout(() => {
        reveal(false);
        if(state.lives <= 0) setTimeout(endGame, 50);
      }, 700);
    }
  }

  function reveal(correct){
    const it = state.current;
    const bd = $("breakdown");
    bd.style.display = "block";
    bd.innerHTML = "";

    const row = document.createElement("div"); row.className = "bd";
    [...it.w].forEach((c,i) => {
      const cell = document.createElement("div"); cell.className = "cell";
      const ch = document.createElement("div"); ch.className="ch"; ch.textContent = c;
      const py = document.createElement("div"); py.className="py"; py.textContent = it.pw[i];
      cell.appendChild(ch); cell.appendChild(py); row.appendChild(cell);
    });
    bd.appendChild(row);

    const dl = document.createElement("dl"); dl.className = "gloss";
    const rows = [
      ["Pinyin", it.p],
      ["Literal", it.lit],
      ["Meaning", it.en]
    ];
    rows.forEach(([k,v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
    });
    bd.appendChild(dl);

    $("btnNext").textContent = correct ? "Next idiom \u2192" : "Got it \u2192";
    $("btnNext").style.display = "block";
  }

  function nextOrEnd(){
    if(state.lives <= 0){ endGame(); return; }
    state.locked = false;
    nextIdiom();
  }

  function useHint(){
    if(state.locked) return;
    if(state.score < 3){ toast("Need 3 points first", "bad"); return; }
    const ans = state.current.w;
    let target = -1;
    for(let i=0;i<4;i++){
      const cur = state.slots[i] !== "" ? state.pool[state.slots[i]].ch : null;
      if(!state.hinted.has(i) && cur !== ans[i]){ target = i; break; }
    }
    if(target === -1){ toast("Nothing left to reveal", "bad"); return; }
    state.score -= 3;
    if(state.slots[target] !== ""){
      state.pool[state.slots[target]].used = false;
      state.slots[target] = "";
    }
    const ch = ans[target];
    const poolIdx = state.pool.findIndex(p => p.ch === ch && !p.used);
    if(poolIdx >= 0){ state.slots[target] = poolIdx; state.pool[poolIdx].used = true; state.hinted.add(target); }
    updateStats(); renderSlots(); renderPool();
    if(state.slots.every(s => s !== "")) { state.locked = true; setTimeout(()=>check(),120); }
  }

  function skip(){
    if(state.locked) return;
    state.combo = 0;
    state.locked = true;
    toast("Revealing the answer\u2026", "bad");
    setTimeout(() => { updateStats(); reveal(false); }, 450);
  }

  function clearSlots(){
    if(state.locked) return;
    state.slots = ["","","",""];
    state.pool.forEach(p => p.used = false);
    const ans = state.current.w;
    state.hinted.forEach(pos => {
      const idx = state.pool.findIndex(p => p.ch === ans[pos]);
      if(idx >= 0){ state.slots[pos] = idx; state.pool[idx].used = true; }
    });
    renderSlots(); renderPool();
  }

  function renderLives(){
    const el = $("lives"); el.innerHTML = "";
    for(let i=0;i<3;i++){
      const h = document.createElement("div");
      h.className = "heart" + (i < state.lives ? " on" : "");
      h.textContent = "\u2665";
      el.appendChild(h);
    }
  }

  function updateStats(){
    $("score").textContent = state.score;
    $("combo").textContent = state.combo;
    $("best").textContent = Math.max(state.best, state.score);
  }

  function endGame(){
    state.locked = true;
    const newBest = state.score > state.best;
    if(newBest){ state.best = state.score; localStorage.setItem("cig_best", state.best); }
    $("endScore").textContent = state.score;
    $("endBest").textContent = newBest ? "\uD83C\uDF89 New personal best!" : ("Best: " + state.best);
    $("endOverlay").classList.add("show");
    // Persist to the cloud if signed in.
    if(window.Auth && Auth.currentUser){
      Auth.saveScore(state.score, state.combo, state.diff).then(() => refreshServerBest());
    }
  }

  let toastTimer;
  function toast(msg,type){
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
  }

  // ---- wiring ----
  function init(){
    const seg = $("diffSeg");
    Object.entries(DIFFS).forEach(([key,label]) => {
      const b = document.createElement("button");
      b.textContent = label;
      if(key === "all") b.classList.add("on");
      b.onclick = () => {
        [...seg.children].forEach(c => c.classList.remove("on"));
        b.classList.add("on");
        state.diff = key === "all" ? "all" : +key;
        state.seen = [];
        toast("Difficulty: " + label, "good");
        state.locked = false;
        nextIdiom();
      };
      seg.appendChild(b);
    });

    const tog = $("pyToggle");
    tog.checked = false;
    tog.onchange = () => {
      state.showPinyin = tog.checked;
      if(!state.locked) renderSlots();
    };

    $("btnClear").onclick = clearSlots;
    $("btnHint").onclick = useHint;
    $("btnSkip").onclick = skip;
    $("btnNext").onclick = nextOrEnd;
    $("btnRestart").onclick = newGame;

    newGame();
    if(window.Auth){
      Auth.init();
      Auth.onLogin((u) => { if(u) refreshServerBest(); });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();