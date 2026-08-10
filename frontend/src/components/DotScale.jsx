// 0〜5 をクリックで選ぶドット。プロトタイプの操作感をそのまま踏襲。

export default function DotScale({ value, onChange, max = 5, readOnly = false }) {
  const current = value ?? 0;

  return (
    <div className="dotscale">
      {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}`}
          aria-pressed={current === n}
          disabled={readOnly}
          className={`dot ${n <= current ? "filled" : ""} ${
            current === n ? "active" : ""
          }`}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}
