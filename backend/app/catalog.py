"""提案の候補になるワインの一覧。

実体は app/data/catalog.json。maison が実際に飲んで香味13項目を付けた記録から
scripts/build_catalog.py で生成している。

「提案元になるワインのデータベースが無い」というのが提案機能を保留していた理由だが、
**記録そのものがデータベースになる**。市販の商品説明文ではなく、
同一人物が同一基準で採点した実測値なので、香味の距離が意味を持つ。

記録を追加したら:
    cd backend
    .venv/Scripts/python scripts/build_catalog.py "../../wine-notes/data/wine_log.csv"
"""

import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "catalog.json"


def _load() -> list[dict]:
    if not DATA_PATH.exists():
        # カタログが無くてもアプリ全体は動くべき（提案タブだけが空になる）。
        return []
    with DATA_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


ITEMS: list[dict] = _load()
