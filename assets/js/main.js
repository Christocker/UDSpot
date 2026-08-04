/* ==========================================================================
   UDSpot — single-page interactions
   Theme · header · mobile menu · scroll reveals · counters · nav spy ·
   animated bars · lightbox · and the blind-corner simulator.
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

  /* ---------------- header state + mobile menu ---------------- */
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

  /* ---------------- reveal on scroll ---------------- */
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

  /* ---------------- animated counters ---------------- */
  const fmt = (v, dec) => v.toFixed(dec) + (dec > 0 ? "" : "");
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count || "0");
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const dur = 1500;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = fmt(target * ease(p), dec) + suffix;
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
  ["problem", "how", "try", "proof", "team"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) spy.observe(s);
  });

  /* ---------------- animated bars ---------------- */
  const bars = $(".bars");
  if (bars && "IntersectionObserver" in window) {
    const bo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          $$(".bar-fill", bars).forEach((b) => {
            b.style.width = b.dataset.w || "0%";
          });
          bo.unobserve(bars);
        }
      });
    }, { threshold: 0.4 });
    bo.observe(bars);
  } else if (bars) {
    $$(".bar-fill", bars).forEach((b) => { b.style.width = b.dataset.w || "0%"; });
  }

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

  /* ================= BLIND-CORNER SIMULATOR ================= */
  const slider = $("#distSlider");
  if (slider) {
    const track = $("#track");
    const car = $("#demoCar");
    const readout = $("#distReadout");
    const chips = $$("#sensorChips .s-chip");
    const leds = $$(".led");
    const statusBox = $("#statusBox");
    const statusDot = $("#statusDot");
    const statusTitle = $("#statusTitle");
    const statusText = $("#statusText");
    const sensorNode = $(".sensor-node");

    const D_SLOW = 38;
    const D_STOP = 20;

    const setLed = (idx, cls, blink) => {
      const el = leds[idx];
      el.classList.remove("on-green", "on-amber", "on-red", "blink");
      if (cls) el.classList.add(cls);
      if (blink) el.classList.add("blink");
    };
    const clearLeds = () => leds.forEach((l) => l.classList.remove("on-green", "on-amber", "on-red", "blink"));

    const MODES = {
      clear: {
        track: "mode-clear",
        status: "mode-clear",
        title: "Road clear",
        text: "No vehicle detected in range — proceed as usual.",
        chips: [],
        leds: () => { clearLeds(); setLed(2, "on-green", false); }
      },
      slow: {
        track: "mode-slow",
        status: "mode-slow",
        title: "Vehicle approaching",
        text: "UDS 2 senses a car 20–37 cm from the corner — slow down.",
        chips: [1],
        leds: () => { clearLeds(); setLed(2, "on-amber", true); setLed(3, "on-amber", true); }
      },
      stop: {
        track: "mode-stop",
        status: "mode-stop",
        title: "STOP — corner occupied",
        text: "Sensors 1, 3 and 4 detect the vehicle under 18 cm — give way.",
        chips: [0, 2, 3],
        leds: () => { clearLeds(); setLed(0, "on-red", true); setLed(1, "on-red", true); setLed(4, "on-green", false); }
      }
    };

    let rafId = null;
    const update = (d) => {
      const x = Math.round(((60 - d) / 60) * 92) + 4; /* 4% .. 96% across the track */
      car.style.left = x + "%";
      readout.textContent = d + " cm";

      const mode = d > D_SLOW ? "clear" : d > D_STOP ? "slow" : "stop";
      const m = MODES[mode];

      track.classList.remove("mode-clear", "mode-slow", "mode-stop");
      track.classList.add(m.track);
      statusBox.classList.remove("mode-clear", "mode-slow", "mode-stop");
      statusBox.classList.add(m.status);
      statusTitle.textContent = m.title;
      statusText.textContent = m.text;

      chips.forEach((c, i) => c.classList.toggle("on", m.chips.includes(i)));
      m.leds();

      const on = mode !== "clear";
      sensorNode.classList.toggle("active", on);
      track.setAttribute("aria-label", m.title + " — distance " + d + " cm");
    };

    slider.addEventListener("input", () => {
      const d = parseInt(slider.value, 10);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => update(d));
    });
    update(parseInt(slider.value, 10));
  }
})();
