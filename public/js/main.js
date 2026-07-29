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
