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

  // --- Mobile nav toggle + Engagements accordion ---
  if (siteHeader) {
    var navToggle = siteHeader.querySelector('.nav-toggle');
    var navLinks = siteHeader.querySelector('.nav-links');
    var iconMenu = siteHeader.querySelector('.nav-toggle .icon-menu');
    var iconClose = siteHeader.querySelector('.nav-toggle .icon-close');

    function closeMobileNav() {
      siteHeader.classList.remove('nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      if (iconMenu) iconMenu.hidden = false;
      if (iconClose) iconClose.hidden = true;
      var openDropdown = siteHeader.querySelector('.nav-item-dropdown.nav-dropdown-open');
      if (openDropdown) openDropdown.classList.remove('nav-dropdown-open');
    }

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var isOpen = siteHeader.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (iconMenu) iconMenu.hidden = isOpen;
        if (iconClose) iconClose.hidden = !isOpen;
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

  // --- Tier 1 interactive timeline & deliverables drawer ---
  var scanDrawer = document.getElementById('scan-timeline-drawer');
  if (scanDrawer) {
    var scanDrawerTriggers = document.querySelectorAll('[data-scan-timeline-toggle]');

    function setScanDrawerOpen(isOpen) {
      scanDrawer.classList.toggle('open', isOpen);
      scanDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      scanDrawerTriggers.forEach(function (btn) {
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        var arrow = btn.querySelector('[data-toggle-arrow]');
        if (arrow) arrow.textContent = isOpen ? '↑' : '↓';
      });
    }

    var scanDrawerAnchor = scanDrawerTriggers[0];
    scanDrawerTriggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var willOpen = !scanDrawer.classList.contains('open');
        setScanDrawerOpen(willOpen);
        if (willOpen) {
          setTimeout(function () {
            scanDrawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 320);
        } else if (scanDrawerAnchor) {
          scanDrawerAnchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  }

  // --- Contact form: reveal free-text field when "Other / Specific mandate" is chosen ---
  var challengeSelectEl = document.getElementById('challenge');
  var challengeOtherField = document.querySelector('[data-challenge-other-field]');
  var challengeOtherInput = document.getElementById('challenge-other');
  if (challengeSelectEl && challengeOtherField) {
    function toggleChallengeOther() {
      var isOther = challengeSelectEl.value === 'Other / Specific mandate';
      challengeOtherField.hidden = !isOther;
      if (!isOther && challengeOtherInput) challengeOtherInput.value = '';
    }
    challengeSelectEl.addEventListener('change', toggleChallengeOther);
    toggleChallengeOther();
  }

  // --- Contact form: AJAX submit to Netlify Forms with inline success/error states ---
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    var contactShell = contactForm.closest('.contact-form-shell');
    var contactSuccess = contactShell ? contactShell.querySelector('[data-contact-success]') : null;
    var contactError = contactForm.querySelector('[data-contact-error]');
    var contactSubmitBtn = contactForm.querySelector('[data-contact-submit]');
    var contactBtnLabel = contactSubmitBtn ? contactSubmitBtn.querySelector('[data-btn-label]') : null;
    var originalBtnText = contactBtnLabel ? contactBtnLabel.textContent : '';

    function encodeFormData(form) {
      return Array.prototype.map.call(form.elements, function (el) {
        if (!el.name || el.disabled) return '';
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return '';
        return encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value);
      }).filter(Boolean).join('&');
    }

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (contactError) contactError.hidden = true;
      if (contactSubmitBtn) contactSubmitBtn.disabled = true;
      if (contactBtnLabel) contactBtnLabel.textContent = 'Sending…';

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData(contactForm)
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        contactForm.hidden = true;
        if (contactSuccess) {
          contactSuccess.hidden = false;
          contactSuccess.focus();
        }
      }).catch(function () {
        if (contactSubmitBtn) contactSubmitBtn.disabled = false;
        if (contactBtnLabel) contactBtnLabel.textContent = originalBtnText;
        if (contactError) contactError.hidden = false;
      });
    });
  }

  // --- Investor CTA: pre-select the contact form's persona field ---
  function selectInvestorPersona() {
    var personaSelect = document.getElementById('persona');
    if (personaSelect) personaSelect.value = 'investor';
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
    var personaSelect = document.getElementById('persona');
    if (personaSelect) {
      setTimeout(function () { personaSelect.focus(); }, 400);
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

  // --- Offsite module CTA: pre-select the contact form's challenge field ---
  document.querySelectorAll('[data-offsite-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var challengeSelect = document.getElementById('challenge');
      if (challengeSelect) {
        challengeSelect.value = 'Upcoming high-stakes leadership offsite';
        challengeSelect.dispatchEvent(new Event('change'));
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
        var personaField = document.getElementById('persona');
        var headcountField = document.getElementById('headcount');
        var stageField = document.getElementById('funding-stage');
        var challengeField = document.getElementById('challenge');

        if (emailField) emailField.value = respondent.email;
        if (companyField) companyField.value = respondent.company;
        if (personaField) personaField.value = respondent.mode;

        var headcountText = { seed: '25 – 75 people', seriesbc: '75 – 150 people', growth: '150+ people' }[answers.q7];
        if (headcountText) setSelectValueByText(headcountField, headcountText);

        var stageText = { seed: 'Seed – Series A', seriesbc: 'Series B – Series C', growth: 'Growth / PE-Backed' }[answers.q7];
        if (stageText) setSelectValueByText(stageField, stageText);

        var results = computeResults();
        var maxLevel = Math.max(results.velocityLevel, results.candorLevel, results.governanceLevel);
        var challengeText = 'Decision latency & execution drag';
        if (results.governanceLevel === maxLevel) challengeText = 'Board / Governance dynamics';
        else if (results.candorLevel === maxLevel) challengeText = 'Co-founder or C-suite misalignment';
        else if (results.velocityLevel === maxLevel) challengeText = 'Decision latency & execution drag';
        setSelectValueByText(challengeField, challengeText);

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
    var scanCloseBtn = scanOverlay.querySelector('[data-scan-close]');
    var scanEmailInput = document.getElementById('scan-email');
    var scanEmailError = scanOverlay.querySelector('[data-scan-email-error]');
    var FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'proton.me', 'protonmail.com'];
    var lastFocusedEl = null;

    function isFormPartiallyFilled() {
      var fields = scanOverlay.querySelectorAll('input, select');
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

    function attemptClose(force) {
      if (!force && isFormPartiallyFilled() && scanOverlay.querySelector('[data-modal-step="1"]').hidden === false) {
        var stay = !window.confirm('Save your spot? Closing now will lose what you\'ve entered.');
        if (stay) return;
      }
      scanOverlay.classList.remove('open');
      document.body.classList.remove('scan-modal-locked');
      document.removeEventListener('keydown', onKeydown);
      setTimeout(function () { scanOverlay.hidden = true; }, 260);
      if (lastFocusedEl) lastFocusedEl.focus();
    }

    document.querySelectorAll('[data-open-scan-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn); });
    });

    if (scanCloseBtn) scanCloseBtn.addEventListener('click', function () { attemptClose(true); });

    scanOverlay.addEventListener('click', function (e) {
      if (e.target === scanOverlay) attemptClose(false);
    });

    if (scanEmailInput && scanEmailError) {
      scanEmailInput.addEventListener('input', function () { scanEmailError.classList.remove('show'); });
    }

    if (scanForm) {
      scanForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!scanForm.checkValidity()) { scanForm.reportValidity(); return; }

        var email = scanEmailInput.value.trim();
        var domain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
        if (FREE_EMAIL_DOMAINS.indexOf(domain) !== -1) {
          if (scanEmailError) scanEmailError.classList.add('show');
          scanEmailInput.focus();
          return;
        }

        var name = document.getElementById('scan-name').value.trim();
        var company = document.getElementById('scan-company').value.trim();
        var stage = document.getElementById('scan-stage').value;
        var inflection = document.getElementById('scan-inflection').value;

        var recapName = scanOverlay.querySelector('[data-recap-name]');
        var recapEmail = scanOverlay.querySelector('[data-recap-email]');
        var recapCompany = scanOverlay.querySelector('[data-recap-company]');
        if (recapName) recapName.textContent = name;
        if (recapEmail) recapEmail.textContent = email;
        if (recapCompany) recapCompany.textContent = company;

        var embedUrlInput = scanOverlay.querySelector('[data-scan-embed-url]');
        if (embedUrlInput) {
          var params = new URLSearchParams({ name: name, email: email, company: company, stage: stage, inflection: inflection });
          embedUrlInput.value = 'https://cal.com/kuma-partners/friction-scan-intro?' + params.toString();
        }

        scanOverlay.querySelector('[data-modal-step="1"]').hidden = true;
        var step2 = scanOverlay.querySelector('[data-modal-step="2"]');
        step2.hidden = false;
        var heading = step2.querySelector('h3');
        if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
      });
    }
  }

});
