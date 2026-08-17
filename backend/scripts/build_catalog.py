"""提案機能（おすすめタブ）が使うワインカタログを、実記録のCSVから生成する。

`build_sample.py` が作る sample-notes.json とは目的が違う。

    sample-notes.json … 訪問者が「自分の記録」として読み込むデモ用。
                        商品名は連番に置換し、価格も落としてある
    catalog.json      … 訪問者に提案する「候補ワインの一覧」。
                        商品名が無いと提案として成立しないので、名前を残す

残しているのはワイン側の属性（名前・産地・品種・ヴィンテージ・香味13項目）と、
maison 本人が付けた総合評価・また買いたい度。
**購入先や飲んだ日、メモは入れない**（飲んだ人の情報なので提案には不要）。
価格は「だいたいの価格帯」を示す目的で残している。

search_query はアフィリエイトリンクの検索語。ヴィンテージの数字を落としてあるのは、
単一ヴィンテージのリンクが1年で切れるため。年を含めない方が長く生きる。

使い方:
    cd backend
    .venv/Scripts/python scripts/build_catalog.py "../../wine-notes/data/wine_log.csv"
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.constants import FLAVOR_KEYS  # noqa: E402
from app.services import importer  # noqa: E402

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "catalog.json"

KEEP_FIELDS = [
    "name", "color", "country", "region", "variety", "vintage", "price_yen",
    *FLAVOR_KEYS, "overall_0_10", "repurchase_0_10",
]

# 「2024」のような単独の4桁年。ワイン名から検索語を作るときに落とす。
VINTAGE_RE = re.compile(r"(?<!\d)(19|20)\d{2}(?!\d)")


def to_search_query(name: str) -> str:
    """アフィリエイトリンクに使う検索語。

    ヴィンテージを落とすのは、単一ヴィンテージの商品ページが1年ほどで消えるため。
    生産者名とキュヴェ名だけ残しておけば、年が変わっても検索は当たり続ける。
    """
    stripped = VINTAGE_RE.sub(" ", name)
    return re.sub(r"\s+", " ", stripped).strip() or name


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

    catalog = []
    skipped = 0
    for record in records:
        # 香味が欠けている記録は距離を計算できないので候補に入れない。
        if any(record.get(key) is None for key in FLAVOR_KEYS):
            skipped += 1
            continue

        name = record.get("name")
        if not name:
            skipped += 1
            continue

        item = {key: record.get(key) for key in KEEP_FIELDS}
        item["id"] = len(catalog) + 1
        item["search_query"] = to_search_query(name)
        catalog.append(item)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    by_color: dict[str, int] = {}
    for item in catalog:
        by_color[item["color"]] = by_color.get(item["color"], 0) + 1

    print(f"元ファイル: {src}")
    print(f"生成: {len(catalog)}件  内訳: {by_color}")
    if skipped:
        print(f"除外（香味が欠けている/名前が無い）: {skipped}件")
    print(f"書き出し: {OUT_PATH}")


if __name__ == "__main__":
    main()
