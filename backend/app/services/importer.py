"""既存の Excel / CSV テイスティング記録の取り込み。

既存ファイル（wine-notes/data/wine_log.csv）は Shift-JIS(CP932) で保存されている
一方、Excel から書き出し直したものは UTF-8 BOM 付きになることがある。
どちらでも読めるよう、エンコーディングは順に試す。
"""

from __future__ import annotations

import io
from datetime import date, datetime

import pandas as pd

from ..constants import COLOR_ALIASES, FLAVOR_KEYS, STYLE_ALIASES
from ..models import TastingNote

CSV_ENCODINGS = ["utf-8-sig", "cp932", "utf-8"]

# 欠損を表す値として既存データに現れるもの。
NA_TOKENS = {"", "na", "n/a", "nan", "-", "—", "なし", "null", "none"}

TEXT_FIELDS = [
    "name", "country", "region", "variety", "color",
    "style", "blend_note", "purchase", "temp", "memo",
]
INT_FIELDS = [
    "vintage", "price_yen", "decant_min",
    "overall_0_10", "repurchase_0_10", *FLAVOR_KEYS,
]
FLOAT_FIELDS = ["abv"]


class ImportError_(Exception):
    """ファイル自体が読めない場合に投げる。行単位のエラーとは区別する。"""


def read_table(filename: str, content: bytes) -> pd.DataFrame:
    lowered = filename.lower()

    if lowered.endswith((".xlsx", ".xlsm", ".xltx")):
        try:
            return pd.read_excel(io.BytesIO(content), dtype=object)
        except Exception as exc:  # noqa: BLE001
            raise ImportError_(f"Excelファイルを読めませんでした: {exc}") from exc

    if not lowered.endswith((".csv", ".txt", ".tsv")):
        raise ImportError_("対応しているのは .csv / .xlsx / .xlsm ファイルです。")

    sep = "\t" if lowered.endswith(".tsv") else ","
    last_error: Exception | None = None
    for encoding in CSV_ENCODINGS:
        try:
            return pd.read_csv(
                io.BytesIO(content), encoding=encoding, sep=sep, dtype=object
            )
        except UnicodeDecodeError as exc:
            last_error = exc
            continue
        except Exception as exc:  # noqa: BLE001
            raise ImportError_(f"CSVを読めませんでした: {exc}") from exc

    raise ImportError_(
        f"文字コードを判別できませんでした（{', '.join(CSV_ENCODINGS)} を試行）: {last_error}"
    )


def _clean(value: object) -> str | None:
    """セルの値を文字列に正規化する。欠損は None にする。"""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if pd.isna(value):
        return None
    text = str(value).strip()
    if text.lower() in NA_TOKENS:
        return None
    return text


def _to_int(value: object) -> int | None:
    text = _clean(value)
    if text is None:
        return None
    try:
        # "2015.0" や "3,800" のような書き方も許容する。
        return int(float(text.replace(",", "")))
    except ValueError:
        return None


def _to_float(value: object) -> float | None:
    text = _clean(value)
    if text is None:
        return None
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _to_date(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = _clean(value)
    if text is None:
        return None
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%Y.%m.%d", "%Y年%m月%d日"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def parse_rows(df: pd.DataFrame) -> tuple[list[dict], list[str]]:
    """DataFrame を TastingNote の属性辞書に変換する。

    戻り値は (取り込める行, 行単位のエラーメッセージ)。
    1行おかしいだけで全体を止めず、その行だけスキップして理由を返す。
    """
    df = _normalize_columns(df)
    records: list[dict] = []
    errors: list[str] = []

    if "name" not in df.columns:
        raise ImportError_(
            "name 列が見つかりません。1行目が見出し行になっているか確認してください。"
        )

    for position, (_, row) in enumerate(df.iterrows(), start=2):  # 2 = 見出しの次の行
        name = _clean(row.get("name"))
        if name is None:
            continue  # 空行は黙って飛ばす

        raw_color = _clean(row.get("color"))
        color_key = raw_color.lower() if raw_color else None
        if color_key not in COLOR_ALIASES:
            # 泡を color に書いてしまうのはよくある間違いなので、個別に案内する。
            hint = (
                "（泡は color ではなく style 列に sparkling と入れてください）"
                if color_key in STYLE_ALIASES
                else ""
            )
            errors.append(
                f"{position}行目「{name}」: タイプ（color）が不明なため取り込みませんでした"
                f"（値: {raw_color or '空欄'}）{hint}"
            )
            continue

        record: dict = {"name": name, "color": COLOR_ALIASES[color_key]}
        record["date"] = _to_date(row.get("date"))

        for field in TEXT_FIELDS:
            if field in ("name", "color"):
                continue
            record[field] = _clean(row.get(field))

        raw_style = record.get("style")
        if raw_style:
            record["style"] = STYLE_ALIASES.get(raw_style.lower(), raw_style)
        for field in INT_FIELDS:
            record[field] = _to_int(row.get(field))
        for field in FLOAT_FIELDS:
            record[field] = _to_float(row.get(field))

        out_of_range = [
            k for k in FLAVOR_KEYS
            if record[k] is not None and not (0 <= record[k] <= 5)
        ]
        if out_of_range:
            errors.append(
                f"{position}行目「{name}」: 香味スコアが0〜5の範囲外です"
                f"（{', '.join(out_of_range)}）"
            )
            continue

        records.append(record)

    return records, errors


def import_dataframe(db, df: pd.DataFrame, mode: str = "skip") -> dict:
    """DataFrame を DB に取り込む。

    ワイン名 + 日付が同じ記録を「同じ1本」とみなす。既にある記録の扱いは mode で決まる:

    - "skip"   … 飛ばす（既定）。同じファイルを二度取り込んでも二重登録にならない
    - "update" … Excel 側の値で上書きする。Excel で直した内容をアプリに反映したいとき

    上書きしても中身が同じだった行は unchanged として数える。「取り込んだのに
    何も変わらなかった」のか「そもそも重複で飛ばした」のかを区別できるようにしている。
    """
    if mode not in ("skip", "update"):
        raise ImportError_(f"未知の取り込みモードです: {mode}")

    records, errors = parse_rows(df)

    existing: dict[tuple, TastingNote] = {}
    for note in db.query(TastingNote).all():
        existing.setdefault((note.name, note.date), note)

    imported = 0
    updated = 0
    unchanged = 0
    skipped = 0

    for record in records:
        key = (record["name"], record["date"])
        note = existing.get(key)

        if note is None:
            new_note = TastingNote(**record)
            db.add(new_note)
            existing[key] = new_note
            imported += 1
            continue

        if mode == "skip":
            skipped += 1
            continue

        changed = False
        for field, value in record.items():
            if getattr(note, field) != value:
                setattr(note, field, value)
                changed = True

        if changed:
            updated += 1
        else:
            unchanged += 1

    db.commit()

    return {
        "imported": imported,
        "updated": updated,
        "unchanged": unchanged,
        "skipped_duplicates": skipped,
        "errors": errors,
        "total_rows": len(records) + len(errors),
    }
