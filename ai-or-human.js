/* The decision map (/ai-or-human).
   The visitor picks three to five recurring decisions, answers five questions for each and one
   on waiting time. Each decision is placed in one of three zones: AI runs it, AI prepares and a
   person decides, or the leadership team owns it. The map shows on the page with no sign-up.
   The form unlocks the PDF, a print-only block filled from the answers.
   Nothing is stored in the browser: a refresh always starts from scratch. */
(function () {
  'use strict';

  var CONFIG = { shareUrl: 'https://www.kuma.partners/ai-or-human', min: 3, max: 5 };

  var CATALOGUE = [
    { group: 'Revenue', items: [
      'Qualifying inbound leads', 'Pricing and discount approvals', 'Renewal and churn-risk calls', 'Writing proposals and tender answers'
    ]},
    { group: 'Product and engineering', items: [
      'Prioritising the roadmap', 'Triaging bugs and support tickets', 'Release go or no-go'
    ]},
    { group: 'Operations and finance', items: [
      'Approving spend and invoices', 'Monthly reporting and the board pack', 'Forecast and budget changes'
    ]},
    { group: 'People and leadership', items: [
      'Hiring for key roles', 'Performance and promotion calls', 'Resolving conflicts between teams', 'Weekly status and alignment meetings'
    ]}
  ];

  var QUESTIONS = [
    { id: 'freq', q: 'How often does it come back?', options: [
      { v: 2, t: 'Every day or week' }, { v: 1, t: 'Every month' }, { v: 0, t: 'Every quarter or less' } ] },
    { id: 'undo', q: 'If it turns out wrong, how easily can it be undone?', options: [
      { v: 2, t: 'Within a week, at little cost' }, { v: 1, t: 'With real effort' }, { v: 0, t: 'Hard or impossible' } ] },
    { id: 'basis', q: 'What does it rest on?', options: [
      { v: 2, t: 'Data we already have' }, { v: 1, t: 'Data and experience' }, { v: 0, t: 'Context a few people carry' } ] },
    { id: 'trust', q: 'Is trust, a relationship or a conflict at its core?', options: [
      { v: 2, t: 'No' }, { v: 1, t: 'Partly' }, { v: 0, t: 'Yes, that is the heart of it' } ] },
    { id: 'owner', q: 'Who answers for the result?', options: [
      { v: 2, t: 'One named person' }, { v: 1, t: 'A team or a committee' }, { v: 0, t: 'Nobody clearly' } ] }
  ];

  var WAIT = [
    { v: 'Hours', t: 'Hours', text: 'Work waits hours for these decisions today. The gain from AI here is consistency and better preparation more than speed.' },
    { v: 'A few days', t: 'A few days', text: 'Work waits a few days for these decisions. Every decision you move out of a meeting gives those days back to the teams waiting on it.' },
    { v: 'About a week', t: 'About a week', text: 'Work waits about a week for these decisions. Across a year that is a large share of your teams’ time spent waiting, paid for out of runway. Moving the zone 1 and zone 2 decisions out of the meeting cycle is the fastest way to get it back.' },
    { v: 'Several weeks', t: 'Several weeks', text: 'Work waits several weeks for these decisions. At that pace the queue in front of your leadership team sets the speed of the company, and you pay for every week in burn.' }
  ];

  var ZONES = {
    run: { name: 'AI runs it', short: 'Zone 1' },
    prep: { name: 'AI prepares, a person decides', short: 'Zone 2' },
    human: { name: 'Your leadership team owns it', short: 'Zone 3' }
  };

  var NUM = ['none', 'one', 'two', 'three', 'four', 'five'];

  /* ---------- scoring ---------- */
  function place(a) {
    var score = a.freq + a.undo + a.basis + a.trust;
    var zone;
    if (a.undo === 0 || a.trust === 0) zone = 'human';
    else if (score >= 7) zone = 'run';
    else if (score >= 4) zone = 'prep';
    else zone = 'human';
    return { zone: zone, score: score, ownerGap: a.owner < 2 };
  }

  function reason(a, p) {
    if (p.zone === 'human') {
      var r = [];
      if (a.undo === 0) r.push('Hard to undo, so a person has to own the call.');
      if (a.trust === 0) r.push('Trust, a relationship or a conflict sits at its core.');
      if (!r.length) r.push('Rare and dependent on context in people, so automating it would save little.');
      return r.join(' ');
    }
    if (p.zone === 'run') {
      var caveat = a.undo < 2 ? 'Mistakes take some effort to fix, so a person reviews a sample each week.' :
        a.basis < 2 ? 'Part of it rests on experience, so write the rules down before AI takes over.' :
        a.trust < 2 ? 'People need to trust the outcome, so keep the reasoning visible.' :
        a.freq < 2 ? 'It comes back monthly, so start with a light set-up.' : '';
      return caveat ? 'Routine and based on data. ' + caveat : 'Frequent, easy to undo and based on data you already have. A person checks the exceptions.';
    }
    var why = a.basis < 2 ? 'the call needs experience or context' :
      a.undo < 2 ? 'a mistake would take real effort to fix' :
      a.trust < 2 ? 'people need to trust the outcome' : 'it does not come back often enough to run on its own';
    return 'AI can do the analysis and the first draft, but ' + why + '.';
  }

  // Lower-case the first letter for use inside a sentence, unless the word looks like an acronym (CRM, OKR).
  function lc(name) { return /^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name; }

  function joinList(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function analyse(st) {
    var rows = st.picked.map(function (name, i) {
      var a = st.answers[i];
      var p = place(a);
      return { name: name, a: a, zone: p.zone, score: p.score, ownerGap: p.ownerGap, why: reason(a, p) };
    });
    var by = { run: [], prep: [], human: [] };
    rows.forEach(function (r) { by[r.zone].push(r); });
    var cand = by.run.slice().sort(function (x, y) { return y.score - x.score; })[0] ||
      by.prep.slice().sort(function (x, y) { return y.score - x.score; })[0] || null;
    return { rows: rows, by: by, candidate: cand, gaps: rows.filter(function (r) { return r.ownerGap; }) };
  }

  /* ---------- tracking: does nothing until Plausible, gtag or a dataLayer is on the page ---------- */
  function track(name, props) {
    var data = props || {};
    try { if (typeof window.plausible === 'function') window.plausible('aoh_' + name, { props: data }); } catch (e) { /* never block */ }
    try { if (typeof window.gtag === 'function') window.gtag('event', 'aoh_' + name, data); } catch (e) { /* never block */ }
    try { if (window.dataLayer && window.dataLayer.push) window.dataLayer.push({ event: 'aoh_' + name, aoh: data }); } catch (e) { /* never block */ }
  }

  /* ---------- DOM ---------- */
  var app = document.querySelector('[data-aoh-app]');
  if (!app) return;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var stepsEl = $('[data-aoh-steps]', app);
  var progress = $('[data-aoh-progress]', app);
  var progLabel = $('[data-aoh-progress-label]', app);
  var progSection = $('[data-aoh-progress-section]', app);
  var progFill = $('[data-aoh-progress-fill]', app);
  var navEl = $('[data-aoh-nav]', app);
  var backBtn = $('[data-aoh-back]', app);
  var nextBtn = $('[data-aoh-next]', app);
  var resultEl = $('[data-aoh-result]', app);

  function fresh() { return { step: 0, picked: [], answers: [], wait: null, done: false, lead: null, started: false }; }
  var state = fresh();

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clean(v, max) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 60); }

  // Steps: 0 = pick, 1..n = one per decision, n+1 = waiting time.
  function totalSteps() { return state.picked.length + 2; }

  function setProgress(section) {
    var total = Math.max(totalSteps(), CONFIG.min + 2);
    progress.hidden = false;
    progLabel.textContent = 'Step ' + (state.step + 1) + ' of ' + total;
    progSection.textContent = section;
    progFill.style.width = Math.round((state.step / total) * 100) + '%';
  }

  function render() {
    resultEl.hidden = true;
    stepsEl.innerHTML = '';
    backBtn.hidden = state.step === 0;
    if (state.step === 0) renderPick();
    else if (state.step <= state.picked.length) renderDecision(state.step - 1);
    else renderWait();
  }

  function renderPick() {
    setProgress('Your decisions');
    var wrap = el('div', 'ai-or-human-step');
    wrap.appendChild(el('h3', 'ai-or-human-q', 'Which decisions come back every week or month in your company?'));
    wrap.appendChild(el('p', 'ai-or-human-hint', 'Pick three to five. Add your own if it is not on the list.'));
    CATALOGUE.forEach(function (g) {
      var box = el('div', 'ai-or-human-group');
      box.appendChild(el('span', 'ai-or-human-group-name', g.group));
      var list = el('div', 'ai-or-human-chips');
      g.items.forEach(function (name) { list.appendChild(chip(name)); });
      box.appendChild(list);
      wrap.appendChild(box);
    });
    // Own decisions added by the visitor
    var custom = state.picked.filter(function (n) { return !inCatalogue(n); });
    if (custom.length) {
      var box2 = el('div', 'ai-or-human-group');
      box2.appendChild(el('span', 'ai-or-human-group-name', 'Your own'));
      var list2 = el('div', 'ai-or-human-chips');
      custom.forEach(function (name) { list2.appendChild(chip(name)); });
      box2.appendChild(list2);
      wrap.appendChild(box2);
    }
    var add = el('div', 'ai-or-human-add');
    var label = el('label', null, 'Add your own');
    label.setAttribute('for', 'aoh-custom');
    var input = el('input'); input.type = 'text'; input.id = 'aoh-custom'; input.maxLength = 60;
    input.placeholder = 'For example: approving new suppliers';
    var addBtn = el('button', 'btn btn-secondary btn-sm', 'Add');
    addBtn.type = 'button';
    function addCustom() {
      var v = clean(input.value);
      if (!v) { input.focus(); return; }
      if (state.picked.length >= CONFIG.max) { count.textContent = 'You can map five decisions at most. Remove one first.'; return; }
      if (state.picked.indexOf(v) === -1) state.picked.push(v);
      renderPick();
      var again = $('#aoh-custom'); if (again) again.focus();
    }
    addBtn.addEventListener('click', addCustom);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
    var row = el('div', 'ai-or-human-add-row');
    row.appendChild(input); row.appendChild(addBtn);
    add.appendChild(label); add.appendChild(row);
    wrap.appendChild(add);
    var count = el('p', 'ai-or-human-count');
    count.setAttribute('role', 'status');
    count.textContent = state.picked.length + ' of 5 selected' + (state.picked.length < CONFIG.min ? '. Pick at least three.' : '.');
    wrap.appendChild(count);
    stepsEl.appendChild(wrap);
    navEl.hidden = false;
    nextBtn.hidden = false;
    nextBtn.disabled = state.picked.length < CONFIG.min;
  }

  function inCatalogue(name) {
    return CATALOGUE.some(function (g) { return g.items.indexOf(name) !== -1; });
  }

  function chip(name) {
    var b = el('button', 'ai-or-human-chip', name);
    b.type = 'button';
    var on = state.picked.indexOf(name) !== -1;
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', function () {
      var i = state.picked.indexOf(name);
      if (i !== -1) state.picked.splice(i, 1);
      else if (state.picked.length < CONFIG.max) state.picked.push(name);
      if (!state.started) { state.started = true; track('start'); }
      renderPick();
      var same = Array.prototype.filter.call(stepsEl.querySelectorAll('.ai-or-human-chip'), function (c) { return c.textContent === name; })[0];
      if (same) same.focus();
    });
    return b;
  }

  function renderDecision(i) {
    var name = state.picked[i];
    setProgress('Decision ' + (i + 1) + ' of ' + state.picked.length);
    var a = state.answers[i] || (state.answers[i] = {});
    var wrap = el('div', 'ai-or-human-step');
    wrap.appendChild(el('h3', 'ai-or-human-q', name));
    QUESTIONS.forEach(function (q) {
      var fs = el('fieldset', 'ai-or-human-row');
      fs.appendChild(el('legend', 'ai-or-human-row-q', q.q));
      var seg = el('div', 'ai-or-human-seg');
      q.options.forEach(function (o) {
        var b = el('button', 'ai-or-human-seg-btn', o.t);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(a[q.id] === o.v));
        b.addEventListener('click', function () {
          a[q.id] = o.v;
          Array.prototype.forEach.call(seg.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
          nextBtn.disabled = !complete(a);
        });
        seg.appendChild(b);
      });
      fs.appendChild(seg);
      wrap.appendChild(fs);
    });
    stepsEl.appendChild(wrap);
    navEl.hidden = false;
    nextBtn.hidden = false;
    nextBtn.disabled = !complete(a);
  }

  function complete(a) { return QUESTIONS.every(function (q) { return typeof a[q.id] === 'number'; }); }

  function renderWait() {
    setProgress('Waiting time');
    var wrap = el('div', 'ai-or-human-step');
    wrap.appendChild(el('h3', 'ai-or-human-q', 'When work waits for one of these decisions today, how long does it usually wait?'));
    var list = el('div', 'ai-or-human-options');
    WAIT.forEach(function (w) {
      var b = el('button', 'ai-or-human-option', w.t);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.wait === w.v));
      b.addEventListener('click', function () {
        state.wait = w.v;
        state.done = true;
        track('complete', { decisions: state.picked.length });
        renderResult(true);
      });
      list.appendChild(b);
    });
    wrap.appendChild(list);
    stepsEl.appendChild(wrap);
    navEl.hidden = false;
    nextBtn.hidden = true;
  }

  nextBtn.addEventListener('click', function () {
    if (state.step === 0) {
      if (state.picked.length < CONFIG.min) return;
      state.answers = state.answers.slice(0, state.picked.length);
    } else if (!complete(state.answers[state.step - 1] || {})) return;
    state.step += 1;
    render();
    scrollToApp();
  });
  backBtn.addEventListener('click', function () {
    if (state.step > 0) { state.step -= 1; render(); }
  });

  function scrollToApp() {
    var top = app.getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 100, behavior: 'smooth' });
  }

  /* ---------- result ---------- */
  function waitText() { var w = WAIT.filter(function (x) { return x.v === state.wait; })[0]; return w ? w.text : ''; }

  function summaryText(r) {
    var cap = function (n) { var w = NUM[n]; return w.charAt(0).toUpperCase() + w.slice(1); };
    return 'You mapped ' + NUM[r.rows.length] + ' decisions. ' + cap(r.by.run.length) + ' can run with AI. ' +
      cap(r.by.prep.length) + (r.by.prep.length <= 1 ? ' needs' : ' need') + ' AI to prepare and a person to decide. ' +
      cap(r.by.human.length) + ' must stay with your leadership team.';
  }
  function ownerText(r) {
    if (!r.gaps.length) return '';
    var names = r.gaps.map(function (g) { return '\u2018' + g.name + '\u2019'; });
    return 'No single person answers for ' + joinList(names) + '. Automating ' + (r.gaps.length === 1 ? 'it' : 'them') +
      ' would only move the problem. Name one owner with the authority to act first.';
  }
  function startText(r) {
    var c = r.candidate;
    if (!c) return 'None of these decisions is ready for automation yet, and that is a finding in itself. Your leadership time goes to decisions only people can take, so the gain from AI has to come from preparing them better and from moving smaller decisions closer to the work.';
    return 'Start with ' + lc(c.name) + '. ' + c.why + ' Run it as a six-week pilot with one owner and measure how long work waits for it before and after.' +
      (c.ownerGap ? ' Name that owner before anything else.' : '');
  }

  function renderResult(focus) {
    var r = analyse(state);
    stepsEl.innerHTML = '';
    progress.hidden = true;
    navEl.hidden = true;
    resultEl.hidden = false;

    $('[data-aoh-out="summary"]', resultEl).textContent = summaryText(r);
    ['run', 'prep', 'human'].forEach(function (z) {
      var ul = $('[data-aoh-col="' + z + '"]', resultEl);
      ul.innerHTML = '';
      if (!r.by[z].length) { ul.appendChild(el('li', 'ai-or-human-empty', 'Nothing here yet')); return; }
      r.by[z].forEach(function (row) {
        var li = el('li', 'ai-or-human-item');
        li.appendChild(el('span', 'ai-or-human-item-name', row.name));
        li.appendChild(el('span', 'ai-or-human-item-why', row.why));
        if (row.ownerGap) li.appendChild(el('span', 'ai-or-human-item-flag', 'No single owner'));
        ul.appendChild(li);
      });
    });
    var ob = $('[data-aoh-owner]', resultEl);
    ob.hidden = !r.gaps.length;
    $('[data-aoh-out="owner"]', resultEl).textContent = ownerText(r);
    $('[data-aoh-out="wait"]', resultEl).textContent = waitText();
    $('[data-aoh-out="start"]', resultEl).textContent = startText(r);
    $('[data-aoh-out="teaser"]', resultEl).textContent = state.lead
      ? 'Your PDF is ready, with a six-week pilot plan and the questions for your next leadership meeting.'
      : 'The PDF adds a six-week pilot plan' + (r.candidate ? ' for ' + lc(r.candidate.name) : '') + ', the owners to name and the questions to settle in your next leadership meeting.';
    syncForm();
    if (focus) { resultEl.focus({ preventScroll: true }); scrollToApp(); }
  }

  $('[data-aoh-restart]', resultEl).addEventListener('click', function () {
    var lead = state.lead;
    state = fresh();
    state.lead = lead;
    render();
    syncForm();
    scrollToApp();
  });

  /* ---------- sharing ---------- */
  var statusEl = $('[data-aoh-status]', resultEl);
  var statusTimer;
  function flash(t) {
    statusEl.textContent = t;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(function () { statusEl.textContent = ''; }, 4000);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed; top:0; left:0; opacity:0;';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function shareLink(src) { return CONFIG.shareUrl + '?utm_source=' + src + '&utm_medium=share'; }
  $('[data-aoh-share="copy"]', resultEl).addEventListener('click', function () {
    track('share', { channel: 'copy' });
    copyText(shareLink('colleague_copy')).then(
      function () { flash('✓ Link copied. Send it to a colleague and compare your maps.'); },
      function () { flash('Copy ' + CONFIG.shareUrl + ' by hand.'); }
    );
  });
  $('[data-aoh-share="mail"]', resultEl).addEventListener('click', function (e) {
    track('share', { channel: 'mail' });
    var body = 'Hi,\n\nI mapped some of our recurring decisions: what AI could run, what it should prepare and what has to stay with the leadership team.\n\n' +
      'Could you do the same from where you sit? It takes about four minutes:\n' + shareLink('colleague_mail') +
      '\n\nThen let’s compare where we placed things differently.';
    e.currentTarget.setAttribute('href', 'mailto:?subject=' + encodeURIComponent('Where should AI decide in our company?') +
      '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A'));
  });
  $('[data-aoh-share="linkedin"]', resultEl).addEventListener('click', function () { track('share', { channel: 'linkedin' }); });
  var book = $('[data-aoh-book]');
  if (book) book.addEventListener('click', function () { track('book_click'); });

  /* ---------- form and unlock ---------- */
  var form = $('[data-aoh-form]');
  var formView = $('[data-aoh-form-view]');
  var formSub = $('[data-aoh-form-sub]');
  var success = $('[data-aoh-success]');
  var printBtn = $('[data-aoh-print]');

  function setHidden(name, value) {
    var f = form && form.querySelector('[name="' + name + '"]');
    if (f) f.value = value == null ? '' : String(value);
  }

  function syncForm() {
    if (!form) return;
    if (formSub) {
      if (state.done) {
        var r = analyse(state);
        formSub.textContent = 'Your map: ' + r.by.run.length + ' to automate, ' + r.by.prep.length + ' for AI to prepare, ' +
          r.by.human.length + ' for your leadership team. Add your details and the PDF opens straight away.';
      } else {
        formSub.textContent = 'Build your map above first. The PDF is written from your answers.';
      }
    }
    if (state.lead) {
      formView.hidden = true;
      success.hidden = false;
      $('[data-aoh-success-title]', success).textContent = state.done ? 'Your map is ready.' : 'Almost there.';
      if (!state.done) $('[data-aoh-success-text]', success).textContent = 'Finish your map above and the PDF will be ready here.';
      printBtn.hidden = !state.done;
      $('.ai-or-human-print-hint', success).hidden = !state.done;
    }
  }

  function fillHidden() {
    var r = state.done ? analyse(state) : null;
    var names = function (z) { return r ? r.by[z].map(function (x) { return x.name; }).join('; ') : ''; };
    setHidden('decisions', r ? r.rows.map(function (x) {
      return x.name + ' [' + ZONES[x.zone].short + '] f' + x.a.freq + ' u' + x.a.undo + ' b' + x.a.basis + ' t' + x.a.trust + ' o' + x.a.owner;
    }).join(' | ') : 'Map not completed');
    setHidden('ai_runs_it', names('run'));
    setHidden('ai_prepares', names('prep'));
    setHidden('leadership_owns', names('human'));
    setHidden('owner_gaps', r ? r.gaps.map(function (x) { return x.name; }).join('; ') : '');
    setHidden('wait_time', state.wait || '');
    var contact = $('[data-aoh-contact]', form);
    setHidden('contact_me', contact && contact.checked ? 'Yes' : 'No');
    var utm = [];
    try {
      var p = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { if (p.get(k)) utm.push(k + '=' + p.get(k)); });
    } catch (e) { /* ignore */ }
    setHidden('utm', utm.join('&'));
  }

  function showError(name, show) {
    var e = form.querySelector('[data-aoh-error="' + name + '"]');
    if (e) e.classList.toggle('is-visible', !!show);
  }
  function validate() {
    var name = $('#aoh-name', form), email = $('#aoh-email', form), stage = $('#aoh-stage', form);
    var nameOk = name.value.trim().length > 1;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var stageOk = !!stage.value;
    showError('name', !nameOk); showError('email', !emailOk); showError('stage', !stageOk);
    if (!(nameOk && emailOk && stageOk)) { (!nameOk ? name : (!emailOk ? email : stage)).focus(); return false; }
    return true;
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = $('[data-aoh-form-error]', form);
      if (err) err.hidden = true;
      if (!validate()) return;
      fillHidden();
      var btn = $('[data-aoh-submit]', form);
      var label = $('[data-btn-label]', btn);
      var original = label.textContent;
      btn.disabled = true; label.textContent = 'Sending…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('Status ' + res.status);
        var wantsCall = $('[data-aoh-contact]', form).checked;
        state.lead = {
          name: clean($('#aoh-name', form).value, 80),
          company: clean($('#aoh-company', form).value, 80),
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        };
        track('form_submit', { contact: wantsCall ? 'yes' : 'no' });
        $('[data-aoh-success-text]', success).textContent = wantsCall
          ? 'A Kuma partner will be in touch within one business day to review your map with you.'
          : 'If you want an outside view, book a call with Sven from this section.';
        syncForm();
        if (state.done) renderResult(false);
        success.focus();
      }).catch(function () {
        if (err) err.hidden = false;
        btn.disabled = false; label.textContent = original;
      });
    });
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'aoh-name') showError('name', false);
      if (t.id === 'aoh-email') showError('email', false);
      if (t.id === 'aoh-stage') showError('stage', false);
    });
  }

  /* ---------- the PDF ---------- */
  var report = $('[data-aoh-report]');
  function rep(key) { return report.querySelector('[data-rep="' + key + '"]'); }
  function fillList(node, items) {
    node.innerHTML = '';
    items.forEach(function (t) { node.appendChild(el('li', null, t)); });
  }

  function pilot(r) {
    var c = r.candidate;
    if (!c) {
      return { title: 'Before any pilot: prepare the human decisions better', steps: [
        'Pick the zone 3 decision that takes the most leadership time.',
        'Write down which parts of it are analysis and which are judgement.',
        'For the next four meetings, let AI prepare the analysis so the time in the room goes to the judgement.',
        'Review with the team whether the meetings got shorter and the decisions clearer.'
      ]};
    }
    return { title: 'Pilot: ' + c.name, steps: [
      'Name one owner for the decision and write down the rules it follows today, exceptions included.',
      'Measure two weeks of the current state: how often it comes up and how long work waits for it.',
      c.zone === 'run'
        ? 'For four weeks, let AI take the decision within those rules. The owner reviews every exception and a sample of the rest each week.'
        : 'For four weeks, let AI prepare the analysis and a recommendation. The owner decides and notes when and why they overrule it.',
      'Compare waiting time and error rate with the first two weeks, then decide with the leadership team whether to extend, adjust or stop.'
    ]};
  }

  function fillReport() {
    var r = analyse(state);
    var lead = state.lead || { name: '', company: '', date: '' };
    rep('meta').textContent = 'Prepared for ' + lead.name + (lead.company ? ', ' + lead.company : '') + ' · ' + lead.date;
    rep('summary').textContent = summaryText(r);
    ['run', 'prep', 'human'].forEach(function (z) {
      fillList(rep(z), r.by[z].length ? r.by[z].map(function (x) { return x.name; }) : ['Nothing here yet']);
    });
    var rows = rep('rows');
    rows.innerHTML = '';
    r.rows.forEach(function (x) {
      var tr = el('tr');
      tr.appendChild(el('td', null, x.name));
      tr.appendChild(el('td', null, ZONES[x.zone].short));
      tr.appendChild(el('td', null, x.why + (x.ownerGap ? ' No single owner today.' : '')));
      rows.appendChild(tr);
    });
    rep('ownerBlock').hidden = !r.gaps.length;
    rep('owner').textContent = ownerText(r);
    var pl = pilot(r);
    rep('pilotTitle').textContent = pl.title;
    fillList(rep('pilot'), pl.steps);
    rep('wait').textContent = waitText();
    rep('human2').textContent = r.by.human.length
      ? joinList(r.by.human.map(function (x) { return '\u2018' + x.name + '\u2019'; })) + (r.by.human.length === 1 ? ' stays' : ' stay') +
        ' with your leadership team. As AI takes over more of the preparation, these decisions carry more weight. How clearly they are owned and how well the team handles disagreement on them sets the real speed of the company.'
      : 'None of the decisions you mapped has to stay with the leadership team. Check that with them: most companies have more decisions in zone 3 than one person sees.';
    var qs = ['Which decision on this map would each of us place in a different zone?'];
    if (r.candidate) qs.push('Who owns ' + lc(r.candidate.name) + ', and are they ready to run a six-week pilot?');
    if (r.gaps.length) qs.push('Who answers for ' + lc(r.gaps[0].name) + ' today?');
    qs.push('Which decisions reach this meeting that someone closer to the work could take with AI support?');
    qs.push('What would our best people do with the time we give back?');
    fillList(rep('questions'), qs);
  }

  var originalTitle = document.title;
  window.addEventListener('afterprint', function () { document.title = originalTitle; });
  printBtn.addEventListener('click', function () {
    if (!state.lead || !state.done) return;
    fillReport();
    track('pdf_download');
    document.title = 'Kuma decision map' + (state.lead.company ? ', ' + state.lead.company : '');
    window.print();
  });
  var teaserLink = $('.ai-or-human-teaser a', resultEl);
  if (teaserLink) teaserLink.addEventListener('click', function (e) {
    if (state.lead && state.done) { e.preventDefault(); printBtn.click(); }
  });

  render();
  syncForm();

  // Exposed for testing.
  window.aohPlace = place;
})();
