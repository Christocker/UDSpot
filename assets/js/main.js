/* ==========================================================================
   UDSpot — single-page interactions + live lane-occupancy simulation
   Theme · header · mobile menu · reveals · counters · nav spy · bars ·
   lightbox · and the coordinating state machine for the one-lane road.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const stored = localStorage.getItem("udspot-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", stored || (prefersDark ? "dark" : "light"));

  themeToggle && themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("udspot-theme", next);
  });

  /* ---------------- header + mobile menu ---------------- */
  const header = $("#siteHeader");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const menuToggle = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  const setMenu = (open) => {
    mobileMenu.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuToggle && menuToggle.addEventListener("click", () => setMenu(!mobileMenu.classList.contains("open")));
  $$("#mobileMenu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------------- reveals ---------------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => ro.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------------- counters ---------------- */
  const fmt = (v, dec) => (dec > 0 ? v.toFixed(dec) : String(Math.round(v)));
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count || "0");
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const dur = 1500;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)), dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          co.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => co.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = fmt(parseFloat(el.dataset.count || "0"), parseInt(el.dataset.decimals || "0", 10)) + (el.dataset.suffix || "");
    });
  }

  /* ---------------- nav spy ---------------- */
  const navLinks = $$(".nav-links a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["challenge", "how", "demo", "system", "proof", "team"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) spy.observe(s);
  });

  /* ---------------- animated bars ---------------- */
  const bars = $(".bars");
  const fillBars = () => $$(".bar-fill", bars).forEach((b) => { b.style.width = b.dataset.w || "0%"; });
  if (bars && "IntersectionObserver" in window) {
    const bo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { fillBars(); bo.unobserve(bars); }
      });
    }, { threshold: 0.4 });
    bo.observe(bars);
  } else if (bars) fillBars();

  /* ---------------- lightbox ---------------- */
  const lb = $("#lightbox");
  const lbImg = $("#lbImage");
  const lbCap = $("#lbCaption");
  const openLb = (img) => {
    lbImg.src = img.src;
    lbImg.alt = img.alt || "";
    lbCap.textContent = img.dataset.lb || img.alt || "";
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeLb = () => {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  $$("[data-lb]").forEach((img) => img.addEventListener("click", () => openLb(img)));
  $("[data-lb-close]") && $("[data-lb-close]").addEventListener("click", closeLb);
  lb && lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  /* ================= LIVE SIMULATION ================= */
  const S = {
    sim: $(".sim"),
    panel: $(".sim-panel"),
    lane: $("#simLane"),
    flow: $("#laneFlow"),
    occ: $("#laneOcc"),
    lightW: $("#lightW"), lightE: $("#lightE"),
    sensorW: $("#sensorW"), sensorE: $("#sensorE"),
    carW: $("#carW"), carE: $("#carE"),
    occPill: $("#occPill"), occText: $("#occText"),
    flowPill: $("#flowPill"), flowArrow: $("#flowArrow"), flowText: $("#flowText"),
    state: $("#stateReadout"),
    chipWIn: $("#chipWIn"), chipEIn: $("#chipEIn"), chipWEx: $("#chipWEx"), chipEEx: $("#chipEEx"),
    wDot: $("#wDot"), eDot: $("#eDot"),
    count: $("#crossCount"),
    tree: $("#decTree")
  };

  if (!S.lane || !S.carW) return; /* sim markup missing — skip */

  /* car positions (percent of stage width) */
  const POS = {
    W_OUT: -10, W_GATE: 5, W_LANE: 20, W_END: 84, W_GONE: 110,
    E_OUT: 106, E_GATE: 88, E_LANE: 74, E_END: 16, E_GONE: -10
  };

  const dtNodes = {};          /* data-node -> element */
  $$(".dt-node", S.tree).forEach((n) => { dtNodes[n.dataset.node] = n; });
  const dtBranches = $$(".dt-branch", S.tree);

  let speed = 1;
  let running = false;
  let started = false;
  let timers = [];
  let cycle = 0;               /* 0..5 phase index within loop */
  let crossings = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms / speed));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const setLamp = (light, which, on) => {
    const l = $(which, light);
    if (l) l.classList.toggle("on", on);
  };
  const setLight = (light, state) => {           /* state: 'green' | 'red' */
    setLamp(light, ".l-green", state === "green");
    setLamp(light, ".l-red", state === "red");
    setLamp(light, ".l-amber", false);
  };
  const setSensor = (node, on) => node.classList.toggle("active", on);
  const setChip = (chip, on) => chip.classList.toggle("on", on);

  const moveCar = (car, pct, dur, extra) => {
    car.style.transition = "left " + dur + "ms " + (extra || "cubic-bezier(0.4, 0, 0.5, 1)");
    car.style.left = pct + "%";
    car.classList.remove("hidden");
  };
  const hideCar = (car) => { car.classList.add("hidden"); };

  const setOcc = (busy) => {
    S.lane.classList.toggle("busy", busy);
    S.occPill.classList.toggle("busy", busy);
    S.occText.textContent = busy ? "Lane occupied" : "Lane available";
  };
  const setFlow = (dir, label) => {               /* dir: null | 'east' | 'west' */
    const on = !!dir;
    S.flow.classList.toggle("on", on);
    S.flow.classList.toggle("west", dir === "west");
    S.flowArrow.textContent = dir === "west" ? "←" : dir === "east" ? "→" : "·";
    S.flowText.textContent = label;
  };
  const setState = (html) => { S.state.innerHTML = html; };
  const setTree = (names) => {
    Object.keys(dtNodes).forEach((k) => dtNodes[k].classList.toggle("on", names.includes(k)));
    dtBranches.forEach((b) => b.classList.toggle("on", names.includes(b.dataset.node)));
  };

  const phases = {
    0: { /* westGo — green west, enter */
      run() {
        setLight(S.lightW, "green"); setLight(S.lightE, "red");
        S.wDot.classList.add("red", "on"); S.wDot.classList.remove("green");
        S.eDot.classList.add("red", "on"); S.eDot.classList.remove("green");
        setSensor(S.sensorW, true); setSensor(S.sensorE, false);
        setChip(S.chipWIn, true); setChip(S.chipEIn, false);
        setOcc(true); setFlow("east", "West → East");
        setTree(["occupied", "no", "green", "opposite"]);
        setState("West <b>green</b> — vehicle enters · lane <b>OCCUPIED</b>");
        moveCar(S.carW, POS.W_LANE, 950);
        later(() => { setSensor(S.sensorW, false); setChip(S.chipWIn, false); }, 900);
      },
      dur: 1000
    },
    1: { /* westTravel — crossing, east waits */
      run() {
        setLight(S.lightW, "red"); setLight(S.lightE, "red");
        setTree(["occupied", "yes", "red"]);
        setState("West crossing — <b>east vehicle must wait</b>");
        moveCar(S.carW, POS.W_END, 2400);
        later(() => {
          S.carE.classList.add("blink");
          moveCar(S.carE, POS.E_GATE, 900);
          setSensor(S.sensorE, true); setChip(S.chipEIn, true);
          setState("West crossing — <b>east vehicle waiting at red</b>");
        }, 1100);
      },
      dur: 2600
    },
    2: { /* westExit — lane clears, east gets green next */
      run() {
        crossings += 1;
        S.count.textContent = crossings;
        setSensor(S.sensorE, true); setChip(S.chipEEx, true);
        setTree(["exit"]);
        setState("West exited — <b>exit sensor confirms lane clear</b>");
        moveCar(S.carW, POS.W_GONE, 550);
        S.carW.style.transition = "left 550ms ease";
        later(() => { setOcc(false); setFlow(null, "No flow"); setTree(["free"]); }, 650);
        later(() => {
          setSensor(S.sensorE, false); setChip(S.chipEEx, false);
          S.carW.classList.remove("blink");
        }, 900);
      },
      dur: 1000
    },
    3: { /* eastGo — green east, enter */
      run() {
        setLight(S.lightE, "green"); setLight(S.lightW, "red");
        S.eDot.classList.add("green", "on"); S.eDot.classList.remove("red");
        S.wDot.classList.add("red", "on"); S.wDot.classList.remove("green");
        setSensor(S.sensorE, true); setSensor(S.sensorW, false);
        setChip(S.chipEIn, true); setChip(S.chipWIn, false);
        setOcc(true); setFlow("west", "East → West");
        setTree(["occupied", "no", "green", "opposite"]);
        setState("East <b>green</b> — vehicle enters · lane <b>OCCUPIED</b>");
        S.carE.classList.remove("blink");
        moveCar(S.carE, POS.E_LANE, 950);
        later(() => { setSensor(S.sensorE, false); setChip(S.chipEIn, false); }, 900);
      },
      dur: 1000
    },
    4: { /* eastTravel — crossing, west waits */
      run() {
        setLight(S.lightW, "red"); setLight(S.lightE, "red");
        setTree(["occupied", "yes", "red"]);
        setState("East crossing — <b>west vehicle must wait</b>");
        moveCar(S.carE, POS.E_END, 2400);
        later(() => {
          S.carW.classList.add("blink");
          moveCar(S.carW, POS.W_GATE, 900);
          setSensor(S.sensorW, true); setChip(S.chipWIn, true);
          setState("East crossing — <b>west vehicle waiting at red</b>");
        }, 1100);
      },
      dur: 2600
    },
    5: { /* eastExit — lane clears again */
      run() {
        crossings += 1;
        S.count.textContent = crossings;
        setSensor(S.sensorW, true); setChip(S.chipWEx, true);
        setTree(["exit"]);
        setState("East exited — <b>exit sensor confirms lane clear</b>");
        moveCar(S.carE, POS.E_GONE, 550);
        later(() => { setOcc(false); setFlow(null, "No flow"); setTree(["free"]); }, 650);
        later(() => {
          setSensor(S.sensorW, false); setChip(S.chipWEx, false);
          S.carE.classList.remove("blink");
        }, 900);
      },
      dur: 1000
    }
  };

  const initial = () => {
    S.panel.classList.add("paused");
    hideCar(S.carE);
    S.carW.classList.remove("hidden", "blink");
    S.carW.style.transition = "none";
    S.carW.style.left = POS.W_GATE + "%";
    S.carW.classList.add("blink");
    setLight(S.lightW, "red"); setLight(S.lightE, "red");
    S.wDot.classList.add("red", "on"); S.eDot.classList.add("red", "on");
    setSensor(S.sensorW, true); setSensor(S.sensorE, false);
    setChip(S.chipWIn, true); setChip(S.chipEIn, false); setChip(S.chipWEx, false); setChip(S.chipEEx, false);
    setOcc(false); setFlow(null, "No flow");
    setTree([]);
    setState("West vehicle <b>waiting</b> — press play");
    $("#btnPlayTxt").textContent = "Play";
    $("#btnPlay").setAttribute("aria-label", "Play simulation");
  };
  initial();

  const runPhase = (i) => {
    phases[i].run();
    later(() => {
      cycle = (i + 1) % 6;
      if (running) runPhase(cycle);
    }, phases[i].dur);
  };

  const start = () => {
    if (running) return;
    running = true;
    started = true;
    S.carW.style.transition = "";
    S.panel.classList.remove("paused");
    $("#btnPlayTxt").textContent = "Pause";
    $("#btnPlay").setAttribute("aria-label", "Pause simulation");
    runPhase(cycle);
  };

  const pause = () => {
    running = false;
    clearTimers();
    S.panel.classList.add("paused");
    $("#btnPlayTxt").textContent = "Play";
    $("#btnPlay").setAttribute("aria-label", "Play simulation");
  };

  const restartPhase = () => {           /* used on speed change */
    if (!running) return;
    clearTimers();
    runPhase(cycle);
  };

  $("#btnPlay").addEventListener("click", () => (running ? pause() : start()));
  $("#speedSel").addEventListener("change", (e) => {
    speed = parseFloat(e.target.value);
    restartPhase();
  });

  /* auto-start the simulation when it scrolls into view */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) {
          start();
          so.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    so.observe(S.sim);
  }
})();
