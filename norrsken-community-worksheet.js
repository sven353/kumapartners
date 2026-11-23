// Year review worksheet: answers stay in this browser (localStorage, best effort) unless the founder ticks the box and sends a copy to Kuma Partners (Netlify Form).
document.addEventListener('DOMContentLoaded', function () {
  var KEY = 'jo-worksheet-v1';
  var fields = Array.prototype.slice.call(document.querySelectorAll('[data-ws]'));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  fields.forEach(function (f) { if (typeof saved[f.id] === 'string') f.value = saved[f.id]; });

  function save() {
    var out = {};
    fields.forEach(function (f) { out[f.id] = f.value; });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* storage may be unavailable */ }
  }
  fields.forEach(function (f) { f.addEventListener('input', save); });

  var print = document.querySelector('[data-ws-print]');
  if (print) print.addEventListener('click', function () { window.print(); });
  var clear = document.querySelector('[data-ws-clear]');
  if (clear) clear.addEventListener('click', function () {
    fields.forEach(function (f) { f.value = ''; });
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  });

  // Optional copy to Kuma Partners
  var form = document.getElementById('norrsken-community-worksheet-form');
  if (form) {
    var box = document.getElementById('ws-copy');
    var nameEl = document.getElementById('ws-name');
    var mailEl = document.getElementById('ws-email');
    var err = form.querySelector('[data-ws-error]');
    var ok = form.querySelector('[data-ws-sent]');
    var btn = form.querySelector('[data-ws-send]');
    function valid() {
      return box.checked && nameEl.value.trim() !== '' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mailEl.value.trim());
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (err) err.hidden = true;
      if (ok) ok.hidden = true;
      if (!valid()) { if (err) err.hidden = false; return; }
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (r) {
        if (!r.ok) throw new Error('Status ' + r.status);
        try { localStorage.setItem('jo-worksheet-sent', new Date().toISOString()); } catch (x) { /* ignore */ }
        if (ok) ok.hidden = false;
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        if (err) err.hidden = false;
      });
    });
  }
});
