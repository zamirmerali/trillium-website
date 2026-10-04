document.documentElement.classList.add('js');
(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open);
    nav.style.setProperty('--nav-top', header.getBoundingClientRect().bottom + 'px');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('.nav__sub-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      btn.nextElementSibling.classList.toggle('is-open', open);
    });
  });

  // Section bar: on narrow screens, scroll the current page's link into view.
  var cur = document.querySelector('.subnav [aria-current]');
  if (cur) { var ul = cur.closest('ul'); ul.scrollLeft = Math.max(0, cur.parentNode.offsetLeft - 24); }

  // Specialty panels: hover (desktop) or tap/focus opens one panel at a time.
  document.querySelectorAll('.spec-row').forEach(function (row) {
    var panels = row.querySelectorAll('.spec-panel');
    var hoverable = window.matchMedia('(hover: hover) and (min-width: 961px)');
    var open = function (p) {
      panels.forEach(function (x) { x.classList.toggle('is-open', x === p); x.setAttribute('aria-expanded', x === p); });
    };
    panels.forEach(function (p) {
      p.addEventListener('mouseenter', function () { if (hoverable.matches) open(p); });
      p.addEventListener('focus', function () { open(p); });
      p.addEventListener('click', function (e) { if (!e.target.closest('a')) open(p); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (!e.target.closest('a')) { e.preventDefault(); open(p); } } });
    });
  });

  // Conditions directory: category filter + text search.
  var dir = document.querySelector('[data-conditions]');
  if (dir) {
    var buttons = dir.querySelectorAll('.filter');
    var search = dir.querySelector('.search');
    var groups = dir.querySelectorAll('.cond-group');
    var empty = dir.querySelector('.cond-empty');
    var cat = 'all';
    var apply = function () {
      var q = (search.value || '').trim().toLowerCase();
      var shown = 0;
      groups.forEach(function (g) {
        var inCat = cat === 'all' || g.dataset.cat === cat;
        var any = 0;
        g.querySelectorAll('.cond-item').forEach(function (it) {
          var hit = inCat && (!q || it.textContent.toLowerCase().indexOf(q) > -1);
          it.hidden = !hit; if (hit) any++;
        });
        g.hidden = !any; shown += any;
        var lab = g.querySelector('header .label');
        if (!lab.dataset.total) lab.dataset.total = lab.textContent;
        lab.textContent = q ? any + (any === 1 ? ' match' : ' matches') : lab.dataset.total;
      });
      empty.style.display = shown ? 'none' : 'block';
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        cat = b.dataset.cat;
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        apply();
      });
    });
    search.addEventListener('input', apply);
  }

  var items = document.querySelectorAll('.draw');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
})();
