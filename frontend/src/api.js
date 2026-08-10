// バックエンド(FastAPI)への薄いラッパ。
// パスは常に相対にしておき、開発中は Vite のプロキシ経由で 8000 番へ流す。
//
// 分析APIは「手元の記録を送って計算結果を受け取る」形。サーバーは記録を保存しないので、
// 記録がブラウザにある公開版でも、SQLiteにある個人版でも同じ呼び方ができる。

async function request(path, options = {}) {
  const response = await fetch(path, {
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
    const response = await fetch("/api/import/parse", { method: "POST", body: form });
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
    const response = await fetch("/api/import", { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail || `取り込みに失敗しました (${response.status})`);
    }
    return body;
  },
};
