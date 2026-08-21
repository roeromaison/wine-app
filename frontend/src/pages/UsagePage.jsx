import { isBrowserStorage } from "../store.js";

// 使い方の説明。
//
// 公開版は記録を訪問者のブラウザにしか置かないので、**書き出さないと消える**。
// そこを知らないまま使い始めると記録が積み上がらないため、独立したタブにした。
// 記録が1件も無いときは、このタブが最初に開く（App.jsx 側で制御）。

function Step({ n, title, children }) {
  return (
    <div className="usage-step">
      <span className="usage-step-n">{n}</span>
      <div>
        <p className="usage-step-title">{title}</p>
        <p className="meta-line">{children}</p>
      </div>
    </div>
  );
}

export default function UsagePage({ onNavigate, noteCount }) {
  return (
    <div>
      <div className="panel">
        <p className="panel-title">このアプリでできること</p>

        <p className="meta-line">
          {"飲んだワインの香味を13項目（0〜5）で記録すると、レーダーチャートが"}
          {"その場で描かれます。記録が溜まると、好みの地図（PCA）、"}
          {"似たワインのグループ分け（クラスター）、"}
          {"産地×品種のヒートマップが見られます。"}
        </p>
        <p className="meta-line" style={{ marginTop: 10 }}>
          {"「おすすめ」タブでは、あなたの記録から好みのタイプを診断して、"}
          {"maison が実際に飲んで採点した記録の中から近い1本を提案します。"}
        </p>
      </div>

      <div className="panel">
        <p className="panel-title">
          使い方は3ステップ
          {noteCount > 0 && <span className="count">いまの記録 {noteCount}件</span>}
        </p>

        <div className="usage-steps">
          <Step n="1" title="記録する">
            {"「記録する」タブで、ワイン名・産地・品種を入れ、香味13項目のドットを"}
            {"押していきます。1本あたり1〜2分です。"}
          </Step>

          {isBrowserStorage ? (
            <>
              <Step n="2" title="終わったらCSVに書き出す">
                {"「保存・読み込み」タブの「CSVに書き出す」を押して、"}
                {"ファイルを手元に保存します。"}
                <strong>
                  {"この操作をしないと、ブラウザのデータを消したときに記録も消えます。"}
                </strong>
              </Step>
              <Step n="3" title="次に使うとき、そのCSVを読み込む">
                {"「保存・読み込み」タブでファイルを選ぶと、続きから記録できます。"}
                {"書き出したファイルはExcelでも開けます。"}
              </Step>
            </>
          ) : (
            <>
              <Step n="2" title="記録はそのまま残ります">
                {"個人版なので、記録は手元のデータベースに保存されます。"}
                {"書き出しは不要です。"}
              </Step>
              <Step n="3" title="分析タブを開く">
                {"記録が増えるほど、地図やグループ分けが読めるようになります。"}
              </Step>
            </>
          )}
        </div>

        {isBrowserStorage && (
          <div className="usage-cycle">
            <p className="usage-step-title" style={{ marginTop: 0 }}>
              2回目以降は、この3つの繰り返しです
            </p>
            <ol className="usage-list usage-ordered">
              <li>
                {"「保存・読み込み」タブで、"}
                <strong>前回書き出したCSVを読み込む</strong>
                {"（前回までの記録が戻ります）"}
              </li>
              <li>
                {"「記録する」タブで、"}
                <strong>新しく飲んだ1本を足す</strong>
              </li>
              <li>
                {"「保存・読み込み」タブで、"}
                <strong>また書き出す</strong>
                {"。前のファイルに上書き保存すれば、常に最新の1本まで入った"}
                {"ファイルが手元に残ります"}
              </li>
            </ol>
            <p className="meta-line" style={{ marginTop: 12 }}>
              {"読み込むときは「重複は飛ばす」のままで構いません。"}
              {"同じワイン名・同じ日付の記録は二重に増えないようになっています。"}
            </p>
          </div>
        )}

        <div className="buy-row" style={{ marginTop: 20 }}>
          <button className="buybtn" onClick={() => onNavigate("record")}>
            記録する
          </button>
          {isBrowserStorage && (
            <button className="buybtn" onClick={() => onNavigate("import")}>
              保存・読み込み
            </button>
          )}
        </div>
      </div>

      {isBrowserStorage && (
        <div className="panel">
          <p className="panel-title">記録はどこに保存されますか</p>
          <p className="meta-line">
            {"あなたが入力した記録は、"}
            <strong>お使いのブラウザの中だけ</strong>
            {"に保存されます。サーバーには送られません。"}
            {"ログイン機能を作らなかったので、こちらは誰が何を飲んだかを一切持っていません。"}
          </p>
          <p className="meta-line" style={{ marginTop: 10 }}>
            {"その代わり、ブラウザの履歴やサイトデータを消すと記録も一緒に消えます。"}
            {"別の端末とも共有されません。"}
            <strong>{"続けて使うなら、CSVへの書き出しが実質の保存です。"}</strong>
          </p>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">何本くらいから意味が出ますか</p>

        <ul className="usage-list">
          <li>
            <strong>3本</strong>
            {" … レーダーの形の違いが見えます。「おすすめ」の診断もここから動きます"}
          </li>
          <li>
            <strong>10本</strong>
            {" … 好みの地図（PCA）が地図らしくなります"}
          </li>
          <li>
            <strong>30本以上</strong>
            {" … グループ分けやヒートマップが読めるようになります"}
          </li>
        </ul>

        {isBrowserStorage && (
          <p className="meta-line" style={{ marginTop: 14 }}>
            {"手持ちの記録がまだ無い場合は、「保存・読み込み」タブの"}
            <strong>「サンプルを読み込む」</strong>
            {"で、maison の記録80件を入れて動きを確認できます"}
            {"（商品名と価格は伏せてあります）。"}
          </p>
        )}
      </div>

      <div className="panel">
        <p className="panel-title">うまくいかないとき</p>

        <p className="meta-line">
          <strong>「計算中…」から進まない</strong>
          {" … 無料のサーバーで動かしているため、しばらく誰も使っていないと"}
          {"最初の1回だけ30秒ほどかかります。故障ではありません。"}
        </p>
        <p className="meta-line" style={{ marginTop: 10 }}>
          <strong>Excelのファイルを取り込みたい</strong>
          {" … 「保存・読み込み」タブから .xlsx / .csv をそのまま読み込めます。"}
          {"文字コードは自動で判別します。"}
        </p>
      </div>
    </div>
  );
}
