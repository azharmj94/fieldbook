/* Offline support for your own hosting (not used inside Claude). */
const CACHE='fieldbook-v3';
const SHELL=['./','index.html','pdf-lib.min.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'];
const LIBS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url),own=url.origin===self.location.origin,lib=LIBS.includes(url.hostname);if(!own&&!lib)return;
 const keep=res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(CACHE).then(x=>x.put(req,c)).catch(()=>{})}return res};
 if(lib)e.respondWith(caches.match(req).then(h=>h||fetch(req).then(keep)));
 else e.respondWith(fetch(req).then(keep).catch(()=>caches.match(req,{ignoreSearch:true}).then(h=>h||(req.mode==='navigate'?caches.match('index.html'):Response.error()))))});

/* Push reminders */
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data&&e.data.text()}}
 e.waitUntil(self.registration.showNotification(d.title||'Fieldbook',{body:d.body||'Time to log your tasks.',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||'fieldbook-reminder',renotify:true,data:{url:d.url||'/#calendar'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'/',self.location.origin).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if('focus' in w){w.navigate&&w.navigate(url).catch(()=>{});return w.focus()}}return clients.openWindow(url)}))});
