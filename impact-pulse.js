// Private Impact Pulse page (/impact-pulse): optional URL prefill and Netlify Forms AJAX submit.
// One link for every client. Optional prefill: /impact-pulse?company=Acme&name=Max&role=CEO&coach=Sven
document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  function clean(key) { return (params.get(key) || '').trim().slice(0, 120); }

  var form = document.getElementById('impact-pulse-form');
  var successPanel = document.getElementById('review-success-panel');
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
  if (!form) return;

  // Optional prefill (textContent and value only, never HTML)
  [['company', 'field-company'], ['name', 'field-name'], ['role', 'field-role']].forEach(function (pair) {
    var v = clean(pair[0]), el = document.getElementById(pair[1]);
    if (v && el) el.value = v;
  });

  // ?coach=Sven, Vincent, Marcio or Adrian pre-selects that coach: accents and case are ignored
  function fold(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  var coachParam = fold(params.get('coach'));
  var coachSelect = document.getElementById('field-coach');
  if (coachParam && coachSelect) {
    for (var i = 0; i < coachSelect.options.length; i++) {
      var opt = coachSelect.options[i];
      if (opt.value && fold(opt.value).indexOf(coachParam) !== -1) { coachSelect.value = opt.value; break; }
    }
  }

  // Tick boxes carry no name of their own. Their values are written into one hidden field each,
  // as a comma-separated list, so the stored submission shows one clean line.
  function bindGroup(attr, fieldId) {
    var field = document.getElementById(fieldId);
    var boxes = form.querySelectorAll('[' + attr + ']');
    function sync() {
      if (!field) return;
      field.value = Array.prototype.filter.call(boxes, function (b) { return b.checked; })
        .map(function (b) { return b.value; }).join(', ');
    }
    Array.prototype.forEach.call(boxes, function (b) { b.addEventListener('change', sync); });
    sync();
    return { sync: sync, boxes: boxes, field: field };
  }
  var nextSteps = bindGroup('data-next-step', 'field-next-steps');
  var engagement = bindGroup('data-engagement', 'field-engagement');
  var engError = form.querySelector('[data-engagement-error]');
  Array.prototype.forEach.call(engagement.boxes, function (b) {
    b.addEventListener('change', function () { if (engError && engagement.field.value) engError.hidden = true; });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    nextSteps.sync();
    engagement.sync();
    // At least one engagement must be ticked
    if (!engagement.field.value) {
      if (engError) engError.hidden = false;
      var group = document.getElementById('engagement-group');
      if (group) group.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (engagement.boxes[0]) engagement.boxes[0].focus({ preventScroll: true });
      return;
    }
    if (timeInput) timeInput.value = new Date().toISOString();
    if (errorEl) errorEl.hidden = true;
    var original = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

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
