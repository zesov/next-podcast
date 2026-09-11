/* PWA App Shell Service Worker（手写，零依赖）
 * 策略：
 * - navigation (HTML)      → network-first，断网 fallback 到最近缓存的 shell
 * - /_next/static/*        → cache-first + 后台 revalidate
 * - image (远程封面/logo)  → cache-first，LRU 上限 200 张
 * - /api/*                 → network-only（动态数据不缓存）
 * - 媒体流/iframe          → 不拦截（仅响应上面三类）
 */
const CACHE_NAME = "app-shell-v1";
const IMAGE_CACHE = "images-v1";
const IMAGE_MAX = 200;

self.addEventListener("install", () => {
  // 新 SW 立即接管，避免旧版需多次刷新才更新
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== IMAGE_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API 动态数据：绝不缓存
  if (url.pathname.startsWith("/api/")) return;

  // App Shell 核心：HTML 导航 network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // 同源静态资源：cache-first + 后台 revalidate
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staticCacheFirst(request));
    return;
  }

  // 图片：cache-first + LRU
  if (request.destination === "image") {
    event.respondWith(imageCacheFirst(request));
    return;
  }
  // 其余（媒体流、iframe、音频等）默认放行
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await cache.match("/zh")); // fallback：断网打开应用外壳
    if (cached) return cached;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function staticCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    // 后台刷新（hash 文件名保证内容不变，仅保新鲜）
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function imageCacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await trimImageCache(cache);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response("", { status: 504 });
  }
}

async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length >= IMAGE_MAX) {
    await Promise.all(
      keys.slice(0, keys.length - IMAGE_MAX + 1).map((key) => caches.delete(key)),
    );
  }
}