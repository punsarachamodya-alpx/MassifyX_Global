# Vendored third-party data

`shipping-lanes.geojson` — 14 of the "Major" tier's 52 segments from the
[Global Shipping Lanes](https://github.com/newzealandpaul/Shipping-Lanes)
dataset, kept as real, static maritime geography (persistent sea corridors,
not a live feed) for the `/live` disruption map (`public/js/live.js`).

Filtered down from the full Major tier (52 segments, ~5,700 points) to the
14 longest/most globally representative segments -- deliberate restraint so
the map reads as a curated backdrop, not a dense traffic-density layer. No
coordinates were altered, redrawn, or smoothed; only a subset of whole
segments was kept.

**Source / attribution (required by the dataset's license):**
Benden, P. (2022). *Global Shipping Lanes* [Data set]. Zenodo.
https://doi.org/10.5281/zenodo.6361763 — itself georeferenced from the CIA's
"Map of The World's Oceans," October 2012.

**License:** Creative Commons Attribution-ShareAlike 4.0 International
(the dataset's custom terms additionally exclude Statista from using it).
This derivative -- a filtered subset with coordinates otherwise unchanged --
is redistributed here under the same CC BY-SA 4.0 terms.
