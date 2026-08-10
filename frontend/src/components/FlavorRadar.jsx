import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// 香味13項目のレーダーチャート。軸の並びは backend の FLAVOR_KEYS に従う
// （flavors 配列をそのまま渡す）。
export default function FlavorRadar({ flavors, values }) {
  const data = flavors.map((f) => ({
    subject: f.label,
    value: values[f.key] ?? 0,
    fullMark: 5,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#3a2d26" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#a89787", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="#b3405a"
          strokeWidth={2}
          fill="#8c2f42"
          fillOpacity={0.45}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
