export function Spinner() {
  return (
    <div style={{
      display: "inline-flex", gap: 4, alignItems: "center"
    }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--c-text3)",
          animation: "vidya-pulse 1.2s infinite ease-in-out",
          animationDelay: `${d}s`,
          display: "inline-block",
        }} />
      ))}
    </div>
  );
}
