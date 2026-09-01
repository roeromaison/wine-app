import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// サービスワーカーの登録。ホーム画面に追加したときに、電波が悪くても
// 画面が出るようにするためのもの。開発中（vite dev）は登録しない。
// 古いキャッシュが残って「直したのに変わらない」が起きるのを避ける。
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録できなくてもアプリは普通に動く。オフラインで開けないだけ。
    });
  });
}
