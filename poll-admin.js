/* Presenter page: run the poll, edit the questions, export and reset. Protected by the POLL_ADMIN_KEY passphrase. */
(function () {
  var AUDIENCE = 'https://www.kuma.partners/PPI-engagement/';
  var app = document.getElementById('app');
  var key = '';
  try { key = sessionStorage.getItem('ppi_admin_key') || ''; } catch (e) {}
  var data = null;            // { config, state, counts }
  var tab = 'run';
  var model = null, dirty = false;
  var peek = null, peekOn = false;
  var timers = [];
  var jump = false; // after choosing a question, bring the controls into view on narrow screens (iPad portrait)
  var qaFeed = null;
  var TYPE_LABEL = { single: 'Single choice', multiple: 'Multiple choice', scale: 'Rating 1 to 7', cloud: 'Word cloud', text: 'Open text', qa: 'Live Q&A', wall: 'Live answers (shown as they arrive)' };

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
  function clearTimers() { timers.forEach(clearInterval); timers = []; qaFeed = null; }
  function toast(msg) {
    var t = h('div', { class: 'pa-toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function call(body) {
    return fetch('/api/poll/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-poll-key': key }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; }); });
  }
  function twoStep(btn, armedText, fn) {
    var orig = btn.textContent, armed = false, t;
    btn.onclick = function () {
      if (!armed) { armed = true; btn.textContent = armedText; t = setTimeout(function () { armed = false; btn.textContent = orig; }, 4000); return; }
      clearTimeout(t); armed = false; btn.textContent = orig; fn();
    };
    return btn;
  }
  function logout() { try { sessionStorage.removeItem('ppi_admin_key'); } catch (e) {} key = ''; data = null; clearTimers(); renderLogin(); }

  // act: run an action, store the new overview, redraw
  function act(body, done) {
    return call(body).then(function (r) {
      if (r.status === 401) { logout(); return; }
      if (r.status !== 200) { toast(r.body.message || 'That did not work.'); return; }
      if (r.body.config) { data = r.body; if (!dirty) model = JSON.parse(JSON.stringify(data.config.questions)); }
      if (done) done(r.body);
      render();
    }).catch(function () { toast('No connection to the server.'); });
  }

  // ---------- login ----------
  function renderLogin(msg) {
    clearTimers();
    app.textContent = '';
    var input = h('input', { class: 'pl-in', type: 'password', autocomplete: 'current-password', 'aria-label': 'Passphrase', placeholder: 'Passphrase' });
    var err = h('div', { class: 'pa-err' }, msg || '');
    var go = h('button', { class: 'btn go', type: 'submit' }, 'Open poll control');
    var form = h('form', { class: 'pl-card' }, [h('h1', { class: 'pl-title' }, 'Poll control'), h('p', { class: 'pa-note' }, 'Presenter access only.'), input, go, err]);
    form.onsubmit = function (ev) {
      ev.preventDefault();
      key = input.value;
      call({ action: 'verify' }).then(function (r) {
        if (r.status === 200) { try { sessionStorage.setItem('ppi_admin_key', key); } catch (e) {} load(); }
        else { key = ''; err.textContent = r.body.message || 'That did not work.'; }
      }).catch(function () { err.textContent = 'No connection to the server.'; });
    };
    app.appendChild(h('div', { class: 'pa-login' }, form));
    input.focus();
  }

  function load() {
    call({ action: 'overview' }).then(function (r) {
      if (r.status !== 200) { logout(); return; }
      data = r.body; model = JSON.parse(JSON.stringify(data.config.questions)); dirty = false;
      render();
    }).catch(function () { renderLogin('No connection to the server.'); });
  }

  // ---------- shell ----------
  function render() {
    clearTimers();
    app.textContent = '';
    var st = data.state;
    var seg = h('div', { class: 'pa-seg', role: 'group', 'aria-label': 'Mode' }, ['rehearsal', 'live'].map(function (m) {
      return h('button', { type: 'button', 'aria-pressed': st.mode === m ? 'true' : 'false', onclick: function () { if (st.mode !== m) act({ action: 'mode', mode: m }, function () { toast(m === 'live' ? 'Live mode. Votes are now counted for the real session.' : 'Rehearsal mode.'); }); } }, m === 'live' ? 'Live' : 'Rehearsal');
    }));
    app.appendChild(h('div', { class: 'pa-head' }, [
      h('h1', {}, 'Poll control'),
      h('div', { class: 'pa-acts', style: 'margin:0' }, [
        seg,
        h('a', { class: 'btn ghost sm', href: '/PPI-engagement/screen', target: '_blank', rel: 'noopener' }, 'Open big screen'),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: logout }, 'Lock')
      ])
    ]));
    app.appendChild(st.mode === 'rehearsal'
      ? h('div', { class: 'pa-banner rehearsal' }, 'Rehearsal mode. Votes are kept apart from the live session. Switch to Live before the real presentation.')
      : h('div', { class: 'pa-banner live' }, 'Live mode. Votes are counted for the real session.'));
    var tabs = h('div', { class: 'pa-tabs', role: 'tablist' }, [['run', 'Run'], ['edit', 'Questions'], ['data', 'Data and QR code']].map(function (t) {
      return h('button', { role: 'tab', type: 'button', 'aria-selected': tab === t[0] ? 'true' : 'false', onclick: function () { tab = t[0]; render(); } }, t[1]);
    }));
    app.appendChild(tabs);
    app.appendChild(tab === 'run' ? runView() : tab === 'edit' ? editView() : dataView());
    if (jump) {
      jump = false;
      var pn = app.querySelector('.pa-panel');
      if (pn && window.matchMedia('(max-width:860px)').matches) { try { pn.scrollIntoView({ block: 'start' }); } catch (e) { pn.scrollIntoView(); } }
    }
  }

  // ---------- run ----------
  function runView() {
    var st = data.state, qs = data.config.questions;
    var cur = st.qid && qs.filter(function (q) { return q.id === st.qid; })[0];
    var list = h('div', { class: 'pa-list' }, qs.map(function (q, i) {
      return h('button', { type: 'button', class: 'pa-row' + (cur && cur.id === q.id ? ' on' : ''), onclick: function () { if (!cur || cur.id !== q.id) act({ action: 'select', qid: q.id }, function () { jump = true; }); } }, [
        h('span', { class: 'no' }, String(i + 1)),
        h('span', {}, [q.text, h('small', {}, TYPE_LABEL[q.type])]),
        h('span', { class: 'ct' }, String(data.counts[q.id] || 0))
      ]);
    }));
    var panel = h('div', { class: 'pa-panel' });
    if (!cur) {
      panel.appendChild(h('span', { class: 'pa-chip idle' }, 'No question selected'));
      panel.appendChild(h('p', { class: 'pa-q' }, 'Choose a question in the list.'));
      panel.appendChild(h('p', { class: 'pa-note' }, 'Phones show a waiting screen until you open a poll.'));
      return h('div', { class: 'pa-run' }, [list, panel]);
    }
    var phaseText = { ready: 'Ready, not open yet', open: 'Poll open', shown: 'Results shown' }[st.phase];
    panel.appendChild(h('span', { class: 'pa-chip ' + st.phase }, phaseText));
    panel.appendChild(h('p', { class: 'pa-q' }, cur.text));
    panel.appendChild(h('p', { class: 'pa-note' }, TYPE_LABEL[cur.type] + (cur.type === 'multiple' ? ', up to ' + cur.max + ' choices' : '')));
    var isQa = cur.type === 'qa' || cur.type === 'wall';
    var wallQ = cur.type === 'wall';
    var countB = h('b', {}, String(data.counts[cur.id] || 0));
    panel.appendChild(h('div', { class: 'pa-big' }, [countB, h('span', { class: 'pa-note' }, isQa && !wallQ ? 'questions' : 'answered')]));

    var acts = h('div', { class: 'pa-acts' });
    if (isQa) {
      if (st.phase === 'ready') acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'open' }); } }, wallQ ? 'Open answers' : 'Open Q&A'));
      else if (st.phase === 'open') acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'show' }); } }, wallQ ? 'Close answers' : 'Close Q&A'));
      else {
        acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function () { act({ action: 'open' }); } }, wallQ ? 'Re-open answers' : 'Re-open Q&A'));
        acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'next' }); } }, 'Next question'));
      }
      panel.appendChild(acts);
      panel.appendChild(h('p', { class: 'pa-note' }, st.phase === 'ready' ? 'Phones switch to this question within a few seconds of opening.' : (wallQ ? 'Answers appear on the big screen at once, one per person. You can hide any answer below.' : 'Questions appear on the big screen at once. Each person can send up to three. Someone from HR can read them out on the moderator page.')));
      if (!wallQ) panel.appendChild(h('p', { class: 'pa-note' }, ['Moderator page for HR: ', h('a', { href: '/PPI-engagement/moderator', target: '_blank', rel: 'noopener' }, 'kuma.partners/PPI-engagement/moderator')]));
      if (st.phase !== 'ready') {
        var qbox = h('div', { class: 'pa-sub' });
        var qlist = h('div', { class: 'qa-list admin' });
        qbox.appendChild(h('h3', {}, wallQ ? 'Live answers' : 'Live questions'));
        qbox.appendChild(qlist);
        panel.appendChild(qbox);
        startQa(qlist, 'new', cur);
      }
    } else if (st.phase === 'ready') {
      acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'open' }); } }, 'Open poll'));
      panel.appendChild(acts);
      panel.appendChild(h('p', { class: 'pa-note' }, 'Phones switch to this question within a few seconds of opening.'));
    } else if (st.phase === 'open') {
      acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { peekOn = false; act({ action: 'show' }); } }, 'Show results'));
      acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function () { peekOn = !peekOn; render(); } }, peekOn ? 'Hide live answers' : 'Peek at live answers'));
      panel.appendChild(acts);
      panel.appendChild(h('p', { class: 'pa-note' }, 'Show results closes the poll and puts the results on the big screen.'));
    } else {
      acts.appendChild(st.phones
        ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { act({ action: 'unpublish' }); } }, 'Hide results from phones')
        : h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'publish' }); } }, 'Publish results to phones'));
      acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function () { act({ action: 'open' }); } }, 'Re-open poll'));
      acts.appendChild(h('button', { class: 'btn go', type: 'button', onclick: function () { act({ action: 'next' }); } }, 'Next question'));
      panel.appendChild(acts);
      panel.appendChild(h('p', { class: 'pa-note' }, st.phones ? 'Phones are showing the results.' : 'Phones show "Voting is closed" until you publish.'));
    }

    var box = h('div', { class: 'pa-sub' });
    if (!isQa) panel.appendChild(box);
    var drawPeek = function (res) {
      box.textContent = '';
      box.appendChild(h('h3', {}, st.phase === 'shown' ? 'Results, with moderation' : 'Live answers (only you see this)'));
      var holder = h('div');
      box.appendChild(holder);
      PollRender.render(holder, res, { admin: true, onHide: function (token, hid) { act({ action: 'hide', qid: cur.id, token: token, hidden: hid }); } });
    };
    var doPeek = function () { call({ action: 'peek', qid: cur.id }).then(function (r) { if (r.status === 200) drawPeek(r.body.result); }); };
    if (isQa) { /* the live list above replaces the peek */ }
    else if (st.phase === 'shown' || (st.phase === 'open' && peekOn)) { doPeek(); if (st.phase === 'open') timers.push(setInterval(doPeek, 4000)); }
    else box.hidden = true;

    if (st.phase === 'open' || st.phase === 'ready') {
      timers.push(setInterval(function () {
        call({ action: 'count', qid: cur.id }).then(function (r) { if (r.status === 200) countB.textContent = r.body.n; });
      }, 2000));
    }

    var tail = h('div', { class: 'pa-sub' });
    var resetB = h('button', { class: 'btn danger sm', type: 'button' }, 'Reset this question');
    twoStep(resetB, 'Click again to delete its answers', function () { act({ action: 'reset', scope: 'question', qid: cur.id }, function () { toast('Answers for this question deleted.'); }); });
    tail.appendChild(resetB);
    tail.appendChild(document.createTextNode(' '));
    tail.appendChild(h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { act({ action: 'idle' }); } }, 'Back to waiting screen'));
    panel.appendChild(tail);
    return h('div', { class: 'pa-run' }, [list, panel]);
  }

  // live Q&A list inside the presenter page, refreshed every second
  function startQa(box, order, q) {
    var feed = PollQA.create({
      keepHidden: true,
      get: function (keys) { return call({ action: 'qa_get', qid: q.id, keys: keys }).then(function (r) { return r.status === 200 ? r.body.items : []; }); },
      onChange: function (items, curKey) {
        PollQA.draw(box, items, curKey, {
          order: order, controls: true, simple: q.type === 'wall', empty: 'Nothing yet.',
          onCur: function (k) { call({ action: 'qa_current', qid: q.id, k: k }).then(function () { tickQa(); }); },
          onDone: function (k, on) { call({ action: 'qa_done', qid: q.id, k: k, on: on }).then(function () { tickQa(); }); },
          onHide: function (k, on) { call({ action: 'qa_hide', qid: q.id, k: k, on: !on ? false : true }).then(function () { tickQa(); }); }
        });
      }
    });
    function tickQa() {
      return call({ action: 'qa_keys', qid: q.id }).then(function (r) { if (r.status === 200) return feed.update(r.body.keys, r.body.cur); });
    }
    qaFeed = feed;
    tickQa();
    timers.push(setInterval(tickQa, 1000));
  }

  // ---------- editor ----------
  function newId() { return 'n' + Math.random().toString(16).slice(2, 8); }
  function blank(type) {
    var q = { id: newId(), type: type, text: '' };
    if (type === 'single' || type === 'multiple') { q.options = [{ id: newId(), label: '' }, { id: newId(), label: '' }]; if (type === 'multiple') q.max = 2; }
    if (type === 'scale') { q.low = ''; q.high = ''; }
    if (type === 'qa') q.text = 'Your questions for us';
    if (type === 'wall') q.text = 'What is your takeaway from today?';
    return q;
  }
  function editView() {
    var wrap = h('div', { class: 'pa-ed' });
    var mark = function () { dirty = true; saveNote.textContent = 'Unsaved changes'; };
    var saveNote = h('span', { class: 'pa-note' }, dirty ? 'Unsaved changes' : 'All changes saved');
    var rebuild = function () { render(); };

    model.forEach(function (q, i) {
      var votes = data.counts[q.id] || 0;
      var bar = h('div', { class: 'bar' }, [
        h('strong', {}, 'Question ' + (i + 1)),
        h('div', { class: 'pa-acts', style: 'margin:0' }, [
          h('button', { class: 'btn ghost sm', type: 'button', disabled: i === 0, 'aria-label': 'Move up', onclick: function () { model.splice(i - 1, 0, model.splice(i, 1)[0]); mark(); rebuild(); } }, 'Up'),
          h('button', { class: 'btn ghost sm', type: 'button', disabled: i === model.length - 1, 'aria-label': 'Move down', onclick: function () { model.splice(i + 1, 0, model.splice(i, 1)[0]); mark(); rebuild(); } }, 'Down'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { var c = JSON.parse(JSON.stringify(q)); c.id = newId(); (c.options || []).forEach(function (o) { o.id = newId(); }); model.splice(i + 1, 0, c); mark(); rebuild(); } }, 'Duplicate'),
          twoStep(h('button', { class: 'btn danger sm', type: 'button' }, 'Delete'), 'Click again to delete', function () { model.splice(i, 1); mark(); rebuild(); })
        ])
      ]);
      var typeSel = h('select', { 'aria-label': 'Type', onchange: function (ev) {
        var t = ev.target.value, old = q;
        var nq = blank(t); nq.id = old.id; nq.text = old.text;
        if ((t === 'single' || t === 'multiple') && old.options) { nq.options = old.options; if (t === 'multiple') nq.max = Math.min(2, old.options.length); }
        model[i] = nq; mark(); rebuild();
      } }, Object.keys(TYPE_LABEL).map(function (t) { return h('option', { value: t, selected: t === q.type }, TYPE_LABEL[t]); }));
      var text = h('input', { type: 'text', maxlength: '200', value: q.text, placeholder: 'The question', oninput: function (ev) { q.text = ev.target.value; mark(); } });
      var card = h('div', { class: 'pa-qc' }, [bar, h('label', {}, ['Type', typeSel]), h('label', {}, ['Question', text])]);

      if (q.options) {
        var opts = h('div', { class: 'pa-ed', style: 'gap:6px' });
        q.options.forEach(function (o, j) {
          opts.appendChild(h('div', { class: 'pa-opt' }, [
            h('input', { type: 'text', maxlength: '80', value: o.label, placeholder: 'Option ' + (j + 1), 'aria-label': 'Option ' + (j + 1), oninput: function (ev) { o.label = ev.target.value; mark(); } }),
            h('button', { class: 'btn ghost sm', type: 'button', disabled: j === 0, 'aria-label': 'Move option up', onclick: function () { q.options.splice(j - 1, 0, q.options.splice(j, 1)[0]); mark(); rebuild(); } }, 'Up'),
            h('button', { class: 'btn ghost sm', type: 'button', disabled: j === q.options.length - 1, 'aria-label': 'Move option down', onclick: function () { q.options.splice(j + 1, 0, q.options.splice(j, 1)[0]); mark(); rebuild(); } }, 'Down'),
            h('button', { class: 'btn ghost sm', type: 'button', disabled: q.options.length <= 2, 'aria-label': 'Remove option', onclick: function () { q.options.splice(j, 1); if (q.max > q.options.length) q.max = q.options.length; mark(); rebuild(); } }, 'Remove')
          ]));
        });
        card.appendChild(h('label', {}, ['Options', opts]));
        if (q.options.length < 10) card.appendChild(h('div', {}, h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { q.options.push({ id: newId(), label: '' }); mark(); rebuild(); } }, 'Add option')));
        if (q.type === 'multiple') {
          card.appendChild(h('label', {}, ['Maximum choices per person', h('input', { type: 'number', min: '1', max: String(q.options.length), value: String(q.max || 2), oninput: function (ev) { q.max = parseInt(ev.target.value, 10) || 1; mark(); } })]));
        }
      }
      if (q.type === 'scale') {
        card.appendChild(h('div', { class: 'pa-two' }, [
          h('label', {}, ['Label for 1', h('input', { type: 'text', maxlength: '30', value: q.low || '', placeholder: 'For example: Not at all', oninput: function (ev) { q.low = ev.target.value; mark(); } })]),
          h('label', {}, ['Label for 7', h('input', { type: 'text', maxlength: '30', value: q.high || '', placeholder: 'For example: Completely', oninput: function (ev) { q.high = ev.target.value; mark(); } })])
        ]));
      }
      if (q.type === 'cloud') card.appendChild(h('p', { class: 'pa-note' }, 'Each person can enter up to three words.'));
      if (q.type === 'qa') card.appendChild(h('p', { class: 'pa-note' }, 'Each person can send up to three questions, up to 280 characters each. They show on the big screen at once. Put this question near the end.'));
      if (q.type === 'wall') card.appendChild(h('p', { class: 'pa-note' }, 'Each person sends one answer, up to 280 characters. Answers pop up on the big screen one after the other.'));
      if (q.type === 'text') card.appendChild(h('p', { class: 'pa-note' }, 'Answers are limited to 280 characters.'));
      if (votes > 0) card.appendChild(h('p', { class: 'pa-note' }, votes + ' answers are stored for this question in the current mode. After changing options or the scale, reset the question on the Run tab.'));
      wrap.appendChild(card);
    });

    var addSel = h('select', { 'aria-label': 'New question type' }, Object.keys(TYPE_LABEL).map(function (t) { return h('option', { value: t }, TYPE_LABEL[t]); }));
    var addRow = h('div', { class: 'pa-acts' }, [
      addSel,
      h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (model.length >= 20) { toast('At most 20 questions.'); return; } model.push(blank(addSel.value)); mark(); rebuild(); } }, 'Add question')
    ]);
    addSel.className = 'pa-select';
    addSel.style.maxWidth = '240px';
    wrap.appendChild(addRow);

    var save = h('button', { class: 'btn go', type: 'button', onclick: function () {
      for (var i = 0; i < model.length; i++) {
        var q = model[i];
        if (!q.text.trim()) { toast('Question ' + (i + 1) + ' has no text.'); return; }
        if (q.options && q.options.filter(function (o) { return o.label.trim(); }).length < 2) { toast('Question ' + (i + 1) + ' needs at least two options.'); return; }
      }
      call({ action: 'save', questions: model }).then(function (r) {
        if (r.status === 401) { logout(); return; }
        if (r.status !== 200) { toast(r.body.message || 'Could not save.'); return; }
        data = r.body; model = JSON.parse(JSON.stringify(data.config.questions)); dirty = false; toast('Saved.'); render();
      }).catch(function () { toast('No connection to the server.'); });
    } }, 'Save questions');
    var restore = twoStep(h('button', { class: 'btn danger sm', type: 'button' }, 'Restore the preloaded questions'), 'Click again to replace all questions', function () {
      dirty = false; act({ action: 'restore' }, function () { toast('Preloaded questions restored.'); });
    });
    wrap.appendChild(h('div', { class: 'pa-save' }, [save, saveNote, restore]));
    return wrap;
  }

  // ---------- data and QR ----------
  function download(name, mime, text, bom) {
    var a = h('a', { href: URL.createObjectURL(new Blob([bom ? '﻿' + text : text], { type: mime })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function exportCsv(then) {
    return call({ action: 'export' }).then(function (r) {
      if (r.status !== 200) { toast(r.body.message || 'Export failed.'); return; }
      download(r.body.filename, 'text/csv', r.body.csv, true);
      if (then) then();
    });
  }
  function dataView() {
    var wrap = h('div', { class: 'pa-ed' });
    wrap.appendChild(h('div', { class: 'pa-panel' }, [
      h('h2', { class: 'pa-q' }, 'Export'),
      h('p', { class: 'pa-note' }, 'A CSV file with the totals for every question and every open text answer in the current mode. No names or IDs.'),
      h('div', { class: 'pa-acts' }, h('button', { class: 'btn go', type: 'button', onclick: function () { exportCsv(); } }, 'Download CSV'))
    ]));

    var qrHolder = h('div', { class: 'pa-qrbox' });
    qrHolder.innerHTML = PollQR.svg(AUDIENCE);
    wrap.appendChild(h('div', { class: 'pa-panel' }, [
      h('h2', { class: 'pa-q' }, 'QR code for the audience'),
      h('p', { class: 'pa-note' }, AUDIENCE),
      qrHolder,
      h('div', { class: 'pa-acts' }, [
        h('button', { class: 'btn go', type: 'button', onclick: function () { var a = h('a', { href: PollQR.png(AUDIENCE, 1200), download: 'ppi-engagement-qr.png' }); document.body.appendChild(a); a.click(); a.remove(); } }, 'Download PNG'),
        h('button', { class: 'btn ghost', type: 'button', onclick: function () { download('ppi-engagement-qr.svg', 'image/svg+xml', PollQR.svg(AUDIENCE)); } }, 'Download SVG'),
        h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (navigator.clipboard) navigator.clipboard.writeText(AUDIENCE).then(function () { toast('Link copied.'); }); } }, 'Copy link')
      ])
    ]));

    var typed = h('input', { type: 'text', class: 'pl-in', placeholder: 'Type RESET', 'aria-label': 'Type RESET to confirm', style: 'max-width:220px;margin:0' });
    var go = h('button', { class: 'btn danger', type: 'button', onclick: function () {
      if (typed.value.trim() !== 'RESET') { toast('Type RESET first.'); return; }
      exportCsv(function () { act({ action: 'reset', scope: 'all' }, function (b) { typed.value = ''; toast('All answers in this mode deleted (' + b.removed + ' records). A CSV was downloaded first.'); }); });
    } }, 'Delete all answers');
    wrap.appendChild(h('div', { class: 'pa-panel' }, [
      h('h2', { class: 'pa-q' }, 'Start from scratch'),
      h('p', { class: 'pa-note' }, 'Deletes every answer in the current mode (' + data.state.mode + ') and keeps your questions. A CSV downloads first, so nothing is lost by accident.'),
      h('div', { class: 'pa-acts' }, [typed, go])
    ]));
    return wrap;
  }

  window.addEventListener('beforeunload', function (ev) { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });
  if (key) load(); else renderLogin();
})();
