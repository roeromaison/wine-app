"""FastAPI アプリのエントリポイント。

起動（個人版）:
    cd backend
    .venv\\Scripts\\uvicorn app.main:app --reload

起動（公開版のローカル確認）:
    set WINE_APP_MODE=public
    .venv\\Scripts\\uvicorn app.main:app --port 8001
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import ALLOWED_ORIGINS, IS_PUBLIC, MODE, STATIC_DIR
from .database import init_db
from .routers import analysis, imports, meta, notes, recommend


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 公開版は記録を保存しないので、DBファイルを作らない。
    if not IS_PUBLIC:
        init_db()
    yield


app = FastAPI(
    title="Wine Tasting Notes API",
    version="0.2.0",
    lifespan=lifespan,
)

# 公開版は画面を別ホストに置くため、APIから見ると別オリジンからの呼び出しになる。
# 許可するオリジンは config.py 側で決めている。
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(analysis.router)
app.include_router(recommend.router)
app.include_router(imports.router)

# 記録CRUDは個人版だけ。公開版で開けておくと「誰でも書き込める共有DB」になってしまう。
if not IS_PUBLIC:
    app.include_router(notes.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "mode": MODE}


# ビルド済みフロントの配信。WINE_APP_STATIC_DIR が指定されているときだけ有効。
# API のルーティングを奪わないよう、必ず最後に登録する。
if STATIC_DIR:
    static_path = Path(STATIC_DIR)
    if static_path.is_dir():
        app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
