"""分析エンドポイント（PCA・クラスター分析・ヒートマップ）。

いずれも「送られてきた記録を計算して返す」だけで、サーバーは何も保存しない。
DB を読まないので、記録をブラウザに持つ公開版でも、SQLite に持つ個人版でも
同じエンドポイントを使える。
"""

from fastapi import APIRouter, HTTPException

from ..constants import COLORS
from ..schemas import (
    AnalysisRequest,
    ClusterRequest,
    ClusterResult,
    HeatmapRequest,
    HeatmapResult,
    PcaResult,
)
from ..services import analysis

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _check_color(color: str) -> None:
    if color not in COLORS:
        raise HTTPException(
            status_code=400, detail=f"color は {'/'.join(COLORS)} のいずれかです"
        )


@router.post("/pca", response_model=PcaResult)
def pca(payload: AnalysisRequest) -> PcaResult:
    _check_color(payload.color)
    try:
        result = analysis.run_pca(
            payload.notes, color=payload.color, var_threshold=payload.var_threshold
        )
    except analysis.NotEnoughData as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PcaResult(**result)


@router.post("/clusters", response_model=ClusterResult)
def clusters(payload: ClusterRequest) -> ClusterResult:
    _check_color(payload.color)
    try:
        result = analysis.run_clusters(
            payload.notes,
            color=payload.color,
            k=payload.k,
            var_threshold=payload.var_threshold,
        )
    except analysis.NotEnoughData as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ClusterResult(**result)


@router.post("/heatmap", response_model=HeatmapResult)
def heatmap(payload: HeatmapRequest) -> HeatmapResult:
    if payload.color:
        _check_color(payload.color)
    try:
        result = analysis.build_heatmap(
            payload.notes,
            color=payload.color,
            row_field=payload.row_field,
            min_count=payload.min_count,
            sort=payload.sort,
        )
    except analysis.NotEnoughData as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return HeatmapResult(**result)
