/**
 * Service Worker لتطبيق قائمة المهام
 * إصدار الكاش: v3
 * الاستراتيجية: 
 *  - محاولة جلب الرد من الشبكة وتحديث الكاش.
 *  - في حال عدم توفر الشبكة، يتم استرجاع الرد من الكاش.
 *  - تقديم صفحة offline عند طلب التنقل في حالة عدم توفر الرد.
 */

const CACHE_NAME = 'todo-app-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html' // صفحة تُعرض عند عدم توفر الإنترنت
  // يمكنك إضافة ملفات أخرى (مثل CSS، JS، الصور، الأيقونات) هنا
];

// حدث التثبيت: تخزين جميع الملفات الأساسية في الكاش
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all assets');
        return cache.addAll(ASSETS);
      })
      .catch(err => console.error('[Service Worker] Error during installation:', err))
  );
});

// حدث التفعيل: حذف الكاش القديم وتفعيل SW فوراً
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// حدث fetch: التعامل مع الطلبات باستخدام استراتيجية "شبكة أولاً مع fallback إلى الكاش"
self.addEventListener('fetch', event => {
  // نتعامل فقط مع الطلبات من نوع GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // في حال نجاح الطلب من الشبكة، نقوم بتحديث الكاش
        return caches.open(CACHE_NAME)
          .then(cache => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
      })
      .catch(() => {
        // في حال عدم توفر الشبكة، نحاول جلب الرد من الكاش
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            // إذا كان الطلب للتنقل (Navigation)، نقدم صفحة offline
            if (event.request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
          });
      })
  );
});
