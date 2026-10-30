(function(){
  /* menu overlay */
  var mb = document.querySelector('.menu-btn'), ov = document.getElementById('menu');
  if (!mb || !ov) return;
  function setMenu(open){
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    ov.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  mb.addEventListener('click', function(){ setMenu(mb.getAttribute('aria-expanded') !== 'true'); });
  ov.addEventListener('click', function(e){ if (e.target.closest('a') || e.target === ov) setMenu(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true'){ setMenu(false); mb.focus(); } });
})();
