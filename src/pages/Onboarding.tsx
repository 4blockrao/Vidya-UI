import { useEffect, useState } from "react";

import { sb } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const GRADES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
const BOARDS = ["CBSE", "ICSE", "Maharashtra State Board", "UP Board", "Rajasthan Board", "Other"];

export function Onboarding() {
  const { session, profile, loading, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) window.location.href = "/login";
    if (profile?.onboarding_completed) window.location.href = "/home";
    if (profile?.full_name) setName(profile.full_name);
  }, [loading, session, profile]);

  async function finish() {
    if (!session?.user) return;
    setBusy(true);
    try {
      await sb.from("profiles").upsert({ id: session.user.id, full_name: name.trim(), onboarding_completed: true });
      await sb.from("children").insert({ user_id: session.user.id, name: childName.trim(), grade: grade || null, board: board || null, is_default: true });
      await refresh();
      window.location.href = "/home";
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setBusy(false); }
  }

  const pct = (step / 2) * 100;

  return (
    <div className="page" style={{ minHeight: "100dvh" }}>
      <div style={{ height: 3, background: "var(--c-bg3)" }}>
        <div style={{ height: 3, width: `${pct}%`, background: "var(--c-accent)", transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        {step > 1
          ? <button onClick={() => setStep(s => s - 1)} style={{ color: "var(--c-text2)", display: "flex", background: "none", border: "none", cursor: "pointer" }}><ArrowLeft size={20} /></button>
          : <span />}
        <span style={{ fontSize: 11, color: "var(--c-text3)" }}>Step {step} of 2</span>
        <span style={{ width: 20 }} />
      </div>
      <div style={{ padding: "8px 20px 40px" }}>
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Aapka naam kya hai?</h1>
            <p style={{ fontSize: 14, color: "var(--c-text2)", marginBottom: 24 }}>Taaki Vidya jaane kisse baat kar rahi hai</p>
            <input autoFocus placeholder="Aapka pura naam" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && setStep(2)}
              style={{ width: "100%", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", padding: "0 14px", fontSize: 15, color: "var(--c-text)", outline: "none" }} />
            <button onClick={() => setStep(2)} disabled={!name.trim()}
              style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 10, background: name.trim() ? "var(--c-accent)" : "var(--c-bg3)", color: name.trim() ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, border: "none", cursor: "pointer" }}>
              Continue
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Bacche ke baare mein batayein</h1>
            <p style={{ fontSize: 14, color: "var(--c-text2)", marginBottom: 24 }}>Vidya unke level pe explain karegi</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input autoFocus placeholder="Bacche ka naam" value={childName} onChange={e => setChildName(e.target.value)}
                style={{ width: "100%", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", padding: "0 14px", fontSize: 15, color: "var(--c-text)", outline: "none" }} />
              <select value={grade} onChange={e => setGrade(e.target.value)}
                style={{ width: "100%", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", padding: "0 14px", fontSize: 15, color: grade ? "var(--c-text)" : "var(--c-text3)", outline: "none" }}>
                <option value="">Grade chunein</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={board} onChange={e => setBoard(e.target.value)}
                style={{ width: "100%", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", padding: "0 14px", fontSize: 15, color: board ? "var(--c-text)" : "var(--c-text3)", outline: "none" }}>
                <option value="">Board chunein</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <button onClick={finish} disabled={busy || !childName.trim()}
              style={{ width: "100%", height: 48, marginTop: 16, borderRadius: 10, background: childName.trim() ? "var(--c-accent)" : "var(--c-bg3)", color: childName.trim() ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, border: "none", cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
              {busy ? "Setup ho raha hai..." : "Shuru Karein"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
