# 公開版のデプロイ手順

公開版（`WINE_APP_MODE=public`）をインターネット上に置く手順。

## 何が公開されるのか

- ビルドした React の画面
- 分析API（PCA・クラスター・ヒートマップ）と、ファイル解析API
- デモ用サンプル 80件（`frontend/public/sample-notes.json`）

**公開されないもの**

- あなたの `backend/wine.db`（個人版のDB。コンテナに含めていない）
- 商品名・価格・購入先・メモ・日付（サンプル生成時に落としている）
- 記録CRUD API（公開版では読み込まないので存在しない）

訪問者の記録はその人のブラウザにだけ残り、サーバーには保存されない。
つまり**サーバー側に個人データが一切溜まらない**構成になっている。
だからDBも要らず、無料枠のホスティングでそのまま動く。

## 事前に必要なもの

- GitHub アカウントとこのコードを置いたリポジトリ
- ホスティングサービスのアカウント（下記は Render の例）

アカウント作成と支払い情報の登録は、必ずご本人の操作で行ってください。

## Render での手順

1. GitHub にこのリポジトリを push する
2. Render にログインし **New → Web Service**
3. リポジトリを選ぶ
4. 設定を以下にする

   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`（後述の注意あり）

5. **Environment Variables** に以下を追加

   | Key | Value |
   | --- | --- |
   | `WINE_APP_MODE` | `public` |
   | `WINE_APP_STATIC_DIR` | `/app/static` |

   ※ Dockerfile 側でも同じ値を設定しているので、変更しないなら省略しても動く。

6. **Create Web Service**

ビルドが終わると `https://<サービス名>.onrender.com` が発行される。これが公開URL。

## 無料プランの注意

Render の無料プランは、**15分アクセスがないとスリープする**。次のアクセスで
起きるまで50秒ほど白い画面が続く。記事から飛んできた読者がこれを待つとは
限らないので、記事公開の直前に一度アクセスして起こしておくとよい。

常時起きていてほしい場合は有料プラン（月7ドル程度）にする。
公開版はDBを持たないので、有料にしても**ディスク（永続ストレージ）は不要**。

## ローカルで本番と同じ構成を確認する

デプロイ前に手元で確認できる。Docker は要らない。

```powershell
cd C:\Users\User\Documents\wine-app\frontend
$env:VITE_APP_MODE = "public"
npm.cmd run build
```

```powershell
cd C:\Users\User\Documents\wine-app\backend
$env:WINE_APP_MODE = "public"
$env:WINE_APP_STATIC_DIR = "C:\Users\User\Documents\wine-app\frontend\dist"
.venv\Scripts\python -m uvicorn app.main:app --port 8002
```

`http://127.0.0.1:8002` を開くと、公開版と同じ状態になる。

## サンプルデータを作り直す

実記録を更新したあと、デモ用サンプルを作り直す場合。

```powershell
cd C:\Users\User\Documents\wine-app\backend
.venv\Scripts\python scripts\build_sample.py "C:\Users\User\Documents\wine-notes\data\wine_log.csv"
```

商品名は連番に置き換わり、価格・購入先・メモ・日付・ヴィンテージ・
アルコール度数などは落とされる。残るのは香味13項目、総合評価、
また買いたい度、そして産地・品種だけ。

産地と品種を残しているのは、これらが無いとヒートマップ（産地×品種）が
成立せず、PCAの色分けも全て「未入力」になってしまうため。これらはワイン側の
属性であって、飲んだ人の情報ではない。

## 個人版はこれまで通り

公開版を作っても、手元の個人版は影響を受けない。

```powershell
cd C:\Users\User\Documents\wine-app\backend
.venv\Scripts\uvicorn app.main:app --reload
```

```powershell
cd C:\Users\User\Documents\wine-app\frontend
npm.cmd run dev
```

`http://localhost:5173` が個人版。記録は `backend/wine.db` に保存される。
