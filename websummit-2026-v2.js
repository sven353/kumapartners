(function(){
var all=[].slice.call(document.querySelectorAll('details.ws-more'));
function openHash(){var id=location.hash.slice(1);if(!id)return;var d=document.getElementById(id);if(d&&d.classList.contains('ws-more')){d.open=true;d.scrollIntoView({block:'start'});}}
// older browsers without exclusive details: close the others
all.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)all.forEach(function(o){if(o!==d)o.open=false;});});});
window.addEventListener('hashchange',openHash);openHash();
})();

/* Infographic lightbox */
(function(){
  var dlg=document.getElementById('ws-lb'),img=document.getElementById('ws-lb-img');
  if(!dlg||!img||typeof dlg.showModal!=='function')return;
  var last=null;
  function close(){dlg.close()}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-zoom]');
    if(b){
      last=b;
      var pic=b.querySelector('img');
      img.src=b.getAttribute('data-zoom');
      img.alt=pic?pic.alt:'';
      dlg.showModal();
      dlg.querySelector('.ws-lb-scroll').scrollTop=0;
      return;
    }
    if(e.target===dlg||e.target.closest('.ws-lb-x')||e.target.classList.contains('ws-lb-scroll'))close();
  });
  dlg.addEventListener('close',function(){img.removeAttribute('src');if(last)last.focus()});
})();
