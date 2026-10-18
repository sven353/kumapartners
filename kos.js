// Kuma Partners: Kuma Operating System router (/KOS)
// Vanilla JS, no dependencies, same conventions as site.js.
//
// Cards 2 to 4 open an email capture drawer. Each submission records which diagnostic the
// visitor asked for: { selected_diagnostic, email } goes to Netlify Forms (form "kos-interest")
// and, if configured, to a second webhook. Configure everything in CONFIG below.

(function () {
  'use strict';

  var CONFIG = {
    // Booking link for the 30-minute friction debrief (Cal.com, HubSpot Meetings, Chili Piper).
    // While empty, the link at the bottom of the page goes to the intake form on the homepage.
    bookingUrl: '',

    // Optional second destination for each interest event, sent as JSON. Netlify Forms always
    // receives the submission first, and a failure here never blocks the visitor.
    crmWebhookUrl: '',

    // Anti-bot: minimum time between the drawer opening and a valid submit.
    minFillMs: 1500
  };

  // The three pilot instruments. `accessUrl` is where a visitor can use the tool straight away.
  // Leave it empty while the tool is not ready: the drawer then confirms a place on the pilot
  // list instead. Example for card 3, if you want to route people to the calculator that already
  // lives at velocity.kuma.partners: accessUrl: 'https://velocity.kuma.partners'.
  var DIAGNOSTICS = {
    'co-founder-radar': {
      title: 'Co-Founder Alignment Radar',
      badge: 'Pilot Cohort Access',
      lead: 'Enter your work email to run the dual co-founder radar.',
      accessUrl: ''
    },
    'coordination-tax-calculator': {
      title: 'Executive Coordination Tax Calculator',
      badge: 'Benchmark Tool Access',
      badgeWithAccess: 'Instant Benchmark Tool',
      lead: 'Enter your work email to access the Coordination Tax Calculator.',
      accessUrl: ''
    },
    'vc-portfolio-velocity-benchmark': {
      title: 'VC Portfolio Velocity Benchmark',
      badge: 'Investor Portal',
      lead: 'Enter your work email to review the portfolio velocity framework.',
      accessUrl: ''
    }
  };

  // Same list the homepage scan modal blocks, so every Kuma form applies one policy.
  var FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'proton.me', 'protonmail.com'];

  function isFreeEmail(email) {
    var domain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
    return FREE_EMAIL_DOMAINS.indexOf(domain) !== -1;
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  // Test hook for Node. In the browser `module` is undefined, so this is a no-op.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIAGNOSTICS: DIAGNOSTICS, isFreeEmail: isFreeEmail, isValidEmail: isValidEmail };
  }
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var overlay = document.getElementById('kos-modal-overlay');
    if (!overlay) return;

    var modal = overlay.querySelector('.scan-modal');
    var formView = overlay.querySelector('[data-kos-form-view]');
    var form = overlay.querySelector('[data-kos-form]');
    var badgeEl = overlay.querySelector('[data-kos-badge]');
    var titleEl = overlay.querySelector('[data-kos-title]');
    var leadEl = overlay.querySelector('[data-kos-lead]');
    var emailInput = form.elements.email;
    var emailError = overlay.querySelector('[data-kos-email-error]');
    var submitBtn = form.querySelector('[data-kos-submit]');
    var submitLabel = submitBtn.querySelector('[data-btn-label]');
    var formError = overlay.querySelector('[data-kos-error]');
    var success = overlay.querySelector('[data-kos-success]');
    var successText = overlay.querySelector('[data-kos-success-text]');
    var successLink = overlay.querySelector('[data-kos-success-link]');

    var current = null;       // key of the open diagnostic
    var openedAt = 0;
    var lastFocused = null;
    var busy = false;
    var closeTimer = null;
    var backgroundEls = [document.querySelector('header.site'), document.getElementById('main-content'), document.querySelector('footer.site')];

    // ---- analytics-neutral events: other scripts can listen for these. They never carry the email. ----
    function emit(name, detail) {
      try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* old browsers */ }
    }

    // ---- drawer ----
    function setBackgroundInert(on) {
      backgroundEls.forEach(function (el) {
        if (!el) return;
        if (on) { el.setAttribute('inert', ''); } else { el.removeAttribute('inert'); }
      });
    }

    function badgeFor(d) {
      return d.accessUrl && d.badgeWithAccess ? d.badgeWithAccess : d.badge;
    }

    function openDrawer(key, opener) {
      var d = DIAGNOSTICS[key];
      if (!d) return;
      if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
      current = key;
      lastFocused = opener || document.activeElement;

      badgeEl.textContent = badgeFor(d);
      titleEl.textContent = d.title;
      leadEl.textContent = d.lead;
      form.elements.selected_diagnostic.value = key;
      form.elements.selected_title.value = d.title;

      resetState();
      overlay.hidden = false;
      document.body.classList.add('scan-modal-locked');
      setBackgroundInert(true);
      window.requestAnimationFrame(function () { overlay.classList.add('open'); });
      openedAt = Date.now();
      window.setTimeout(function () { emailInput.focus(); }, 60);
      document.addEventListener('keydown', onKeydown);
      emit('kos:interest-open', { selected_diagnostic: key });
    }

    function closeDrawer() {
      overlay.classList.remove('open');
      document.body.classList.remove('scan-modal-locked');
      setBackgroundInert(false);
      document.removeEventListener('keydown', onKeydown);
      closeTimer = window.setTimeout(function () { overlay.hidden = true; resetState(); closeTimer = null; }, 260);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      current = null;
    }

    function resetState() {
      form.reset();
      formView.hidden = false;
      success.hidden = true;
      successLink.hidden = true;
      emailError.classList.remove('show');
      emailInput.setAttribute('aria-invalid', 'false');
      formError.hidden = true;
      submitBtn.disabled = false;
      submitLabel.textContent = 'Request Access →';
      busy = false;
      // form.reset() clears the hidden fields too, so restore the selection if a card is open.
      if (current) {
        form.elements.selected_diagnostic.value = current;
        form.elements.selected_title.value = DIAGNOSTICS[current].title;
      }
    }

    function focusables() {
      return Array.prototype.filter.call(
        modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'),
        function (el) {
          return !el.disabled && el.getAttribute('tabindex') !== '-1' && !el.closest('[hidden]') && el.getClientRects().length > 0;
        }
      );
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    }

    // ---- submit ----
    function looksLikeBot() {
      var trap = form.querySelector('[name="company_tax_id"]');
      if (trap && trap.value.trim() !== '') return true;
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value.trim() !== '') return true;
      return openedAt > 0 && (Date.now() - openedAt) < CONFIG.minFillMs;
    }

    function isLocalPreview() {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
    }

    // ---- INTEREST HOOK -------------------------------------------------------
    // The one place an interest event leaves the page.
    //   payload: { selected_diagnostic, email }  (plus context fields below)
    // Step 1 posts the form to Netlify Forms. Step 2 forwards the payload as JSON to
    // CONFIG.crmWebhookUrl when set. Resolves once the Netlify submission has succeeded.
    function handleInterest(payload) {
      if (isLocalPreview()) {
        // Netlify Forms does not exist on a local static server, so skip the network.
        if (window.console && console.info) console.info('[KOS] local preview, interest not sent', payload);
        return Promise.resolve(payload);
      }
      return fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        forwardToCrm(payload);
        return payload;
      });
    }

    function forwardToCrm(payload) {
      if (!CONFIG.crmWebhookUrl) return;
      try {
        fetch(CONFIG.crmWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () { /* best effort, never blocks the visitor */ });
      } catch (e) { /* same */ }
    }
    // ---------------------------------------------------------------------------

    function showSuccess(key, email) {
      var d = DIAGNOSTICS[key];
      formView.hidden = true;
      success.hidden = false;
      if (d.accessUrl) {
        successText.textContent = 'Your request for the ' + d.title + ' is logged. You can open it now, and we will follow up at ' + email + '.';
        successLink.setAttribute('href', d.accessUrl);
        successLink.hidden = false;
      } else {
        successText.textContent = 'Your request for the ' + d.title + ' is logged. A Kuma partner will email ' + email + ' when your pilot cohort opens.';
        successLink.hidden = true;
      }
      success.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || !current) return;
      var email = emailInput.value.trim();
      if (!isValidEmail(email)) {
        emailError.textContent = 'Please enter a valid email address.';
        emailError.classList.add('show');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
      }
      if (isFreeEmail(email)) {
        emailError.textContent = 'Please use your business email address, not a personal inbox.';
        emailError.classList.add('show');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
      }

      var key = current;
      var payload = {
        selected_diagnostic: key,
        email: email,
        selected_title: DIAGNOSTICS[key].title,
        source: '/KOS',
        submitted_at: new Date().toISOString()
      };

      // Bots get the normal confirmation and no network call, so they have no error to retry on.
      if (looksLikeBot()) { showSuccess(key, email); return; }

      formError.hidden = true;
      busy = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      handleInterest(payload).then(function () {
        busy = false;
        emit('kos:interest', { selected_diagnostic: key });
        showSuccess(key, email);
      }).catch(function () {
        busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Request Access →';
        formError.hidden = false;
      });
    });

    emailInput.addEventListener('input', function () {
      emailError.classList.remove('show');
      emailInput.setAttribute('aria-invalid', 'false');
    });

    // ---- wiring ----
    Array.prototype.forEach.call(document.querySelectorAll('[data-kos-open]'), function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-kos-open'), btn); });
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-kos-close]'), function (btn) {
      btn.addEventListener('click', closeDrawer);
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDrawer(); });

    var cardLink = document.querySelector('[data-kos-card-link]');
    if (cardLink) {
      cardLink.addEventListener('click', function () {
        emit('kos:interest', { selected_diagnostic: cardLink.getAttribute('data-kos-card-link') });
      });
    }

    var book = document.querySelector('[data-kos-book]');
    if (book && CONFIG.bookingUrl) {
      book.setAttribute('href', CONFIG.bookingUrl);
      book.setAttribute('target', '_blank');
      book.setAttribute('rel', 'noopener');
    }
  });
})();
