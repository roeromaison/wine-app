import { useEffect, useMemo, useState } from "react";
import PcaScatter from "../components/PcaScatter.jsx";
import { api } from "../api.js";
import { percent, seriesColor } from "../palette.js";

const GROUP_OPTIONS = [
  { key: "variety", label: "品種" },
  { key: "country", label: "国" },
  { key: "region", label: "地域" },
];

export default function PcaPage({ flavors, masters, notes }) {
  const [color, setColor] = useState("red");
  const [groupBy, setGroupBy] = useState("variety");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .getPca(notes, color)
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
  }, [color, notes]);

  const flavorLabel = useMemo(
    () => Object.fromEntries(flavors.map((f) => [f.key, f.label])),
    [flavors]
  );

  // 系列ごとに Scatter を分けることで凡例と色分けを両立させる。
  const groups = useMemo(() => {
    if (!result) return [];
    const buckets = new Map();
    for (const point of result.points) {
      const key = point[groupBy] || "未入力";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(point);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, points], i) => ({ name, points, fill: seriesColor(i) }));
  }, [result, groupBy]);

  return (
    <div>
      <div className="panel">
        <p className="panel-title">
          Preference Map（PCA）
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
            <label className="fieldlabel">色分け</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {GROUP_OPTIONS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
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
              第1・第2主成分で全体の
              {percent(
                (result.variance_ratio[0] ?? 0) + (result.variance_ratio[1] ?? 0)
              )}
              を説明しています。近くにある点ほど香味の傾向が似ています。
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

      {!loading && result && (
        <div className="grid">
          <div className="panel">
            <p className="panel-title">
              軸の寄与（loadings）<span className="count">|PC1|降順</span>
            </p>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>香味</th>
                    <th>PC1</th>
                    <th>PC2</th>
                  </tr>
                </thead>
                <tbody>
                  {result.loadings.map((l) => (
                    <tr key={l.axis}>
                      <td>{l.label_ja}</td>
                      <td className="num">{l.pc1.toFixed(3)}</td>
                      <td className="num">{l.pc2.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">
              番号の対応表<span className="count">総合評価順</span>
            </p>
            <div className="table-scroll" style={{ maxHeight: 380, overflowY: "auto" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>ワイン</th>
                    <th>総合</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((p) => (
                    <tr key={p.id}>
                      <td className="num">{p.label}</td>
                      <td>
                        {p.name}
                        <div style={{ fontSize: 11, color: "#6f6055" }}>
                          {[p.country, p.variety].filter(Boolean).join(" / ")}
                        </div>
                      </td>
                      <td className="num">{p.overall_0_10 ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
