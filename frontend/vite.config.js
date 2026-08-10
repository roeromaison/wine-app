import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// /api を FastAPI に転送する。フロント側は常に同一オリジンの相対パスで呼べるので、
// 本番(FastAPI がビルド成果物を配信する構成)に載せ替えてもコードは変わらない。
//
// 個人版と公開版を同時に立ち上げて見比べられるよう、転送先とポートは環境変数で
// 差し替えられるようにしてある:
//   VITE_API_TARGET … バックエンドのURL (既定 http://127.0.0.1:8000)
//   VITE_APP_MODE   … personal | public (public だと記録をブラウザに保存する)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
