# www.kuma.partners

The production codebase for the Kuma Partners marketing and advisory site: "When rapid scale stalls execution, we resolve the leadership friction." An elite, operator-led leadership advisory firm working with scale-stage founders, C-suite teams, and VC or PE operating partners on executive friction, decision latency, and structural bottlenecks.

Built as a static site with no build step: semantic HTML, one shared stylesheet, one shared script. Optimized for fast load times and for being read cleanly by both search crawlers and AI answer engines (GEO).

Maintainer note: this repo occasionally gets confused with `offsite.kuma.partners`, a separate joint-venture landing page project that lives in its own repository. The `assets/offsites/` folder below holds real photography for Kuma's own Executive Offsite service line and belongs here. Nothing in this repo should reference the offsite.kuma.partners sub-brand, its configurator, or its retreat logistics. If a pull request touches any of that, it does not belong in this repository.

## 1. Stack

- Semantic HTML5 across six standalone pages, no templating or SSR.
- Vanilla JavaScript in a single `site.js`, no framework and no bundler.
- One shared stylesheet, `styles.css`, using CSS custom properties for the brand palette and CSS Grid's `0fr`/`1fr` `grid-template-rows` trick for every expand and collapse interaction (FAQ, scan timeline, sprint phases).
- Hosted on Netlify. The two lead-capture forms use Netlify Forms (`data-netlify="true"`) rather than a custom backend, so there is nothing to provision beyond the static files.

## 2. Repository structure

```text
index.html              # Main firm landing page
partners.html            # Partner roster, specialist bench, governance
friction-scan.html       # Standalone landing page for Tier 1 (the 14-Day Scan)
alignment-sprint.html    # Standalone landing page for Tier 2 (the 60-90 Day Sprint)
legal.html               # Legal notice
privacy.html             # Privacy policy
site.js                  # Nav, accordions, drawers, scorecard, form wiring
styles.css               # Design tokens and every rule on the site
robots.txt                # Crawler allowlist, points to sitemap.xml and llms.txt
sitemap.xml               # Production URL list
llms.txt                  # Plain-language site summary for AI agents (GEO)
assets/
  logo-icon.png            # Favicon
  logo-lockup.png           # Header and footer wordmark
  og-image.jpg               # Social share image
  team/                       # Headshots for partners and the specialist bench
  offsites/                    # Photography for the Executive Offsites service
```

There is no `assets/brand/` or `assets/clients/` folder. The client pedigree strip on the homepage is plain text (`TikTok`, `P&G`, `IBM`, `Netflix`, and so on inside `.marquee-track`), not logo image files, so there is nothing to keep in sync there.

## 3. Page walkthrough

### index.html

1. Header and navigation. Sticky header with a mobile drawer.
2. Hero. The core positioning line above, with two CTAs: opening the scan modal and jumping to `#engagements`.
3. Proof bar. The text client marquee.
4. `#problem`. A 65 percent leadership-friction stat lockup next to a three-card diagnostic grid.
5. `#approach`, labeled "The operator difference" on the page. A comparison table contrasting Kuma against traditional consultancies and generic coaching collectives.
6. `#engagements`. A tabbed section. The default tab holds the three paid tiers (the 14-Day Friction Scan, the 60-90 Day Alignment Sprint, and Strategic Scaling Advisory); the other two tabs cover Strategic and Executive Offsites and the AI Leadership Transition offer.
7. `#case-studies`, labeled "Proof of impact." Three tabbed case studies, including the 48-hour decision-velocity benchmark.
8. `#scorecard`, the free self-assessment. A 90-second interactive diagnostic that ends in a lead-capture modal.
9. `#investors`. Addressed to VC and PE operating partners: pre-emptive diagnostics, co-founder realignment, and portfolio triage.
10. `#faq`. Ten questions total. The first four render open by default; a "View all 10 questions" toggle reveals the rest. All ten stay present in the static markup either way, so crawlers and AI agents see the full set regardless of JavaScript.
11. `#fit`, "We do not work with everyone. By design." Ideal client profile against out-of-scope mandates.
12. A client-logo strip (`.global-strip`), then `#contact`: the streamlined three-field executive intake form.
13. Footer.

### partners.html

Two full profile cards for the principal partners, Dr. Sven Mulfinger and Vincent Azé, followed by a ten-card specialist bench (Adrian Perreau de Pinninck, Tiffany Missiha, Bree Aesie, Ann Reily, Andrea Ross, Bryan Kramer, Angus Nelson, Colleen Tartow PhD, Márcio Marcos, and Daniel Pascual). Below that, "The Human Operator Moat" ("AI can model your org chart. It cannot fix executive friction.") and a governance section on Kuma's B Corp commitment.

### friction-scan.html and alignment-sprint.html

Dedicated, linkable pages for Tier 1 and Tier 2, used as the landing target for the corresponding tier CTAs on the homepage and in outbound links.

### legal.html and privacy.html

Standard compliance pages, linked from the footer.

## 4. Design tokens and background cadence

All colors are CSS custom properties defined once on `:root` in `styles.css`.

| Token | Value | Role |
|---|---|---|
| `--cream` | `#F4F1EB` | Warm stone base for narrative and diagnostic sections |
| `--navy` | `#284050` | High-conversion action strips only: `#scorecard` and `#contact` |
| (unnamed, set per section) | `#332F2A` | Executive slate, `#investors` only |
| `--teal` | `#588088` | Accent color: eyebrows, links, icons, hover states |
| `--ink` | `#1A1A1A` | Body text |

Sections alternate between the cream tier and a plain white tier (`.proof`, `#approach`, `#case-studies`, `.team-teaser`, `#fit`) so that no two adjacent sections share a background, with the two navy strips and the one slate strip breaking the rhythm deliberately at the highest-stakes points on the page. The slate tone for `#investors` was chosen specifically to stay warm and distinct from `--navy`, so it should not be merged into the navy token even though both read as dark.

## 5. Forms and lead routing

Two real forms, both Netlify Forms with an honeypot field:

- `contact` (`#contact-form`, inside `#contact`). Fields: `email`, `role_stage`, `situation`. Three hidden `select` elements (`role`, `journey`, `brought_here`) still submit with the form; they get populated by JavaScript when a visitor arrives through a specific CTA elsewhere on the page (the investor track, the executive-briefing link, or the scorecard result), so removing them would silently break those flows even though they are not visible in the default form.
- `partner-debrief` (`#debrief-form`), submitted from the Tier 3 debrief modal.

Submission is handled by `wireAjaxForm()` in `site.js`, which posts via `fetch()` and swaps in an inline success state without a page reload, falling back to a normal HTML POST if JavaScript fails. Notification routing (who gets emailed on a new submission) is configured in the Netlify dashboard under Forms, not in this codebase.

## 6. GEO and crawler optimization

`robots.txt` explicitly allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Applebot-Extended`, and `Google-Extended`, and points to both `sitemap.xml` and `llms.txt`. `llms.txt` gives AI agents a plain-language summary of the firm, its offerings, and its positioning. `index.html` also carries JSON-LD for `ProfessionalService`, `FAQPage`, `Service`, `Offer`, `OfferCatalog`, and `Person`, all rendered directly into the static markup so nothing depends on client-side JavaScript to be readable.

## 7. Deployment

Netlify deploys straight from the `main` branch of this repository. There is no CI step and no build command: whatever is on `main` is what ships. The usual flow is to commit locally, then push to `main` once changes have been checked in a browser (both viewport ranges and the DOM tag balance, since there is no linter running on save). After a push, Netlify's edge deploy is typically live within a minute.
