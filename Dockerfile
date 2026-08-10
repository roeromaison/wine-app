# 公開版（WINE_APP_MODE=public）を1つのコンテナで動かす。
#
# React をビルドして静的ファイルにし、それを FastAPI 自身が配信する。
# フロントとAPIが同一オリジンになるので CORS 設定が要らず、
# デプロイ先も1サービスで済む。

# ---- 1. フロントのビルド ----
FROM node:22-slim AS frontend

WORKDIR /build

# 依存関係だけ先に入れる。ソースを変えてもここのレイヤーは再利用される。
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# 公開版としてビルドする。記録はブラウザに保存され、サーバーには送られない。
ENV VITE_APP_MODE=public
RUN npm run build

# ---- 2. バックエンド ----
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

# ビルド済みフロントを配信対象として置く
COPY --from=frontend /build/dist ./static

ENV WINE_APP_MODE=public \
    WINE_APP_STATIC_DIR=/app/static \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# ホスティング側が $PORT を渡してくる場合に備える（Render・Railway など）
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
