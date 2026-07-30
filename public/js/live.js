/* Live disruption monitor. Lazy-loads the self-hosted globe library only
   once the map container actually scrolls into view, then polls the
   same-origin /live/data proxy for updates — MIS's real address is never
   sent to the browser. No inline scripts anywhere: script-src stays 'self'. */
(function () {
  'use strict';

  var POLL_INTERVAL_MS = 60000;
  var SEVERITY_COLORS = { 1: '#4dabf7', 2: '#6bcb77', 3: '#ffd93d', 4: '#ff9f43', 5: '#ff5c5c' };

  var container = document.getElementById('live-globe');
  var feedList = document.querySelector('.live-feed__list');
  var dataEl = document.getElementById('live-initial-data');
  if (!container || !dataEl) return;

  var events = [];
  try {
    events = JSON.parse(dataEl.textContent || '[]');
  } catch (e) {
    events = [];
  }

  var globeInstance = null;

  function severityColor(sev) {
    return SEVERITY_COLORS[sev] || '#8b96a5';
  }

  function renderGlobe() {
    if (typeof window.Globe !== 'function') return;
    globeInstance = window.Globe()(container)
      .width(container.clientWidth)
      .height(480)
      .backgroundColor('rgba(0,0,0,0)')
      .pointsData(events)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor(function (d) { return severityColor(d.severity); })
      .pointAltitude(0.01)
      .pointRadius(0.35)
      .pointLabel(function (d) {
        return d.location + ' — ' + d.category + ' (severity ' + d.severity + ')';
      });
  }

  function loadGlobeScript(callback) {
    if (document.getElementById('globe-gl-script')) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.id = 'globe-gl-script';
    script.src = '/js/vendor/globe.gl.min.js';
    script.onload = callback;
    document.body.appendChild(script);
  }

  function ensureGlobeLoaded() {
    if (globeInstance) return;
    loadGlobeScript(renderGlobe);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          ensureGlobeLoaded();
          observer.disconnect();
        }
      });
    });
    observer.observe(container);
  } else {
    // No IntersectionObserver support: load eagerly rather than never.
    ensureGlobeLoaded();
  }

  function isSafeSourceUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  function renderFeed() {
    if (!feedList) return;
    feedList.innerHTML = '';
    events.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'live-feed__item';

      var sev = document.createElement('span');
      sev.className = 'live-feed__severity live-feed__severity--' + e.severity;
      sev.textContent = String(e.severity);

      var cat = document.createElement('span');
      cat.className = 'live-feed__category';
      cat.textContent = e.category;

      var loc = document.createElement('span');
      loc.className = 'live-feed__location';
      loc.textContent = e.location;

      var summary = document.createElement('p');
      summary.className = 'live-feed__summary';
      summary.textContent = e.summary;

      li.appendChild(sev);
      li.appendChild(cat);
      li.appendChild(loc);
      li.appendChild(summary);

      if (isSafeSourceUrl(e.sourceUrl)) {
        var link = document.createElement('a');
        link.className = 'live-feed__source';
        link.href = e.sourceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Source';
        li.appendChild(link);
      }

      feedList.appendChild(li);
    });
  }

  function poll() {
    fetch('/live/data')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.available) return;
        events = data.events;
        if (globeInstance) globeInstance.pointsData(events);
        renderFeed();
      })
      .catch(function () {
        // A transient poll failure just keeps showing the last-known data.
      });
  }

  setInterval(poll, POLL_INTERVAL_MS);
})();
