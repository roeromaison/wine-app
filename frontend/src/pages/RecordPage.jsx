import { useMemo, useState } from "react";
import DotScale from "../components/DotScale.jsx";
import FlavorRadar from "../components/FlavorRadar.jsx";
import { store } from "../store.js";

const emptyFlavors = (flavors) =>
  Object.fromEntries(flavors.map((f) => [f.key, 0]));

const emptyForm = (flavors) => ({
  date: new Date().toISOString().slice(0, 10),
  name: "",
  country: "",
  region: "",
  variety: "",
  color: "red",
  style: "still",
  vintage: "",
  price_yen: "",
  purchase: "",
  abv: "",
  temp: "",
  decant_min: "",
  overall_0_10: 0,
  repurchase_0_10: 0,
  memo: "",
  ...emptyFlavors(flavors),
});

// 保存済みの記録をフォームの形に戻す。数値の未入力は null のまま持ち、
// 空文字（テキスト欄の未入力）と区別する。0 で埋めてしまうと、
// 評価を付けていない項目が「0点を付けた」に化けてしまう。
const toForm = (note, flavors) => ({
  date: note.date ?? "",
  name: note.name ?? "",
  country: note.country ?? "",
  region: note.region ?? "",
  variety: note.variety ?? "",
  color: note.color ?? "red",
  style: note.style ?? "",
  vintage: note.vintage ?? "",
  price_yen: note.price_yen ?? "",
  purchase: note.purchase ?? "",
  abv: note.abv ?? "",
  temp: note.temp ?? "",
  decant_min: note.decant_min ?? "",
  overall_0_10: note.overall_0_10,
  repurchase_0_10: note.repurchase_0_10,
  memo: note.memo ?? "",
  ...Object.fromEntries(flavors.map((f) => [f.key, note[f.key]])),
});

// 空文字は「未入力」であって 0 ではないので null に落とす。
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const strOrNull = (v) => (v == null || v.trim() === "" ? null : v.trim());

