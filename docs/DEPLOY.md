# 公開版を世に出す手順（はじめての方向け）

プログラミング経験を前提にしない書き方にしています。上から順にやれば終わります。
所要時間はだいたい40分〜1時間、費用は0円です。クレジットカードも要りません。

---

## 0. 全体像

あなたのPCの中にあるアプリを、他の人が見られる場所に移します。

```
                                    ┌→ Vercel  … 画面（常に一瞬で表示）
あなたのPC →（アップロード）→ GitHub ┤
                                    └→ Render  … 分析API（初回だけ起動待ち）
```

- **GitHub** … コードの置き場所。無料のWebサービス
- **Vercel** … 画面を配信する。無料。**眠らないので待ち時間ゼロ**
- **Render** … 分析の計算をするサーバー。無料枠あり

なぜ GitHub が要るのか、と思われるかもしれません。Vercel も Render も
「あなたのPC」を直接見に来ることができないため、いったんコードをネット上の
置き場（GitHub）に上げる必要がある、というだけの話です。

### なぜ画面とAPIを分けるのか

Render の無料プランは15分アクセスがないと眠り、次の訪問者は起動を1分ほど
待たされます。画面ごと Render に置くと、**その1分間は真っ白**です。
アプリのファイル自体がまだ届いていないので、「読み込み中」と出すことすらできません。

画面を Vercel に分けると、画面は常に一瞬で出ます。訪問者はすぐ触れて記録も
入力できます。待ちが発生するのは「分析」タブを開いた初回だけで、そのときは
アプリが動いているので **「計算中…」** と表示できます。

### 用語の整理

よく混同されるので先に書いておきます。

- **git** … 変更履歴を記録するソフト。**あなたのPCにすでに入っています**
- **GitHub** … git のデータを預かるWebサービス。**アカウント登録が必要**
- **GitHub Desktop** … GitHub をマウス操作で使えるアプリ。これから入れます

---

## 1. GitHub Desktop を入れる

PowerShell を開いて、次を1行ずつ実行します。

```powershell
winget install --id GitHub.GitHubDesktop -e
```

インストールが終わったら、スタートメニューから **GitHub Desktop** を起動します。

---

## 2. GitHub アカウントを作る

GitHub Desktop の最初の画面に「Sign in to GitHub.com」という項目があります。
アカウントがないので、まず作ります。

1. ブラウザで https://github.com/signup を開く
2. メールアドレス、パスワード、ユーザー名を入力する
   - **ユーザー名は公開されます。** `roero-maison` のように、note と揃えると分かりやすいです
3. 届いたメールの確認コードを入力する

作り終えたら GitHub Desktop に戻り、**Sign in** からログインします。
ブラウザが開いて認証を求められるので、許可してください。

> パスワードの入力はご自身で行ってください。私が代行してはいけない操作です。

---

## 3. コードを GitHub に上げる

準備（git の初期化と初回コミット）は済ませてあります。ここでは
GitHub Desktop でアップロードするだけです。

1. GitHub Desktop のメニューから **File → Add local repository**
2. **Choose...** を押して `C:\Users\User\Documents\wine-app` を選ぶ
3. **Add repository** を押す
4. 画面上部に **Publish repository** というボタンが出るので押す
5. ダイアログの設定

   - **Name**: `wine-app`（好きな名前でかまいません）
   - **Keep this code private**: **チェックを外す**

     > Render の無料プランは公開リポジトリでないと使えません。
     > 外して困るものは入っていないことを、次項で確認済みです。

6. **Publish repository** を押す

数十秒で完了します。

### 公開されるもの・されないもの

念のため確認済みの内容です。

**公開されるもの（47ファイル）**

- アプリのプログラム本体
- デモ用サンプル80件（商品名は「サンプル 01」等の連番。価格・購入先・メモ・日付は削除済み）
- 産地・品種のマスタデータ

**公開されないもの**

- `backend/wine.db` … あなたの実記録80件。`.gitignore` で除外済み
- 商品名・価格・購入先・メモ・飲んだ日付

---

## 4. Render で公開する

1. ブラウザで https://render.com を開く
2. **Get Started** → **GitHub** を選んでログイン

   > ここで GitHub アカウントをそのまま使えます。新しいパスワードは要りません。

3. Render から「リポジトリへのアクセスを許可しますか」と聞かれるので許可する
4. ダッシュボードで **Add new** → **Web Service**
5. さきほど公開した `wine-app` を選ぶ
6. 設定画面で以下を確認・入力する

   - **Name**: 好きな名前（これがURLの一部になります）
   - **Language**: `Docker` を選ぶ
   - **Instance Type**: `Free`

7. 少し下の **Environment Variables** で **Add Environment Variable** を2回押し、次を入れる

   | Key | Value |
   | --- | --- |
   | `WINE_APP_MODE` | `public` |
   | `WINE_APP_STATIC_DIR` | `/app/static` |

8. 一番下の **Deploy Web Service** を押す

画面にログが流れます。5〜10分ほどで `Live` と表示されれば成功です。
画面上部に出ている `https://<名前>.onrender.com` があなたの公開URLです。

---

## 4-B. 画面を Vercel に置く

ここからが「画面とAPIを分ける」作業です。Render での公開が終わっている前提です。

### まず GitHub に最新版を上げる

GitHub Desktop を開くと変更が一覧に出ています。

1. 左下の **Summary** に `画面とAPIを分離` と入力
2. **Commit to master** を押す
3. 上部の **Push origin** を押す

### Vercel に登録して公開する

