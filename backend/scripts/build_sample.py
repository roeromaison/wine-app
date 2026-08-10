"""公開版デモ用のサンプルデータを、実記録のCSVから生成する。

公開版は誰でも見られるので、**個人が特定できる情報・支出に関する情報は落とす**。
残すのは香味13項目と評価、それに分析の軸として必要な産地と品種だけ。

落とす列:
    name（商品名 → 連番に置換）, date, vintage, price_yen, purchase,
    abv, temp, decant_min, memo, style, blend_note

残す列:
    color, country, region, variety, 香味13項目, overall_0_10, repurchase_0_10

country / region / variety を残しているのは、これらが無いとヒートマップ
（産地×品種）が成立せず、PCAの色分けも全て「未入力」になってしまうため。
これらはワイン側の属性で、飲んだ人の情報ではない。

使い方:
    cd backend
    .venv/Scripts/python scripts/build_sample.py "path/to/wine_log.csv"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.constants import FLAVOR_KEYS  # noqa: E402
from app.services import importer  # noqa: E402

OUT_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "public"
    / "sample-notes.json"
)

KEEP_FIELDS = ["color", "country", "region", "variety", *FLAVOR_KEYS,
               "overall_0_10", "repurchase_0_10"]


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("元になるCSV/Excelのパスを指定してください。")

    src = Path(sys.argv[1])
    if not src.exists():
        raise SystemExit(f"ファイルが見つかりません: {src}")

    df = importer.read_table(src.name, src.read_bytes())
    records, errors = importer.parse_rows(df)

    if errors:
        print(f"読み取れなかった行: {len(errors)}件")

    sample = []
    for i, record in enumerate(records, start=1):
        note = {key: record.get(key) for key in KEEP_FIELDS}
        note["id"] = i
        note["name"] = f"サンプル {i:02d}"
        sample.append(note)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(sample, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    by_color: dict[str, int] = {}
    for note in sample:
        by_color[note["color"]] = by_color.get(note["color"], 0) + 1

    print(f"元ファイル: {src}")
    print(f"生成: {len(sample)}件  内訳: {by_color}")
    print(f"残した項目: {', '.join(KEEP_FIELDS)}")
    print(f"書き出し: {OUT_PATH}")


if __name__ == "__main__":
    main()
