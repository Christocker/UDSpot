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
    car: $("#simCar"),
    callout: $("#callout"),
    calloutText: $("#calloutText"),
    sensorWN: $("#sensorWN"),
    sensorWS: $("#sensorWS"),
    sensorEM: $("#sensorEM"),
    sensorEE: $("#sensorEE"),
    lightW: $("#lightW"),
    lightE: $("#lightE"),
    occPill: $("#occPill"), occText: $("#occText"),
    flowPill: $("#flowPill"), flowArrow: $("#flowArrow"), flowText: $("#flowText"),
    state: $("#stateReadout"),
    chipWIn: $("#chipWIn"), chipEIn: $("#chipEIn"), chipWEx: $("#chipWEx"), chipEEx: $("#chipEEx"),
    wDot: $("#wDot"), eDot: $("#eDot"),
    count: $("#crossCount"),
    tree: $("#decTree")
  };

  if (!S.car) return; /* sim markup missing — skip */

  /* car positions in SVG viewBox (0 0 960 540). y=270 is the lane centerline */
  const P = {
    W_STOP:   { x: 110, y: 270 },  /* waiting at stop line, west approach */
    W_ENTRY:  { x: 340, y: 270 },  /* just past the stop line, entering lane */
    W_MID:    { x: 700, y: 270 },  /* mid-lane, near east exit */
    W_GONE:   { x: 940, y: 270 },  /* exited east, off the road */
    E_STOP:   { x: 910, y: 270 },  /* waiting at east entrance */
    E_ENTRY:  { x: 680, y: 270 },  /* just entered from east, moving left */
    E_MID:    { x: 320, y: 270 },  /* mid-lane, near west exit */
    E_GONE:   { x: 20,  y: 270 }   /* exited west, off the road */
  };

  const dtNodes = {};
  $$(".dt-node", S.tree).forEach((n) => { dtNodes[n.dataset.node] = n; });
  const dtBranches = $$(".dt-branch", S.tree);

  let speed = 1;
  let running = false;
  let started = false;
  let timers = [];
  let cycle = 0;               /* 0..7 phase index within loop */
  let crossings = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms / speed));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* helpers */
  const setCar = (pos, dur) => {
    if (!S.car) return;
    S.car.style.transition = "transform " + dur + "ms cubic-bezier(0.2, 0.8, 0.3, 1)";
    S.car.style.transform = "translate(" + pos.x + "px, " + pos.y + "px)";
    S.car.classList.remove("hidden");
  };
  const hideCar = () => S.car && S.car.classList.add("hidden");
  const setSensor = (node, on) => node && node.classList.toggle("active", !!on);
  const setChip = (chip, on) => chip && chip.classList.toggle("on", !!on);
  const setLight = (light, state) => {       /* 'green' | 'red' | null */
    if (!light) return;
    light.classList.toggle("green", state === "green");
    light.classList.toggle("red",   state === "red");
  };
  const setDot = (dot, color) => {           /* 'red' | 'green' | null */
    if (!dot) return;
    dot.classList.remove("red", "green", "on");
    if (color) dot.classList.add(color, "on");
  };
  const setCallout = (text) => {
    S.calloutText.textContent = text;
    S.callout.classList.add("show");
  };
  const hideCallout = () => S.callout.classList.remove("show");
  const setOcc = (busy) => {
    S.occPill.classList.toggle("busy", busy);
    S.occText.textContent = busy ? "Lane occupied" : "Lane available";
  };
  const setFlow = (dir, label) => {
    S.flowArrow.textContent = dir === "west" ? "←" : dir === "east" ? "→" : "·";
    S.flowText.textContent = label;
  };
  const setState = (html) => { S.state.innerHTML = html; };
  const setTree = (names) => {
    Object.keys(dtNodes).forEach((k) => dtNodes[k].classList.toggle("on", names.includes(k)));
    dtBranches.forEach((b) => b.classList.toggle("on", names.includes(b.dataset.node)));
  };
  const clearAllChips = () => {
    [S.chipWIn, S.chipEIn, S.chipWEx, S.chipEEx].forEach((c) => c && c.classList.remove("on"));
  };
  const clearAllSensors = () => {
    [S.sensorWN, S.sensorWS, S.sensorEM, S.sensorEE].forEach((s) => s && s.classList.remove("active"));
  };

  /* 8 phases: 4 west + 4 east, mapping chapter 2 step-by-step */
  const phases = {
    /* 0: WEST DETECT — car at stop line, west entry sensors detect it */
    0: {
      run() {
        setCar(P.W_STOP, 0);
        S.car.classList.add("blink");
        setLight(S.lightW, "red"); setLight(S.lightE, "red");
        setDot(S.wDot, "red"); setDot(S.eDot, "red");
        setSensor(S.sensorWN, true); setSensor(S.sensorWS, true);
        clearAllChips(); setChip(S.chipWIn, true);
        setOcc(false); setFlow(null, "No flow");
        setCallout("Vehicle Detected!");
        setTree(["detect", "occupied"]);
        setState("West vehicle <b>detected</b> at the entrance");
      },
      dur: 1500
    },
    /* 1: WEST GO — west light green, car crosses stop line into the lane */
    1: {
      run() {
        S.car.classList.remove("blink");
        setLight(S.lightW, "green"); setLight(S.lightE, "red");
        setDot(S.wDot, "green"); setDot(S.eDot, "red");
        setSensor(S.sensorWN, false); setSensor(S.sensorWS, false);
        setCallout("Lane Occupied!");
        setTree(["occupied", "no", "green", "opposite"]);
        setOcc(true); setFlow("east", "West → East");
        setState("West <b>green</b> — vehicle enters · lane <b>OCCUPIED</b>");
        setCar(P.W_ENTRY, 1400);
      },
      dur: 1500
    },
    /* 2: WEST TRAVEL — car in lane, mid sensor detects it */
    2: {
      run() {
        setLight(S.lightW, "green"); setLight(S.lightE, "red");
        setSensor(S.sensorEM, true);
        clearAllChips(); setChip(S.chipEEx, true);
        setCallout("Lane Occupied!");
        setTree(["occupied", "yes", "red"]);
        setState("West vehicle traveling — <b>east must wait</b>");
        setCar(P.W_MID, 2200);
      },
      dur: 2400
    },
    /* 3: WEST EXIT + FLIP — car exits east, exit sensor fires, lights flip */
    3: {
      run() {
        setSensor(S.sensorEM, false);
        setSensor(S.sensorEE, true);
        clearAllChips(); setChip(S.chipEEx, false); setChip(S.chipEIn, true);
        setCallout("Car(s) must exit first");
        setState("West vehicle approaching the east exit");
        setCar(P.W_GONE, 900);
        /* mid-exit: switch callout to "Vice Versa" and flip the lights */
        later(() => {
          crossings += 1;
          S.count.textContent = crossings;
          setCallout("Vice Versa — Priority flips");
          setLight(S.lightW, "red"); setLight(S.lightE, "green");
          setDot(S.wDot, "red"); setDot(S.eDot, "green");
          setOcc(false); setFlow(null, "No flow");
          setTree(["free", "opposite"]);
          setState("West <b>exited</b> — priority flips to east");
        }, 700);
        /* clear exit sensor, prepare for east cycle */
        later(() => {
          setSensor(S.sensorEE, false);
          setChip(S.chipEIn, false);
          hideCallout();
        }, 1200);
      },
      dur: 1400
    },
    /* 4: EAST DETECT — car at east entrance, east entry sensor detects it */
    4: {
      run() {
        setCar(P.E_STOP, 0);
        S.car.classList.add("blink");
        setLight(S.lightW, "red"); setLight(S.lightE, "green");
        setDot(S.wDot, "red"); setDot(S.eDot, "green");
        setSensor(S.sensorEE, true);
        clearAllChips(); setChip(S.chipEIn, true);
        setCallout("Vehicle Detected!");
        setTree(["detect", "occupied"]);
        setState("East vehicle <b>detected</b> at the entrance");
      },
      dur: 1500
    },
    /* 5: EAST GO — east light green, car enters lane from the east */
    5: {
      run() {
        S.car.classList.remove("blink");
        setLight(S.lightW, "red"); setLight(S.lightE, "green");
        setSensor(S.sensorEE, false);
        setCallout("Lane Occupied!");
        setTree(["occupied", "no", "green", "opposite"]);
        setOcc(true); setFlow("west", "East → West");
        setState("East <b>green</b> — vehicle enters · lane <b>OCCUPIED</b>");
        setCar(P.E_ENTRY, 1400);
      },
      dur: 1500
    },
    /* 6: EAST TRAVEL — car in lane moving west, mid sensor detects it */
    6: {
      run() {
        setLight(S.lightW, "red"); setLight(S.lightE, "green");
        setSensor(S.sensorEM, true);
        clearAllChips(); setChip(S.chipWEx, true);
        setCallout("Lane Occupied!");
        setTree(["occupied", "yes", "red"]);
        setState("East vehicle traveling — <b>west must wait</b>");
        setCar(P.E_MID, 2200);
      },
      dur: 2400
    },
    /* 7: EAST EXIT + FLIP — car exits west, west entry sensors fire, lights flip back */
    7: {
      run() {
        setSensor(S.sensorEM, false);
        setSensor(S.sensorWN, true); setSensor(S.sensorWS, true);
        clearAllChips(); setChip(S.chipWIn, true);
        setCallout("Car(s) must exit first");
        setState("East vehicle approaching the west exit");
        setCar(P.E_GONE, 900);
        later(() => {
          crossings += 1;
          S.count.textContent = crossings;
          setCallout("Vice Versa — Priority flips");
          setLight(S.lightW, "green"); setLight(S.lightE, "red");
          setDot(S.wDot, "green"); setDot(S.eDot, "red");
          setOcc(false); setFlow(null, "No flow");
          setTree(["free", "opposite"]);
          setState("East <b>exited</b> — priority flips to west");
        }, 700);
        later(() => {
          setSensor(S.sensorWN, false); setSensor(S.sensorWS, false);
          setChip(S.chipWIn, false);
          hideCallout();
        }, 1200);
      },
      dur: 1400
    }
  };

  const initial = () => {
    S.panel.classList.add("paused");
    /* car at west stop line, no transition (snap) */
    S.car.style.transition = "none";
    S.car.classList.remove("hidden");
    S.car.classList.add("blink");
    S.car.style.transform = "translate(" + P.W_STOP.x + "px, " + P.W_STOP.y + "px)";
    /* lights: both red, dots red */
    setLight(S.lightW, "red"); setLight(S.lightE, "red");
    setDot(S.wDot, "red"); setDot(S.eDot, "red");
    /* sensors: west entry active, others off */
    setSensor(S.sensorWN, true); setSensor(S.sensorWS, true);
    setSensor(S.sensorEM, false); setSensor(S.sensorEE, false);
    /* chips: west entry on */
    clearAllChips(); setChip(S.chipWIn, true);
    setOcc(false); setFlow(null, "No flow");
    setTree([]);
    setState("West vehicle <b>waiting</b> — press play");
    hideCallout();
    /* show the callout in initial state too */
    setCallout("Vehicle Detected!");
    $("#btnPlayTxt").textContent = "Play";
    $("#btnPlay").setAttribute("aria-label", "Play simulation");
  };
  /* run initial after a tick so the callout transition is visible */
  initial();

  const runPhase = (i) => {
    phases[i].run();
    later(() => {
      cycle = (i + 1) % 8;
      if (running) runPhase(cycle);
    }, phases[i].dur);
  };

  const start = () => {
    if (running) return;
    running = true;
    started = true;
    S.car.classList.remove("blink");
    S.car.style.transition = "";
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

  const restartPhase = () => {
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
          so.unobserve(S.sim);
        }
      });
    }, { threshold: 0.4 });
    so.observe(S.sim);
  }
})();