1. ブラウザで https://vercel.com を開く
2. **Sign Up** → **Continue with GitHub** を選ぶ

   > GitHub アカウントをそのまま使えます。新しいパスワードは要りません。

3. **Add New...** → **Project**
4. `wine-app` の **Import** を押す
5. 設定はそのままでよい（`vercel.json` に書いてあるので自動で読まれます）
6. **Deploy** を押す

1〜2分で完了し、`https://<名前>.vercel.app` が発行されます。
**これが読者に案内する新しい公開URLです。**

### Render 側の後始末（任意）

Render は分析APIだけを担当するようになったので、環境変数
`WINE_APP_STATIC_DIR` はもう使いません。残っていても害はありませんが、
気になるようなら Render の **Environment** から削除してください。

`WINE_APP_MODE` = `public` は**そのまま残してください**。これは必要です。

---

## 5. 公開できたか確認する

**Vercel のURL**（`https://<名前>.vercel.app`）を開いて、次を確認してください。

- 「ワインをデータで飲んでいます」の画面が**すぐに**出る
- 「インポート」タブ → **サンプルを読み込む** で80件入る
- 「分析（PCA）」タブでグラフが出る
   - Render が眠っていた場合、ここで**「計算中…」のまま1分ほど**かかります。
     これは想定どおりの動きです。画面が真っ白にならないことが確認できればOKです
- 「クラスター」「ヒートマップ」も表示される

スマホからも同じURLで開けます。

> 読者に案内するのは **Vercel のURL** です。Render のURL
> （`https://wine-app-hp67.onrender.com`）は裏方なので、記事には載せません。

---

## 6. 無料プランの注意

Vercel（画面）は眠りません。**画面はいつでも一瞬で出ます。**

Render（分析API）は15分アクセスがないと眠ります。眠っているときに
「分析」タブを開くと、起動するまで**1分ほど「計算中…」が続きます**。
真っ白にはならず、何が起きているかは伝わる状態です。

さらに待ち時間をなくしたい場合の選択肢です。

- **記事公開の直前に、自分で一度「分析」タブを開いて起こしておく**（無料・すぐできる）
- 記事に「初回の分析だけ少し時間がかかります」と一言書く（無料）
- Render を有料プラン（月7ドル程度）にする。公開版はデータベースを持たないので、
  有料にしても**永続ストレージは不要**です

## 7. あとから修正したくなったら

コードを直したあとの反映は3ステップです。

1. GitHub Desktop を開く（変更が一覧に出ています）
2. 左下の **Summary** に何をしたか一言書いて **Commit to master**
3. 上部の **Push origin** を押す

Vercel と Render の**両方が自動で気づいて**作り直します。数分待てば反映されます。

### APIのURLが変わったとき

Render のサービス名を変えるなどでAPIのURLが変わったら、
`frontend/.env.production` の `VITE_API_BASE` を書き換えて push してください。
Vercel が自動で作り直します。

---

## うまくいかないとき

**GitHub Desktop に wine-app が出てこない**
→ `File → Add local repository` で `C:\Users\User\Documents\wine-app` を指定し直してください。

**Render のビルドが失敗する**
→ ログの最後の10行を見せていただければ原因を特定します。

**Vercel の画面は出るが、分析タブでエラーが出る**
→ Render 側が眠っていて起動待ちなら、1分ほどで表示されます。
　 それ以上待っても出ない場合は、`frontend/.env.production` の `VITE_API_BASE` が
　 Render の実際のURLと一致しているか確認してください。

**「通信に失敗しました」と出る**
→ Render のサービスが停止していないか、Render のダッシュボードで確認してください。

**Vercel のビルドが失敗する**
→ ログの最後の10行を見せていただければ原因を特定します。

---

## 参考：手元で公開版を動かす

デプロイせずに、公開版と同じ画面を手元で確認できます。
ターミナルを2つ開いて、それぞれで実行してください。

**1つめ（分析API）**

```powershell
cd C:\Users\User\Documents\wine-app\backend
$env:WINE_APP_MODE = "public"
.venv\Scripts\python -m uvicorn app.main:app --port 8001
```

**2つめ（画面）**

```powershell
cd C:\Users\User\Documents\wine-app\frontend
$env:VITE_APP_MODE = "public"
$env:VITE_API_BASE = "http://127.0.0.1:8001"
npm.cmd run dev -- --port 5174
```

ブラウザで `http://localhost:5174` を開きます。
本番と同じく、画面とAPIが別々に動いている状態になります。

## 参考：サンプルデータを作り直す

実記録を更新したあと、デモ用サンプルを作り直す場合。

```powershell
cd C:\Users\User\Documents\wine-app\backend
.venv\Scripts\python scripts\build_sample.py "C:\Users\User\Documents\wine-notes\data\wine_log.csv"
```

商品名は連番に置き換わり、価格・購入先・メモ・日付・ヴィンテージ・
アルコール度数は落とされます。残るのは香味13項目、総合評価、
また買いたい度、産地、品種だけです。

産地と品種を残しているのは、これらが無いとヒートマップ（産地×品種）が
成立せず、PCAの色分けも全て「未入力」になってしまうためです。
これらはワイン側の属性であって、飲んだ人の情報ではありません。

## 参考：個人版はこれまで通り

公開版を作っても、手元の個人版は影響を受けません。

```powershell
cd C:\Users\User\Documents\wine-app\backend
.venv\Scripts\uvicorn app.main:app --reload
```

```powershell
cd C:\Users\User\Documents\wine-app\frontend
npm.cmd run dev
```

`http://localhost:5173` が個人版です。記録は `backend/wine.db` に保存されます。
