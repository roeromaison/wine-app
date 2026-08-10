"""アプリの動作モード。

環境変数 WINE_APP_MODE で切り替える。

- "personal"（既定）… 自分専用。記録は SQLite に保存し、記録CRUD APIを提供する
- "public"          … 一般公開デモ。サーバーは記録を一切保存しない。
                      記録は訪問者のブラウザ（localStorage）にあり、
                      分析のたびにクライアントから送られてくる

公開版で記録CRUDを閉じているのは、開けておくと「誰でも書き込める共有DB」に
なってしまい、訪問者同士の記録が混ざるうえ荒らしの対象にもなるため。
"""

import os

MODE = os.environ.get("WINE_APP_MODE", "personal").strip().lower()

if MODE not in ("personal", "public"):
    raise RuntimeError(
        f"WINE_APP_MODE は personal か public を指定してください（指定値: {MODE}）"
    )

IS_PUBLIC = MODE == "public"
IS_PERSONAL = MODE == "personal"

# React のビルド成果物を FastAPI 自身が配信するときの置き場所。
# 画面を静的ホスティングに分けた構成では使わない（未設定にしておく）。
STATIC_DIR = os.environ.get("WINE_APP_STATIC_DIR", "").strip()

# ブラウザから直接叩かれるAPIなので、どのサイトからの呼び出しを許すかを指定する。
# カンマ区切り。未設定なら公開版は全許可（"*"）。
#
# 全許可を既定にしているのは、このAPIが認証もCookieも持たず、
# 保存しているデータも無いため。CORSが本来守る「ログイン中の利用者に
# なりすまして操作される」という危険が、そもそも成立しない。
# 他サイトからの利用を締め出したい場合だけ、画面のURLを明示的に設定する。
_origins = os.environ.get("WINE_APP_ALLOWED_ORIGINS", "").strip()

DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

if _origins:
    ALLOWED_ORIGINS = [o.strip() for o in _origins.split(",") if o.strip()]
elif MODE == "public":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = DEV_ORIGINS
