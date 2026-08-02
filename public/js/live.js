/* Live disruption monitor: a real MapLibre GL JS map (WebGL, pan/zoom) on
   CARTO's free "dark-matter" vector basemap -- self-hosted MapLibre build,
   but the basemap itself (style.json + vector tiles + glyphs + sprite) is
   intentionally NOT self-hosted: it's fetched client-side from
   *.basemaps.cartocdn.com (allowed via a named CSP exception in server.js),
   because self-drawing coastlines/borders/graticule ourselves was the
   thing being replaced. No API token is required for this basemap, but its
   attribution is required and stays on (see the AttributionControl below).
   Shipping lanes are real, static maritime geography (persistent sea
   corridors don't change minute to minute) loaded from
   public/geo/shipping-lanes.geojson -- see public/geo/README.md for
   source/license. Disruption events are our own live data, added as a
   GeoJSON source/layer on top. Polls the same-origin /live/data proxy for
   updates -- MIS's real address is never sent to the browser. */
(function () {
  'use strict';

  if (typeof maplibregl === 'undefined') return;

  var CARTO_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  var POLL_INTERVAL_MS = 15000;

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
  // 1-5 and a fixed category enum -- "score" here is derived purely for
  // circle-radius scaling; it is not an MIS-provided field and nothing
  // invents facts MIS didn't assert.
  function toEventsGeoJSON(items) {
    return {
      type: 'FeatureCollection',
      features: items
        .filter(function (item) { return Number.isFinite(item.lat) && Number.isFinite(item.lon); })
        .map(function (item) {
          return {
            type: 'Feature',
            id: item.id,
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

  // Atlantic/Europe-leaning framing (not a bare equirectangular [0,0]) so
  // the map reads as a deliberately composed section of the page rather
  // than the whole planet shrunk to fit -- paired with the max-height cap
  // in styles.css (.world-map).
  var map = new maplibregl.Map({
    container: root,
    style: CARTO_STYLE_URL,
    center: [10, 35],
    zoom: 1.75,
    minZoom: 1.3,
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

  function openEventPopup(feature) {
    popup.setLngLat(feature.geometry.coordinates).setDOMContent(buildEventPopupContent(feature.properties)).addTo(map);
  }

  // ---------------------------------------------------- event/lane layers

  var hoveredEventId = null;

  function renderEventLayers() {
    var source = map.getSource('events');
    var collection = toEventsGeoJSON(events);
    if (source) {
      source.setData(collection);
      return;
    }

    // promoteId lets MapLibre key feature-state (used for the hover
    // highlight below) by our own stable event id.
    map.addSource('events', { type: 'geojson', data: collection, promoteId: 'id' });

    var severityColorExpression = [
      'match', ['get', 'severity'],
      1, SEVERITY_COLORS[1],
      2, SEVERITY_COLORS[2],
      3, SEVERITY_COLORS[3],
      4, SEVERITY_COLORS[4],
      5, SEVERITY_COLORS[5],
      '#94a3b8',
    ];
    var hovered = ['boolean', ['feature-state', 'hover'], false];

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
        'circle-radius': [
          '+',
          ['interpolate', ['linear'], ['get', 'score'], 20, 5, 100, 13],
          ['case', hovered, 3, 0],
        ],
        'circle-stroke-width': ['case', hovered, 2.5, 1.5],
        'circle-stroke-color': ['case', hovered, '#ffffff', '#0a1628'],
      },
    });

    map.on('mousemove', 'events-dots', function (e) {
      map.getCanvas().style.cursor = 'pointer';
      var feature = e.features && e.features[0];
      if (!feature) return;
      if (hoveredEventId !== null && hoveredEventId !== feature.id) {
        map.setFeatureState({ source: 'events', id: hoveredEventId }, { hover: false });
      }
      hoveredEventId = feature.id;
      map.setFeatureState({ source: 'events', id: hoveredEventId }, { hover: true });
    });
    map.on('mouseleave', 'events-dots', function () {
      map.getCanvas().style.cursor = '';
      if (hoveredEventId !== null) {
        map.setFeatureState({ source: 'events', id: hoveredEventId }, { hover: false });
      }
      hoveredEventId = null;
    });
    map.on('click', 'events-dots', function (e) {
      var feature = e.features && e.features[0];
      if (feature) openEventPopup(feature);
    });
  }

  function renderLaneLayer() {
    if (map.getSource('lanes')) return;
    map.addSource('lanes', { type: 'geojson', data: '/geo/shipping-lanes.geojson' });
    // Real, static maritime corridors -- texture, not subject. Thin,
    // low-opacity, muted (not the site's vivid cyan/severity hues) and
    // deliberately unanimated: this is persistent geography, not a live
    // feed, and looks it. No per-lane width variation either -- the
    // source dataset carries no real traffic-volume figure to scale by,
    // and inventing one would be exactly the "looks real but isn't" trap
    // this is meant to avoid.
    map.addLayer({
      id: 'lanes',
      type: 'line',
      source: 'lanes',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#5b7699',
        'line-width': 0.9,
        'line-opacity': 0.32,
      },
    }, 'events-glow');
  }

  map.on('load', function () {
    // events-glow/events-dots must exist before lanes is inserted "before"
    // events-glow, to land the required bottom-to-top stack: basemap ->
    // lanes -> event glow -> event dots.
    renderEventLayers();
    renderLaneLayer();
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

  function findEventById(id) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === id) return events[i];
    }
    return null;
  }

  // Clicking (or Enter/Space-ing) a feed item flies the map to it and
  // opens the same popup a direct map click would -- the list and the map
  // are two views over the same data, so they stay cross-linked.
  function focusEventOnMap(id) {
    var event = findEventById(id);
    if (!event || !Number.isFinite(event.lat) || !Number.isFinite(event.lon)) return;
    map.flyTo({ center: [event.lon, event.lat], zoom: Math.max(map.getZoom(), 4), essential: true });
    var geoJsonEvent = toEventsGeoJSON([event]).features[0];
    openEventPopup(geoJsonEvent);
  }

  if (feedList) {
    feedList.addEventListener('click', function (e) {
      if (e.target.closest('.live-feed__source')) return; // let the source link behave normally
      var item = e.target.closest('.live-feed__item');
      if (item && item.dataset.eventId) focusEventOnMap(item.dataset.eventId);
    });
    feedList.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var item = e.target.closest('.live-feed__item');
      if (!item || !item.dataset.eventId) return;
      e.preventDefault();
      focusEventOnMap(item.dataset.eventId);
    });
  }

  function renderFeed() {
    if (!feedList) return;
    feedList.innerHTML = '';
    events.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'live-feed__item';
      li.dataset.eventId = e.id;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', 'Show this disruption on the map');

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

  function updateStatusLine() {
    if (!updatedEl) return;
    var count = events.length;
    var noun = count === 1 ? 'active disruption' : 'active disruptions';
    updatedEl.textContent = count + ' ' + noun + ' · Last updated ' + new Date().toLocaleTimeString();
  }

  updateStatusLine();

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
        updateStatusLine();
      })
      .catch(function () {
        // A transient poll failure just keeps showing the last-known data.
      });
  }

  setInterval(poll, POLL_INTERVAL_MS);
})();
