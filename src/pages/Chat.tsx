import { useEffect, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { ArrowLeft, Camera, Mic, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sb, API, type Message, getSignedUrl } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { friendlyError } from "@/lib/errors";
import { Spinner } from "@/components/Spinner";
import { toast } from "sonner";

type UIMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePath?: string | null;
  pending?: boolean;
  streaming?: boolean;
  chips?: boolean;
};

function md(text: string) {
  const paras = text.split(/\n\n+/);
  return paras.map((p, i) => (
    <p key={i} style={{ marginBottom: i < paras.length - 1 ? 10 : 0, lineHeight: 1.6 }}>{p}</p>
  ));
}

function isHindi(s: string) { return /[\u0900-\u097F]/.test(s); }

function Cursor() {
  return <span style={{ display: "inline-block", width: 2, height: 14, background: "var(--c-accent)", marginLeft: 1, verticalAlign: "middle", animation: "vidya-pulse 0.8s infinite" }} />;
}

function HwImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSignedUrl(path).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return null;
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 10, maxHeight: 220 }}>
      <img src={url} alt="Homework" style={{ width: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

export function Chat() {
  const { session, loading } = useAuth();
  const search = useSearch({ strict: false }) as Record<string, string | undefined>;
  const upload = search.upload;
  const child = search.child;
  const id = search.id;
  const q = search.q;

  const [convId, setConvId] = useState<string | null>(id ?? null);
  const [title, setTitle] = useState("New conversation");
  const [msgs, setMsgs] = useState<UIMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hwPath, setHwPath] = useState<string | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(upload ?? null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef(false);
  const pidRef = useRef("");

  useEffect(() => { if (!loading && !session) window.location.href = "/login"; }, [loading, session]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!id) return;
    sb.from("conversations").select("title").eq("id", id).single()
      .then(({ data }) => { if (data?.title) setTitle(data.title as string); });
    sb.from("messages").select("*").eq("conversation_id", id).order("created_at")
      .then(({ data }) => {
        if (!data) return;
        const list = (data as Message[]).filter(m => m.role !== "system").map((m, i, arr) => ({
          id: m.id, role: m.role as "user" | "assistant", content: m.content,
          imagePath: m.image_path, chips: m.role === "assistant" && i === arr.length - 1,
        }));
        setMsgs(list);
        const first = list.find(m => m.imagePath);
        if (first?.imagePath) setHwPath(first.imagePath);
      });
  }, [id]);

  useEffect(() => {
    if (!upload) return;
    setPendingUploadId(upload);
    sb.from("uploads").select("file_path").eq("id", upload).single()
      .then(({ data }) => { if (data?.file_path) setHwPath(data.file_path as string); });
  }, [upload]);

  useEffect(() => {
    if (sentRef.current || !session || id || !q?.trim()) return;
    sentRef.current = true;
    send(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id, q]);

  async function handleImage(files: FileList | null) {
    if (!files || !files.length || !session) return;
    setUploading(true);
    try {
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const f = files[0];
      const blob = await compressImage(f);
      const form = new FormData();
      form.append("file", blob, f.name.replace(/\.[^.]+$/, ".jpg"));
      if (child) form.append("child_id", child);
      const res = await fetch(`${API}/api/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const j = await res.json();
      setPendingUploadId(j.upload_id);
      // Get the file path for display
      const { data } = await sb.from("uploads").select("file_path").eq("id", j.upload_id).single();
      if (data?.file_path) setHwPath(data.file_path as string);
      toast.success("Photo upload ho gayi!");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setUploading(false);
    }
  }

  async function send(text: string) {
    if ((!text.trim() && !pendingUploadId) || sending) return;
    const uid = crypto.randomUUID();
    const pid = crypto.randomUUID();
    pidRef.current = pid;

    setMsgs(m => [
      ...m.map(x => ({ ...x, chips: false })),
      { id: uid, role: "user" as const, content: text.trim() || "📷 Photo" },
      { id: pid, role: "assistant" as const, content: "", pending: true, streaming: false },
    ]);
    setInput("");
    setSending(true);

    try {
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      const body: Record<string, unknown> = { message: text.trim() || "Please explain this homework." };
      if (convId) body.conversation_id = convId;
      if (pendingUploadId) body.upload_id = pendingUploadId;
      if (child) body.child_id = child;

      const res = await fetch(`${API}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Something went wrong");
      }

      // Clear pending upload after sending
      setPendingUploadId(null);

      setMsgs(m => m.map(x => x.id === pid ? { ...x, pending: false, streaming: true, content: "" } : x));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === "meta" && !convId) {
              setConvId(event.conversation_id);
              setTimeout(() => {
                sb.from("conversations").select("title").eq("id", event.conversation_id).single()
                  .then(({ data: c }) => { if (c?.title && c.title !== "Homework Help") setTitle(c.title as string); });
              }, 3000);
            }
            if (event.type === "chunk") {
              fullText += event.text;
              const snap = fullText;
              setMsgs(m => m.map(x => x.id === pid ? { ...x, content: snap } : x));
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
            if (event.type === "error") throw new Error(event.message);
            if (event.type === "done") {
              setMsgs(m => m.map(x => x.id === pid
                ? { ...x, streaming: false, chips: true, id: event.message_id || pid }
                : x));
            }
          } catch { /* skip malformed */ }
        }
      }

    } catch (e) {
      setMsgs(m => m.map(x => x.id === pidRef.current
        ? { ...x, pending: false, streaming: false, content: friendlyError(e), chips: false }
        : x));
      toast.error(friendlyError(e));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 480, margin: "0 auto", background: "var(--c-bg)" }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderBottom: "0.5px solid var(--c-border)", flexShrink: 0 }}>
        <button onClick={() => { window.location.href = "/home"; }} style={{ color: "var(--c-text2)", display: "flex", background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{title}</span>
        {sending && <span style={{ fontSize: 11, color: "var(--c-text3)", flexShrink: 0 }}>thinking...</span>}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "14px 14px 0" }}>
        {hwPath && <HwImage path={hwPath} />}
        {msgs.length === 0 && !sending && (
          <p style={{ fontSize: 13, color: "var(--c-text2)", textAlign: "center", marginTop: 40 }}>
            {upload ? "Homework upload ho gaya. Kuch bhi poochhein." : "Vidya se padhai ke baare mein kuch bhi poochhein."}
          </p>
        )}
        {msgs.map(m => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} style={{ marginBottom: 14 }}>
              {!isUser && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>V</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Vidya</span>
                </div>
              )}
              <div style={{ maxWidth: isUser ? "82%" : "92%", marginLeft: isUser ? "auto" : 0, background: isUser ? "var(--c-accent)" : "var(--c-bg2)", color: isUser ? "#fff" : "var(--c-text)", border: isUser ? "none" : "0.5px solid var(--c-border)", padding: "10px 13px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14 }}>
                {m.pending ? <Spinner /> : isUser ? m.content : (
                  <>{m.content ? md(m.content) : m.streaming ? <Spinner /> : null}{m.streaming && m.content && <Cursor />}</>
                )}
              </div>
              {!isUser && m.chips && !m.pending && !m.streaming && m.content && (
                <div className="no-scroll" style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {["Aur simple karein", "Kaise sikhayein?", "Practice question do", isHindi(m.content) ? "English mein batao" : "Hindi mein batao"].map(c => (
                    <button key={c} onClick={() => send(c)} style={{ padding: "5px 12px", borderRadius: 20, background: "var(--c-bg2)", border: "0.5px solid var(--c-border)", fontSize: 12, fontWeight: 500, color: "var(--c-text2)", whiteSpace: "nowrap", flexShrink: 0, height: 28, cursor: "pointer" }}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* Pending image preview */}
      {hwPath && pendingUploadId && (
        <div style={{ padding: "6px 12px 0", borderTop: "0.5px solid var(--c-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-accent-bg)", borderRadius: 8, padding: "6px 10px" }}>
            <Camera size={14} style={{ color: "var(--c-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--c-accent-text)", flex: 1 }}>Photo ready — message type karein ya send karein</span>
            <button onClick={() => { setHwPath(null); setPendingUploadId(null); }} style={{ fontSize: 16, color: "var(--c-text3)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderTop: "0.5px solid var(--c-border)", background: "var(--c-bg)", flexShrink: 0 }}>
        {/* Camera button */}
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
          style={{ width: 36, height: 36, borderRadius: 10, color: uploading ? "var(--c-text3)" : "var(--c-accent)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-accent-bg)", border: "none", cursor: "pointer", flexShrink: 0, opacity: uploading ? 0.5 : 1 }}>
          {uploading ? <Spinner /> : <Camera size={18} />}
        </button>
        <input ref={cameraRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImage(e.target.files)} />

        <div style={{ flex: 1, position: "relative" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Kuch bhi poochhein..."
            style={{ width: "100%", height: 38, border: "0.5px solid var(--c-border)", borderRadius: 20, background: "var(--c-bg2)", padding: "0 40px 0 14px", fontSize: 14, color: "var(--c-text)", outline: "none" }} />
          <button type="button" onClick={() => toast("Voice — jald aa raha hai!")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-text3)", display: "flex", background: "none", border: "none", cursor: "pointer" }}>
            <Mic size={16} />
          </button>
        </div>
        <button type="submit" disabled={(!input.trim() && !pendingUploadId) || sending || uploading}
          style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: ((!input.trim() && !pendingUploadId) || sending || uploading) ? 0.4 : 1, flexShrink: 0, border: "none", cursor: "pointer" }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
