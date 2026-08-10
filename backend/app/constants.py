"""香味項目やタイプなど、アプリ全体で共有する定数。

香味13項目の並びは data/wine_log.csv および開発指示書と同じ順序で固定する。
この順序は API のレスポンスやレーダーチャートの軸順にもそのまま使われるため、
新しい項目を足すとき以外は並べ替えないこと。
"""

FLAVOR_KEYS = [
    "fruit",
    "floral",
    "herb",
    "spice",
    "oak",
    "vanilla",
    "earth",
    "mineral",
    "acid",
    "tannin",
    "sweet",
    "body",
    "finish",
]

FLAVOR_LABELS_JA = {
    "fruit": "果実",
    "floral": "花",
    "herb": "ハーブ",
    "spice": "スパイス",
    "oak": "樽",
    "vanilla": "バニラ",
    "earth": "土/熟成",
    "mineral": "ミネラル",
    "acid": "酸",
    "tannin": "タンニン",
    "sweet": "甘味",
    "body": "ボディ",
    "finish": "余韻",
}

FLAVOR_MIN = 0
FLAVOR_MAX = 5

# color と style は既存Excelテンプレートのドロップダウンに合わせている。
# 泡は color ではなく style で表す（スパークリングロゼ = color:roze, style:sparkling）。
# 綴りが "rose" ではなく "roze" なのもテンプレートに合わせたもので、
# Excel と値をそのまま行き来させるためにあえて揃えてある。
COLORS = ["red", "white", "roze", "orange"]

COLOR_LABELS_JA = {
    "red": "赤",
    "white": "白",
    "roze": "ロゼ",
    "orange": "オレンジ",
}

# 表記ゆれの吸収用。既存Excel/CSVには "Red" や "ロゼ" のような値が混ざりうる。
COLOR_ALIASES = {
    "red": "red",
    "赤": "red",
    "white": "white",
    "白": "white",
    "roze": "roze",
    "rose": "roze",
    "rosé": "roze",
    "ロゼ": "roze",
    "orange": "orange",
    "オレンジ": "orange",
}

STYLES = ["still", "sparkling"]

STYLE_ALIASES = {
    "still": "still",
    "スティル": "still",
    "sparkling": "sparkling",
    "sparkle": "sparkling",
    "スパークリング": "sparkling",
    "泡": "sparkling",
}

# PCA/クラスタリングで使う香味軸のスクリーニングしきい値。
# 既存のRコード(index_rev.qmd の var_threshold)と同じ既定値。
DEFAULT_VAR_THRESHOLD = 0.15
