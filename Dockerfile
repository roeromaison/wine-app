# 公開版のAPIサーバー（WINE_APP_MODE=public）。
#
# 画面（React）はここには含めない。静的ホスティング側に置いてあるので、
# このコンテナは分析APIとファイル解析APIだけを提供する。
# フロントのビルドが不要になった分、デプロイも速い。

FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

ENV WINE_APP_MODE=public \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# ホスティング側が $PORT を渡してくる場合に備える（Render・Railway など）
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
