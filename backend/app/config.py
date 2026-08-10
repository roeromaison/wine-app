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

# 公開版で React のビルド成果物を FastAPI 自身が配信するときの置き場所。
# 未設定なら配信しない（開発中は Vite の開発サーバを使うため）。
STATIC_DIR = os.environ.get("WINE_APP_STATIC_DIR", "").strip()
