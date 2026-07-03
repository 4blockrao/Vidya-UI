export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  try {
    const p = JSON.parse(raw);
    if (p?.detail) return p.detail;
  } catch { /* not json */ }
  if (raw.includes("Vidya") || raw.includes("parents") || raw.includes("dobara"))
    return raw;
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Internet check karein aur dobara try karein.";
  if (m.includes("401") || m.includes("unauthorized"))
    return "Session timeout — dobara login karein.";
  if (m.includes("429"))
    return "Abhi bahut saare parents Vidya se poochh rahe hain! Bas 1 minute rukein. 🙏";
  return "Abhi bahut traffic hai — thodi der mein dobara try karein. 🙏";
}
