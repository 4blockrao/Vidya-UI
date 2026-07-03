import { useRouterState } from "@tanstack/react-router";
import { Home, User } from "lucide-react";

export function BottomNav() {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: 52, borderTop: "0.5px solid var(--c-border)", background: "var(--c-bg)", display: "flex", zIndex: 50 }}>
      <NavBtn onClick={() => { window.location.href = "/home"; }} icon={<Home size={20} />} label="Home" active={path === "/home"} />
      <NavBtn onClick={() => { window.location.href = "/profile"; }} icon={<User size={20} />} label="Profile" active={path === "/profile"} />
    </nav>
  );
}

function NavBtn({ onClick, icon, label, active }: { onClick: () => void; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <button onClick={onClick} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: active ? "var(--c-accent)" : "var(--c-text3)", border: "none", background: "none", cursor: "pointer", fontSize: 10, fontWeight: 500 }}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
