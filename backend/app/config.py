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


# ---- 提案機能（おすすめタブ）の購入リンク ----
#
# 未設定でも機能は動く。その場合はアフィリエイトではない、ただの検索リンクになる。
# ID を設定して初めて成果が発生する形にしてあるので、
# 「設定を忘れたまま公開して機会損失」と「ID をコードに直書き」の両方を避けられる。
#
#   WINE_APP_AMAZON_TAG            … AmazonアソシエイトのトラッキングID（例 maison0d-22）
#   WINE_APP_RAKUTEN_LINK_TEMPLATE … 楽天アフィリエイトのリンク。検索語の位置を {q}
#                                    （または {qq}）と書く
#
# 楽天をテンプレート形式にしているのは、楽天のリンク書式が
# 管理画面で発行されるものに依存するため。発行されたURLの検索語部分を
# 置き換えて丸ごと入れれば、書式が変わっても対応できる。
#
# 置き換え記号が2つあるのは、楽天のリンクが「URLの中に別のURLを入れる」
# 形をしているため:
#
#   https://hb.afl.rakuten.co.jp/ichiba/<ID>/?pc=<検索URLをURLエンコードしたもの>
#
# pc= の中身は丸ごとエンコードされているので、その中に置く検索語は
# **二重にエンコード**しないと日本語が壊れる。
#
#   {q}  … 1回エンコード（URLにそのまま置くとき）
#   {qq} … 2回エンコード（他のURLのパラメータの中に入れるとき）
AMAZON_TAG = os.environ.get("WINE_APP_AMAZON_TAG", "").strip()
RAKUTEN_LINK_TEMPLATE = os.environ.get("WINE_APP_RAKUTEN_LINK_TEMPLATE", "").strip()

HAS_AFFILIATE = bool(AMAZON_TAG or RAKUTEN_LINK_TEMPLATE)

# ステマ規制（2023年10月〜）対応。アフィリエイトリンクを出す画面には
# 広告であることの表示が要る。note記事だけでなくアプリ内にも必要なので、
# APIのレスポンスに含めて画面に必ず出るようにしている。
AFFILIATE_DISCLOSURE = (
    "※ 購入リンクは Amazon・楽天市場のアフィリエイトリンクです。"
    "リンク経由で購入されると、運営者に紹介料が入ります。"
)
SEARCH_DISCLOSURE = "※ 購入リンクは各ECサイトの検索結果を開きます。"

# Amazonアソシエイト運営規約が別途求めている表記。
# ステマ規制の開示とは根拠が違うので、文面も分けてある。
# 規約は「乙の名称」（＝サイト名）を入れることを求めている。
SITE_NAME = os.environ.get(
    "WINE_APP_SITE_NAME", "ワインをデータで飲んでいます"
).strip()
AMAZON_ASSOCIATE_STATEMENT = (
    f"Amazonのアソシエイトとして、「{SITE_NAME}」は適格販売により収入を得ています。"
)
