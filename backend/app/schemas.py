"""API のリクエスト/レスポンススキーマ。"""

from datetime import date as date_type

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .constants import (
    COLOR_ALIASES,
    DEFAULT_VAR_THRESHOLD,
    FLAVOR_MAX,
    FLAVOR_MIN,
    STYLE_ALIASES,
)

FlavorScore = int | None


class TastingNoteBase(BaseModel):
    date: date_type | None = None
    name: str = Field(min_length=1, max_length=255)
    country: str | None = None
    region: str | None = None
    variety: str | None = None
    color: str = "red"

    style: str | None = None
    blend_note: str | None = None

    vintage: int | None = None
    price_yen: int | None = None
    purchase: str | None = None
    abv: float | None = None
    temp: str | None = None
    decant_min: int | None = None

    fruit: FlavorScore = None
    floral: FlavorScore = None
    herb: FlavorScore = None
    spice: FlavorScore = None
    oak: FlavorScore = None
    vanilla: FlavorScore = None
    earth: FlavorScore = None
    mineral: FlavorScore = None
    acid: FlavorScore = None
    tannin: FlavorScore = None
    sweet: FlavorScore = None
    body: FlavorScore = None
    finish: FlavorScore = None

    overall_0_10: int | None = Field(default=None, ge=0, le=10)
    repurchase_0_10: int | None = Field(default=None, ge=0, le=10)
    memo: str | None = None

    @field_validator("color", mode="before")
    @classmethod
    def normalize_color(cls, v: object) -> str:
        if v is None:
            return "red"
        key = str(v).strip().lower()
        if key not in COLOR_ALIASES:
            raise ValueError(f"未知のタイプです: {v}")
        return COLOR_ALIASES[key]

    @field_validator("style", mode="before")
    @classmethod
    def normalize_style(cls, v: object) -> str | None:
        if v is None or str(v).strip() == "":
            return None
        text = str(v).strip()
        # 未知の値でも弾かずそのまま通す。style はテンプレート外の値を
        # 書きたくなることがあるので、color ほど厳密にしていない。
        return STYLE_ALIASES.get(text.lower(), text)

    @field_validator(
        "fruit", "floral", "herb", "spice", "oak", "vanilla", "earth",
        "mineral", "acid", "tannin", "sweet", "body", "finish",
    )
    @classmethod
    def check_flavor_range(cls, v: int | None) -> int | None:
        if v is not None and not (FLAVOR_MIN <= v <= FLAVOR_MAX):
            raise ValueError(f"香味スコアは{FLAVOR_MIN}〜{FLAVOR_MAX}で入力してください")
        return v


class TastingNoteCreate(TastingNoteBase):
    pass


class TastingNoteUpdate(TastingNoteBase):
    pass


