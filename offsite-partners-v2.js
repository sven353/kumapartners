(function(){
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

  /* contact form: Netlify Forms over fetch, a small client-side rate limit, thank-you state */
  var form = document.querySelector('.contact-form'), thanks = document.getElementById('thanks');
  var status = form.querySelector('.form-status'), KEY = 'kuma_offsite_conv_times';
  function recent(){
    try { var now = Date.now(); return JSON.parse(localStorage.getItem(KEY) || '[]').filter(function(t){ return now - t < 600000; }); }
    catch (e) { return []; }
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!form.checkValidity()){ form.reportValidity(); return; }
    if (form.company_tax_id.value) return;
    var times = recent();
    if (times.length >= 3){ status.textContent = 'Thanks, we already have your message. We\u2019ll be in touch shortly.'; return; }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; status.textContent = 'Sending\u2026';
    fetch('/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(new FormData(form)).toString()})
      .then(function(res){
        if (!res.ok) throw new Error(res.status);
        try { times.push(Date.now()); localStorage.setItem(KEY, JSON.stringify(times)); } catch (err) {}
        form.reset(); status.textContent = '';
        var card = form.closest('.form-card');
        card.querySelector('.form-head').hidden = true;
        card.querySelector('.alt').hidden = true;
        card.querySelector('.consent').hidden = true;
        form.hidden = true; thanks.hidden = false; thanks.focus();
      })
      .catch(function(){ status.textContent = 'Something went wrong. Please write to contact@kuma.partners instead.'; })
      .finally(function(){ btn.disabled = false; });
  });

  /* reveal: everything is visible by default; JS adds the before-state below the fold
     and an IntersectionObserver removes it on entry */
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
