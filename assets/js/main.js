/* ==========================================================================
   UDSpot — single-page interactions + interactive lane-occupancy controller
   Theme · header · mobile menu · reveals · nav spy · bars ·
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
  const fillBars = (instant) => $$(".bar-fill", bars).forEach((b) => {
    const w = b.dataset.w || (b.style.width || "0%");
    if (instant) b.style.transition = "none";
    b.style.width = w;
    if (instant) { void b.offsetWidth; b.style.transition = ""; }
  });
  if (bars) {
    if ("IntersectionObserver" in window) {
      const bo = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { fillBars(); bo.disconnect(); }
        });
      }, { threshold: 0.1 });
      bo.observe(bars);
    } else fillBars(true);
  }

  /* ---------------- lightbox / gallery ----------------
     Sliding-track viewer (same system as the OneByte site): every image in the
     group sits side by side on one track and the whole track translates, so you
     drag/swipe to travel, click anywhere to jump, double-click or scroll to zoom
     (1-3x), and drag to pan while zoomed. Closes with a fade. */
  const lb = $("#lightbox");
  const lbContainer = $("#lbContainer");
  const lbTrack = $("#lbTrack");
  const lbCount = $("#lbCount");
  const lbPrev = $("#lbPrev");
  const lbNext = $("#lbNext");
  const lbClose = $("[data-lb-close]");
  const lbZoomOut = $("#lbZoomOut");
  const lbZoomIn = $("#lbZoomIn");
  const lbZoomPct = $("#lbZoomPct");

  /* Every <img data-gallery="name"> belongs to the same slide group (DOM order);
     lone images open as a single-item track. */
  const lbGroups = new Map();
  $$("[data-gallery]").forEach((img) => {
    const g = img.dataset.gallery;
    if (!lbGroups.has(g)) lbGroups.set(g, []);
    lbGroups.get(g).push(img);
  });

  let slides = [];            /* <div.lb-slide> elements on the track   */
  let index = 0;              /* current slide index                    */
  let dragX = 0;              /* live drag offset (px)                  */
  let isDragging = false;
  let suppress = true;        /* true = no transition (initial mount)   */
  let transDur = 600;
  let step = 0;               /* distance between two slide lefts       */
  let baseOffset = 0;         /* centering offset of the first slide    */
  let zoom = 1;               /* 1..3                                   */
  let panX = 0, panY = 0;     /* pan while zoomed                       */

  /* mutable refs so drag handlers always read current values */
  const zoomRef = { v: 1 };
  const panRef = { x: 0, y: 0 };
  const indexRef = { v: 0 };
  const movedRef = { v: false };
  let drag = null;            /* active pointer-drag state              */

  const buildSlides = (imgs) => {
    lbTrack.innerHTML = "";
    const frag = document.createDocumentFragment();
    imgs.forEach((img) => {
      const slide = document.createElement("div");
      slide.className = "lb-slide";
      const box = document.createElement("div");
      box.className = "lb-zoombox";
      const el = document.createElement("img");
      el.src = img.src;
      el.alt = img.alt || "";
      el.draggable = false;
      box.appendChild(el);
      slide.appendChild(box);
      frag.appendChild(slide);
    });
    lbTrack.appendChild(frag);
    slides = Array.from(lbTrack.children);
  };

  const measure = () => {
    if (!lbContainer || lbTrack.children.length === 0) return;
    const s0 = lbTrack.children[0];
    const s1 = lbTrack.children[1];
    step = s1 ? s1.offsetLeft - s0.offsetLeft : s0.offsetWidth;
    baseOffset = Math.max(0, (lbContainer.clientWidth - s0.offsetWidth) / 2);
  };

  const renderLb = () => {
    const tx = baseOffset - index * step + dragX;
    lbTrack.style.transform = `translate3d(${tx}px, 0, 0)`;
    lbTrack.style.transition = suppress || isDragging
      ? "none"
      : `transform ${transDur}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    lbContainer.classList.toggle("dragging", isDragging);
    lbContainer.classList.toggle("zoomed", zoom > 1);
    slides.forEach((s, i) => {
      const box = s.querySelector(".lb-zoombox");
      box.style.transform = i === index
        ? `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`
        : "translate3d(0, 0, 0) scale(1)";
      s.style.opacity = i === index ? "1" : "0.4";
    });
    lbCount.textContent = `${index + 1} / ${slides.length}`;
    lbZoomPct.textContent = `${Math.round(zoom * 100)}%`;
  };

  const panBounds = () => {
    const c = lbContainer.getBoundingClientRect();
    const b = slides[index].querySelector("img").getBoundingClientRect();
    return {
      x: Math.max(0, (b.width - c.width) / 2),
      y: Math.max(0, (b.height - c.height) / 2),
    };
  };
  const clampPan = (x, y) => {
    const b = panBounds();
    return { x: Math.max(-b.x, Math.min(b.x, x)), y: Math.max(-b.y, Math.min(b.y, y)) };
  };

  const applyZoom = (next) => {
    const clamped = Math.min(3, Math.max(1, next));
    zoom = clamped; zoomRef.v = clamped;
    if (clamped === 1) {
      panX = 0; panY = 0; panRef.x = 0; panRef.y = 0;
    } else {
      const c = clampPan(panRef.x, panRef.y);
      panX = c.x; panY = c.y; panRef.x = c.x; panRef.y = c.y;
    }
    renderLb();
  };
  const toggleZoom = () => { zoom > 1 ? applyZoom(1) : applyZoom(2.5); };

  const goTo = (i) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    indexRef.v = index;
    dragX = 0;
    transDur = 650;
    renderLb();
  };

  const lbOpen = (img) => {
    const g = img.dataset.gallery;
    const items = g && lbGroups.has(g) ? lbGroups.get(g) : [img];
    buildSlides(items);
    index = items.indexOf(img); indexRef.v = index;
    dragX = 0; zoom = 1; panX = 0; panY = 0;
    zoomRef.v = 1; panRef.x = 0; panRef.y = 0;
    suppress = true;
    lb.classList.add("open");
    lb.classList.remove("closing");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      measure();
      suppress = false;
      renderLb();
    });
  };

  const closeLightbox = () => {
    if (!lb.classList.contains("open") || lb.classList.contains("closing")) return;
    lb.classList.add("closing");
    document.body.style.overflow = "";
    window.setTimeout(() => {
      lb.classList.remove("open", "closing");
      lb.setAttribute("aria-hidden", "true");
      lbTrack.innerHTML = "";
      slides = [];
    }, 250);
  };

  if (lb) {
    lbClose.addEventListener("click", closeLightbox);
    lbPrev.addEventListener("click", (e) => { e.stopPropagation(); goTo(index - 1); });
    lbNext.addEventListener("click", (e) => { e.stopPropagation(); goTo(index + 1); });
    lbZoomOut.addEventListener("click", (e) => { e.stopPropagation(); applyZoom(zoom - 0.5); });
    lbZoomIn.addEventListener("click", (e) => { e.stopPropagation(); applyZoom(zoom + 0.5); });
    lbZoomPct.addEventListener("click", (e) => { e.stopPropagation(); toggleZoom(); });

    /* pointer drag: slide the track, or pan when zoomed */
    lbContainer.addEventListener("pointerdown", (e) => {
      try { lbContainer.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      drag = {
        x: e.clientX, y: e.clientY,
        dragX0: dragX,
        panX0: panRef.x, panY0: panRef.y,
        mode: zoom > 1 ? "zoom" : "slide",
        samples: [],
      };
      movedRef.v = false;
      isDragging = true;
      renderLb();
    });
    lbContainer.addEventListener("pointermove", (e) => {
      const d = drag;
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (d.mode === "zoom") {
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.v = true;
        const next = clampPan(d.panX0 + dx, d.panY0 + dy);
        panX = next.x; panY = next.y; panRef.x = next.x; panRef.y = next.y;
        renderLb();
        return;
      }
      if (Math.abs(dx) > 6) movedRef.v = true;
      let next = d.dragX0 + dx;
      if (index === 0 && next > 0) next *= 0.35;
      else if (index === slides.length - 1 && next < 0) next *= 0.35;
      dragX = next;
      d.samples.push({ x: e.clientX, t: performance.now() });
      if (d.samples.length > 4) d.samples.shift();
      renderLb();
    });
    const endDrag = () => {
      const d = drag;
      if (!d) return;
      drag = null;
      isDragging = false;
      if (d.mode === "zoom") { renderLb(); return; }
      const n = d.samples.length;
      const v = n >= 2
        ? (d.samples[n - 1].x - d.samples[n - 2].x) / (d.samples[n - 1].t - d.samples[n - 2].t)
        : 0;
      let target = index;
      if (Math.abs(dragX) > step * 0.25) target = index + (dragX > 0 ? -1 : 1);
      else if (Math.abs(v) > 0.45) target = index + (v > 0 ? -1 : 1);
      target = Math.max(0, Math.min(slides.length - 1, target));
      transDur = Math.min(850, Math.max(520, 520 + Math.abs(target - index) * 140));
      index = target; indexRef.v = target;
      dragX = 0;
      renderLb();
    };
    lbContainer.addEventListener("pointerup", endDrag);
    lbContainer.addEventListener("pointercancel", endDrag);

    /* click a spot on the track to jump there; double-click toggles zoom */
    lbContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      if (movedRef.v || zoom > 1 || e.detail > 1) return;
      const rect = lbContainer.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const jump = Math.round(relX / step);
      if (jump !== 0) goTo(index + jump);
    });
    lbContainer.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      toggleZoom();
    });

    lbContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open") || lb.classList.contains("closing")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    });

    /* keep centering/step correct when the viewport resizes */
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        if (lb.classList.contains("open")) { measure(); renderLb(); }
      }).observe(lbContainer);
    }
  }

  $$("[data-lb]").forEach((img) => img.addEventListener("click", () => lbOpen(img)));

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
    S.flowArrow.textContent = dir ? "→" : "·";
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
