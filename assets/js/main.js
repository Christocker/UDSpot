/* ==========================================================================
   UDSpot — single-page interactions + interactive lane-occupancy controller
   Theme · header · mobile menu · reveals · counters · nav spy · bars ·
   lightbox · and the user-driven one-lane road controller.
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

  /* ================= INTERACTIVE SIMULATION =================
     A user-driven controller. Two entrance buttons spawn vehicles; a real
     occupancy state machine decides green/red, locks the lane, fires exit
     sensors, flips priority, and logs every decision. No auto-loop. */
  const S = {
    sim: $(".sim"),
    carW: $("#carW"),
    carE: $("#carE"),
    callout: $("#callout"),
    calloutText: $("#calloutText"),
    sensorWEn: $("#sensorWEn"),
    sensorEEn: $("#sensorEEn"),
    sensorWEx: $("#sensorWEx"),
    sensorEEx: $("#sensorEEx"),
    lightW: $("#lightW"),
    lightE: $("#lightE"),
    occPill: $("#occPill"), occText: $("#occText"),
    flowPill: $("#flowPill"), flowArrow: $("#flowArrow"), flowText: $("#flowText"),
    state: $("#stateReadout"),
    chipWIn: $("#chipWIn"), chipEIn: $("#chipEIn"), chipWEx: $("#chipWEx"), chipEEx: $("#chipEEx"),
    wDot: $("#wDot"), eDot: $("#eDot"),
    count: $("#crossCount"),
    log: $("#simLog"),
    tree: $("#decTree"),
    btnWest: $("#btnWest"), btnEast: $("#btnEast"), btnReset: $("#btnReset")
  };

  if (!S.carW) return; /* sim markup missing — skip */

  /* SVG viewBox coordinates (0 0 960 540); the lane centerline is y=280.
     Each crossing is a 5-frame trip: entry, before middle, middle, after
     middle, exit — the exit is the mirror of the entry on the far side. */
  const P = {
    W_HOME:  { x: 80,  y: 280 },  /* west entrance (entry frame) */
    E_HOME:  { x: 880, y: 280 },  /* east entrance (entry frame) */
    W_FRAMES: [
      { x: 80,  y: 280 },  /* 1 entry           */
      { x: 280, y: 280 },  /* 2 before middle   */
      { x: 480, y: 280 },  /* 3 middle          */
      { x: 680, y: 280 },  /* 4 after middle    */
      { x: 880, y: 280 }   /* 5 exit — mirror of entry */
    ],
    E_FRAMES: [
      { x: 880, y: 280 },  /* 1 entry           */
      { x: 680, y: 280 },  /* 2 before middle   */
      { x: 480, y: 280 },  /* 3 middle          */
      { x: 280, y: 280 },  /* 4 after middle    */
      { x: 80,  y: 280 }   /* 5 exit — mirror of entry */
    ]
  };

  const dtNodes = {};
  $$(".dt-node", S.tree).forEach((n) => { dtNodes[n.dataset.node] = n; });
  const dtBranches = $$(".dt-branch", S.tree);

  /* live lane state */
  const lane = {
    direction: null,       /* 'west' | 'east' — who owns the lane right now */
    westWaiting: false,    /* a west car is waiting at the entrance */
    eastWaiting: false,
    busy: false,
    crossings: 0
  };

  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  /* helpers */
  const moveCar = (car, pos, dur) => {
    if (!car) return;
    car.style.transition = "transform " + dur + "ms cubic-bezier(0.25, 0.8, 0.35, 1)";
    car.style.transform = "translate(" + pos.x + "px, " + pos.y + "px)";
  };
  const setCarVisible = (car, on, wait) => {
    if (!car) return;
    car.classList.toggle("on", on);
    car.classList.toggle("wait", !!wait);
  };
  const setSensor = (node, on) => node && node.classList.toggle("active", !!on);
  const setChip = (chip, on) => chip && chip.classList.toggle("on", !!on);
  const setLight = (light, state) => {  /* 'green' | 'red' | null */
    if (!light) return;
    light.classList.toggle("green", state === "green");
    light.classList.toggle("red",   state === "red");
  };
  const setDot = (dot, color) => {      /* 'red' | 'green' | null */
    if (!dot) return;
    dot.classList.remove("red", "green", "on");
    if (color) dot.classList.add(color, "on");
  };
  const setCallout = (text) => {
    if (!S.callout) return;
    S.calloutText.textContent = text;
    S.callout.classList.add("show");
  };
  const hideCallout = () => S.callout && S.callout.classList.remove("show");
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
    [S.sensorWEn, S.sensorEEn, S.sensorWEx, S.sensorEEx].forEach((s) => s && s.classList.remove("active"));
  };
  let t0 = 0;
  const stamp = () => "t+" + (Math.round((performance.now() - t0) / 100) / 10) + "s";
  const log = (msg, kind) => {
    const line = document.createElement("div");
    line.className = "log-line" + (kind ? " " + kind : "");
    line.innerHTML = "<span class='t'>" + stamp() + "</span> " + msg;
    S.log.appendChild(line);
    S.log.scrollTop = S.log.scrollHeight;
  };

  /* drive lights + panel dots to match the current lane state.
     Default (lane free): BOTH lights green. The moment a direction owns
     the lane, the opposite side turns red — the owner stays green. */
  const render = () => {
    const westAllows = lane.direction !== "east";  /* green unless east owns the lane */
    const eastAllows = lane.direction !== "west";
    setLight(S.lightW, westAllows ? "green" : "red");
    setLight(S.lightE, eastAllows ? "green" : "red");
    setDot(S.wDot, westAllows ? "green" : "red");
    setDot(S.eDot, eastAllows ? "green" : "red");
    setOcc(lane.direction !== null);
    setFlow(lane.direction,
      lane.direction === "west" ? "West → East" :
      lane.direction === "east" ? "East → West" : "No flow");
  };

  /* give a waiting vehicle the lane and animate its crossing */
  const launch = (side) => {
    lane.busy = true;
    lane.direction = side;
    const car = side === "west" ? S.carW : S.carE;
    const frames = side === "west" ? P.W_FRAMES : P.E_FRAMES;
    const farSensor = side === "west" ? S.sensorEEx : S.sensorWEx;
    const farChip = side === "west" ? S.chipEEx : S.chipWEx;

    setCarVisible(car, true, false);
    moveCar(car, frames[0], 0);
    render();
    setTree(["detect", "occupied", "no", "green", "opposite"]);
    setCallout("Lane Occupied!");
    setState((side === "west" ? "West" : "East") + " <b>green</b> — vehicle enters · lane <b>OCCUPIED</b>");
    log((side === "west" ? "West" : "East") + " car enters — <b>green</b>, lane <b>OCCUPIED</b>", "ok");

    /* hop through frames 2..5: before middle, middle, after middle, exit */
    const HOP = 620;
    frames.slice(1).forEach((f, i) => {
      later(() => moveCar(car, f, HOP), 60 + i * HOP);
    });

    /* far exit sensor pings as the car arrives at the far entrance (frame 5) */
    later(() => {
      setSensor(farSensor, true);
      setChip(farChip, true);
      setState((side === "west" ? "West" : "East") + " vehicle traveling — the opposite entrance <b>must wait</b>");
      setTree(["occupied", "yes", "red"]);
      log((side === "west" ? "East" : "West") + " exit sensor fires — " + (side === "west" ? "west" : "east") + " car arrived", "warn");
    }, 2050);

    /* crossing ends: free the lane, flip priority if someone is waiting */
    later(() => {
      setSensor(farSensor, false);
      setChip(farChip, false);
      clearAllChips();
      setCarVisible(car, false, false);
      moveCar(car, frames[0], 0);
      lane.busy = false;
      lane.direction = null;
      lane.crossings += 1;
      S.count.textContent = lane.crossings;
      hideCallout();
      log((side === "west" ? "West" : "East") + " car <b>exited</b> — lane available", "ok");

      const other = side === "west" ? "east" : "west";
      const otherWaiting = other === "west" ? lane.westWaiting : lane.eastWaiting;
      if (otherWaiting) {
        setTree(["exit", "free", "opposite"]);
        setCallout("Vice Versa — Priority flips");
        setState("Priority <b>flips</b> — " + other + " now proceeds");
        log("A " + other + " car was waiting — <b>priority flips</b>", "ok");
        later(() => {
          if (other === "west") lane.westWaiting = false; else lane.eastWaiting = false;
          launch(other);
        }, 380);
      } else {
        setTree(["exit", "free"]);
        setState("Lane <b>available</b> — send another car");
        render();
      }
    }, 2700);
  };

  /* a vehicle arrives at an entrance */
  const spawn = (side) => {
    const car = side === "west" ? S.carW : S.carE;
    const entrySensor = side === "west" ? S.sensorWEn : S.sensorEEn;
    const entryChip = side === "west" ? S.chipWIn : S.chipEIn;

    setSensor(entrySensor, true);
    setChip(entryChip, true);
    setCarVisible(car, true, true);
    moveCar(car, side === "west" ? P.W_HOME : P.E_HOME, 0);
    setCallout("Vehicle Detected!");
    setTree(["detect", "occupied"]);
    setState((side === "west" ? "West" : "East") + " vehicle <b>detected</b> at the entrance");

    later(() => {
      setSensor(entrySensor, false);
      setChip(entryChip, false);
    }, 800);

    if (lane.busy) {
      if (side === "west") lane.westWaiting = true; else lane.eastWaiting = true;
      setTree(["detect", "occupied", "yes", "red"]);
      setCallout("Lane Occupied!");
      setState((side === "west" ? "West" : "East") + " car <b>waits</b> — <b>RED</b> until the lane frees");
      log((side === "west" ? "West" : "East") + " arrives while lane occupied — <b>RED</b>, it waits", "warn");
    } else {
      setTree(["detect", "occupied", "no"]);
      log((side === "west" ? "West" : "East") + " arrives — lane <b>free</b>, issuing green", "ok");
      later(() => launch(side), 420);
    }
  };

  /* -------- controls -------- */
  const reset = () => {
    clearTimers();
    lane.direction = null; lane.westWaiting = false; lane.eastWaiting = false;
    lane.busy = false; lane.crossings = 0;
    S.count.textContent = "0";
    setCarVisible(S.carW, false, false); setCarVisible(S.carE, false, false);
    moveCar(S.carW, P.W_HOME, 0); moveCar(S.carE, P.E_HOME, 0);
    clearAllSensors(); clearAllChips();
    setLight(S.lightW, "green"); setLight(S.lightE, "green");
    setDot(S.wDot, "green"); setDot(S.eDot, "green");
    setOcc(false); setFlow(null, "No flow");
    setTree([]); hideCallout();
    setState("System idle — send a car");
    S.log.innerHTML = "";
    t0 = performance.now();
    log("Simulator <b>reset</b>. Send a car from either entrance.");
  };

  function plainSpawn(side) {
    if ((side === "west" && lane.westWaiting) || (side === "east" && lane.eastWaiting)) return;
    spawn(side);
  }

  S.btnWest.addEventListener("click", () => plainSpawn("west"));
  S.btnEast.addEventListener("click", () => plainSpawn("east"));
  S.btnReset.addEventListener("click", reset);

  /* start with a clean slate — no auto-run */
  reset();
})();