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
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const errorEl = document.getElementById("contact-form-error");
      const successEl = document.getElementById("contact-success");
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
        .then(function () {
          contactForm.hidden = true;
          if (successEl) successEl.hidden = false;
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request Confidential Briefing →";
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
    }

    formatToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateFormat(btn.getAttribute("data-format-toggle"));
        if (window.innerWidth <= 860) {
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
    }

    cadenceToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateCadence(btn.getAttribute("data-cadence-toggle"));
        if (window.innerWidth <= 860) {
          const panel = document.getElementById("cadence-detail-panel");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
     CONFIGURATOR: STEP DATA
     ----------------------------------------------------------------------- */
  const STEPS = [
    {
      key: "archetype",
      title: "Who is entering the room?",
      subtitle: "Select your team composition to calibrate facilitation depth and venue scale.",
      metaLabel: "Scale",
      options: [
        {
          id: "cofounders",
          num: "01",
          title: "Co-Founders & Executive Committee",
          meta: "2–5 leaders",
          desc: "Relational alignment, founder dynamics, equity and vision clarity.",
        },
        {
          id: "csuite",
          num: "02",
          title: "C-Suite & Functional Leadership",
          meta: "6–12 executives",
          desc: "Strategy-to-execution, decision rights (RACI), operational friction resolution.",
        },
        {
          id: "scaleup",
          num: "03",
          title: "Cross-Functional Scale-Up",
          meta: "15–35+ people",
          desc: "Remote-first cohesion, cultural integration, operating rhythms.",
        },
      ],
    },
    {
      key: "tension",
      title: "What is the critical tension to resolve?",
      subtitle: "Choose the primary operational outcome required for this engagement.",
      metaLabel: "Focus",
      options: [
        {
          id: "governance",
          num: "01",
          title: "Strategy-to-Execution & RACI",
          desc: "Resolving decision latency, eliminating silos, locking in a binding 90-day board-ready compact.",
        },
        {
          id: "friction",
          num: "02",
          title: "Leadership Friction & Co-Founder Reset",
          desc: "Surfacing unexpressed conflict, clarifying role boundaries, restoring executive trust.",
        },
        {
          id: "innovation",
          num: "03",
          title: "Product Innovation & Roadmap Lab",
          desc: "Divergent creative sprints, market repositioning, stress-testing new product bets.",
        },
        {
          id: "remote",
          num: "04",
          title: "Remote Team Culture & Momentum",
          desc: "Rebuilding trust across distributed functions with zero internal planning overhead.",
        },
      ],
    },
    {
      key: "setting",
      title: "Where does your team operate best?",
      subtitle: "Matching physical geography to your strategic objective.",
      metaLabel: "Setting",
      options: [
        {
          id: "masia",
          num: "01",
          title: "Secluded Catalan Masia",
          desc: "Historic private estate (Solsona / Costa Brava / Girona). Total seclusion, private chef, zero urban distraction.",
        },
        {
          id: "urban",
          num: "02",
          title: "Dynamic Urban Atelier",
          desc: "Creative Poblenou loft / Norrsken House Barcelona overlooking the sea. High-energy creative friction.",
        },
        {
          id: "winery",
          num: "03",
          title: "Penedès Winery & Coastal Villa",
          desc: "Secluded estate among vineyards near Sitges. Deep focus balanced with open-air gastronomy.",
        },
      ],
    },
    {
      key: "hospitality",
      title: "How should the table be set?",
      subtitle: "Select the culinary experience tailored to your team's culture.",
      metaLabel: "Model",
      options: [
        {
          id: "chef",
          num: "01",
          title: "Private Executive Chef & Sommelier",
          desc: "100% turnkey open-hearth dining, wine pairings, and continuous hospitality.",
        },
        {
          id: "grounded",
          num: "02",
          title: "Grounded & Collaborative",
          desc: "Open-fire culinary masterclass, shared preparation, and authentic communal connection.",
        },
        {
          id: "city",
          num: "03",
          title: "City Gastronomy & Sea Immersion",
          desc: "Curated dining in El Born paired with a private sunset Mediterranean catamaran charter.",
        },
      ],
    },
    {
      key: "facilitation",
      title: "What level of in-room moderation is required?",
      subtitle: "Our engagements are led directly by former C-suite operators and venture studio designers.",
      metaLabel: "Depth",
      options: [
        {
          id: "operator",
          num: "01",
          title: "Former C-Suite Operator Mediation",
          desc: "Confidential 1:1 intake, hard commercial debate moderation, binding compact delivery.",
        },
        {
          id: "venture",
          num: "02",
          title: "Venture Studio Innovation Facilitation",
          desc: "Design thinking, divergent roadmap labs, rapid prototyping, and GTM stress-testing.",
        },
        {
          id: "culture",
          num: "03",
          title: "Turnkey Culture & Connection Facilitation",
          desc: "Light-touch alignment workshops (25%) + 75% team bonding and experiential program.",
        },
      ],
    },
  ];

  /* -----------------------------------------------------------------------
     BLUEPRINT COMPILATION
     ----------------------------------------------------------------------- */
  const TITLE_MATRIX = {
    governance: { masia: "Executive Strategy Masia Sprint", urban: "Strategy Atelier Intensive", winery: "Coastal Governance Retreat" },
    friction: { masia: "Founder Reset Masia Retreat", urban: "Urban Founder Realignment", winery: "Penedès Trust Retreat" },
    innovation: { masia: "Masia Innovation Sprint", urban: "Barcelona Urban Innovation Atelier", winery: "Coastal Innovation Lab" },
    remote: { masia: "Masia Culture Reset", urban: "Urban Momentum Atelier", winery: "Penedès Reconnection Retreat" },
  };
  const DELIVERABLE_MATRIX = {
    governance: "Signed Binding 90-Day Board Compact & Decision RACI",
    friction: "Signed Binding Peer Compact",
    innovation: "Validated Roadmap & GTM Stress-Test Brief",
    remote: "Remote Operating Charter",
  };

  function findOption(stepKey, optionId) {
    const step = STEPS.find(function (s) { return s.key === stepKey; });
    return step.options.find(function (o) { return o.id === optionId; });
  }

  function compileBlueprint(selections) {
    const tensionId = selections.tension;
    const settingId = selections.setting;
    const titleCore = (TITLE_MATRIX[tensionId] && TITLE_MATRIX[tensionId][settingId]) || "Tailored Executive Offsite";

    const settingOpt = findOption("setting", settingId);
    const tensionOpt = findOption("tension", tensionId);
    const hospitalityOpt = findOption("hospitality", selections.hospitality);
    const facilitationOpt = findOption("facilitation", selections.facilitation);

    return {
      title: "The " + titleCore,
      pills: [
        { label: "Setting", value: settingOpt.title },
        { label: "Focus", value: tensionOpt.title },
        { label: "Hospitality", value: hospitalityOpt.title },
        { label: "Facilitation", value: facilitationOpt.title },
      ],
      specs: [
        { label: "Recommended Setting", value: settingOpt.title, sub: settingOpt.desc },
        { label: "Intellectual Lead", value: facilitationOpt.title, sub: facilitationOpt.desc },
        { label: "Key Monday Deliverable", value: DELIVERABLE_MATRIX[tensionId] || "Tailored Operating Brief", sub: tensionOpt.desc },
        { label: "Hospitality Model", value: hospitalityOpt.title, sub: hospitalityOpt.desc },
      ],
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
      .map(function (opt) {
        const isSelected = opt.id === selectedId;
        return (
          '<button type="button" class="scorecard-option' + (isSelected ? " selected" : "") + '" data-option-id="' + opt.id + '" aria-pressed="' + isSelected + '">' +
          '<span class="sc-option-num">' + opt.num + " &middot;</span>" +
          '<span class="sc-option-body">' +
          '<span class="sc-option-title">' + opt.title + "</span>" +
          (opt.meta ? '<span class="sc-option-meta">' + opt.meta + "</span>" : "") +
          '<span class="sc-option-desc">' + opt.desc + "</span>" +
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
     which exist by this point). Pre-selects the matching team archetype for
     Step 1 and jumps straight to Step 2 (tension), rather than just
     scrolling to an empty configurator. The #formats markup (v17) now calls
     this with the archetype id directly ("cofounders" / "csuite" /
     "scaleup"), the same ids STEPS[0]'s options already use, so there is no
     longer a separate format-key-to-archetype lookup table to keep in sync.
     ----------------------------------------------------------------------- */
  const VALID_ARCHETYPES = ["cofounders", "csuite", "scaleup"];

  window.selectFormatAndScroll = function (archetypeId) {
    if (VALID_ARCHETYPES.indexOf(archetypeId) !== -1) {
      state.selections = { archetype: archetypeId };
      state.stepIndex = 1;
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

  function renderLeadForm(bp) {
    const wrap = document.getElementById("lead-form-wrap");
    wrap.innerHTML =
      '<form id="lead-form" class="debrief-form" name="offsite-blueprint" method="POST" data-netlify="true" netlify-honeypot="bot-field" style="border-top:1px solid var(--hairline-color); padding-top:28px; margin-top:8px;">' +
      '<input type="hidden" name="form-name" value="offsite-blueprint">' +
      '<p style="position:absolute; left:-9999px;"><label>Do not fill this out: <input name="bot-field"></label></p>' +
      '<input type="hidden" name="blueprint_title" value="' + bp.title + '">' +
      '<input type="hidden" name="selection_archetype" value="' + (state.selections.archetype || "") + '">' +
      '<input type="hidden" name="selection_tension" value="' + (state.selections.tension || "") + '">' +
      '<input type="hidden" name="selection_setting" value="' + (state.selections.setting || "") + '">' +
      '<input type="hidden" name="selection_hospitality" value="' + (state.selections.hospitality || "") + '">' +
      '<input type="hidden" name="selection_facilitation" value="' + (state.selections.facilitation || "") + '">' +
      '<div class="field-row">' +
      '<div class="field"><label>Work Email *</label><input type="email" name="email" required placeholder="you@company.com"></div>' +
      '<div class="field"><label>Full Name *</label><input type="text" name="name" required placeholder="Full name"></div>' +
      "</div>" +
      '<div class="field-row">' +
      '<div class="field"><label>Role / Title *</label>' +
      '<div class="select-shell"><select name="role" required>' +
      '<option value="">Select a role</option>' +
      '<option value="Founder / CEO">Founder / CEO</option>' +
      '<option value="C-Suite / VP">C-Suite / VP</option>' +
      '<option value="Head of People / HR">Head of People / HR</option>' +
      '<option value="Chief of Staff">Chief of Staff</option>' +
      '<option value="Investor / Board">Investor / Board</option>' +
      '<option value="Other">Other</option>' +
      "</select></div></div>" +
      '<div class="field"><label>Company Name *</label><input type="text" name="company" required placeholder="Company"></div>' +
      "</div>" +
      '<div class="field-row">' +
      '<div class="field"><label>Target Quarter *</label>' +
      '<div class="select-shell"><select name="timeline" required>' +
      '<option value="">Select a timeframe</option>' +
      '<option value="Q1 2027">Q1 2027</option>' +
      '<option value="Q2 2027">Q2 2027</option>' +
      '<option value="Q3 2027">Q3 2027</option>' +
      '<option value="Q4 2027">Q4 2027</option>' +
      '<option value="Specific dates in mind">Specific dates in mind</option>' +
      "</select></div></div>" +
      '<div class="field"><label>Approximate Budget *</label>' +
      '<div class="select-shell"><select name="budget" required>' +
      '<option value="">Select a range</option>' +
      '<option value="&lt; €15,000">&lt; €15,000</option>' +
      '<option value="€15,000 – €30,000">€15,000 – €30,000</option>' +
      '<option value="€30,000 – €60,000">€30,000 – €60,000</option>' +
      '<option value="€60,000 – €100,000">€60,000 – €100,000</option>' +
      '<option value="€100,000 – €150,000+">€100,000 – €150,000+</option>' +
      '<option value="Undecided / Need guidance">Undecided / Need guidance</option>' +
      "</select></div></div>" +
      "</div>" +
      '<button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Reserve Dates &amp; Request Tailored Brief</button>' +
      '<p class="debrief-form-microcopy">We limit engagements each quarter to protect delivery quality. Sven &amp; Farid personally review all briefs within 24 business hours.</p>' +
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

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    if (errorEl) errorEl.hidden = true;

    const endpoint = FORM_WEBHOOK_URL || "/";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFormData(form),
    })
      .then(function () { showConfirmation(); })
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
      "<p>Sven and Farid personally review every brief. Expect a reply within 24 business hours with your tailored PDF and next steps.</p>" +
      "</div>";
  }

  renderStep();
});
