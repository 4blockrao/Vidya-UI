import { useEffect, useState } from "react";

import { sb } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Login() {
  const { session } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [cd, setCd] = useState(0);

  useEffect(() => { if (session) window.location.href = "/home"; }, [session]);

  const full = `+91${phone.replace(/\D/g, "")}`;

  function tick() {
    setCd(30);
    const t = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  }

  async function sendOTP() {
    if (phone.replace(/\D/g, "").length !== 10) { toast.error("10 digit ka number daalen."); return; }
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({ phone: full });
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    setStep("otp"); tick();
  }

  async function verify() {
    if (otp.length !== 6) { toast.error("6 digit OTP daalen."); return; }
    setBusy(true);
    const { error } = await sb.auth.verifyOtp({ phone: full, token: otp, type: "sms" });
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

      {step === "phone" ? (
        <div>
          <label style={{ fontSize: 12, color: "var(--c-text2)", display: "block", marginBottom: 6 }}>Mobile number</label>
          <div style={{ display: "flex", height: 48, border: "0.5px solid var(--c-border)", borderRadius: 10, overflow: "hidden", background: "var(--c-bg2)" }}>
            <div style={{ padding: "0 14px", display: "flex", alignItems: "center", borderRight: "0.5px solid var(--c-border)", color: "var(--c-text2)", fontSize: 14, flexShrink: 0 }}>+91</div>
            <input type="tel" inputMode="numeric" maxLength={10} autoFocus placeholder="10-digit number"
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && sendOTP()}
              style={{ flex: 1, border: "none", background: "transparent", padding: "0 14px", fontSize: 15, color: "var(--c-text)", outline: "none" }} />
          </div>
          <button onClick={sendOTP} disabled={busy || phone.replace(/\D/g,"").length !== 10}
            style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 10, background: phone.replace(/\D/g,"").length === 10 ? "var(--c-accent)" : "var(--c-bg3)", color: phone.replace(/\D/g,"").length === 10 ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Bhej rahe hain..." : "OTP Bhejein"}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--c-text2)", textAlign: "center", marginBottom: 20 }}>OTP bheja gaya +91 {phone} par</p>
          <input type="tel" inputMode="numeric" maxLength={6} autoFocus placeholder="------"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => e.key === "Enter" && verify()}
            style={{ width: "100%", height: 56, textAlign: "center", letterSpacing: 14, fontSize: 26, fontWeight: 600, border: "0.5px solid var(--c-border)", borderRadius: 10, background: "var(--c-bg2)", color: "var(--c-text)", outline: "none" }} />
          <button onClick={verify} disabled={busy || otp.length !== 6}
            style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 10, background: otp.length === 6 ? "var(--c-accent)" : "var(--c-bg3)", color: otp.length === 6 ? "#fff" : "var(--c-text3)", fontSize: 15, fontWeight: 500, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Verify ho raha hai..." : "Verify Karein"}
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
            {cd > 0 ? <span>{cd}s mein dobara bhej sakte hain</span> : (
              <button onClick={() => { sendOTP(); tick(); }} style={{ color: "var(--c-accent)", fontSize: 13 }}>OTP dobara bhejein</button>
            )}
          </div>
          <button onClick={() => { setStep("phone"); setOtp(""); }}
            style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: "var(--c-text2)", background: "none", border: "none", cursor: "pointer" }}>
            ← Number badlein
          </button>
        </div>
      )}
    </div>
  );
}
