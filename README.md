# MassifyX Global — Website

Procurement and supply chain operations for mid-market companies: an EU-based
engagement point in Sweden paired with senior-led delivery from Sri Lanka.

Plain Node.js. No build step, no bundler, no CSS framework. Edit a file, restart, done.

## Run it

```bash
npm install
cp .env.example .env    # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev             # node --watch, restarts on save
```

Production: `npm start`. Any host that runs `npm start` works — see **Hosting** below.

| Variable | Required? | Effect |
| --- | --- | --- |
| `PORT` | Optional | Listen port (default 3000) |
| `ADMIN_PASSWORD` | Required for `/admin` | Without it, every login is refused by design |
| `SESSION_SECRET` | Recommended | Keeps admin sessions alive across restarts |
| `NODE_ENV=production` | Recommended | Secure cookies, static-asset caching |
| `BASE_URL` | Recommended | Canonical URLs, Open Graph tags, sitemap |

## Layout

```
server.js          Express app — routes, contact validation, sitemap/robots
content/           Default copy as plain JS modules — the site's substance
lib/               store (merge), schema (fields + write allow-list), auth, paths
routes/admin.js    All /admin routes
views/             EJS templates + partials
public/            One CSS file, vanilla JS, self-hosted fonts, brand assets
data/              git-ignored — admin overrides and backups
```

Copy lives in `content/*.js`. `lib/store.js` merges JSON overrides written by the
admin panel over those defaults at read time, so admin edits appear live with no
restart. A missing or corrupt `data/content.json` can never take the site down — it
falls back to the shipped copy.

## Editing content

Two ways:

1. **`/admin`** — password-protected panel, edits every word on the site. Changes go
   live immediately. Backups are taken before every save; "reset to original" is
   always available.
2. **`content/*.js`** — edit the shipped defaults directly and restart.

## Honesty constraints

These are structural, not a writing style to remember:

- No client names, logos, testimonials, case studies, or "trusted by" bars.
- No headcount, years-in-business, or invented performance metrics.
- Every product and division claim is labelled **Live today** or **Roadmap**, rendered
  through a single partial (`views/partials/badge.ejs`).
- ISO 27001 and SOC 2 are named on *How We Work* explicitly as **not** held today.
- No public pricing — tiers route to "Contact us".
- No photography. The illustrative graphics are brand-native SVG (see below).

## Design

Light-only, editorial register. Navy `#0a1b3c` is the dominant brand presence; cobalt
`#2e7bff` and cyan `#46d3ff` are signal only — buttons, links, eyebrows, hairline
accents, diagram strokes — never large fills or backgrounds.

Fonts (Montserrat, Manrope, JetBrains Mono) are self-hosted as variable WOFF2, latin
subset only, ~101 KB total. Not the Google Fonts CDN: a German court held that
embedding it transmits visitor IPs to a third country without consent, which is a real
exposure for a site targeting German buyers.

### Artwork

All illustrative graphics are self-contained, animated SVG in the brand palette —
no photography, no stock icon set, no external requests:

- `views/partials/hero-figure.ejs` — the hero diagram: fragmented supplier inputs
  converging through one control point, leaving as ordered connected lanes.
- `views/partials/industry-icon.ejs` — eight bespoke line icons, keyed by slug.
- `public/img/motion/supply-flow.svg` — full-bleed animated band on the home page.
- `public/img/industries/*.svg` — one composition per vertical.
- `public/img/regions/*.svg` — Sweden and Sri Lanka, drawn from real coordinates
  with the engagement point and delivery hub pinned.

Each animates via internal CSS and stops under `prefers-reduced-motion: reduce`.
Every image path is an editable field in the admin panel, so any of these can be
swapped for a different asset without touching code.

## Progressive enhancement

The site works fully with JavaScript disabled: every route renders, every link works,
and the contact form validates and submits server-side. JS only adds the mobile menu,
scroll reveals, and the cookie banner.

Scroll-reveal is gated on a `.js` class set by `public/js/js-on.js` (a tiny external
head script — the CSP forbids inline scripts), so with JS off content is simply
visible rather than stuck at `opacity: 0`. A 2-second failsafe also reveals everything
unconditionally in case the IntersectionObserver misses an element.

## Security

- Helmet CSP: `script-src 'self'`, no inline scripts anywhere. `frame-src` is
  evaluated per request against the live booking URL, so adding a Calendly link in the
  admin panel widens the policy with no restart.
- Admin: one shared password via `ADMIN_PASSWORD`, SHA-256 + `timingSafeEqual`
  comparison, session regeneration on login, per-session CSRF on every POST, and a
  15-minute lockout after 6 failed attempts from one IP.
- The schema doubles as a write allow-list — a crafted POST can only reach declared paths.
- Uploads: JPG/PNG/WebP only by MIME type, 4 MB cap, 4 per request, filenames always
  replaced with random hex.
- `/admin` sets `X-Robots-Tag: noindex`; `robots.txt` disallows it; the sitemap is
  built from a hard-coded public route list, so `/admin` is absent by construction.

## Hosting

Standard Node web service, no build step. The one decision that matters: admin edits
live in `data/content.json` and uploads in `public/img/uploads/`. Hosts that give each
deploy a fresh filesystem silently discard both on redeploy. Either attach a
persistent disk, treat the admin panel as edit-locally-then-commit, or export a JSON
copy before every redeploy. If the site is only ever edited via `content/*.js` in
code, none of this applies.

## Outstanding founder TODOs

Grep for `TODO(founder)`, or work the admin dashboard's checklist top to bottom:

- [ ] Wire contact-form delivery to a real inbox or CRM webhook (currently logged to stdout).
- [ ] Add a booking embed URL (Calendly or equivalent).
- [ ] Upload a founder headshot.
- [ ] Rewrite the founder story on *Who We Are* in the founder's own first-person words.
- [ ] Have counsel review Privacy, Cookie, and Terms; confirm the Terms' governing-law jurisdiction.
- [ ] Confirm the exact Sweden engagement-point framing and registered-company wording.
- [ ] Choose a cookieless analytics tool and wire it behind the existing consent gate.
