import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { isBrowserStorage, store } from "./store.js";
import ClusterPage from "./pages/ClusterPage.jsx";
import HeatmapPage from "./pages/HeatmapPage.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import PcaPage from "./pages/PcaPage.jsx";
import RecordPage from "./pages/RecordPage.jsx";

const TABS = [
  { key: "record", label: "記録する" },
  { key: "pca", label: "分析（PCA）" },
  { key: "cluster", label: "クラスター" },
  { key: "heatmap", label: "ヒートマップ" },
  { key: "import", label: "インポート" },
];

const EMPTY_MASTERS = {
  countries: [],
  regions: [],
  varieties: [],
  styles: [],
  colors: [],
};

export default function App() {
  const [tab, setTab] = useState("record");
  const [flavors, setFlavors] = useState([]);
  const [masters, setMasters] = useState(EMPTY_MASTERS);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState("");
  const [bootError, setBootError] = useState("");

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }, []);

  // 記録を追加/削除/取り込みした後は、一覧とマスタ候補を両方引き直す
  // （新しい産地や品種が候補に増えるため）。
  const refresh = useCallback(async () => {
    const [notesData, mastersData] = await Promise.all([
      store.list(),
      api.getMasters(),
    ]);
    setNotes(notesData);
    setMasters(mastersData);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const flavorsData = await api.listFlavors();
        setFlavors(flavorsData);
        await refresh();
      } catch (err) {
        setBootError(
          `バックエンドに接続できませんでした（${err.message}）。` +
            "backend ディレクトリで uvicorn が起動しているか確認してください。"
        );
      }
    })();
  }, [refresh]);

  return (
    <div className="app">
      <div className="shell">
        <p className="eyebrow">roero-maison</p>
        <h1>ワインをデータで飲んでいます</h1>
        <p className="subhead">
          産地とブドウ品種を入力し、香味13項目をクリックで評価すると、レーダーチャートが
          その場で更新されます。記録が溜まったら、分析タブで好みの地図（PCA）を確認できます。
        </p>

        {bootError && <div className="notice error">{bootError}</div>}

        {/* 公開版の初回訪問。記録がゼロだとどのグラフも空になってしまうので、
            まず何を試せばいいかをここで示す。 */}
        {!bootError && isBrowserStorage && notes.length === 0 && (
          <div className="notice" style={{ marginBottom: 22 }}>
            記録はお使いのブラウザの中だけに保存され、サーバーには送られません。
            まず動きを見たい場合は「インポート」タブの
            <strong>「サンプルを読み込む」</strong>から、実際のテイスティング記録
            80件（商品名や価格を伏せたもの）を読み込めます。
          </div>
        )}

        {!bootError && flavors.length > 0 && (
          <>
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`tab ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "record" && (
              <RecordPage
                flavors={flavors}
                masters={masters}
                notes={notes}
                onSaved={refresh}
                onToast={showToast}
              />
            )}
            {tab === "pca" && (
              <PcaPage flavors={flavors} masters={masters} notes={notes} />
            )}
            {tab === "cluster" && (
              <ClusterPage flavors={flavors} masters={masters} notes={notes} />
            )}
            {tab === "heatmap" && (
              <HeatmapPage masters={masters} notes={notes} />
            )}
            {tab === "import" && (
              <ImportPage
                notes={notes}
                onImported={refresh}
                onToast={showToast}
              />
            )}
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
