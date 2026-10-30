(function(){
var all=[].slice.call(document.querySelectorAll('details.ws-more'));
function openHash(){var id=location.hash.slice(1);if(!id)return;var d=document.getElementById(id);if(d&&d.classList.contains('ws-more')){d.open=true;d.scrollIntoView({block:'start'});}}
// older browsers without exclusive details: close the others
all.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)all.forEach(function(o){if(o!==d)o.open=false;});});});
window.addEventListener('hashchange',openHash);openHash();
})();
