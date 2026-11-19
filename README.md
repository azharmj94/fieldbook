# Fieldbook (Netlify PWA)

Engineering work journal, installable as an app, with a push reminder every 4 hours.

- `public/` - the app (index.html, service worker, manifest, icons)
- `netlify/functions/push.mts` - saves this device's push subscription (`/api/push`)
- `netlify/functions/remind.mts` - scheduled every 4 hours (`0 */4 * * *` UTC = 08, 12, 16, 20, 00, 04 Malaysia time); skips devices inside their quiet hours (default 22:00-07:00)

Needs these environment variables on the Netlify project (already set on `fieldbook-azhar`):
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

On iPhone: open the site in Safari, Share > Add to Home Screen, open Fieldbook from the icon,
then Settings > Task Reminders > Turn reminders on.
