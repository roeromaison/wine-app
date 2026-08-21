import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { isBrowserStorage, store } from "./store.js";
import ClusterPage from "./pages/ClusterPage.jsx";
import HeatmapPage from "./pages/HeatmapPage.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import PcaPage from "./pages/PcaPage.jsx";
import RecommendPage from "./pages/RecommendPage.jsx";
import RecordPage from "./pages/RecordPage.jsx";
import UsagePage from "./pages/UsagePage.jsx";

const TABS = [
  { key: "usage", label: "アプリの使い方" },
  { key: "record", label: "記録する" },
  { key: "recommend", label: "おすすめ" },
  { key: "pca", label: "分析（PCA）" },
  { key: "cluster", label: "クラスター" },
  { key: "heatmap", label: "ヒートマップ" },
  // 「インポート」だと書き出しがここにあると分からないので、両方を名前に入れる。
  { key: "import", label: "保存・読み込み" },
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
  // 記録がゼロの初回訪問だけ、最初に開くタブを「アプリの使い方」にする。
  // 一度切り替えたあとは邪魔をしないよう、判定は初回の読み込み時だけ行う。
  const [tabDecided, setTabDecided] = useState(false);
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
        setTabDecided(true);
      } catch (err) {
        setBootError(
          `バックエンドに接続できませんでした（${err.message}）。` +
            "backend ディレクトリで uvicorn が起動しているか確認してください。"
        );
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!tabDecided) return;
    if (isBrowserStorage && notes.length === 0) setTab("usage");
  }, [tabDecided]); // notes は初回判定にだけ使う（依存に入れない）

  return (
    <div className="app">
      <div className="shell">
        <p className="eyebrow">roero-maison</p>
        <h1>ワインをデータで飲んでいます</h1>
        {/* 日本語のJSXテキストを行またぎで書くと、改行がスペース1つに変換されて
            文中に空白が入ってしまう。文字列式に分けて書けば空白は入らない。 */}
        {/* 文ごとに span で区切って、折り返しが文の途中から始まらないようにする。
            文の中の折り返しは word-break: auto-phrase が文節で切ってくれる。 */}
        <p className="subhead">
          <span>
            {"香味13項目をクリックで評価すると、レーダーチャートがその場で更新されます。"}
          </span>
          <span>
            {"記録が溜まると、好みの地図（PCA）や"}
            {"似たワインのグループ分けが見られます。"}
          </span>
        </p>

        {bootError && <div className="notice error">{bootError}</div>}

        {/* 公開版の初回訪問。記録がゼロだとどのグラフも空になってしまうので、
            まず何を試せばいいかをここで示す。 */}
        {!bootError && isBrowserStorage && notes.length === 0 && (
          <div className="notice" style={{ marginBottom: 22 }}>
            {"記録はお使いのブラウザの中だけに保存され、サーバーには送られません。"}
            {"初めての方は"}
            <strong>「アプリの使い方」</strong>
            {"タブをご覧ください。記録を続けるための手順と、"}
            {"サンプルの読み込み方をまとめてあります。"}
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

            {tab === "usage" && (
              <UsagePage onNavigate={setTab} noteCount={notes.length} />
            )}
            {tab === "record" && (
              <RecordPage
                flavors={flavors}
                masters={masters}
                notes={notes}
                onSaved={refresh}
                onToast={showToast}
              />
            )}
            {tab === "recommend" && (
              <RecommendPage flavors={flavors} masters={masters} notes={notes} />
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
