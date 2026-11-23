// Year review worksheet: answers stay in this browser only (localStorage, best effort), nothing is sent.
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
});
