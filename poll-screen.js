/* Big screen: shows the live counter while the poll is open and the results after "Show results". */
(function () {
  var URL_JOIN = 'https://www.kuma.partners/PPI-engagement';
  var main = document.getElementById('main');
  var stepEl = document.getElementById('step');
  var qrSmall = document.getElementById('qrsmall');
  var urlPill = document.querySelector('.ps-bottom .ps-url');
  var st = null, key = '', countEl = null, panel = null, scroller = null;
  var qaBox = null, qaCount = null, qaView = null;
  var qa = PollQA.create({
    get: function (keys) {
      return fetch('/api/poll/qa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys: keys }), cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (b) { return b.items || []; });
    },
    onChange: function () { paintQa(); }
  });
  function paintQa() {
    if (!qaBox) return;
    var items = qa.items();
    PollQA.draw(qaBox, items, qa.current(), { order: 'new', empty: 'Questions from the room appear here.' });
    if (qaCount) qaCount.textContent = items.length;
  }

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
  function question(text) {
    var q = el('h1', 'ps-q', text);
    return q;
  }
  function stopScroll() { if (scroller) { clearInterval(scroller); scroller = null; } }
  // slow automatic scroll for long lists of answers, so a full room stays readable without touching the mouse
  function autoScroll(box) {
    stopScroll();
    var wait = 0;
    scroller = setInterval(function () {
      if (box.scrollHeight <= box.clientHeight + 4) return;
      if (wait > 0) { wait--; return; }
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 1) { wait = 60; box.scrollTop = 0; return; }
      box.scrollTop += 1;
    }, 40);
  }

  function draw() {
    var isQa = !!(st && st.question && st.question.type === 'qa' && (st.phase === 'open' || st.phase === 'shown'));
    var k = st ? (isQa ? 'qa' : st.phase) + '|' + (st.question ? st.question.id : '') + '|' + (st.oid || '') + (isQa ? '' : '') : 'loading';
    stepEl.textContent = st && st.index ? 'Question ' + st.index + ' of ' + st.total : '';
    urlPill.hidden = !st || st.phase === 'idle';
    qrSmall.textContent = '';
    if (st && st.phase === 'open') qrSmall.appendChild(qrBox(true));
    if (!isQa) { qaBox = qaCount = null; }

    if (k !== key) {
      key = k;
      stopScroll();
      main.textContent = '';
      main.className = 'ps-main';
      countEl = panel = null;
      if (!st || st.phase === 'idle') {
        main.classList.add('solo');
        var j = el('div', 'ps-join');
        j.appendChild(qrBox(false));
        var t = el('div', 'ps-left');
        var h = el('h1', 'ps-q');
        h.appendChild(document.createTextNode('Scan to join the '));
        h.appendChild(el('span', 'lav', 'live poll.'));
        t.appendChild(h);
        t.appendChild(el('p', 'ps-sub', 'Open the camera on your phone and point it at the code. Your answers are anonymous.'));
        t.appendChild(el('span', 'ps-url', 'kuma.partners/PPI-engagement'));
        j.appendChild(t);
        main.appendChild(j);
        return;
      }
      if (isQa) {
        var ql = el('div', 'ps-left');
        ql.appendChild(el('span', 'ps-status ' + st.phase, st.phase === 'open' ? 'Q&A open' : 'Q&A closed'));
        ql.appendChild(question(st.question.text));
        ql.appendChild(el('p', 'ps-sub', st.phase === 'open' ? 'Scan the code or open kuma.partners/PPI-engagement and send your questions. Up to three each, anonymous.' : 'The Q&A is closed. Thank you for your questions.'));
        var qc = el('div', 'ps-count small');
        qaCount = el('b', '', '0');
        qc.appendChild(qaCount);
        qc.appendChild(el('span', '', 'questions'));
        ql.appendChild(qc);
        var qr = el('div', 'ps-right');
        qaBox = el('div', 'ps-panel qa-list');
        qr.appendChild(qaBox);
        main.appendChild(ql);
        main.appendChild(qr);
        paintQa();
        return;
      }
      var left = el('div', 'ps-left');
      var lbl = { ready: 'Coming up', open: 'Poll open', shown: 'Results' }[st.phase];
      left.appendChild(el('span', 'ps-status ' + st.phase, lbl));
      left.appendChild(question(st.question.text));
      var right = el('div', 'ps-right' + (st.phase === 'open' ? ' center' : ''));
      if (st.phase === 'ready') {
        main.classList.add('solo');
        left.appendChild(el('p', 'ps-sub', 'Opening shortly. Keep the page open on your phone.'));
      } else if (st.phase === 'open') {
        left.appendChild(el('p', 'ps-sub', 'Scan the code or open kuma.partners/PPI-engagement and answer on your phone.'));
        var c = el('div', 'ps-count');
        countEl = el('b', '', '0');
        c.appendChild(countEl);
        c.appendChild(el('span', '', 'answered'));
        right.appendChild(c);
      } else {
        panel = el('div', 'ps-panel' + (st.question.type === 'text' || st.question.type === 'cloud' ? ' scroll' : ''));
        right.appendChild(panel);
      }
      main.appendChild(left);
      if (right.childNodes.length) main.appendChild(right);
    }
    if (countEl && st.n != null && countEl.textContent !== String(st.n)) countEl.textContent = st.n;
    if (panel && st.result) {
      var rk = JSON.stringify(st.result);
      if (panel.dataset.k !== rk) {
        panel.dataset.k = rk;
        PollRender.render(panel, st.result);
        if (panel.classList.contains('scroll')) { panel.scrollTop = 0; autoScroll(panel); }
      }
    }
  }

  function tick() {
    fetch('/api/poll/screen', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (b) {
        st = b; draw();
        if (b.question && b.question.type === 'qa' && b.keys) qa.update(b.keys, b.cur || null);
      })
      .catch(function () {})
      .then(function () { setTimeout(tick, st && st.question && st.question.type === 'qa' && st.phase !== 'ready' ? 1000 : 2000); });
  }
  draw();
  tick();
})();
