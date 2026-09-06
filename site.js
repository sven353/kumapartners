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

  // --- Investor CTA: pre-select the contact form's persona field ---
  if (window.location.hash === '#contact-investor') {
    var personaSelect = document.getElementById('persona');
    if (personaSelect) personaSelect.value = 'investor';
    var contactSection = document.getElementById('contact');
    if (contactSection) contactSection.scrollIntoView();
  }

  // --- Leadership Friction Scorecard ---
  var scorecard = document.getElementById('scorecard-widget');
  if (scorecard) {
    var QUESTION_ORDER = ['q1', 'q2', 'q3', 'q4'];
    var answers = { q1: null, q2: null, q3: null, q4: null };
    var respondent = { email: '', company: '' };
    var progressWrap = scorecard.querySelector('.scorecard-progress');
    var dots = progressWrap ? progressWrap.querySelectorAll('.dot') : [];

    function setSelectValueByText(select, text) {
      if (!select) return;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].text === text) { select.value = select.options[i].value || text; return; }
      }
    }

    function showStep(stepId) {
      var steps = scorecard.querySelectorAll('.sc-step');
      steps.forEach(function (el) { el.hidden = el.getAttribute('data-step') !== stepId; });

      var qIndex = QUESTION_ORDER.indexOf(stepId);
      if (progressWrap) {
        progressWrap.hidden = qIndex === -1;
        dots.forEach(function (dot, i) { dot.classList.toggle('active', i <= qIndex); });
      }
    }

    var startBtn = scorecard.querySelector('[data-start]');
    if (startBtn) startBtn.addEventListener('click', function () { showStep('q1'); });

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

    var gateForm = scorecard.querySelector('[data-gate-form]');
    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('sc-email');
        var companyInput = document.getElementById('sc-company');
        respondent.email = emailInput ? emailInput.value.trim() : '';
        respondent.company = companyInput ? companyInput.value.trim() : '';
        if (!respondent.email || !respondent.company) return;

        var scoreMap = { low: 1, moderate: 2, acute: 3 };
        var score = (scoreMap[answers.q1] || 0) + (scoreMap[answers.q2] || 0) + (scoreMap[answers.q3] || 0);
        var tier = score <= 4 ? 'A' : (score <= 7 ? 'B' : 'C');

        scorecard.querySelectorAll('.sc-result-tier').forEach(function (el) {
          el.hidden = el.getAttribute('data-tier') !== tier;
        });

        showStep('result');
      });
    }

    var ctaBtn = scorecard.querySelector('[data-scorecard-cta]');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function () {
        var emailField = document.getElementById('email');
        var companyField = document.getElementById('company');
        var stageField = document.getElementById('stage');
        var challengeField = document.getElementById('challenge');

        if (emailField) emailField.value = respondent.email;
        if (companyField) companyField.value = respondent.company;

        var stageText = { seed: 'Seed – Series A', seriesbc: 'Series B – C', enterprise: 'Enterprise' }[answers.q4];
        if (stageText) setSelectValueByText(stageField, stageText);

        var challengeText = answers.q1 === 'acute' || answers.q3 === 'acute' ? 'Co-founder misalignment' : 'Decision drag';
        setSelectValueByText(challengeField, challengeText);

        var contactSection = document.getElementById('contact');
        if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    var restartLink = scorecard.querySelector('[data-scorecard-restart]');
    if (restartLink) {
      restartLink.addEventListener('click', function (e) {
        e.preventDefault();
        answers = { q1: null, q2: null, q3: null, q4: null };
        scorecard.querySelectorAll('.scorecard-option').forEach(function (o) { o.classList.remove('selected'); });
        var gateFormEl = scorecard.querySelector('[data-gate-form]');
        if (gateFormEl) gateFormEl.reset();
        showStep('intro');
      });
    }
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
