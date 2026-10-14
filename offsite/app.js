/* =========================================================================
   The Barcelona Offsite Configurator + landing page — app.js
   Two independent pieces:
   1. Shared site chrome (header scroll state, mobile nav toggle) — this is
      the same behavior as the live www.kuma.partners site.js, reproduced
      here rather than linked cross-origin.
   2. The configurator: step data, state, blueprint compilation, and the
      Netlify Forms submission for the lead capture step.
   ========================================================================= */

/* Optional fallback endpoint for the lead capture form. Leave this empty to
   keep posting to "/" for Netlify Forms' own build-time form detection,
   which is what this site currently deploys on. Set it to a form-accepting
   URL (Formspree, Make.com, Zapier, or similar) if this ever moves to a
   host without native form handling, such as GitHub Pages or Vercel; the
   submit handler below posts the same urlencoded body to whichever
   endpoint is active, so no other code needs to change. */
const FORM_WEBHOOK_URL = "";

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* -----------------------------------------------------------------------
     SHARED SITE CHROME (mirrors www.kuma.partners site.js)
     ----------------------------------------------------------------------- */
  const siteHeader = document.querySelector("header.site");
  if (siteHeader) {
    function updateHeaderScrollState() {
      siteHeader.classList.toggle("scrolled", window.scrollY > 8);
    }
    updateHeaderScrollState();
    window.addEventListener("scroll", updateHeaderScrollState, { passive: true });

    const navToggle = siteHeader.querySelector(".nav-toggle");
    const iconMenu = siteHeader.querySelector(".nav-toggle .icon-menu");
    const iconClose = siteHeader.querySelector(".nav-toggle .icon-close");

    function setSvgHidden(el, isHidden) {
      if (!el) return;
      if (isHidden) el.setAttribute("hidden", "");
      else el.removeAttribute("hidden");
    }

    if (navToggle) {
      navToggle.addEventListener("click", function () {
        const isOpen = siteHeader.classList.toggle("nav-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        setSvgHidden(iconMenu, isOpen);
        setSvgHidden(iconClose, !isOpen);
      });
    }

    // Close the mobile menu after a nav link is followed
    siteHeader.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        siteHeader.classList.remove("nav-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        setSvgHidden(iconMenu, false);
        setSvgHidden(iconClose, true);
      });
    });
  }

  /* -----------------------------------------------------------------------
     FAQ ACCORDION (#faq): the real stylesheet's .faq-item/.faq-question/
     .faq-answer classes drive a JS-toggled "open" state rather than native
     <details>, so the collapse animates via a grid-template-rows transition
     (see .faq-answer in styles.css) instead of the browser's own disclosure
     behavior. One item open at a time, closing the others, matching the
     live site's own accordion pattern.
     ----------------------------------------------------------------------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", function () {
      const willOpen = !item.classList.contains("open");
      const faqList = item.closest(".faq");
      if (faqList) {
        faqList.querySelectorAll(".faq-item.open").forEach(function (openItem) {
          if (openItem === item) return;
          openItem.classList.remove("open");
          const openQuestion = openItem.querySelector(".faq-question");
          if (openQuestion) openQuestion.setAttribute("aria-expanded", "false");
        });
      }
      item.classList.toggle("open", willOpen);
      question.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  /* -----------------------------------------------------------------------
     DISCOVERY CALL INTAKE (#contact): a native Netlify Forms submission,
     shared verbatim between index.html and partners.html, both of which
     carry the same #contact section. Unlike the configurator's lead form
     (rendered by renderLeadForm() further down, which needs a hidden
     static duplicate for Netlify's build-time detection since its real
     form only exists after JS runs), this form is written directly into
     the static HTML on both pages, so Netlify picks it up with no
     duplicate needed. Progressive enhancement only: the AJAX submit below
     swaps in an inline confirmation instead of a full-page reload, but the
     form works as a plain Netlify Forms POST without it.
     ----------------------------------------------------------------------- */
  /* Anti-spam helpers shared by both forms.
     - Honeypot: each form has an off-screen "company_tax_id" field no person
       sees. If it has a value, the sender is a script: nothing is sent and the
       normal confirmation is shown, so the script learns nothing. Netlify also
       filters on the same field server-side (netlify-honeypot).
     - Burst limit: at most 3 successful submissions per 10 minutes per browser.
       This only stops accidental repeats from a real browser; it is not a
       security control, since a script never runs this code. */
  const SUBMISSION_KEY = "kuma_submission_timestamps";
  const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;
  const SUBMISSION_MAX = 3;
  const RATE_LIMIT_MESSAGE = "Too many requests submitted recently. Please wait a few minutes or email contact@kuma.partners directly.";
  function honeypotTripped(form) {
    const field = form.querySelector('[name="company_tax_id"]');
    return !!(field && field.value);
  }
  function recentSubmissions() {
    try {
      const now = Date.now();
      return JSON.parse(window.localStorage.getItem(SUBMISSION_KEY) || "[]").filter(function (t) {
        return typeof t === "number" && now - t < SUBMISSION_WINDOW_MS;
      });
    } catch (err) { return []; }
  }
  function rateLimited() { return recentSubmissions().length >= SUBMISSION_MAX; }
  function recordSubmission() {
    try {
      const stamps = recentSubmissions(); stamps.push(Date.now());
      window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify(stamps));
    } catch (err) { /* storage unavailable: skip the burst limit */ }
  }
  function requireOk(response) {
    if (!response.ok) throw new Error("Form endpoint returned " + response.status);
    return response;
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const contactErrorDefault = (document.getElementById("contact-form-error") || {}).innerHTML;
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const errorEl = document.getElementById("contact-form-error");
      const successEl = document.getElementById("contact-success");
      if (honeypotTripped(contactForm)) {
        contactForm.hidden = true;
        if (successEl) successEl.hidden = false;
        return;
      }
      if (rateLimited()) {
        if (errorEl) { errorEl.textContent = RATE_LIMIT_MESSAGE; errorEl.hidden = false; }
        return;
      }
      if (errorEl && contactErrorDefault) errorEl.innerHTML = contactErrorDefault;
      const data = new FormData(contactForm);
      const body = Array.from(data.entries())
        .map(function (kv) { return encodeURIComponent(kv[0]) + "=" + encodeURIComponent(kv[1]); })
        .join("&");

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      if (errorEl) errorEl.hidden = true;

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      })
        .then(requireOk)
        .then(function () {
          recordSubmission();
          contactForm.hidden = true;
          if (successEl) successEl.hidden = false;
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request Discovery Call →";
          if (errorEl) errorEl.hidden = false;
        });
    });
  }

  /* -----------------------------------------------------------------------
     CALIBRATED FORMATS DETAIL DRAWER (#formats, index.html only): each
     card's single CTA (v25: one consolidated button, replacing the old
     "Inspect full scope" text link plus a separate "Build this format"
     button) both toggles which .format-detail-panel is shown in the
     full-width drawer below the grid and IS the open/closed state
     indicator, swapping between the real .btn-secondary (closed) and
     .btn-primary (open) look and its own label/arrow, rather than a
     separate always-visible "Build this format" button competing next
     to it. Reaching the configurator directly from this section now
     happens from the drawer's own "Configure this format" button
     (selectFormatAndScroll, defined further down), once a card is open,
     not from the summary card itself. Mirrors the FAQ accordion's
     single-open-at-a-time class toggle above rather than a hand-rolled
     inline style.display swap.
     ----------------------------------------------------------------------- */
  const formatToggles = document.querySelectorAll("[data-format-toggle]");
  if (formatToggles.length) {
    const formatCards = document.querySelectorAll("[data-format]");
    const formatPanels = document.querySelectorAll("[data-format-detail]");
    const FORMAT_TOGGLE_LABELS = {
      closed: 'Inspect Scope &amp; Curriculum <span class="format-toggle-icon">&darr;</span>',
      open: 'Viewing Scope Below <span class="format-toggle-icon">&uarr;</span>',
    };

    function activateFormat(formatId) {
      formatCards.forEach(function (card) {
        card.classList.toggle("format-card-active", card.getAttribute("data-format") === formatId);
      });
      formatToggles.forEach(function (btn) {
        const isOpen = btn.getAttribute("data-format-toggle") === formatId;
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        btn.classList.toggle("btn-primary", isOpen);
        btn.classList.toggle("btn-secondary", !isOpen);
        btn.innerHTML = isOpen ? FORMAT_TOGGLE_LABELS.open : FORMAT_TOGGLE_LABELS.closed;
      });
      formatPanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-format-detail") !== formatId;
      });
      // All drawers start closed; the shared shell only shows while one is open.
      const formatShell = document.getElementById("format-detail-panel");
      if (formatShell) formatShell.hidden = !formatId;
    }

    formatToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const wasOpen = btn.getAttribute("aria-expanded") === "true";
        activateFormat(wasOpen ? null : btn.getAttribute("data-format-toggle"));
        if (!wasOpen && window.innerWidth <= 860) {
          const panel = document.getElementById("format-detail-panel");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
     CHOOSE YOUR CADENCE DETAIL DRAWER (#cadence, index.html only, v28):
     the exact same pattern as the CALIBRATED FORMATS drawer above, applied
     to a second section rather than reimplemented. Each cadence card's
     single toggle both selects which .format-detail-panel (data-cadence-
     detail) shows in the shared drawer below the grid and is itself the
     open/closed indicator, swapping .btn-secondary/.btn-primary and its
     own label/arrow exactly as activateFormat does. The 3-day cadence
     opens by default, matching its "Most Effective" badge and mirroring
     how the C-suite format opens by default above. Locking in a cadence
     now happens from the drawer's own "Select N-Day Cadence" button
     (selectCadenceAndScroll, defined further down), once that cadence's
     agenda is open, the same trade as #formats' "Configure this format"
     replacing "Build this format" in v26.
     ----------------------------------------------------------------------- */
  const cadenceToggles = document.querySelectorAll("[data-cadence-toggle]");
  if (cadenceToggles.length) {
    const cadenceCards = document.querySelectorAll("[data-cadence]");
    const cadencePanels = document.querySelectorAll("[data-cadence-detail]");
    const CADENCE_TOGGLE_LABELS = {
      closed: 'Inspect Sample Agenda <span class="format-toggle-icon">&darr;</span>',
      open: 'Viewing Agenda Below <span class="format-toggle-icon">&uarr;</span>',
    };

    function activateCadence(cadenceId) {
      cadenceCards.forEach(function (card) {
        card.classList.toggle("format-card-active", card.getAttribute("data-cadence") === cadenceId);
      });
      cadenceToggles.forEach(function (btn) {
        const isOpen = btn.getAttribute("data-cadence-toggle") === cadenceId;
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        btn.classList.toggle("btn-primary", isOpen);
        btn.classList.toggle("btn-secondary", !isOpen);
        btn.innerHTML = isOpen ? CADENCE_TOGGLE_LABELS.open : CADENCE_TOGGLE_LABELS.closed;
      });
      cadencePanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-cadence-detail") !== cadenceId;
      });
      const cadenceShell = document.getElementById("cadence-detail-panel");
      if (cadenceShell) cadenceShell.hidden = !cadenceId;
    }

    cadenceToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const wasOpen = btn.getAttribute("aria-expanded") === "true";
        activateCadence(wasOpen ? null : btn.getAttribute("data-cadence-toggle"));
        if (!wasOpen && window.innerWidth <= 860) {
          const panel = document.getElementById("cadence-detail-panel");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
     TABBED SECTION (#dossier): venues, social anchors and ways to work share
     one section. Every panel is in the static HTML; the tabs only switch
     which one is visible. The panels keep the ids of the sections they
     replaced (#places, #immersions, #engagement-models), so old deep links
     still land on the right tab.
     ----------------------------------------------------------------------- */
  const dossierTabs = document.querySelectorAll(".dossier-tab-btn");
  if (dossierTabs.length) {
    function showDossierPanel(target) {
      dossierTabs.forEach(function (b) {
        const on = b.getAttribute("data-dossier-target") === target;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        const panel = document.getElementById(b.getAttribute("data-dossier-target"));
        if (panel) panel.hidden = !on;
      });
    }
    dossierTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showDossierPanel(btn.getAttribute("data-dossier-target"));
      });
    });
    function openDossierFromHash() {
      const id = window.location.hash.slice(1);
      const match = Array.prototype.some.call(dossierTabs, function (b) {
        return b.getAttribute("data-dossier-target") === id;
      });
      if (!match) return;
      showDossierPanel(id);
      const section = document.getElementById("dossier");
      if (section) section.scrollIntoView({ block: "start" });
    }
    openDossierFromHash();
    window.addEventListener("hashchange", openDossierFromHash);
  }

  /* -----------------------------------------------------------------------
     FAQ "SHOW ALL" TOGGLE: the first three questions show on load, the rest
     stay in the HTML and are revealed by the button.
     ----------------------------------------------------------------------- */
  const faqExpandBtn = document.getElementById("faq-expand-btn");
  if (faqExpandBtn) {
    faqExpandBtn.addEventListener("click", function () {
      const isExpanded = faqExpandBtn.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".faq-item-secondary").forEach(function (item) {
        item.classList.toggle("is-revealed", !isExpanded);
      });
      faqExpandBtn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      faqExpandBtn.innerHTML = isExpanded
        ? "Show all " + faqExpandBtn.getAttribute("data-total") + ' questions <span class="arrow">&darr;</span>'
        : 'Show fewer questions <span class="arrow">&uarr;</span>';
    });
  }

  /* -----------------------------------------------------------------------
     SAMPLE 90-DAY COMPACT DIALOG (#compact-modal): opened from step 03 of
     #process. Closes on the close button, a backdrop click or Escape, and
     returns focus to the button that opened it.
     ----------------------------------------------------------------------- */
  const compactModal = document.getElementById("compact-modal");
  const openCompactBtn = document.getElementById("open-compact-modal");
  if (compactModal && openCompactBtn) {
    const compactDialog = compactModal.querySelector(".compact-modal");
    const closeCompactBtn = document.getElementById("close-compact-modal");
    function openCompact() {
      compactModal.classList.add("is-open");
      compactModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("scan-modal-locked");
      if (closeCompactBtn) closeCompactBtn.focus();
    }
    function closeCompact() {
      compactModal.classList.remove("is-open");
      compactModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("scan-modal-locked");
      openCompactBtn.focus();
    }
    openCompactBtn.addEventListener("click", openCompact);
    if (closeCompactBtn) closeCompactBtn.addEventListener("click", closeCompact);
    compactModal.addEventListener("click", function (e) {
      if (e.target === compactModal) closeCompact();
    });
    document.addEventListener("keydown", function (e) {
      if (!compactModal.classList.contains("is-open")) return;
      if (e.key === "Escape") closeCompact();
      // Keep Tab inside the dialog: the close button is its only control.
      if (e.key === "Tab" && compactDialog) {
        e.preventDefault();
        if (closeCompactBtn) closeCompactBtn.focus();
      }
    });
  }

  /* -----------------------------------------------------------------------
     MOBILE STICKY ACTION BAR: CSS shows it at 768px and below only. It slides
     in once the hero has left the screen and hides again while the
     configurator or the contact form is on screen.
     ----------------------------------------------------------------------- */
  const mobileBar = document.getElementById("mobile-sticky-bar");
  if (mobileBar && "IntersectionObserver" in window) {
    const barBlockers = [
      document.querySelector(".hero"),
      document.getElementById("configurator"),
      document.getElementById("contact"),
    ].filter(Boolean);
    const onScreen = new Set();
    const barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      });
      mobileBar.classList.toggle("is-visible", onScreen.size === 0);
    });
    barBlockers.forEach(function (el) { barObserver.observe(el); });
  }

  /* -----------------------------------------------------------------------
     SCROLL REVEAL: section heads and cards fade and rise once as they enter
     the viewport, with a 90ms stagger across a row. Skipped entirely under
     prefers-reduced-motion. Not applied to anything inside a tab panel,
     drawer, hidden FAQ item, the configurator or the sample dialog (those
     have their own show logic), nor to cards inside the mobile swipe rows.
     ----------------------------------------------------------------------- */
  (function () {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const REVEAL_SELECTOR =
      ".section-head, .problem-stat, .problem-col, .process-card, .diagnostic-arc-title, .arc-step, " +
      ".place-card, .tier-card, .partner-card-lg, .advisor-card, .pricing-pillar, .scorecard-card, " +
      ".faq-item, .contact-copy, .contact-form-shell, .insight-card";
    const REVEAL_EXCLUDE =
      ".dossier-tab-panel, .format-detail, .faq-item-secondary, .compact-modal-overlay, #configurator-app *";
    const isSwipeLayout = window.matchMedia("(max-width: 768px)").matches;
    const REVEAL_MS = 650;
    const STAGGER_MS = 90;

    const targets = Array.prototype.filter.call(document.querySelectorAll(REVEAL_SELECTOR), function (el) {
      if (el.closest(REVEAL_EXCLUDE)) return false;
      if (isSwipeLayout && el.parentElement && el.parentElement.matches("#formats .tier-grid, #cadence .tier-grid")) return false;
      // Leave alone anything already on screen at load: hiding it would flash.
      const rect = el.getBoundingClientRect();
      return !(rect.top < window.innerHeight && rect.bottom > 0);
    });
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.classList.add("reveal-item");
      const siblings = Array.prototype.filter.call(el.parentElement.children, function (s) {
        return targets.indexOf(s) !== -1;
      });
      const index = siblings.indexOf(el);
      if (siblings.length > 1 && index > 0) el.style.transitionDelay = (index % 4) * STAGGER_MS + "ms";
    });

    function finish(el) {
      el.classList.remove("reveal-item", "is-revealed");
      el.style.transitionDelay = "";
    }
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add("is-revealed");
        window.setTimeout(function () { finish(el); }, REVEAL_MS + 3 * STAGGER_MS + 100);
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0.12 });
    targets.forEach(function (el) { revealObserver.observe(el); });

    // A jump (anchor link, End key) can carry an element from below the
    // viewport to above it without it ever intersecting. Anything that ends up
    // above the viewport is shown straight away, so nothing stays hidden.
    let sweepQueued = false;
    window.addEventListener("scroll", function () {
      if (sweepQueued) return;
      sweepQueued = true;
      window.requestAnimationFrame(function () {
        sweepQueued = false;
        targets.forEach(function (el) {
          if (!el.classList.contains("reveal-item") || el.classList.contains("is-revealed")) return;
          if (el.offsetParent !== null && el.getBoundingClientRect().bottom < 0) {
            revealObserver.unobserve(el);
            finish(el);
          }
        });
      });
    }, { passive: true });

    window.addEventListener("beforeprint", function () { targets.forEach(finish); });
  })();

  /* -----------------------------------------------------------------------
     OPERATOR CARDS (#collective): the bio opens on hover through CSS alone.
     This only pins each card's slot to the shared resting height, so an open
     card grows over the content below and the page does not move. Applies
     where CSS collapses the bio (mouse, 1101px and wider); elsewhere the
     pinning is cleared and the cards flow normally.
     ----------------------------------------------------------------------- */
  (function () {
    const grids = document.querySelectorAll(".partner-grid-4, .bench-grid");
    if (!grids.length) return;
    const collapses = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1101px)");
    function pinSlots() { grids.forEach(pinGrid); }
    function pinGrid(grid) {
      const slots = grid.querySelectorAll(".partner-card-slot");
      grid.classList.remove("is-pinned");
      slots.forEach(function (s) { s.style.height = ""; });
      if (!collapses.matches) return;
      grid.classList.add("is-measuring");
      let rest = 0;
      slots.forEach(function (s) { rest = Math.max(rest, s.firstElementChild.offsetHeight); });
      grid.classList.remove("is-measuring");
      if (!rest) return;
      slots.forEach(function (s) { s.style.height = rest + "px"; });
      grid.classList.add("is-pinned");
    }
    pinSlots();
    window.addEventListener("load", pinSlots);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pinSlots);
    let pinTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(pinTimer);
      pinTimer = window.setTimeout(pinSlots, 150);
    });
  })();

  /* -----------------------------------------------------------------------
     CONFIGURATOR: STEP DATA
     ----------------------------------------------------------------------- */
  const STEPS = [
    {
      key: "role",
      metaLabel: "Your Role",
      title: "What is your role within the organisation?",
      subtitle: "Helps us calibrate governance depth, decision authority and confidentiality.",
      options: [
        { id: "ceo", title: "Founder / Chief Executive", desc: "Direct decision-maker seeking executive alignment, clarity and execution speed." },
        { id: "csuite", title: "C-Suite / VP / Board Member", desc: "Cross-functional leader addressing departmental bottlenecks and strategic delivery." },
        { id: "people", title: "People Director / Chief of Staff", desc: "Internal sponsor orchestrating the programme, logistics and leadership flow." },
        { id: "facilitator", title: "External Facilitator / Strategic Partner", desc: "Advisor looking for Catalan venues, co-facilitation or local production support." },
        { id: "other", title: "Other Role", desc: "Business unit lead, project sponsor or exploring on behalf of a wider group." },
      ],
    },
    {
      key: "mandate",
      metaLabel: "Primary Mandate",
      title: "What is the primary objective of this offsite?",
      subtitle: "Defines the facilitation model, the closed-door agenda and the outputs you leave with.",
      options: [
        { id: "alignment", title: "Executive Alignment & Friction Mediation", desc: "Unblocking decision deadlock, agreeing who decides what and settling priority trade-offs." },
        { id: "culture", title: "Culture, Cohesion & Remote Team Momentum", desc: "Reconnecting distributed teams through shared context, without forced fun." },
        { id: "product_ai", title: "Product Kick-Off & AI Sprint", desc: "Roadmap stress-testing, commercial viability work and technology governance." },
        { id: "co_founder", title: "Co-Founder Reset", desc: "Confidential working retreat for 2 to 6 founders resolving relational friction." },
        { id: "celebration", title: "Milestone Celebration & Strategic Horizons", desc: "Marking a funding round or transition, balanced with forward-looking strategy." },
        { id: "other", title: "Other Mandate", desc: "Post-merger integration, crisis mediation or another specific context." },
      ],
    },
    {
      key: "budget",
      metaLabel: "Investment Scope",
      title: "What indicative budget have you set aside?",
      subtitle: "Total for the offsite: venue, hospitality, logistics and facilitation.",
      options: [
        { id: "under_20k", title: "Under €20,000", desc: "Typically a short format for a small leadership team." },
        { id: "20k_45k", title: "€20,000 to €45,000", desc: "" },
        { id: "45k_90k", title: "€45,000 to €90,000", desc: "" },
        { id: "over_90k", title: "€90,000+", desc: "Typically larger groups or longer formats." },
        { id: "outcome_led", title: "Open / Outcome-Led", desc: "To be set once we have recommended a format." },
        { id: "other", title: "Other Arrangement", desc: "Co-funded programmes, several cost centres or staged across fiscal years." },
      ],
    },
    {
      key: "location",
      metaLabel: "Venue",
      title: "Where do you stand on the venue?",
      subtitle: "We work with private estates and city venues across Barcelona, the Penedès, Girona and the coast.",
      options: [
        { id: "masia", title: "Secluded Catalan Masia / Country Estate", desc: "Full privacy, about 45 to 60 minutes from Barcelona." },
        { id: "urban", title: "Barcelona City Atelier (22@ / Poblenou)", desc: "Creative working spaces in the city, with hotels nearby." },
        { id: "secured", title: "Venue Already Booked", desc: "We bring the facilitation, agenda design and delivery on site." },
        { id: "open", title: "Open to Recommendations", desc: "We suggest the setting that fits your group size and working pace." },
        { id: "other", title: "Specific Preference", desc: "A particular region, several venues or special technical requirements." },
      ],
    },
    {
      key: "facilitation",
      metaLabel: "Facilitation",
      title: "How much facilitation do you need from us?",
      subtitle: "Our partners personally design and lead the sessions in the room.",
      options: [
        { id: "deep_intervention", title: "Full Intervention", desc: "Confidential 1:1 interviews under NDA, closed-room mediation and a signed 90-day compact." },
        { id: "co_design", title: "Co-Design & Session Moderation", desc: "We design the agenda with you and steer the sessions throughout." },
        { id: "production_only", title: "Venue & Production Only", desc: "Your team leads the agenda; we handle the venue, catering, AV and hospitality." },
        { id: "hybrid", title: "Undecided", desc: "You would like to talk the options through with a partner first." },
        { id: "other", title: "Other Scope", desc: "Specialist sessions, multilingual delivery or another arrangement." },
      ],
    },
  ];

  /* -----------------------------------------------------------------------
     BLUEPRINT COMPILATION
     ----------------------------------------------------------------------- */
  const MANDATE_TITLES = {
    alignment: "Executive Alignment Offsite",
    culture: "Company Momentum Offsite",
    product_ai: "Product & AI Sprint",
    co_founder: "Co-Founder Reset",
    celebration: "Milestone & Strategy Offsite",
    other: "Tailored Executive Offsite",
  };
  const SETTING_SUFFIX = { masia: " at a Catalan Masia", urban: " in Barcelona" };
  const MANDATE_DELIVERABLES = {
    alignment: "A signed 90-day compact: one owner per decision, a stop list and review dates",
    culture: "Shared priorities and team-level plans owned by each department lead",
    product_ai: "A stress-tested roadmap with named owners",
    co_founder: "A signed co-founder compact",
    celebration: "A refreshed strategic direction the team leaves aligned on",
    other: "Agreed in your tailored brief",
  };

  function findOption(stepKey, optionId) {
    const step = STEPS.find(function (s) { return s.key === stepKey; });
    return (step && step.options.find(function (o) { return o.id === optionId; })) || { title: "", desc: "" };
  }

  function compileBlueprint(selections) {
    const role = findOption("role", selections.role);
    const mandate = findOption("mandate", selections.mandate);
    const budget = findOption("budget", selections.budget);
    const location = findOption("location", selections.location);
    const facilitation = findOption("facilitation", selections.facilitation);
    return {
      title: "Your " + (MANDATE_TITLES[selections.mandate] || MANDATE_TITLES.other) + (SETTING_SUFFIX[selections.location] || ""),
      pills: [
        { label: "Role", value: role.title },
        { label: "Mandate", value: mandate.title },
        { label: "Budget", value: budget.title },
        { label: "Venue", value: location.title },
        { label: "Facilitation", value: facilitation.title },
      ],
      specs: [
        { label: "Primary Mandate", value: mandate.title, sub: mandate.desc },
        { label: "Venue", value: location.title, sub: location.desc },
        { label: "Facilitation", value: facilitation.title, sub: facilitation.desc },
        { label: "What You Leave With", value: MANDATE_DELIVERABLES[selections.mandate] || MANDATE_DELIVERABLES.other, sub: "Confirmed with you before the offsite." },
        {
          label: "Commercial Model",
          value: "Fixed advisory fee, hospitality at cost",
          sub: "Your indicative budget: " + budget.title + ". Most engagements land between €15,000 and €150,000, depending on group size and venue; your tailored brief carries the exact figure.",
        },
      ],
      labels: { role: role.title, mandate: mandate.title, budget: budget.title, location: location.title, facilitation: facilitation.title },
    };
  }

  /* -----------------------------------------------------------------------
     CONFIGURATOR STATE + RENDER
     ----------------------------------------------------------------------- */
  const configuratorRoot = document.getElementById("configurator-app");
  if (!configuratorRoot) return;

  const state = { stepIndex: 0, selections: {} };

  const els = {
    progressText: configuratorRoot.querySelector(".sc-progress-text"),
    progressFill: configuratorRoot.querySelector(".sc-progress-bar-fill"),
    backRow: configuratorRoot.querySelector(".sc-nav-row"),
    backBtn: configuratorRoot.querySelector(".sc-back-btn"),
    stepsWrap: configuratorRoot.querySelector("#sc-steps"),
    blueprintWrap: configuratorRoot.querySelector("#sc-blueprint"),
  };

  function renderStep() {
    const step = STEPS[state.stepIndex];
    const pct = Math.round(((state.stepIndex + 1) / STEPS.length) * 100);

    els.progressText.textContent = "Step 0" + (state.stepIndex + 1) + " of 0" + STEPS.length + " · " + step.metaLabel;
    els.progressFill.style.width = pct + "%";
    els.backRow.hidden = state.stepIndex === 0;

    const selectedId = state.selections[step.key];

    const optionsHTML = step.options
      .map(function (opt, i) {
        const isSelected = opt.id === selectedId;
        const num = opt.num || (i < 9 ? "0" : "") + (i + 1);
        return (
          '<button type="button" class="scorecard-option' + (isSelected ? " selected" : "") + '" data-option-id="' + opt.id + '" aria-pressed="' + isSelected + '">' +
          '<span class="sc-option-num">' + num + " &middot;</span>" +
          '<span class="sc-option-body">' +
          '<span class="sc-option-title">' + opt.title + "</span>" +
          (opt.meta ? '<span class="sc-option-meta">' + opt.meta + "</span>" : "") +
          (opt.desc ? '<span class="sc-option-desc">' + opt.desc + "</span>" : "") +
          "</span>" +
          "</button>"
        );
      })
      .join("");

    els.stepsWrap.innerHTML =
      '<h3 class="sc-title">' + step.title + "</h3>" +
      '<p class="sc-subtitle">' + step.subtitle + "</p>" +
      optionsHTML;

    els.stepsWrap.querySelectorAll(".scorecard-option").forEach(function (btn) {
      btn.addEventListener("click", onSelectOption);
    });
  }

  function onSelectOption(e) {
    const btn = e.currentTarget;
    const step = STEPS[state.stepIndex];
    state.selections[step.key] = btn.dataset.optionId;

    els.stepsWrap.querySelectorAll(".scorecard-option").forEach(function (c) { c.classList.remove("selected"); });
    btn.classList.add("selected");
    btn.setAttribute("aria-pressed", "true");

    window.setTimeout(function () {
      if (state.stepIndex < STEPS.length - 1) {
        state.stepIndex += 1;
        renderStep();
      } else {
        showBlueprint();
      }
    }, 380);
  }

  if (els.backBtn) {
    els.backBtn.addEventListener("click", function () {
      if (state.stepIndex === 0) return;
      state.stepIndex -= 1;
      renderStep();
    });
  }

  /* -----------------------------------------------------------------------
     FORMAT CARD CTAs: "Build this format" buttons call this directly via
     inline onclick (exposed on window since it's referenced from markup
     outside this closure, and defined here rather than earlier in the file
     so it can close over STEPS/state/renderStep/configuratorRoot, all of
     which exist by this point).
     ----------------------------------------------------------------------- */
  // Format cards' "Configure this format" pre-selects the matching mandate
  // (shown highlighted at step 2) and starts the questions at step 1.
  const FORMAT_TO_MANDATE = { cofounders: "co_founder", csuite: "alignment", scaleup: "culture" };

  window.selectFormatAndScroll = function (formatId) {
    if (FORMAT_TO_MANDATE[formatId]) {
      state.selections = { mandate: FORMAT_TO_MANDATE[formatId] };
      state.stepIndex = 0;
      els.blueprintWrap.hidden = true;
      els.blueprintWrap.innerHTML = "";
      els.stepsWrap.hidden = false;
      renderStep();
    }
    const target = document.getElementById("configurator");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* -----------------------------------------------------------------------
     CADENCE CARD CTAs: "Select N-Day Cadence" buttons in #cadence call this
     via inline onclick, same reasoning as selectFormatAndScroll above
     (window-exposed, defined here so it's in scope alongside it). There is
     no duration/cadence step in the configurator to pre-select, so this
     is a plain scroll; cadenceKey is accepted (not read) so a future step
     can be added here without touching the markup that calls it.
     ----------------------------------------------------------------------- */
  window.selectCadenceAndScroll = function (cadenceKey) {
    const target = document.getElementById("configurator");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* -----------------------------------------------------------------------
     BLUEPRINT + LEAD FORM
     ----------------------------------------------------------------------- */
  function showBlueprint() {
    const bp = compileBlueprint(state.selections);

    els.stepsWrap.hidden = true;
    els.backRow.hidden = true;
    els.blueprintWrap.hidden = false;

    const pillsHTML = bp.pills
      .map(function (p) { return '<span class="track-record"><span>' + p.label + ": " + p.value + "</span></span>"; })
      .join("");

    const specsHTML = bp.specs
      .map(function (b) {
        return (
          '<div class="offsite-specs-row">' +
          '<span class="offsite-specs-label">' + b.label + "</span>" +
          '<p><strong style="color:var(--navy); font-family:Montserrat,Arial,sans-serif; font-weight:600;">' + b.value + "</strong><br>" + b.sub + "</p>" +
          "</div>"
        );
      })
      .join("");

    els.blueprintWrap.innerHTML =
      '<div class="sc-score-badge sc-badge-optimal" style="display:block; text-align:center; width:max-content; margin:0 auto 18px;">Tailored Offsite Blueprint</div>' +
      '<h3 class="blueprint-title">' + bp.title + "</h3>" +
      '<div class="blueprint-pills">' + pillsHTML + "</div>" +
      '<div class="blueprint-specs">' + specsHTML + "</div>" +
      '<div id="lead-form-wrap"></div>' +
      '<a href="#" id="restart-link" class="restart-link">Start over &amp; reconfigure</a>';

    document.getElementById("restart-link").addEventListener("click", function (e) {
      e.preventDefault();
      restart();
    });

    renderLeadForm(bp);
    els.blueprintWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function restart() {
    state.stepIndex = 0;
    state.selections = {};
    els.blueprintWrap.hidden = true;
    els.blueprintWrap.innerHTML = "";
    els.stepsWrap.hidden = false;
    renderStep();
    configuratorRoot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function attr(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function renderLeadForm(bp) {
    const wrap = document.getElementById("lead-form-wrap");
    wrap.innerHTML =
      '<form id="lead-form" class="debrief-form" name="offsite-blueprint" method="POST" data-netlify="true" netlify-honeypot="company_tax_id" style="border-top:1px solid var(--hairline-color); padding-top:28px; margin-top:8px;">' +
      '<input type="hidden" name="form-name" value="offsite-blueprint">' +
      '<div style="position:absolute; left:-9999px; top:-9999px; opacity:0; pointer-events:none;" aria-hidden="true"><label for="hp-blueprint">Do not fill this field</label><input type="text" id="hp-blueprint" name="company_tax_id" tabindex="-1" autocomplete="off" value=""></div>' +
      '<input type="hidden" name="blueprint_title" value="' + attr(bp.title) + '">' +
      '<input type="hidden" name="selection_role" value="' + attr(bp.labels.role) + '">' +
      '<input type="hidden" name="selection_mandate" value="' + attr(bp.labels.mandate) + '">' +
      '<input type="hidden" name="selection_budget" value="' + attr(bp.labels.budget) + '">' +
      '<input type="hidden" name="selection_location" value="' + attr(bp.labels.location) + '">' +
      '<input type="hidden" name="selection_facilitation" value="' + attr(bp.labels.facilitation) + '">' +
      '<div class="field-row">' +
      '<div class="field"><label>Full Name *</label><input type="text" name="name" required autocomplete="name" placeholder="Full name"></div>' +
      '<div class="field"><label>Work Email *</label><input type="email" name="email" required autocomplete="email" placeholder="you@company.com"></div>' +
      "</div>" +
      '<div class="field-row">' +
      '<div class="field"><label>Company *</label><input type="text" name="company" required autocomplete="organization" placeholder="Company"></div>' +
      '<div class="field"><label>Group Size *</label>' +
      '<div class="select-shell"><select name="group_size" required>' +
      '<option value="">Select a size</option>' +
      '<option value="2-6">2 to 6 people</option>' +
      '<option value="7-14">7 to 14 people</option>' +
      '<option value="15-30">15 to 30 people</option>' +
      '<option value="31-60">31 to 60 people</option>' +
      '<option value="60+">60+ people</option>' +
      "</select></div></div>" +
      "</div>" +
      '<div class="field"><label>Target Timeframe *</label>' +
      '<div class="select-shell"><select name="timeline" required>' +
      '<option value="">Select a timeframe</option>' +
      '<option value="Next 60 days">Within the next 60 days</option>' +
      '<option value="Q1 2027">Q1 2027</option>' +
      '<option value="Q2 2027">Q2 2027</option>' +
      '<option value="Q3 2027">Q3 2027</option>' +
      '<option value="Q4 2027 or later">Q4 2027 or later</option>' +
      '<option value="Specific dates in mind">Specific dates in mind</option>' +
      "</select></div></div>" +
      '<div class="field"><label>Anything we should know? <span class="field-optional">(optional)</span></label><textarea name="context" rows="3" placeholder="Dates, constraints or the situation you want to resolve."></textarea></div>' +
      '<button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Reserve Dates &amp; Request Tailored Brief</button>' +
      '<p class="debrief-form-microcopy">We limit engagements each quarter to protect delivery quality. Sven, Farid or Luisa personally reviews every brief within 24 business hours.</p>' +
      '<p class="debrief-form-error" id="form-error" hidden>Something went wrong sending your request. Please try again, or email <a href="mailto:contact@kuma.partners">contact@kuma.partners</a> directly.</p>' +
      "</form>";

    document.getElementById("lead-form").addEventListener("submit", onSubmitLeadForm);
  }

  function encodeFormData(form) {
    const data = new FormData(form);
    return Array.from(data.entries())
      .map(function (kv) { return encodeURIComponent(kv[0]) + "=" + encodeURIComponent(kv[1]); })
      .join("&");
  }

  function onSubmitLeadForm(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById("form-error");

    if (honeypotTripped(form)) { showConfirmation(); return; }
    if (errorEl && !errorEl.dataset.defaultHtml) errorEl.dataset.defaultHtml = errorEl.innerHTML;
    if (rateLimited()) {
      if (errorEl) { errorEl.textContent = RATE_LIMIT_MESSAGE; errorEl.hidden = false; }
      return;
    }
    if (errorEl) errorEl.innerHTML = errorEl.dataset.defaultHtml;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    if (errorEl) errorEl.hidden = true;

    const endpoint = FORM_WEBHOOK_URL || "/";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFormData(form),
    })
      .then(requireOk)
      .then(function () { recordSubmission(); showConfirmation(); })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Reserve Dates & Request Tailored Brief";
        if (errorEl) errorEl.hidden = false;
      });
  }

  function showConfirmation() {
    const wrap = document.getElementById("lead-form-wrap");
    wrap.innerHTML =
      '<div class="debrief-success" style="padding-top:20px;">' +
      "<h3>Your blueprint is on its way.</h3>" +
      "<p>Sven, Farid or Luisa personally reviews every brief. Expect a reply within 24 business hours with your tailored PDF and next steps.</p>" +
      "</div>";
  }

  renderStep();
});
