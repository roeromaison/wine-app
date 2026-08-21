import { useEffect, useMemo, useState } from "react";
import PcaScatter from "../components/PcaScatter.jsx";
import { api } from "../api.js";
import { seriesColor } from "../palette.js";

const K_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

// 香味プロファイルの1行。棒が平均値（0〜5）、右の数字が全体平均とのズレ。
function ProfileRow({ axis }) {
  const width = `${(axis.mean / 5) * 100}%`;
  const positive = axis.deviation >= 0;
  const notable = Math.abs(axis.deviation) >= 0.4;

  return (
    <div className="profile-row">
      <span className="profile-name">{axis.label_ja}</span>
      <div className="profile-bar">
        <div className="profile-fill" style={{ width }} />
      </div>
      <span
        className="profile-dev"
        style={{
          color: notable
            ? positive
              ? "var(--gold)"
              : "var(--wine-bright)"
            : "var(--text-faint)",
        }}
      >
        {positive ? "+" : ""}
        {axis.deviation.toFixed(1)}
      </span>
    </div>
  );
}

export default function ClusterPage({ flavors, masters, notes }) {
  const [color, setColor] = useState("red");
  const [k, setK] = useState(4);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .getClusters(notes, color, k)
      .then((data) => {
        if (!cancelled) setResult(data);
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
  }, [color, k, notes]);

  const flavorLabel = useMemo(
    () => Object.fromEntries(flavors.map((f) => [f.key, f.label])),
    [flavors]
  );

  const groups = useMemo(() => {
    if (!result) return [];
    return result.clusters.map((c) => ({
      name: `グループ${c.cluster}（${c.size}本）`,
      points: result.points.filter((p) => p.cluster === c.cluster),
      fill: seriesColor(c.cluster - 1),
    }));
  }, [result]);

  return (
    <div>
      <div className="panel">
        <p className="panel-title">
          クラスター分析（階層クラスター）
          {result && <span className="count">{result.n}件</span>}
        </p>

        <div className="field-row" style={{ marginBottom: 18 }}>
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
          <div>
            <label className="fieldlabel">グループ数</label>
            <select value={k} onChange={(e) => setK(Number(e.target.value))}>
              {K_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}グループ
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="notice">計算中…</div>}
        {!loading && error && <div className="notice error">{error}</div>}

        {!loading && result && (
          <>
            <div className="chart-wrap tall">
              <PcaScatter groups={groups} varianceRatio={result.variance_ratio} />
            </div>
            <p className="meta-line">
              {"香味の似ているワイン同士をまとめ、"}
              {"PCAマップ上でグループごとに色分けしています。"}
              {"グループは総合評価の平均が高い順に番号を振っているので、"}
              {"グループ1があなたの好みに最も近い一群です。"}
            </p>

            {result.axes_excluded.length > 0 && (
              <>
                <p className="meta-line" style={{ marginTop: 10 }}>
                  評価差がほとんど無いため計算から除外した軸:
                </p>
                <div className="chip-row">
                  {result.axes_excluded.map((a) => (
                    <span className="chip" key={a}>
                      {flavorLabel[a] ?? a}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {!loading &&
        result &&
        result.clusters.map((c) => (
          <div className="panel" key={c.cluster}>
            <p className="panel-title">
              <span>
                <span
                  className="cluster-dot"
                  style={{ background: seriesColor(c.cluster - 1) }}
                />
                グループ{c.cluster}
                {c.is_favorite && <span className="fav-badge">★ 好みに近い</span>}
                <span className="cluster-label">{c.label}</span>
              </span>
              <span className="count">
                {c.size}本 / 総合平均{" "}
                {c.mean_overall != null ? c.mean_overall.toFixed(1) : "–"}
              </span>
            </p>

            <div className="profile-list">
              {c.profile.map((axis) => (
                <ProfileRow key={axis.axis} axis={axis} />
              ))}
            </div>

            <p className="meta-line" style={{ marginTop: 12 }}>
              {result.points
                .filter((p) => p.cluster === c.cluster)
                .map((p) => p.name)
                .join(" / ")}
            </p>
          </div>
        ))}
    </div>
  );
}
