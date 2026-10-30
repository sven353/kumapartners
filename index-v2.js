(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* menu overlay */
  var mb = $('.menu-btn'), ov = document.getElementById('menu');
  function setMenu(open){
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    ov.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  mb.addEventListener('click', function(){ setMenu(mb.getAttribute('aria-expanded') !== 'true'); });
  ov.addEventListener('click', function(e){ if (e.target.closest('a') || e.target === ov) setMenu(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true'){ setMenu(false); mb.focus(); } });

  /* tab groups */
  function tabGroup(list){
    var tabs = $$('[role=tab]', list);
    function select(t, focus){
      tabs.forEach(function(x){
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) t.focus();
    }
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ select(t); });
      t.addEventListener('keydown', function(e){
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n){ e.preventDefault(); select(n, true); }
      });
    });
    return {select: select, tabs: tabs};
  }
  var groups = $$('[role=tablist]').map(tabGroup);
  var engage = groups[0];
  function routeHash(){
    var h = location.hash, map = {'#offsites': 1, '#ai-transition': 2, '#engagements': 0};
    if (map.hasOwnProperty(h)){
      engage.select(engage.tabs[map[h]]);
      var el = document.getElementById('engagements');
      if (el) el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
    }
  }
  window.addEventListener('hashchange', routeHash);

  /* FAQ */
  var more = document.getElementById('faq-more'), toggle = $('.faq-toggle');
  if (more && toggle) toggle.addEventListener('click', function(){
    more.hidden = false; var f = $('summary', more); toggle.remove(); if (f) f.focus();
  });

  /* cookie notice */
  var COOKIE_KEY = 'kuma_cookie_consent', cookie = document.getElementById('cookie');
  function stored(){ try { return localStorage.getItem(COOKIE_KEY); } catch (e) { return null; } }
  function choose(v){ try { localStorage.setItem(COOKIE_KEY, v); } catch (e) {} cookie.classList.remove('show'); }
  if (!stored()) setTimeout(function(){ cookie.classList.add('show'); }, 400);
  document.getElementById('cookie-accept').addEventListener('click', function(){ choose('all'); });
  document.getElementById('cookie-essential').addEventListener('click', function(){ choose('essential'); });
  $$('[data-cookie-prefs]').forEach(function(b){ b.addEventListener('click', function(){ cookie.classList.add('show'); }); });

  /* shared form helpers */
  var MIN_FILL_MS = 2500;
  function encode(form){
    return Array.prototype.map.call(form.elements, function(el){
      if (!el.name || el.disabled) return '';
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return '';
      return encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value);
    }).filter(Boolean).join('&');
  }
  function ready(form){ form.setAttribute('data-ready-at', String(Date.now())); }
  function looksLikeBot(form){
    var trap = form.querySelector('[name="company_tax_id"]');
    if (trap && trap.value.trim() !== '') return true;
    var t = parseInt(form.getAttribute('data-ready-at') || '0', 10);
    return t > 0 && (Date.now() - t) < MIN_FILL_MS;
  }
  var FREE = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','aol.com','live.com','msn.com','proton.me','protonmail.com'];
  var LABELS = {scan: 'Start a 14-Day Scan', advisory: 'Book a Partner Debrief'};

  function wire(form){
    var card = form.closest('.form-card'), thanks = $('[data-thanks]', card), status = $('[data-status]', form);
    var btn = $('[data-submit]', form), label = $('[data-btn-label]', btn), orig = label.textContent;
    var head = $('[data-formhead]', card);
    ready(form);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!form.checkValidity()){ form.reportValidity(); return; }
      if (form.hasAttribute('data-free-email-check')){
        var em = $('[name=email]', form), err = $('[data-email-error]', form);
        var d = (em.value.split('@')[1] || '').toLowerCase();
        if (FREE.indexOf(d) !== -1){ err.hidden = false; em.focus(); return; }
        err.hidden = true;
      }
      function done(){
        form.hidden = true; if (head) head.hidden = true;
        var note = $('.note', card); if (note && !head) note.hidden = true;
        thanks.hidden = false; thanks.focus();
      }
      if (looksLikeBot(form)){ done(); return; }
      btn.disabled = true; label.textContent = 'Sending…'; status.textContent = '';
      fetch('/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: encode(form)})
        .then(function(res){ if (!res.ok) throw new Error(res.status); done(); })
        .catch(function(){
          btn.disabled = false; label.textContent = orig;
          status.innerHTML = 'Something went wrong. Please try again, or email <a href="mailto:contact@kuma.partners">contact@kuma.partners</a>.';
        });
    });
    var inp = $('[data-email-error]', form);
    if (inp) $('[name=email]', form).addEventListener('input', function(){ inp.hidden = true; });
  }
  $$('form[data-ajax]').forEach(wire);

  /* contact form: intake track relabels the button */
  var contact = document.getElementById('contact-form');
  function setTrack(track){
    $$('input[name=intake_track]', contact).forEach(function(r){ r.checked = r.getAttribute('data-track') === track; });
    var l = $('[data-btn-label]', contact), b = $('[data-submit]', contact);
    if (l && !b.disabled) l.textContent = LABELS[track] || LABELS.scan;
  }
  $$('input[name=intake_track]', contact).forEach(function(r){
    r.addEventListener('change', function(){ if (r.checked) setTrack(r.getAttribute('data-track')); });
  });
  $$('a[data-track]').forEach(function(a){ a.addEventListener('click', function(){ setTrack(a.getAttribute('data-track')); }); });
  function setSelect(sel, text){
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++){
      if (sel.options[i].text === text || sel.options[i].value === text){ sel.selectedIndex = i; sel.dispatchEvent(new Event('change')); return; }
    }
  }
  function scrollTo(id){ var el = document.getElementById(id); if (el) el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'}); }

  /* dialogs */
  var lastFocus = null;
  function dlg(id){ return document.getElementById(id + '-dialog'); }
  function resetDialog(d){
    var form = $('form', d), card = $('.form-card', d);
    form.reset(); form.hidden = false; ready(form);
    var head = $('[data-formhead]', d); if (head) head.hidden = false;
    $('[data-thanks]', d).hidden = true;
    var b = $('[data-submit]', form); b.disabled = false;
    var s = $('[data-status]', form); if (s) s.textContent = '';
    var err = $('[data-email-error]', form); if (err) err.hidden = true;
  }
  function openDialog(name, opts){
    var d = dlg(name); if (!d || typeof d.showModal !== 'function'){ scrollTo('contact'); return; }
    lastFocus = document.activeElement;
    resetDialog(d);
    if (opts){
      if (opts.email) $('[name=email]', d).value = opts.email;
      if (opts.company) $('[name=company]', d) && ($('[name=company]', d).value = opts.company);
      if (opts.role) setSelect($('[name=role]', d), opts.role);
      if (opts.broughtHere) setSelect($('[name=brought_here]', d), opts.broughtHere);
    }
    d.showModal(); document.body.classList.add('dlg-open');
  }
  function closeDialog(d){ d.close(); }
  $$('dialog.lp-dlg').forEach(function(d){
    d.addEventListener('close', function(){ document.body.classList.remove('dlg-open'); if (lastFocus) lastFocus.focus(); });
    d.addEventListener('click', function(e){ if (e.target === d) closeDialog(d); });
    $$('[data-close]', d).forEach(function(b){ b.addEventListener('click', function(){ closeDialog(d); }); });
  });
  $$('[data-open]').forEach(function(b){
    b.addEventListener('click', function(){
      var name = b.getAttribute('data-open'), o = {};
      if (b.getAttribute('data-role')) o.role = b.getAttribute('data-role');
      if (b.getAttribute('data-track') === 'offsite') o.broughtHere = 'We need a high-stakes leadership offsite';
      setMenu(false);
      openDialog(name, o);
    });
  });

  /* inbound deep links from older pages */
  if (location.hash === '#contact-investor'){ setTrack('advisory'); setSelect(document.getElementById('role'), 'investor'); }
  if (location.hash === '#contact-briefing'){ setTrack('advisory'); }
  routeHash();

  /* assessment */
  var sc = document.getElementById('scorecard-widget');
  if (sc){
    var ORDER = ['q1','q2','q3','q4','q5','q6','q7'], SCORED = ORDER.slice(0, 6);
    var MAP = {low: 1, moderate: 2, acute: 3}, CLS = {1: 'optimal', 2: 'moderate', 3: 'high'};
    var VEL = {1: 'High', 2: 'At risk', 3: 'Stalled'}, CAN = {1: 'Transparent', 2: 'Guarded', 3: 'Fragmented'}, GOV = {1: 'Unified', 2: 'Politicised', 3: 'Fractured'};
    var BADGE = {optimal: 'Optimal decision velocity', moderate: 'Moderate execution drag', high: 'High leadership friction'};
    var CTA = {founder: 'Start a 14-Day Scan', investor: 'Book a Partner Debrief'};
    var SYN = {
      founder: {
        optimal: "Your responses point to a leadership team moving fast, with clear ownership and low unspoken tension. That is rare at any stage, and worth protecting deliberately as you scale. The patterns that quietly erode this later usually start exactly where you are now.",
        moderate: "Your responses point to real, measurable drag: decisions that take longer than they should, tension that gets managed rather than resolved. This is the profile our 14-Day Friction Scan is built to catch early, before it costs a hire, a round or a co-founder.",
        high: "Your responses indicate a leadership team experiencing acute decision latency and structural misalignment. Left alone, this pattern stalls strategic momentum, burns out founders and erodes runway. This is the inflection point our 14-Day Friction Scan and Alignment Sprint are built to resolve."
      },
      investor: {
        optimal: "Your answers describe a portfolio company with fast decision velocity and low executive friction, a genuine asset heading into its next growth phase. Worth protecting deliberately as headcount and board pressure scale.",
        moderate: "Your answers point to emerging friction: decisions that take longer than they should, tension that is managed rather than resolved. Left alone at scale, this is the pattern that quietly erodes execution velocity well before it shows up in the numbers.",
        high: "Your answers reflect significant executive friction that risks leaking into board milestones, hiring retention and delivery timelines. Kuma Partners acts as a senior operator intervention to resolve leadership drag while fully preserving founder trust."
      }
    };
    var answers = {}, me = {email: '', company: '', mode: 'founder'};
    var prog = $('.scp', sc), ptxt = $('[data-progress-text]', sc), pfill = $('[data-progress-fill]', sc), back = $('[data-back-btn]', sc);
    var BACK = {q2: 'q1', q3: 'q2', q4: 'q3', q5: 'q4', q6: 'q5', q7: 'q6', gate: 'q7'};
    function lens(){
      var f = me.mode === 'founder';
      $$('[data-lens-founder]', sc).forEach(function(e){ e.hidden = !f; });
      $$('[data-lens-investor]', sc).forEach(function(e){ e.hidden = f; });
    }
    function show(id){
      $$('.sc-step', sc).forEach(function(e){ e.hidden = e.getAttribute('data-step') !== id; });
      var qi = ORDER.indexOf(id);
      prog.hidden = qi === -1;
      if (qi !== -1){ ptxt.textContent = 'Step ' + (qi + 1) + ' of ' + ORDER.length; pfill.style.width = ((qi + 1) / ORDER.length * 100) + '%'; }
      back.hidden = !BACK[id];
    }
    back.addEventListener('click', function(){
      var cur = $('.sc-step:not([hidden])', sc).getAttribute('data-step'), t = BACK[cur];
      if (!t) return;
      show(t);
      var step = $('.sc-step[data-step="' + t + '"]', sc);
      $$('.lp-opt', step).forEach(function(o){ o.classList.toggle('selected', o.getAttribute('data-value') === answers[t]); });
    });
    $('[data-start]', sc).addEventListener('click', function(){ show('lens'); });
    var modes = $$('[data-mode]', sc);
    modes.forEach(function(o){
      o.addEventListener('click', function(){
        modes.forEach(function(x){ x.classList.remove('selected'); }); o.classList.add('selected');
        me.mode = o.getAttribute('data-mode'); lens();
        setTimeout(function(){ show('q1'); }, 250);
      });
    });
    ORDER.forEach(function(qid, idx){
      var step = $('.sc-step[data-step="' + qid + '"]', sc), opts = $$('.lp-opt', step);
      opts.forEach(function(o){
        o.addEventListener('click', function(){
          opts.forEach(function(x){ x.classList.remove('selected'); }); o.classList.add('selected');
          answers[qid] = o.getAttribute('data-value');
          setTimeout(function(){ show(idx < ORDER.length - 1 ? ORDER[idx + 1] : 'gate'); }, 300);
        });
      });
    });
    function compute(){
      var sum = SCORED.reduce(function(t, q){ return t + (MAP[answers[q]] || 0); }, 0);
      var pct = Math.max(0, Math.min(100, Math.round((sum - SCORED.length) / (SCORED.length * 2) * 100)));
      var tier = pct < 35 ? 'optimal' : (pct <= 65 ? 'moderate' : 'high');
      return {
        pct: pct, tier: tier,
        vel: MAP[answers.q2] || 1,
        can: Math.round(((MAP[answers.q1] || 1) + (MAP[answers.q4] || 1) + (MAP[answers.q5] || 1)) / 3),
        gov: Math.round(((MAP[answers.q3] || 1) + (MAP[answers.q6] || 1)) / 2)
      };
    }
    function paint(key, level, labels){
      var v = $('[data-submetric="' + key + '"]', sc), c = CLS[level] || 'optimal';
      v.textContent = labels[level] || labels[1];
      $$('.lp-ticks i', v.parentNode).forEach(function(t, i){ t.className = i < level ? 'on-' + c : ''; });
    }
    function render(){
      var r = compute(), b = $('[data-score-badge]', sc);
      b.className = 'lp-badge ' + r.tier; b.textContent = BADGE[r.tier];
      $('[data-score-headline]', sc).textContent = (me.mode === 'founder' ? 'Executive Drag Index' : 'Portfolio Risk Index') + ': ' + r.pct + '/100';
      paint('velocity', r.vel, VEL); paint('candor', r.can, CAN); paint('governance', r.gov, GOV);
      $('[data-synthesis]', sc).textContent = SYN[me.mode][r.tier];
      $('[data-cta-label]', sc).textContent = CTA[me.mode];
      return r;
    }
    $('[data-gate-form]', sc).addEventListener('submit', function(e){
      e.preventDefault();
      me.email = document.getElementById('sc-email').value.trim();
      me.company = document.getElementById('sc-company').value.trim();
      if (!me.email || !me.company) return;
      render(); show('result');
    });
    $('[data-scorecard-cta]', sc).addEventListener('click', function(){
      if (me.mode !== 'investor'){ openDialog('scan', {email: me.email, company: me.company}); return; }
      setTrack('advisory');
      document.getElementById('email').value = me.email;
      document.getElementById('company').value = me.company;
      setSelect(document.getElementById('role'), 'investor');
      var jt = {seed: 'Seed / Series A', seriesbc: 'Series B / Series C', growth: 'Growth / PE-backed'}[answers.q7];
      if (jt) setSelect(document.getElementById('journey'), jt);
      var r = compute(), mx = Math.max(r.vel, r.can, r.gov), bh = 'Decisions are getting stuck';
      if (r.gov === mx) bh = 'Board / CEO / governance dynamics need attention';
      else if (r.can === mx) bh = 'Co-founder or C-suite alignment is breaking down';
      setSelect(document.getElementById('brought-here'), bh);
      scrollTo('contact');
    });
    $('[data-scorecard-restart]', sc).addEventListener('click', function(){
      answers = {}; me.mode = 'founder';
      $$('.lp-opt', sc).forEach(function(o){ o.classList.remove('selected'); });
      $('[data-gate-form]', sc).reset(); lens(); show('intro');
    });
    lens(); show('intro');
  }

  /* reveal */
  if (!reduce && 'IntersectionObserver' in window){
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting){ en.target.classList.remove('pre'); io.unobserve(en.target); } });
    }, {rootMargin: '0px 0px -6% 0px'});
    $$('.rv').forEach(function(el){
      if (el.getBoundingClientRect().top > vh){ el.classList.add('pre'); io.observe(el); }
    });
  }
})();
