import { useEffect, useState } from "react";

import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sb, type Child } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";

const GRADES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
const BOARDS = ["CBSE", "ICSE", "Maharashtra State Board", "UP Board", "Rajasthan Board", "Other"];
function cap(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }

export function Profile() {
  const { session, profile, loading, signOut } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [editing, setEditing] = useState<Child | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", grade: "", board: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !session) window.location.href = "/login"; }, [loading, session]);
  useEffect(() => {
    if (!session?.user) return;
    sb.from("children").select("*").eq("user_id", session.user.id).order("created_at")
      .then(({ data }) => setChildren((data as Child[]) ?? []));
  }, [session?.user?.id]);

  async function saveChild() {
    if (!form.name.trim() || !session?.user) return;
    setBusy(true);
    try {
      if (editing) {
        await sb.from("children").update({ name: form.name, grade: form.grade || null, board: form.board || null }).eq("id", editing.id);
        setChildren(cs => cs.map(c => c.id === editing.id ? { ...c, name: form.name, grade: form.grade || null, board: form.board || null } : c));
        setEditing(null);
      } else {
        const { data } = await sb.from("children").insert({ user_id: session.user.id, name: form.name.trim(), grade: form.grade || null, board: form.board || null, is_default: children.length === 0 }).select().single();
        if (data) setChildren(cs => [...cs, data as Child]);
        setAdding(false);
      }
      setForm({ name: "", grade: "", board: "" });
    } catch (e) { toast.error(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (!confirm("Vidya se log out karein?")) return;
    await signOut(); window.location.href = "/login";
  }

  if (!session) return null;
  const name = profile?.full_name ?? "Parent";
  const phone = session.user.phone || session.user.email || "";

  const inputStyle = { width: "100%", height: 42, border: "0.5px solid var(--c-border)", borderRadius: 8, background: "var(--c-bg)", padding: "0 12px", fontSize: 14, outline: "none", marginBottom: 8, color: "var(--c-text)" };

  const childForm = (
    <div style={{ padding: 12, background: "var(--c-bg2)", border: "0.5px solid var(--c-accent)", borderRadius: 10, marginBottom: 8 }}>
      <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bacche ka naam" style={inputStyle} />
      <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} style={{ ...inputStyle, color: form.grade ? "var(--c-text)" : "var(--c-text3)" }}>
        <option value="">Grade</option>
        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))} style={{ ...inputStyle, marginBottom: 12, color: form.board ? "var(--c-text)" : "var(--c-text3)" }}>
        <option value="">Board</option>
        {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={saveChild} disabled={busy || !form.name.trim()}
          style={{ flex: 1, height: 38, borderRadius: 8, background: "var(--c-accent)", color: "#fff", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", opacity: busy || !form.name.trim() ? 0.6 : 1 }}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button onClick={() => { setEditing(null); setAdding(false); setForm({ name: "", grade: "", board: "" }); }}
          style={{ flex: 1, height: 38, borderRadius: 8, background: "var(--c-bg3)", color: "var(--c-text2)", fontSize: 14, border: "none", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 64 }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderBottom: "0.5px solid var(--c-border)" }}>
        <button onClick={() => window.location.href = "/home"} style={{ color: "var(--c-text2)", display: "flex", background: "none", border: "none", cursor: "pointer" }}><ArrowLeft size={20} /></button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Profile</span>
      </div>
      <div style={{ padding: "24px 16px 20px", borderBottom: "0.5px solid var(--c-border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "var(--c-accent)" }}>
          {name.charAt(0)}
        </div>
        <p style={{ fontSize: 16, fontWeight: 500 }}>{name}</p>
        <p style={{ fontSize: 12, color: "var(--c-text2)" }}>{phone}</p>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your children</p>
        {children.map(c => (
          editing?.id === c.id ? <div key={c.id}>{childForm}</div> :
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "var(--c-bg2)", border: "0.5px solid var(--c-border)", borderRadius: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "var(--c-accent)", flexShrink: 0 }}>
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{cap(c.name)}</p>
              <p style={{ fontSize: 12, color: "var(--c-text2)", marginTop: 1 }}>{[c.grade, c.board].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={() => { setEditing(c); setAdding(false); setForm({ name: c.name, grade: c.grade ?? "", board: c.board ?? "" }); }}
              style={{ fontSize: 12, color: "var(--c-accent)", border: "0.5px solid rgba(249,115,22,0.3)", borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3, background: "none", cursor: "pointer" }}>
              <Pencil size={11} /> Edit
            </button>
          </div>
        ))}
        {adding ? childForm : (
          <button onClick={() => { setAdding(true); setEditing(null); setForm({ name: "", grade: "", board: "" }); }}
            style={{ width: "100%", height: 44, border: "0.5px dashed var(--c-border)", borderRadius: 10, color: "var(--c-text2)", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "none", cursor: "pointer" }}>
            <Plus size={14} /> Add a child
          </button>
        )}
        <button onClick={logout}
          style={{ width: "100%", height: 44, marginTop: 24, border: "0.5px solid rgba(226,75,74,0.3)", borderRadius: 10, color: "var(--c-danger)", fontSize: 13, fontWeight: 500, background: "none", cursor: "pointer" }}>
          Log out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
