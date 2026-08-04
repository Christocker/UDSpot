/* ==========================================================================
   UDSpot — shared engine (theme, nav, reveal, counters, tabs, tables, search)
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- toast ---------------- */
  const toastEl = $(".toast");
  let toastTimer;
  window.UD = window.UD || {};
  window.UD.toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  };

  /* ---------------- theme ---------------- */
  const THEME_KEY = "udspot-theme";
  const root = document.documentElement;
  const applyTheme = (t) => {
    root.classList.toggle("dark", t === "dark");
    localStorage.setItem(THEME_KEY, t);
    $$("[data-theme-icon]").forEach((btn) => {
      btn.innerHTML = t === "dark"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
    });
  };
  const initial = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);
  $$("[data-theme-toggle]").forEach((btn) =>
    btn.addEventListener("click", () =>
      applyTheme(root.classList.contains("dark") ? "light" : "dark")
    )
  );

  /* ---------------- reading progress ---------------- */
  const prog = $("#progressBar");
  const onScrollProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  if (prog) {
    onScrollProgress();
    window.addEventListener("scroll", onScrollProgress, { passive: true });
  }

  /* ---------------- nav ---------------- */
  const nav = $(".nav");
  const onNavScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 24);
  if (nav) { onNavScroll(); window.addEventListener("scroll", onNavScroll, { passive: true }); }

  const mm = $("#mobileMenu");
  const openMM = (v) => {
    if (!mm) return;
    mm.classList.toggle("open", v);
    document.body.style.overflow = v ? "hidden" : "";
  };
  $("#navBurger") && $("#navBurger").addEventListener("click", () => openMM(true));
  $("#mmClose") && $("#mmClose").addEventListener("click", () => openMM(false));
  mm && $$("a", mm).forEach((a) => a.addEventListener("click", () => openMM(false)));

  /* active nav by location */
  const page = (location.pathname.split("/").pop() || "index.html").replace(/^\.?\//, "");
  $$(".nav-links a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("#")[0];
    if (href === page || (page === "index.html" && (href === "" || href === "index.html"))) {
      a.classList.add("active");
    }
  });

  /* ---------------- back to top ---------------- */
  const btop = $("#backTop");
  if (btop) {
    const onBt = () => btop.classList.toggle("show", window.scrollY > 700);
    window.addEventListener("scroll", onBt, { passive: true });
    btop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  }

  /* ---------------- reveal ---------------- */
  const revealObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
  );
  $$(".reveal").forEach((el) => revealObs.observe(el));

  /* ---------------- counters ---------------- */
  const fmtNum = (v, fmt) => (fmt === "comma" ? Math.round(v).toLocaleString("en-US") : Math.round(v).toString());
  const counterObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      counterObs.unobserve(el);
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || "";
      if (reduced) { el.textContent = fmtNum(target, el.dataset.format) + suffix; return; }
      const dur = 1600, t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const v = target * (1 - Math.pow(1 - p, 3));
        el.textContent = fmtNum(v, el.dataset.format) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }),
    { threshold: 0.5 }
  );
  $$("[data-count]").forEach((el) => counterObs.observe(el));

  /* ---------------- accordions ---------------- */
  $$(".acc-item").forEach((item) => {
    const head = $(".acc-head", item);
    const body = $(".acc-body", item);
    head.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".acc-item.open").forEach((o) => {
        o.classList.remove("open");
        $(".acc-body", o).style.maxHeight = null;
      });
      if (!open) {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });

  /* ---------------- tabs ---------------- */
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach((b) => b.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const target = $("#panel-" + btn.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  /* ---------------- sortable tables ---------------- */
  $$("table[data-sortable]").forEach((table) => {
    const tbody = table.tBodies[0];
    $$("th[data-sort]", table).forEach((th, i) => {
      th.setAttribute("tabindex", "0");
      th.addEventListener("click", () => sortBy(th, i));
      th.addEventListener("keydown", (e) => { if (e.key === "Enter") sortBy(th, i); });
    });
    const sortBy = (th, i) => {
      const asc = !th.classList.contains("sorted-asc");
      $$("th[data-sort]", table).forEach((t) => { t.classList.remove("sorted-asc", "sorted-desc", "sorted"); });
      th.classList.add("sorted", asc ? "sorted-asc" : "sorted-desc");
      const rows = $$("tbody tr", table);
      rows.sort((a, b) => {
        const va = $("td:nth-child(" + (i + 1) + ")", a).dataset.sort || $("td:nth-child(" + (i + 1) + ")", a).textContent.trim();
        const vb = $("td:nth-child(" + (i + 1) + ")", b).dataset.sort || $("td:nth-child(" + (i + 1) + ")", b).textContent.trim();
        const na = parseFloat(va), nb = parseFloat(vb);
        const cmp = (!isNaN(na) && !isNaN(nb)) ? na - nb : va.localeCompare(vb);
        return asc ? cmp : -cmp;
      });
      rows.forEach((r) => tbody.appendChild(r));
    };
  });

  /* ---------------- table search (per wrap) ---------------- */
  $$(".table-wrap[data-searchable]").forEach((wrap) => {
    const input = $("input[type=search]", wrap);
    const table = $("table", wrap);
    if (!input || !table) return;
    input.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      let vis = 0;
      $$("tbody tr", table).forEach((tr) => {
        const hit = tr.textContent.toLowerCase().includes(q);
        tr.style.display = hit ? "" : "none";
        if (hit) vis++;
      });
      const cnt = $(".table-count", wrap);
      if (cnt) cnt.textContent = vis + " of " + $$("tbody tr", table).length + " rows";
    });
  });

  /* ---------------- lightbox ---------------- */
  const lb = $("#lightbox");
  if (lb) {
    const img = $("#lbImg"), cap = $("#lbCap");
    const openLb = (src, text) => {
      lb.classList.add("open");
      img.src = src; img.alt = text;
      cap.textContent = text;
      document.body.style.overflow = "hidden";
    };
    const closeLb = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    $$("[data-lightbox]").forEach((el) =>
      el.addEventListener("click", () => openLb(el.dataset.lightbox, el.dataset.caption || ""))
    );
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
    $("#lbClose") && $("#lbClose").addEventListener("click", closeLb);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLb(); closeSearch(); } });
  }

  /* ---------------- search overlay ---------------- */
  const so = $("#searchOverlay");
  const soInput = $("#searchInput");
  const soResults = $("#searchResults");
  let searchIndex = [];

  const buildIndex = () => {
    const main = document.querySelector("main") || document.body;
    const seen = new Set();
    $$("h1, h2, h3, p, li, td, figcaption", main).forEach((el) => {
      const text = el.textContent.trim();
      if (!text || text.length < 24 || seen.has(text)) return;
      seen.add(text);
      const heading = el.closest("section") ? ($("h2, h3", el.closest("section")) || {}).textContent : "";
      searchIndex.push({
        title: heading ? heading.trim().slice(0, 70) : "Research content",
        text,
        id: el.id || "",
        tag: el.tagName
      });
    });
  };

  const runSearch = (q) => {
    const query = q.toLowerCase();
    if (!query) { soResults.innerHTML = ""; return; }
    const hits = searchIndex
      .filter((it) => it.text.toLowerCase().includes(query))
      .slice(0, 14);
    if (!hits.length) {
      soResults.innerHTML = '<div class="sr-empty">No matches on this page. Try the full PDF via the download button.</div>';
      return;
    }
    soResults.innerHTML = hits.map((it) => `
      <div class="sr-item" tabindex="0" role="button" data-target="${it.id}">
        <div class="sr-title">${it.tag} · ${escapeHtml(it.title)}</div>
        <div class="sr-text">${escapeHtml(trunc(it.text, 160))}</div>
        <div class="sr-meta">${location.pathname.split("/").pop() || "index.html"}</div>
      </div>`).join("");
    $$(".sr-item", soResults).forEach((el) => {
      const go = () => {
        closeSearch();
        const t = document.getElementById(el.dataset.target);
        if (t) t.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    });
  };
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  const openSearch = () => {
    if (!so) return;
    if (!searchIndex.length) buildIndex();
    so.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => soInput.focus(), 80);
  };
  window.closeSearch = () => {
    if (!so) return;
    so.classList.remove("open");
    document.body.style.overflow = "";
  };
  $$("[data-search-open]").forEach((b) => b.addEventListener("click", openSearch));
  if (soInput) soInput.addEventListener("input", () => runSearch(soInput.value));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); openSearch(); }
  });

  /* ---------------- print / pdf / copy ---------------- */
  $$("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));
  $$("[data-copy]").forEach((b) =>
    b.addEventListener("click", () => {
      const text = b.dataset.copy || "";
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(() => window.UD.toast("Copied to clipboard"));
      } else {
        window.UD.toast("Citation copied");
      }
    })
  );

  /* ---------------- copy DOI / citation on reference page ---------------- */
  $$("[data-copy-doi]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const doi = b.dataset.copyDoi;
      if (navigator.clipboard) navigator.clipboard.writeText(doi).then(() => window.UD.toast("DOI copied"));
      else window.UD.toast(doi);
    })
  );

  /* ---------------- hero intro ---------------- */
  const hero = $("#home-hero");
  if (hero && !reduced) {
    $$(".hero-stagger", hero).forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity .8s ease, transform .8s cubic-bezier(.2,.8,.3,1)";
      el.style.transitionDelay = (0.1 + i * 0.09) + "s";
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$(".hero-stagger", hero).forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
    }));
  }
})();
