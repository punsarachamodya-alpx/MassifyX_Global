# Vendored third-party assets

`globe.gl.min.js` — [globe.gl](https://github.com/vasturiano/globe.gl) v2.46.1, MIT licensed.
Self-hosted here (not loaded from a CDN) so `/live` can run under the site's
`script-src 'self'` CSP with no exceptions. Only fetched when a visitor
actually scrolls the globe into view — see `public/js/live.js`.
