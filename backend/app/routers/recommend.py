"""提案エンドポイント（好みに近いワイン）。

分析エンドポイントと同じく、送られてきた記録を計算して返すだけで
サーバーは何も保存しない。違うのは、計算に**同梱のカタログ**
（app/data/catalog.json＝maison の実記録80本）を使うところだけ。
"""

from fastapi import APIRouter, HTTPException

from ..constants import COLORS
from ..schemas import RecommendRequest, RecommendResult
from ..services import recommend as recommend_service
from ..services.analysis import NotEnoughData

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.post("", response_model=RecommendResult)
def recommend(payload: RecommendRequest) -> RecommendResult:
    if payload.color not in COLORS:
        raise HTTPException(
            status_code=400, detail=f"color は {'/'.join(COLORS)} のいずれかです"
        )

    try:
        result = recommend_service.recommend(
            payload.notes,
            color=payload.color,
            limit=payload.limit,
            min_owner_overall=payload.min_owner_overall,
            exclude_recorded=payload.exclude_recorded,
        )
    except NotEnoughData as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return RecommendResult(**result)
