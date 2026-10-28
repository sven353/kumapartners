# The Round by Kuma Partners

Since 28 Oct 2026 this repo is the member ledger only, served at [ledger.kuma.partners](https://ledger.kuma.partners/). The public page moved to [www.kuma.partners/the-round/](https://www.kuma.partners/the-round/) for SEO and GEO and now lives in the public repo `sven353/kumapartners`, folder `the-round/`.

Facilitated by Dr. Sven Mulfinger and operated by [Kuma Partners](https://www.kuma.partners/).

## 0. Architecture since the move (28 Oct 2026)

| Address | What it is | Code |
|---|---|---|
| `https://www.kuma.partners/the-round/` | Public page, candidate review form `the-round-apply` | `sven353/kumapartners`, folder `the-round/` (public repo) |
| `https://ledger.kuma.partners/` | Member ledger: Netlify Identity, Blobs, `netlify/functions/ledger.js`, form `member-ledger-log` | this repo (private), same Netlify project as before |
| `https://theround.kuma.partners/*` | Domain alias on this Netlify project. 301 to `www.kuma.partners/the-round/:splat`; `/ledger` and `/ledger.html` 301 to the ledger | `_redirects` here |

- The ledger root serves `ledger.html` (forced 200 rewrite), so Identity invite and reset links, which point at the site root of the primary domain, open straight into the widget. Old links that still land on the public page with a token are forwarded back by its `site.js`.
- The ledger pages carry noindex (meta tag in `ledger.html` and `tools/`, plus `X-Robots-Tag` on `/ledger`, `/ledger.html`, `/ledger-data/*` and `/tools/*`). There is deliberately no site-wide noindex: Netlify would add it to the 301s from the old subdomain as well.
- `index.html`, `site.js` and `assets/photos/` were removed from this repo. Sections 1 to 5 below still describe them as they were at the move and stay as the reference for the page in its new folder. Edit the public page in `sven353/kumapartners`, never here.
- Never copy ledger code, functions, `ledger-data/` or `tools/` into the public repo.

---

## 1. Repository structure

```text
.
├── README.md                         This file: architecture, inventory, changelog
├── _headers                          Netlify security and cache headers
├── _redirects                        Keeps /netlify/* (function source) off the public website
├── favicon.ico                       Root multi-resolution favicon (16, 32, 48 px)
├── index.html                        Full page markup, metadata and JSON-LD schema
├── ledger.html                       Member accountability ledger, self-contained: gateway, dashboard and its script inline (noindex)
├── styles.css                        Design system, layout, components, motion (section 19: ledger)
├── site.js                           Landing page behaviour (see section 4)
├── ledger-data/
│   └── barcelona-01.json             Encrypted cohort ledger (AES-GCM ciphertext only)
├── package.json                      One dependency for the function: @netlify/blobs (Netlify installs it on deploy)
├── netlify/
│   └── functions/
│       └── ledger.js                 GET: cohort ledger for signed-in roles. POST: facilitator status changes
├── tools/
│   └── ledger-builder.html           Offline facilitator tool: decrypt, edit, re-encrypt (noindex)
└── assets/
    ├── logo-kuma.png                 Kuma Partners wordmark (header and footer)
    ├── logo-icon.png                 Transparent mark, 512 px
    ├── favicon-32x32.png             Browser tab icon
    ├── favicon-16x16.png             Browser tab icon
    ├── apple-touch-icon.png          iOS home-screen icon, 180 px on white
    ├── images/og-share-1200x630.png  Social sharing card, 1200 × 630 (index and ledger)
    ├── fonts/
    │   ├── montserrat-latin-600-normal.woff2
    │   ├── montserrat-latin-700-normal.woff2
    │   ├── montserrat-latin-800-normal.woff2
    │   ├── montserrat-latin-400-italic.woff2
    │   ├── lato-latin-300-normal.woff2
    │   ├── lato-latin-400-normal.woff2
    │   ├── lato-latin-400-italic.woff2
    │   ├── lato-latin-700-normal.woff2
    │   ├── OFL-montserrat.txt        Open Font Licence
    │   └── OFL-lato.txt              Open Font Licence
    └── photos/                       Each as WebP + JPEG fallback
        ├── cadence-peer-board-group.webp / .jpg   Cadence card 1 (16:9)
        ├── cadence-sparring-office.webp / .jpg     Cadence card 2 (16:9)
        ├── hero-peer-board-wide.webp / .jpg      Hero background, desktop (1983 x 793)
        ├── hero-peer-board-mobile.webp / .jpg    Hero background, phones (840 x 793)
        ├── masia-catalunya-immersion.webp / .jpg   Cadence card 3 (16:9)
        └── cadence-offsite-costa-brava.webp / .jpg Cadence card 4 (16:9)
```

Photo source files and their web names:

| Source file | Web file | Caption |
|---|---|---|
| The Round monthly meeting (group photo) | cadence-peer-board-group | Card 1: cropped to 16:9 (1024 x 576), top offset 50 px, bottom nameplates cropped out, same size and markup as the sparring card |
| Sparring photo (office, street view) | cadence-sparring-office | Card 2: cropped to 16:9 (1024 x 576) around Sven and his conversation partner |
| Sharpened Catalonia retreat image supplied 10 Oct 2026 (1024 × 616) | masia-catalunya-immersion | Card 3: cropped to exact 16:9 at native resolution (1024 × 576), saved at high quality (JPEG q93 without chroma subsampling, WebP q92). Renamed from `cadence-immersion-patio` so browsers and the Netlify CDN fetch it fresh |
| Offsite meeting Costa Brava.jpeg | cadence-offsite-costa-brava | Card 4: cropped to 16:9 at 35% from the top, `object-position: center 35%` |

Source files were renamed (no spaces or accents) and resized for the web (1024 px wide).


### Cadence card media rationale

The four in-person touchpoints (Board, Sparring, Immersion, Offsite) sit in a symmetrical 2 × 2 grid, each with a flush 16:9 photo, a mono meta line (`Monthly // half day`), title, one paragraph and a mono footer tag. Card 05, the Member Accountability Ledger, spans the full width underneath on the navy radial: copy, Charter quote and the two actions (Charter drawer, Member Sign-In) on the left, a terminal-style panel with two anonymised entries on the right. The terminal footer labels the entries as illustrative; they are static, not live data.

The former three-photo proof ribbon (`#environment`) was removed on 10 Oct 2026 as redundant with the card photos. Its three image pairs were deleted from `assets/photos/` and the "Environment" link left the header and footer navigation.

---

## 2. Design system

Mirrors the design language of kuma.partners. All values live as CSS custom properties in `:root` at the top of `styles.css`.

### Colour tokens

Design direction since 10 Oct 2026: Swiss print monograph meets private executive intelligence brief. Typography, whitespace and 1 px hairlines carry the structure. No drop shadows on cards, no floating pills.

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0B1523` (11, 21, 35) | Headings, primary buttons, hero, terms, ledger card |
| `--navy-hover` | `#16283D` | Primary button hover |
| `--teal` | `#1D6F8A` (29, 111, 138) | Accents, eyebrow bar, mono tags on light surfaces |
| `--teal-on-dark` | `#8DB7C5` | Subhead, mono tags and telemetry on navy |
| `--paper` | `#FDFDFC` | Warm canvas paper, default light surface (`.bg-white`, body) |
| `--cream` | `#F8F9FA` | Soft architectural cream, alternate sections |
| `--white` | `#FFFFFF` | Cards, drawers, modals, inputs |
| `--ink` | `#111827` | Body text |
| `--muted` | `#5A6D7C` | Slate, secondary text |
| `--hairline-color` | `rgba(0,0,0,.08)` | Every rule on light surfaces |
| `--hairline-dark` | `rgba(255,255,255,.12)` | Every rule on navy |
| `--card-border` | `rgba(0,0,0,.07)` | Cadence card outline |

### Surfaces

| Token | Value |
|---|---|
| `--navy-radial` | `radial-gradient(120% 85% at 50% 0%, #16283D 0%, #0B1523 100%)`, used by `.bg-navy` (hero, terms) and the ledger card |
| `--card-bg` | `#FFFFFF`, flat |
| `--card-sheen`, `--card-lift`, `--navy-focal-shadow` | `none` (kept as tokens so older selectors resolve cleanly) |

Card hover: no lift. The outline darkens to navy at 24% and the photo zooms 3% with a slight contrast lift, 0.4 s `cubic-bezier(.16,1,.3,1)`.

### Typography

| Role | Family | Weights |
|---|---|---|
| Headings, card titles | Montserrat | 700, letter-spacing -0.02em to -0.012em, `text-wrap: balance` |
| Hero h1 | Montserrat 700 | `clamp(2.4rem, 4.8vw, 4.2rem)`, max 22ch so it sets on two lines |
| Body, navigation, forms | Lato | 400 and 700 (line-height 1.65) |
| Hero subhead | Montserrat italic, teal-on-dark | 400 |
| Charter quote | Lato italic | 400 |
| Telemetry, status tags, frequencies, micro-specs, term labels, captions, scarcity note (`--font-mono`) | `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace` | system fonts, nothing downloaded |

Fonts are served from `assets/fonts/` via `@font-face`. Google Fonts is deliberately not used, because loading it sends every visitor's IP address to Google, which German courts have treated as a GDPR breach.

### Shape and rhythm

- Every border is `1px solid var(--hairline-color)`. Never 2 px or 3 px.
- Radii: `--radius-xs`, `--radius-sm` and `--radius-md` are all 2 px (buttons, inputs, tags); `--radius-lg` 4 px (modals). Understated edge softening for the cadence layer: `--radius-card` 8 px (touchpoint cards; photos clip at 7 px, one pixel inside the border), `--radius-anchor` 10 px (ledger anchor, 8 px below 768 px), `--radius-inset` 6 px (terminal). No capsule or bubble corners anywhere. Bottom sheets on mobile use 16 px top corners. `--radius-pill` remains only for the FAQ plus icon.
- Elevation: only the cadence cards (`--shadow-ambient` 0 4px 16px at 4%, lifting 2 px on hover to 0 8px 24px at 7%) and the ledger anchor (`--shadow-anchor`) carry soft ambient shadows. Everything else, the terminal included, stays shadow-free.
- De-boxed sections: fact strip, Facilitation Engine pipeline, fit compact and guarantee strip, terms spec sheet. They use hairline rules (top, bottom and column dividers) instead of bordered cards.
- Container: 1120 px max width, 32 px side padding (24 px at 960 px and below, 1.25rem / 20 px below 768 px).
- Section padding: 96 px desktop, 80 px tablet, 64 px mobile.
- Eyebrows: Lato 700, 0.78rem, uppercase, 0.12em tracking, navy, with a 28 × 3 px teal bar before.

### Motion

- `.reveal-on-scroll`: fades in and rises 24 px, 650 ms `cubic-bezier(.16,1,.3,1)` (the single easing token `--ease-reveal`). No animation libraries.
- Buttons: sharp 2 px corners, 0.25 s colour change and a 1 px press on `:active`.
- `.reveal-stagger`: children enter at 0, 90, 180, 270 ms (fifth and later at 360 ms).
- Collapsibles (mobile menu, FAQ answers, "view all" FAQ) animate `grid-template-rows` from `0fr` to `1fr`.
- Hidden starting states only apply once `site.js` adds `class="js"` to `<html>`, so the page is fully readable without JavaScript.
- `prefers-reduced-motion: reduce` switches all motion off.

### Breakpoints

| Width | Change |
|---|---|
| 1100 px and below | Navigation collapses into the drop-down panel |
| 1024 px and below | Facilitation pipeline and terms go to 2 columns (the pipeline line stays continuous per row) |
| 960 px and below | Ledger anchor stacks (terminal under the copy) |
| 860 px and below | FAQ goes to one column |
| 640 px and below | Older small-screen rules (typography, footer, dashboard metrics); most layout is now overridden by the block below |
| 767 px and below | Mobile layer (section 17b of `styles.css`): hero stacked with full-width CTA, fact strip in one column, cadence touchpoints and facilitation pipeline become swipe carousels, fit columns stack, terminal statuses stack, terms stay 2 × 2, drawers and portal become bottom sheets |

### Mobile layer (below 768 px)

All mobile layout lives in one `@media (max-width: 767px)` block, section 17b, placed after the older responsive rules so it wins without `!important`. Nothing in it applies at 768 px or wider.

- Hero: `92px 0 40px` padding plus the 1.25rem gutter; h1 `clamp(1.85rem, 7.5vw, 2.25rem)`, 12 px below; subhead 1.02rem / 1.5, 22 px below; CTA group stacked with a 12 px gap, primary button full width at 48 px minimum height, secondary link centred with a 44 px tap target.
- Fact strip: one column of compact cards, icon on the left.
- Cadence: `.cadence-touchpoints-grid` turns into a horizontal flex track with `scroll-snap-type: x mandatory`, hidden scrollbar and edge-to-edge bleed. Each card is `85vw` up to 340 px, snapped to centre. A `.mobile-swipe-hint` line sits under the track (hidden on desktop) and fades after the first swipe.
- Card 05 ledger anchor: copy and terminal stack; each terminal status sits on its own row above the sector line.
- Facilitation: header stacks; the 4-step pipeline becomes a snap carousel (78vw steps, max 300 px) with the connecting line kept continuous.
- Standards of fit: the two columns and the guarantee strip stack; the vertical divider becomes a horizontal one.
- Terms: 2 × 2 spec sheet with unbroken hairline dividers (gap 0, 10 px cell padding), values 1.1rem / 1.2, detail text 0.78rem / 1.35.
- Overlays: the Candidate Review drawer and the Charter drawer slide up from the bottom (`sheetIn` keyframe), 92dvh tall with a 92vh fallback, 16 px top radius, bottom padding includes `env(safe-area-inset-bottom)`. The overlays still toggle via the `hidden` attribute, so no JavaScript changed for this.
- Touch: close buttons 44 × 44 px; form fields 16 px so iOS Safari does not zoom on focus.
- Copy: "Barcelona&nbsp;01" and every trailing "&nbsp;→" use a non-breaking space so a narrow screen never leaves "01" or the arrow alone on a line.

---

## 3. Page sections

Section order and background cadence:

| # | Section | Anchor | Background |
|---|---|---|---|
| A | Header and navigation: The Cadence, Facilitation, Standards of Fit, FAQ | | Translucent cream with blur |
| B | Hero: "Built for those who carry the ultimate call." Subhead positions The Round as a confidential board of vetted peers for Founders, CEOs and Managing Directors bearing final P&L responsibility | | Navy radial |
| B2 | Fact strip "at a glance": six floating kuma cards pulled up 64 px over the bottom of the hero, each with a teal line icon in a 44 px tile, a mono index tag top right (`01 // Cohort`, `02 // Board`, `03 // Sparring`, `04 // Retreats`, `05 // Confidentiality`, `06 // Governance`), a Montserrat title and a slate line. 3 × 2 on desktop, 2 × 3 from 768 to 1023 px, compact icon rows below 768 px (no overlap). Styles in section 17d | `#glance` | Cream |
| C | Operating architecture, framed as one annual seat ("One annual seat. Five connected touchpoints."): symmetrical 2 × 2 grid of the four in-person touchpoints, then Card 05, the Member Accountability Ledger, as a full-width navy anchor. Every touchpoint carries an `Included //` meta tag. Closes with the "Complete 12-Month Inclusions" summary (10 boards, 10 sparring sessions, 1 immersion, 1 sanctuary, continuous ledger; travel and lodging at cost) | `#cadence` | Paper |
| E | Facilitation Engine: split header (copy left, "Half a day" metric right) above a connected 4-step pipeline: one continuous hairline with a teal node per step, standardised title height, mono outcome tags | `#facilitation` | Cream |
| F | Standards of fit: bilateral governance compact, `Admission mandate` (Who sits at the table) against `Unconditional exclusion` (Who is kept out), each with a lead statement and three criteria with bold lead-in anchors (Sovereign responsibility, Radical candor, Total presence / Direct competitors, Commercial pitching, Passive observers), separated by a vertical hairline; below it a two-item guarantee strip (Cohort consent, Discretion compact) | `#fit` | Paper |
| G | Membership terms and governance | `#terms` | Navy radial |
| H | FAQ (10 questions) | `#faq` | White |
| I | Footer | | Cream |

Overlays: the Candidate Review drawer and The Round Charter drawer (both slide in from the right and share the `.drawer` styles). The Charter drawer lists all 11 points of Schedule 2 and ends with a Candidate Review button that hands over to the application drawer. It also opens from the footer and from the `#charter` link. Every "Member sign in" link (header, mobile menu, ledger card, footer) goes to `ledger.html`.

Call to action wording: "Request Candidate Review · Barcelona 01" in the hero, mobile menu and terms section; "Candidate Review" in the desktop header; "Request Candidate Review" in the footer. The drawer eyebrow reads "Barcelona 01 · Candidate admission review" and the submit button "Submit for Candidate Review". A privacy line under the button says candidate information is sent over an encrypted connection, treated under Chatham House discretion and never shared.

### Content sourced from The Round Membership Agreement, Version 1.1

| Item | Where it appears |
|---|---|
| Monthly half-day board (including a private working lunch), hosted in rotation at members' private headquarters in the Barcelona area, 8 to 12 members. FAQ 5 adds that the host provides the meeting room, breakfast and lunch | Fact strip cell 02, cadence card 1, Facilitation Engine stat block, FAQ 1, 2, 5 |
| Monthly 55-minute 1:1 with Dr. Sven Mulfinger, 90-minute pods with 1 to 2 peers | Fact strip, cadence card 2, FAQ 1 |
| 24-Hour Immersion and 3 to 4 day Offsite, each replacing that month's board, programme and facilitation included | Cadence cards 3 and 4, terms, FAQ 6 |
| Ledger data deleted within 30 days of departure | Charter drawer privacy note, FAQ 7 |
| The Round Charter, Schedule 2 (11 points) | Charter drawer, quote in the Card 05 ledger anchor |
| Competitor exclusivity, non-solicitation, Chatham House beyond membership, AI only for anonymised prep | Fact strip, fit compact and guarantee strip, FAQ 3, 7, 8 |
| Membership fee not published (Option B): a single 12-month membership seat, invoiced in two semi-annual instalments in advance; full fee schedule disclosed during candidate review | Terms card 1, FAQ 9, JSON-LD offer and price range |
| €1,000 admission and intake fee (diagnostic framing and onboarding), permanently waived for Founding Members | Terms card 2, FAQ 9, JSON-LD FAQ 9 |
| Membership year renews annually; 30 days' written notice before renewal | Terms card 3, FAQ 9 |
| Barcelona 01 strictly capped at 12 seats, admission governed by cohort consent | Fact strip, terms CTA note, application drawer |
| Retreat facilitation included in the membership fee, travel and lodging at cost | Terms card 4, FAQ 6, inclusions summary |
| More than three missed sessions per year triggers a review | FAQ 10 |

Any change to these terms must be made in the visible copy and in the JSON-LD block (section 5).

Editorial standard ("Content-First Editorial Reduction", 10 Oct 2026): the page reads as a private board memorandum, not a sales presentation. Cadence cards carry one short paragraph plus a single mono footer tag (`.cadence-footer-tag`), no bullet lists. Fit criteria open with a bold lead-in anchor and colon (`.fit-specs li strong`) for fast scanning; this is the one deliberate exception to the no-bold-label rule, requested on 10 Oct 2026. Casing (since 12 Oct 2026): UK sentence case for every heading, button, link, card title, term value and navigation label; capitals only for the first word, proper nouns (Barcelona, Chatham House Rule, The Round, The Round Charter) and the role titles Founders, CEOs and Managing Directors. Write "and", never "&", in visible headings. Mono metadata tags that should read in sentence case (`.cadence-footer-tag`, `.step-tag`, `.step-category`) have `text-transform:none`; section eyebrows and `.cadence-meta` stay in deliberate mono caps. Admission language is collaborative: cohort consent, never veto rights. The board lunch is always a "private working lunch", never framed as networking or social time. Keep new copy to that density, use UK grammar without the serial comma and never claim data is "encrypted" beyond what is true (the connection is HTTPS).

Commercial model (since 12 Oct 2026): one all-inclusive annual seat, invoiced in two semi-annual instalments, never an à la carte menu. Hero, cadence section, inclusions summary, Terms and FAQ 9 must all say the same thing; the words "retainer" and "6-month cycle" are retired.

Pricing policy (Option B): the membership fee is deliberately kept off the public site, out of the JSON-LD and out of this repository. Only the €1,000 admission fee is published. Do not reintroduce the fee figure in copy, schema or documentation.

---

## 4. Behaviour (`site.js`)

Configuration sits in the `CONFIG` object at the top of the file:

| Key | Purpose |
|---|---|
| `contactEmail` | contact@kuma.partners, used in error messages and mailto links |
| `personalEmailDomains` | Blocked in the application form's work email field |

Modules:

1. Header: shadow on scroll, mobile panel toggle, smooth scrolling with header offset, scroll-spy highlighting.
2. Brand logo fallback: shows the text "Kuma Partners" if `logo-kuma.png` fails to load.
3. Candidate Review drawer: opens from any `[data-open-apply]`, focus trap, Escape and backdrop close, body scroll lock, validation, Netlify AJAX submission, inline success state.
5. Scroll reveal and stagger via IntersectionObserver.
6. FAQ accordion: one answer open at a time; questions 5 to 10 sit in `#faq-extended` and are revealed by the "View all 10 questions" toggle; links like `#faq-q7` open that answer directly.
8. The Round Charter drawer: opens from any `[data-open-charter]`, focus trap, Escape and backdrop close, body scroll lock (kept if another overlay is still open), hands over to the application drawer from its own button.
9. Cookie Preferences: the site runs no tracking or analytics, so the footer link shows a short note. Netlify Identity keeps a sign-in token in the browser of signed-in members only.
10. Cadence swipe hint: adds `is-dismissed` to `[data-swipe-hint]` once the mobile carousel has scrolled 24 px. No effect on desktop, where the hint is hidden.

### Netlify Forms

| Form name | Fields |
|---|---|
| `the-round-apply` | `name`, `email`, `company`, `stage` (labelled "Leadership context"), `inflection_point` (optional, max 600 characters), `privacy_consent`, honeypot `bot-field` |
| `member-ledger-log` (on `ledger.html`) | `member_name`, `member_role` (role and company), `commitment` (max 280 characters), `sparring_partner`, `target_date` (YYYY-MM-DD), `cohort`, `progress` (`not-started`, `50`, `75`, `complete`), `inaction_cost` (max 400 characters), `exposure_eur` (whole euros), honeypot `bot-field` |

Field `name` attributes are the Netlify column names: keep them stable. The `apply-*` values are element IDs used for labels and error messages, not submitted names.

`stage` submits one of these values: `founder-scaling` (Founder / CEO, scaling venture or growth stage), `acquired-company` (Acquisition / searcher, recently bought a company or MBI), `managing-merger` (CEO / MD managing an active merger or integration), `exited-founder` (Exited entrepreneur, active chairman or next venture), `pe-backed` (CEO / MD, PE-backed or mid-market enterprise), `corporate-director` (Managing Director, international group or regional P&L), `family-business` (CEO / principal, family business or succession). Submissions made before 10 Oct 2026 carry the old free-text stage labels.

Netlify detects the form from the static HTML on each deploy, but only if form detection is switched on for the site. On newer Netlify sites it is off by default.

1. Netlify dashboard › the site › Forms (or Site configuration › Forms) › Enable form detection.
2. Trigger a new deploy (Deploys › Trigger deploy › Clear cache and deploy site). Detection only runs during a deploy.
3. Check that both `the-round-apply` and `member-ledger-log` now appear under Forms. (An older `member-ledger-entry` form can be deleted.)
4. Set up email notifications under Forms › Form notifications.

A 404 on submission means the form is not registered: repeat steps 1 and 2. The browser console logs the status code (`[The Round] Form submission failed: 404`).

---

### Member accountability ledger (`ledger.html`, `ledger.js`, `netlify/functions/ledger.js`)

The dashboard opened during each monthly board and 1:1 sparring call.

Access model (official Netlify Identity widget, since 12 Oct 2026):

- Gateway: a single "Member sign in" button calls `netlifyIdentity.open('login')`. Email, password, invitations and password resets all happen inside Netlify's own Identity modal; the page itself never asks for a password. The widget is loaded from `https://identity.netlify.com/v1/netlify-identity-widget.js`.
- Session: the widget's `init` and `login` events open the dashboard; `logout` returns to the gateway. The widget keeps the session in the browser until the member signs out, and the ledger fetches a fresh token (`netlifyIdentity.refresh()`) for every request.
- Invitations and resets: Netlify's emails link to the site root with a one-time token in the URL. `site.js` forwards those links to `ledger.html`, where the widget opens the right step (set password, choose a new password).
- Access rules, applied in the page and enforced again in the function on every request:
  - Facilitator: the email `sven@kuma.partners` or the role `admin`. Checked first, before any cohort logic, so the facilitator never needs a cohort role and can never see a cohort error. Opens on Barcelona cohort 01 with the admin strip, every cohort and the status controls. Extra facilitator emails can go in the optional environment variable `LEDGER_ADMINS` (comma separated; replaces the default, so include `sven@kuma.partners`).
  - Cohort roles: any role that names a hub gives that cohort. `barcelona-01`, `Barcelona` and `Barcelona cohort 01` all work. Several roles give several cohorts, and the top bar picker then lists only those.
  - Every other invited, confirmed account (`member` or no role at all): Barcelona cohort 01. Nobody is locked out.
  - `user_metadata.cohort` is read as a preferred starting hub only. It never grants access, because members can edit their own user_metadata; the function ignores it.
- Members with one cohort see a static cohort indicator; the admin sees an open dropdown in the top bar and in the admin strip.
- Data: the browser asks `/.netlify/functions/ledger?cohort=...` with the Identity token. The function checks access, then decrypts `ledger-data/<cohort>.json` with `LEDGER_PASSPHRASE` from the Netlify environment. The passphrase never reaches the browser.
- Facilitator status changes: in admin mode every status becomes a dropdown (`Active`, `In review`, `Executed`). A change is a POST to the same function, which re-checks facilitator rights and saves it, encrypted with the same passphrase, in the Netlify Blobs store `the-round-ledger` (key `status-<cohort>`). Every member sees it at once. A status change wins over the published file until a newer file is published (the builder stamps `updatedAt`).

Dashboard: top utility bar (cohort selector, "Chatham House Rule enforced", signed-in email, sign out); cohort header with next board date; metrics (active commitments, execution rate, due in the next 14 days); the commitments table with member and role, commitment, sparring partner, target review date with countdown badge ("Due in 9d") and status badge (`Active` teal, `In review` amber, `Executed` grey); filter pills All, Active, In review, Executed; an empty state for cohorts without a published file.

Two views (since 20 Oct 2026): a segmented switch under the cohort title flips between "Hard calls & accountability" (default: the metrics, commitments table and hard call logger described here) and "Asks & opportunities", the cohort exchange. Both come from the same request, so switching is instant with no reload. The chosen view is remembered for the tab, and `ledger.html#asks` opens the exchange directly. Each tab shows a count: open commitments and asks awaiting help.

Asks & opportunities, the cohort exchange (since 20 Oct 2026): a living register where members post what they need and peers answer on the record. Asks stay visible until a peer resolves them or the facilitator archives them.

- Metrics: active asks, awaiting help, answered or connected, peer responses. The tab count shows asks awaiting help.
- Each ask is a card, newest first: who posted it (name and role), when, the category pill (`Contact`, `Question`, `Opportunity`, `Resource`), the ask and its status (`Open`, `Answered`, `Connected`, `Archived`). Filters: All active, Open, Answered, Connected, Archived.
- Responses: under each ask, "Answer or offer a connection" (or "Add your response" once answered) opens an inline box with name and role, type (Answer or advice, Connection or lead) and the response. Each response shows the respondent, role, date and type. The first answer moves an ask from Open to Answered; a connection or lead moves it to Connected. More members can keep adding responses. Archived asks take no new responses.
- Posting an ask: the intake card under the register (name and role, category, the ask). Name and role are remembered for the tab, so responses are prefilled.
- Facilitator: a status picker on every card (any of the four statuses), Edit and Delete on the ask (Delete also removes its responses; archiving keeps the record), and Edit and Remove on every response. Editing a response's text keeps any status set by hand; removing a response or changing its type recalculates the status.
- Limits: 10 open asks per member, 300 asks per cohort, 50 responses per ask; asks up to 400 characters, responses up to 600.

InfoVault (since 20 Oct 2026): the third tab, the cohort's curated archive of books, podcasts, frameworks, links and tools recommended around the table.

- Metrics: total artifacts, essential reads (books), podcasts and talks, frameworks and tools. The tab count shows total artifacts.
- Register: cards, newest first, each with the type pill (`Book`, `Podcast`, `Framework`, `Article / URL`, `Tool`), the title (a link opening in a new tab when a URL is given, with the site name shown), author or source, the signal (why it matters) and "Recommended by" with name, role and date. Type filters and a search box (title, source, signal, recommender).
- Intake: "Log an artifact to InfoVault" with category pills, title, author or source, an optional URL, name and role (remembered for the tab) and the signal. Button "Deposit to InfoVault".
- Facilitator: "Add artifact" in the strip, Edit and Delete on every card (drawer for category, title, URL, source, signal and recommender).
- Safety: only http and https links are stored (a bare "hbr.org/..." gets https:// added; javascript: and data: links are refused). The same link cannot be deposited twice. Links open with rel="noopener noreferrer". Limit 500 artifacts per cohort.
- Storage: `data.infoVault` in the cohort blob. Member deposits use the same write-once inbox as asks and responses (inbox item kind "vault"), so nothing a member deposits can be overwritten by a facilitator edit, and the facilitator's next save absorbs them. Deleted artifacts are remembered by id in `data.askTombstones`. Actions: `create_vault_item` (members and facilitator, via the inbox), `update_vault_item` (facilitator; without an id it adds directly) and `delete_vault_item` (facilitator).
- `ledger.html#vault` opens the vault directly. On phones the switch shows short labels (Hard calls, Asks, InfoVault); screen readers still hear the full names.

How the exchange is stored: each ask or response a member posts is written once to its own encrypted blob (`inbox-<cohort>-<id>`, same passphrase), never to the cohort blob, so members posting while the facilitator edits can never overwrite each other. Every read merges the inbox in; the facilitator's next save absorbs it into the cohort blob (`data.asks`, responses inside each ask) and removes those inbox blobs. A response to an ask that storage cannot read yet is accepted and attaches as soon as the ask is readable. Deleted asks and removed responses are remembered by id (`data.askTombstones`) so a slow storage read cannot bring one back. The exchange is not part of the published file: publishing a newer file with the builder keeps it. A new ask or response can take up to a minute to appear for other members; the poster sees it at once.

Session logger: the Netlify form `member-ledger-log` (below). Logged entries show under "Logged in this session" with "Pending facilitator review"; they reach the ledger when the facilitator publishes the next file.

Data format (inside the encryption): `{ cohort, name, sample, nextSession, updated, updatedAt, entries: [{ id, member, context, commitment, partner, due, status, logged }] }`, with `status` one of `active`, `in-review`, `executed` and dates as `YYYY-MM-DD`. `id` is optional; the function derives a stable one from member, commitment and due date.

One-time setup in Netlify:

1. Project configuration › Identity › Enable Identity. Registration preferences › Invite only.
2. Environment variables › `LEDGER_PASSPHRASE` with the passphrase used to encrypt `ledger-data/`. Its scope must include Functions, and it only takes effect after the next deploy. Keep it in a password manager. Without it the ledger still opens, but shows starter entries and a setup notice to the facilitator, and status changes are refused.
3. Deploy. Netlify installs `@netlify/blobs` from `package.json` and picks up `netlify/functions/ledger.js` automatically. No build command is needed; leave the publish directory as before.
4. Identity › Invite users. Members in Barcelona cohort 01 need no role. For another hub, add its cohort role (for example `london-01`). Your own account is recognised by email and needs no role.
5. Forms: confirm `member-ledger-log` appears after the deploy and switch on its notifications.
6. Optional (Pro plan): customise the invitation and reset emails under Identity › Emails.

Member view (since 20 Oct 2026): the facilitator strip has a switch, Facilitator or Member view. Member view uses the ledger exactly as a member would: the page sends the header `X-Ledger-View: member` and the function then applies member rights (member cohorts, member actions only; facilitator actions are refused with 403). The header is ignored for non-facilitators, so it can only remove rights. The choice is kept for the tab; the strip turns amber in member view. Anything posted in member view is real.

Inviting members (invite only, no self-registration):

1. Netlify › theround project › Identity. If Identity is not enabled: Project configuration › Identity › Enable Identity, then Registration preferences › Invite only, external providers off.
2. Identity › Invite users › paste the addresses (one per line) › Send.
3. Each person receives "You've been invited to join theround.kuma.partners" from no-reply@netlify.com (custom templates need the Pro plan). The link opens the site, `site.js` forwards it to `ledger.html`, Netlify's modal asks them to choose a password, and they are signed in to Barcelona cohort 01.
4. Afterwards they sign in at theround.kuma.partners/ledger.html with email and password; "Forgot password?" sends a reset link.
5. Other hubs: add the cohort as a role on the user in Identity (for example `london-01`). Facilitators: role `admin`, or list the email in `LEDGER_ADMINS`.

Do not open registration: every confirmed account without a role gets Barcelona cohort 01, so open sign-up would let anyone in.

Editing on the site (since 13 Oct 2026): signed in as the facilitator, use "Add commitment" in the admin strip, or Edit and Delete on any row. Changes save to Netlify Blobs at once and every member sees them on their next load. The published file in `ledger-data/` is only the starting point; publishing a newer file with the builder replaces the live copy. Since 20 Oct 2026 the builder is no longer linked from the ledger header: open `tools/ledger-builder.html` directly if you ever need it (for example to rotate the passphrase). Editing on the site is the normal route.

Facilitator routine after each board (optional now that editing works on the site):

1. In facilitator mode, set statuses directly in the table as you review commitments.
2. Open `tools/ledger-builder.html` (no longer linked from the header) and load the current file.
3. Add the new submissions from Netlify Forms › `member-ledger-log`, update `nextSession`, set `"sample": false` once real entries go in.
4. Encrypt and download with `LEDGER_PASSPHRASE`, replace the file in `ledger-data/`, commit and push. A new cohort opens by publishing its first file under that name.
5. Delete the processed submissions in Netlify Forms.

To rotate the passphrase: set the new value in `LEDGER_PASSPHRASE` and redeploy, then open each cohort once as the facilitator and use "Unlock ledger" with the old value (or set `LEDGER_PASSPHRASE_PREVIOUS` to the old value for one deploy). Older method: open each cohort in the builder, encrypt with the new passphrase, update `LEDGER_PASSPHRASE` in Netlify and push the files. Status changes saved in Blobs under the old passphrase stop applying, so publish from the console first.

## 5. SEO and GEO

- Title, description, canonical, Open Graph and Twitter card tags in `<head>`, previewing `assets/images/og-share-1200x630.png` (absolute URL). `ledger.html` carries its own title, description and card tags but stays `noindex, nofollow`.
- JSON-LD `@graph` with `Organization` (Kuma Partners), `ProfessionalService` (The Round, with founder and address; the offer carries currency and billing period but no price, and `priceRange` reads "Annual Executive Membership · Disclosed on Review", `billingDuration` P1Y) and `FAQPage` (all 10 questions).
- The FAQPage answers use exactly the same wording as the visible answers, as Google requires. All 10 answers are in the static HTML so crawlers and AI tools can read them.
- FAQ 4 describes traditional CEO peer networks generically. No third-party network is named anywhere on the site or in this repository.

---

## 6. Security notes

- The member ledger is encrypted at rest in `ledger-data/` and in Netlify Blobs (AES-GCM, key derived with PBKDF2), on top of Netlify's own encryption at rest. It is decrypted only inside the Netlify Function, and only for a signed-in Identity account allowed into that cohort. Only the facilitator can change statuses; the function re-checks this on every request. Never commit the passphrase or an unencrypted ledger JSON; the builder only ever downloads the encrypted file.
- The passphrase lives only in the Netlify environment variable `LEDGER_PASSPHRASE` (24 characters or more; the builder enforces this). Rotate it if it may have leaked.
- When a member leaves: delete the user in Identity (removing a cohort role alone would drop them back to Barcelona cohort 01). Their access ends at the next token refresh (within an hour) and immediately once they sign out.
- Every member of a cohort can read that whole cohort ledger, by design. Keep entries anonymised by role and sector anyway, in line with the Charter.
- The gateway copy promises encryption at rest, invitation-only access tied to a verified email and sessions that end on sign-out or tab close. Keep those statements true if the setup changes.
- Logger submissions are stored in Netlify Forms in readable form until you delete them. Process and delete them after each board, and within 30 days of a member leaving (Charter privacy note).
- Do not put minutes PDFs in this repository: every file here is public.
- `ledger.html`, `/ledger-data/*` and `/tools/*` send `X-Robots-Tag: noindex, nofollow`; ledger data is served `no-store` so a newly published file shows at once.
- `_headers` sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS and Permissions-Policy, plus a 7-day cache on `/assets/*`.

---

## 7. Deployment

1. Unzip over your local copy of the repository. Unzipping does not delete files, so remove any file that no longer appears in the structure above. Current list to delete: `ledger.js` (now inline in `ledger.html`), the old `app.js`, `assets/photos/cadence-sanctuary-table.*` and, since 10 Oct 2026, `assets/photos/round-deliberation-catalonia.*`, `round-terrace-immersion.*`, `round-alpine-sanctuary.*` and `cadence-immersion-patio.*`.

   Caching: `_headers` caches everything under `/assets/` for 7 days. When an image changes, give it a new file name (as done for `masia-catalunya-immersion`), otherwise returning visitors keep seeing the old one for up to a week.
2. Commit and push:

   ```bash
   git add -A
   git commit -m "Describe the change"
   git push origin main
   ```

3. Netlify settings: build command empty, publish directory `.` (root).
4. Custom domain `theround.kuma.partners` with HTTPS enforced.
5. After deploy, check: the application form arrives in Netlify Forms, a test member invited through Identity can set a password and open their cohort in `ledger.html`, a test entry from "Log commitment" arrives under `member-ledger-entry`, and the link preview renders (for example with the LinkedIn Post Inspector).

---

## 8. Maintenance protocol

- Reuse the existing CSS custom properties. Do not introduce new colours, radii or border widths.
- Keep every border at 1 px.
- Keep the visible copy and the JSON-LD block in sync for any change to terms, locations, pricing or FAQ wording.
- Update this README with every change to code, design tokens, sections, legal terms, file paths or assets, and add an entry to the changelog below.

---

## 9. Open items

- Confirm usage rights for the Card 3 image (`masia-catalunya-immersion`). If it was AI-generated or AI-enhanced rather than photographed at the actual retreat venue, decide whether the card should say so or use a real photo of the venue.
- Confirm that everyone recognisable in `cadence-offsite-costa-brava` has agreed to appear on the site.
- Confirm that everyone recognisable in `cadence-peer-board-group` has agreed to appear on the site.
- Set `nextSession` for Barcelona cohort 01 in the builder so the header shows the next board date.
- Complete the Netlify setup in section 4 (Identity, invite only, `LEDGER_PASSPHRASE`, invitations and roles) before the first board.
- Consider Netlify Pro for custom invitation and reset emails in the Kuma Partners voice.
- Enable Netlify form notifications for `member-ledger-log` so new commitments reach the facilitator.
- Give every member outside Barcelona their cohort role before their cohort starts; without one they land in Barcelona cohort 01.

---

## 10. Changelog

All dates 2026.

| Date | Change |
|---|---|
| 14 Oct | New favicon: The Round monogram (white R in a broken circle on deep slate). New files `favicon.ico` (16, 32, 48 px), `assets/the-round-icon-16.png`, `-32.png`, `-48.png`, `-192.png`, `-512.png` and `assets/the-round-apple-touch.png` (180 px). `index.html`, `ledger.html` and `tools/ledger-builder.html` share one icon block with absolute paths and `?v=2` so browsers and the CDN fetch the new icon. The old `assets/favicon-16x16.png`, `favicon-32x32.png` and `apple-touch-icon.png` are no longer referenced and can be deleted; `assets/logo-icon.png` stays (JSON-LD logo). Build 2026-10-14.5. |
| 15 Oct | New photo for the first cadence card (The executive peer board): `assets/photos/cadence-peer-board-listening.jpg` and `.webp`, 1024 x 576, cropped to 16:9 from the 1256 x 848 original. Same dimensions, `<picture>` markup and `.cadence-media` styling as the Strategic sparring card, so geometry, 8px radius and object-fit match. New alt text: "Dr. Sven Mulfinger facilitating an executive peer board session in Barcelona". The old `cadence-peer-board.jpg` and `.webp` are no longer referenced and can be deleted. |
| 16 Oct | Social sharing cards. New image `assets/images/og-share-1200x630.png` (1200 × 630, obsidian background, R monogram, headline "Where Founders and CEOs Pressure-Test Their Hard Calls" and subline "Barcelona executive peer board", all inside the central 1000 × 550 safe zone). `index.html` and `ledger.html` get new titles, descriptions and a full Open Graph and Twitter block with absolute image URLs, `og:image:secure_url`, type, size and alt text. JSON-LD `image` points to the new card. `assets/og-image.jpg` is no longer referenced and can be deleted. |
| 18 Oct | Peer board card photo corrected: the first cadence card (The executive peer board) now shows the real group session, `assets/photos/cadence-peer-board-group.jpg` and `.webp` (1024 x 576, 16:9 crop of the 1024 x 768 original, nameplate row cropped out). Alt text unchanged. `cadence-peer-board-listening.*` and the older `cadence-peer-board.*` are no longer referenced and can be deleted. |
| 20 Oct | Ledger split into two views with a segmented switch: Hard calls & accountability (unchanged, logger heading now "Log a hard call") and Asks & opportunities (new session agenda with its own metrics, register, status toggle, facilitator drawer, Clear addressed and a three-field member intake). `netlify/functions/ledger.js` gains `add_ask` (members, own cohort only) and the facilitator actions `save_ask`, `update_ask_status`, `delete_ask` and `clear_addressed`; member posts go to write-once inbox blobs that the facilitator's next save absorbs, so concurrent edits cannot overwrite each other. A member's `base` is ignored server-side. Build 2026-10-20.1. |
| 20 Oct | Ledger header refined: one cohort picker (top bar; the duplicate in the facilitator strip is gone), Chatham House Rule as quiet status text, email and sign out grouped, all controls 36 px. Facilitator strip is a single slim row: Facilitator mode badge, one-line hint, Add commitment / Add ask on the right. Removed the Publish ledger update and Netlify Forms and Identity links, plus the builder hand-off code. `tools/ledger-builder.html` stays in the repo, unlinked. |
| 20 Oct | Asks & opportunities rebuilt as the cohort exchange: ask cards (newest first) with peer responses on the record, an inline response box (answer or connection), statuses Open, Answered, Connected and Archived that follow the responses, new metrics and filters, and full facilitator moderation (status picker, edit and delete asks, edit and remove responses in a drawer). `netlify/functions/ledger.js` gains `add_reply` (members) plus `save_reply` and `delete_reply` (facilitator); responses use the same write-once inbox as asks. The "Clear addressed" control is gone: archive instead, which keeps the record. Build 2026-10-20.2. |
| 20 Oct | InfoVault added as the third ledger tab: curated archive with its own metrics, card register with type filters and search, member intake ("Deposit to InfoVault") and facilitator add, edit and delete. Links are limited to http and https, duplicates are refused and member deposits use the write-once inbox. View switch now has three tabs with short labels on phones. Error messages no longer show technical codes when a plain-language message exists. Build 2026-10-20.3. |
| 20 Oct | Ledger design refinement: finer lines (true 0.5px hairlines on high-density screens in Safari; lighter line colours everywhere, since Chrome rounds half pixels up), 2px accent bars, softer two-layer card shadows. Scroll reveal: cards, rows and metric cards ease in once as they enter the viewport (never replayed on save or filter; a scroll sweep catches fast jumps; off with reduced motion and in print). Switching views fades the new panel in. Build 2026-10-20.4. |
| 20 Oct | Fix: depositing to InfoVault (and posting asks or responses) with a line break showed "The server did not confirm" and kept the form filled, although the item was saved. The page now compares text the way the server stores it, and line breaks in asks, responses and signals are kept and shown. Permissions: members can edit their own asks, responses and artifacts (checked server-side against the poster's email; edits travel through the inbox and the facilitator's next save absorbs them, with edit ids tombstoned so they never replay). Only the facilitator can delete, remove, change statuses or edit anyone else's post; hard calls stay facilitator only. Build 2026-10-20.5. |
| 20 Oct | Copy and polish: the name fields on the ask intake, the response box and the InfoVault intake ask for "Your name" only (no role). Ask intake title now "Post an ask to the exchange board". Tab count badges are centred and wider (30 x 22 px, room for three digits). Build 2026-10-20.6. |
| 20 Oct | Ledger on phones (mobile-only CSS, desktop pixel-identical): 44 px touch targets for every button, pill, select and text action; 16 px text in all fields and selects so iPhones no longer zoom on tap; filter pills as one swipeable row; cohort picker and sign out on one row down to 320 px; facilitator controls on ask cards in a tidy grid; full-width editor drawer with save always reachable; tighter tabs and figures at 360 px and below. Build 2026-10-20.7. |
| 20 Oct | Facilitator or Member view switch in the facilitator strip: member view is enforced server-side via `X-Ledger-View: member` (honoured for facilitators only, can only reduce rights), amber strip and hint, choice kept per tab. README: step-by-step invitation guide. Build 2026-10-20.9. |
| 25 Oct | Board sessions are now half-day: every mention updated (fact card, cadence card label and text, membership terms, FAQ 1 and 5 in page and JSON-LD, Charter "total presence" line, Organization description). Facilitation protocols section: metric "Half a day" with a two-sentence label (no semicolon); one tracker per step (`01 // Diagnosis`, the duplicate `01 / 04` removed); step 03 renamed "Decision stress-test" (cost of inaction kept in the description); outcome tags without brackets, "Friction surfaced" and "Execution locked" replacing the two inconsistent ones. |
| 25 Oct | Standards of fit refined: lead line "Founders, CEOs and Managing Directors. The top seat only." (no longer repeats the first criterion); criteria shown as a label on its own line with one short sentence beneath; "Final authority" (the decision stays with the member, with the input of the group), "Intellectual honesty" replaces "Radical candor", semicolon removed from "Total presence", UK "advisers"; status tags without brackets; the two base items (Cohort consent, Chatham House compact) restyled as kuma cards with tighter copy. Consent wording kept (no veto or unanimity). |
| 25 Oct | Strategic sparring card photo replaced: `assets/photos/cadence-sparring-office.jpg` and `.webp` (1024 x 576, cropped from the 1584 x 672 original to frame Sven and his conversation partner with the window behind). Alt text unchanged. `cadence-sparring-barcelona.*` is no longer referenced and can be deleted. |
| 28 Oct | Hero photograph: a generated peer board scene (facilitator seated, member speaking, no slides) behind the opening section, under a navy overlay darkest behind the text. The roll-up banner in the image was blurred and darkened so no text shows behind the headline. Files `assets/photos/hero-peer-board-wide.*` (desktop) and `hero-peer-board-mobile.*` (phones, cropped to the table), WebP with JPEG fallback via `image-set()`, 44 to 115 KB. Decorative only; hidden in print. Styles in section 17c. |
| 28 Oct | Hero refined: split layout on desktop (text on clean dark navy on the left, photograph on the right 54% with a soft masked fade, so no face sits behind the text; phones keep the full-width photo under an overlay). Overline "Confidential executive peer board // Barcelona 01"; shorter subhead; secondary link "See what's included ↓" (scrolls to the cadence). Header "Candidate review" button is an outline while the hero is in view and turns solid navy once the hero scrolls away (`is-past-hero` set in `site.js`). |
| 28 Oct | Fact strip redesigned as floating cards with icons (section 17d, overrides 07b): white-to-#F9FAFB cards with 0.5px box-shadow hairlines and a soft navy shadow, overlapping the hero on desktop (`display:flow-root` on the section stops the negative margin collapsing). Inline SVG line icons (people, calendar, speech bubbles, mountain, padlock, person with tick), `aria-hidden`. Hover lifts the card 2px, turns the hairline teal and fills the icon tile. Mobile: compact rows with the icon on the left. Non-breaking hyphen in "4‑day". |
| 28 Oct | Hero photograph reworked: full width and centred again, at 60% opacity over the navy with 1px blur and 18% less saturation. A `.hero-veil` layer adds a blur (backdrop-filter, 8px) that is strongest behind the text and fades out by the middle, with the navy gradient; `::after` adds fine generated grain (inline SVG noise, no file) and a bottom fade, so the generated image reads less clean. Browsers without backdrop-filter get the softening and gradient only. Phones unchanged apart from the grain. Badge keeps "Barcelona 01" together on one line. |
| 28 Oct | Moved to kuma.partners. Public page now at `www.kuma.partners/the-round/` (repo sven353/kumapartners, folder `the-round/`, all paths absolute, organisation id `https://www.kuma.partners/#organization`). This project becomes the ledger at `ledger.kuma.partners` (primary domain). `_redirects`: theround.kuma.partners 301s to the new page (ledger paths to the ledger), the root serves `ledger.html`. `_headers`: noindex on everything. `ledger.html`: brand and back links point to the new page, og:url to the ledger. Removed `index.html`, `site.js` and `assets/photos/` (18 files). |
| 28 Oct | `_headers`: removed the site-wide `X-Robots-Tag: noindex`. Search Console showed the old address as "Excluded by noindex" because Netlify attached the header to the 301 redirect. The ledger keeps its noindex through the meta tag and the path rules. |
| 14 Oct | Commitments table rebalanced: fixed layout with a column group (Member 120px, Hard call about 27% of the table, Impact on P&L 95px, Cost of inaction takes the rest, Sparring partner 95px, Target review date 105px, Progress 115px, Actions 85px, admin only); 16px gaps; ledger page container widened to 1320px. Hard call and Cost of inaction clamp at three lines with a quiet more / less toggle that only appears when text is cut (rechecked on resize). Compact progress pill. Content fix: one-time correction of Barcelona hard calls, cost of inaction and Impact on P&L (Farid €25,000, Duncan €100,000, Astrid €100,000), applied once to the live copy and recorded in `fixes` so later edits are never overwritten; names, roles, partners, dates and progress untouched. Seed updated to match. Build 2026-10-14.4. |
| 14 Oct | Terminology: "Sovereign commitment" is now "Hard call" (table column, log form, editor), "Commercial exposure" is now "Impact on P&L" (table column) and "Impact on P&L (€)" (log form, editor), and the fourth metric is "Cohort impact on P&L" (sum for commitments not yet complete). Labels and messages only: stored fields (`commitment`, `exposureEur`) and Netlify form fields (`commitment`, `exposure_eur`) are unchanged, so no saved entry or form column changes. Build 2026-10-14.3. |
| 14 Oct | Fix: facilitator edits vanished after a reload. Cause: in a Lambda-compatible (v1) function, `connectLambda` does not provide the `uncachedEdgeURL` that strong-consistency Blobs reads need, so every read threw; the function took that for "nothing saved" and re-initialised Barcelona from the seed on each load, overwriting edits. The store now uses default consistency; a storage read error never triggers a re-initialisation (editing pauses with a notice instead); the page sends the version it is showing with every change (`base`), so a read lagging a recent save cannot undo it, and keeps showing its own saved version for up to a minute until storage catches up. Build 2026-10-14.2. |
| 14 Oct | Save path hardened. Editor carries the entry id in a hidden field (`edit-commitment-id`); requests use `netlifyIdentity.refresh()` with `user.jwt()` as fallback; every failed request shows the reason and HTTP status in the drawer or banner and logs details to the console; a save only counts once the server's reply contains exactly the values sent, then the table and metrics redraw and the banner reads "Commitment updated", "Commitment added" or "Commitment deleted". Function: on a version-tag conflict it re-reads and re-applies the change once, then saves as the latest (single facilitator), reads the stored copy back and returns it (`success`, `entries`, `data`). Build stamp: `<meta name="ledger-build">`, `X-Ledger-Build` response header and a small "Build 2026-10-14" note in the ledger footer, which also flags a page and function built at different times. |
| 13 Oct | Cohort access and table layout. Members still see all four cohorts in the selector, but the function answers 403 `unauthorized_cohort` for any cohort outside their assignment, and the page then replaces metrics, table and logger with the "Restricted cohort access" card and a "Return to my cohort" button (on first load an unassigned remembered cohort quietly opens their own instead). Assignment: Identity cohort roles plus the optional Netlify variable `LEDGER_MEMBER_COHORTS` (`email:cohort`, several cohorts joined with `|`); otherwise Barcelona cohort 01; the facilitator sees everything. The log form offers members only their own cohort. Progress dropdown in the table now follows Not started, 50% executed, 75% executed, Complete (it previously listed 50% and 75% first). Table split into dedicated columns: Member, Sovereign commitment, Commercial exposure, Cost of inaction, Sparring partner, Target review date, Progress, Actions. |
| 13 Oct | Unlock step removed. When `ledger-data/<cohort>.json` does not open with the current `LEDGER_PASSPHRASE`, the function ignores it: Barcelona cohort 01 is initialised from the built-in seed in `netlify/functions/ledger.js` (F, D, A with roles, progress, cost of inaction and exposure) and saved to Netlify Blobs encrypted with the current passphrase; other cohorts start empty and editable. A live copy that no longer opens (after a passphrase change) is kept as an encrypted `backup-<cohort>-<time>` entry before being replaced. The seed is readable text in the repository: keep the GitHub repository private. New `_redirects` stops the website from serving `/netlify/*`. |
| 13 Oct | Passphrase changes heal themselves. When the published file was encrypted with a different passphrase than the current `LEDGER_PASSPHRASE`, the facilitator no longer sees a mismatch warning: a one-time "Unlock ledger" panel asks for the earlier passphrase once, the function decrypts the file with it and re-saves the live copy in Netlify Blobs under the current passphrase (POST action `adopt_file`, facilitator only; the earlier passphrase is used for that request only and never stored). Optional automatic path: set `LEDGER_PASSPHRASE_PREVIOUS` and the move happens on the next load. Once the live copy exists, the older file is ignored. Members see a neutral "being prepared" note until then. No commitment data in readable form anywhere. |
| 13 Oct | Ledger schema 2. Entries now carry `name` and `role` (separate fields), `progress` (`not-started`, `50`, `75`, `complete`) instead of status, `inactionCost` (cost of inaction within 30 days) and `exposureEur` (whole euros). Older entries convert on the fly (member to name, context to role, active/in review/executed to not started/50%/complete). Barcelona file re-encrypted as schema 2 with roles, inaction narratives and exposure (€25,000, €50,000, €40,000); a newer schema reseeds the live copy, so earlier on-site status changes to Barcelona are replaced by the new seed. Metrics: active commitments (not complete), execution progress (average across entries), due in 14 days, commercial exposure at risk (sum for entries not complete). Table: name over role, commitment with an exposure tag and inaction narrative, progress pills (complete with a check mark), progress filters. Logger form `member-ledger-log` gains `member_name`, `progress`, `inaction_cost` and `exposure_eur` (`member_role` now holds role and company); editor drawer mirrors it, with the cost of inaction section and its micro-copy. Function: `update_progress` action (old `update_status` still accepted), stricter validation, negative or non-numeric exposure refused. Builder validates the new fields and stamps `schema: 2`. |
| 13 Oct | Facilitator editor. The live ledger now sits in Netlify Blobs (store `the-round-ledger`, key = cohort id, AES-GCM encrypted with `LEDGER_PASSPHRASE`), seeded on first read from `ledger-data/<cohort>.json` (Barcelona: F, D, A) plus any earlier saved statuses. `netlify/functions/ledger.js` accepts `update_status`, `save_entry` and `delete_entry` from the facilitator only (403 for everyone else), validates every field, never reuses a deleted id (`bcn-01-004` onwards) and guards against two windows overwriting each other (409 with the latest ledger). A newer published file still reseeds the live copy. `ledger.html`: "Add commitment" in the admin strip, Edit and Delete on every row (admin only), slide-in editor drawer and delete confirmation with focus trap and Escape, "Changes saved to live ledger" banner, metrics recalculated without reloads. Styles section 19: editor, drawer, confirmation, row actions. |
| 13 Oct | Barcelona cohort 01 goes live: `ledger-data/barcelona-01.json` re-encrypted with the three commitments from the first session (`bcn-01-001` F, `bcn-01-002` D, `bcn-01-003` A; all active, due 18 and 31 Oct) and `"sample": false`. The five fictional sample rows are gone from the file and from `netlify/functions/ledger.js`, whose fallback is now an empty cohort with a notice. No commitment text sits in plain form anywhere in the repository. |
| 13 Oct | Fix: a missing `LEDGER_PASSPHRASE` showed "The ledger is not configured yet" to everyone, the facilitator included. `netlify/functions/ledger.js` now always answers 200 with cohort data: the live ledger when it can be read, otherwise a starter template (the five fictional sample rows for Barcelona, an empty ledger elsewhere) with `configured: false` and a notice saying why (passphrase missing, passphrase not matching the file, file unreachable). Unreadable saved statuses are skipped instead of failing. Status changes still need the passphrase and say so. `ledger.html` shows the server notice and clearer save messages. |
| 13 Oct | Fix: signing in as `sven@kuma.partners` without Identity roles showed "Your account is not yet assigned to a cohort". Facilitator override (email `sven@kuma.partners` or role `admin`) now runs first in both the page and `netlify/functions/ledger.js`, opens Barcelona cohort 01 with the admin strip and every cohort. Members without a cohort role fall back to Barcelona cohort 01 instead of being locked out; cohort roles are matched leniently (`barcelona-01`, `Barcelona`, `Barcelona cohort 01`). The no-cohort lockout is removed. Members with one cohort get a static indicator. `ledger.js` is now inline in `ledger.html` (delete `ledger.js` from the repository). Gateway card on `#16283D`. The magic link build from earlier on 13 Oct is not part of this version. |
| 12 Oct | Ledger sign-in moved to the official Netlify Identity widget: the gateway is a single "Member sign in" button (`netlifyIdentity.open('login')`), with no password or reset forms on the page; session handled on the widget's `init`, `login` and `logout` events. Roles: `member` (all cohorts unless cohort roles are set), cohort roles, `admin`. New top utility bar with cohort selector, Chatham House tag, email and sign out; metrics now lead with active commitments; filter pills; countdown badges. Facilitator admin mode adds instant status changes, saved encrypted in Netlify Blobs through the function (`package.json` adds `@netlify/blobs`), and hands the live ledger to the builder. Logger form renamed `member-ledger-log` with fields `cohort`, `member_role`, `commitment`, `sparring_partner`, `target_date`; button in teal. Gateway copy and footer replaced with the specified text. |
| 12 Oct | Ledger access moved from a shared cohort key to Netlify Identity (invite only, email and password). New gateway: four selectable cohorts (Barcelona, London, Berlin, Lisbon), executive email, password, forgotten password with a neutral response, set-password view for invitations and resets. New Netlify Function `netlify/functions/ledger.js` checks cohort roles and decrypts server-side with `LEDGER_PASSPHRASE`. Facilitator console for the `admin` role. `site.js` forwards Identity email links from the home page. Builder now uses the server passphrase (24+ characters). Seed ledger re-encrypted with a new random passphrase. Gateway footer and help line updated. |
| 12 Oct | Member accountability ledger. New `ledger.html` (gateway with cohort selector and access key, then dashboard with cohort header, Chatham House banner, quick stats, filterable ledger and the Netlify session logger `member-ledger-entry`), `ledger.js`, encrypted `ledger-data/barcelona-01.json` (AES-GCM, key derived with PBKDF2; seeded with the anonymised sample rows under the existing cohort key) and the offline `tools/ledger-builder.html`. "Member sign in" added to the header (13 px, left of the CTA) and mobile menu; ledger card and footer links now point to `ledger.html`. The old Member Portal modal, its plaintext `LEDGER` rows, passcode hash and portal CSS were removed. `_headers`: noindex for ledger and tools, `no-store` for ledger data. Styles section 19. |
| 12 Oct | UK sentence case across the site: navigation, hero CTAs (and every repeat of the primary CTA), facilitation eyebrow, step labels (`01 // Diagnosis` to `04 // Accountability`), step titles and tags, all five cadence titles ("&" becomes "and"), card footer tags, ledger sign-in link, inclusions title and items, term values, FAQ title and CTA, footer links, drawer title, submit label (also in `site.js`), portal title and page titles. CSS: footer tags, step tags and step labels no longer forced to uppercase. Form attributes unchanged. |
| 12 Oct | Personal address replaced by the team address `contact@kuma.partners` everywhere: footer link, portal passcode link, form success message, JSON-LD (Organization, service, founder) and `CONFIG.contactEmail` in `site.js`. Footer bottom row now carries the city line "London · Barcelona · Lisbon · Berlin" (`.footer-locations`, mono, muted), right-aligned on desktop and wrapping under the copyright on narrow screens. |
| 12 Oct | All-inclusive annual membership framing. New hero subhead; cadence section retitled "One annual seat. Five connected touchpoints." with a new narrative; `Included //` meta tags on all five touchpoints; new "Complete 12-Month Inclusions" summary after the ledger anchor (`.membership-inclusions-card`). Terms, FAQ 9 and JSON-LD offer moved from 6-month rolling cycles to a 12-month seat invoiced in two semi-annual instalments, renewing annually with 30 days' notice; "Fixed-Cycle Retainer" becomes "Annual Membership Seat". Inclusions subtitle notes travel and lodging at cost. Meta description synced. Form untouched. |
| 10 Oct | Radii dialled back to an understated 6 to 10 px standard: cards 8 px (photo corners 7 px), ledger anchor 10 px (8 px on mobile), terminal 6 px; lighter ambient shadows, terminal inner highlight removed. CSS only, `index.html` untouched. |
| 10 Oct | Card 03 image re-saved at native resolution and high quality as `masia-catalunya-immersion` (both `<source>` and `<img>` updated, old `cadence-immersion-patio` files removed) to bypass the 7-day asset cache; alt text now mentions the dining area. Soft geometry for the cadence layer: 20 px cards with ambient shadow and 2 px hover lift, 24 px ledger anchor with soft elevation, 16 px terminal with inner highlight; 16/20/14 px on mobile. Grids, form and responsive flows unchanged. |
| 10 Oct | Card 03 image replaced with the sharp, high-resolution Catalonia retreat version (same file names, `.webp` and `.jpg`, exact 16:9). Alt text updated to "Secluded Catalonia masia retreat patio, seating area and covered outdoor kitchen". Card structure, layout and mobile snap unchanged. |
| 10 Oct | Clarified monthly board duration to specify inclusion of private working lunch across Fact Strip, Cadence Card 01, and Facilitation Engine header. |
| 10 Oct | Candidate Review drawer and FAQ contact: the FAQ sidebar's mailto link is replaced by a drawer trigger ("Request Candidate Review & Confidential Diagnostic"), so FAQ inquiries route into the form. Drawer intro shortened; "Stage" becomes "Leadership context" with seven options (adds acquisition/searcher, active merger, exited founder and family business); inflection point is now a two-line field, 600 characters, no counter; field labels set in mono caps. Netlify form tag, honeypot, hidden `form-name` and all field names unchanged (end-to-end submit tested). |
| 10 Oct | Tone restoration on the new layout: guarantee strip now reads Cohort consent ("review and consent to every incoming candidate") instead of veto rights; fit criteria restored with bold lead-in anchors and revised copy (Total presence, Direct competitors, Commercial pitching, Passive observers); Card 04 title restored to "The Annual Executive Offsite & Sanctuary"; terminal actionable status set to amber `#D97706`, active stays teal-on-dark. Layout (2 × 2 cadence, ledger anchor, connected pipeline, no photo strip) unchanged. |
| 10 Oct | Integrated Improvements 1–4: elevated Fact Strip indexes, Facilitation Engine horizontal pipeline, bilateral Standards of Fit governance grid, and symmetrical 2x2 Cadence touchpoints with full-width Ledger anchor span. Detail: proof ribbon and its three photo pairs removed, "Environment" dropped from header and footer navigation; section backgrounds re-sequenced (cream facts, paper cadence, cream facilitation, paper fit); `SwipeHint` in `site.js` now targets `.cadence-touchpoints-grid`; old cadence, engine, fit and proof-ribbon CSS retired. Netlify form markup unchanged (verified by diff). |
| 10 Oct | Optimized mobile viewport (<768px): above-the-fold CTA stacking, horizontal cadence touch carousel, 2x2 terms grid, and native bottom-sheet modal drawers. Laptop/desktop views kept completely untouched. Detail: hero padding 92/40 px, h1 and subhead margins tightened, primary CTA min-height 48 px, secondary link 44 px tap target; swipe hint now reads "← Swipe to explore formats →"; terms values 1.1rem with unbroken hairline dividers; the `sheetIn` keyframe moved inside the mobile media query. Verified: every CSS rule outside `@media (max-width: 767px)` is byte-identical to the previous build, and desktop screenshots at 768, 1024 and 1440 px match apart from photo-decoding noise that also appears between two runs of the unchanged baseline. |
| 10 Oct | Editorial design refactor. Tokens: paper `#FDFDFC`, ink `#111827`, hairlines `rgba(0,0,0,.08)`, system monospace stack, radii down to 2 px, easing `cubic-bezier(.16,1,.3,1)`, all card shadows removed. Hero moved onto the navy radial with a 2.4 to 4.2rem fluid h1 and a mono eyebrow. Pills replaced by mono tags (hero, cadence frequency, fit, engine, portal badges). Fact strip, Facilitation Engine, fit section, integrity compact and terms rebuilt as hairline layouts without boxes; fit is a 7:5 asymmetric spread with a vertical rule. Ledger telemetry restyled as a terminal with `[STATUS: …]` and `[DUE: …]` tags; Charter quote in Lato italic. Terms values tabular, scarcity note in mono (`// Barcelona 01 capped at 12 seats · Admission by cohort consent`). Mobile layer (below 768 px) updated for the new dividers. Netlify form markup and `site.js` untouched. |
| 10 Oct | Editorial reduction across `index.html`: new hero subhead (adds Managing Directors and P&L responsibility); new `#glance` fact strip under the hero; cadence cards cut to one paragraph plus a micro-spec line each; fit section rewritten as a two-column filter; terms lead and card details tightened ("Waived for Founding Members of Barcelona 01"); drawer eyebrow, intro and submit label reframed as an admission review, plus a privacy line. Meta description, OG/Twitter text and the JSON-LD service description synchronised. CSS: new section 07b (fact strip), `.fit-text`, `.form-privacy`, mobile rules for the strip; unused `.cadence-features` and `.fit-list` rules removed. `site.js` submit-label fallback updated. |
| 10 Oct | Mobile refactor below 768 px: stacked hero with full-width CTA, cadence swipe carousel with scroll snap and swipe hint, stacked telemetry badges, compact 2 × 2 terms grid, bottom-sheet drawers and portal with safe-area padding, 44 px close buttons, 16 px inputs, 1.25rem gutter. Non-breaking spaces keep "Barcelona 01" and trailing arrows together. New `SwipeHint` module in `site.js`. Desktop (768 px and up) verified pixel-identical. |
| 9 Oct | Netlify form hardening: raw `netlify` attribute added next to `data-netlify`, honeypot paragraph hidden inline, `form-name` re-asserted in the AJAX payload, failure status logged to the console. README now documents enabling form detection in Netlify. |
| 9 Oct | Updated Card 03 media to high-resolution Catalonia masia terrace photograph (`cadence-immersion-patio`). Alt text updated; `object-position: center 60%`. |
| 9 Oct | Updated Hero headline and subhead to authoritative positioning ('Built for those who carry the ultimate call'). Synchronized OpenGraph and meta descriptions. JSON-LD service description updated. |
| 9 Oct | Card 05 redesigned: operating-compact pill, new subtitle, illustrative ledger telemetry panel (two anonymised entries with status pills), Charter quote, and two actions (Charter, Member Sign-In). New The Round Charter drawer with the 11 points of Schedule 2 and a GDPR note. Charter link added to the footer. |
| 9 Oct | Refactored #terms to Option B: transitioned subscription fee to candidate-review disclosure to enhance executive exclusivity and alignment with high-touch advisory positioning. New eyebrow, lead and four governance cards; FAQ 9 rewritten in HTML and JSON-LD; numeric price removed from the JSON-LD offer; `.term-value--text` enlarged to 1.35rem. |
| 9 Oct | Updated Card 04 media to authentic Costa Brava retreat working session (`cadence-offsite-costa-brava`). Outdoor table crop (`cadence-sanctuary-table`) removed. Card 4 returns to the standard 16:9 frame with `object-position: center 35%`. |
| 9 Oct | Cadence card media: cards 1 to 4 now open with a flush 16:9 photo (peer board, sparring, finca courtyard, outdoor table) above a hairline divider, with a subtle zoom on hover; the ledger card stays typographic on navy. Four new image pairs added to `assets/photos/`. Nameplates blurred in the boardroom photo. Wide fourth card uses a 21:9 frame on desktop. |
| 9 Oct | Exclusivity and terms update: admission fee raised to €1,000 and permanently waived for Founding Members; date-gating removed from the page and from `site.js`; terms subhead and scarcity note (12 seats, cohort consent) rewritten; all calls to action renamed to Candidate Review; drawer headline and intro rewritten; FAQ 4 rewritten without naming any third-party network (HTML and JSON-LD); FAQ 9 updated in HTML and JSON-LD. Buttons now wrap on phones so the longer labels fit. |
| 9 Oct | README added. Plain passcode removed from the `site.js` comment. Navigation renamed (The Cadence, Facilitation, Environment, Standards of Fit, FAQ) with collapse at 1100 px. Apple-style card gradients, hero wash, 2 px hover lift with teal border, navy focal shadow on the ledger card. Integrity box extended to three points (non-solicitation added). Application fields renamed. Cookie Preferences note added. |
| 9 Oct | FAQ section (10 questions, accordion, "view all" toggle) and FAQPage JSON-LD added; footer moved to cream. |
| 9 Oct | Restructured to Membership Agreement v1.1: new hero, detailed cadence cards, Facilitation Engine, standards of fit, membership terms, application drawer. `app.js` renamed to `site.js`. Contact changed to sven@kuma.partners. Founding Member waiver date-gated. |
| 9 Oct | Favicon set, apple-touch icon, `favicon.ico` and Open Graph image generated from the transparent Kuma mark. |
| 9 Oct | Proof ribbon with three optimised photos added under the cadence cards. |
| 9 Oct | Design system realigned with kuma.partners: midnight navy and new teal, self-hosted Montserrat and Lato, 1 px hairlines, scroll reveal and stagger, grid-row collapsible navigation. |
| 29 Sep | Launch build: `_headers` added, passcode hashed, ledger columns and status labels finalised. |
| 29 Sep | Kuma Partners logo assets added, header lockup and text fallback. |
| 29 Sep | Narrative reframed as a year-round operating system: cadence, toolkit, retreats, caliber, application. |
| 29 Sep | Initial build: landing page, Netlify application form, client-side Member Portal. |
