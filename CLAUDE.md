# www.kuma.partners: design rules for every task

Static site, no build step. Pushed by hand (GitHub web upload), `main` deploys to production.

## Current design (live since 30 Oct 2026)

Lavender and ink. Fonts Inter and Inter Tight, self-hosted from `assets/offsite-v2/fonts/`. Tokens: ink `#0F0E13`, paper `#F1F0F6`, lavender `#B0A6DF`.

The files sit at the top level of the repo under their storage names and are shown at the public addresses by forced 200 rewrites in `_redirects` (the address does not change):

- `index-v2.html` (shown at `/`) with `index-v2.css`, `index-v2.js` and the shared base `kuma.css`
- `friction-scan-v2.html`, `alignment-sprint-v2.html`, `partners-v2.html` (with `partners-v2.css`), `privacy-v2.html` and `legal-v2.html` (with `legal-v2.css`)
- the diagnostic suite pages `KOS-v2.html`, `leadership-friction-scan-v2.html`, `coordination-tax-v2.html` and `cofounder-alignment-v2.html`. They keep the old look of their tools (`kos.css`, `suite.css`, the page css and js) inside a new header and footer from `kuma-shell.css` and `kuma-shell.js`. Every class in the shell starts with `kx-` and every token with `--kx-`, because `styles.css` uses the same names.
- `offsite-v2.html` and `offsite-partners-v2.html` (shown at `/offsite/` and `/offsite/partners.html`), with their own css and js. The offsite insights are `insights-index-v2.html` (at `/offsite/insights/`) and `insight-<slug>-v2.html` (at `/offsite/insights/<slug>.html`) with `insights-v2.css` and `insights-v2.js`; the old files in `offsite/insights/` are the rollback. `round/` is The Round and has its own folder.

One address per page. Canonical URLs are the clean public addresses on www.kuma.partners (the primary domain in Netlify; the apex and kumapartners.eu 301 to it), with no `.html` except the offsite partners page and the insight articles, which keep their original addresses. The storage names (`*-v2.html`) and the `.html` forms 301 to the clean address in `_redirects`, so `robots.txt` does not block them (crawlers must see the redirect). A new page needs its 301 lines, its two 200 rewrite lines, a `sitemap.xml` entry and a clean canonical. Never add a 301 from `/index.html` to `/` (same-path loop risk).

The old pages (`index.html`, `friction-scan.html`, `alignment-sprint.html`, `privacy.html`, `legal.html`, `partners.html`, `KOS.html`, `leadership-friction-scan.html`, `coordination-tax.html`, `cofounder-alignment.html`, `styles.css`, `site.js`, `new.html`, `offsite/index.html`, `offsite/partners.html`) are kept only for rollback and are not served. To roll one page back, delete its two lines in `_redirects`.

Still on the old design: `offsite/insights/*`, `offsite/configurator.html` (use `offsite/styles.css`), `execution-diagnostic.html`, `ai-or-human.html`, `constellr-review.html`, `next-offsites.html`, `success.html`.

## The landing page is locked

These files are the landing page and its design system. A task that is not about the landing page never edits them:

- `index-v2.html`
- `index-v2.css`
- `index-v2.js`
- `kuma.css`

`design-lock.json` holds their hashes. Before every zip, run:

    node tools/check-design-lock.mjs

If it prints FAIL, the zip must not go out. The only time these files change is a task that is explicitly about the landing page. In that case, make the change, check the page by eye, then run `node tools/check-design-lock.mjs --update` and ship the new `design-lock.json` in the same zip.

## Building a new page

1. Start from `partners-v2.html` or `legal-v2.html`: they carry the header, overlay menu, footer, scan and debrief dialogs and cookie banner as sliced from `index-v2.html`. Load order is `kuma.css`, `index-v2.css`, then the page css.
2. Name it `<page>-v2.html`, add the two lines to `_redirects` (`/<page>` and `/<page>.html`, 200!), add the storage name to `robots.txt`, add the page to `sitemap.xml`, and set the canonical to the public address.
3. Page css and js go in their own files. Never edit the shared rules.
4. A new page that wants the old tool look inside the new shell uses `kuma-shell.css` as the suite pages do.
5. Header and footer markup stay identical to the landing page. Adding a page to the nav or footer is a landing page change and is delivered on its own.
6. Forms: Netlify detects them at deploy time. Names must stay the same across pages that share a form (`contact`, `friction-scan`, `partner-debrief`), with identical field names, because the functions `submission-created` and `nurture-sweep` read them. Honeypots are `bot-field` and `company_tax_id`.
7. Copy: British spelling, no serial comma, no em dashes (comments included), sentence case for headings, labels and buttons. No bold-label formatting in running prose. Sven and Vincent are both Founding Partners.

## Before a zip leaves

- `node tools/check-design-lock.mjs` passes.
- The zip holds only the files that changed, plus a separate list of deletions.
- Say which repo and folder to push to. For this site that is the root of sven353/kumapartners.
- Look at the page at 1280px and 390px.

## Other sites in this repo

`round/` is The Round by Kuma Partners (at `/round/`; theround.kuma.partners and `/the-round/` 301 here). Its pages use only files inside the folder, with absolute `/round/...` paths, one shared `round.css` and one `round.js`. Its member ledger is a separate Netlify project at ledger.kuma.partners, code in the private repo sven353/theround. Never copy ledger code, functions or ledger data into this public repo.

There is no Spanish site. `/es` and `/es/*` 301 to the home page.
