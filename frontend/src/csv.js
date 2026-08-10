// 記録をCSVに書き出す。
//
// 公開版はブラウザにしかデータが無いので、キャッシュ削除で消える前に
// 手元へ退避できる手段が要る。列順は既存の wine_log.csv と揃えてあるので、
// 書き出したファイルをそのまま取り込み直せるし、Excelでも開ける。

const COLUMNS = [
  "date", "name", "country", "region", "variety", "color", "style",
  "blend_note", "vintage", "price_yen", "purchase", "abv", "temp", "decant_min",
  "fruit", "floral", "herb", "spice", "oak", "vanilla", "earth", "mineral",
  "acid", "tannin", "sweet", "body", "finish",
  "overall_0_10", "repurchase_0_10", "memo",
];

function escapeCell(value) {
  if (value == null) return "";
  const text = String(value);
  // カンマ・改行・引用符を含む値は引用符で囲み、内側の引用符は二重にする。
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function notesToCsv(notes) {
  const lines = [COLUMNS.join(",")];
  for (const note of notes) {
    lines.push(COLUMNS.map((key) => escapeCell(note[key])).join(","));
  }
  return lines.join("\r\n");
}

export function downloadCsv(notes, filename = "wine_log.csv") {
  // Excel は BOM が無いとUTF-8のCSVを文字化けさせるので付ける。
  const blob = new Blob(["﻿" + notesToCsv(notes)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
