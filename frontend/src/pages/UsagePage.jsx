import { isBrowserStorage } from "../store.js";
import { SAMPLE_COUNT } from "../sampleMeta.js";

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
              <Step n="2" title="次に開いたときは、そのまま続きから">
                {"記録はブラウザに自動で保存されます。"}
                {"同じ端末・同じブラウザで開けば前回の続きから使えるので、"}
                <strong>{"毎回ファイルを読み込む必要はありません。"}</strong>
              </Step>
              <Step n="3" title="ときどきCSVに書き出しておく（保険）">
                {"「保存・読み込み」タブの「CSVに書き出す」で、手元にファイルを"}
                {"残せます。"}
                <strong>
                  {"ブラウザのデータを消すと記録も消えるので、その備えです。"}
                </strong>
                {"端末を変えるときも、このファイルを読み込めば移せます。"}
                {"Excelでも開けます。"}
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
              2回目以降は、開いて足すだけです
            </p>
            <ol className="usage-list usage-ordered">
              <li>
                <strong>アプリを開く</strong>
                {"（前回までの記録がそのまま入っています）"}
              </li>
              <li>
                {"「記録する」タブで、"}
                <strong>新しく飲んだ1本を足す</strong>
              </li>
            </ol>
            <p className="meta-line" style={{ marginTop: 12 }}>
              {"CSVの書き出しは、毎回やる必要はありません。"}
              {"ブラウザのデータを消したときや、別の端末に移したいときのための"}
              {"保険です。月に一度など、区切りで書き出しておけば十分です。"}
            </p>
            <p className="meta-line" style={{ marginTop: 8 }}>
              {"書き出したファイルを読み込むときは「重複は飛ばす」のままで"}
              {"構いません。同じワイン名・同じ日付の記録は二重に増えません。"}
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
            {`で、maison の記録${SAMPLE_COUNT}件を入れて動きを確認できます`}
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
