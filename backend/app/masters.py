"""コンボボックス候補のマスタデータ。

実体は app/data/masters.json。既存の Excel テンプレート
（wine_log.xlsx のドロップダウンリストシート）から
scripts/build_masters.py で生成している。

テンプレートを更新したら:
    cd backend
    .venv/Scripts/python scripts/build_masters.py "path/to/wine_log.xlsx"
"""

import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "masters.json"


def _load() -> dict:
    if not DATA_PATH.exists():
        # マスタが無くてもアプリ自体は動くべき（候補が空になるだけ）。
        return {}
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


_data = _load()

COUNTRIES: list[str] = _data.get("countries", [])
REGIONS: list[str] = _data.get("regions", [])
VARIETIES: list[str] = _data.get("varieties", [])
STYLES: list[str] = _data.get("styles", [])
SOURCE: str = _data.get("source", "")