export default function RecordPage({ flavors, masters, notes, onSaved, onToast }) {
  const [form, setForm] = useState(() => emptyForm(flavors));
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  // 編集中は入力中の値を、一覧で記録を選んでいるときはその記録を描く。
  const radarValues = selectedNote ?? form;
  const radarCaption = selectedNote
    ? selectedNote.name
    : form.name || "ワイン名を入力すると、ここに反映されます";

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (note) => {
    setForm(toForm(note, flavors));
    setEditingId(note.id);
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setForm(emptyForm(flavors));
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      onToast("ワイン名を入力してください");
      return;
    }

    const payload = {
      date: form.date || null,
      name: form.name.trim(),
      country: strOrNull(form.country),
      region: strOrNull(form.region),
      variety: strOrNull(form.variety),
      color: form.color,
      style: strOrNull(form.style),
      vintage: numOrNull(form.vintage),
      price_yen: numOrNull(form.price_yen),
      purchase: strOrNull(form.purchase),
      abv: numOrNull(form.abv),
      temp: strOrNull(form.temp),
      decant_min: numOrNull(form.decant_min),
      overall_0_10: form.overall_0_10 ?? null,
      repurchase_0_10: form.repurchase_0_10 ?? null,
      memo: strOrNull(form.memo),
      ...Object.fromEntries(flavors.map((f) => [f.key, form[f.key] ?? null])),
    };

    setSaving(true);
    try {
      if (editingId != null) {
        await store.update(editingId, payload);
        onToast("更新しました");
      } else {
        await store.create(payload);
        onToast("記録しました");
      }
      setForm(emptyForm(flavors));
      setEditingId(null);
      setSelectedId(null);
      await onSaved();
    } catch (err) {
      onToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`「${note.name}」の記録を削除します。よろしいですか?`)) {
      return;
    }
    try {
      await store.remove(note.id);
      if (selectedId === note.id) setSelectedId(null);
      if (editingId === note.id) cancelEdit();
      onToast("削除しました");
      await onSaved();
    } catch (err) {
      onToast(err.message);
    }
  };

  const editing = editingId != null;

  return (
    <div className="grid">
      <div className="panel">
        <p className="panel-title">
          {editing ? "記録を編集" : "記録する"}
          {editing && (
            <button className="ghostbtn" onClick={cancelEdit}>
              編集をやめる
            </button>
          )}
        </p>

        <label className="fieldlabel">ワイン名</label>
        <input
          type="text"
          placeholder="例：シャブリ プルミエクリュ モンマン"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <div className="field-row">
          <div>
            <label className="fieldlabel">飲んだ日</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
            />
          </div>
          <div>
            <label className="fieldlabel">ヴィンテージ</label>
            <input
              type="number"
              placeholder="例：2015"
              value={form.vintage}
              onChange={(e) => setField("vintage", e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div>
            <label className="fieldlabel">国</label>
            <input
              type="text"
              list="country-list"
              placeholder="入力または選択"
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
            />
            <datalist id="country-list">
              {masters.countries.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="fieldlabel">地域</label>
            <input
              type="text"
              list="region-list"
              placeholder="例：Bourgogne (Chablis)"
              value={form.region}
              onChange={(e) => setField("region", e.target.value)}
            />
            <datalist id="region-list">
              {masters.regions.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
        </div>

        <label className="fieldlabel">ブドウ品種</label>
        <input
          type="text"
          list="variety-list"
          placeholder="例：Chardonnay"
          value={form.variety}
          onChange={(e) => setField("variety", e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <datalist id="variety-list">
          {masters.varieties.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>

        <div className="field-row three">
          <div>
            <label className="fieldlabel">価格（円）</label>
            <input
              type="number"
              placeholder="3800"
              value={form.price_yen}
              onChange={(e) => setField("price_yen", e.target.value)}
            />
          </div>
          <div>
            <label className="fieldlabel">購入先</label>
            <input
              type="text"
              placeholder="EC / SHOP"
              value={form.purchase}
              onChange={(e) => setField("purchase", e.target.value)}
            />
          </div>
          <div>
            <label className="fieldlabel">アルコール度数</label>
            <input
              type="number"
              step="0.1"
              placeholder="13.5"
              value={form.abv}
              onChange={(e) => setField("abv", e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div>
            <label className="fieldlabel">提供温度</label>
            <input
              type="text"
              placeholder="8C"
              value={form.temp}
              onChange={(e) => setField("temp", e.target.value)}
            />
          </div>
          <div>
            <label className="fieldlabel">デカンタ（分）</label>
            <input
              type="number"
              placeholder="0"
              value={form.decant_min}
              onChange={(e) => setField("decant_min", e.target.value)}
            />
          </div>
        </div>

        <label className="fieldlabel">色</label>
        <div className="colortoggle">
          {masters.colors.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`colorbtn ${c.key} ${
                form.color === c.key ? "active " + c.key : ""
              }`}
              onClick={() => setField("color", c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 泡は色ではなく style で表す（テンプレートのドロップダウンに合わせている）。 */}
        <label className="fieldlabel">スタイル</label>
        <select
          value={form.style}
          onChange={(e) => setField("style", e.target.value)}
          style={{ marginBottom: 20 }}
        >
          <option value="">未設定</option>
          {masters.styles.map((s) => (
            <option key={s} value={s}>
              {s === "still" ? "スティル（非発泡）" : s === "sparkling" ? "スパークリング" : s}
            </option>
          ))}
        </select>

        <p className="panel-title" style={{ marginTop: 4 }}>
          香味評価<span className="count">0〜5</span>
        </p>
        <div className="flavor-list">
          {flavors.map((f) => (
            <div className="flavor-row" key={f.key}>
              <span className="flavor-name">{f.label}</span>
              <DotScale
                value={form[f.key]}
                onChange={(v) => setField(f.key, v)}
              />
            </div>
          ))}
        </div>

        <div className="overall-row">
          <span className="overall-label">総合評価</span>
          <div className="overall-scale">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                className={`overall-dot ${
                  n <= (form.overall_0_10 ?? -1) ? "filled" : ""
                }`}
                onClick={() => setField("overall_0_10", n)}
                aria-label={`${n}`}
              />
            ))}
          </div>
        </div>

        <div className="overall-row">
          <span className="overall-label">また買いたい度</span>
          <div className="overall-scale">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                className={`overall-dot ${
                  n <= (form.repurchase_0_10 ?? -1) ? "filled" : ""
                }`}
                onClick={() => setField("repurchase_0_10", n)}
                aria-label={`${n}`}
              />
            ))}
          </div>
        </div>

        <label className="fieldlabel">メモ</label>
        <textarea
          placeholder="印象、合わせた料理、抜栓後の変化など"
          value={form.memo}
          onChange={(e) => setField("memo", e.target.value)}
          style={{ marginBottom: 18 }}
        />

        <button className="savebtn" onClick={handleSave} disabled={saving}>
          {saving
            ? "保存中…"
            : editing
              ? "この記録を更新"
              : "記録を保存"}
        </button>
      </div>

      <div>
        <div className="panel">
          <p className="panel-title">
            香味レーダー
            {selectedNote && (
              <button className="ghostbtn" onClick={() => setSelectedId(null)}>
                入力中の値に戻す
              </button>
            )}
          </p>
          <div className="chart-wrap">
            <FlavorRadar flavors={flavors} values={radarValues} />
          </div>
          <p className="radar-caption">{radarCaption}</p>
        </div>

        <div className="panel">
          <p className="panel-title">
            記録一覧<span className="count">{notes.length}件</span>
          </p>
          <div className="history">
            {notes.length === 0 && (
              <div className="empty-history">まだ記録がありません</div>
            )}
            {notes.map((n) => (
              <div
                className={`history-item ${n.id === selectedId ? "selected" : ""} ${
                  n.id === editingId ? "editing" : ""
                }`}
                key={n.id}
                onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(n.id === selectedId ? null : n.id);
                  }
                }}
              >
                <div>
                  <div className="history-name">{n.name}</div>
                  <div className="history-sub">
                    {[n.date, n.country, n.region, n.variety]
                      .filter(Boolean)
                      .join(" / ") || "産地未入力"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="history-score">{n.overall_0_10 ?? "–"}</span>
                  <button
                    className="ghostbtn"
                    style={{ padding: "4px 9px", fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(n);
                    }}
                  >
                    編集
                  </button>
                  <button
                    className="ghostbtn"
                    style={{ padding: "4px 9px", fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n);
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
