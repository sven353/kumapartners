// Kuma Partners — shared site behavior (FAQ accordion + cookie consent banner)
// Vanilla JS, no dependencies.

document.addEventListener('DOMContentLoaded', function () {

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

});
