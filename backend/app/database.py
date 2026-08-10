"""SQLite への接続とセッション管理。

DB ファイルの場所は WINE_APP_DB 環境変数で差し替えられる。
既定は backend/wine.db（リポジトリ直下ではなくアプリ配下）に置く。
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "wine.db"

DB_PATH = Path(os.environ.get("WINE_APP_DB", DEFAULT_DB_PATH))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False は FastAPI が複数スレッドからセッションを使うため必要。
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401  テーブル定義を登録するために import する

    Base.metadata.create_all(bind=engine)
