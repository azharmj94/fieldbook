// Push subscription API for Fieldbook reminders.
//   GET    /api/push/key   -> { key } VAPID public key for the browser
//   POST   /api/push       -> save { subscription, quiet, tz }
//   DELETE /api/push       -> remove { endpoint }
//   POST   /api/push/test  -> send one test reminder to { endpoint }
import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { createHash } from "node:crypto";

const MAX_SUBS = 20;
const store = () => getStore({ name: "push-subs", consistency: "strong" });
const keyFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");
const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });

// The app itself is served from GitHub Pages, so allow that origin to call this API.
const ALLOWED_ORIGINS = ["https://azharmj94.github.io"];
function withCors(req: Request, res: Response) {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "content-type");
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.append("Vary", "Origin");
  }
  return res;
}

function okEndpoint(e: unknown): e is string {
  if (typeof e !== "string" || e.length > 1000) return false;
  try {
    const u = new URL(e);
    return u.protocol === "https:" && /(^|\.)(push\.apple\.com|googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}
// A real browser subscription carries a 65-byte P-256 public key (starts with 0x04) and a 16-byte auth secret.
// Rejecting anything else stops junk entries that could never receive a push from filling the device slots.
function okKeys(k: any) {
  const bytes = (v: unknown) => { if (typeof v !== "string" || v.length > 200 || !/^[A-Za-z0-9_-]+=*$/.test(v)) return null; return Buffer.from(v, "base64url"); };
  const p = bytes(k?.p256dh), a = bytes(k?.auth);
  return !!p && p.length === 65 && p[0] === 4 && !!a && a.length === 16;
}
function cleanQuiet(q: any) {
  const h = (v: any, d: number) => (Number.isInteger(v) && v >= 0 && v <= 23 ? v : d);
  return { on: q?.on !== false, start: h(q?.start, 22), end: h(q?.end, 7) };
}
function cleanTz(tz: any) {
  if (typeof tz !== "string" || tz.length > 64) return "Asia/Kuala_Lumpur";
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return "Asia/Kuala_Lumpur"; }
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return withCors(req, new Response(null, { status: 204 }));
  return withCors(req, await handle(req));
};

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY");
  if (url.pathname.endsWith("/key")) {
    if (!pub) return bad("Reminders are not set up on the server yet.", 503);
    return Response.json({ key: pub });
  }
  let body: any;
  try { body = await req.json(); } catch { return bad("Expected JSON."); }

  if (req.method === "DELETE") {
    if (!okEndpoint(body?.endpoint)) return bad("Unknown subscription.");
    await store().delete(keyFor(body.endpoint));
    return Response.json({ ok: true });
  }

  if (url.pathname.endsWith("/test")) {
    if (!okEndpoint(body?.endpoint)) return bad("Unknown subscription.");
    const rec: any = await store().get(keyFor(body.endpoint), { type: "json" });
    if (!rec) return bad("This device is not subscribed.", 404);
    webpush.setVapidDetails(Netlify.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", pub!, Netlify.env.get("VAPID_PRIVATE_KEY")!);
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify({ title: "Fieldbook", body: "Test reminder: notifications are working.", url: "/#calendar", tag: "fieldbook-test" }), { TTL: 600 });
      return Response.json({ ok: true });
    } catch (e: any) {
      return bad("Push service refused: " + (e?.statusCode || e?.message || "error"), 502);
    }
  }

  const sub = body?.subscription;
  if (!sub || !okEndpoint(sub.endpoint) || !okKeys(sub.keys)) return bad("Invalid subscription.");
  const s = store(), k = keyFor(sub.endpoint);
  const existing = await s.get(k);
  if (!existing) {
    const { blobs } = await s.list();
    if (blobs.length >= MAX_SUBS) return bad("Too many devices are subscribed.", 429);
  }
  await s.setJSON(k, {
    subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    quiet: cleanQuiet(body.quiet),
    tz: cleanTz(body.tz),
    updated: Date.now(),
  });
  return Response.json({ ok: true });
}

export const config: Config = {
  path: ["/api/push", "/api/push/key", "/api/push/test"],
  method: ["GET", "POST", "DELETE", "OPTIONS"],
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 30 },
};
