"""SQLAlchemy モデル定義。"""

from datetime import date as date_type
from datetime import datetime, timezone

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class TastingNote(Base):
    """テイスティング記録1本分。

    列構成は既存の data/wine_log.csv に合わせてある。style と blend_note は
    開発指示書のデータ項目には無いが、既存Excelに実データが入っているため
    インポート時に取りこぼさないよう残している。
    """

    __tablename__ = "tasting_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    date: Mapped[date_type | None] = mapped_column(Date, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    region: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    variety: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    blend_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    vintage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_yen: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purchase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    abv: Mapped[float | None] = mapped_column(Float, nullable=True)
    # 既存データは "8C" のように単位付きの文字列なので数値化せずそのまま持つ。
    temp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    decant_min: Mapped[int | None] = mapped_column(Integer, nullable=True)

    fruit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    floral: Mapped[int | None] = mapped_column(Integer, nullable=True)
    herb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spice: Mapped[int | None] = mapped_column(Integer, nullable=True)
    oak: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vanilla: Mapped[int | None] = mapped_column(Integer, nullable=True)
    earth: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mineral: Mapped[int | None] = mapped_column(Integer, nullable=True)
    acid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tannin: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sweet: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body: Mapped[int | None] = mapped_column(Integer, nullable=True)
    finish: Mapped[int | None] = mapped_column(Integer, nullable=True)

    overall_0_10: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repurchase_0_10: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
