/* Live disruption monitor: a real MapLibre GL JS map (WebGL, pan/zoom) on
   CARTO's free "dark-matter" vector basemap -- self-hosted MapLibre build,
   but the basemap itself (style.json + vector tiles + glyphs + sprite) is
   intentionally NOT self-hosted: it's fetched client-side from
   *.basemaps.cartocdn.com (allowed via a named CSP exception in server.js),
   because self-drawing coastlines/borders/graticule ourselves was the
   thing being replaced. No API token is required for this basemap, but its
   attribution is required and stays on (see the AttributionControl below).
   Disruption events and trade lanes are our own data, added as GeoJSON
   sources/layers on top of that basemap. Polls the same-origin /live/data
   proxy for updates -- MIS's real address is never sent to the browser. */
(function () {
  'use strict';

  if (typeof maplibregl === 'undefined') return;

  var CARTO_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  var POLL_INTERVAL_MS = 15000;
  var LANE_ANIMATION_INTERVAL_MS = 120;

  // A status-style ramp (severity behaves like a threat level, not a
  // generic magnitude). Never the only channel: every marker/popup also
  // carries a numeric label and a text tooltip/summary. Matches the
  // dataviz-skill-validated ramp already used for the feed badges below.
  var SEVERITY_COLORS = {
    1: '#22c55e',
    2: '#84cc16',
    3: '#fbbf24',
    4: '#f97316',
    5: '#ef4444',
  };

  var root = document.getElementById('live-globe');
  var feedList = document.querySelector('.live-feed__list');
  var updatedEl = root ? root.querySelector('[data-role="last-updated"]') : null;
  var dataEl = document.getElementById('live-initial-data');
  var vesselsEl = document.getElementById('live-initial-vessels');
  if (!root || !dataEl) return;

  function parseJsonIsland(el) {
    try {
      return JSON.parse((el && el.textContent) || '[]');
    } catch (e) {
      return [];
    }
  }

  var events = parseJsonIsland(dataEl);
  var vessels = vesselsEl ? parseJsonIsland(vesselsEl) : [];

  function severityColor(sev) {
    return SEVERITY_COLORS[sev] || '#94a3b8';
  }

  // The MIS API contract (lib/misContract.js) emits an integer severity
  // 1-5 and a fixed category enum -- not the string
  // critical/high/medium/low tier, "type", or 0-100 "score" fields a
  // generic reference implementation might assume. "score" here is
  // derived purely for circle-radius scaling; it is not an MIS-provided
  // field and nothing invents facts MIS didn't assert.
  function toEventsGeoJSON(items) {
    return {
      type: 'FeatureCollection',
      features: items
        .filter(function (item) { return Number.isFinite(item.lat) && Number.isFinite(item.lon); })
        .map(function (item) {
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
            properties: {
              id: item.id,
              severity: item.severity,
              category: item.category,
              location: item.location,
              summary: item.summary,
              sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : '',
              score: item.severity * 20,
            },
          };
        }),
    };
  }

  maplibregl.setWorkerUrl('/js/vendor/maplibre-gl-csp-worker.js');

  var map = new maplibregl.Map({
    container: root,
    style: CARTO_STYLE_URL,
    center: [20, 25],
    zoom: 1.4,
    minZoom: 1.2,
    maxZoom: 6,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    renderWorldCopies: false,
  });

  map.touchZoomRotate.disableRotation();

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  // CARTO's basemap is free but requires attribution -- kept on and
  // undisturbed, just moved out from under our own bottom-right legend.
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

  // No separate fitBounds() call: center [20, 25] / zoom 1.4 is already the
  // "crop the wasted polar space" choice (an equirectangular center of
  // [0, 0] at this zoom would waste far more frame on empty Arctic/
  // Antarctic than a mid-latitude center does).

  // --------------------------------------------------------- lane "flow"
  // WebGL has no SVG-style animateMotion/stroke-dashoffset; the standard
  // MapLibre/Mapbox technique is cycling the dasharray pattern itself.
  var DASH_FRAMES = [
    [0, 4, 3],
    [1, 4, 2],
    [2, 4, 1],
    [3, 4, 0],
    [0, 1, 3, 3],
  ];
  var dashFrame = 0;
  var laneAnimationTimer = null;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateLanes() {
    dashFrame = (dashFrame + 1) % DASH_FRAMES.length;
    if (map.getLayer('lanes')) {
      map.setPaintProperty('lanes', 'line-dasharray', DASH_FRAMES[dashFrame]);
    }
  }

  // --------------------------------------------------------------- popup

  var popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'world-map__popup', maxWidth: '260px' });

  function buildEventPopupContent(props) {
    var wrap = document.createElement('div');

    var severity = document.createElement('strong');
    severity.className = 'world-map__popup-severity';
    severity.style.color = severityColor(props.severity);
    severity.textContent = 'Severity ' + props.severity;
    wrap.appendChild(severity);

    var meta = document.createElement('div');
    meta.className = 'world-map__popup-meta';
    meta.textContent = props.category + ' — ' + props.location;
    wrap.appendChild(meta);

    var summary = document.createElement('p');
    summary.className = 'world-map__popup-summary';
    summary.textContent = props.summary;
    wrap.appendChild(summary);

    if (props.sourceUrl && /^https?:\/\//i.test(props.sourceUrl)) {
      var link = document.createElement('a');
      link.className = 'world-map__popup-source';
      link.href = props.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Source';
      wrap.appendChild(link);
    }

    return wrap;
  }

  // ---------------------------------------------------- event/lane layers

  function renderEventLayers() {
    var source = map.getSource('events');
    var collection = toEventsGeoJSON(events);
    if (source) {
      source.setData(collection);
    } else {
      map.addSource('events', { type: 'geojson', data: collection });

      var severityColorExpression = [
        'match', ['get', 'severity'],
        1, SEVERITY_COLORS[1],
        2, SEVERITY_COLORS[2],
        3, SEVERITY_COLORS[3],
        4, SEVERITY_COLORS[4],
        5, SEVERITY_COLORS[5],
        '#94a3b8',
      ];

      map.addLayer({
        id: 'events-glow',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-color': severityColorExpression,
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 20, 12, 100, 26],
          'circle-opacity': 0.18,
          'circle-blur': 0.6,
        },
      });

      map.addLayer({
        id: 'events-dots',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-color': severityColorExpression,
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 20, 5, 100, 13],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0a1628',
        },
      });

      map.on('mouseenter', 'events-dots', function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'events-dots', function () { map.getCanvas().style.cursor = ''; });
      map.on('click', 'events-dots', function (e) {
        var feature = e.features && e.features[0];
        if (!feature) return;
        popup.setLngLat(feature.geometry.coordinates.slice(0, 2)).setDOMContent(buildEventPopupContent(feature.properties)).addTo(map);
      });
    }
  }

  function renderLaneLayer() {
    if (!map.getSource('lanes')) {
      map.addSource('lanes', { type: 'geojson', data: window.MXG_LANES_GEOJSON || { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'lanes',
        type: 'line',
        source: 'lanes',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#22d3ee',
          'line-width': ['interpolate', ['linear'], ['get', 'volume'], 3, 0.6, 10, 2],
          'line-opacity': ['interpolate', ['linear'], ['get', 'volume'], 3, 0.15, 10, 0.4],
          'line-dasharray': DASH_FRAMES[0],
        },
      }, 'events-glow');
    }
  }

  map.on('load', function () {
    // events-glow/events-dots must exist before lanes is inserted "before"
    // events-glow, to land the required bottom-to-top stack: basemap ->
    // lanes -> event glow -> event dots.
    renderEventLayers();
    renderLaneLayer();
    if (!reducedMotion) {
      laneAnimationTimer = setInterval(animateLanes, LANE_ANIMATION_INTERVAL_MS);
    }
  });

  // -------------------------------------------------------------- vessels
  // Vessels stay as MapLibre DOM Markers (not a native layer): a heading
  // arrow needs per-marker rotation, and there's no icon/sprite asset to
  // drive a symbol layer with. Distinct shape (arrow) and hue (cyan) from
  // the disruption circles -- two different entities never share one
  // visual channel.

  var vesselTooltip = document.createElement('div');
  vesselTooltip.className = 'world-map__tooltip';
  vesselTooltip.hidden = true;
  root.appendChild(vesselTooltip);

  function hideVesselTooltip() {
    vesselTooltip.hidden = true;
  }

  function showVesselTooltip(anchorEl, vessel) {
    vesselTooltip.innerHTML = '';
    var name = document.createElement('strong');
    name.className = 'world-map__tooltip-severity';
    name.textContent = vessel.shipName || 'Unnamed vessel';
    var meta = document.createElement('div');
    meta.className = 'world-map__tooltip-meta';
    var bits = ['MMSI ' + vessel.mmsi];
    if (Number.isFinite(vessel.speedKnots)) bits.push(vessel.speedKnots.toFixed(1) + ' kn');
    meta.textContent = bits.join(' — ');
    vesselTooltip.appendChild(name);
    vesselTooltip.appendChild(meta);
    vesselTooltip.hidden = false;
    positionVesselTooltip(anchorEl);
  }

  function positionVesselTooltip(anchorEl) {
    var anchorRect = anchorEl.getBoundingClientRect();
    var rootRect = root.getBoundingClientRect();
    vesselTooltip.style.left = anchorRect.left - rootRect.left + anchorEl.offsetWidth / 2 + 'px';
    vesselTooltip.style.top = anchorRect.top - rootRect.top + 'px';
  }

  var vesselMarkers = [];

  function clearMarkers(list) {
    list.forEach(function (marker) { marker.remove(); });
    list.length = 0;
  }

  function renderVesselMarkers() {
    clearMarkers(vesselMarkers);
    vessels
      .filter(function (v) { return Number.isFinite(v.lat) && Number.isFinite(v.lon); })
      .forEach(function (vessel) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'world-map__vessel';
        el.title = (vessel.shipName || 'Unnamed vessel') + ' — MMSI ' + vessel.mmsi;

        el.addEventListener('mouseenter', function () { showVesselTooltip(el, vessel); });
        el.addEventListener('focus', function () { showVesselTooltip(el, vessel); });
        el.addEventListener('mouseleave', hideVesselTooltip);
        el.addEventListener('blur', hideVesselTooltip);

        var marker = new maplibregl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' })
          .setLngLat([vessel.lon, vessel.lat])
          .setRotation(Number.isFinite(vessel.headingDeg) ? vessel.headingDeg : 0)
          .addTo(map);
        vesselMarkers.push(marker);
      });
  }

  map.on('load', function () {
    renderVesselMarkers();
  });

  // ----------------------------------------------------------------- feed

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

  function updateTimestamp() {
    if (!updatedEl) return;
    updatedEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  }

  updateTimestamp();

  function poll() {
    fetch('/live/data')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        vessels = Array.isArray(data.vessels) ? data.vessels : [];
        renderVesselMarkers();
        if (data.available) {
          events = data.events;
          renderEventLayers();
          renderFeed();
        }
        updateTimestamp();
      })
      .catch(function () {
        // A transient poll failure just keeps showing the last-known data.
      });
  }

  setInterval(poll, POLL_INTERVAL_MS);

  window.addEventListener('beforeunload', function () {
    if (laneAnimationTimer) clearInterval(laneAnimationTimer);
  });
})();
