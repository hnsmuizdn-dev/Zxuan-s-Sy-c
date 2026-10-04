/* ============================================================
   HANSZ — Video Editor / Content Creator
   Vanilla JS · no dependencies

   01  CONFIG
   02  UTILS (toast + clipboard)
   03  PARTICLE FIELD (canvas)
   04  SCROLL (progress / to-top)
   05  REVEAL
   06  LINK CARDS (stagger / copy)
   07  IMAGE FALLBACK
   08  BOOT
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 01  CONFIG ---------- */
  var CONFIG = {
    particles: {
      density: 26000,   // screen area px per particle — raise = lighter
      max: 52,
      linkDist: 128,
      mouseRadius: 170
    }
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 02  UTILS ---------- */
  var toastEl, toastMsg, toastTimer;
  function toast(msg) {
    toastEl = toastEl || $('#toast');
    toastMsg = toastMsg || $('#toastMsg');
    if (!toastEl) return;
    toastMsg.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? res() : rej();
    });
  }

  /* ---------- 03  PARTICLE FIELD ---------- */
  /* Exposes pause()/resume() so the scroll handler can switch the canvas off
     exactly while the user is scrolling — that's when jank is most visible. */
  var particlesCtl = { pause: function () {}, resume: function () {} };

  function particles() {
    var cv = $('#fxParticles');
    if (!cv || REDUCED) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0, pts = [], raf = null, sizeT;
    var mouse = { x: -9999, y: -9999 };
    var paused = false;
    var C = CONFIG.particles;
    var css = getComputedStyle(document.documentElement);
    var colA = (css.getPropertyValue('--a1-rgb') || '0,212,255').trim();
    var colB = (css.getPropertyValue('--a3-rgb') || '255,45,120').trim();

    /* constellation lines are the expensive part (O(n^2)) — skip on phones */
    var drawLinks = window.innerWidth > 760;

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLinks = W > 760;
      build();
    }

    function build() {
      var n = clamp(Math.round((W * H) / C.density), 14, C.max);
      pts = [];
      for (var i = 0; i < n; i++) {
        var d = Math.random();
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .22, vy: -(0.05 + Math.random() * 0.22),
          rad: 0.6 + d * 1.9,
          spd: 0.35 + d * 1.1,
          a: 0.18 + d * 0.5,
          warm: Math.random() > 0.68,
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(ts) {
      raf = requestAnimationFrame(draw);
      if (paused || document.hidden) return;

      ctx.clearRect(0, 0, W, H);
      var t = ts * 0.001;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx + Math.sin(t * p.spd + p.ph) * 0.16;
        p.y += p.vy;

        var dx = mouse.x - p.x, dy = mouse.y - p.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < C.mouseRadius * C.mouseRadius) {
          var d = Math.sqrt(d2) || 1;
          var f = (1 - d / C.mouseRadius) * 0.55;
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }

        if (p.y < -12) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -12) p.x = W + 10;
        if (p.x > W + 12) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rad, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + (p.warm ? colB : colA) + ',' + (p.a * 0.55).toFixed(3) + ')';
        ctx.fill();
      }

      if (!drawLinks) return;
      ctx.lineWidth = 0.6;
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var ddx = pts[a].x - pts[b].x, ddy = pts[a].y - pts[b].y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < C.linkDist) {
            ctx.strokeStyle = 'rgba(' + colA + ',' + ((1 - dist / C.linkDist) * 0.14).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
      }
    }

    size();
    raf = requestAnimationFrame(draw);

    particlesCtl.pause = function () { paused = true; };
    particlesCtl.resume = function () { paused = false; };

    window.addEventListener('resize', function () { clearTimeout(sizeT); sizeT = setTimeout(size, 220); });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
  }

  /* ---------- 04  SCROLL ----------
     rAF-throttled + cached metrics. Reading documentElement.scrollHeight inside
     the scroll handler forces a synchronous layout on every event — that alone
     was enough to make the progress bar feel laggy. */
  function scroll() {
    var bar = $('#scrollBar'), top = $('#toTop');
    var max = 1, ticking = false, idleT;

    function measure() {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    function update() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop;
      if (bar) bar.style.width = clamp((y / max) * 100, 0, 100) + '%';
      if (top) top.classList.toggle('is-on', y > 620);
    }

    function request() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    function onScroll() {
      request();
      /* hand the whole frame budget to the scroll: stop the canvas and freeze
         every decorative CSS animation until things settle */
      if (!document.body.classList.contains('is-scrolling')) {
        document.body.classList.add('is-scrolling');
      }
      particlesCtl.pause();
      clearTimeout(idleT);
      idleT = setTimeout(function () {
        document.body.classList.remove('is-scrolling');
        particlesCtl.resume();
        measure();
      }, 140);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); request(); }, { passive: true });
    window.addEventListener('load', function () { measure(); request(); });
    measure();
    request();

    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 05  REVEAL ---------- */
  function reveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window) || REDUCED) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.setProperty('--i', Math.max(0, els.indexOf(el) - 1));
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 06  LINK CARDS ---------- */
  function cards() {
    $$('.cat__list').forEach(function (list) {
      $$('.card', list).forEach(function (card, i) {
        card.style.setProperty('--i', i);
      });
    });

    /* copy-to-clipboard (email card) */
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.dataset.copy;
        copyText(val)
          .then(function () { toast('Copied — ' + val); })
          .catch(function () { toast('Copy failed: ' + val); });
      });
    });

    /* ---- click FX: colour shift + ripple + wipe, then navigate ---- */
    var wipe = $('#wipe');

    function ripple(card, x, y) {
      if (REDUCED) return;
      var r = card.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2.1;
      var el = document.createElement('span');
      el.className = 'ripple';
      el.style.width = el.style.height = size + 'px';
      el.style.left = (x - r.left) + 'px';
      el.style.top = (y - r.top) + 'px';
      card.appendChild(el);
      setTimeout(function () { el.remove(); }, 640);
    }

    function playWipe() {
      if (REDUCED || !wipe) return;
      wipe.classList.remove('is-on');
      void wipe.offsetWidth;          /* restart the animation */
      wipe.classList.add('is-on');
      setTimeout(function () { wipe.classList.remove('is-on'); }, 720);
    }

    function closeDrop(drop) {
      if (!drop) return;
      drop.classList.remove('is-open');
      var t = $('.card--menu', drop);
      if (t) t.setAttribute('aria-expanded', 'false');
    }

    document.addEventListener('click', function (e) {
      /* close open dropdowns when the click lands outside of them */
      $$('.drop.is-open').forEach(function (d) {
        if (d !== e.target && !d.contains(e.target)) closeDrop(d);
      });

      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card) return;

      /* let the browser handle new-tab / new-window clicks */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;

      /* 1. re-tint the whole page with this card's colour */
      var key = card.dataset.c;
      if (key) document.documentElement.setAttribute('data-accent', key);

      /* 2. dropdown trigger — expand/collapse instead of navigating */
      if (card.hasAttribute('data-menu')) {
        e.preventDefault();
        var drop = card.closest('.drop');
        var open = drop ? drop.classList.toggle('is-open') : false;
        card.setAttribute('aria-expanded', open ? 'true' : 'false');
        ripple(card, e.clientX, e.clientY);
        return;
      }

      /* 3. card feedback */
      ripple(card, e.clientX, e.clientY);
      card.classList.remove('is-press', 'is-armed', 'is-open');
      void card.offsetWidth;
      card.classList.add('is-press', 'is-armed', 'is-open');
      setTimeout(function () { card.classList.remove('is-press', 'is-armed', 'is-open'); }, 700);

      /* 4. light sweep across the viewport */
      playWipe();

      /* 5. the copy-email card has no destination */
      if (card.hasAttribute('data-copy')) return;

      var href = card.getAttribute('href');
      e.preventDefault();
      if (!href || href === '#') {
        setTimeout(function () { toast('Ganti href="#" dengan link asli kamu'); }, 260);
        return;
      }
      setTimeout(function () {
        if (card.target === '_blank' || /^https?:/i.test(href)) {
          window.open(href, '_blank', 'noopener');
        } else {
          window.location.href = href;
        }
      }, REDUCED ? 0 : 420);
    });

    /* Escape closes an open dropdown */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      $$('.drop.is-open').forEach(closeDrop);
    });
  }

  /* ---------- 07  BOOT ---------- */
  function init() {
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();

    document.documentElement.setAttribute('data-accent', 'cyan');

    cards();
    reveal();
    particles();
    scroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
