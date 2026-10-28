# www.kuma.partners: design rules for every task

Static site, no build step. Pushed by hand (GitHub web upload), `main` deploys to production.

## The landing page is locked

These three files are the landing page and its design system. A subpage task never edits them:

- `index.html`
- `styles.css`
- `site.js`

`design-lock.json` holds their hashes. Before every zip, run:

    node tools/check-design-lock.mjs

If it prints FAIL, the zip must not go out. The only time these files change is a task that is explicitly about the landing page. In that case, make the change, check the page by eye, then run `node tools/check-design-lock.mjs --update` and ship the new `design-lock.json` in the same zip.

Why this is enough: the landing page loads only `styles.css` and `site.js`. A page stylesheet or script that the landing page does not load cannot change it.

## Building a subpage

1. Copy `templates/subpage-skeleton.html` to `<page>.html` and `templates/subpage-skeleton.css` to `<page>.css`. Replace PAGE with the page name. The skeleton already carries the landing header, footer, fonts and tokens.
2. Load order is `styles.css`, then `<page>.css`. Nothing else is copied from `styles.css`.
3. Every selector in `<page>.css` starts with `body.<page>` or a class that starts with the page name. No bare elements (`section`, `h1`, `a`, `body`, `*`), no `:root`, no redefining a token, no `!important` to beat a landing rule. The exception is `@media print`.
4. Use the tokens, never fresh hex values: `--navy`, `--teal`, `--teal-on-dark`, `--cream`, `--ink`, `--slate`, `--hairline-color`, `--hairline-subtle`, `--radius-xs` to `--radius-lg`, `--radius-xl`, `--radius-card`, `--radius-inset`, `--card-sheen`, `--shadow-card-subtle`, `--shadow-card-hover`, `--ramp-chalk`, `--ramp-white`, `--ramp-inverse`, `--bg-dark-ambient`, `--footer-dark`.
5. Reuse the landing classes as they are (`.wrap`, `.eyebrow`, `.btn`, `.btn-primary`, `.btn-secondary`, `.section-head`, `.hero`). To vary one, add a page class on top. Never edit the shared rule.
6. Cadence: light sections alternate white and chalk, each a soft vertical ramp. Dark anchors (`--bg-dark-ambient`) only for the main conversion block. Sections pad 96px (64px on phones). Every border is 1px. Cards are white with a 1px `--hairline-color` border, radius `--radius-card` (8px, same as The Round) and `--shadow-card-subtle` (one soft ambient shadow, no layered or coloured shadows). Buttons keep `--radius-xs`. Avoid pills: use the dash label or a small mono tag. A filled pill is only for something special (for example Recommended entry point). Every border is 1px. The one thing above 1px is the title bar before every eyebrow: 28px wide, 2px tall (`--bar-w`, `--bar-h`), aligned to the text baseline so it sits on the middle of the capitals (`.eyebrow::before`).
7. Header and footer markup stay identical to the landing page. Adding a page to the nav or footer is a landing page change and is delivered on its own.
8. Page behaviour goes in its own script file. `site.js` is not edited.
9. Copy: British spelling, no serial comma, no em dashes (comments included), sentence case for headings, labels and buttons. No bold-label formatting in running prose.

## Before a zip leaves

- `node tools/check-design-lock.mjs` passes.
- The zip holds only the files that changed, plus a separate list of deletions.
- Say which repo and folder to push to. For this site that is the root of sven353/kumapartners.
- Look at the page at 1280px and 390px, and open the landing page once to confirm it looks the same.

## Diagnostic suite pages

`/KOS`, `/leadership-friction-scan`, `/coordination-tax` and `/cofounder-alignment` also load `suite.css`, scoped to `body.suite`. Its corners, hairlines and shadows now use the same tokens as the landing page (8px, `--hairline-color`, `--shadow-card-subtle`). New pages follow the landing rules above, not `suite.css`, unless the task says it is a suite page.

## Other sites in this repo

`offsite/`, `es/` and `the-round/` have their own stylesheets. Do not change them in a landing or subpage task.

`the-round/` is The Round by Kuma Partners (moved here on 28 Oct 2026 from theround.kuma.partners, which now redirects). Its pages use only files inside the folder, with absolute `/the-round/...` paths. Its member ledger is a separate Netlify project at ledger.kuma.partners, code in the private repo sven353/theround. Never copy ledger code, functions or ledger data into this public repo. Not linked from the landing page yet, on purpose.

## Fonts

Montserrat and Lato are self-hosted from `assets/fonts` (woff2, SIL OFL), declared at the top of `styles.css`. Do not add Google Fonts links to a page that loads `styles.css`.
