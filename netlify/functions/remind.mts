// Scheduled reminder: every 4 hours (00, 04, 08, 12, 16, 20 UTC =
// 08, 12, 16, 20, 00, 04 Malaysia time). Devices with quiet hours on
// (default 22:00-07:00 in their own time zone) skip the night ones.
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

function inQuiet(q: { on: boolean; start: number; end: number }, tz: string, now = new Date()) {
  if (!q?.on) return false;
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
  return q.start <= q.end ? h >= q.start && h < q.end : h >= q.start || h < q.end;
}

export default async () => {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) { console.log("VAPID keys missing"); return; }
  webpush.setVapidDetails(Netlify.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", pub, priv);
  const store = getStore({ name: "push-subs", consistency: "strong" });
  const { blobs } = await store.list();
  let sent = 0, skipped = 0, removed = 0;
  for (const { key } of blobs) {
    const rec: any = await store.get(key, { type: "json" });
    if (!rec?.subscription) continue;
    if (inQuiet(rec.quiet, rec.tz || "Asia/Kuala_Lumpur")) { skipped++; continue; }
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify({
        title: "Fieldbook",
        body: "Time to log your tasks: what did you work on in the last 4 hours?",
        url: "/#calendar",
        tag: "fieldbook-reminder",
      }), { TTL: 3 * 3600, urgency: "normal" });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) { await store.delete(key); removed++; }
      else console.log("push failed", e?.statusCode, e?.body || e?.message);
    }
  }
  console.log(`reminders sent=${sent} quiet=${skipped} removed=${removed}`);
};

export const config: Config = { schedule: "0 */4 * * *" };
