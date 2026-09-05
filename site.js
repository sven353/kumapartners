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

});
