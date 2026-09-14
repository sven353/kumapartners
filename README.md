# Kuma Sanctuary landing pages

Two static pages promoting the Kuma Sanctuary CEO retreats:

- `index.html` — the Austria edition, 15-18 October 2026 (the primary/flagship page)
- `next-offsites.html` — upcoming editions, featuring Mallorca, 12-20 November 2026
- `success.html` — thank-you page after a form submission

No build step. No framework. Plain HTML, one CSS file, brand fonts loaded from Google Fonts. This is deliberate: fewer moving parts to break on Netlify, and it matches the "quiet luxury, no gimmicks" brand tone with typography and geometry rather than stock photography.

## Deploying on Netlify via GitHub

1. Push this folder to a new GitHub repository (e.g. `kuma-sanctuary`).
2. In Netlify: **Add new site > Import an existing project > GitHub**, select the repo.
3. Build settings: leave the build command empty and set the publish directory to `.` (the repo root). `netlify.toml` already has this configured, so Netlify should pick it up automatically.
4. Deploy. Netlify detects the two `<form name="sanctuary-application">` forms automatically at deploy time because they're static HTML with the `data-netlify="true"` attribute — no JavaScript or Netlify Functions needed.
5. In Netlify's dashboard, go to **Forms** and confirm `sanctuary-application` appears. Set up a notification (email, Slack, or Zapier) so submissions reach you immediately, since the page doesn't do this on its own.
6. Point your domain (or a subdomain, e.g. `sanctuary.kuma.partners`) at the Netlify site under **Domain settings**.

## Editing the content

Everything is plain text inside the two page files, so you (or anyone) can edit copy directly in GitHub without touching code:

- Dates, location, and cohort size live in the `.hero-meta` block near the top of each page.
- The venue is currently a placeholder ("a private estate in the Austrian Alps" / "Mallorca's coast"). Replace with the actual venue name once confirmed, if you want to name it.
- The testimonial quote in the "Cohort" section is a placeholder and should be replaced with a real one (attributed generically, e.g. "Chief Executive, venture-backed technology company," to preserve the confidentiality tone) as soon as you have one from a past participant.
- Both forms submit to Netlify Forms and redirect to `success.html`. A hidden `cohort` field tags each submission so you can tell Austria and Mallorca requests apart in the Netlify dashboard.

## Adding a third edition later

Duplicate `next-offsites.html`'s card pattern (`.retreat-card`) for a new location, and add a new hidden `cohort` value to that page's form so submissions stay distinguishable. When an edition closes, change its `.retreat-card` from `is-open` to a closed state and swap the button for a "Cohort confirmed" label instead of removing the card, so the page keeps showing the program's cadence.

## What's intentionally not here

No pricing anywhere on the page, no countdown timers, no stock photography, no chatbot or third-party embeds. All in keeping with the brand brief: invite-only positioning depends on the page never reading like a sales funnel.
