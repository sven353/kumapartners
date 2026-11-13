/* Moderator page for the live Q&A: read the questions in order, mark the one being answered, hide anything unsuitable. */
(function () {
  var app = document.getElementById('app');
  var key = '';
  try { key = sessionStorage.getItem('ppi_mod_key') || ''; } catch (e) {}
  var timer = null, feed = null, order = 'old', box = null, headEl = null, last = null;

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e[k] = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    [].concat(kids == null ? [] : kids).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function call(body) {
    return fetch('/api/poll/mod', { method: 'POST', headers: { 'content-type': 'application/json', 'x-poll-key': key }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; }); });
  }
  function logout() { try { sessionStorage.removeItem('ppi_mod_key'); } catch (e) {} key = ''; clearInterval(timer); login(); }

  function login(msg) {
    app.textContent = '';
    var input = h('input', { class: 'pl-in', type: 'password', autocomplete: 'current-password', 'aria-label': 'Passphrase', placeholder: 'Passphrase' });
    var err = h('div', { class: 'pa-err' }, msg || '');
    var form = h('form', { class: 'pl-card' }, [h('h1', { class: 'pl-title' }, 'Q&A moderator'), h('p', { class: 'pa-note' }, 'Enter the passphrase you were given.'), input, h('button', { class: 'btn go', type: 'submit' }, 'Open the questions'), err]);
    form.onsubmit = function (ev) {
      ev.preventDefault();
      key = input.value;
      call({ action: 'verify' }).then(function (r) {
        if (r.status === 200) { try { sessionStorage.setItem('ppi_mod_key', key); } catch (e) {} start(); }
        else { key = ''; err.textContent = r.body.message || 'That did not work.'; }
      }).catch(function () { err.textContent = 'No connection to the server.'; });
    };
    app.appendChild(h('div', { class: 'pa-login' }, form));
    input.focus();
  }

  function head(info) {
    if (!headEl) return;
    var phase = info.phase === 'open' ? 'Q&A open' : info.phase === 'shown' ? 'Q&A closed' : 'Q&A not open yet';
    headEl.textContent = '';
    headEl.appendChild(h('span', { class: 'pa-chip ' + (info.phase === 'open' ? 'open' : 'idle') }, phase));
    headEl.appendChild(h('span', { class: 'pa-note' }, ' ' + (info.mode === 'live' ? 'Live session' : 'Rehearsal')));
  }

  function start() {
    app.textContent = '';
    headEl = h('div', { class: 'pa-acts', style: 'margin:0' });
    var seg = h('div', { class: 'pa-seg', role: 'group', 'aria-label': 'Order' }, [['old', 'Oldest first'], ['new', 'Newest first']].map(function (o) {
      return h('button', { type: 'button', 'aria-pressed': order === o[0] ? 'true' : 'false', onclick: function () { order = o[0]; Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-pressed', ['old', 'new'][i] === order ? 'true' : 'false'); }); if (feed) repaint(); } }, o[1]);
    }));
    app.appendChild(h('div', { class: 'pa-head' }, [h('h1', {}, 'Q&A moderator'), h('div', { class: 'pa-acts', style: 'margin:0' }, [seg, h('button', { class: 'btn ghost sm', type: 'button', onclick: logout }, 'Lock')])]));
    app.appendChild(headEl);
    app.appendChild(h('p', { class: 'pa-note' }, 'Questions arrive by themselves. Use Now answering for the one being read out, Answered when it is done, and Hide for anything unsuitable.'));
    box = h('div', { class: 'qa-list admin' });
    app.appendChild(box);
    feed = PollQA.create({
      keepHidden: true,
      get: function (keys) { return call({ action: 'qa_get', keys: keys }).then(function (r) { return r.status === 200 ? r.body.items : []; }); },
      onChange: function () { repaint(); }
    });
    clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
  }
  function repaint() {
    PollQA.draw(box, feed.items(), feed.current(), {
      order: order, controls: true, empty: 'No questions yet. They show up here as people send them.',
      onCur: function (k) { call({ action: 'qa_current', k: k }).then(tick); },
      onDone: function (k, on) { call({ action: 'qa_done', k: k, on: on }).then(tick); },
      onHide: function (k, on) { call({ action: 'qa_hide', k: k, on: on }).then(tick); }
    });
  }
  function tick() {
    return call({ action: 'qa_keys' }).then(function (r) {
      if (r.status === 401) { logout(); return; }
      if (r.status !== 200) { if (r.body && r.body.message) box.textContent = r.body.message; return; }
      head(r.body);
      return feed.update(r.body.keys, r.body.cur);
    }).catch(function () {});
  }

  if (key) start(); else login();
})();
