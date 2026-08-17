import {
  Legend,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// 香味13項目のレーダーチャート。軸の並びは backend の FLAVOR_KEYS に従う
// （flavors 配列をそのまま渡す）。
//
// compare を渡すと2本目を破線で重ねる。note記事のレーダー（実線＝この1本、
// 破線＝平均）と同じ見せ方で、「自分の基準と比べてどうか」を1枚で示すためのもの。
export default function FlavorRadar({
  flavors,
  values,
  compare = null,
  labels = null,
}) {
  const data = flavors.map((f) => ({
    subject: f.label,
    value: values[f.key] ?? 0,
    compare: compare ? compare[f.key] ?? 0 : 0,
    fullMark: 5,
  }));

  const mainName = labels?.main ?? "この1本";
  const compareName = labels?.compare ?? "比較";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#3a2d26" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#a89787", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
        {compare && (
          <Radar
            name={compareName}
            dataKey="compare"
            stroke="#a89787"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            fill="none"
            isAnimationActive={false}
          />
        )}
        <Radar
          name={mainName}
          dataKey="value"
          stroke="#b3405a"
          strokeWidth={2}
          fill="#8c2f42"
          fillOpacity={0.45}
          isAnimationActive={false}
        />
        {compare && (
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#a89787" }}
            iconSize={10}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
