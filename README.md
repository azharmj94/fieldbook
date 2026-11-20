# Fieldbook (PWA)

Engineering work journal, installable as an app, with a push reminder every 4 hours.

- `public/` - the app (index.html, service worker, manifest, icons), published to GitHub Pages at
  https://azharmj94.github.io/fieldbook/ by `.github/workflows/pages.yml` on every push to `main`
- The reminder API below still runs as Netlify functions on `fieldbook-azhar.netlify.app`; the app calls it
  cross-origin (CORS allows `https://azharmj94.github.io`). Nobody needs to open the Netlify site itself.
- `netlify/functions/push.mts` - saves this device's push subscription (`/api/push`)
- `netlify/functions/remind.mts` - scheduled every 4 hours (`0 */4 * * *` UTC = 08, 12, 16, 20, 00, 04 Malaysia time); skips devices inside their quiet hours (default 22:00-07:00)

Needs these environment variables on the Netlify project (already set on `fieldbook-azhar`):
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

On iPhone: open https://azharmj94.github.io/fieldbook/ in Safari, Share > Add to Home Screen, open Fieldbook from the icon,
then Settings > Task Reminders > Turn reminders on.

## BEM evidence (Route A, outcome-based PAE)

- In a task, switch on **BEM entry** to record the competence elements it is evidence for (A1-D3, plus E1-E5 for the
  written exam), your role level (Participating, Contributing or Leading), "My decision and why", "Outcome",
  codes and standards, and evidence links (links only, e.g. Google Drive). "Suggest from pillars" ticks likely
  elements from the pillar split.
- The **BEM** page shows each element's entries, highest role, latest date and words of material against the
  300-500 word narrative target, flags gaps, and exports a PDF or plain text to draft the Training & Experience Report.
- Every task field must also be listed in `normalize()` in `public/index.html`, or it is dropped on save and sync.
