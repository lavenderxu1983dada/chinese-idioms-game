// Account UI + auth state for chinese-idioms-game.
// Talks to the Pages Functions API (/api/auth/*, /api/score).
window.Auth = (function () {
  let user = null;
  const loginCbs = [];

  async function me() {
    try {
      const r = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!r.ok) return null;
      const d = await r.json();
      return d.user || null;
    } catch { return null; }
  }

  async function getScore() {
    try {
      const r = await fetch("/api/score", { credentials: "same-origin" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function saveScore(score, combo, difficulty) {
    if (!user) return null;
    try {
      const r = await fetch("/api/score", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, combo, difficulty: String(difficulty || "all") }),
      });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
    user = null;
    render();
    loginCbs.forEach((c) => c(null));
  }

  function googleMark() {
    // Multi-color "G" via inline SVG (pure ASCII path data).
    return '<svg class="g" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">'
      + '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>'
      + '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>'
      + '<path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>'
      + '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>'
      + "</svg>";
  }

  function render() {
    const area = document.getElementById("accountArea");
    if (!area) return;
    area.innerHTML = "";
    if (user) {
      const chip = document.createElement("span");
      chip.className = "account-chip";
      chip.title = user.email || "";
      if (user.picture) {
        const img = document.createElement("img");
        img.src = user.picture; img.alt = "";
        chip.appendChild(img);
      }
      const nm = document.createElement("span");
      nm.className = "account-name";
      nm.textContent = (user.name || "Account").split(" ")[0];
      chip.appendChild(nm);
      const lo = document.createElement("button");
      lo.className = "btn-link"; lo.type = "button"; lo.textContent = "Sign out";
      lo.onclick = logout;
      area.appendChild(chip);
      area.appendChild(lo);
    } else {
      const a = document.createElement("a");
      a.className = "signin-btn"; a.href = "/api/auth/login";
      a.innerHTML = googleMark() + "<span>Sign in</span>";
      area.appendChild(a);
    }
  }

  async function init() {
    user = await me();
    render();
    loginCbs.forEach((c) => c(user));
  }

  return {
    init,
    render,
    saveScore,
    getScore,
    logout,
    onLogin(cb) { loginCbs.push(cb); cb(user); },
    get currentUser() { return user; },
  };
})();