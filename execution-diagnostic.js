/* The execution diagnostic (/execution-diagnostic).
   Nine steps: three context questions, five scored questions and one perception check.
   The result shows on the page with no sign-up. The form in the dark section unlocks the PDF brief,
   which is a print-only block filled from the answers (the browser saves it as a PDF).
   Comparison without a backend: the invite link carries the inviter's first name, company and scores
   in the URL hash (#i=). The colleague answers the six core questions and sees both views side by side;
   their return link (#x=) carries both sets, so the inviter sees the same comparison.
   Nothing is stored in the browser: a refresh always starts the diagnostic from scratch. */
(function () {
  'use strict';

  var STORE_KEY = 'kuma_execution_diagnostic_v1';

  var STEPS = [
    { id: 'stage', section: 'Context', title: 'Where is the company today?', options: [
      { v: 'Series A', t: 'Series A, fast growth', d: 'Roughly €3M to €8M ARR.' },
      { v: 'Series B', t: 'Series B, scale-up', d: 'Roughly €8M to €25M ARR.' },
      { v: 'Series C+', t: 'Series C or later', d: 'Roughly €25M ARR and above.' },
      { v: 'Post-merger or integrated entity', t: 'Post-merger or integrated entity', d: 'Two organisations now run as one.' }
    ]},
    { id: 'headcount', section: 'Context', title: 'How many people work in the company?', options: [
      { v: '20-50', t: '20 to 50' }, { v: '51-150', t: '51 to 150' },
      { v: '151-350', t: '151 to 350' }, { v: '350+', t: 'More than 350' }
    ]},
    { id: 'ai_level', section: 'Context', title: 'How far has AI gone inside the company?', options: [
      { v: 'Ad-hoc personal use', t: 'Ad-hoc personal use', d: 'Individual ChatGPT or Claude seats, used as people see fit.' },
      { v: 'Departmental pilots', t: 'Departmental pilots', d: 'Copilot, code generation or CRM assistants in some teams.' },
      { v: 'Company-wide deployment', t: 'Company-wide deployment', d: 'AI is part of how most functions work.' }
    ]},
    { id: 'q1', scored: true, key: 'Decision velocity', section: 'Decisions',
      title: 'When a cross-functional conflict comes up, for example product against go-to-market priorities, how fast is a binding decision made and enforced?',
      options: [
        { v: 1, t: 'Chronic deadlock', d: 'Debated again across several weekly meetings and escalated to the CEO more than once.' },
        { v: 2, t: 'Two to three weeks', d: 'Decisions stall while people wait for a consensus that does not come.' },
        { v: 3, t: 'Five to ten working days', d: 'Settled only after real friction and lobbying outside the meeting.' },
        { v: 4, t: '48 to 72 hours', d: 'The escalation path is known, but someone in leadership has to push it.' },
        { v: 5, t: 'Under 24 hours', d: 'Decision rights are clear and people disagree and commit as a habit.' }
      ]},
    { id: 'q2', scored: true, key: 'Accountability', section: 'Accountability',
      title: 'When a strategic initiative misses its target, or an automated process delivers a poor result, how does ownership work?',
      options: [
        { v: 1, t: 'Nobody owns it', d: 'Departments point at each other, at vendors or at the system.' },
        { v: 2, t: 'Shared, which means no one', d: 'Post-mortems feel political.' },
        { v: 3, t: 'An owner on paper', d: 'Someone is named but cannot fix the inputs from other functions.' },
        { v: 4, t: 'A clear owner, loosely tracked', d: 'Ownership is clear; consequences are not followed through.' },
        { v: 5, t: 'One owner with authority', d: 'A single named owner, with the authority to act and answerable for the result.' }
      ]},
    { id: 'q3', scored: true, key: 'Alignment', section: 'Alignment',
      title: 'If each member of your leadership team wrote down the top three priorities for this quarter on their own, what would you get?',
      options: [
        { v: 1, t: 'Complete divergence', d: 'Every function writes its own wishlist.' },
        { v: 2, t: 'Same words, different plans', d: 'A shared vocabulary on top of roadmaps that contradict each other.' },
        { v: 3, t: 'Two out of three', d: 'Two priorities match; one real gap sits between product and revenue.' },
        { v: 4, t: 'Aligned on paper', d: 'Small disputes over resources when things get tight.' },
        { v: 5, t: 'Fully aligned', d: 'Priorities, what was dropped and how trade-offs are measured are the same for everyone.' }
      ]},
    { id: 'q4', scored: true, key: 'Coordination', section: 'Coordination',
      title: 'How much leadership and management time goes into managing dependencies between teams, status meetings and territorial disputes?',
      options: [
        { v: 1, t: 'A critical drag', d: 'More than a third of management time. Teams defend headcount and control.' },
        { v: 2, t: 'Heavy friction', d: 'Projects often stall when they move from one function to another.' },
        { v: 3, t: 'Moderate friction', d: 'Teams get there in the end, but handovers need too many steering meetings.' },
        { v: 4, t: 'Mostly smooth', d: 'Occasional friction around releases and sales commitments.' },
        { v: 5, t: 'Very little', d: 'A clear operating rhythm and well-defined handovers between teams.' }
      ]},
    { id: 'q5', scored: true, key: 'AI-to-value conversion', section: 'AI conversion',
      title: 'What has AI and automation actually done to the speed at which the company ships and sells?',
      options: [
        { v: 1, t: 'More noise', d: 'More decks, analyses and code, and nothing ships faster.' },
        { v: 2, t: 'Faster tasks, same company', d: 'Individual tasks speed up; no measurable effect on velocity or margin.' },
        { v: 3, t: 'Isolated wins', d: 'Gains in support or engineering; core business metrics are flat.' },
        { v: 4, t: 'Measurable in places', d: 'Shorter cycle times in at least two core functions.' },
        { v: 5, t: 'Compounding', d: 'Workflows redesigned around AI; output per person is clearly up.' }
      ]},
    { id: 'q6', section: 'Perception check',
      title: 'How confident are you that your VP and director layer sees these bottlenecks the same way you do?',
      options: [
        { v: 1, t: 'Not confident', d: 'I suspect they feel friction they do not mention.' },
        { v: 2, t: 'Somewhat doubtful', d: 'Some of it probably does not reach me.' },
        { v: 3, t: 'Moderately confident', d: 'We talk openly, but there are filters.' },
        { v: 4, t: 'Confident', d: 'I would be surprised by a big difference.' },
        { v: 5, t: 'Completely confident', d: 'We see things the same way at every level.' }
      ]}
  ];

  var CHAIN = [
    { id: 'q5', name: 'Intelligence', what: 'AI-to-value conversion' },
    { id: 'q3', name: 'Alignment', what: 'Shared priorities' },
    { id: 'q1', name: 'Decisions', what: 'Decision velocity' },
    { id: 'q4', name: 'Coordination', what: 'Handovers between teams' },
    { id: 'q2', name: 'Accountability', what: 'Ownership of results' }
  ];

  var ACTIONS = {
    q1: 'Write down who owns each of your three biggest open decisions, with a date. Anything still open after two weeks goes to that owner, not back to the group.',
    q2: 'For every strategic initiative, name one owner who can change the inputs from other functions. If that person does not have the authority, fix the authority before the target.',
    q3: 'Ask each leader to write down the top three priorities for the quarter on their own, then compare the lists in your next leadership meeting. Agree what drops off as well as what stays.',
    q4: 'Pick the standing meeting nobody would miss and stop it for a month. Replace the status updates in the others with written pre-reads.',
    q5: 'Choose one end-to-end process, such as lead to cash or idea to release, and redesign it around AI. Measure cycle time before and after, instead of counting tools or seats.'
  };

  var TIERS = [
    { min: 5, max: 12, name: 'Critical execution drag', text: 'The company has outgrown its informal operating model. Adding more AI tools or capital to it is likely to add noise faster than it adds output, and every month of it is paid for out of runway.' },
    { min: 13, max: 18, name: 'The scaling squeeze', text: 'Teams move fast on their own, but work slows where it passes between functions. Strategic calls wait for the weekly meeting instead of being made by the person who owns them.' },
    { min: 19, max: 25, name: 'High-throughput operating system', text: 'Your answers describe a leadership team that turns effort into results. The risk is keeping that discipline as headcount grows.' }
  ];


  // The fuller analysis for each link. Only the PDF brief carries it.
  var LINKS = {
    q1: {
      look: 'Cross-functional calls come back to the same meeting week after week. People wait for the CEO or for a consensus that never arrives, and work that is ready sits still.',
      whyAi: 'AI shortens the time it takes to produce options, analyses and drafts. It does nothing for the time it takes to choose between them, so the queue in front of each decision grows faster.',
      fixTitle: 'Give every open decision one owner and a date',
      steps: [
        'List the open decisions that block more than one team. Most leadership teams find between five and fifteen.',
        'Name one owner for each, with a date. The owner consults and then decides; the group no longer has to agree.',
        'Spend the first ten minutes of each leadership meeting on the list. Anything past its date is decided that day, by the owner.'
      ],
      time: 'About 45 minutes to set up, then ten minutes a week.',
      signal: 'Fewer topics come back to the leadership meeting a second time, and the open list is shorter within a month.',
      delay: [
        'Teams plan around the open decisions and start parallel work that may be thrown away.',
        'Your strongest people stop escalating and work around the leadership team, which hides the problem.',
        'Next quarter is planned on top of decisions that were never taken.'
      ],
      questions: ['Which decision has been open the longest, and who owns it?', 'Which decisions reach the CEO that someone else could take?']
    },
    q2: {
      look: 'Targets have names next to them, but the person named cannot change the inputs from other functions. When something misses, the review turns into a discussion about who else was involved.',
      whyAi: 'Automated steps add new places where a result can go wrong without anyone owning it. "The system did it" becomes an answer, and nobody fixes the process.',
      fixTitle: 'Match every owner with the authority to act',
      steps: [
        'Take your five most important initiatives and write one owner next to each. One person, not a team.',
        'Ask each owner what they cannot change without someone else’s sign-off, and write it down.',
        'Either move that authority to the owner or change the owner. Do this before you discuss the target again.'
      ],
      time: 'One leadership meeting of about 90 minutes.',
      signal: 'Reviews are about what to change rather than who was involved, and owners raise problems before the deadline.',
      delay: [
        'Misses are explained rather than fixed, and the same issue comes back at the next review.',
        'Leaders protect their own targets, so cross-functional work gets the least attention.',
        'Good people leave initiatives they cannot win, and the ones who stay learn to promise less.'
      ],
      questions: ['For our top initiative, what can the owner not change without asking someone?', 'When did a missed target last change how we work?']
    },
    q3: {
      look: 'Everyone uses the same words for the strategy, but each function’s plan pulls in a different direction. Trade-offs are made team by team, usually in favour of the loudest roadmap.',
      whyAi: 'Each team can now produce more plans and more output on its own. Without shared priorities, AI speeds all of them up at once, including the ones that work against each other.',
      fixTitle: 'Write the priorities down separately, then compare',
      steps: [
        'Ask each member of the leadership team to write the top three priorities for the quarter, on their own and without discussing them.',
        'Put the lists side by side at the start of the next leadership meeting. Nobody defends their list yet.',
        'Agree three priorities and write down what is dropped to make room for them.'
      ],
      time: 'Ten minutes of preparation for each leader and an hour in the meeting.',
      signal: 'When resources get tight, people point to the agreed list instead of escalating, and dropped items stay dropped.',
      delay: [
        'Teams keep shipping work that looks productive and does not add up to a company result.',
        'Resource fights move out of the leadership meeting and into corridors and one-to-ones.',
        'The quarter ends with each team close to its own goals and the company short of its own.'
      ],
      questions: ['What did we stop doing this quarter to make room for our priorities?', 'Which two functions would write the most different top three?']
    },
    q4: {
      look: 'Work slows each time it passes from one team to another. Status meetings and steering groups fill the calendar, and managers spend their week moving information around.',
      whyAi: 'Teams produce their part faster, so more work arrives at each handover. If the handovers stay manual and meeting-based, the queue between teams becomes the real speed of the company.',
      fixTitle: 'Stop one meeting and fix one handover',
      steps: [
        'Pick the standing status meeting people would miss least and stop it for four weeks.',
        'Replace status updates in the remaining meetings with a short written pre-read, sent the day before.',
        'Map the handover that stalls most often, for example sales to delivery, and agree what ready means on both sides.'
      ],
      time: 'An afternoon to choose and map, then a four-week trial.',
      signal: 'Nobody asks for the cancelled meeting back, and the handover you mapped stops showing up as a blocker.',
      delay: [
        'Calendars fill further as each team adds its own coordination meeting.',
        'Managers become full-time routers of information and stop improving their own areas.',
        'New hires are added to absorb the coordination load, which creates more handovers.'
      ],
      questions: ['Which meeting would we stop if we had to cancel one tomorrow?', 'Which handover between teams causes the most rework?']
    },
    q5: {
      look: 'AI is used widely, but mostly to do the same tasks faster. More decks, analyses and code appear, and the numbers you report to the board do not move.',
      whyAi: 'Speed at task level only becomes a company result when a whole process is redesigned around it. Otherwise the extra output lands in the same queues and approvals as before.',
      fixTitle: 'Redesign one process end to end',
      steps: [
        'Choose one process that matters to revenue or margin, such as lead to cash or idea to release.',
        'Measure how long it takes today from start to finish, waiting time included.',
        'Redesign it with the team that runs it, using AI where it removes steps rather than speeding them up. Measure again after six weeks.'
      ],
      time: 'Two working sessions to map and redesign, then six weeks to measure.',
      signal: 'The cycle time of that one process drops, and you can show the number in your next board pack.',
      delay: [
        'AI spend grows as seats and tools are added, with nothing to show in the numbers.',
        'Teams grow sceptical of AI or use it quietly for their own tasks only.',
        'The board asks what the AI budget has delivered, and the answer is anecdotes.'
      ],
      questions: ['Which process would show the clearest result if we redesigned it around AI?', 'What do we measure today to know whether AI is paying off?']
    }
  };

  var CONFIG = {
    // Every share and invite link points at the live page, even from a preview deploy.
    shareUrl: 'https://www.kuma.partners/execution-diagnostic'
  };

  var CORE = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
  var FIRST_CORE_STEP = 3;

  /* ---------- scoring ---------- */
  function calculateAuditResults(a) {
    var dims = ['q1', 'q2', 'q3', 'q4', 'q5'];
    var total = 0;
    dims.forEach(function (k) { total += Number(a[k]) || 0; });
    var efi = Math.round(100 - (total / 25) * 100);
    var tier = TIERS.filter(function (t) { return total >= t.min && total <= t.max; })[0] || TIERS[1];
    var sorted = dims.slice().sort(function (x, y) {
      var d = (Number(a[x]) || 0) - (Number(a[y]) || 0);
      return d !== 0 ? d : dims.indexOf(x) - dims.indexOf(y);
    });
    var top3 = (Number(a.q1) || 0) + (Number(a.q2) || 0) + (Number(a.q3) || 0);
    return {
      total: total,
      efi: efi,
      tier: tier,
      weakest: sorted[0],
      actions: [sorted[0], sorted[1]],
      perceptionGap: (Number(a.q6) || 0) >= 4 && top3 < 10
    };
  }

  function linkOf(id) { return CHAIN.filter(function (c) { return c.id === id; })[0]; }

  /* ---------- tracking: does nothing until Plausible, gtag or a dataLayer is on the page ---------- */
  function track(name, props) {
    var data = props || {};
    try { if (typeof window.plausible === 'function') window.plausible('ed_' + name, { props: data }); } catch (e) { /* never block */ }
    try { if (typeof window.gtag === 'function') window.gtag('event', 'ed_' + name, data); } catch (e) { /* never block */ }
    try { if (window.dataLayer && window.dataLayer.push) window.dataLayer.push({ event: 'ed_' + name, ed: data }); } catch (e) { /* never block */ }
  }

  /* ---------- no storage ---------- */
  // Answers live in memory only, so a refresh starts from scratch. Earlier versions of this page kept
  // answers in localStorage; that copy is removed on load so a returning visitor also starts fresh.
  try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
  function save() { /* nothing is kept between visits */ }

  /* ---------- comparison links ---------- */
  // Values from a link are untrusted: they are cleaned here and only ever written with textContent or into input values.
  function cleanText(v, max) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 40); }
  function cleanScores(a) {
    if (!a || typeof a !== 'object') return null;
    var out = {};
    for (var i = 0; i < CORE.length; i++) {
      var n = Number(a[CORE[i]]);
      if (!(n >= 1 && n <= 5) || Math.round(n) !== n) return null;
      out[CORE[i]] = n;
    }
    return out;
  }
  function cleanView(o) {
    if (!o || typeof o !== 'object') return null;
    var a = cleanScores(o.a);
    if (!a) return null;
    var ctx = o.ctx && typeof o.ctx === 'object' ? o.ctx : {};
    return {
      n: cleanText(o.n, 40) || 'Your colleague',
      c: cleanText(o.c, 80),
      a: a,
      ctx: { stage: cleanText(ctx.stage, 60), headcount: cleanText(ctx.headcount, 20), ai_level: cleanText(ctx.ai_level, 60) }
    };
  }
  function encode(obj) {
    var b = window.btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    try {
      var b = String(str).replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return JSON.parse(decodeURIComponent(escape(window.atob(b))));
    } catch (e) { return null; }
  }
  function scoresOf(a) { var o = {}; CORE.forEach(function (k) { o[k] = Number(a[k]); }); return o; }
  function readHash() {
    var h = (window.location.hash || '').replace(/^#/, '');
    if (h.indexOf('i=') === 0) {
      var v = cleanView(decode(h.slice(2)));
      return v ? { kind: 'invite', view: v } : { kind: 'broken' };
    }
    if (h.indexOf('x=') === 0) {
      var p = decode(h.slice(2));
      var a = p && cleanView(p.a), b = p && cleanView(p.b);
      return a && b ? { kind: 'compare', a: a, b: b } : { kind: 'broken' };
    }
    return null;
  }
  function dropHash() {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* old browser */ }
  }

  /* ---------- DOM ---------- */
  var app = document.querySelector('[data-ed-app]');
  if (!app) return;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var stepsEl = $('[data-ed-steps]', app);
  var progress = $('[data-ed-progress]', app);
  var progLabel = $('[data-ed-progress-label]', app);
  var progSection = $('[data-ed-progress-section]', app);
  var progFill = $('[data-ed-progress-fill]', app);
  var navEl = $('[data-ed-nav]', app);
  var backBtn = $('[data-ed-back]', app);
  var resultEl = $('[data-ed-result]', app);
  var invitedEl = $('[data-ed-invited]', app);

  function fresh() { return { step: 0, answers: {}, invite: null, compare: null, lead: null }; }
  var state = fresh();

  // A link in the address bar wins over whatever this browser had stored.
  var linked = readHash();
  if (linked && linked.kind === 'invite') {
    state.invite = linked.view;
    state.answers = { stage: linked.view.ctx.stage, headcount: linked.view.ctx.headcount, ai_level: linked.view.ctx.ai_level };
    state.step = FIRST_CORE_STEP;
    track('invite_open');
  } else if (linked && linked.kind === 'compare') {
    state.compare = { a: linked.a, b: linked.b };
    state.invite = null;
    state.answers = { stage: linked.a.ctx.stage, headcount: linked.a.ctx.headcount, ai_level: linked.a.ctx.ai_level };
    CORE.forEach(function (k) { state.answers[k] = linked.a.a[k]; });
    state.step = STEPS.length;
    track('comparison_open');
  } else if (linked && linked.kind === 'broken') {
    dropHash();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function firstStep() { return state.invite ? FIRST_CORE_STEP : 0; }

  function renderInvited() {
    if (!state.invite || state.step >= STEPS.length) { invitedEl.hidden = true; return; }
    var inv = state.invite;
    $('[data-ed-invited-text]', invitedEl).textContent = inv.n + ' asked you to compare how you each see ' +
      (inv.c || 'the company') + '. Six questions, about two minutes. Answer for how things are, not how they should be. At the end you see both views side by side.';
    invitedEl.hidden = false;
  }

  function renderStep() {
    var s = STEPS[state.step];
    var start = firstStep();
    var count = STEPS.length - start;
    resultEl.hidden = true;
    progress.hidden = false;
    navEl.hidden = state.step === start;
    progLabel.textContent = 'Step ' + (state.step - start + 1) + ' of ' + count;
    progSection.textContent = s.section;
    progFill.style.width = Math.round(((state.step - start) / count) * 100) + '%';
    renderInvited();

    stepsEl.innerHTML = '';
    var wrap = el('fieldset', 'execution-diagnostic-step');
    wrap.appendChild(el('legend', 'execution-diagnostic-q', s.title));
    var list = el('div', 'execution-diagnostic-options');
    s.options.forEach(function (o) {
      var b = el('button', 'execution-diagnostic-option');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.answers[s.id] === o.v));
      b.appendChild(el('span', 'execution-diagnostic-option-title', o.t));
      if (o.d) b.appendChild(el('span', 'execution-diagnostic-option-desc', o.d));
      b.addEventListener('click', function () { choose(s.id, o.v); });
      list.appendChild(b);
    });
    wrap.appendChild(list);
    stepsEl.appendChild(wrap);
  }

  function choose(id, v) {
    if (state.step === firstStep()) track('start', { invited: state.invite ? 'yes' : 'no' });
    state.answers[id] = v;
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      save();
      renderStep();
      scrollToApp();
      var first = stepsEl.querySelector('.execution-diagnostic-option');
      if (first) first.focus({ preventScroll: true });
    } else {
      state.step = STEPS.length;
      if (state.invite) state.compare = null;
      save();
      track('complete', { invited: state.invite ? 'yes' : 'no' });
      renderResult(true);
    }
  }

  function scrollToApp() {
    var top = app.getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - 100, behavior: 'smooth' });
    }
  }

  /* ---------- comparison ---------- */
  // Returns the two views to compare for the current state, or null.
  function comparison() {
    if (state.step < STEPS.length) return null;
    if (state.invite) {
      return { left: { label: 'You', a: scoresOf(state.answers) }, right: { label: state.invite.n, a: state.invite.a, invited: true } };
    }
    if (state.compare) {
      return { left: { label: state.compare.a.n, a: state.compare.a.a }, right: { label: state.compare.b.n, a: state.compare.b.a } };
    }
    return null;
  }

  function compareRows(cmp) {
    return CHAIN.map(function (c) {
      var x = cmp.left.a[c.id], y = cmp.right.a[c.id];
      return { link: c, x: x, y: y, gap: Math.abs(x - y) };
    });
  }

  function scoresSentence(label, n) { return (label === 'You' ? 'you score it ' : label + ' scores it ') + n; }

  function compareNote(cmp) {
    var rows = compareRows(cmp);
    var widest = rows.slice().sort(function (p, q) { return q.gap - p.gap; })[0];
    var efiL = calculateAuditResults(cmp.left.a).efi, efiR = calculateAuditResults(cmp.right.a).efi;
    var parts = ['Execution friction index: ' + cmp.left.label + ' ' + efiL + '%, ' + cmp.right.label + ' ' + efiR + '%.'];
    if (widest.gap >= 2) {
      parts.push('The widest gap is on ' + widest.link.name.toLowerCase() + ': ' + scoresSentence(cmp.left.label, widest.x) +
        ', ' + scoresSentence(cmp.right.label, widest.y) + '. A gap of two points or more usually means you are describing different companies. Start the conversation there.');
    } else {
      parts.push('The two views differ by one point at most on every link. Worth checking against the people below the leadership team, where friction is felt first.');
    }
    var inviter = cmp.right.invited ? cmp.right : (state.compare ? cmp.left : null);
    if (inviter && inviter.a.q6 >= 4 && widest.gap >= 2) {
      parts.push(inviter.label + '\u2019s confidence that the team sees these bottlenecks the same way: ' + inviter.a.q6 + ' out of 5.');
    }
    return { text: parts.join(' '), widest: widest, rows: rows };
  }

  function renderCompare() {
    var box = $('[data-ed-compare]', resultEl);
    var cmp = comparison();
    if (!cmp) { box.hidden = true; return; }
    $('[data-ed-compare-title]', box).textContent = cmp.left.label === 'You' ? 'Your view and ' + cmp.right.label + '’s view' : cmp.left.label + ' and ' + cmp.right.label + ', side by side';
    $('[data-ed-compare-a]', box).textContent = cmp.left.label;
    $('[data-ed-compare-b]', box).textContent = cmp.right.label;
    var note = compareNote(cmp);
    var body = $('[data-ed-compare-rows]', box);
    body.innerHTML = '';
    note.rows.forEach(function (r) {
      var tr = el('tr', r.gap >= 2 ? 'is-wide' : null);
      var th = el('th', null, r.link.name); th.scope = 'row';
      tr.appendChild(th);
      tr.appendChild(el('td', null, r.x + ' / 5'));
      tr.appendChild(el('td', null, r.y + ' / 5'));
      tr.appendChild(el('td', null, r.gap === 0 ? 'None' : String(r.gap)));
      body.appendChild(tr);
    });
    $('[data-ed-compare-note]', box).textContent = note.text;
    box.hidden = false;
  }

  /* ---------- copy, mail and status ---------- */
  var timers = {};
  function flash(key, text) {
    var s = document.querySelector('[data-ed-status="' + key + '"]');
    if (!s) return;
    s.textContent = text;
    window.clearTimeout(timers[key]);
    timers[key] = window.setTimeout(function () { s.textContent = ''; }, 4000);
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
  function mailto(subject, body) {
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
  }

  var inviteName = $('[data-ed-invite-name]');
  var inviteCompany = $('[data-ed-invite-company]');
  var returnName = $('[data-ed-return-name]');

  function inviteLink() {
    var payload = {
      n: cleanText(inviteName.value, 40), c: cleanText(inviteCompany.value, 80),
      a: scoresOf(state.answers),
      ctx: { stage: state.answers.stage || '', headcount: state.answers.headcount || '', ai_level: state.answers.ai_level || '' }
    };
    return CONFIG.shareUrl + '?utm_source=team_invite&utm_medium=comparison#i=' + encode(payload);
  }
  function returnLink() {
    var payload = { a: state.invite, b: { n: cleanText(returnName.value, 40) || 'Your colleague', c: state.invite.c, a: scoresOf(state.answers), ctx: state.invite.ctx } };
    return CONFIG.shareUrl + '?utm_source=team_invite&utm_medium=comparison_return#x=' + encode(payload);
  }
  function needName(input, key) {
    if (cleanText(input.value)) return false;
    flash(key, 'Add your first name first, so your colleague knows who is asking.');
    input.focus();
    return true;
  }

  function wireSharing() {
    var on = function (sel, fn) { var n = $(sel); if (n) n.addEventListener('click', fn); };

    on('[data-ed-invite-copy]', function () {
      if (needName(inviteName, 'invite')) return;
      track('invite_copy');
      copyText(inviteLink()).then(
        function () { flash('invite', '✓ Invite link copied. Paste it into Slack, WhatsApp or an email.'); },
        function () { flash('invite', 'Copying did not work here. Use Email an invite instead.'); }
      );
    });
    on('[data-ed-invite-mail]', function (e) {
      if (needName(inviteName, 'invite')) { e.preventDefault(); return; }
      track('invite_mail');
      var me = cleanText(inviteName.value);
      var body = 'Hi,\n\nI took a short diagnostic on how we turn effort into results: decisions, priorities, handovers, ownership and what AI is actually doing for us.\n\n' +
        'Could you answer the same six questions from where you sit? It takes about two minutes, and at the end you see both of our views side by side:\n' +
        inviteLink() + '\n\nThanks,\n' + me;
      e.currentTarget.setAttribute('href', mailto('Two minutes: how do you see our execution?', body));
    });

    on('[data-ed-return-copy]', function () {
      if (needName(returnName, 'return')) return;
      track('return_copy');
      copyText(returnLink()).then(
        function () { flash('return', '✓ Comparison link copied. Send it to ' + state.invite.n + '.'); },
        function () { flash('return', 'Copying did not work here. Use Email it instead.'); }
      );
    });
    on('[data-ed-return-mail]', function (e) {
      if (needName(returnName, 'return')) { e.preventDefault(); return; }
      track('return_mail');
      var me = cleanText(returnName.value);
      var body = 'Hi ' + state.invite.n + ',\n\nI answered the same questions. Here are both of our views side by side, link by link:\n' +
        returnLink() + '\n\n' + me;
      e.currentTarget.setAttribute('href', mailto('How our views on execution compare', body));
    });

    var peerUrl = function (src) { return CONFIG.shareUrl + '?utm_source=' + src + '&utm_medium=share'; };
    var wa = $('[data-ed-share="whatsapp"]');
    if (wa && typeof navigator.share === 'function') {
      var waLabel = $('[data-ed-share-wa-label]', wa);
      if (waLabel) waLabel.textContent = 'Share';
      wa.addEventListener('click', function (e) {
        e.preventDefault();
        track('share', { channel: 'native' });
        navigator.share({ title: 'The execution diagnostic | Kuma Partners', text: 'A 3-minute diagnostic on why AI makes people faster and companies not.', url: peerUrl('app_share') })
          .catch(function (err) { if (!err || err.name !== 'AbortError') window.open(wa.getAttribute('href'), '_blank', 'noopener'); });
      });
    } else {
      on('[data-ed-share="whatsapp"]', function () { track('share', { channel: 'whatsapp' }); });
    }
    on('[data-ed-share="linkedin"]', function () { track('share', { channel: 'linkedin' }); });
    on('[data-ed-share="copy"]', function () {
      track('share', { channel: 'copy' });
      copyText(peerUrl('direct_copy')).then(
        function () { flash('peer', '✓ Link copied'); },
        function () { flash('peer', 'Copy ' + CONFIG.shareUrl + ' by hand.'); }
      );
    });
    on('[data-ed-book]', function () { track('book_click'); });
  }

  /* ---------- result ---------- */
  function renderResult(focus) {
    var a = state.answers;
    var r = calculateAuditResults(a);
    stepsEl.innerHTML = '';
    progress.hidden = true;
    navEl.hidden = true;
    invitedEl.hidden = true;
    resultEl.hidden = false;

    $('[data-ed-out="efi"]', resultEl).textContent = r.efi;
    $('[data-ed-out="tier"]', resultEl).textContent = r.tier.name + ' · ' + r.total + ' of 25 points';
    $('[data-ed-out="analysis"]', resultEl).textContent = r.tier.text;
    $('[data-ed-marker]', resultEl).style.left = Math.min(Math.max(r.efi, 2), 98) + '%';

    var chain = $('[data-ed-chain]', resultEl);
    chain.innerHTML = '';
    CHAIN.forEach(function (c) {
      var li = el('li', 'execution-diagnostic-link' + (c.id === r.weakest ? ' is-weakest' : ''));
      li.appendChild(el('span', 'execution-diagnostic-link-name', c.name));
      li.appendChild(el('span', 'execution-diagnostic-link-score', (a[c.id] || 0) + ' / 5'));
      li.appendChild(el('span', 'execution-diagnostic-link-what', c.what));
      chain.appendChild(li);
    });
    var weakest = linkOf(r.weakest);
    var weakText = 'The link that breaks first: ' + weakest.name.toLowerCase() + ' (' + weakest.what.toLowerCase() + ').';
    if (r.weakest === 'q5' && a.ai_level === 'Ad-hoc personal use') {
      weakText += ' With AI still at the level of personal use, that is expected; look at the next lowest link as well.';
    }
    $('[data-ed-out="weakest"]', resultEl).textContent = weakText;
    $('[data-ed-gap]', resultEl).hidden = !r.perceptionGap;

    var acts = $('[data-ed-actions]', resultEl);
    acts.innerHTML = '';
    r.actions.forEach(function (k) { acts.appendChild(el('li', null, ACTIONS[k])); });

    renderCompare();

    // Invite for everyone who answered for themselves; send-back for a colleague who came through an invite.
    $('[data-ed-invite]', resultEl).hidden = !!state.invite;
    var ret = $('[data-ed-return]', resultEl);
    ret.hidden = !state.invite;
    if (state.invite) {
      $('[data-ed-return-title]', ret).textContent = 'Send both views back to ' + state.invite.n;
      $('[data-ed-return-text]', ret).textContent = 'The comparison link shows ' + state.invite.n + ' the table above. It carries both sets of scores and your first name, nothing else.';
    }
    if (state.lead && inviteName && !inviteName.value) inviteName.value = state.lead.name.split(/\s+/)[0];
    if (state.lead && returnName && !returnName.value) returnName.value = state.lead.name.split(/\s+/)[0];
    if (inviteCompany && !inviteCompany.value) inviteCompany.value = (state.lead && state.lead.company) || (state.compare && state.compare.a.c) || '';

    var teaser = $('[data-ed-teaser-text]', resultEl);
    var teaserLink = $('[data-ed-teaser-link]', resultEl);
    if (state.lead) {
      teaser.textContent = 'Your PDF brief is ready, with a step-by-step fix for ' + weakest.name.toLowerCase() + '.';
      teaserLink.textContent = 'Download it →';
    } else {
      teaser.textContent = 'The PDF brief adds a step-by-step fix for ' + weakest.name.toLowerCase() + ', what 90 days of delay looks like and questions for your next leadership meeting.';
      teaserLink.textContent = 'Get the brief →';
    }

    syncForm();
    if (focus) {
      resultEl.focus({ preventScroll: true });
      scrollToApp();
    }
  }

  /* ---------- the brief section headline follows the weakest link ---------- */
  var HEADLINES = {
    q1: 'Decisions are where your company leaks. Here is what it costs.',
    q2: 'Ownership is where your company leaks. Here is what it costs.',
    q3: 'Priorities are where your company leaks. Here is what it costs.',
    q4: 'Handovers are where your company leaks. Here is what it costs.',
    q5: 'Turning AI into results is where your company leaks. Here is what it costs.'
  };
  var briefTitle = $('#execution-diagnostic-debrief-title');
  var briefTitleDefault = briefTitle ? briefTitle.textContent : '';
  function syncHeadline() {
    if (!briefTitle) return;
    briefTitle.textContent = complete() ? HEADLINES[calculateAuditResults(state.answers).weakest] : briefTitleDefault;
  }

  /* ---------- form and unlock ---------- */
  var form = $('[data-ed-form]');
  var formView = $('[data-ed-form-view]');
  var formSub = $('[data-ed-form-sub]');
  var success = $('[data-ed-success]');
  var printBtn = $('[data-ed-print]');

  function complete() { return state.step >= STEPS.length; }

  function setHidden(name, value) {
    var f = form && form.querySelector('[name="' + name + '"]');
    if (f) f.value = value == null ? '' : String(value);
  }

  // Keeps the form card in step with the diagnostic: before, after and once the brief is unlocked.
  function syncForm() {
    syncHeadline();
    if (!form) return;
    var a = state.answers;
    var stage = $('#ed-stage', form);
    if (stage && !stage.value && a.stage) {
      for (var i = 0; i < stage.options.length; i++) {
        if (stage.options[i].text === a.stage) { stage.selectedIndex = i; break; }
      }
    }
    var company = $('#ed-company', form);
    if (company && !company.value) company.value = (state.invite && state.invite.c) || (state.compare && state.compare.a.c) || '';
    if (formSub) {
      if (complete()) {
        var r = calculateAuditResults(a);
        formSub.textContent = 'Your result: ' + r.efi + '%, ' + r.tier.name.toLowerCase() + '. Add your details and the PDF opens straight away.';
      } else {
        formSub.textContent = 'Take the diagnostic above first. The PDF is written from your answers.';
      }
    }
    if (state.lead) {
      formView.hidden = true;
      success.hidden = false;
      $('[data-ed-success-title]', success).textContent = complete() ? 'Your brief is ready.' : 'Almost there.';
      if (!complete()) $('[data-ed-success-text]', success).textContent = 'Finish the diagnostic above and your brief will be ready here.';
      else if (!$('[data-ed-success-text]', success).textContent) $('[data-ed-success-text]', success).textContent = 'Download it now. If you refresh the page, the diagnostic starts again from scratch.';
      printBtn.hidden = !complete();
      $('.execution-diagnostic-print-hint', success).hidden = !complete();
    }
  }

  function fillHidden() {
    var a = state.answers;
    var r = complete() ? calculateAuditResults(a) : null;
    setHidden('headcount', a.headcount);
    setHidden('ai_level', a.ai_level);
    setHidden('q1_decision_velocity', a.q1);
    setHidden('q2_accountability', a.q2);
    setHidden('q3_alignment', a.q3);
    setHidden('q4_coordination', a.q4);
    setHidden('q5_ai_conversion', a.q5);
    setHidden('q6_perception_confidence', a.q6);
    setHidden('total_score', r ? r.total : 'Diagnostic not completed');
    setHidden('efi_percentage', r ? r.efi : '');
    setHidden('tier', r ? r.tier.name : '');
    setHidden('weakest_link', r ? linkOf(r.weakest).what : '');
    setHidden('perception_gap_flag', r ? (r.perceptionGap ? 'Yes' : 'No') : '');
    // Team loop: invited colleagues and returned comparisons are tagged so one company's answers group together in Netlify.
    var other = state.invite || (state.compare && state.compare.b) || null;
    setHidden('invited_by', state.invite ? state.invite.n : (state.compare ? 'Comparison returned by ' + state.compare.b.n : ''));
    setHidden('company_cluster', (state.invite && state.invite.c) || (state.compare && state.compare.a.c) || ($('#ed-company', form).value || '').trim().slice(0, 80));
    setHidden('inviter_scores', other ? CORE.map(function (k) { return k + ':' + other.a[k]; }).join(' ') : '');
    var cmp = comparison();
    if (cmp) {
      var w = compareNote(cmp).widest;
      setHidden('largest_gap', w.link.name + ' (' + w.x + ' vs ' + w.y + ')');
    } else {
      setHidden('largest_gap', '');
    }
    var contact = $('[data-ed-contact]', form);
    setHidden('contact_me', contact && contact.checked ? 'Yes' : 'No');
    var utm = [];
    try {
      var p = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { if (p.get(k)) utm.push(k + '=' + p.get(k)); });
    } catch (e) { /* ignore */ }
    setHidden('utm', utm.join('&'));
  }

  function showError(name, show) {
    var e = form.querySelector('[data-ed-error="' + name + '"]');
    if (e) e.classList.toggle('is-visible', !!show);
  }

  function validate() {
    var name = $('#ed-name', form), email = $('#ed-email', form), stage = $('#ed-stage', form);
    var nameOk = name.value.trim().length > 1;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var stageOk = !!stage.value;
    showError('name', !nameOk); showError('email', !emailOk); showError('stage', !stageOk);
    if (!(nameOk && emailOk && stageOk)) {
      (!nameOk ? name : (!emailOk ? email : stage)).focus();
      return false;
    }
    return true;
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = $('[data-ed-form-error]', form);
      if (err) err.hidden = true;
      if (!validate()) return;
      fillHidden();
      var btn = $('[data-ed-submit]', form);
      var label = $('[data-btn-label]', btn);
      var original = label.textContent;
      btn.disabled = true; label.textContent = 'Sending…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('Status ' + res.status);
        var wantsCall = $('[data-ed-contact]', form).checked;
        state.lead = {
          name: cleanText($('#ed-name', form).value, 80),
          company: cleanText($('#ed-company', form).value, 80),
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        };
        save();
        track('form_submit', { contact: wantsCall ? 'yes' : 'no', invited: state.invite ? 'yes' : 'no' });
        $('[data-ed-success-text]', success).textContent = wantsCall
          ? 'A Kuma partner will be in touch within one business day to review your result with you.'
          : 'If you want an outside view, book a call with Sven from this section.';
        syncForm();
        if (complete()) renderResult(false);
        success.focus();
      }).catch(function () {
        if (err) err.hidden = false;
        btn.disabled = false; label.textContent = original;
      });
    });
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'ed-name') showError('name', false);
      if (t.id === 'ed-email') showError('email', false);
      if (t.id === 'ed-stage') showError('stage', false);
    });
  }

  /* ---------- the PDF brief ---------- */
  var report = $('[data-ed-report]');
  function rep(key) { return report.querySelector('[data-rep="' + key + '"]'); }
  function fillList(node, items) {
    node.innerHTML = '';
    items.forEach(function (t) { node.appendChild(el('li', null, t)); });
  }

  function fillReport() {
    var a = state.answers;
    var r = calculateAuditResults(a);
    var weak = linkOf(r.weakest), second = linkOf(r.actions[1]);
    var info = LINKS[r.weakest];
    var lead = state.lead || { name: '', company: '', date: '' };

    rep('meta').textContent = 'Prepared for ' + lead.name + (lead.company ? ', ' + lead.company : '') + ' · ' + lead.date;
    rep('efi').textContent = r.efi;
    rep('tier').textContent = r.tier.name + ' · ' + r.total + ' of 25 points';
    rep('tierText').textContent = r.tier.text;

    var chain = rep('chain');
    chain.innerHTML = '';
    CHAIN.forEach(function (c) {
      var tr = el('tr', c.id === r.weakest ? 'is-weakest' : null);
      tr.appendChild(el('td', null, c.name));
      tr.appendChild(el('td', null, c.what));
      tr.appendChild(el('td', null, a[c.id] + ' / 5'));
      chain.appendChild(tr);
    });

    rep('weakName').textContent = weak.name + ': ' + weak.what.toLowerCase();
    rep('look').textContent = info.look;
    rep('whyAi').textContent = info.whyAi;
    rep('fixTitle').textContent = info.fixTitle;
    fillList(rep('fixSteps'), info.steps);
    rep('fixTime').textContent = info.time;
    rep('fixSignal').textContent = info.signal;

    rep('memo').textContent = 'This brief reflects one person’s view of how we turn effort into results. Please read it before our next leadership meeting and note where you see it differently. Where our views differ most is usually the most useful place to start.';

    var delay = rep('delay');
    delay.innerHTML = '';
    ['Day 30', 'Day 60', 'Day 90'].forEach(function (when, i) {
      var li = el('li');
      li.appendChild(el('span', 'execution-diagnostic-report-when', when));
      li.appendChild(el('p', null, info.delay[i]));
      delay.appendChild(li);
    });

    rep('second').textContent = second.name + ' (' + second.what.toLowerCase() + ') comes next. ' + ACTIONS[second.id];
    rep('gapBlock').hidden = !r.perceptionGap;

    var cmp = comparison();
    var cBlock = rep('compareBlock');
    cBlock.hidden = !cmp;
    if (cmp) {
      var note = compareNote(cmp);
      var head = rep('compareHead');
      head.innerHTML = '';
      var htr = el('tr');
      ['Link', cmp.left.label, cmp.right.label, 'Gap'].forEach(function (t) { htr.appendChild(el('th', null, t)); });
      head.appendChild(htr);
      var rows = rep('compareRows');
      rows.innerHTML = '';
      note.rows.forEach(function (row) {
        var tr = el('tr', row.gap >= 2 ? 'is-weakest' : null);
        [row.link.name, row.x + ' / 5', row.y + ' / 5', row.gap === 0 ? 'None' : String(row.gap)].forEach(function (t) { tr.appendChild(el('td', null, t)); });
        rows.appendChild(tr);
      });
      rep('compareNote').textContent = note.text;
    }

    fillList(rep('questions'), info.questions.concat([
      LINKS[second.id].questions[0],
      'If each of us answered these questions on our own, where would our scores differ most?'
    ]));
  }

  var originalTitle = document.title;
  window.addEventListener('afterprint', function () { document.title = originalTitle; });
  if (printBtn) printBtn.addEventListener('click', function () {
    if (!state.lead || !complete()) return;
    fillReport();
    track('pdf_download');
    document.title = 'Kuma execution brief' + (state.lead.company ? ', ' + state.lead.company : '');
    window.print();
  });
  var teaserLinkEl = $('[data-ed-teaser-link]');
  if (teaserLinkEl) teaserLinkEl.addEventListener('click', function (e) {
    if (state.lead && complete()) { e.preventDefault(); printBtn.click(); }
  });

  /* ---------- controls ---------- */
  backBtn.addEventListener('click', function () {
    if (state.step > firstStep()) { state.step -= 1; save(); renderStep(); }
  });
  $('[data-ed-restart]', resultEl).addEventListener('click', function () {
    var keepLead = state.lead;
    state = fresh();
    state.lead = keepLead;
    save();
    renderStep();
    syncForm();
    scrollToApp();
  });

  var toInvite = $('[data-ed-to-invite]');
  if (toInvite) toInvite.addEventListener('click', function (e) {
    var box = $('[data-ed-invite]');
    if (!box || box.hidden || resultEl.hidden) return;
    e.preventDefault();
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (inviteName) inviteName.focus({ preventScroll: true });
  });

  wireSharing();
  if (complete()) renderResult(false); else { renderStep(); syncForm(); }

  // Exposed for testing and for anyone who wants to check the maths in the console.
  window.calculateAuditResults = calculateAuditResults;
})();
