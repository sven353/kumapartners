/* Result renderers shared by the audience page, the big screen and the admin page.
   PollRender.render(container, result, opts)
   opts.admin: show hide buttons. opts.onHide(token, hiddenNow): called when one is pressed. */
(function () {
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var COLOURS = ['#17677B', '#0B1523', '#2B8FA8', '#4C4B4E', '#0F4F5F'];

  function bars(res) {
    var w = el('div', 'pr-bars');
    var max = Math.max.apply(null, res.options.map(function (o) { return o.count; }));
    res.options.forEach(function (o) {
      var row = el('div', 'pr-bar' + (max > 0 && o.count === max ? ' top' : ''));
      var top = el('div', 'pr-bar-top');
      top.appendChild(el('span', 'pr-bar-label', o.label));
      top.appendChild(el('span', 'pr-bar-val', o.pct + '%  (' + o.count + ')'));
      var track = el('div', 'pr-track');
      var fill = el('div', 'pr-fill');
      fill.style.width = o.pct + '%';
      track.appendChild(fill);
      row.appendChild(top);
      row.appendChild(track);
      w.appendChild(row);
    });
    return w;
  }

  function scale(res) {
    var w = el('div');
    var avg = el('div', 'pr-avg');
    avg.appendChild(el('b', '', res.n ? res.avg.toFixed(1) : '-'));
    avg.appendChild(el('span', '', 'average out of 7'));
    w.appendChild(avg);
    var max = Math.max.apply(null, res.dist.concat([1]));
    var top = Math.max.apply(null, res.dist);
    var dist = el('div', 'pr-dist');
    res.dist.forEach(function (c) {
      var col = el('div', 'pr-col' + (c > 0 && c === top ? ' top' : ''));
      col.appendChild(el('em', '', String(c)));
      var bar = el('i');
      bar.style.height = Math.max(3, Math.round((c / max) * 82)) + '%';
      col.appendChild(bar);
      dist.appendChild(col);
    });
    w.appendChild(dist);
    var ticks = el('div', 'pr-ticks');
    for (var i = 1; i <= 7; i++) ticks.appendChild(el('span', '', String(i)));
    w.appendChild(ticks);
    if (res.low || res.high) {
      var ends = el('div', 'pr-ends');
      ends.appendChild(el('span', '', '1 ' + (res.low ? res.low : '')));
      ends.appendChild(el('span', '', (res.high ? res.high : '') + ' 7'));
      w.appendChild(ends);
    }
    return w;
  }

  function cloud(res, opts) {
    var w = el('div', 'pr-cloud');
    if (!res.words.length) return el('p', 'pr-empty', 'No words yet.');
    var max = Math.max.apply(null, res.words.map(function (x) { return x.c; }));
    res.words.slice(0, 60).forEach(function (x, i) {
      var s = el('span', 'pr-word' + (x.hidden ? ' hid' : ''), x.w);
      s.style.fontSize = (1 + (max > 1 ? ((x.c - 1) / (max - 1)) * 2.6 : 0.4)).toFixed(2) + 'em';
      s.style.color = COLOURS[i % COLOURS.length];
      s.title = x.c + (x.c === 1 ? ' mention' : ' mentions');
      if (opts.admin) {
        var b = el('button', 'link', x.hidden ? 'show' : 'hide');
        b.type = 'button';
        b.onclick = function () { opts.onHide(x.w, !x.hidden); };
        s.appendChild(b);
      }
      w.appendChild(s);
    });
    return w;
  }

  function cards(res, opts) {
    if (!res.items.length) return el('p', 'pr-empty', 'No answers yet.');
    var w = el('div', 'pr-cards');
    res.items.forEach(function (x) {
      var c = el('div', 'pr-card' + (x.hidden ? ' hid' : ''));
      c.appendChild(el('span', '', x.text));
      if (opts.admin) {
        var b = el('button', 'link', x.hidden ? 'Show this answer' : 'Hide this answer');
        b.type = 'button';
        b.onclick = function () { opts.onHide(x.id, !x.hidden); };
        c.appendChild(b);
      }
      w.appendChild(c);
    });
    return w;
  }

  function render(container, res, opts) {
    opts = opts || {};
    container.textContent = '';
    if (!res) return;
    var body = res.type === 'single' || res.type === 'multiple' ? bars(res)
      : res.type === 'scale' ? scale(res)
      : res.type === 'cloud' ? cloud(res, opts)
      : cards(res, opts);
    container.appendChild(body);
    container.appendChild(el('p', 'pr-n', res.n + (res.n === 1 ? ' answer' : ' answers')));
  }

  window.PollRender = { render: render };
})();
