import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [cd, setCd] = useState(0);

  useEffect(() => {
    if (session) window.location.href = "/home";
  }, [session]);

  function tick() {
    setCd(60);
    const t = setInterval(() => setCd(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
  }

  async function sendOTP() {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Sahi email address daalen.");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    setStep("otp");
    tick();
  }

  async function verify() {
    if (otp.length !== 6) { toast.error("6 digit OTP daalen."); return; }
    setBusy(true);
    const { error } = await sb.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "email",
    });
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    window.location.href = "/home";
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh", padding: "0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: "var(--c-accent)", letterSpacing: -1 }}>Vidya</div>
        <div style={{ fontSize: 14, color: "var(--c-text2)", marginTop: 6 }}>Aapke bachche ka learning companion</div>
      </div>

      {step === "email" ? (
        <div>
          <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 6 }}>
            Email address
          </label>
          <input
            type="email"
            inputMode="email"
            autoFocus
            placeholder="aapka@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendOTP()}
            style={{ width: "100%", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", padding: "0 14px", fontSize: 15, color: "var(--c-text)", outline: "none" }}
          />
          <p style={{ fontSize: 12, color: "var(--c-text3)", marginTop: 8 }}>
            Aapke email par ek verification code bheja jayega
          </p>
          <button
            onClick={sendOTP}
            disabled={busy || !email.includes("@")}
            style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 10, background: email.includes("@") ? "var(--c-accent)" : "var(--c-bg3)", color: email.includes("@") ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, border: "none", cursor: email.includes("@") ? "pointer" : "default", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Bhej rahe hain..." : "Code Bhejein"}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--c-text2)", textAlign: "center", marginBottom: 6 }}>
            Code bheja gaya
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", textAlign: "center", marginBottom: 20 }}>
            {email}
          </p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="------"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => e.key === "Enter" && verify()}
            style={{ width: "100%", height: 56, textAlign: "center", letterSpacing: 14, fontSize: 26, fontWeight: 600, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", color: "var(--c-text)", outline: "none" }}
          />
          <button
            onClick={verify}
            disabled={busy || otp.length !== 6}
            style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 10, background: otp.length === 6 ? "var(--c-accent)" : "var(--c-bg3)", color: otp.length === 6 ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, border: "none", cursor: otp.length === 6 ? "pointer" : "default", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Verify ho raha hai..." : "Verify Karein"}
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
            {cd > 0 ? (
              <span>Code expire hoga {cd}s mein</span>
            ) : (
              <button onClick={sendOTP} style={{ color: "var(--c-accent)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
                Code dobara bhejein
              </button>
            )}
          </div>
          <button
            onClick={() => { setStep("email"); setOtp(""); }}
            style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: "var(--c-text2)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Email badlein
          </button>
        </div>
      )}
    </div>
  );
}
