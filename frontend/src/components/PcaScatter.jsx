import {
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { percent } from "../palette.js";

function PointTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;

  return (
    <div
      style={{
        background: "#2c221d",
        border: "1px solid #3a2d26",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        color: "#ece4da",
        maxWidth: 260,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <strong>{p.label}</strong> {p.name}
      </div>
      <div style={{ color: "#a89787", lineHeight: 1.6 }}>
        {[p.country, p.region, p.variety].filter(Boolean).join(" / ") || "産地未入力"}
        <br />
        {p.vintage ? `${p.vintage} · ` : ""}
        {p.price_yen ? `${p.price_yen.toLocaleString()}円 · ` : ""}
        総合 {p.overall_0_10 ?? "–"}
      </div>
    </div>
  );
}

// PCAマップ本体。PCAページとクラスターページで共有する
// （軸も座標も同じで、点の色分けの根拠だけが違うため）。
export default function PcaScatter({ groups, varianceRatio }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid stroke="#3a2d26" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="pc1"
          name="PC1"
          tick={{ fill: "#a89787", fontSize: 11 }}
          stroke="#3a2d26"
          label={{
            value: `PC1 (${percent(varianceRatio[0])})`,
            position: "insideBottom",
            offset: -12,
            fill: "#6f6055",
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="pc2"
          name="PC2"
          tick={{ fill: "#a89787", fontSize: 11 }}
          stroke="#3a2d26"
          label={{
            value: `PC2 (${percent(varianceRatio[1])})`,
            angle: -90,
            position: "insideLeft",
            fill: "#6f6055",
            fontSize: 11,
          }}
        />
        <ZAxis range={[70, 70]} />
        <Tooltip content={<PointTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a89787" }} iconSize={8} />
        {groups.map((g) => (
          <Scatter
            key={g.name}
            name={g.name}
            data={g.points}
            fill={g.fill}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="label"
              position="top"
              style={{ fill: "#6f6055", fontSize: 9 }}
            />
          </Scatter>
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
