(() => {
  const $ = id => document.getElementById(id);

  const LVL_LABEL = {1:"Easy",2:"Medium",3:"Hard"};

  function render(){
    const q = ($("search").value || "").trim().toLowerCase();
    const diff = $("lvlSeg").dataset.value || "all";
    const grid = $("grid");
    grid.innerHTML = "";

    const list = IDIOMS.filter(d => {
      if(diff !== "all" && d.lvl !== +diff) return false;
      if(!q) return true;
      return d.w.includes(q) || d.p.toLowerCase().includes(q) ||
             d.en.toLowerCase().includes(q) || d.lit.toLowerCase().includes(q);
    });

    if(!list.length){
      grid.innerHTML = '<p style="color:var(--muted);padding:20px;text-align:center;">No idioms match your search.</p>';
      return;
    }

    list.forEach(d => {
      const card = document.createElement("article");
      card.className = "idiom-card";
      card.innerHTML =
        '<div class="top">' +
          '<span class="ch">' + d.w + '</span>' +
          '<span class="lvl">' + LVL_LABEL[d.lvl] + '</span>' +
        '</div>' +
        '<div class="py">' + d.p + '</div>' +
        '<div class="emj">' + d.e + '</div>' +
        '<div class="lit">“' + d.lit + '”</div>' +
        '<div class="en">' + d.en + '</div>';
      grid.appendChild(card);
    });
    $("count").textContent = list.length + (list.length === 1 ? " idiom" : " idioms");
  }

  function init(){
    const seg = $("lvlSeg");
    const options = [["all","All"],[1,"Easy"],[2,"Medium"],[3,"Hard"]];
    options.forEach(([key,label]) => {
      const b = document.createElement("button");
      b.textContent = label;
      if(key === "all") b.classList.add("on");
      b.onclick = () => {
        [...seg.children].forEach(c => c.classList.remove("on"));
        b.classList.add("on");
        seg.dataset.value = String(key);
        render();
      };
      seg.appendChild(b);
    });
    seg.dataset.value = "all";

    $("search").addEventListener("input", render);
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
