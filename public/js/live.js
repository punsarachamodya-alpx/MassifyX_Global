/* Live disruption monitor: a 2D proportional-symbol map (equirectangular),
   not a 3D globe -- reads clearly at a glance and needs no heavy library.
   Severity uses a single validated sequential ramp (dataviz skill,
   references/palette.md); category is shown as text, never a second color
   channel on the same marker. Polls the same-origin /live/data proxy for
   updates -- MIS's real address is never sent to the browser. Vessel
   positions (when AISSTREAM_API_KEY is configured on MIS) update on the
   same poll; they go stale fast, so the interval is short. */
(function () {
  'use strict';

  var POLL_INTERVAL_MS = 15000;

  // Validated on the site's own dark navy surface (--navy-deep #060f26) via
  // the dataviz skill's validator: one hue, monotone lightness, light end
  // clears 2:1 contrast. Severity 1 recedes toward the surface; 5 pops.
  var SEVERITY_COLORS = {
    1: '#184f95',
    2: '#256abf',
    3: '#3987e5',
    4: '#6da7ec',
    5: '#9ec5f4',
  };

  var root = document.getElementById('live-globe');
  var markersLayer = root ? root.querySelector('.world-map__markers') : null;
  var vesselsLayer = root ? root.querySelector('.world-map__vessels') : null;
  var feedList = document.querySelector('.live-feed__list');
  var dataEl = document.getElementById('live-initial-data');
  var vesselsEl = document.getElementById('live-initial-vessels');
  if (!root || !markersLayer || !dataEl) return;

  function parseJsonIsland(el) {
    try {
      return JSON.parse((el && el.textContent) || '[]');
    } catch (e) {
      return [];
    }
  }

  var events = parseJsonIsland(dataEl);
  var vessels = vesselsEl ? parseJsonIsland(vesselsEl) : [];

  var tooltip = document.createElement('div');
  tooltip.className = 'world-map__tooltip';
  tooltip.hidden = true;
  root.appendChild(tooltip);

  // The trade-route dots are SMIL <animateMotion> -- not controllable via
  // CSS, so prefers-reduced-motion is honored here instead.
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lanesSvg = root.querySelector('.world-map__lanes');
  if (reducedMotion && lanesSvg && typeof lanesSvg.pauseAnimations === 'function') {
    lanesSvg.pauseAnimations();
  }

  function severityColor(sev) {
    return SEVERITY_COLORS[sev] || '#52514e';
  }

  function project(lat, lon) {
    return {
      leftPct: ((lon + 180) / 360) * 100,
      topPct: ((90 - lat) / 180) * 100,
    };
  }

  function positionTooltip(anchor) {
    var anchorRect = anchor.getBoundingClientRect();
    var rootRect = root.getBoundingClientRect();
    tooltip.style.left = anchorRect.left - rootRect.left + anchor.offsetWidth / 2 + 'px';
    tooltip.style.top = anchorRect.top - rootRect.top + 'px';
  }

  function showEventTooltip(marker, event) {
    tooltip.innerHTML = '';

    var severity = document.createElement('strong');
    severity.className = 'world-map__tooltip-severity';
    severity.textContent = 'Severity ' + event.severity;

    var meta = document.createElement('div');
    meta.className = 'world-map__tooltip-meta';
    meta.textContent = event.category + ' — ' + event.location;

    var summary = document.createElement('p');
    summary.className = 'world-map__tooltip-summary';
    summary.textContent = event.summary;

    tooltip.appendChild(severity);
    tooltip.appendChild(meta);
    tooltip.appendChild(summary);
    tooltip.hidden = false;
    positionTooltip(marker);
  }

  function showVesselTooltip(marker, vessel) {
    tooltip.innerHTML = '';

    var name = document.createElement('strong');
    name.className = 'world-map__tooltip-severity';
    name.textContent = vessel.shipName || 'Unnamed vessel';

    var meta = document.createElement('div');
    meta.className = 'world-map__tooltip-meta';
    var bits = ['MMSI ' + vessel.mmsi];
    if (Number.isFinite(vessel.speedKnots)) bits.push(vessel.speedKnots.toFixed(1) + ' kn');
    meta.textContent = bits.join(' — ');

    tooltip.appendChild(name);
    tooltip.appendChild(meta);
    tooltip.hidden = false;
    positionTooltip(marker);
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function renderMarkers() {
    markersLayer.innerHTML = '';
    events.forEach(function (event) {
      if (!Number.isFinite(event.lat) || !Number.isFinite(event.lon)) return;
      var pos = project(event.lat, event.lon);

      var marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'world-map__marker world-map__marker--sev' + event.severity;
      marker.style.left = pos.leftPct + '%';
      marker.style.top = pos.topPct + '%';
      marker.style.setProperty('--marker-color', severityColor(event.severity));
      // Native title as a no-JS/assistive-tech fallback; the custom tooltip
      // above is the primary hover/focus experience per the dataviz skill.
      marker.title = event.category + ' — ' + event.location;

      marker.addEventListener('mouseenter', function () { showEventTooltip(marker, event); });
      marker.addEventListener('focus', function () { showEventTooltip(marker, event); });
      marker.addEventListener('mouseleave', hideTooltip);
      marker.addEventListener('blur', hideTooltip);

      markersLayer.appendChild(marker);
    });
  }

  function renderVessels() {
    if (!vesselsLayer) return;
    vesselsLayer.innerHTML = '';
    vessels.forEach(function (vessel) {
      if (!Number.isFinite(vessel.lat) || !Number.isFinite(vessel.lon)) return;
      var pos = project(vessel.lat, vessel.lon);

      var marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'world-map__vessel';
      marker.style.left = pos.leftPct + '%';
      marker.style.top = pos.topPct + '%';
      if (Number.isFinite(vessel.headingDeg)) {
        marker.style.setProperty('--vessel-heading', vessel.headingDeg + 'deg');
      }
      marker.title = (vessel.shipName || 'Unnamed vessel') + ' — MMSI ' + vessel.mmsi;

      marker.addEventListener('mouseenter', function () { showVesselTooltip(marker, vessel); });
      marker.addEventListener('focus', function () { showVesselTooltip(marker, vessel); });
      marker.addEventListener('mouseleave', hideTooltip);
      marker.addEventListener('blur', hideTooltip);

      vesselsLayer.appendChild(marker);
    });
  }

  renderMarkers();
  renderVessels();

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

      if (typeof e.sourceUrl === 'string' && /^https?:\/\//i.test(e.sourceUrl)) {
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
        vessels = Array.isArray(data.vessels) ? data.vessels : [];
        renderVessels();
        if (!data.available) return;
        events = data.events;
        renderMarkers();
        renderFeed();
      })
      .catch(function () {
        // A transient poll failure just keeps showing the last-known data.
      });
  }

  setInterval(poll, POLL_INTERVAL_MS);
})();
