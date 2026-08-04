/* ==========================================================================
   UDSpot — references page: render, live search, copy citation / DOI
   ========================================================================== */
(function () {
  "use strict";
  const list = document.getElementById("refList");
  const input = document.getElementById("refSearch");
  const count = document.getElementById("refCount");
  const empty = document.getElementById("refEmpty");
  if (!list || !window.UD_REFS) return;

  const stripHtml = (s) => s.replace(/<[^>]+>/g, "");

  function render(query) {
    const q = (query || "").toLowerCase();
    const items = window.UD_REFS.filter((r) => stripHtml(r.text).toLowerCase().includes(q));
    count.textContent = items.length + " of " + window.UD_REFS.length + " references";
    empty.style.display = items.length ? "none" : "block";

    list.innerHTML = items.map((r, i) => `
      <article class="ref-item reveal in">
        <span class="ref-idx">${pad(i + 1)}</span>
        <p>${r.text}</p>
        <div class="ref-actions">
          ${r.doi ? `<button class="icon-btn" data-copy-doi="${r.doi}" title="Copy DOI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>` : ""}
          <button class="icon-btn" data-copy="${stripHtml(r.text)}" title="Copy citation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
        </div>
      </article>`).join("");

    /* rebind light copy buttons created dynamically */
    list.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = b.dataset.copy;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(t).then(() => window.UD && window.UD.toast("Citation copied"));
        } else window.UD && window.UD.toast("Citation copied");
      })
    );
    list.querySelectorAll("[data-copy-doi]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = b.dataset.copyDoi;
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => window.UD && window.UD.toast("DOI copied"));
        else window.UD && window.UD.toast(t);
      })
    );
  }

  const pad = (n) => String(n).padStart(2, "0");
  input.addEventListener("input", () => render(input.value));
  render("");
})();