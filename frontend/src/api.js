// バックエンド(FastAPI)への薄いラッパ。
//
// 分析APIは「手元の記録を送って計算結果を受け取る」形。サーバーは記録を保存しないので、
// 記録がブラウザにある公開版でも、SQLiteにある個人版でも同じ呼び方ができる。
//
// VITE_API_BASE が設定されていればそのURLへ、無ければ相対パスで呼ぶ。
// 本番の公開版は「画面は静的ホスティング・APIは別サーバー」に分けてあるため、
// 画面側から見るとAPIは別オリジンになる。開発中は Vite のプロキシが
// 相対パスを 8000 番へ転送するので、未設定のままでよい。
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const url = (path) => `${API_BASE}${path}`;

async function request(path, options = {}) {
  const response = await fetch(url(path), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    // FastAPI は {detail: "..."} 形式でエラーを返す。
    let message = `通信に失敗しました (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d) => d.msg).join(" / ");
      }
    } catch {
      // JSON でないレスポンスはそのまま既定のメッセージを使う
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

const post = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  listFlavors: () => request("/api/flavors"),
  getMasters: () => request("/api/masters"),

  // ---- 記録CRUD（個人版のみ。公開版ではこれらのエンドポイントは存在しない） ----
  listNotes: () => request("/api/notes"),
  createNote: (payload) => post("/api/notes", payload),
  updateNote: (id, payload) =>
    request(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNote: (id) => request(`/api/notes/${id}`, { method: "DELETE" }),

  // ---- 分析（記録を送って計算結果を受け取る） ----
  getPca: (notes, color, varThreshold) =>
    post("/api/analysis/pca", {
      notes,
      color,
      ...(varThreshold != null ? { var_threshold: varThreshold } : {}),
    }),

  getClusters: (notes, color, k) =>
    post("/api/analysis/clusters", { notes, color, k }),

  // ---- 提案（好みに近いワイン） ----
  // minOwnerOverall に null を渡すと「maison の評価で絞らない」になる。
  // null と未指定を区別する必要があるので ?? は使えない。
  getRecommendations: (notes, color, options = {}) =>
    post("/api/recommend", {
      notes,
      color,
      limit: options.limit ?? 3,
      min_owner_overall:
        options.minOwnerOverall === undefined ? 7 : options.minOwnerOverall,
      exclude_recorded: options.excludeRecorded ?? true,
    }),

  getHeatmap: (notes, color, rowField, minCount, sort = "score") =>
    post("/api/analysis/heatmap", {
      notes,
      color: color || null,
      row_field: rowField,
      min_count: minCount,
      sort,
    }),

  // ---- ファイル取り込み ----
  // アップロードは Content-Type をブラウザに決めさせる必要があるため
  // request() を通さず fetch を直接呼ぶ。
  parseImportFile: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(url("/api/import/parse"), {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail || `読み取りに失敗しました (${response.status})`);
    }
    return body;
  },

  importFile: async (file, mode = "skip") => {
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    const response = await fetch(url("/api/import"), {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail || `取り込みに失敗しました (${response.status})`);
    }
    return body;
  },
};
