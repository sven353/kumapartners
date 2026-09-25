// Kuma Partners — shared site behavior (FAQ accordion + cookie consent banner)
// Vanilla JS, no dependencies.

document.addEventListener('DOMContentLoaded', function () {

  // --- Sticky header scroll state ---
  var siteHeader = document.querySelector('header.site');
  if (siteHeader) {
    function updateHeaderScrollState() {
      siteHeader.classList.toggle('scrolled', window.scrollY > 8);
    }
    updateHeaderScrollState();
    window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  }

  // --- Case studies tab switcher (cross-fade) ---
  var caseTabs = document.querySelectorAll('.case-tab');
  var casePanels = document.querySelectorAll('.case-docket-panel');
  if (caseTabs.length && casePanels.length) {
    function activateCase(key) {
      caseTabs.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-case') === key);
      });
      casePanels.forEach(function (panel) {
        if (panel.getAttribute('data-case-panel') === key) {
          panel.hidden = false;
          panel.classList.remove('is-active');
          // Double rAF: let the browser paint the "just un-hidden, opacity 0" frame first,
          // so the class change below actually transitions instead of being coalesced away.
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { panel.classList.add('is-active'); });
          });
        } else {
          panel.classList.remove('is-active');
          panel.hidden = true;
        }
      });
    }
    caseTabs.forEach(function (btn) {
      btn.addEventListener('click', function () { activateCase(btn.getAttribute('data-case')); });
    });
  }

  // --- Engagements / Offsites / AI Leadership Transition tab switcher ---
  var engageTabs = [
    { key: 'advisory', btn: document.getElementById('tab-advisory-btn'), panel: document.querySelector('[data-engage-panel="advisory"]') },
    { key: 'offsites', btn: document.getElementById('tab-offsites-btn'), panel: document.querySelector('[data-engage-panel="offsites"]') },
    { key: 'ai-transition', btn: document.getElementById('tab-ai-transition-btn'), panel: document.querySelector('[data-engage-panel="ai-transition"]') }
  ];
  var engageTabsReady = engageTabs.every(function (tab) { return tab.btn && tab.panel; });

  if (engageTabsReady) {
    function activateEngageTab(which) {
      engageTabs.forEach(function (tab) {
        var isActive = tab.key === which;
        tab.panel.hidden = !isActive;
        tab.btn.classList.toggle('active', isActive);
        tab.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    engageTabs.forEach(function (tab) {
      tab.btn.addEventListener('click', function () { activateEngageTab(tab.key); });
    });

    // Keep the tab switcher in sync with #engagements / #offsites / #tier-1..3 / #ai-transition /
    // #tier-ai-1..3 links (header nav dropdown, deep links). The target panel must be un-hidden
    // before it can be scrolled to, so the browser's own native jump-on-load silently fails when
    // the hash points into a hidden panel — re-do it ourselves once the right panel is visible
    // (instant on load, smooth on later in-page clicks, including a dropdown link clicked while
    // already on the page).
    function routeEngageHash(scrollBehavior) {
      var hash = window.location.hash.replace('#', '');
      if (!hash) return;
      var which;
      if (hash === 'offsites') {
        which = 'offsites';
      } else if (hash === 'engagements' || hash === 'tier-1' || hash === 'tier-2' || hash === 'tier-3') {
        which = 'advisory';
      } else if (hash === 'ai-transition' || hash === 'tier-ai-1' || hash === 'tier-ai-2' || hash === 'tier-ai-3') {
        which = 'ai-transition';
      } else {
        return;
      }
      activateEngageTab(which);
      if (scrollBehavior) {
        var target = document.getElementById(hash);
        if (target) target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }
    }

    routeEngageHash('auto'); // sync tab + jump instantly on initial load, matching the native (failed) jump
    window.addEventListener('hashchange', function () { routeEngageHash('smooth'); });
  }

  // --- Mobile nav toggle + Engagements accordion ---
  if (siteHeader) {
    var navToggle = siteHeader.querySelector('.nav-toggle');
    var navLinks = siteHeader.querySelector('.nav-links');
    var iconMenu = siteHeader.querySelector('.nav-toggle .icon-menu');
    var iconClose = siteHeader.querySelector('.nav-toggle .icon-close');

    // SVG elements don't reflect the `.hidden` IDL property to the attribute in every browser,
    // so toggle the actual attribute directly rather than the (unreliable, for <svg>) JS property.
    function setSvgHidden(el, isHidden) {
      if (!el) return;
      if (isHidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden');
    }

    function closeMobileNav() {
      siteHeader.classList.remove('nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      setSvgHidden(iconMenu, false);
      setSvgHidden(iconClose, true);
      var openDropdown = siteHeader.querySelector('.nav-item-dropdown.nav-dropdown-open');
      if (openDropdown) openDropdown.classList.remove('nav-dropdown-open');
    }

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var isOpen = siteHeader.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        setSvgHidden(iconMenu, isOpen);
        setSvgHidden(iconClose, !isOpen);
      });
    }

    // Engagements dropdown: click-to-expand on mobile, hover/focus handles desktop via CSS.
    var dropdownItem = siteHeader.querySelector('.nav-item-dropdown');
    var dropdownTrigger = siteHeader.querySelector('.nav-dropdown-trigger');
    if (dropdownItem && dropdownTrigger) {
      dropdownTrigger.addEventListener('click', function () {
        if (window.innerWidth > 860) return; // desktop uses hover/focus
        var isOpen = dropdownItem.classList.toggle('nav-dropdown-open');
        dropdownTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Close the mobile menu after choosing a link.
    if (navLinks) {
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMobileNav);
      });
    }

    // Close on outside click, Escape, or resize past the mobile breakpoint.
    document.addEventListener('click', function (e) {
      if (siteHeader.classList.contains('nav-open') && !siteHeader.contains(e.target)) closeMobileNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && siteHeader.classList.contains('nav-open')) closeMobileNav();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && siteHeader.classList.contains('nav-open')) closeMobileNav();
    });
  }

  // --- Scrollspy: highlight the nav item for whichever section is currently in view ---
  // Nav items are a mix of plain <a href="#id"> links and the Engagements dropdown's
  // <button data-nav-section="engagements">, so matching falls back to the data attribute
  // when there's no href. A JS-only virtual anchor like #offsites (a hidden tab panel
  // inside #engagements, not its own top-level section) is never one of the observed
  // targets below, so it can't fight the #engagements highlight.
  (function () {
    var spySections = document.querySelectorAll('section[id]');
    var spyNavLinks = document.querySelectorAll('.nav-links .nav-link');
    if (!spySections.length || !spyNavLinks.length || typeof IntersectionObserver === 'undefined') return;

    function activateNavFor(id) {
      spyNavLinks.forEach(function (link) {
        var target = link.getAttribute('href') || link.getAttribute('data-nav-section');
        var isMatch = target === ('#' + id) || target === id;
        link.classList.toggle('active', isMatch);
        if (isMatch) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) activateNavFor(entry.target.id);
      });
    }, {
      root: null,
      rootMargin: '-20% 0px -65% 0px', // active band: top 20% to top 35% of the viewport
      threshold: 0
    });

    spySections.forEach(function (section) { spyObserver.observe(section); });
  })();

  // --- Scroll reveal: subtle fade + rise for .reveal-on-scroll elements as they enter view ---
  (function () {
    var revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (!revealEls.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  })();

  // --- FAQ accordion ---
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      faqItems.forEach(function (i) { i.classList.remove('open'); i.querySelector('.faq-question').setAttribute('aria-expanded', 'false'); });
      if (!wasOpen) {
        item.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // --- FAQ "view all" toggle: questions 5-14 are always present in the static HTML
  // (crawlers/GEO see all 14 regardless of JS), this just shows/hides them for visitors.
  var faqExtended = document.getElementById('faq-extended');
  var faqToggle = document.getElementById('faq-toggle');
  if (faqExtended && faqToggle) {
    var faqToggleText = faqToggle.querySelector('[data-faq-toggle-text]');
    var faqToggleArrow = faqToggle.querySelector('[data-faq-toggle-arrow]');
    faqToggle.addEventListener('click', function () {
      var isOpen = faqExtended.classList.toggle('open');
      faqToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (faqToggleText) faqToggleText.textContent = isOpen ? 'Show fewer questions' : 'View all 14 questions';
      if (faqToggleArrow) faqToggleArrow.textContent = isOpen ? '↑' : '↓';
    });
  }

  // --- Cookie consent banner ---
  var COOKIE_KEY = 'kuma_cookie_consent';
  var banner = document.getElementById('cookie-banner');
  if (banner) {
    var stored = null;
    try { stored = localStorage.getItem(COOKIE_KEY); } catch (e) { stored = null; }

    if (!stored) {
      // Small delay so it doesn't flash before the page has painted.
      setTimeout(function () { banner.classList.add('show'); }, 400);
    }

    var acceptBtn = document.getElementById('cookie-accept');
    var essentialBtn = document.getElementById('cookie-essential');

    function dismiss(choice) {
      try { localStorage.setItem(COOKIE_KEY, choice); } catch (e) { /* private browsing or blocked storage: banner may reappear, that's fine */ }
      banner.classList.remove('show');
    }

    if (acceptBtn) acceptBtn.addEventListener('click', function () { dismiss('all'); });
    if (essentialBtn) essentialBtn.addEventListener('click', function () { dismiss('essential'); });

    document.querySelectorAll('[data-cookie-preferences]').forEach(function (btn) {
      btn.addEventListener('click', function () { banner.classList.add('show'); });
    });
  }

  // --- Tier 1 & Tier 2 interactive timeline / phases drawers (mutually exclusive) ---
  (function () {
    var drawerConfigs = [
      { drawer: document.getElementById('scan-timeline-drawer'), triggerAttr: 'data-scan-timeline-toggle' },
      { drawer: document.getElementById('sprint-phases-drawer'), triggerAttr: 'data-sprint-drawer-toggle' }
    ].filter(function (cfg) { return !!cfg.drawer; });

    if (!drawerConfigs.length) return;

    drawerConfigs.forEach(function (cfg) {
      cfg.triggers = document.querySelectorAll('[' + cfg.triggerAttr + ']');
    });

    function setDrawerOpen(cfg, isOpen) {
      cfg.drawer.classList.toggle('open', isOpen);
      cfg.drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      cfg.triggers.forEach(function (btn) {
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        var arrow = btn.querySelector('[data-toggle-arrow]');
        if (arrow) arrow.textContent = isOpen ? '↑' : '↓';
      });
    }

    drawerConfigs.forEach(function (cfg) {
      var anchor = cfg.triggers[0];
      cfg.triggers.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var willOpen = !cfg.drawer.classList.contains('open');

          // Keep drawers mutually exclusive: opening one collapses any other that's open.
          drawerConfigs.forEach(function (other) {
            if (other !== cfg) setDrawerOpen(other, false);
          });

          setDrawerOpen(cfg, willOpen);

          if (willOpen) {
            setTimeout(function () {
              cfg.drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 320);
          } else if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });
    });
  })();

  // --- Shared helper: URL-encode a form's fields for a Netlify Forms AJAX POST ---
  function encodeFormData(form) {
    return Array.prototype.map.call(form.elements, function (el) {
      if (!el.name || el.disabled) return '';
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return '';
      return encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value);
    }).filter(Boolean).join('&');
  }

  // --- Shared helper: wire a Netlify form to submit via fetch() with inline success/error states ---
  // `validate`, if given, runs before the network request; returning false aborts the submit
  // (used by the scan form to block free-email domains without duplicating this whole flow).
  function wireAjaxForm(form, successEl, errorEl, onSuccess, validate) {
    if (!form) return;
    var submitBtn = form.querySelector('[data-contact-submit], [data-debrief-submit], [data-scan-submit]');
    var btnLabel = submitBtn ? submitBtn.querySelector('[data-btn-label]') : null;
    var originalBtnText = btnLabel ? btnLabel.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof validate === 'function' && !validate()) return;
      if (errorEl) errorEl.hidden = true;
      if (submitBtn) submitBtn.disabled = true;
      if (btnLabel) btnLabel.textContent = 'Sending…';

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData(form)
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        form.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          successEl.focus();
        }
        if (typeof onSuccess === 'function') onSuccess();
      }).catch(function () {
        if (submitBtn) submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = originalBtnText;
        if (errorEl) errorEl.hidden = false;
      });
    });
  }

  // --- Contact form: AJAX submit to Netlify Forms with inline success/error states ---
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    var contactShell = contactForm.closest('.contact-form-shell');
    var contactSuccess = contactShell ? contactShell.querySelector('[data-contact-success]') : null;
    var contactError = contactForm.querySelector('[data-contact-error]');
    wireAjaxForm(contactForm, contactSuccess, contactError);
  }

  // --- Investor CTA: pre-select the contact form's "What's your role?" field ---
  function selectInvestorPersona() {
    var roleSelect = document.getElementById('role');
    if (roleSelect) roleSelect.value = 'investor';
    var contactSection = document.getElementById('contact');
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
  }
  if (window.location.hash === '#contact-investor') {
    selectInvestorPersona();
  }
  document.querySelectorAll('[data-investor-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectInvestorPersona();
    });
  });

  // --- Executive Briefing CTA (from partners.html): bring the role field into focus ---
  function focusBriefingPersona() {
    var contactSection = document.getElementById('contact');
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    var roleSelect = document.getElementById('role');
    if (roleSelect) {
      setTimeout(function () { roleSelect.focus(); }, 400);
    }
  }
  if (window.location.hash === '#contact-briefing') {
    focusBriefingPersona();
  }
  document.querySelectorAll('[data-briefing-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      focusBriefingPersona();
    });
  });

  // --- Offsite module CTA: pre-select the contact form's "What brought you here?" field ---
  document.querySelectorAll('[data-offsite-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var broughtHereSelect = document.getElementById('brought-here');
      if (broughtHereSelect) {
        broughtHereSelect.value = 'We need a high-stakes leadership offsite';
        broughtHereSelect.dispatchEvent(new Event('change'));
      }
      var contactSection = document.getElementById('contact');
      if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // --- Leadership Friction Diagnostic ---
  var scorecard = document.getElementById('scorecard-widget');
  if (scorecard) {
    var QUESTION_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    var SCORED_QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    var SCORE_MAP = { low: 1, moderate: 2, acute: 3 };
    var LEVEL_CLASS = { 1: 'optimal', 2: 'moderate', 3: 'high' };
    var VELOCITY_LABELS = { 1: 'High', 2: 'At Risk', 3: 'Stalled' };
    var CANDOR_LABELS = { 1: 'Transparent', 2: 'Guarded', 3: 'Fragmented' };
    var GOVERNANCE_LABELS = { 1: 'Unified', 2: 'Politicized', 3: 'Fractured' };
    var BADGE_COPY = {
      optimal: 'OPTIMAL DECISION VELOCITY',
      moderate: 'MODERATE EXECUTION DRAG',
      high: 'HIGH LEADERSHIP FRICTION'
    };
    var CTA_COPY = {
      founder: 'Initiate a 14-Day Friction Scan to Fix This',
      investor: 'Request a Confidential Portfolio Debrief'
    };
    var SYNTHESIS_COPY = {
      founder: {
        optimal: "Your responses point to a leadership team moving fast, with clear ownership and low unspoken tension. That's rare at any stage, and worth protecting deliberately as you scale. The patterns that quietly erode this later usually start exactly where you are now.",
        moderate: "Your responses point to real, measurable drag: decisions that take longer than they should, tension that gets managed rather than resolved. This is the exact profile our 14-Day Friction Scan is built to catch early, before it costs a hire, a round, or a co-founder.",
        high: "Your responses indicate a leadership team experiencing acute decision latency and structural misalignments. Left unaddressed, this pattern stalls strategic momentum, burns out founders, and erodes runway. This is the exact inflection point our 14-Day Friction Scan and Alignment Sprint are built to resolve."
      },
      investor: {
        optimal: "Your answers describe a portfolio company with fast decision velocity and low executive friction, a genuine asset heading into its next growth phase. Worth protecting deliberately as headcount and board pressure scale.",
        moderate: "Your answers point to emerging friction: decisions that take longer than they should, tension that's managed rather than resolved. Left alone at scale, this is the pattern that quietly erodes execution velocity well before it shows up in the numbers.",
        high: "Your answers reflect significant executive friction that risks leaking into board milestones, hiring retention, and delivery timelines. Kuma Partners acts as a senior operator intervention to resolve leadership drag while fully preserving founder trust."
      }
    };

    var answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null };
    var respondent = { email: '', company: '', mode: 'founder' };
    var progressWrap = scorecard.querySelector('.scorecard-progress');
    var progressText = scorecard.querySelector('[data-progress-text]');
    var progressFill = scorecard.querySelector('[data-progress-fill]');
    var navRow = scorecard.querySelector('.sc-nav-row');
    var backBtn = scorecard.querySelector('[data-back-btn]');
    var BACK_TARGET = { q2: 'q1', q3: 'q2', q4: 'q3', q5: 'q4', q6: 'q5', q7: 'q6', gate: 'q7' };

    function setSelectValueByText(select, text) {
      if (!select) return;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].text === text) {
          select.value = select.options[i].value || text;
          select.dispatchEvent(new Event('change'));
          return;
        }
      }
    }

    function applyLens() {
      var isFounder = respondent.mode === 'founder';
      scorecard.querySelectorAll('[data-lens-founder]').forEach(function (el) { el.hidden = !isFounder; });
      scorecard.querySelectorAll('[data-lens-investor]').forEach(function (el) { el.hidden = isFounder; });
    }

    function showStep(stepId) {
      var steps = scorecard.querySelectorAll('.sc-step');
      steps.forEach(function (el) { el.hidden = el.getAttribute('data-step') !== stepId; });

      var qIndex = QUESTION_ORDER.indexOf(stepId);
      var isLensStep = stepId === 'lens';
      if (progressWrap) {
        progressWrap.hidden = qIndex === -1 && !isLensStep;
        if (qIndex !== -1) {
          if (progressText) progressText.textContent = 'Step ' + (qIndex + 1) + ' of ' + QUESTION_ORDER.length;
          if (progressFill) progressFill.style.width = (((qIndex + 1) / QUESTION_ORDER.length) * 100) + '%';
        } else if (isLensStep) {
          if (progressText) progressText.textContent = '';
          if (progressFill) progressFill.style.width = '0%';
        }
      }

      var canGoBack = Object.prototype.hasOwnProperty.call(BACK_TARGET, stepId);
      if (navRow) navRow.hidden = !canGoBack;
      if (backBtn) backBtn.hidden = !canGoBack;
    }

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        var current = scorecard.querySelector('.sc-step:not([hidden])');
        var currentId = current ? current.getAttribute('data-step') : null;
        var target = BACK_TARGET[currentId];
        if (!target) return;

        showStep(target);

        var targetStep = scorecard.querySelector('.sc-step[data-step="' + target + '"]');
        if (targetStep) {
          targetStep.querySelectorAll('.scorecard-option').forEach(function (o) { o.classList.remove('selected'); });
          var prevValue = answers[target];
          if (prevValue) {
            var match = targetStep.querySelector('.scorecard-option[data-value="' + prevValue + '"]');
            if (match) match.classList.add('selected');
          }
        }
      });
    }

    var startBtn = scorecard.querySelector('[data-start]');
    if (startBtn) startBtn.addEventListener('click', function () { showStep('lens'); });

    var lensStep = scorecard.querySelector('.sc-step[data-step="lens"]');
    if (lensStep) {
      var lensOptions = lensStep.querySelectorAll('[data-mode]');
      lensOptions.forEach(function (opt) {
        opt.addEventListener('click', function () {
          lensOptions.forEach(function (o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          respondent.mode = opt.getAttribute('data-mode');
          applyLens();
          setTimeout(function () { showStep('q1'); }, 250);
        });
      });
    }

    QUESTION_ORDER.forEach(function (qid) {
      var step = scorecard.querySelector('.sc-step[data-step="' + qid + '"]');
      if (!step) return;
      var options = step.querySelectorAll('.scorecard-option');
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          options.forEach(function (o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          answers[qid] = opt.getAttribute('data-value');
          setTimeout(function () {
            var idx = QUESTION_ORDER.indexOf(qid);
            var next = idx < QUESTION_ORDER.length - 1 ? QUESTION_ORDER[idx + 1] : 'gate';
            showStep(next);
          }, 300);
        });
      });
    });

    function computeResults() {
      var sum = SCORED_QUESTIONS.reduce(function (total, qid) { return total + (SCORE_MAP[answers[qid]] || 0); }, 0);
      var pct = Math.round(((sum - SCORED_QUESTIONS.length) / (SCORED_QUESTIONS.length * 2)) * 100);
      pct = Math.max(0, Math.min(100, pct));
      var tier = pct < 35 ? 'optimal' : (pct <= 65 ? 'moderate' : 'high');

      var velocityLevel = SCORE_MAP[answers.q2] || 1;
      var candorLevel = Math.round(((SCORE_MAP[answers.q1] || 1) + (SCORE_MAP[answers.q4] || 1) + (SCORE_MAP[answers.q5] || 1)) / 3);
      var governanceLevel = Math.round(((SCORE_MAP[answers.q3] || 1) + (SCORE_MAP[answers.q6] || 1)) / 2);

      return { pct: pct, tier: tier, velocityLevel: velocityLevel, candorLevel: candorLevel, governanceLevel: governanceLevel };
    }

    function paintSubmetric(key, level, labels) {
      var valueEl = scorecard.querySelector('[data-submetric="' + key + '"]');
      if (!valueEl) return;
      var levelClass = LEVEL_CLASS[level] || 'optimal';
      valueEl.textContent = labels[level] || labels[1];
      valueEl.className = 'sc-submetric-value ' + levelClass;
      var wrapper = valueEl.closest('.sc-submetric');
      if (wrapper) {
        var ticks = wrapper.querySelectorAll('.sc-submetric-tick');
        ticks.forEach(function (tick, i) {
          tick.className = 'sc-submetric-tick' + (i < level ? ' on-' + levelClass : '');
        });
      }
    }

    function renderResults() {
      var results = computeResults();

      var badge = scorecard.querySelector('[data-score-badge]');
      if (badge) {
        badge.className = 'sc-score-badge sc-badge-' + results.tier;
        badge.textContent = BADGE_COPY[results.tier];
      }

      var headline = scorecard.querySelector('[data-score-headline]');
      if (headline) {
        var label = respondent.mode === 'founder' ? 'Executive Drag Index' : 'Portfolio Risk Index';
        headline.textContent = label + ': ' + results.pct + '/100';
      }

      paintSubmetric('velocity', results.velocityLevel, VELOCITY_LABELS);
      paintSubmetric('candor', results.candorLevel, CANDOR_LABELS);
      paintSubmetric('governance', results.governanceLevel, GOVERNANCE_LABELS);

      var synthesisEl = scorecard.querySelector('[data-synthesis]');
      if (synthesisEl) synthesisEl.textContent = (SYNTHESIS_COPY[respondent.mode] || SYNTHESIS_COPY.founder)[results.tier];

      var ctaBtn = scorecard.querySelector('[data-scorecard-cta]');
      if (ctaBtn) ctaBtn.textContent = CTA_COPY[respondent.mode] || CTA_COPY.founder;

      return results;
    }

    var gateForm = scorecard.querySelector('[data-gate-form]');
    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('sc-email');
        var companyInput = document.getElementById('sc-company');
        respondent.email = emailInput ? emailInput.value.trim() : '';
        respondent.company = companyInput ? companyInput.value.trim() : '';
        if (!respondent.email || !respondent.company) return;

        renderResults();
        showStep('result');
      });
    }

    var ctaBtn = scorecard.querySelector('[data-scorecard-cta]');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function () {
        var emailField = document.getElementById('email');
        var companyField = document.getElementById('company');
        var roleField = document.getElementById('role');
        var journeyField = document.getElementById('journey');
        var broughtHereField = document.getElementById('brought-here');

        if (emailField) emailField.value = respondent.email;
        if (companyField) companyField.value = respondent.company;
        if (roleField) roleField.value = respondent.mode;

        var journeyText = { seed: 'Seed / Series A', seriesbc: 'Series B / Series C', growth: 'Growth / PE-backed' }[answers.q7];
        if (journeyText) setSelectValueByText(journeyField, journeyText);

        var results = computeResults();
        var maxLevel = Math.max(results.velocityLevel, results.candorLevel, results.governanceLevel);
        var broughtHereText = 'Decisions are getting stuck';
        if (results.governanceLevel === maxLevel) broughtHereText = 'Board / CEO / governance dynamics need attention';
        else if (results.candorLevel === maxLevel) broughtHereText = 'Co-founder or C-suite alignment is breaking down';
        else if (results.velocityLevel === maxLevel) broughtHereText = 'Decisions are getting stuck';
        setSelectValueByText(broughtHereField, broughtHereText);

        var contactSection = document.getElementById('contact');
        if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    var restartLink = scorecard.querySelector('[data-scorecard-restart]');
    if (restartLink) {
      restartLink.addEventListener('click', function (e) {
        e.preventDefault();
        answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null };
        respondent.mode = 'founder';
        scorecard.querySelectorAll('.scorecard-option').forEach(function (o) { o.classList.remove('selected'); });
        var gateFormEl = scorecard.querySelector('[data-gate-form]');
        if (gateFormEl) gateFormEl.reset();
        applyLens();
        showStep('intro');
      });
    }

    applyLens();
  }

  // --- Qualifying booking modal/drawer ---
  var scanOverlay = document.getElementById('scan-modal-overlay');
  if (scanOverlay) {
    var scanModal = scanOverlay.querySelector('.scan-modal');
    var scanForm = scanOverlay.querySelector('[data-scan-form]');
    var scanCloseBtns = scanOverlay.querySelectorAll('[data-scan-close]');
    var scanEmailInput = document.getElementById('scan-email');
    var scanEmailError = scanOverlay.querySelector('[data-scan-email-error]');
    var scanSuccess = scanOverlay.querySelector('[data-scan-success]');
    var scanError = scanOverlay.querySelector('[data-scan-error]');
    var scanSubmitBtn = scanOverlay.querySelector('[data-scan-submit]');
    var scanBtnLabel = scanSubmitBtn ? scanSubmitBtn.querySelector('[data-btn-label]') : null;
    var scanOriginalBtnText = scanBtnLabel ? scanBtnLabel.textContent : '';
    var FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'proton.me', 'protonmail.com'];
    var lastFocusedEl = null;

    function isFormPartiallyFilled() {
      var fields = scanOverlay.querySelectorAll('input:not([type="hidden"]), select');
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].type === 'select-one') { if (fields[i].selectedIndex > 0) return true; }
        else if (fields[i].value && fields[i].value.trim() !== '') return true;
      }
      return false;
    }

    function getFocusable() {
      return Array.prototype.slice.call(
        scanModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    }

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      var focusable = getFocusable();
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { attemptClose(false); }
      else { trapFocus(e); }
    }

    function openModal(triggerEl) {
      lastFocusedEl = triggerEl || document.activeElement;
      scanOverlay.classList.add('open');
      scanOverlay.hidden = false;
      document.body.classList.add('scan-modal-locked');
      document.addEventListener('keydown', onKeydown);
      setTimeout(function () {
        var focusable = getFocusable();
        if (focusable.length) focusable[0].focus();
      }, 50);
    }

    function resetState() {
      if (scanForm) {
        scanForm.reset();
        scanForm.hidden = false;
      }
      if (scanSuccess) scanSuccess.hidden = true;
      if (scanError) scanError.hidden = true;
      if (scanEmailError) scanEmailError.classList.remove('show');
      if (scanSubmitBtn) scanSubmitBtn.disabled = false;
      if (scanBtnLabel) scanBtnLabel.textContent = scanOriginalBtnText;
    }

    function attemptClose(force) {
      if (!force && scanForm && !scanForm.hidden && isFormPartiallyFilled()) {
        var stay = !window.confirm('Save your spot? Closing now will lose what you\'ve entered.');
        if (stay) return;
      }
      scanOverlay.classList.remove('open');
      document.body.classList.remove('scan-modal-locked');
      document.removeEventListener('keydown', onKeydown);
      setTimeout(function () { scanOverlay.hidden = true; resetState(); }, 260);
      if (lastFocusedEl) lastFocusedEl.focus();
    }

    document.querySelectorAll('[data-open-scan-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn); });
    });

    scanCloseBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { attemptClose(true); });
    });

    scanOverlay.addEventListener('click', function (e) {
      if (e.target === scanOverlay) attemptClose(false);
    });

    if (scanEmailInput && scanEmailError) {
      scanEmailInput.addEventListener('input', function () { scanEmailError.classList.remove('show'); });
    }

    function scanValidateEmail() {
      var email = scanEmailInput.value.trim();
      var domain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
      if (FREE_EMAIL_DOMAINS.indexOf(domain) !== -1) {
        if (scanEmailError) scanEmailError.classList.add('show');
        scanEmailInput.focus();
        return false;
      }
      return true;
    }

    wireAjaxForm(scanForm, scanSuccess, scanError, null, scanValidateEmail);
  }

  // --- Partner Debrief modal (Tier 3 diagnostic dossier form) ---
  var debriefOverlay = document.getElementById('debrief-modal-overlay');
  if (debriefOverlay) {
    var debriefModal = debriefOverlay.querySelector('.debrief-modal');
    var debriefIntro = debriefOverlay.querySelector('.debrief-modal-intro');
    var debriefForm = debriefOverlay.querySelector('[data-debrief-form]');
    var debriefCloseBtns = debriefOverlay.querySelectorAll('[data-debrief-close]');
    var debriefSuccess = debriefOverlay.querySelector('[data-debrief-success]');
    var debriefError = debriefOverlay.querySelector('[data-debrief-error]');
    var debriefSubmitBtn = debriefOverlay.querySelector('[data-debrief-submit]');
    var debriefBtnLabel = debriefSubmitBtn ? debriefSubmitBtn.querySelector('[data-btn-label]') : null;
    var debriefOriginalBtnText = debriefBtnLabel ? debriefBtnLabel.textContent : '';
    var debriefLastFocusedEl = null;

    function debriefIsPartiallyFilled() {
      var fields = debriefOverlay.querySelectorAll('input:not([type="hidden"]), select, textarea');
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].type === 'select-one') { if (fields[i].selectedIndex > 0) return true; }
        else if (fields[i].value && fields[i].value.trim() !== '') return true;
      }
      return false;
    }

    function debriefGetFocusable() {
      return Array.prototype.slice.call(
        debriefModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    }

    function debriefTrapFocus(e) {
      if (e.key !== 'Tab') return;
      var focusable = debriefGetFocusable();
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function debriefOnKeydown(e) {
      if (e.key === 'Escape') { debriefAttemptClose(false); }
      else { debriefTrapFocus(e); }
    }

    function debriefOpenModal(triggerEl) {
      debriefLastFocusedEl = triggerEl || document.activeElement;
      debriefOverlay.classList.add('open');
      debriefOverlay.hidden = false;
      document.body.classList.add('debrief-modal-locked');
      document.addEventListener('keydown', debriefOnKeydown);
      setTimeout(function () {
        var focusable = debriefGetFocusable();
        if (focusable.length) focusable[0].focus();
      }, 50);
    }

    function debriefResetState() {
      if (debriefForm) {
        debriefForm.reset();
        debriefForm.hidden = false;
      }
      if (debriefIntro) debriefIntro.hidden = false;
      if (debriefSuccess) debriefSuccess.hidden = true;
      if (debriefError) debriefError.hidden = true;
      if (debriefSubmitBtn) debriefSubmitBtn.disabled = false;
      if (debriefBtnLabel) debriefBtnLabel.textContent = debriefOriginalBtnText;
      var body = debriefOverlay.querySelector('.debrief-modal-body');
      if (body) body.scrollTop = 0;
    }

    function debriefAttemptClose(force) {
      if (!force && debriefForm && !debriefForm.hidden && debriefIsPartiallyFilled()) {
        var stay = !window.confirm('Discard your notes? Closing now will lose what you\'ve entered.');
        if (stay) return;
      }
      debriefOverlay.classList.remove('open');
      document.body.classList.remove('debrief-modal-locked');
      document.removeEventListener('keydown', debriefOnKeydown);
      setTimeout(function () {
        debriefOverlay.hidden = true;
        debriefResetState();
      }, 260);
      if (debriefLastFocusedEl) debriefLastFocusedEl.focus();
    }

    document.querySelectorAll('[data-open-debrief-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () { debriefOpenModal(btn); });
    });

    debriefCloseBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { debriefAttemptClose(true); });
    });

    debriefOverlay.addEventListener('click', function (e) {
      if (e.target === debriefOverlay) debriefAttemptClose(false);
    });

    wireAjaxForm(debriefForm, debriefSuccess, debriefError, function () {
      if (debriefIntro) debriefIntro.hidden = true;
    });
  }

  // Offsite proof strip: two-view paginated image mosaic
  (function () {
    var prevBtn = document.querySelector('[data-offsite-prev]');
    var nextBtn = document.querySelector('[data-offsite-next]');
    var pageLabel = document.querySelector('[data-offsite-page]');
    var views = document.querySelectorAll('.offsite-proof-grid[data-offsite-view]');
    if (!prevBtn || !nextBtn || !views.length) return;

    var total = views.length;
    var current = 1;

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function render() {
      views.forEach(function (view) {
        view.hidden = Number(view.getAttribute('data-offsite-view')) !== current;
      });
      if (pageLabel) pageLabel.textContent = '[ ' + pad(current) + ' / ' + pad(total) + ' ]';
      prevBtn.disabled = current === 1;
      nextBtn.disabled = current === total;
    }

    prevBtn.addEventListener('click', function () {
      if (current > 1) { current -= 1; render(); }
    });
    nextBtn.addEventListener('click', function () {
      if (current < total) { current += 1; render(); }
    });

    render();
  })();

});
