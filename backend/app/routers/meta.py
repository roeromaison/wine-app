"""香味軸とコンボボックス候補。DBが無くても動く。

公開版はDBを持たないので、これらは notes ルーター（記録CRUD）から切り離してある。
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import masters
from ..config import IS_PUBLIC
from ..constants import COLOR_LABELS_JA, COLORS, FLAVOR_KEYS, FLAVOR_LABELS_JA
from ..database import get_db
from ..models import TastingNote
from ..schemas import ColorOption, MasterData

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/flavors")
def list_flavors() -> list[dict]:
    """香味13項目のキーと日本語ラベル。フロント側の軸定義をここに一本化する。"""
    return [{"key": k, "label": FLAVOR_LABELS_JA[k]} for k in FLAVOR_KEYS]


def _base_masters() -> MasterData:
    return MasterData(
        countries=sorted(masters.COUNTRIES, key=str.casefold),
        regions=sorted(masters.REGIONS, key=str.casefold),
        varieties=sorted(masters.VARIETIES, key=str.casefold),
        styles=sorted(masters.STYLES, key=str.casefold),
        colors=[ColorOption(key=c, label=COLOR_LABELS_JA[c]) for c in COLORS],
    )


if IS_PUBLIC:

    @router.get("/masters", response_model=MasterData)
    def get_masters() -> MasterData:
        """公開版は同梱マスタのみ。訪問者の記録はサーバーに無いので合成しない。"""
        return _base_masters()

else:

    @router.get("/masters", response_model=MasterData)
    def get_masters(db: Session = Depends(get_db)) -> MasterData:
        """個人版は同梱マスタと、既に記録済みの値を合成して候補にする。"""
        base = _base_masters()

        def merge(seed: list[str], column) -> list[str]:
            used = {v for (v,) in db.execute(select(column).distinct()) if v}
            return sorted(set(seed) | used, key=str.casefold)

        return MasterData(
            countries=merge(base.countries, TastingNote.country),
            regions=merge(base.regions, TastingNote.region),
            varieties=merge(base.varieties, TastingNote.variety),
            styles=merge(base.styles, TastingNote.style),
            colors=base.colors,
        )
