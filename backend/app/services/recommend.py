"""好みプロファイルに近いワインを、カタログ（実記録80本）から提案する。

考え方は3段階しかない。

1. 訪問者の記録のうち **高く評価した一群** の香味の平均を「好みプロファイル」とする
2. カタログの各本との距離を測る
3. 近い順に返す

**なぜ「高評価群の平均」なのか**
    全記録の平均だと、口に合わなかったワインまで好みに混ざる。
    かといって最高点の1本だけを使うと、その1本の偶然に引きずられる。
    R側の分析で「★好きクラスタ」を見ているのと同じ発想で、上位群の重心を取る。

**なぜ軸ごとに標準偏差で割るのか**
    白のタンニンのようにほぼ0で固定の軸と、果実のように広く散る軸をそのまま
    足し合わせると、散る軸だけで距離が決まってしまう。標準偏差で割ると
    「その軸の中でどれだけ珍しい値か」に揃うので、13項目が対等に効く。
    ddof=1 は既存の分析コード（services/analysis.py）と揃えている。

サーバーは訪問者の記録を保存しない。この計算も、送られてきた記録を使って
その場で走らせるだけで、終われば何も残らない。
"""

from urllib.parse import quote

import numpy as np

from .. import catalog
from ..config import (
    AFFILIATE_DISCLOSURE,
    AMAZON_ASSOCIATE_STATEMENT,
    AMAZON_TAG,
    HAS_AFFILIATE,
    RAKUTEN_LINK_TEMPLATE,
    SEARCH_DISCLOSURE,
)
from ..constants import COLOR_LABELS_JA, FLAVOR_KEYS, FLAVOR_LABELS_JA
from .analysis import NotEnoughData

# 好みプロファイルを作るのに必要な最低本数。
# 3本というのは統計的な根拠があるわけではなく、「1〜2本では平均が
# その日の気分そのものになる」という下限。記録が増えるほど安定する。
MIN_NOTES = 3

# 高評価群としてどこまで取るか。上位1/3（最低3本）。
# 同点はまとめて含める（4本目と5本目が同じ8点なら両方入る）。
LIKED_RATIO = 3

# 標準偏差の下限。0に近い軸で割ると距離が発散するため。
# 0〜5の尺度に対して0.5未満のばらつきは「ほぼ全員同じ値」とみなす。
SD_FLOOR = 0.5

# 「この軸はあなたらしい」と言える z の大きさ。
# 好みプロファイルは十数本の平均なので、個々の記録ほど尖らない（平均に寄る）。
# 0.5 にすると該当軸がほぼ出なくなり、どの1本も理由なしになってしまうため
# 0.35 にしている。
DISTINCTIVE_Z = 0.35
# 「近い」と言える差。
CLOSE_Z = 0.4
# 「ずれている」と言える差。
FAR_Z = 1.0


def _vector(source) -> np.ndarray:
    """香味13項目を FLAVOR_KEYS の順で取り出す。dict でも属性でも受ける。"""
    if isinstance(source, dict):
        return np.array([float(source[k]) for k in FLAVOR_KEYS], dtype=float)
    return np.array([float(getattr(source, k)) for k in FLAVOR_KEYS], dtype=float)


def _normalize_name(name: str | None) -> str:
    """同じワインかどうかの判定用。表記ゆれの吸収まではしない。"""
    return "".join((name or "").split()).casefold()


def _catalog_rows(color: str) -> list[dict]:
    return [item for item in catalog.ITEMS if item.get("color") == color]


