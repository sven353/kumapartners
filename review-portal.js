// Private constellr debrief page (constellr-review.html): URL prefill and Netlify Forms AJAX submit.
// Personalised link: /constellr-review?name=Max&role=Co-Founder%20%26%20CEO
document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  var nameParam = (params.get('name') || '').trim().slice(0, 80);
  var roleParam = (params.get('role') || '').trim().slice(0, 80);

  var form = document.getElementById('constellr-review-form');
  var successPanel = document.getElementById('review-success-panel');
  var nameInput = document.getElementById('field-name');
  var roleInput = document.getElementById('field-role');
  var heading = document.getElementById('dynamic-review-heading');
  var timeInput = document.getElementById('field-submission-time');
  var errorEl = form ? form.querySelector('[data-review-error]') : null;
  var submitBtn = form ? form.querySelector('[data-review-submit]') : null;

  function showSuccess() {
    if (form) form.hidden = true;
    if (successPanel) {
      successPanel.hidden = false;
      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Arriving back from the no-JavaScript fallback POST
  if (params.get('submitted') === '1') { showSuccess(); return; }

  // Prefill identity and personalise the greeting (textContent only, never HTML)
  if (nameParam && nameInput) {
    nameInput.value = nameParam;
    if (heading) heading.textContent = nameParam + ' · constellr debrief.';
  }
  if (roleParam && roleInput) roleInput.value = roleParam;

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (timeInput) timeInput.value = new Date().toISOString();
    if (errorEl) errorEl.hidden = true;
    var original = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Transmitting debrief\u2026'; }

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (response) {
      if (!response.ok) throw new Error('Status ' + response.status);
      showSuccess();
    }).catch(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = original; }
      if (errorEl) errorEl.hidden = false;
    });
  });
});
