# Vendored third-party assets

`maplibre-gl-csp.js` + `maplibre-gl-csp-worker.js` — [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
v4.7.1, BSD-3-Clause. This is the library's own **CSP-safe build**
variant (no `eval`/`new Function`, no blob-URL workers), which is why it
needs two files: the main bundle and a separately self-hosted worker
script, registered via `maplibregl.setWorkerUrl(...)` before creating a
Map. Self-hosted (not loaded from a CDN or any tile provider) so `/live`
runs under the site's `script-src 'self'` CSP with zero exceptions and
zero external network requests — no API token, no tile server, no font
glyphs (this map renders no text labels, so `glyphs`/`sprite` are omitted
from the style entirely).

`public/css/vendor/maplibre-gl.css` is the matching stylesheet, same
version/license.

`d3.v7.min.js` — [D3](https://d3js.org) v7.9.0, ISC license. Official UMD
bundle (exposes a global `d3`), unmodified, downloaded from
`unpkg.com/d3@7.9.0/dist/d3.min.js`. Used by the Sweden Trade Intelligence
scrollytelling story (`public/js/story.js`) for the sticky-graphic
transitions (enter/update/exit) that page's narrative depends on.
