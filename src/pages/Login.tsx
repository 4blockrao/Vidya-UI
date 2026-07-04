import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

type Mode = "signin" | "signup" | "verify";

const GRADES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
const BOARDS = ["CBSE", "ICSE", "Maharashtra State Board", "UP Board", "Rajasthan Board", "Other"];

export function Login() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);

  // Sign up
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suShowPass, setSuShowPass] = useState(false);
  const [suChildName, setSuChildName] = useState("");
  const [suGrade, setSuGrade] = useState("");
  const [suBoard, setSuBoard] = useState("");
  const [suLang, setSuLang] = useState("hi");

  // Verify
  const [otp, setOtp] = useState("");
  const [cd, setCd] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) window.location.href = "/home";
  }, [session]);

  function clearError() { setError(""); }

  function startCountdown() {
    setCd(300);
    const t = setInterval(() => setCd(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
  }

  function fmtCd(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── Sign in with email + password ──────────────────────────
  async function signIn() {
    clearError();
    if (!siEmail.includes("@")) { setError("Sahi email daalen."); return; }
    if (siPass.length < 6) { setError("Password kam se kam 6 characters ka hona chahiye."); return; }
    setBusy(true);
    const { error: e } = await sb.auth.signInWithPassword({
      email: siEmail.trim().toLowerCase(),
      password: siPass,
    });
    setBusy(false);
    if (e) { setError(friendlyError(e)); return; }
    window.location.href = "/home";
  }

  // ── Sign up ───────────────────────────────────────────────
  async function signUp() {
    clearError();
    if (!suName.trim()) { setError("Aapka naam daalen."); return; }
    if (!suEmail.includes("@")) { setError("Sahi email daalen."); return; }
    if (suPass.length < 6) { setError("Password kam se kam 6 characters ka hona chahiye."); return; }
    if (!suChildName.trim()) { setError("Bacche ka naam daalen."); return; }
    setBusy(true);
    const { error: e } = await sb.auth.signUp({
      email: suEmail.trim().toLowerCase(),
      password: suPass,
      options: {
        data: { full_name: suName.trim() },
        emailRedirectTo: undefined,
      },
    });
    setBusy(false);
    if (e) { setError(friendlyError(e)); return; }
    setMode("verify");
    startCountdown();
  }

  // ── Verify OTP ───────────────────────────────────────────
  async function verify() {
    clearError();
    if (otp.length < 6) { setError("Pura code daalen."); return; }
    setBusy(true);
    const { data, error: e } = await sb.auth.verifyOtp({
      email: suEmail.trim().toLowerCase(),
      token: otp,
      type: "signup",
    });
    if (e) { setBusy(false); setError(friendlyError(e)); return; }

    const uid = data.user?.id;
    const accessToken = data.session?.access_token;
    const refreshToken = data.session?.refresh_token;

    if (uid && accessToken && refreshToken) {
      // Explicitly set session so Supabase client is authenticated
      await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

      // Now save profile with authenticated session
      await sb.from("profiles").upsert({
        id: uid,
        full_name: suName.trim(),
        preferred_language: suLang,
        onboarding_completed: true,
      }, { onConflict: "id" });

      await sb.from("children").insert({
        user_id: uid,
        name: suChildName.trim(),
        grade: suGrade || null,
        board: suBoard || null,
        is_default: true,
      });
    }
    setBusy(false);
    window.location.href = "/home";
  }

  // ── Resend verification ──────────────────────────────────
  async function resend() {
    setBusy(true);
    await sb.auth.resend({ type: "signup", email: suEmail.trim().toLowerCase() });
    setBusy(false);
    toast.success("Code dobara bheja gaya!");
    startCountdown();
  }

  // ── Input style ──────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", height: 48,
    border: "0.5px solid var(--c-border)",
    borderRadius: 10,
    background: "var(--c-bg2)",
    padding: "0 14px",
    fontSize: 15,
    color: "var(--c-text)",
    outline: "none",
    fontFamily: "inherit",
  };

  const btn = (active: boolean): React.CSSProperties => ({
    width: "100%", height: 48, marginTop: 14,
    borderRadius: 10,
    background: active ? "var(--c-accent)" : "var(--c-bg3)",
    color: active ? "#fff" : "var(--c-text3)",
    fontSize: 15, fontWeight: 500,
    border: "none",
    cursor: active ? "pointer" : "default",
    opacity: busy ? 0.7 : 1,
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", padding: "0 24px" }}>

      {/* Logo */}
      <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: "var(--c-accent)", letterSpacing: -1 }}>Vidya</div>
        <div style={{ fontSize: 14, color: "var(--c-text2)", marginTop: 6 }}>Aapke bachche ka learning companion</div>
      </div>

      {/* Tab switcher — only on signin/signup */}
      {mode !== "verify" && (
        <div style={{ display: "flex", background: "var(--c-bg2)", borderRadius: 10, padding: 3, marginBottom: 24, border: "0.5px solid var(--c-border)" }}>
          {(["signin", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); clearError(); }}
              style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", background: mode === m ? "var(--c-bg)" : "transparent", color: mode === m ? "var(--c-text)" : "var(--c-text2)", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {m === "signin" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>
      )}

      {/* ── SIGN IN ── */}
      {mode === "signin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Email</label>
            <input type="email" placeholder="aapka@email.com" value={siEmail}
              onChange={e => setSiEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && signIn()}
              style={inp} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={siShowPass ? "text" : "password"} placeholder="Aapka password"
                value={siPass} onChange={e => setSiPass(e.target.value)} onKeyDown={e => e.key === "Enter" && signIn()}
                style={{ ...inp, paddingRight: 44 }} />
              <button type="button" onClick={() => setSiShowPass(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-text3)", display: "flex" }}>
                {siShowPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--c-danger)", marginTop: 4 }}>{error}</p>}
          <button onClick={signIn} disabled={busy || !siEmail.includes("@") || siPass.length < 6}
            style={btn(siEmail.includes("@") && siPass.length >= 6)}>
            {busy ? "Sign in ho rahe hain..." : "Sign In"}
          </button>
          <p style={{ fontSize: 13, color: "var(--c-text2)", textAlign: "center", marginTop: 8 }}>
            Account nahi hai?{" "}
            <button onClick={() => { setMode("signup"); clearError(); }}
              style={{ color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Register karein
            </button>
          </p>
        </div>
      )}

      {/* ── SIGN UP ── */}
      {mode === "signup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", marginBottom: 4 }}>Aapke baare mein</p>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Aapka naam</label>
            <input type="text" placeholder="Pura naam" value={suName}
              onChange={e => setSuName(e.target.value)} style={inp} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Email</label>
            <input type="email" placeholder="aapka@email.com" value={suEmail}
              onChange={e => setSuEmail(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={suShowPass ? "text" : "password"} placeholder="Kam se kam 6 characters"
                value={suPass} onChange={e => setSuPass(e.target.value)}
                style={{ ...inp, paddingRight: 44 }} />
              <button type="button" onClick={() => setSuShowPass(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-text3)", display: "flex" }}>
                {suShowPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--c-border)", margin: "6px 0" }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", marginBottom: 4 }}>Bacche ke baare mein</p>

          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Bacche ka naam</label>
            <input type="text" placeholder="Naam" value={suChildName}
              onChange={e => setSuChildName(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Class (optional)</label>
            <select value={suGrade} onChange={e => setSuGrade(e.target.value)}
              style={{ ...inp, color: suGrade ? "var(--c-text)" : "var(--c-text3)" }}>
              <option value="">Select class</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>Board (optional)</label>
            <select value={suBoard} onChange={e => setSuBoard(e.target.value)}
              style={{ ...inp, color: suBoard ? "var(--c-text)" : "var(--c-text3)" }}>
              <option value="">Select board</option>
              {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 5 }}>
              Vidya kis bhasha mein baat kare?
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["hi", "हिंदी", "Vidya Hindi mein jawab degi"], ["en", "English", "Vidya will respond in English"]] as const).map(([val, label, desc]) => (
                <button key={val} type="button" onClick={() => setSuLang(val)}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: `2px solid ${suLang === val ? "var(--c-accent)" : "var(--c-border)"}`, background: suLang === val ? "var(--c-accent)" : "var(--c-bg2)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 600, color: suLang === val ? "#fff" : "var(--c-text)" }}>{label}</div>
                  <div style={{ fontSize: 11, color: suLang === val ? "rgba(255,255,255,0.85)" : "var(--c-text2)" }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: "var(--c-danger)", marginTop: 4 }}>{error}</p>}
          <button onClick={signUp}
            disabled={busy || !suName.trim() || !suEmail.includes("@") || suPass.length < 6 || !suChildName.trim()}
            style={btn(!!suName.trim() && suEmail.includes("@") && suPass.length >= 6 && !!suChildName.trim())}>
            {busy ? "Account ban raha hai..." : "Account Banayein"}
          </button>
        </div>
      )}

      {/* ── VERIFY EMAIL ── */}
      {mode === "verify" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>
              ✉️
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Email verify karein</p>
            <p style={{ fontSize: 13, color: "var(--c-text2)", lineHeight: 1.6 }}>
              Humne ek verification code bheja hai<br />
              <strong style={{ color: "var(--c-text)" }}>{suEmail}</strong> par
            </p>
          </div>

          <input
            type="tel" inputMode="numeric" maxLength={8} autoFocus
            placeholder="Verification code"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => e.key === "Enter" && verify()}
            style={{ width: "100%", height: 56, textAlign: "center", letterSpacing: 10, fontSize: 22, fontWeight: 600, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", color: "var(--c-text)", outline: "none" }}
          />

          {error && <p style={{ fontSize: 13, color: "var(--c-danger)", marginTop: 8, textAlign: "center" }}>{error}</p>}

          <button onClick={verify} disabled={busy || otp.length < 6}
            style={btn(otp.length >= 6)}>
            {busy ? "Verify ho raha hai..." : "Verify Karein"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
            {cd > 0 ? (
              <span>Code {fmtCd(cd)} mein expire hoga</span>
            ) : (
              <button onClick={resend} disabled={busy}
                style={{ color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                Code dobara bhejein
              </button>
            )}
          </div>
          <button onClick={() => { setMode("signup"); setOtp(""); clearError(); }}
            style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: "var(--c-text2)", background: "none", border: "none", cursor: "pointer" }}>
            ← Wapas jayein
          </button>
        </div>
      )}

    </div>
  );
}
