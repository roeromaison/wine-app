import { useEffect, useMemo, useState } from "react";
import FlavorRadar from "../components/FlavorRadar.jsx";
import { api } from "../api.js";

// 好みに近いワインの提案。
//
// 候補は「どこかの通販サイトの在庫」ではなく、maison が実際に飲んで
// 香味13項目を付けた記録そのもの。誰の点数なのかが分かる形で出すために、
// 各カードに本人の総合評価とまた買いたい度を必ず表示している。

const SHARE_TAGS = "#ワイン好きと繋がりたい #ワイン";

function ReasonChips({ reasons, caveats }) {
  return (
    <div className="chip-row" style={{ marginTop: 10 }}>
      {reasons.map((r) => (
        <span className="chip rec-chip-good" key={r}>
          {r}
        </span>
      ))}
      {caveats.map((c) => (
        <span className="chip rec-chip-warn" key={c}>
          {c}
        </span>
      ))}
    </div>
  );
}

export default function RecommendPage({ flavors, masters, notes }) {
  const [color, setColor] = useState("red");
  const [onlyLiked, setOnlyLiked] = useState(true);
  const [excludeRecorded, setExcludeRecorded] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .getRecommendations(notes, color, {
        minOwnerOverall: onlyLiked ? 7 : null,
        excludeRecorded,
      })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setSelected(0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [color, notes, onlyLiked, excludeRecorded]);

  // レーダーは 0〜5 の生の値で描く。好みプロファイルは平均なので小数になるが、
  // 軸の意味は記録と同じなので重ねて読める。
  const profileValues = useMemo(() => {
    if (!result) return {};
    return Object.fromEntries(result.profile.map((p) => [p.axis, p.value]));
  }, [result]);

  const highlight = result?.items?.[selected] ?? null;

  const colorLabel = useMemo(
    () => masters.colors.find((c) => c.key === color)?.label ?? "",
    [masters.colors, color]
  );

  const shareHref = useMemo(() => {
    if (!result) return "";
    const text = `${result.share_text}\n\n${SHARE_TAGS}`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    return (
      "https://x.com/intent/post" +
      `?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    );
  }, [result]);

  return (
    <div>
      <div className="panel">
        <p className="panel-title">
          好みに近い1本を探す
          {result && <span className="count">候補{result.catalog_size}本</span>}
        </p>

        <div className="field-row" style={{ marginBottom: 14 }}>
          <div>
            <label className="fieldlabel">色</label>
            <div className="colortoggle" style={{ marginBottom: 0 }}>
              {masters.colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`colorbtn ${c.key} ${
                    color === c.key ? "active " + c.key : ""
                  }`}
                  onClick={() => setColor(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="checkline">
          <label>
            <input
              type="checkbox"
              checked={onlyLiked}
              onChange={(e) => setOnlyLiked(e.target.checked)}
            />
            maison が総合・また買いたい度とも7点以上を付けた1本に絞る
          </label>
          <label>
            <input
              type="checkbox"
              checked={excludeRecorded}
              onChange={(e) => setExcludeRecorded(e.target.checked)}
            />
            すでに記録したワインを除く
          </label>
        </div>

        <p className="meta-line" style={{ marginTop: 12 }}>
          {"あなたが高く評価した記録の香味を平均して「好みプロファイル」を作り、"}
          {"maison が実際に飲んで13項目を付けた記録の中から、"}
          {"香味の近い順に並べています。"}
          {"お店の在庫ではなく、同じ基準で採点された実測値との比較です。"}
        </p>

        {loading && <div className="notice">計算中…</div>}
        {!loading && error && (
          <div className="notice error">
            {error}
            {notes.length === 0 && (
              <>
                <br />
                {"「保存・読み込み」タブの「サンプルを読み込む」を押すと、"}
                {"80件の記録が入った状態で試せます。"}
              </>
            )}
          </div>
        )}
      </div>

      {!loading && result && (
        <>
          <div className="panel">
            <p className="panel-title">
              あなたの好みのタイプ
              <span className="count">
                {result.n_notes}本中、評価の高い{result.n_used}本から算出
              </span>
            </p>

            <p className="rec-type-name">{result.taste_type.name}</p>
            <p className="rec-type-desc">{result.taste_type.description}</p>

            <div className="chart-wrap tall">
              {/* note記事のレーダーと同じ約束事にする。
                  実線＝いま見ている1本、破線＝比較の基準（あなたの好み）。
                  凡例にワイン名を入れるとスマホで横にはみ出すので短い語にする。 */}
              <FlavorRadar
                flavors={flavors}
                values={highlight ? highlight.flavors : profileValues}
                compare={highlight ? profileValues : null}
                labels={{ main: "選んだ1本", compare: "あなたの好み" }}
              />
            </div>
            {highlight && (
              <p className="radar-caption">
                {"実線が「" + highlight.name + "」、破線があなたの好みです。"}
                {"カードを押すと切り替えられます。"}
              </p>
            )}

            <a
              className="ghostbtn sharebtn"
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              診断結果をXに投稿する
            </a>
          </div>

          {/* 母数の説明はここで1回だけ。カードごとに繰り返すと重くなる。 */}
          <p className="rec-list-heading">
            あなたに近い順（maison が飲んだ{colorLabel}ワイン{result.catalog_size}本から）
          </p>

          {result.items.map((item, index) => (
            <div
              className={`panel rec-card ${index === selected ? "selected" : ""}`}
              key={item.catalog_id}
              onClick={() => setSelected(index)}
            >
              <p className="panel-title">
                <span>
                  <span className="rec-match">No.{item.rank}</span>
                  {item.name}
                </span>
                <span className="count">
                  maison の評価 {item.owner_overall ?? "–"} / 10
                  {item.owner_repurchase != null &&
                    `・また買いたい ${item.owner_repurchase} / 10`}
                </span>
              </p>

              {/* 左に説明、右に小さなレーダー。3本の形の違いを一覧で見比べられる。
                  写真の代わりにこれを置いているのは、権利の心配が無いうえに
                  「なぜ近いのか」がそのまま絵になるため。 */}
              <div className="rec-body">
                <div>
                  <p className="meta-line">
                    {[item.country, item.variety, item.vintage]
                      .filter(Boolean)
                      .join(" / ")}
                    {item.price_yen != null &&
                      `　購入時 ${item.price_yen.toLocaleString()}円`}
                  </p>

                  {/* 近さの指標。距離そのものは標準偏差で割った値で記録の尺度と
                      対応しないため、画面では「1点差以内が何項目か」で示す。 */}
                  <p className="rec-closeness">
                    {item.axes_total}項目中
                    <strong>{item.axes_within_1}項目</strong>
                    が、あなたの好みと1点差以内
                  </p>

                  <ReasonChips reasons={item.reasons} caveats={item.caveats} />
                </div>

                <div className="rec-mini-radar">
                  {/* ResponsiveContainer は親の高さを見るので、
                      高さを持つ入れ物で包む必要がある。 */}
                  <div className="rec-mini-chart">
                    <FlavorRadar
                      flavors={flavors}
                      values={item.flavors}
                      compare={profileValues}
                      compact
                    />
                  </div>
                  <p className="rec-mini-caption">実線＝この1本／破線＝好み</p>
                </div>
              </div>

              <div className="buy-row">
                <a
                  className="buybtn"
                  href={item.rakuten_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  楽天市場で探す
                </a>
                <a
                  className="buybtn"
                  href={item.amazon_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  Amazonで探す
                </a>
              </div>
            </div>
          ))}

          {/* ステマ規制対応。リンクを出す画面に必ず表示する。 */}
          <p className="disclosure">{result.disclosure}</p>
          <p className="disclosure">
            {"ヴィンテージは年によって変わります。"}
            {"リンクは商品名での検索結果を開くので、"}
            {"表示される価格や年号が上の記録と一致しないことがあります。"}
          </p>
        </>
      )}
    </div>
  );
}
