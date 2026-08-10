"""テイスティング記録の CRUD。個人版（WINE_APP_MODE=personal）でのみ有効。

公開版はサーバーに記録を保存しないので、このルーター自体を読み込まない。
香味軸とコンボボックス候補は DB を必要としないため meta.py に分けてある。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TastingNote
from ..schemas import TastingNoteCreate, TastingNoteOut, TastingNoteUpdate

router = APIRouter(prefix="/api", tags=["notes"])


def _get_or_404(db: Session, note_id: int) -> TastingNote:
    note = db.get(TastingNote, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="記録が見つかりません")
    return note


@router.get("/notes", response_model=list[TastingNoteOut])
def list_notes(
    db: Session = Depends(get_db),
    color: str | None = Query(default=None),
    limit: int = Query(default=2000, ge=1, le=5000),
) -> list[TastingNote]:
    stmt = select(TastingNote)
    if color:
        stmt = stmt.where(TastingNote.color == color)
    # 日付が未入力の記録もあるので、id を副キーにして並びを安定させる。
    stmt = stmt.order_by(TastingNote.date.desc().nulls_last(), TastingNote.id.desc())
    return list(db.scalars(stmt.limit(limit)))


@router.get("/notes/{note_id}", response_model=TastingNoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)) -> TastingNote:
    return _get_or_404(db, note_id)


@router.post("/notes", response_model=TastingNoteOut, status_code=201)
def create_note(payload: TastingNoteCreate, db: Session = Depends(get_db)) -> TastingNote:
    note = TastingNote(**payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/notes/{note_id}", response_model=TastingNoteOut)
def update_note(
    note_id: int, payload: TastingNoteUpdate, db: Session = Depends(get_db)
) -> TastingNote:
    note = _get_or_404(db, note_id)
    for field, value in payload.model_dump().items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get_or_404(db, note_id))
    db.commit()
