import { useRef, useState } from "react";
import { isBrowserStorage, store } from "../store.js";
import { downloadCsv } from "../csv.js";

const MODES = [
  {
    key: "skip",
    label: "重複は飛ばす",
    hint: "既にある記録はそのまま。新しい行だけ追加します。",
  },
  {
    key: "update",
    label: "既存行を上書きする",
    hint: "Excel 側で直した内容をアプリに反映します。アプリ側でだけ編集した内容は失われます。",
  },
];

export default function ImportPage({ notes, onImported, onToast }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("skip");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await store.importFile(file, mode);
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadSample = async () => {
    if (
      notes.length > 0 &&
      !window.confirm(
        "今の記録をすべて置き換えてサンプルを読み込みます。よろしいですか?"
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const count = await store.loadSample();
      onToast(`サンプル${count}件を読み込みました`);
      await onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (
      !window.confirm(
        "この端末に保存した記録をすべて削除します。元に戻せません。よろしいですか?"
      )
    ) {
      return;
    }
    await store.clear();
    onToast("削除しました");
    await onImported();
  };

  const activeMode = MODES.find((m) => m.key === mode);

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="panel">
        <p className="panel-title">これまでの記録を取り込む</p>

        <p className="meta-line" style={{ marginBottom: 16 }}>
          Excel（.xlsx）または CSV をそのままアップロードできます。文字コードは
          Shift-JIS / UTF-8 のどちらでも読み取ります。ワイン名と日付が同じ行を
          「同じ1本」とみなします。
          {isBrowserStorage &&
            "アップロードしたファイルは集計のために読み取るだけで、サーバーには保存されません。"}
        </p>

        <label className="fieldlabel">ファイル</label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xlsm,.tsv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setError("");
          }}
          style={{
            width: "100%",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 10,
            color: "var(--text-dim)",
            fontSize: 13,
            marginBottom: 16,
          }}
        />

        <label className="fieldlabel">既にある記録の扱い</label>
        <div className="colortoggle" style={{ marginBottom: 8 }}>
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`colorbtn ${mode === m.key ? "active red" : ""}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="meta-line" style={{ marginBottom: 18 }}>
          {activeMode.hint}
        </p>

        <button className="savebtn" onClick={handleUpload} disabled={!file || busy}>
          {busy ? "取り込み中…" : "取り込む"}
        </button>

        {error && (
          <div className="notice error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        {result && (
          <div className="notice ok" style={{ marginTop: 16 }}>
            <div>
              新規 {result.imported}件
              {mode === "update" && ` / 更新 ${result.updated}件`}
              {mode === "update" && ` / 変更なし ${result.unchanged}件`}
              {mode === "skip" && ` / 重複でスキップ ${result.skipped_duplicates}件`}
            </div>
            {result.errors.length > 0 && (
              <>
                <div style={{ marginTop: 10, color: "var(--text-dim)" }}>
                  取り込めなかった行：
                </div>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {result.errors.map((e, i) => (
                    <li key={i} style={{ color: "var(--text-dim)" }}>
                      {e}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <p className="panel-title">
          データの管理<span className="count">{notes.length}件</span>
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            className="ghostbtn"
            onClick={() => downloadCsv(notes)}
            disabled={notes.length === 0}
          >
            CSVに書き出す
          </button>

          {isBrowserStorage && (
            <>
              <button className="ghostbtn" onClick={handleLoadSample} disabled={busy}>
                サンプルを読み込む
              </button>
              <button
                className="ghostbtn"
                onClick={handleClear}
                disabled={notes.length === 0}
              >
                すべて削除
              </button>
            </>
          )}
        </div>

        {isBrowserStorage && (
          <p className="meta-line" style={{ marginTop: 14 }}>
            この画面の記録は、サーバーではなく<strong>お使いのブラウザの中だけ</strong>に
            保存されています。他の人には見えませんが、ブラウザの履歴やサイトデータを
            消すと一緒に消えます。残しておきたい記録は CSV に書き出してください。
            書き出したファイルはそのまま取り込み直せます。
          </p>
        )}
      </div>
    </div>
  );
}
