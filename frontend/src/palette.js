// ダークテーマ上で判別しやすい彩度を抑えた系列色。系列が多いときは循環させる。
export const SERIES_PALETTE = [
  "#b3405a", "#c2a05a", "#7fbfa6", "#8f9fd1", "#d98aa0",
  "#a8c47f", "#d0a07f", "#9b8fc4", "#7fb5bf", "#c98f6a",
];

export const seriesColor = (i) => SERIES_PALETTE[i % SERIES_PALETTE.length];

export const percent = (v) => `${((v ?? 0) * 100).toFixed(1)}%`;

// ヒートマップのセル色。R版は白→濃赤だが、こちらは背景が暗いので
// 「暗く沈んだワイン色 → 鮮やかなワイン色」で同じ向き（濃いほど高評価）を表す。
// 低い側もパネル背景(#241c18)とはっきり違う色にしてある。そうしないと
// 「評価が低いセル」と「記録が無いセル」が見分けられない。
// 高い側をこれ以上明るくすると、セルの文字（HEAT_TEXT）とのコントラストが
// 4.5:1 を割って読みにくくなる。濃淡の幅は低い側を暗くして稼いでいる。
const HEAT_LOW = [52, 34, 40];
const HEAT_HIGH = [179, 64, 90];

const rgb = (c) => `rgb(${c.join(",")})`;

export const HEAT_LOW_CSS = rgb(HEAT_LOW);
export const HEAT_HIGH_CSS = rgb(HEAT_HIGH);

// セルの文字色。低い側でも高い側でも十分なコントラストが出るので一色で通す。
export const HEAT_TEXT = "#f2e7e9";

export function heatColor(value, min, max) {
  const span = max - min;
  const t = span === 0 ? 1 : Math.min(1, Math.max(0, (value - min) / span));
  return rgb(HEAT_LOW.map((low, i) => Math.round(low + (HEAT_HIGH[i] - low) * t)));
}
