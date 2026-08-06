/* MassifyX Global — progressive enhancement only.
   Every page renders, every link works, and the contact form validates and submits
   server-side without any of this. This file adds the mobile menu, scroll reveals,
   and the cookie banner. Nothing here is load-bearing. */

(function () {
  'use strict';

  // ------------------------------------------------------------ mobile nav
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    // Close on Escape so keyboard users aren't trapped behind the overlay.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // --------------------------------------------------------- scroll reveal
  var revealables = document.querySelectorAll('.reveal');
  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    for (var i = 0; i < revealables.length; i++) {
      revealables[i].classList.add('is-visible');
    }
  }

  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    for (var j = 0; j < revealables.length; j++) observer.observe(revealables[j]);

    // Failsafe: reveal everything after 2s regardless of whether the observer
    // fired, so content can never end up permanently invisible.
    window.setTimeout(revealAll, 2000);
  }

  // ------------------------------------------------- hero cursor interaction
  // Cursor-follow spotlight + depth parallax on the homepage hero. Fine
  // pointers only (no jank chasing a finger on touch) and only when motion
  // isn't reduced. Everything else about the hero — copy, CTAs, the figure
  // itself — renders and works identically without this.
  var hero = document.querySelector('.hero');
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  if (hero && finePointer && !reduced) {
    hero.classList.add('has-pointer');

    var heroRaf = null;
    var lastPointerEvent = null;

    function applyHeroPointer(clientX, clientY) {
      var rect = hero.getBoundingClientRect();
      var mx = ((clientX - rect.left) / rect.width) * 100;
      var my = ((clientY - rect.top) / rect.height) * 100;
      var px = (clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      var py = (clientY - rect.top) / rect.height - 0.5;

      hero.style.setProperty('--hero-mx', mx + '%');
      hero.style.setProperty('--hero-my', my + '%');
      hero.style.setProperty('--hero-px', String(px * 2)); // -1..1
      hero.style.setProperty('--hero-py', String(py * 2));
    }

    hero.addEventListener('pointermove', function (e) {
      lastPointerEvent = e;
      if (heroRaf) return;
      heroRaf = window.requestAnimationFrame(function () {
        if (lastPointerEvent) applyHeroPointer(lastPointerEvent.clientX, lastPointerEvent.clientY);
        heroRaf = null;
      });
    });

    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--hero-mx', '50%');
      hero.style.setProperty('--hero-my', '38%');
      hero.style.setProperty('--hero-px', '0');
      hero.style.setProperty('--hero-py', '0');
    });
  }

  // --------------------------------------------------------- cookie banner
  var STORAGE_KEY = 'mxg.cookie-consent';
  var banner = document.getElementById('cookieBanner');
  var accept = document.getElementById('cookieAccept');
  var reject = document.getElementById('cookieReject');
  var reopen = document.getElementById('cookieReopen');

  function readConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // private mode / storage disabled — banner simply shows again
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* nothing to persist to; the choice still applies to this page view */
    }
  }

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    // Next frame, so the slide-up transition actually runs.
    window.requestAnimationFrame(function () {
      banner.classList.add('is-visible');
    });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    window.setTimeout(function () {
      banner.hidden = true;
    }, 450);
  }

  if (banner && !readConsent()) showBanner();

  if (accept) {
    accept.addEventListener('click', function () {
      writeConsent('accepted');
      hideBanner();
    });
  }

  if (reject) {
    reject.addEventListener('click', function () {
      writeConsent('rejected');
      hideBanner();
    });
  }

  if (reopen) {
    reopen.addEventListener('click', function () {
      showBanner();
    });
  }
})();
