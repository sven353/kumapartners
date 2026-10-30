(function(){
  /* Netlify Identity invitation and recovery links can land here: hand them to the ledger */
  if (/(?:^|[#&])(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(location.hash)){
    location.replace('https://ledger.kuma.partners/' + location.hash); return;
  }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* menu overlay */
  var mb = document.querySelector('.menu-btn'), ov = document.getElementById('menu');
  function setMenu(open){
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    ov.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  mb.addEventListener('click', function(){ setMenu(mb.getAttribute('aria-expanded') !== 'true'); });
  ov.addEventListener('click', function(e){ if (e.target.closest('a') || e.target === ov) setMenu(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true'){ setMenu(false); mb.focus(); } });

  /* FAQ: show the last questions on request (they stay in the HTML for crawlers) */
  var more = document.getElementById('faq-more'), toggle = document.querySelector('.faq-toggle');
  if (more && toggle) toggle.addEventListener('click', function(){
    more.hidden = false;
    var first = more.querySelector('summary');
    toggle.remove();
    if (first) first.focus();
  });

  /* charter dialog (Round page only) */
  var dlg = document.getElementById('charter');
  if (dlg){
    var openCharter = function(){ if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); document.body.style.overflow = 'hidden'; };
    var closeCharter = function(){ if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
    dlg.addEventListener('close', function(){ document.body.style.overflow = ''; });
    document.querySelectorAll('[data-open-charter]').forEach(function(b){ b.addEventListener('click', openCharter); });
    document.querySelectorAll('[data-close-charter]').forEach(function(b){ b.addEventListener('click', closeCharter); });
    dlg.addEventListener('click', function(e){ if (e.target === dlg) closeCharter(); });
    dlg.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener('click', closeCharter); });
  }

  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = String(new Date().getFullYear()); });

  /* form: Netlify Forms over fetch, optional work-email check, small client-side rate limit, thank-you state */
  var PERSONAL = ['gmail.com','googlemail.com','yahoo.com','yahoo.es','yahoo.fr','yahoo.de','hotmail.com','hotmail.es','hotmail.fr','outlook.com','outlook.es','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','gmx.de','gmx.net','gmx.com','web.de','proton.me','protonmail.com','yandex.com','mail.com','orange.fr','free.fr','laposte.net','t-online.de'];
  var form = document.querySelector('.contact-form');
  if (form){
    var thanks = document.getElementById('thanks'), status = form.querySelector('.form-status');
    var email = form.querySelector('[data-work-email]'), KEY = 'kuma_round_' + form.getAttribute('name') + '_times';
    var checkEmail = function(){
      if (!email) return;
      var d = (email.value.split('@')[1] || '').trim().toLowerCase();
      email.setCustomValidity(PERSONAL.indexOf(d) > -1 ? 'Please use your corporate work email, not a personal inbox.' : '');
    };
    if (email) email.addEventListener('input', checkEmail);
    var recent = function(){
      try { var now = Date.now(); return JSON.parse(localStorage.getItem(KEY) || '[]').filter(function(t){ return now - t < 600000; }); }
      catch (e) { return []; }
    };
    form.addEventListener('submit', function(e){
      e.preventDefault();
      status.className = 'form-status'; status.textContent = '';
      checkEmail();
      if (!form.checkValidity()){ form.reportValidity(); return; }
      if (form.elements['bot-field'].value) return;
      var times = recent();
      if (times.length >= 3){ status.textContent = 'Thanks, we already have your message. We’ll be in touch shortly.'; return; }
      var btn = form.querySelector('button[type=submit]'), lbl = btn.querySelector('.lbl');
      btn.disabled = true; lbl.textContent = 'Sending…';
      fetch('/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(new FormData(form)).toString()})
        .then(function(res){
          if (!res.ok) throw new Error(res.status);
          try { times.push(Date.now()); localStorage.setItem(KEY, JSON.stringify(times)); } catch (err) {}
          form.reset();
          var card = form.closest('.form-card');
          ['.form-head', '.alt', '.consent'].forEach(function(s){ var n = card.querySelector(s); if (n) n.hidden = true; });
          form.hidden = true; thanks.hidden = false; thanks.focus();
        })
        .catch(function(){ status.className = 'form-status err'; status.textContent = 'We could not send your message just now. Please try again or write to contact@kuma.partners.'; })
        .finally(function(){ btn.disabled = false; lbl.textContent = btn.getAttribute('data-label'); });
    });
  }

  /* reveal: visible by default; JS adds the before-state below the fold */
  if (!reduce && 'IntersectionObserver' in window){
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting){ en.target.classList.remove('pre'); io.unobserve(en.target); } });
    }, {rootMargin: '0px 0px -6% 0px'});
    document.querySelectorAll('.rv').forEach(function(el){
      if (el.getBoundingClientRect().top > vh){ el.classList.add('pre'); io.observe(el); }
    });
  }
})();
