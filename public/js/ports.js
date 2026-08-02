/* Real port coordinates + illustrative trade-lane weights for the /live map
   (public/js/live.js). No bundler is available on this no-build-step site,
   so there's no npm d3-geo/@turf import here -- greatCircleInterpolate below
   is a hand-rolled implementation of the same Sinnott/Ed Williams
   intermediate-point formula d3.geoInterpolate uses internally (haversine
   angular distance + spherical slerp), not an approximation of it.
   Attaches to window.MXG_PORTS / window.MXG_LANES_GEOJSON so live.js (a
   plain <script>, not a module) can read them after this file loads first. */
(function () {
  'use strict';

  // [lon, lat], approximate container-terminal coordinates.
  var PORTS = {
    shanghai: [121.816, 31.230],
    ningbo: [121.848, 29.868],
    singapore: [103.851, 1.264],
    busan: [129.081, 35.101],
    rotterdam: [4.032, 51.950],
    antwerp: [4.401, 51.229],
    hamburg: [9.968, 53.541],
    jebelAli: [55.020, 25.010],
    losAngeles: [-118.267, 33.740],
    newYork: [-74.045, 40.668],
    santos: [-46.333, -23.960],
  };

  // [fromPort, toPort, relative volume weight]. Illustrative corridors, not
  // vessel-routed paths -- see the caption on /live.
  var LANES = [
    // Trans-Pacific
    ['shanghai', 'losAngeles', 10],
    ['ningbo', 'losAngeles', 7],
    ['busan', 'losAngeles', 6],
    ['singapore', 'losAngeles', 5],
    // Asia -> Europe via Suez
    ['singapore', 'rotterdam', 8],
    ['shanghai', 'rotterdam', 7],
    ['busan', 'hamburg', 4],
    ['jebelAli', 'rotterdam', 5],
    ['singapore', 'hamburg', 4],
    // Transatlantic
    ['rotterdam', 'newYork', 6],
    ['antwerp', 'newYork', 4],
    ['hamburg', 'newYork', 3],
    // Other real trunk routes
    ['shanghai', 'singapore', 6],
    ['jebelAli', 'singapore', 5],
    ['santos', 'rotterdam', 3],
  ];

  var GREAT_CIRCLE_STEPS = 50;

  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  // Spherical slerp between two [lon, lat] points, sampled into `steps`
  // intermediate points along the great circle -- the same formula behind
  // d3.geoInterpolate, reimplemented directly since no bundler is available
  // here to pull in d3-geo/@turf as an npm dependency.
  function greatCircleInterpolate(a, b, steps) {
    var lon1 = toRad(a[0]), lat1 = toRad(a[1]);
    var lon2 = toRad(b[0]), lat2 = toRad(b[1]);

    var sinDLat = Math.sin((lat2 - lat1) / 2);
    var sinDLon = Math.sin((lon2 - lon1) / 2);
    var angularDistance = 2 * Math.asin(Math.sqrt(
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
    ));

    if (angularDistance === 0) return [a.slice(), b.slice()];

    var points = [];
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var A = Math.sin((1 - f) * angularDistance) / Math.sin(angularDistance);
      var B = Math.sin(f * angularDistance) / Math.sin(angularDistance);
      var x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      var y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      var z = A * Math.sin(lat1) + B * Math.sin(lat2);
      var lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      var lon = Math.atan2(y, x);
      points.push([toDeg(lon), toDeg(lat)]);
    }
    return unwrapLongitudes(points);
  }

  // Great-circle paths that cross the antimeridian (e.g. Shanghai -> Los
  // Angeles, over the North Pacific near the Aleutians) otherwise jump from
  // ~180 to ~-180 between consecutive points, which renders as a spurious
  // line straight across the whole map. Keeping longitude continuous
  // (allowing values outside -180..180) instead of wrapping each point
  // independently fixes that -- MapLibre projects each vertex on its own,
  // so an unwrapped/extended longitude renders correctly.
  function unwrapLongitudes(points) {
    var out = [points[0].slice()];
    for (var i = 1; i < points.length; i++) {
      var lon = points[i][0];
      var lat = points[i][1];
      var prevLon = out[i - 1][0];
      while (lon - prevLon > 180) lon -= 360;
      while (lon - prevLon < -180) lon += 360;
      out.push([lon, lat]);
    }
    return out;
  }

  function buildLanesGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: LANES.map(function (lane) {
        var from = PORTS[lane[0]];
        var to = PORTS[lane[1]];
        var volume = lane[2];
        return {
          type: 'Feature',
          properties: { from: lane[0], to: lane[1], volume: volume },
          geometry: {
            type: 'LineString',
            coordinates: greatCircleInterpolate(from, to, GREAT_CIRCLE_STEPS),
          },
        };
      }),
    };
  }

  window.MXG_PORTS = PORTS;
  window.MXG_LANES_GEOJSON = buildLanesGeoJSON();
})();
