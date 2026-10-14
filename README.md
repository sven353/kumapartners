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
6. `#partners`, "Executive leadership". The single team module: two managing partner cards (Sven Mulfinger and Vincent Azé) and the specialised senior advisor network as a 3x3 grid of nine real advisors, linking to `partners.html#advisors`, then the international footprint and native-language bar (`.leadership-footprint-bar`). The nav "Team" link points here.
7. `#system`, the Kuma Operating System (KOS) wheel and six operating tools. The nav labels it Methodology.
8. `#engagements`. A tabbed section. The default tab holds the three paid tiers (the 14-Day Friction Scan, the 60-90 Day Alignment Sprint, and Strategic Scaling Advisory); the other two tabs cover Strategic and Executive Offsites and the AI Leadership Transition offer.
9. `#case-studies`, labeled "Proof of impact." Three tabbed case studies, including the 48-hour decision-velocity benchmark.
10. `#scorecard`, the free self-assessment. A 90-second interactive diagnostic that ends in a lead-capture modal.
11. `#investors`. Addressed to VC and PE operating partners: pre-emptive diagnostics, co-founder realignment, and portfolio triage.
12. `#faq`. Ten questions total. The first four render open by default; a "View all 10 questions" toggle reveals the rest. All ten stay present in the static markup either way, so crawlers and AI agents see the full set regardless of JavaScript.
13. `#fit`, "We do not work with everyone. By design." Ideal client profile against out-of-scope mandates.
14. `#contact`: the executive intake form, straight above the dark footer.
15. Footer.

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
| `--cream` | `#F4F6F8` | Chalk: the off-white tier for alternating sections |
| `--navy` | `#0B1523` | Midnight: the `.proof` logo bar, and text and headings |
| `--bg-dark-ambient` | radial `#17324B` to `#0B1523` | Overhead ambient light on the dark anchors `#scorecard` and `#contact` |
| `--footer-dark` | `#060E17` | Footer base on every page |
| `--teal` | `#1D6F8A` | Accent: eyebrows, links, icons, hover states |
| `--ink` | `#1A1A1A` | Body text |
| `--shadow-card-subtle` / `--shadow-card-hover` | soft navy shadows | Lift for white cards sitting on a chalk section |
| `--hairline-color` / `--hairline-subtle` | `rgba(11,21,35,.08)` / `.05` | Every 1px border and divider (semi-transparent ink, so it reads the same on white and chalk) |

Border weights: every line is 1px, with two exceptions, the 1.5px teal outline on the Kuma column of the comparison table and the 2px teal outline on the featured tier card. Eyebrow dashes are 14px by 1.5px.

Headings are in British sentence case. Product, tool and people names keep their capitals (the 14-Day Leadership Friction Scan, Friction Matrix, Kuma Operating System). The only two booking calls to action are "Initiate a 14-Day Scan" and "Book a Partner Debrief".

Every page carries the same header navigation as the homepage, including the mobile menu toggle. On subpages the links point to `index.html#section`, and Team points to `partners.html`. If you change the homepage menu, copy it to the other five pages.

Homepage light sections are soft vertical ramps (`--ramp-chalk` #F4F6F8 to #EEF2F6, `--ramp-white` white to #F8F9FA, `--ramp-inverse` #F8F9FA to white) that alternate between chalk and white so no two neighbours share a tone: hero white, `.proof` navy, `#problem` chalk, `#approach` white, `#partners` chalk, `#system` white, `#engagements` chalk, `#case-studies` white, `#scorecard` dark, `#investors` chalk, `#faq` white, `#fit` chalk, `#contact` dark, footer dark. Cards placed on a chalk section are white with a hairline border and `--shadow-card-subtle`. If you add or move a section, keep the alternation; the order is also written as a comment above `#problem` in `styles.css`.

## 5. Forms and lead routing

Two real forms, both Netlify Forms with an honeypot field:

- `contact` (`#contact-form`, inside `#contact`). Fields: `email`, `role_stage`, `situation`. Three hidden `select` elements (`role`, `journey`, `brought_here`) still submit with the form; they get populated by JavaScript when a visitor arrives through a specific CTA elsewhere on the page (the investor track, the executive-briefing link, or the scorecard result), so removing them would silently break those flows even though they are not visible in the default form.
- `partner-debrief` (`#debrief-form`), submitted from the Tier 3 debrief modal.

Submission is handled by `wireAjaxForm()` in `site.js`, which posts via `fetch()` and swaps in an inline success state without a page reload, falling back to a normal HTML POST if JavaScript fails. Notification routing (who gets emailed on a new submission) is configured in the Netlify dashboard under Forms, not in this codebase.

## 6. GEO and crawler optimization

`robots.txt` explicitly allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Applebot-Extended`, and `Google-Extended`, and points to both `sitemap.xml` and `llms.txt`. `llms.txt` gives AI agents a plain-language summary of the firm, its offerings, and its positioning. `index.html` also carries JSON-LD for `ProfessionalService`, `FAQPage`, `Service`, `Offer`, `OfferCatalog`, and `Person`, all rendered directly into the static markup so nothing depends on client-side JavaScript to be readable.

## 7. Deployment

Netlify deploys straight from the `main` branch of this repository. There is no CI step and no build command: whatever is on `main` is what ships. The usual flow is to commit locally, then push to `main` once changes have been checked in a browser (both viewport ranges and the DOM tag balance, since there is no linter running on save). After a push, Netlify's edge deploy is typically live within a minute.

## 8. Private client pages

`constellr-review.html` (served at `/constellr-review`) is an unlisted debrief form for constellr coachees. It carries `noindex, nofollow`, and it is deliberately absent from the navigation, footers, `sitemap.xml`, `llms.txt` and `robots.txt` (a Disallow line would advertise the URL). It submits to the Netlify form `constellr-debrief-v5` through `review-portal.js`, which also prefills name, role and lead coach from the link (the coach match ignores accents and case, so `?coach=Marcio` finds Márcio Marcos), for example `/constellr-review?name=Max&role=Co-Founder%20%26%20CEO&coach=Sven`. To add a coach, add an `<option>` to the Lead Coach select. Set the notification email for that form in the Netlify dashboard under Forms. Netlify labels each field in its emails with the text of the field's `<label>` element when there is one, and falls back to the `name` only when there is none. So the scale buttons and the question 5 tick options deliberately have no `<label>`. The question 5 boxes also have no `name`: the script writes the ticked options into one hidden field, `5. Potential next steps`, as a comma-separated list (the radio covers its cell invisibly and is `aria-labelledby` the number), and every remaining label's text is identical to its field's name (for example `1. Strategic clarity and decision speed`). Giving the scale numbers `<label>` elements again would collapse questions 1 to 5 into a single field called `1` in the email. Netlify only stores fields that existed in the form when it was deployed, so redeploy after renaming any field.
