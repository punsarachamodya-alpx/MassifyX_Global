# Sweden Trade Intelligence — refresh runbook

## Running the refresh manually

```bash
npm run data:sweden-trade
```

Pulls fresh tables from SCB's PxWebApi v2 (no key needed), re-analyses, runs
the integrity checks, and atomically overwrites `content/sweden-trade-data.json`
on success. On failure it exits non-zero and leaves the existing file
untouched — the site keeps serving last month's (still-valid) data rather
than a suspect one.

To run the unit tests for the pipeline itself (parser/chunker/aggregations),
separate from the site's own `npm test`:

```bash
npm run test:sweden-trade
```

## Automated schedule

`.github/workflows/sweden-trade-refresh.yml` runs this on the 5th of every
month (a few days after SCB's own release cadence) and opens a PR with the
diff — it never pushes to `main` directly. Also runnable on demand from the
Actions tab (`workflow_dispatch`).

**Review checklist before merging the PR:**

- Does the diff look like a plausible one-month move, not a unit/parsing
  error (e.g. a partner's share jumping 10x, a negative import value)?
- Did the job's own validation pass (it would have failed the run
  otherwise, so a failed run means no PR appears at all — see below).
- Spot-check one or two numbers against `scb.se` directly if anything looks
  surprising.

## If the job fails

The job fails loudly and does **not** touch `content/sweden-trade-data.json`
on failure — check the Action's log (or local stdout) for which check
failed:

- **HTTP error from SCB** — table ID may have changed, or SCB is
  rate-limiting/down. Re-run later; if a table ID is genuinely gone, SCB
  usually publishes a successor table under a new `TAB####` id — search
  `GET /tables?query=<keyword>` to find it and update
  `scripts/sweden-trade/*` accordingly.
- **Reconciliation check failed** (sum of parts ≠ reported total beyond
  tolerance) — either SCB changed a table's shape/dimensions, or a bug was
  introduced in the aggregation. Don't loosen the tolerance to make it
  pass; find the actual cause.
- **Validation rejected a value** (negative where impossible, implausible
  YoY swing) — could be a genuine, newsworthy real-world shift (e.g. a
  trade shock) rather than a bug. Check the raw SCB figure directly before
  assuming it's an error; if it's real, adjust the sanity bound in
  `scripts/sweden-trade/validate.js` deliberately, with a comment
  explaining why, rather than silently widening it.

## If SCB's table structure changes

SCB's PxWebApi v2 launched October 2025 replacing v1 — table IDs and
dimension codes are not guaranteed stable forever. If the job starts
failing on parsing (not validation), re-run
`GET /tables/{id}/metadata?lang=en` for the affected table and diff its
`dimension`/`id`/`size` against what `scripts/sweden-trade/` expects.

## Auditability

Every refresh's raw SCB pulls are saved as fixtures under
`scripts/sweden-trade/fixtures/` alongside the derived
`content/sweden-trade-data.json` — any number on the published page can be
traced back to the exact raw API response that produced it.