class TastingNoteOut(TastingNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ImportResult(BaseModel):
    """インポート結果のサマリ。"""

    imported: int
    updated: int
    unchanged: int
    skipped_duplicates: int
    errors: list[str]
    total_rows: int


class ColorOption(BaseModel):
    key: str
    label: str


# 分析リクエストで受け取れる記録の上限。公開版は誰でも叩けるので、
# 巨大な配列を投げつけられて計算資源を食い潰されないよう頭を打っておく。
MAX_ANALYSIS_NOTES = 5000


class AnalysisRequest(BaseModel):
    """分析対象の記録一式。

    サーバーは記録を保存しないので、計算のたびにクライアントが持っている
    記録をそのまま送る。個人版（SQLite）でも公開版（ブラウザ保存）でも
    同じエンドポイントを使えるようにするための形。
    """

    notes: list[TastingNoteOut] = Field(max_length=MAX_ANALYSIS_NOTES)
    color: str = "red"
    var_threshold: float = Field(default=0.15, ge=0.0)


class ClusterRequest(AnalysisRequest):
    k: int = Field(default=4, ge=2, le=12)


class HeatmapRequest(BaseModel):
    notes: list[TastingNoteOut] = Field(max_length=MAX_ANALYSIS_NOTES)
    color: str | None = None
    row_field: str = "country"
    min_count: int = Field(default=1, ge=1)
    sort: str = "score"


class ImportParseResult(BaseModel):
    """アップロードされたファイルを解析しただけの結果。DBには何も書かない。"""

    notes: list[TastingNoteCreate]
    errors: list[str]
    total_rows: int


class MasterData(BaseModel):
    """コンボボックス候補。既存データと同梱マスタから作る。"""

    countries: list[str]
    regions: list[str]
    varieties: list[str]
    styles: list[str]
    colors: list[ColorOption]


class PcaPoint(BaseModel):
    id: int
    label: str
    name: str
    country: str | None
    region: str | None
    variety: str | None
    vintage: int | None
    price_yen: int | None
    overall_0_10: int | None
    pc1: float
    pc2: float


class PcaLoading(BaseModel):
    axis: str
    label_ja: str
    pc1: float
    pc2: float


class PcaResult(BaseModel):
    color: str
    n: int
    axes_used: list[str]
    axes_excluded: list[str]
    variance_ratio: list[float]
    points: list[PcaPoint]
    loadings: list[PcaLoading]


class ClusterPoint(PcaPoint):
    cluster: int


class ClusterProfileAxis(BaseModel):
    axis: str
    label_ja: str
    mean: float
    deviation: float


class ClusterGroup(BaseModel):
    cluster: int
    size: int
    label: str
    is_favorite: bool
    mean_overall: float | None
    profile: list[ClusterProfileAxis]


class ClusterResult(BaseModel):
    color: str
    n: int
    k: int
    axes_used: list[str]
    axes_excluded: list[str]
    variance_ratio: list[float]
    points: list[ClusterPoint]
    clusters: list[ClusterGroup]


class HeatmapCell(BaseModel):
    row: str
    col: str
    mean_overall: float
    count: int


class HeatmapMargin(BaseModel):
    label: str
    mean_overall: float
    count: int


class HeatmapResult(BaseModel):
    color: str | None
    row_field: str
    sort: str
    row_labels: list[str]
    col_labels: list[str]
    row_means: list[HeatmapMargin]
    col_means: list[HeatmapMargin]
    cells: list[HeatmapCell]
    n: int
    min_overall: float
    max_overall: float


# 分析リクエストで受け取れる記録の上限。公開版は誰でも叩けるので、
# 巨大な配列を投げつけられて計算資源を食い潰されないよう頭を打っておく。
MAX_ANALYSIS_NOTES = 5000


class AnalysisRequest(BaseModel):
    """分析対象の記録一式。

    サーバーは記録を保存しないので、計算のたびにクライアントが手元の記録を
    そのまま送る。個人版（SQLite保存）でも公開版（ブラウザ保存）でも
    同じエンドポイントを使えるようにするための形。
    """

    notes: list[TastingNoteOut] = Field(max_length=MAX_ANALYSIS_NOTES)
    color: str = "red"
    var_threshold: float = Field(default=DEFAULT_VAR_THRESHOLD, ge=0.0)


class ClusterRequest(AnalysisRequest):
    k: int = Field(default=4, ge=2, le=12)


class HeatmapRequest(BaseModel):
    notes: list[TastingNoteOut] = Field(max_length=MAX_ANALYSIS_NOTES)
    color: str | None = None
    row_field: str = "country"
    min_count: int = Field(default=1, ge=1)
    sort: str = "score"


class ImportParseResult(BaseModel):
    """アップロードされたファイルを解析しただけの結果。DBには何も書かない。

    取り込むかどうかと重複の扱いは、受け取ったクライアント側が決める。
    """

    notes: list[TastingNoteCreate]
    errors: list[str]
    total_rows: int


# ---- 提案（おすすめ） ----


class RecommendRequest(BaseModel):
    """好みに近いワインを提案してもらうリクエスト。

    分析と同じく、記録はサーバーに保存されていないのでクライアントから送る。
    """

    notes: list[TastingNoteOut] = Field(max_length=MAX_ANALYSIS_NOTES)
    color: str = "red"
    limit: int = Field(default=3, ge=1, le=10)
    # maison が何点以上を付けた1本に絞るか。総合評価とまた買いたい度の
    # 両方に効く。null にすると全件が候補になる。
    min_owner_overall: int | None = Field(default=7, ge=0, le=10)
    exclude_recorded: bool = True


class TasteTypeAxis(BaseModel):
    axis: str
    label_ja: str
    z: float


class TasteType(BaseModel):
    name: str
    description: str
    axes: list[TasteTypeAxis]


class ProfileAxis(BaseModel):
    axis: str
    label_ja: str
    value: float
    catalog_mean: float
    z: float


class RecommendItem(BaseModel):
    catalog_id: int
    name: str
    color: str
    country: str | None
    region: str | None
    variety: str | None
    vintage: int | None
    price_yen: int | None
    # 提案元の記録を付けた本人（maison）の評価。誰の点数なのかを画面で明示する。
    owner_overall: int | None
    owner_repurchase: int | None
    distance: float
    match: int
    reasons: list[str]
    caveats: list[str]
    flavors: dict[str, int]
    amazon_url: str
    rakuten_url: str


class RecommendResult(BaseModel):
    color: str
    n_notes: int
    n_used: int
    catalog_size: int
    taste_type: TasteType
    profile: list[ProfileAxis]
    items: list[RecommendItem]
    # ステマ規制対応。画面に必ず出せるよう、本文をAPI側で持つ。
    disclosure: str
    share_text: str
