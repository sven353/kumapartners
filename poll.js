/* Audience page: follows the question the presenter has opened, sends one answer, shows results when published. */
(function () {
  var app = document.getElementById('app');
  var stepEl = document.getElementById('step');
  var titleEl = document.getElementById('title');
  var ledeEl = document.getElementById('lede');
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

  // head: the dark header (title, optional accent in light petrol, one line under it)
  function setHead(title, accent, lede) {
    titleEl.textContent = title;
    if (accent) {
      titleEl.appendChild(document.createTextNode(' '));
      var a = el('span', 'lav', accent);
      titleEl.appendChild(a);
    }
    ledeEl.textContent = lede || '';
  }
  var DONT = 'Please do not enter personal, client or confidential information.';
  function notice() {
    var c = el('div', 'pl-notice');
    c.appendChild(el('h2', '', 'Before you answer'));
    var ul = el('ul', '');
    ul.appendChild(el('li', '', 'Anonymous. No name, no email, no sign-in.'));
    ul.appendChild(el('li', '', DONT));
    ul.appendChild(el('li', '', 'To let each person answer once per question, your browser generates a random voter ID and sends it with your answers. It contains nothing about you and is not linked to your name or any account.'));
    var li = el('li', '');
    var a = el('a', '', 'Privacy policy');
    a.href = '/privacy'; a.target = '_blank'; a.rel = 'noopener';
    li.appendChild(a);
    ul.appendChild(li);
    c.appendChild(ul);
    return c;
  }
  function wait(title, accent, text) {
    setHead(title, accent, text);
    var w = el('div', 'pl-wait');
    w.appendChild(el('div', 'pl-pulse'));
    w.appendChild(el('p', '', 'This page changes by itself.'));
    return w;
  }

  function draw(force) {
    var key;
    if (!st) key = 'loading';
    else if (st.phase === 'open' && isFeed()) key = 'qa|' + st.oid + '|' + st.question.id + '|' + qaMine().length;
    else if (st.phase === 'open') key = 'open|' + st.oid + '|' + st.question.id + '|' + (sentAnswer() && !editing ? 'sent' : 'form');
    else if (st.phase === 'shown') key = 'shown|' + st.question.id + '|' + st.phones;
    else key = st.phase + '|' + st.index;
    if (!force && key === viewKey) return;
    viewKey = key;
    app.textContent = '';
    stepEl.textContent = st && st.index ? 'Question ' + st.index + ' of ' + st.total : '';
    if (!st) { app.appendChild(wait('Connecting', '', '')); return; }
    if (st.phase === 'idle') { app.appendChild(wait('You are in.', 'First question soon.', 'Keep this page open on your phone.')); app.appendChild(notice()); return; }
    if (st.phase === 'ready') { app.appendChild(wait('Next question', 'coming up.', 'Keep this page open on your phone.')); app.appendChild(notice()); return; }
    if (st.phase === 'open') { if (isFeed()) drawQa(); else if (sentAnswer() && !editing) drawSent(); else drawForm(); return; }
    if (st.phase === 'shown') {
      if (st.phones && isFeed()) drawFeedList();
      else if (st.phones) drawResults();
      else if (isFeed()) {
        if (st.question.type === 'wall') setHead('Thank you.', '', 'The next question will appear here.');
        else setHead('Q&A is closed.', 'Thank you.', 'Your questions will be answered live.');
        var w2 = el('div', 'pl-wait');
        w2.appendChild(el('p', '', 'The next question will appear here.'));
        app.appendChild(w2);
      } else {
        if (st.question && st.question.type === 'text') setHead('Thank you.', '', 'The next question will appear here.');
        else setHead('Voting is closed.', 'Thank you.', 'The results will appear here in a moment.');
        var w = el('div', 'pl-wait');
        w.appendChild(el('p', '', 'The next question will appear here.'));
        app.appendChild(w);
      }
    }
  }

  // Live Q&A: up to three questions per person, sent one by one. Own questions are kept on this phone only.
  function isFeed() { return !!(st && st.question && (st.question.type === 'qa' || st.question.type === 'wall')); }
  function qaKey() { return 'ppi_qa_' + (st.oid || '') + '_' + st.question.id; }
  function qaMine() {
    if (!st || !st.question) return [];
    try { var v = JSON.parse(store(qaKey()) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function drawQa() {
    var mine = qaMine();
    var wall = st.question.type === 'wall';
    var left = (wall ? 1 : 3) - mine.length;
    if (wall) setHead(left > 0 ? st.question.text : 'Thank you.', '', left > 0 ? 'One sentence is enough. Everyone\'s answers appear here after you send yours.' : 'Your answer is in. The answers of the others appear below as they arrive.');
    else setHead(st.question.text, '', left > 0 ? 'Ask up to three questions. They are read out and answered live.' : 'You have sent your three questions. Thank you.');
    var card = el('div', 'pl-form');
    if (left > 0) {
      var ta = el('textarea', 'pl-in');
      card.appendChild(el('p', 'pl-note', DONT));
      ta.maxLength = 280; ta.setAttribute('aria-label', 'Your question');
      ta.placeholder = wall ? 'Your answer' : 'Your question';
      var cnt = el('div', 'pl-count');
      var send = el('button', 'btn go pl-send', wall ? 'Send my answer' : 'Send question');
      send.type = 'button';
      var msg = el('div', 'pl-msg');
      msg.hidden = true;
      var upd = function () { cnt.textContent = ta.value.length + ' / 280' + (wall ? '' : '. Questions left: ' + left); send.disabled = !ta.value.trim(); };
      ta.oninput = upd;
      card.appendChild(ta); card.appendChild(cnt); card.appendChild(send);
      card.appendChild(msg);
      upd();
      send.onclick = function () {
        send.disabled = true; msg.hidden = true;
        var text = ta.value.trim();
        api('vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qid: st.question.id, voter: voter, answer: text }) })
          .then(function (r) {
            if (r.status === 200) { var m = qaMine(); m.push(text); store(qaKey(), JSON.stringify(m)); draw(true); return; }
            msg.hidden = false;
            if (r.status === 409 && r.body && r.body.error === 'limit') { store(qaKey(), JSON.stringify(['', '', ''].map(function (x, i) { return mine[i] || '(sent earlier)'; }))); draw(true); return; }
            msg.textContent = r.status === 409 ? 'This has just closed. Your answer did not arrive.' : 'That did not work. Please check your question and try again.';
            send.disabled = false;
            if (r.status === 409) tick();
          })
          .catch(function () { msg.hidden = false; msg.textContent = 'No connection. Please try again in a moment.'; send.disabled = false; });
      };
    }
    if (wall && mine.length) {
      var live = el('div', 'qa-list phone');
      live.style.marginTop = '18px';
      card.appendChild(live);
      phoneFeed = PollQA.create({
        get: function (keys) {
          return fetch('/api/poll/qa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys: keys }), cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (b) { return b.items || []; });
        },
        onChange: function (items, cur) { PollQA.draw(live, items, cur, { order: 'new', simple: true, empty: 'Answers appear here.' }); }
      });
      refreshFeed();
    } else if (mine.length) {
      card.appendChild(el('h2', 'pl-sub', wall ? 'Your answer' : 'Your questions'));
      var ul = el('ul', 'pl-mine');
      mine.forEach(function (t) { ul.appendChild(el('li', '', t)); });
      card.appendChild(ul);
    }
    app.appendChild(card);
  }

  function drawSent() {
    setHead('Thank you.', 'Your answer is in.', st.question.type === 'text' ? 'Please wait a few seconds. The next question will appear here.' : 'Please wait a few seconds. The results will be shown as soon as the poll closes.');
    var c = el('div', 'pl-done');
    var wt = el('div', 'pl-wait');
    wt.appendChild(el('div', 'pl-pulse'));
    wt.appendChild(el('p', '', 'This page changes by itself. You do not need to do anything.'));
    c.appendChild(wt);
    var b = el('button', 'btn ghost sm', 'Change my answer');
    b.type = 'button';
    b.onclick = function () { editing = true; draft = sentAnswer(); draw(true); };
    c.appendChild(b);
    app.appendChild(c);
  }

  function drawForm() {
    var q = st.question;
    var card = el('div', 'pl-form');
    setHead(q.text, '', '');
    var send = el('button', 'btn go pl-send', 'Send my answer');
    send.type = 'button';
    var msg = el('div', 'pl-msg');
    msg.hidden = true;
    var prior = editing ? draft : null;

    function ready(ok) { send.disabled = !ok; }
    function body() {
      if (q.type === 'single') {
        var sel = typeof prior === 'string' ? prior : null;
        ledeEl.textContent = 'Choose one.';
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
        var hint = ledeEl;
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
        ledeEl.textContent = 'Tap a number from 1 to 7.';
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
        ledeEl.textContent = 'Up to three answers, one or more words each. Short is better.';
        var ins = [];
        card.appendChild(el('p', 'pl-note', DONT));
        for (var k = 0; k < 3; k++) {
          var inp = el('input', 'pl-in');
          inp.type = 'text'; inp.maxLength = 40; inp.autocomplete = 'off';
          inp.placeholder = 'Answer ' + (k + 1);
          inp.setAttribute('aria-label', 'Answer ' + (k + 1));
          if (Array.isArray(prior) && prior[k]) inp.value = prior[k];
          inp.oninput = function () { draft = ins.map(function (x) { return x.value.trim(); }).filter(Boolean); ready(draft.length > 0); };
          ins.push(inp); card.appendChild(inp);
        }
        draft = ins.map(function (x) { return x.value.trim(); }).filter(Boolean); ready(draft.length > 0);
      } else {
        ledeEl.textContent = 'Write a sentence or two. No names, please.';
        var ta = el('textarea', 'pl-in');
        card.appendChild(el('p', 'pl-note', DONT));
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

  // Q&A and live answers, shown read-only on the phones after the presenter closes them
  var phoneFeed = null;
  function drawFeedList() {
    setHead(st.question.text, '', 'The list updates by itself.');
    var box = el('div', 'qa-list phone');
    app.appendChild(box);
    phoneFeed = PollQA.create({
      get: function (keys) {
        return fetch('/api/poll/qa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keys: keys }), cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (b) { return b.items || []; });
      },
      onChange: function (items, cur) { PollQA.draw(box, items, cur, { order: 'new', simple: true, empty: 'Nothing here yet.' }); }
    });
    refreshFeed();
  }
  function refreshFeed() {
    var live = st && st.question && ((st.phase === 'shown' && st.phones) || (st.phase === 'open' && st.question.type === 'wall' && qaMine().length));
    if (!phoneFeed || !live) return;
    fetch('/api/poll/screen', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) { if (b && b.keys && phoneFeed) phoneFeed.update(b.keys, b.cur || null); }).catch(function () {});
  }

  function drawResults() {
    setHead(st.question.text, '', 'Results');
    var card = el('div', 'pl-card');
    app.appendChild(card);
    api('results?scope=phones').then(function (r) {
      if (r.status === 200) PollRender.render(card, r.body.result);
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
      refreshFeed();
    }).catch(function () { fails++; }).then(next);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  draw(true);
  tick();
})();