def _axis_stats(rows: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    """カタログ側の平均と標準偏差。距離のものさしになる。"""
    matrix = np.array([_vector(item) for item in rows], dtype=float)
    mean = matrix.mean(axis=0)
    sd = matrix.std(axis=0, ddof=1) if len(rows) > 1 else np.ones(len(FLAVOR_KEYS))
    sd = np.maximum(np.nan_to_num(sd, nan=SD_FLOOR), SD_FLOOR)
    return mean, sd


def _liked_notes(rows: list) -> list:
    """好みプロファイルの元にする一群を選ぶ。

    総合評価が入っている記録が3件以上あれば上位1/3、無ければ全件を使う。
    同点は切り捨てず全部入れる（上位3本目と4本目が同点なら4本とも使う）。
    """
    scored = [n for n in rows if n.overall_0_10 is not None]
    if len(scored) < MIN_NOTES:
        return rows

    scored.sort(key=lambda n: -n.overall_0_10)
    take = max(MIN_NOTES, round(len(scored) / LIKED_RATIO))
    cutoff = scored[min(take, len(scored)) - 1].overall_0_10
    return [n for n in scored if n.overall_0_10 >= cutoff]


def _taste_type(z_profile: np.ndarray) -> dict:
    """好みプロファイルに名前を付ける。

    カタログ全体の平均からの離れ方が大きい軸を2つ拾う。診断結果として
    共有されることを想定しているので、短く読める形にしている。
    """
    ranked = sorted(
        range(len(FLAVOR_KEYS)), key=lambda i: abs(z_profile[i]), reverse=True
    )
    picked = [i for i in ranked if abs(z_profile[i]) >= DISTINCTIVE_Z][:2]

    if not picked:
        return {
            "name": "バランスタイプ",
            "description": (
                "どの香味も平均的で、特定の要素に偏らないタイプです。"
                "記録が増えると傾向が出てくるかもしれません。"
            ),
            "axes": [],
        }

    labels = [FLAVOR_LABELS_JA[FLAVOR_KEYS[i]] for i in picked]
    signs = [z_profile[i] > 0 for i in picked]

    # 向きが揃っているときは「余韻・果実高めタイプ」とまとめ、
    # 逆向きなら「ミネラル高め・ハーブ控えめタイプ」と並べる。
    if len(set(signs)) == 1:
        side = "高め" if signs[0] else "控えめ"
        name = "・".join(labels) + side
        described = "・".join(labels) + f"が{side}"
    else:
        parts = [
            f"{label}{'高め' if sign else '控えめ'}"
            for label, sign in zip(labels, signs)
        ]
        name = "・".join(parts)
        described = "、".join(parts)

    return {
        "name": name + "タイプ",
        "description": f"高く評価したワインは、{described}のものが多いようです。",
        "axes": [
            {
                "axis": FLAVOR_KEYS[i],
                "label_ja": FLAVOR_LABELS_JA[FLAVOR_KEYS[i]],
                "z": float(z_profile[i]),
            }
            for i in picked
        ],
    }


def _reasons(z_profile: np.ndarray, z_item: np.ndarray) -> tuple[list[str], list[str]]:
    """なぜ近いのか／どこがずれているのかを日本語にする。

    「近い」だけを並べると、どの1本も同じ説明文になって信用されない。
    ずれている軸も1つ出す。
    """
    reasons = []
    caveats = []

    order = sorted(
        range(len(FLAVOR_KEYS)), key=lambda i: abs(z_profile[i]), reverse=True
    )

    for i in order:
        label = FLAVOR_LABELS_JA[FLAVOR_KEYS[i]]
        gap = z_item[i] - z_profile[i]

        # あなたの好みがはっきり出ている軸で、その値が近いこと。
        # 「平均的な軸がたまたま一致した」を理由にしても意味がない。
        if abs(z_profile[i]) >= DISTINCTIVE_Z and abs(gap) <= CLOSE_Z:
            side = "高さ" if z_profile[i] > 0 else "控えめさ"
            reasons.append(f"{label}の{side}が近い")
        elif abs(gap) >= FAR_Z:
            side = "強め" if gap > 0 else "控えめ"
            caveats.append(f"{label}はあなたの好みより{side}")

    # 好みが尖っていない人には、上の条件に当てはまる軸が1つも出ないことがある。
    # 理由が空のカードは「本当に計算しているのか」と思われるので、
    # 何を根拠に近いと言っているのかは必ず1行返す。
    if not reasons:
        reasons.append("13項目全体の形が近い")

    return reasons[:2], caveats[:1]


def _links(search_query: str) -> dict:
    """購入リンク。アフィリエイトIDが未設定なら、ただの検索リンクになる。"""
    # safe="" にして "/" も含め全部エンコードする。ワイン名にスラッシュが
    # 入っていてもURLの構造を壊さないため。
    q = quote(search_query, safe="")

    amazon = f"https://www.amazon.co.jp/s?k={q}"
    if AMAZON_TAG:
        amazon += f"&tag={quote(AMAZON_TAG, safe='')}"

    if RAKUTEN_LINK_TEMPLATE:
        # 楽天のリンクはURLの中にURLを入れる形なので、二重エンコードの
        # {qq} も用意している（config.py 参照）。
        rakuten = RAKUTEN_LINK_TEMPLATE.replace(
            "{qq}", quote(q, safe="")
        ).replace("{q}", q)
    else:
        rakuten = f"https://search.rakuten.co.jp/search/mall/{q}/"

    return {"amazon_url": amazon, "rakuten_url": rakuten}


def _disclosure() -> str:
    """画面に出す注意書き。

    2つの規制が別々に効いている。

    - ステマ規制（景表法）… 広告であることの表示。アフィリエイトなら必須
    - Amazonアソシエイト運営規約 … 「適格販売により収入を得ています」の表記

    根拠が違うので、Amazonのタグを設定したときだけ後者を足す。
    """
    if not HAS_AFFILIATE:
        return SEARCH_DISCLOSURE
    if AMAZON_TAG:
        return f"{AFFILIATE_DISCLOSURE}{AMAZON_ASSOCIATE_STATEMENT}"
    return AFFILIATE_DISCLOSURE


def recommend(
    notes: list,
    color: str,
    limit: int = 3,
    min_owner_overall: int | None = 7,
    exclude_recorded: bool = True,
) -> dict:
    """好みに近い順にカタログから提案する。

    min_owner_overall は「maison が何点以上を付けた1本に絞るか」。総合評価と
    また買いたい度の両方に効く。None にすると全件が候補になる
    （好みには近いが本人の評価は低い、という正直な結果も出る）。
    """
    color_label = COLOR_LABELS_JA.get(color, color)

    rows = [n for n in notes if n.color == color]
    rows = [n for n in rows if all(getattr(n, k) is not None for k in FLAVOR_KEYS)]

    if len(rows) < MIN_NOTES:
        raise NotEnoughData(
            f"{color_label}ワインの記録が{len(rows)}件です。"
            f"香味13項目が全て入った記録が{MIN_NOTES}件以上あると診断できます。"
        )

    color_catalog = _catalog_rows(color)
    if not color_catalog:
        raise NotEnoughData(
            f"提案できる{color_label}ワインが候補側にありません。"
        )

    # ものさしは色ごとに作る。白と赤では香味の分布そのものが違うため。
    mean, sd = _axis_stats(color_catalog)

    liked = _liked_notes(rows)
    profile = np.array([_vector(n) for n in liked], dtype=float).mean(axis=0)
    z_profile = (profile - mean) / sd

    recorded = {_normalize_name(getattr(n, "name", None)) for n in notes}

    scored_items = []
    for item in color_catalog:
        if min_owner_overall is not None:
            overall = item.get("overall_0_10")
            if overall is None or overall < min_owner_overall:
                continue
            # また買いたい度も同じ基準で見る。総合7点でも「また買いたい5点」の
            # ような1本はある（おいしいが、もう一度買うほどではない）。
            # 買う前提で見せる画面なので、その1本は候補から外す。
            # 未記入は判断材料が無いだけなので落とさない。
            repurchase = item.get("repurchase_0_10")
            if repurchase is not None and repurchase < min_owner_overall:
                continue
        if exclude_recorded and _normalize_name(item.get("name")) in recorded:
            continue

        z_item = (_vector(item) - mean) / sd
        gap = z_item - z_profile

        # 軸ごとの差の二乗平均平方根。項目数で割っているので
        # 「1項目あたり平均で何SDずれているか」として読める。
        # 並び順を決めるのはこの距離だが、画面には出さない。
        # 標準偏差で割った値は、記録している0〜5の尺度と対応しないため。
        distance = float(np.sqrt(np.mean(gap**2)))

        # 画面に出す近さの指標。0〜5の生の尺度で「何項目が1点差以内か」を数える。
        # 訪問者が記録に使っているのと同じ物差しなので、自分で検算できる。
        raw_gap = np.abs(_vector(item) - profile)
        axes_within_1 = int((raw_gap <= 1.0).sum())

        reasons, caveats = _reasons(z_profile, z_item)

        scored_items.append(
            {
                "catalog_id": item["id"],
                "name": item["name"],
                "color": item["color"],
                "country": item.get("country"),
                "region": item.get("region"),
                "variety": item.get("variety"),
                "vintage": item.get("vintage"),
                "price_yen": item.get("price_yen"),
                "owner_overall": item.get("overall_0_10"),
                "owner_repurchase": item.get("repurchase_0_10"),
                "distance": distance,
                "axes_within_1": axes_within_1,
                "axes_total": len(FLAVOR_KEYS),
                "reasons": reasons,
                "caveats": caveats,
                "flavors": {
                    key: int(item[key]) for key in FLAVOR_KEYS
                },
                **_links(item.get("search_query") or item["name"]),
            }
        )

    if not scored_items:
        # 個人版では自分の記録＝カタログなので、除外を効かせると候補がゼロになる。
        # 想定内の状態なので、何を外せば見られるかまで書く。
        raise NotEnoughData(
            "条件に合う候補がありませんでした。"
            "「評価の高い1本に絞る」または「記録済みのワインを除く」を"
            "外すと候補が広がります。"
        )

    scored_items.sort(key=lambda r: r["distance"])
    for position, item in enumerate(scored_items, start=1):
        item["rank"] = position

    taste_type = _taste_type(z_profile)

    return {
        "color": color,
        "n_notes": len(rows),
        "n_used": len(liked),
        "catalog_size": len(color_catalog),
        "taste_type": taste_type,
        "profile": [
            {
                "axis": key,
                "label_ja": FLAVOR_LABELS_JA[key],
                "value": float(profile[i]),
                "catalog_mean": float(mean[i]),
                "z": float(z_profile[i]),
            }
            for i, key in enumerate(FLAVOR_KEYS)
        ],
        "items": scored_items[:limit],
        "disclosure": _disclosure(),
        "share_text": (
            f"私の{color_label}ワインの好みは「{taste_type['name']}」でした。\n"
            f"記録{len(rows)}本から診断しています。"
        ),
    }
