"""Excel / CSV の取り込み。

- POST /api/import/parse … 解析して記録の配列を返すだけ。DBには書かない。
                            公開版・個人版とも使える
- POST /api/import        … 解析してそのままDBに保存する。個人版のみ
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import IS_PUBLIC
from ..database import get_db
from ..schemas import ImportParseResult, ImportResult, TastingNoteCreate
from ..services import importer

router = APIRouter(prefix="/api", tags=["import"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="ファイルが空です")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="ファイルサイズは10MBまでです")
    return content


@router.post("/import/parse", response_model=ImportParseResult)
async def parse_file(file: UploadFile = File(...)) -> ImportParseResult:
    """ファイルを解析して記録を返す。取り込むかどうかは呼び出し側が決める。"""
    content = await _read_upload(file)

    try:
        df = importer.read_table(file.filename or "", content)
        records, errors = importer.parse_rows(df)
    except importer.ImportError_ as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ImportParseResult(
        notes=[TastingNoteCreate(**record) for record in records],
        errors=errors,
        total_rows=len(records) + len(errors),
    )


if not IS_PUBLIC:

    @router.post("/import", response_model=ImportResult)
    async def import_file(
        file: UploadFile = File(...),
        mode: str = Form("skip"),
        db: Session = Depends(get_db),
    ) -> ImportResult:
        """mode="skip" は既存記録を飛ばす、"update" は Excel 側の値で上書きする。"""
        content = await _read_upload(file)

        try:
            df = importer.read_table(file.filename or "", content)
            result = importer.import_dataframe(db, df, mode=mode)
        except importer.ImportError_ as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return ImportResult(**result)
