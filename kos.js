// Kuma Partners: Kuma Operating System router (/KOS)
// Vanilla JS, no dependencies, same conventions as site.js.
//
// The three cards link straight to their own pages, so the only behaviour left here is the booking
// link at the bottom and a small event for analytics. Each card click dispatches a "kos:card-click"
// CustomEvent on document with the product_intent for that card, so a tag manager or CRM script can
// listen for it without this file knowing about either.

(function () {
  'use strict';

  var CONFIG = {
    // Booking link for the 30-minute friction debrief (Cal.com, HubSpot Meetings, Chili Piper).
    // While empty, the link at the bottom of the page goes to the intake form on the homepage.
    bookingUrl: ''
  };

  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var book = document.querySelector('[data-kos-book]');
    if (book && CONFIG.bookingUrl) {
      book.setAttribute('href', CONFIG.bookingUrl);
      if (/^https?:/i.test(CONFIG.bookingUrl)) {
        book.setAttribute('target', '_blank');
        book.setAttribute('rel', 'noopener');
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-kos-card-link]'), function (link) {
      link.addEventListener('click', function () {
        try {
          document.dispatchEvent(new CustomEvent('kos:card-click', {
            detail: { product_intent: link.getAttribute('data-kos-card-link') }
          }));
        } catch (e) { /* analytics must never block navigation */ }
      });
    });
  });
})();
