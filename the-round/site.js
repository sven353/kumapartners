/* ==========================================================================
   The Round by Kuma Partners: site.js
   Vanilla ES6, zero dependencies.

   1. Config
   2. Utilities
   3. Header: sticky state, mobile drawer, smooth scroll, scroll-spy
   4. Brand logo fallback
   5. Application drawer: open/close, focus trap, validation, Netlify AJAX
   6. Scroll reveal and staggered entrances
   7. FAQ accordion and "view all" toggle
   8. The Round Charter drawer (Schedule 2)
   9. Cadence carousel hint

   The Member accountability ledger lives on its own site, ledger.kuma.partners
   (repo sven353/theround). Every "Member sign in" link points there.
   ========================================================================== */

(() => {
  'use strict';

  /* Netlify Identity emails (invitation, password reset, confirmation) link to
     the site root with a one-time token in the hash. Hand them to the ledger
     page, which completes the flow. Runs before anything else on the page. */
  if (/(?:^|[#&])(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(location.hash)) {
    location.replace(`https://ledger.kuma.partners/${location.hash}`);
    return;
  }

  /* ------------------------------------------------------------------------
     1. CONFIG
     ------------------------------------------------------------------------ */

  const CONFIG = {
    contactEmail: 'contact@kuma.partners',
    personalEmailDomains: [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.es', 'yahoo.fr', 'yahoo.de', 'hotmail.com',
      'hotmail.es', 'hotmail.fr', 'outlook.com', 'outlook.es', 'live.com', 'msn.com', 'icloud.com',
      'me.com', 'mac.com', 'aol.com', 'gmx.de', 'gmx.net', 'gmx.com', 'web.de', 'proton.me',
      'protonmail.com', 'yandex.com', 'mail.com', 'orange.fr', 'free.fr', 'laposte.net', 't-online.de'
    ]
  };

  /* ------------------------------------------------------------------------
     2. UTILITIES
     ------------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const Toast = (() => {
    const el = $('[data-toast]');
    let timer = null;
    return {
      show(message, duration) {
        if (!el) return;
        clearTimeout(timer);
        el.textContent = message;
        el.hidden = false;
        timer = setTimeout(() => { el.hidden = true; }, duration || 3500);
      }
    };
  })();

  /* ------------------------------------------------------------------------
     3. HEADER
     ------------------------------------------------------------------------ */

  const Nav = (() => {
    const header = $('[data-site-header]');
    const drawer = $('[data-nav-drawer]');
    const toggle = $('[data-nav-toggle]');
    const scrim = $('[data-nav-scrim]');
    const mq = window.matchMedia('(max-width: 1100px)');

    const isOpen = () => drawer.classList.contains('is-open');

    const setOpen = (open) => {
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      $('.icon-menu', toggle).hidden = open;
      $('.icon-close', toggle).hidden = !open;
      scrim.hidden = !open;
      document.body.classList.toggle('is-locked', open);
      if (open) { const first = $('a', drawer); if (first) first.focus(); }
    };

    const close = () => { if (isOpen()) setOpen(false); };

    /* Smooth scroll with an offset for the sticky header. */
    const scrollToHash = (hash) => {
      const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (!target) return;
      const offset = (header ? header.offsetHeight : 0) + 8;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', hash);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };

    const initScrollSpy = () => {
      if (!('IntersectionObserver' in window)) return;
      const links = $$('.nav-links a[href^="#"]:not(.btn)');
      const map = new Map();
      links.forEach((a) => {
        const sec = document.getElementById(a.getAttribute('href').slice(1));
        if (sec) map.set(sec, a);
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => { l.classList.remove('is-current'); l.removeAttribute('aria-current'); });
          const link = map.get(entry.target);
          link.classList.add('is-current');
          link.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, sec) => io.observe(sec));
    };

    const init = () => {
      toggle.addEventListener('click', () => setOpen(!isOpen()));
      scrim.addEventListener('click', close);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
      });
      const onMq = (e) => { if (!e.matches) close(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);

      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-scroll]');
        if (!link) return;
        const hash = link.getAttribute('href');
        if (!hash || hash.charAt(0) !== '#') return;
        e.preventDefault();
        close();
        requestAnimationFrame(() => scrollToHash(hash));
      });

      /* is-past-hero: the hero (and its main button) has scrolled out of
         view, so the header button takes over as the solid call to action. */
      const hero = document.querySelector('.hero');
      const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        const past = !hero || hero.getBoundingClientRect().bottom <= header.offsetHeight + 8;
        header.classList.toggle('is-past-hero', past);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      initScrollSpy();

      if (location.hash) setTimeout(() => scrollToHash(location.hash), 60);
    };

    return { init, close };
  })();

  /* ------------------------------------------------------------------------
     4. BRAND LOGO FALLBACK
     ------------------------------------------------------------------------ */

  const initLogoFallback = () => {
    $$('[data-brand-logo]').forEach((img) => {
      const fail = () => img.closest('.brand-lockup').classList.add('is-logo-missing');
      if (img.complete && img.naturalWidth === 0) fail();
      else img.addEventListener('error', fail, { once: true });
    });
  };

  /* ------------------------------------------------------------------------
     5. APPLICATION DRAWER
     ------------------------------------------------------------------------ */

  const ApplyForm = (() => {
    const overlay = $('[data-apply-overlay]');
    const drawer = $('[data-apply-drawer]');
    const form = $('[data-apply-form]');
    const success = $('[data-form-success]');
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let returnFocus = null;

    const focusables = () => $$(FOCUSABLE, drawer).filter((el) => el.offsetParent !== null && !el.closest('.visually-hidden'));

    const onKeydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    const open = (trigger) => {
      if (!overlay) return;
      Nav.close();
      returnFocus = trigger || document.activeElement;
      // After a successful submission, reopening shows a fresh form.
      if (!success.hidden) { success.hidden = true; form.hidden = false; }
      overlay.hidden = false;
      document.body.classList.add('is-locked');
      document.addEventListener('keydown', onKeydown);
      requestAnimationFrame(() => { const first = $('#apply-name'); if (first) first.focus(); });
    };

    const close = () => {
      if (!overlay || overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('is-locked');
      document.removeEventListener('keydown', onKeydown);
      if (returnFocus && document.contains(returnFocus) && returnFocus.offsetParent !== null) returnFocus.focus();
      returnFocus = null;
    };

    const setError = (field, message) => {
      const wrap = field.closest('.field');
      const err = document.getElementById(`${field.id}-error`);
      if (wrap) wrap.classList.toggle('is-invalid', Boolean(message));
      if (err) err.textContent = message || '';
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        if (err) {
          const ids = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
          if (!ids.includes(err.id)) ids.push(err.id);
          field.setAttribute('aria-describedby', ids.join(' '));
        }
      } else {
        field.removeAttribute('aria-invalid');
      }
    };

    const isPersonal = (email) => {
      const domain = (email.split('@')[1] || '').trim().toLowerCase();
      return CONFIG.personalEmailDomains.includes(domain);
    };

    const validate = (field) => {
      const value = field.type === 'checkbox' ? field.checked : field.value.trim();
      let msg = '';
      if (field.required && !value) {
        msg = field.type === 'checkbox' ? 'Please confirm to continue.' : 'This field is required.';
      } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        msg = 'Please enter a valid email address.';
      } else if (field.hasAttribute('data-work-email') && value && isPersonal(value)) {
        msg = 'Please use your corporate work email, not a personal inbox.';
      } else if (field.dataset.minlength && value && value.length < Number(field.dataset.minlength)) {
        msg = 'A little more detail helps us prepare. Two or three sentences is ideal.';
      }
      setError(field, msg);
      return !msg;
    };

    const status = (msg, isError) => {
      const el = $('[data-form-status]', form);
      el.textContent = msg || '';
      el.classList.toggle('is-error', Boolean(isError));
    };

    const init = () => {
      if (!form) return;
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-open-apply]');
        if (trigger) { e.preventDefault(); open(trigger); return; }
        if (e.target.closest('[data-apply-close]')) { e.preventDefault(); close(); }
      });
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
      if (location.hash === '#apply') open();

      const fields = $$('input[required], select[required], textarea[required]', form);
      const btn = $('button[type="submit"]', form);

      const textarea = $('textarea[maxlength]', form);
      const counter = $('[data-char-count]', form);
      if (textarea && counter) {
        const max = textarea.getAttribute('maxlength');
        const update = () => { counter.textContent = `${textarea.value.length} / ${max}`; };
        textarea.addEventListener('input', update);
        form.addEventListener('reset', () => setTimeout(update, 0));
        update();
      }

      fields.forEach((f) => {
        f.addEventListener('blur', () => { if (f.value || f.getAttribute('aria-invalid')) validate(f); });
        f.addEventListener('input', () => { if (f.getAttribute('aria-invalid')) validate(f); });
        f.addEventListener('change', () => { if (f.getAttribute('aria-invalid')) validate(f); });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        status('');
        let firstInvalid = null;
        fields.forEach((f) => { if (!validate(f) && !firstInvalid) firstInvalid = f; });
        if (firstInvalid) {
          firstInvalid.focus();
          status('Please review the highlighted fields.', true);
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Sending…';

        const formData = new FormData(form);
        if (!formData.get('form-name')) formData.set('form-name', 'the-round-apply');

        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(formData).toString()
        })
          .then((res) => {
            if (!res.ok) throw new Error(String(res.status));
            form.reset();
            form.hidden = true;
            success.hidden = false;
            success.focus();
          })
          .catch((err) => {
            // A 404 here almost always means Netlify has not registered the form:
            // enable form detection in the Netlify dashboard and redeploy.
            console.error('[The Round] Form submission failed:', err && err.message);
            status(`We could not send your submission just now. Please try again or write to ${CONFIG.contactEmail}.`, true);
          })
          .finally(() => {
            btn.disabled = false;
            btn.textContent = btn.dataset.submitLabel || 'Submit for candidate review';
          });
      });
    };

    return { init };
  })();

  /* ------------------------------------------------------------------------
     6. SCROLL REVEAL
     Adds .is-visible to .reveal-on-scroll and .reveal-stagger elements as
     they enter the viewport. Staggered groups get .is-settled once their
     entrance has finished, so later hover transitions run without delay.
     ------------------------------------------------------------------------ */

  const Reveal = (() => {
    const SETTLE_MS = 360 + 650 + 50; // last stagger delay + duration + margin

    const show = (el) => {
      el.classList.add('is-visible');
      if (el.classList.contains('reveal-stagger')) {
        setTimeout(() => el.classList.add('is-settled'), SETTLE_MS);
      }
    };

    const init = () => {
      const items = $$('.reveal-on-scroll, .reveal-stagger');
      if (!items.length) return;
      if (reducedMotion() || !('IntersectionObserver' in window)) {
        items.forEach((el) => { el.classList.add('is-visible', 'is-settled'); });
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      items.forEach((el) => io.observe(el));
    };

    return { init };
  })();

  /* ------------------------------------------------------------------------
     7. FAQ
     One answer open at a time. Questions 5 to 10 always stay in the HTML
     for crawlers; the toggle only controls whether they are shown.
     ------------------------------------------------------------------------ */

  const Faq = (() => {
    const root = $('#faq');

    const setOpen = (item, open) => {
      item.classList.toggle('open', open);
      const btn = $('.faq-question', item);
      if (btn) btn.setAttribute('aria-expanded', String(open));
    };

    const init = () => {
      if (!root) return;
      const items = $$('.faq-item', root);
      const extended = $('#faq-extended', root);
      const toggle = $('[data-faq-toggle]', root);
      const toggleText = $('[data-faq-toggle-text]', root);
      const toggleArrow = $('[data-faq-toggle-arrow]', root);

      items.forEach((item) => {
        const btn = $('.faq-question', item);
        btn.addEventListener('click', () => {
          const willOpen = !item.classList.contains('open');
          items.forEach((other) => { if (other !== item) setOpen(other, false); });
          setOpen(item, willOpen);
        });
      });

      const setExtended = (open) => {
        extended.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggleText.textContent = open ? 'Show fewer questions' : `View all ${items.length} questions`;
        toggleArrow.textContent = open ? '↑' : '↓';
        if (!open) {
          // Close any answer inside the hidden block so it reopens cleanly.
          $$('.faq-item', extended).forEach((item) => setOpen(item, false));
        }
      };

      if (extended && toggle) {
        toggle.addEventListener('click', () => {
          const willOpen = !extended.classList.contains('open');
          setExtended(willOpen);
          if (!willOpen) {
            const top = root.getBoundingClientRect().top;
            if (top < 0) root.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
          }
        });
      }

      // Deep links such as #faq-q7 open the right answer.
      const m = location.hash.match(/^#faq-q(\d+)$/);
      if (m) {
        const btn = document.getElementById(`faq-q${m[1]}`);
        if (btn) {
          const item = btn.closest('.faq-item');
          if (extended && extended.contains(item)) setExtended(true);
          items.forEach((other) => setOpen(other, other === item));
        }
      }
    };

    return { init };
  })();

  /* ------------------------------------------------------------------------
     THE ROUND CHARTER DRAWER
     Opens from any [data-open-charter]. Escape, close button and backdrop
     dismiss it; focus is trapped while open and the page cannot scroll.
     ------------------------------------------------------------------------ */

  const Charter = (() => {
    const overlay = $('[data-charter-overlay]');
    const drawer = $('[data-charter-modal]');
    const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let returnFocus = null;

    const anyOtherOverlayOpen = () => $$('.drawer-overlay, .modal-overlay').some((el) => el !== overlay && !el.hidden);

    const onKeydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const items = $$(FOCUSABLE, drawer).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    const open = (trigger) => {
      if (!overlay) return;
      Nav.close();
      returnFocus = trigger || document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('is-locked');
      document.addEventListener('keydown', onKeydown);
      requestAnimationFrame(() => drawer.focus());
    };

    const close = ({ restoreFocus = true } = {}) => {
      if (!overlay || overlay.hidden) return;
      overlay.hidden = true;
      document.removeEventListener('keydown', onKeydown);
      if (!anyOtherOverlayOpen()) document.body.classList.remove('is-locked');
      if (restoreFocus && returnFocus && document.contains(returnFocus) && returnFocus.offsetParent !== null) returnFocus.focus();
      returnFocus = null;
    };

    const init = () => {
      if (!overlay) return;
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-open-charter]');
        if (trigger) { e.preventDefault(); open(trigger); return; }
        if (e.target.closest('[data-charter-close]')) { e.preventDefault(); close(); return; }
        // "Request candidate review" inside the Charter hands over to the application drawer.
        if (!overlay.hidden && e.target.closest('[data-open-apply]') && overlay.contains(e.target)) close({ restoreFocus: false });
      });
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
      if (location.hash === '#charter') open();
    };

    return { init };
  })();

  /* ------------------------------------------------------------------------
     CADENCE CAROUSEL HINT (mobile only)
     Below 768px the cadence touchpoints grid becomes a horizontal snap carousel (CSS).
     The "Swipe to explore" hint fades out after the first real swipe.
     Desktop never shows the hint, so this is a no-op there.
     ------------------------------------------------------------------------ */

  const SwipeHint = (() => {
    const init = () => {
      const hint = document.querySelector('[data-swipe-hint]');
      const track = document.querySelector('.cadence-touchpoints-grid');
      if (!hint || !track) return;
      const onScroll = () => {
        if (track.scrollLeft < 24) return;
        hint.classList.add('is-dismissed');
        track.removeEventListener('scroll', onScroll);
      };
      track.addEventListener('scroll', onScroll, { passive: true });
    };
    return { init };
  })();

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */

  const init = () => {
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
    initLogoFallback();
    Faq.init();

    // This site runs no tracking or analytics, so "Cookie Preferences"
    // explains that instead of opening an empty consent panel.
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-cookie-info]')) return;
      e.preventDefault();
      Toast.show('This site uses no tracking or analytics. Member sign in uses Netlify Identity, which keeps a sign-in token in this browser until you sign out.', 8000);
    });
    Reveal.init();
    Nav.init();
    ApplyForm.init();
    Charter.init();
    SwipeHint.init();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
