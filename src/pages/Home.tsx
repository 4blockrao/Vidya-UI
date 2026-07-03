import { useEffect, useRef, useState } from "react";
import { } from "@tanstack/react-router";
import { Camera, Image as Img, Mic, Send, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sb, API, type Child, type Conversation, timeAgo } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { friendlyError } from "@/lib/errors";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

const QUICK = [
  "Yeh homework samjhao",
  "Exam ki tayari karni hai",
  "Practice questions chahiye",
  "Teacher ka remark samjhao",
];

function cap(s: string | null | undefined) {
  if (!s) return "";
  return s.split(" ").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function Home() {
  const { session, profile, loading } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [active, setActive] = useState<Child | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) { window.location.href = "/login"; return; }
  }, [loading, session, profile]);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    sb.from("children").select("*").eq("user_id", uid).order("created_at")
      .then(({ data }) => {
        if (!data) return;
        const kids = data as Child[];
        setChildren(kids);
        setActive(prev => prev ?? kids.find(c => c.is_default) ?? kids[0] ?? null);
      });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;
    sb.from("conversations").select("*")
      .eq("user_id", session.user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(5)
      .then(({ data }) => setConvs((data as Conversation[]) ?? []));
  }, [session?.user?.id]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const ids: string[] = [];
      for (const f of Array.from(files).slice(0, 3)) {
        const blob = await compressImage(f);
        const form = new FormData();
        form.append("file", blob, f.name.replace(/\.[^.]+$/, ".jpg"));
        if (active) form.append("child_id", active.id);
        const res = await fetch(`${API}/api/uploads/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.detail || "Upload failed");
        }
        const j = await res.json();
        ids.push(j.upload_id);
      }
      const p = new URLSearchParams(); p.set("upload", ids[0]); if (active?.id) p.set("child", active.id); window.location.href = "/chat?" + p.toString();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally { setUploading(false); }
  }

  function sendText(msg?: string) {
    const t = (msg ?? text).trim();
    if (!t) return;
    const p = new URLSearchParams(); p.set("q", t); if (active?.id) p.set("child", active.id); window.location.href = "/chat?" + p.toString();
  }

  if (!session) return null;

  const firstName = cap((profile?.full_name ?? "").split(" ")[0]) || "there";
  const childName = cap(active?.name) || "your child";

  return (
    <div className="page" style={{ paddingBottom: 64 }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "0.5px solid var(--c-border)" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: "var(--c-accent)", letterSpacing: -0.5 }}>Vidya</span>
        <button onClick={() => window.location.href = "/profile"}
          style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
          {firstName.charAt(0)}
        </button>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <p style={{ fontSize: 11, color: "var(--c-text3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{greet()}</p>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginTop: 2 }}>{firstName}</h1>

        <div style={{ marginTop: 20, marginBottom: 18 }}>
          <p style={{ fontSize: 20, fontWeight: 500 }}>Hi, I&apos;m Vidya 👋</p>
          <p style={{ fontSize: 14, color: "var(--c-text2)", marginTop: 6, lineHeight: 1.6 }}>
            Main parents ki madad karti hoon — homework, explanations, aur exam prep.
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          {active ? (
            <button onClick={() => setPickerOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20, border: "0.5px solid var(--c-border)", background: "var(--c-bg2)", cursor: "pointer" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {childName.charAt(0)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{childName}</span>
              {active.grade && <span style={{ fontSize: 12, color: "var(--c-text3)" }}>· {active.grade}</span>}
              <ChevronRight size={14} style={{ color: "var(--c-text3)" }} />
            </button>
          ) : (
            <button onClick={() => window.location.href = "/profile"}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: "0.5px dashed var(--c-border)", color: "var(--c-text2)", fontSize: 13, background: "none", cursor: "pointer" }}>
              <Plus size={14} /> Add child
            </button>
          )}
        </div>

        <div style={{ background: "var(--c-bg2)", border: "0.5px solid var(--c-border)", borderRadius: 16, padding: "12px 12px 10px" }}>
          <textarea ref={textRef} rows={1}
            placeholder={`${childName} ki padhai ke baare mein kuch bhi poochhein...`}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            style={{ width: "100%", border: "none", background: "transparent", outline: "none", resize: "none", fontSize: 15, color: "var(--c-text)", lineHeight: 1.5, minHeight: 24, maxHeight: 120, overflow: "auto", fontFamily: "inherit" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[
                { icon: <Camera size={19} />, label: "Camera", action: () => cameraRef.current?.click() },
                { icon: <Img size={19} />, label: "Gallery", action: () => galleryRef.current?.click() },
                { icon: <Mic size={19} />, label: "Voice", action: () => toast("Voice — jald aa raha hai! 🎤") },
              ].map(b => (
                <button key={b.label} onClick={b.action} aria-label={b.label}
                  style={{ width: 36, height: 36, borderRadius: 10, color: "var(--c-text2)", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}>
                  {b.icon}
                </button>
              ))}
            </div>
            <button onClick={() => sendText()} disabled={!text.trim() && !uploading}
              style={{ width: 34, height: 34, borderRadius: "50%", background: text.trim() ? "var(--c-accent)" : "var(--c-bg3)", color: text.trim() ? "#fff" : "var(--c-text3)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
              {uploading ? <span style={{ fontSize: 12 }}>...</span> : <Send size={16} />}
            </button>
          </div>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />

        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 22, marginBottom: 10 }}>Quick actions</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => sendText(q)}
              style={{ padding: "11px 12px", background: "var(--c-bg2)", border: "0.5px solid var(--c-border)", borderRadius: 12, fontSize: 13, color: "var(--c-text)", textAlign: "left", lineHeight: 1.4, cursor: "pointer" }}>
              {q}
            </button>
          ))}
        </div>

        {convs.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 22, marginBottom: 10 }}>Recent</p>
            {convs.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => window.location.href = "/chat?id=" + c.id}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--c-bg)", border: "0.5px solid var(--c-border)", borderRadius: 10, marginBottom: 6, textAlign: "left", cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>📚</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title ?? "Conversation"}</p>
                  <p style={{ fontSize: 11, color: "var(--c-text3)", marginTop: 1 }}>{[c.subject, timeAgo(c.last_message_at)].filter(Boolean).join(" · ")}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--c-text3)", flexShrink: 0 }} />
              </button>
            ))}
          </>
        )}
      </div>

      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--c-bg)", borderRadius: "16px 16px 0 0", padding: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Baccha chunein</p>
            {children.map(c => (
              <button key={c.id} onClick={() => { setActive(c); setPickerOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `0.5px solid ${active?.id === c.id ? "var(--c-accent)" : "var(--c-border)"}`, background: active?.id === c.id ? "var(--c-accent-bg)" : "var(--c-bg2)", borderRadius: 10, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: active?.id === c.id ? "var(--c-accent-text)" : "var(--c-text)" }}>{cap(c.name)}</p>
                  <p style={{ fontSize: 12, color: "var(--c-text2)" }}>{[c.grade, c.board].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
