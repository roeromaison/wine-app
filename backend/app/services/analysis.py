"""PCA・クラスター分析・ヒートマップ。

既存の R コード（wine-notes/index_rev.qmd）と同じ手順を再現している:

1. color で絞り込む
2. 香味13項目が全て埋まっている行だけ残す（R の drop_na 相当）
3. 分散が var_threshold 未満の香味軸を除外する（R の var() と同じ ddof=1）
4. 平均0・標準偏差1に標準化して PCA / クラスタリング

R の prcomp は不偏標準偏差（n-1）で割るため、sklearn の StandardScaler
（母標準偏差 / n）ではなく手計算で標準化している。ここを揃えないと
既存のRの出力と座標のスケールが微妙にずれる。

PCA とクラスタリングは同じ軸・同じ標準化行列を使う（R 側も
「PCAと同じ軸(keep)を使って距離行列を作成」している）。そのため
下ごしらえを _prepare() に切り出して両方から呼んでいる。
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.decomposition import PCA

from ..constants import (
    COLOR_LABELS_JA,
    DEFAULT_VAR_THRESHOLD,
    FLAVOR_KEYS,
    FLAVOR_LABELS_JA,
)

# 分析対象の1件。DBのORMモデル（TastingNote）でも、APIで受け取った
# Pydanticモデルでも同じように扱える。必要なのは id / name / color / date /
# overall_0_10 / 産地情報 / 香味13項目の属性を持っていることだけ。
# 公開版はサーバーに何も保存せず、送られてきた記録をそのまま計算するため、
# ここをORMに固定しないことが重要。
NoteLike = Any


class NotEnoughData(Exception):
    """分析を回すのに記録が足りない場合に投げる。"""


@dataclass
class Prepared:
    """PCA とクラスタリングで共有する下ごしらえ結果。"""

    rows: list[NoteLike]
    scaled: np.ndarray
    axes_used: list[str]
    axes_excluded: list[str]


def _sort_key(note: NoteLike):
    """R 側の arrange(desc(overall_0_10), desc(date)) と同じ並び。"""
    overall = note.overall_0_10 if note.overall_0_10 is not None else -1
    date_ord = note.date.toordinal() if note.date is not None else 0
    return (-overall, -date_ord)


def _prepare(
    notes: list[NoteLike], color: str, var_threshold: float
) -> Prepared:
    rows = [n for n in notes if n.color == color]
    rows = [n for n in rows if all(getattr(n, k) is not None for k in FLAVOR_KEYS)]

    if len(rows) < 3:
        label = COLOR_LABELS_JA.get(color, color)
        raise NotEnoughData(
            f"{label}ワインの記録が{len(rows)}件です。"
            "香味13項目が全て入った記録が3件以上必要です。"
        )

    rows.sort(key=_sort_key)

    matrix = np.array(
        [[float(getattr(n, k)) for k in FLAVOR_KEYS] for n in rows], dtype=float
    )

    variances = matrix.var(axis=0, ddof=1)
    keep_mask = np.isfinite(variances) & (variances >= var_threshold)

    axes_used = [k for k, keep in zip(FLAVOR_KEYS, keep_mask) if keep]
    axes_excluded = [k for k, keep in zip(FLAVOR_KEYS, keep_mask) if not keep]

    if len(axes_used) < 2:
        raise NotEnoughData(
            "評価に差がついている香味軸が2つ未満です。"
            "記録が増えるか、var_threshold を下げると計算できます。"
        )

    kept = matrix[:, keep_mask]
    scaled = (kept - kept.mean(axis=0)) / kept.std(axis=0, ddof=1)

    return Prepared(
        rows=rows, scaled=scaled, axes_used=axes_used, axes_excluded=axes_excluded
    )


def _pca_coords(scaled: np.ndarray) -> tuple[np.ndarray, np.ndarray, list[float]]:
    """PC1/PC2 の座標・loadings・寄与率を返す。

    主成分の符号は数学的に任意なので、再計算のたびに図が反転しないよう
    「絶対値が最大の loading を正にする」というルールで固定する。
    """
    n_components = min(2, scaled.shape[0], scaled.shape[1])
    pca = PCA(n_components=n_components)
    coords = pca.fit_transform(scaled)
    components = pca.components_.copy()

    for i in range(components.shape[0]):
        if components[i][np.argmax(np.abs(components[i]))] < 0:
            components[i] *= -1
            coords[:, i] *= -1

    return coords, components, [float(v) for v in pca.explained_variance_ratio_]


def _point(note: NoteLike, index: int, coords: np.ndarray, has_pc2: bool) -> dict:
    return {
        "id": note.id,
        "label": f"{index:02d}",
        "name": note.name,
        "country": note.country,
        "region": note.region,
        "variety": note.variety,
        "vintage": note.vintage,
        "price_yen": note.price_yen,
        "overall_0_10": note.overall_0_10,
        "pc1": float(coords[0]),
        "pc2": float(coords[1]) if has_pc2 else 0.0,
    }


def run_pca(
    notes: list[NoteLike],
    color: str,
    var_threshold: float = DEFAULT_VAR_THRESHOLD,
) -> dict:
    prepared = _prepare(notes, color, var_threshold)
    coords, components, variance_ratio = _pca_coords(prepared.scaled)
    has_pc2 = coords.shape[1] > 1

    points = [
        _point(note, i, xy, has_pc2)
        for i, (note, xy) in enumerate(zip(prepared.rows, coords), start=1)
    ]

    loadings = [
        {
            "axis": axis,
            "label_ja": FLAVOR_LABELS_JA[axis],
            "pc1": float(components[0][j]),
            "pc2": float(components[1][j]) if has_pc2 else 0.0,
        }
        for j, axis in enumerate(prepared.axes_used)
    ]
    loadings.sort(key=lambda r: abs(r["pc1"]), reverse=True)

    return {
        "color": color,
        "n": len(prepared.rows),
        "axes_used": prepared.axes_used,
        "axes_excluded": prepared.axes_excluded,
        "variance_ratio": variance_ratio,
        "points": points,
        "loadings": loadings,
    }


def _auto_label(deviations: dict[str, float]) -> str:
    """クラスターの特徴を一言で表す。全体平均からのズレが大きい軸を拾う。

    しきい値 0.4 は 0〜5 の評価尺度に対する経験則で、これ未満のズレは
    「そのクラスターらしさ」として説明するには弱い。
    """
    # ズレの向きではなく大きさで並べる。「樽が平均より0.9低い」ようなクラスターは
    # 低さこそが特徴なので、正のズレだけを見ると特徴を取り違える。
    ranked = sorted(deviations.items(), key=lambda kv: abs(kv[1]), reverse=True)
    significant = [(k, v) for k, v in ranked if abs(v) >= 0.4][:2]

    if not significant:
        return "平均的"

    positive = [k for k, v in significant if v > 0]
    negative = [k for k, v in significant if v < 0]

    if positive and negative:
        return (
            f"{FLAVOR_LABELS_JA[positive[0]]}が強く、"
            f"{FLAVOR_LABELS_JA[negative[0]]}が控えめ"
        )
    if positive:
        return "・".join(FLAVOR_LABELS_JA[k] for k in positive) + "が強い"
    return "・".join(FLAVOR_LABELS_JA[k] for k in negative) + "が控えめ"


def run_clusters(
    notes: list[NoteLike],
    color: str,
    k: int = 4,
    var_threshold: float = DEFAULT_VAR_THRESHOLD,
) -> dict:
    """階層クラスター分析（R の hclust(method="ward.D2") 相当）。

    sklearn の AgglomerativeClustering(linkage="ward") は ward.D2 と同じ
    定義なので、R 側の hc_ward と同じ分かれ方になる。
    """
    prepared = _prepare(notes, color, var_threshold)
    n = len(prepared.rows)

    if k < 2:
        raise NotEnoughData("クラスター数は2以上を指定してください。")
    if n < k:
        label = COLOR_LABELS_JA.get(color, color)
        raise NotEnoughData(
            f"{label}ワインの記録は{n}件です。{k}グループに分けるには記録が足りません。"
        )

    model = AgglomerativeClustering(n_clusters=k, linkage="ward")
    assignments = model.fit_predict(prepared.scaled)

    coords, _, variance_ratio = _pca_coords(prepared.scaled)
    has_pc2 = coords.shape[1] > 1

    # プロファイルは標準化前の 0〜5 のまま出す。標準化後の値だと
    # 「果実 +1.2」のように読めない数字になってしまうため。
    raw = np.array(
        [[float(getattr(n_, key)) for key in FLAVOR_KEYS] for n_ in prepared.rows],
        dtype=float,
    )
    global_mean = raw.mean(axis=0)

    groups = []
    for cluster_index in range(k):
        mask = assignments == cluster_index
        member_raw = raw[mask]
        means = member_raw.mean(axis=0)
        deviations = {
            key: float(means[j] - global_mean[j]) for j, key in enumerate(FLAVOR_KEYS)
        }

        overalls = [
            n_.overall_0_10
            for n_, in_group in zip(prepared.rows, mask)
            if in_group and n_.overall_0_10 is not None
        ]

        groups.append(
            {
                "size": int(mask.sum()),
                "mean_overall": float(np.mean(overalls)) if overalls else None,
                "label": _auto_label(deviations),
                "profile": [
                    {
                        "axis": key,
                        "label_ja": FLAVOR_LABELS_JA[key],
                        "mean": float(means[j]),
                        "deviation": deviations[key],
                    }
                    for j, key in enumerate(FLAVOR_KEYS)
                ],
                "_mask": mask,
            }
        )

    # 総合評価の高い順に並べ替えて 1 から振り直す。R 側の「★好きクラスタ」に相当する
    # グループが常に先頭に来るので、画面で探さなくて済む。
    groups.sort(key=lambda g: (g["mean_overall"] is None, -(g["mean_overall"] or 0)))

    cluster_of = np.zeros(n, dtype=int)
    for new_index, group in enumerate(groups, start=1):
        cluster_of[group["_mask"]] = new_index
        group["cluster"] = new_index
        group["is_favorite"] = new_index == 1
        del group["_mask"]

    points = []
    for i, (note, xy) in enumerate(zip(prepared.rows, coords), start=1):
        point = _point(note, i, xy, has_pc2)
        point["cluster"] = int(cluster_of[i - 1])
        points.append(point)

    return {
        "color": color,
        "n": n,
        "k": k,
        "axes_used": prepared.axes_used,
        "axes_excluded": prepared.axes_excluded,
        "variance_ratio": variance_ratio,
        "points": points,
        "clusters": groups,
    }


def build_heatmap(
    notes: list[NoteLike],
    color: str | None = None,
    row_field: str = "country",
    min_count: int = 1,
    sort: str = "score",
) -> dict:
    """産地 × 品種の平均 overall スコア。

    品種マスタは108種あるのに記録は80件しかないため、素直に全組合せを出すと
    ほぼ空白の表になる。記録のある組合せだけを返す。

    並び順は sort で選ぶ:

    - "score" … 行は平均の高い順に上、列は低い順に左。評価の良い組合せが
                表の右上に集まるので、好みの傾向がひと目で分かる（既定）
    - "count" … 行・列とも本数の多い順。どこにデータが溜まっているかを見たいとき
    """
    if row_field not in ("country", "region"):
        raise NotEnoughData("行の軸は country か region を指定してください。")
    if sort not in ("score", "count"):
        raise NotEnoughData("並び順は score か count を指定してください。")

    rows = [n for n in notes if n.overall_0_10 is not None]
    if color:
        rows = [n for n in rows if n.color == color]

    buckets: dict[tuple[str, str], list[int]] = {}
    for note in rows:
        row_value = getattr(note, row_field)
        col_value = note.variety
        if not row_value or not col_value:
            continue
        buckets.setdefault((row_value, col_value), []).append(note.overall_0_10)

    cells = [
        {
            "row": row_value,
            "col": col_value,
            "mean_overall": float(np.mean(scores)),
            "count": len(scores),
        }
        for (row_value, col_value), scores in buckets.items()
        if len(scores) >= min_count
    ]

    if not cells:
        raise NotEnoughData(
            "集計できる組合せがありません。"
            "産地・品種・総合評価が入った記録が必要です（件数の下限も確認してください）。"
        )

    def margins(key: str) -> tuple[dict[str, float], dict[str, int]]:
        """行（または列）ごとの平均スコアと本数。

        平均は本数で重み付けする。単純にセルの平均を平均すると、
        1本しかないセルが4本のセルと同じ重みになってしまう。
        """
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        for cell in cells:
            label = cell[key]
            totals[label] = totals.get(label, 0.0) + cell["mean_overall"] * cell["count"]
            counts[label] = counts.get(label, 0) + cell["count"]
        means = {label: totals[label] / counts[label] for label in totals}
        return means, counts

    row_means, row_counts = margins("row")
    col_means, col_counts = margins("col")

    if sort == "count":
        row_labels = sorted(row_counts, key=lambda v: (-row_counts[v], v.casefold()))
        col_labels = sorted(col_counts, key=lambda v: (-col_counts[v], v.casefold()))
    else:
        # 行は高い順に上から、列は低い順に左から。評価の良い組合せが右上に寄る。
        row_labels = sorted(
            row_means, key=lambda v: (-row_means[v], -row_counts[v], v.casefold())
        )
        col_labels = sorted(
            col_means, key=lambda v: (col_means[v], -col_counts[v], v.casefold())
        )

    # 色の濃淡は「表示されているセルの範囲」で正規化する。全記録の最小・最大だと
    # 絞り込んだときに濃淡がほとんど付かなくなる。
    cell_means = [cell["mean_overall"] for cell in cells]

    return {
        "color": color,
        "row_field": row_field,
        "sort": sort,
        "row_labels": row_labels,
        "col_labels": col_labels,
        "row_means": [
            {"label": label, "mean_overall": row_means[label], "count": row_counts[label]}
            for label in row_labels
        ],
        "col_means": [
            {"label": label, "mean_overall": col_means[label], "count": col_counts[label]}
            for label in col_labels
        ],
        "cells": cells,
        "n": sum(cell["count"] for cell in cells),
        "min_overall": float(min(cell_means)),
        "max_overall": float(max(cell_means)),
    }
