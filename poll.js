/* Audience page: follows the question the presenter has opened, sends one answer, shows results when published. */
(function () {
  var app = document.getElementById('app');
  var stepEl = document.getElementById('step');
  var memory = {};
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { if (v === undefined) return memory[k] || null; memory[k] = v; }
    return null;
  }
  function genId() {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  var voter = store('ppi_vid');
  if (!voter || !/^[A-Za-z0-9_-]{16,40}$/.test(voter)) { voter = genId(); store('ppi_vid', voter); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function api(path, opt) {
    return fetch('/api/poll/' + path, Object.assign({ cache: 'no-store' }, opt || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; });
    });
  }

  var st = null;            // latest public state
  var viewKey = '';         // what is currently drawn, so typing is never wiped by a refresh
  var draft = {};           // answer being built
  var editing = false;      // true when changing an already sent answer
  var resultKey = '';

  function answeredKey() { return 'ppi_a_' + (st.oid || '') + '_' + st.question.id; }
  function sentAnswer() { var v = store(answeredKey()); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  function wait(title, text) {
    var w = el('div', 'pl-card pl-wait');
    w.appendChild(el('div', 'pl-pulse'));
    w.appendChild(el('h1', '', title));
    if (text) w.appendChild(el('p', '', text));
    return w;
  }

  function draw(force) {
    var key;
    if (!st) key = 'loading';
    else if (st.phase === 'open') key = 'open|' + st.oid + '|' + st.question.id + '|' + (sentAnswer() && !editing ? 'sent' : 'form');
    else if (st.phase === 'shown') key = 'shown|' + st.question.id + '|' + st.phones;
    else key = st.phase + '|' + st.index;
    if (!force && key === viewKey) return;
    viewKey = key;
    app.textContent = '';
    stepEl.textContent = st && st.index ? 'Question ' + st.index + ' of ' + st.total : '';
    if (!st) { app.appendChild(wait('Connecting')); return; }
    if (st.phase === 'idle') { app.appendChild(wait('You are in', 'The first question will appear here in a moment. Keep this page open.')); return; }
    if (st.phase === 'ready') { app.appendChild(wait('Next question coming up', 'Keep this page open. It changes by itself.')); return; }
    if (st.phase === 'open') { if (sentAnswer() && !editing) drawSent(); else drawForm(); return; }
    if (st.phase === 'shown') {
      if (st.phones) drawResults();
      else app.appendChild(wait('Voting is closed', 'Thank you. The results are on the main screen.'));
    }
  }

  function drawSent() {
    var c = el('div', 'pl-card pl-done');
    c.appendChild(el('h2', '', 'Thank you. Your answer is in.'));
    c.appendChild(el('p', '', 'Wait for the next question. This page updates by itself.'));
    var b = el('button', 'btn ghost sm', 'Change my answer');
    b.type = 'button';
    b.onclick = function () { editing = true; draft = sentAnswer(); draw(true); };
    c.appendChild(b);
    app.appendChild(c);
  }

  function drawForm() {
    var q = st.question;
    var card = el('div', 'pl-card');
    card.appendChild(el('h1', 'pl-q', q.text));
    var send = el('button', 'btn pl-send', 'Send my answer');
    send.type = 'button';
    var msg = el('div', 'pl-msg');
    msg.hidden = true;
    var prior = editing ? draft : null;

    function ready(ok) { send.disabled = !ok; }
    function body() {
      if (q.type === 'single') {
        var sel = typeof prior === 'string' ? prior : null;
        card.appendChild(el('p', 'pl-hint', 'Choose one.'));
        var list = el('div', 'pl-opts');
        q.options.forEach(function (o) {
          var b = el('button', 'pl-opt');
          b.type = 'button';
          b.setAttribute('aria-pressed', o.id === sel ? 'true' : 'false');
          b.appendChild(el('span', 'dot'));
          b.appendChild(el('span', '', o.label));
          b.onclick = function () {
            sel = o.id;
            Array.prototype.forEach.call(list.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            draft = sel; ready(true);
          };
          list.appendChild(b);
        });
        card.appendChild(list);
        draft = sel; ready(!!sel);
      } else if (q.type === 'multiple') {
        var chosen = Array.isArray(prior) ? prior.slice() : [];
        var hint = el('p', 'pl-hint');
        card.appendChild(hint);
        var list2 = el('div', 'pl-opts');
        var btns = [];
        var refresh = function () {
          hint.textContent = 'Choose up to ' + q.max + '. Selected: ' + chosen.length + ' of ' + q.max + '.';
          btns.forEach(function (x) {
            var on = chosen.indexOf(x.id) >= 0;
            x.b.setAttribute('aria-pressed', on ? 'true' : 'false');
            x.b.disabled = !on && chosen.length >= q.max;
          });
          draft = chosen.slice(); ready(chosen.length > 0);
        };
        q.options.forEach(function (o) {
          var b = el('button', 'pl-opt multi');
          b.type = 'button';
          b.appendChild(el('span', 'dot'));
          b.appendChild(el('span', '', o.label));
          b.onclick = function () {
            var i = chosen.indexOf(o.id);
            if (i >= 0) chosen.splice(i, 1); else if (chosen.length < q.max) chosen.push(o.id);
            refresh();
          };
          btns.push({ id: o.id, b: b });
          list2.appendChild(b);
        });
        card.appendChild(list2);
        refresh();
      } else if (q.type === 'scale') {
        var val = typeof prior === 'number' ? prior : null;
        card.appendChild(el('p', 'pl-hint', 'Tap a number from 1 to 7.'));
        var row = el('div', 'pl-scale');
        for (var i = 1; i <= 7; i++) (function (n) {
          var b = el('button', '', String(n));
          b.type = 'button';
          b.setAttribute('aria-pressed', n === val ? 'true' : 'false');
          b.onclick = function () {
            Array.prototype.forEach.call(row.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true'); draft = n; ready(true);
          };
          row.appendChild(b);
        })(i);
        card.appendChild(row);
        var ends = el('div', 'pl-ends');
        ends.appendChild(el('span', '', q.low ? '1 = ' + q.low : ''));
        ends.appendChild(el('span', '', q.high ? '7 = ' + q.high : ''));
        card.appendChild(ends);
        draft = val; ready(val !== null);
      } else if (q.type === 'cloud') {
        card.appendChild(el('p', 'pl-hint', 'One to three words. Short is better.'));
        var ins = [];
        for (var k = 0; k < 3; k++) {
          var inp = el('input', 'pl-in');
          inp.type = 'text'; inp.maxLength = 24; inp.autocomplete = 'off';
          inp.placeholder = 'Word ' + (k + 1);
          inp.setAttribute('aria-label', 'Word ' + (k + 1));
          if (Array.isArray(prior) && prior[k]) inp.value = prior[k];
          inp.oninput = function () { draft = ins.map(function (x) { return x.value.trim(); }).filter(Boolean); ready(draft.length > 0); };
          ins.push(inp); card.appendChild(inp);
        }
        draft = ins.map(function (x) { return x.value.trim(); }).filter(Boolean); ready(draft.length > 0);
      } else {
        card.appendChild(el('p', 'pl-hint', 'Write a sentence or two. No names, please.'));
        var ta = el('textarea', 'pl-in');
        ta.maxLength = 280; ta.setAttribute('aria-label', 'Your answer');
        if (typeof prior === 'string') ta.value = prior;
        var cnt = el('div', 'pl-count');
        var upd = function () { draft = ta.value.trim(); cnt.textContent = ta.value.length + ' / 280'; ready(draft.length > 0); };
        ta.oninput = upd;
        card.appendChild(ta); card.appendChild(cnt); upd();
      }
    }
    body();

    send.onclick = function () {
      send.disabled = true; msg.hidden = true;
      var sentDraft = draft;
      api('vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qid: q.id, voter: voter, answer: sentDraft }) })
        .then(function (r) {
          if (r.status === 200) { store(answeredKey(), JSON.stringify(sentDraft)); editing = false; draw(true); return; }
          msg.hidden = false;
          msg.textContent = r.status === 409 ? 'This poll has just closed. Your answer did not arrive.' : 'That did not work. Please check your answer and try again.';
          send.disabled = false;
          if (r.status === 409) tick();
        })
        .catch(function () { msg.hidden = false; msg.textContent = 'No connection. Please try again in a moment.'; send.disabled = false; });
    };
    card.appendChild(send);
    card.appendChild(msg);
    if (editing) {
      var cancel = el('button', 'link', 'Keep my first answer');
      cancel.type = 'button';
      cancel.style.cssText = 'display:block;margin:14px auto 0';
      cancel.onclick = function () { editing = false; draw(true); };
      card.appendChild(cancel);
    }
    app.appendChild(card);
  }

  function drawResults() {
    var card = el('div', 'pl-card');
    card.appendChild(el('p', 'pl-step', 'Results'));
    card.appendChild(el('h1', 'pl-q', st.question.text));
    var box = el('div');
    card.appendChild(box);
    app.appendChild(card);
    api('results?scope=phones').then(function (r) {
      if (r.status === 200) PollRender.render(box, r.body.result);
    });
  }

  var timer = null, fails = 0;
  function tick() {
    clearTimeout(timer);
    var next = function () { timer = setTimeout(tick, Math.min(3000 + fails * 2000, 12000)); };
    if (document.hidden) { next(); return; }
    api('state').then(function (r) {
      if (r.status !== 200) throw new Error('bad');
      fails = 0;
      var prevOid = st && st.oid, prevQ = st && st.question && st.question.id;
      st = r.body;
      if (st.phase !== 'open' || st.oid !== prevOid || (st.question && st.question.id !== prevQ)) { editing = false; }
      draw(false);
    }).catch(function () { fails++; }).then(next);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  draw(true);
  tick();
})();
