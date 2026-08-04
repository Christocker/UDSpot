/* ==========================================================================
   UDSpot — results visualizations (Chart.js with static fallback)
   Every value is taken directly from Tables 1–7 of the research paper.
   ========================================================================== */
(function () {
  "use strict";

  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  const cssVar = (n) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || "#2563eb";
  };

  function palette() {
    return {
      primary: cssVar("--primary"),
      accent: cssVar("--accent"),
      green: cssVar("--green"),
      red: cssVar("--red"),
      muted: cssVar("--muted-2"),
      text: cssVar("--text"),
      line: cssVar("--line")
    };
  }

  const charts = [];
  const registered = [];

  function register(cfg) {
    registered.push(cfg);
    if (window.Chart) draw(cfg);
  }

  function draw(cfg) {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    const p = palette();
    const common = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: "easeOutQuart" },
      plugins: { legend: { labels: { color: p.text, font: { family: "Inter", size: 12 } } } }
    };
    const chart = new window.Chart(el, { ...cfg.options, ...common });
    charts.push(chart);
  }

  /* ---- Chart 1: UDS detection trials per sensor (Table 1) ---- */
  register({
    id: "chartDetection",
    options: {
      type: "bar",
      data: {
        labels: ["UDS 1", "UDS 2", "UDS 3", "UDS 4"],
        datasets: [{
          label: "Successful detection trials (of 3)",
          data: [3, 3, 3, 3],
          backgroundColor: cssVar("--primary"),
          borderRadius: 8,
          barPercentage: 0.55
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 3, ticks: { stepSize: 1, color: cssVar("--muted-2") }, grid: { color: cssVar("--line") } },
          x: { ticks: { color: cssVar("--text") }, grid: { display: false } }
        }
      }
    }
  });

  /* ---- Chart 2: LED output correctness (Table 2) ---- */
  register({
    id: "chartLeds",
    options: {
      type: "bar",
      data: {
        labels: ["UDS 1 → LED 3/4", "UDS 2 → LED 3/4", "UDS 3 (1st)", "UDS 4 (1st)", "UDS 3 (2nd)", "UDS 4 (2nd)"],
        datasets: [{
          label: "Correct trials (of 3)",
          data: [3, 3, 3, 3, 3, 3],
          backgroundColor: cssVar("--green"),
          borderRadius: 8,
          barPercentage: 0.5
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 3, ticks: { stepSize: 1, color: cssVar("--muted-2") }, grid: { color: cssVar("--line") } },
          x: { ticks: { color: cssVar("--text"), maxRotation: 32 }, grid: { display: false } }
        }
      }
    }
  });

  /* ---- Chart 3: Standoff avoidance, with vs without (Tables 5–7) ---- */
  register({
    id: "chartStandoff",
    options: {
      type: "bar",
      data: {
        labels: ["Scenario 1", "Scenario 2", "Scenario 3", "Scenario 4", "Scenario 5", "Scenario 6"],
        datasets: [
          { label: "Without UDSpot (avoided)", data: [1, 0, 1, 0, 0, 0], backgroundColor: cssVar("--red"), borderRadius: 8, barPercentage: 0.62 },
          { label: "With UDSpot (avoided)", data: [1, 1, 1, 1, 1, 1], backgroundColor: cssVar("--green"), borderRadius: 8, barPercentage: 0.62 }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 1, ticks: { stepSize: 1, color: cssVar("--muted-2") }, grid: { color: cssVar("--line") } },
          x: { ticks: { color: cssVar("--text") }, grid: { display: false } }
        }
      }
    }
  });

  /* ---- Chart 4: overall standoff rate doughnut ---- */
  register({
    id: "chartOverall",
    options: {
      type: "doughnut",
      data: {
        labels: ["Avoided (6/6)", "Remaining"],
        datasets: [{
          data: [6, 0],
          backgroundColor: [cssVar("--green"), cssVar("--line")],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        cutout: "68%",
        plugins: {
          legend: { position: "bottom" }
        }
      }
    }
  });

  /* ---- static CSV-faithful pixel fallback when Chart.js is unavailable ---- */
  function enableFallbacks() {
    $$(".chart-fallback").forEach((fb) => {
      const box = fb.parentElement.querySelector(".chart-box");
      if (box) box.style.display = "none";
      fb.style.display = "block";
    });
    $$(".b-fill").forEach((b) => {
      const w = (parseFloat(b.dataset.w) || 0);
      b.style.width = w + "%";
    });
  }

  /* redraw with theme colors on toggle */
  function refreshCharts() {
    charts.forEach((c) => {
      const p = palette();
      Object.values(c.options.scales || {}).forEach((s) => {
        if (s.ticks) s.ticks.color = p["muted-2"];
        if (s.grid) s.grid.color = p.line;
      });
      if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) {
        c.options.plugins.legend.labels.color = p.text;
      }
      if (c.config && c.config.type === "doughnut") {
        c.data.datasets[0].backgroundColor = [p.green, p.line];
      }
      c.update();
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) setTimeout(refreshCharts, 60);
  });

  /* if Chart.js never arrives, swap in the static bars */
  setTimeout(() => {
    if (!window.Chart) enableFallbacks();
  }, 1200);

  window.UD = window.UD || {};
  window.UD.drawCharts = () => { if (window.Chart) registered.forEach((c) => draw(c)); };
})();
