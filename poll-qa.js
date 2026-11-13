/* Live Q&A list, shared by the big screen, the presenter page and the moderator page.
   create(): keeps a local copy of the questions and fetches only the ones that are new or changed (the server lists keys with a change tag).
   draw(): puts the list on the page. */
(function () {
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // opts.get(keys) -> Promise of an array of items {k, a, t, d, h}
  function create(opts) {
    var cache = {};          // key -> { e: change tag, item }
    var cur = null;
    var busy = false, again = null;
    function sorted() {
      return Object.keys(cache).map(function (k) { return cache[k].item; }).filter(Boolean).sort(function (x, y) { return (x.t || 0) - (y.t || 0) || (x.k < y.k ? -1 : 1); });
    }
    function run(keys, c) {
      if (busy) { again = [keys, c]; return Promise.resolve(); }
      busy = true;
      var changed = c !== cur;
      cur = c;
      var seen = {}, need = [];
      keys.forEach(function (x) {
        seen[x.k] = 1;
        if (!cache[x.k] || cache[x.k].e !== x.e) need.push(x);
      });
      Object.keys(cache).forEach(function (k) { if (!seen[k]) { delete cache[k]; changed = true; } });
      var chunks = [];
      for (var i = 0; i < need.length; i += 100) chunks.push(need.slice(i, i + 100));
      return Promise.all(chunks.map(function (ch) {
        return opts.get(ch.map(function (x) { return x.k; })).then(function (items) {
          var tags = {};
          ch.forEach(function (x) { tags[x.k] = x.e; });
          (items || []).forEach(function (it) { cache[it.k] = { e: tags[it.k], item: it.h && !opts.keepHidden ? null : it }; changed = true; });
        });
      })).catch(function () {}).then(function () {
        busy = false;
        if (changed && opts.onChange) opts.onChange(sorted(), cur);
        if (again) { var a = again; again = null; return run(a[0], a[1]); }
      });
    }
    return { update: run, items: sorted, current: function () { return cur; } };
  }

  // items: sorted oldest first. o.order 'new' or 'old'. o.controls adds buttons. Current question first, answered ones last.
  function draw(box, items, cur, o) {
    o = o || {};
    var top = box.scrollTop;
    var list = items.slice();
    if (o.order !== 'old') list.reverse();
    var live = list.filter(function (x) { return !x.d && x.k !== cur; });
    var done = list.filter(function (x) { return x.d && x.k !== cur; });
    var now = list.filter(function (x) { return x.k === cur; });
    var seen = box._seen || null, now2 = {};
    box.textContent = '';
    if (!list.length) { box.appendChild(el('p', 'qa-empty', o.empty || 'No questions yet.')); return; }
    function card(x, kind) {
      now2[x.k] = 1;
      var c = el('div', 'qa-card' + (kind ? ' ' + kind : '') + (x.h ? ' hid' : '') + (seen && !seen[x.k] ? ' fresh' : ''));
      c.appendChild(el('p', 'qa-text', x.a || '(hidden)'));
      if (o.controls) {
        var r = el('div', 'qa-acts');
        var b = function (t, fn, cls) { var e = el('button', 'btn ghost sm' + (cls ? ' ' + cls : ''), t); e.type = 'button'; e.onclick = fn; r.appendChild(e); };
        if (!x.h && !o.simple) {
          if (x.k === cur) b('Stop', function () { o.onCur(null); });
          else b('Now answering', function () { o.onCur(x.k); });
          b(x.d ? 'Mark as open' : 'Answered', function () { o.onDone(x.k, !x.d); });
        }
        b(x.h ? 'Show again' : 'Hide', function () { o.onHide(x.k, !x.h); }, x.h ? '' : 'danger');
        c.appendChild(r);
      }
      return c;
    }
    now.forEach(function (x) { var n = card(x, 'now'); n.insertBefore(el('span', 'qa-tag', 'Now answering'), n.firstChild); box.appendChild(n); });
    live.forEach(function (x) { box.appendChild(card(x, '')); });
    if (done.length) {
      box.appendChild(el('p', 'qa-sep', 'Answered (' + done.length + ')'));
      done.forEach(function (x) { box.appendChild(card(x, 'done')); });
    }
    box._seen = now2;
    box.scrollTop = top;
  }

  window.PollQA = { create: create, draw: draw };
})();
