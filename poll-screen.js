/* Big screen: shows the live counter while the poll is open and the results after "Show results". */
(function () {
  var URL_JOIN = 'https://www.kuma.partners/PPI-engagement';
  var main = document.getElementById('main');
  var stepEl = document.getElementById('step');
  var qrSmall = document.getElementById('qrsmall');
  var st = null, key = '', countEl = null, resBox = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function qrBox(small) {
    var d = el('div', 'ps-qr' + (small ? ' small' : ''));
    d.innerHTML = PollQR.svg(URL_JOIN); // our own generated SVG, no user content
    return d;
  }

  function draw() {
    var k = st ? st.phase + '|' + (st.question ? st.question.id : '') + '|' + (st.oid || '') : 'loading';
    stepEl.textContent = st && st.index ? 'Question ' + st.index + ' of ' + st.total : '';
    qrSmall.textContent = '';
    if (st && st.phase === 'open') qrSmall.appendChild(qrBox(true));

    if (k !== key) {
      key = k;
      main.textContent = '';
      countEl = resBox = null;
      if (!st || st.phase === 'idle') {
        var j = el('div', 'ps-join');
        j.appendChild(qrBox(false));
        var t = el('div');
        t.appendChild(el('div', 'ps-step', 'Live poll'));
        t.appendChild(el('div', 'ps-q', 'Scan to join'));
        t.appendChild(el('div', 'ps-url', 'kuma.partners/PPI-engagement'));
        j.appendChild(t);
        main.appendChild(j);
        return;
      }
      main.appendChild(el('div', 'ps-step', st.phase === 'ready' ? 'Coming up' : st.phase === 'open' ? 'Poll open' : 'Results'));
      main.appendChild(el('div', 'ps-q', st.question.text));
      if (st.phase === 'ready') {
        main.appendChild(el('div', 'ps-body', 'Opening shortly. Keep the page open on your phone.'));
      } else if (st.phase === 'open') {
        var c = el('div', 'ps-count');
        countEl = el('b', '', '0');
        c.appendChild(countEl);
        c.appendChild(el('span', '', 'answered'));
        main.appendChild(c);
      } else {
        resBox = el('div', 'ps-body');
        main.appendChild(resBox);
      }
    }
    if (countEl && st.n != null && countEl.textContent !== String(st.n)) countEl.textContent = st.n;
    if (resBox && st.result) {
      var rk = JSON.stringify(st.result);
      if (resBox.dataset.k !== rk) { resBox.dataset.k = rk; PollRender.render(resBox, st.result); }
    }
  }

  function tick() {
    fetch('/api/poll/screen', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (b) { st = b; draw(); })
      .catch(function () {})
      .then(function () { setTimeout(tick, 2000); });
  }
  draw();
  tick();
})();
