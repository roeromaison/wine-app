// サービスワーカー。ホーム画面から開いたときに、電波が悪くても画面が出るようにする。
//
// 方針は2つだけ。
//
//   画面の移動（ナビゲーション）… ネットワーク優先。失敗したらキャッシュ
//   ビルド済みのファイル（/assets/…）… キャッシュ優先
//
// ナビゲーションをネットワーク優先にしているのは、**古い画面が居座らない**ため。
// キャッシュ優先にすると、更新したのに何日も前の画面が出続けることがある。
// /assets/ のファイル名にはビルドごとのハッシュが入っていて中身が変わらないので、
// そちらはキャッシュ優先で問題ない。
//
// 分析APIへの通信はキャッシュしない。計算結果は記録によって変わるため。

const CACHE = "wine-app-v1";

// 最低限これだけあれば、オフラインでも記録画面は開ける。
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // フォントや分析APIは素通し

  // 画面の移動：ネットワーク優先
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ビルド済みファイル：キャッシュ優先
  if (url.pathname.startsWith("/assets/") || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});
