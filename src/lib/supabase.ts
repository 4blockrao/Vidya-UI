import { createClient } from "@supabase/supabase-js";

const url = "https://wkenzaiyevfesjqifyfc.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZW56YWl5ZXZmZXNqcWlmeWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODkyMTQsImV4cCI6MjA5NDY2NTIxNH0.kHBP837CawXMmQLbNLiuCMI5QuBAWh3LxjhFJwC6miY";

export const sb = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const API =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "https://api.vidya.live";

export type Profile = {
  id: string;
  full_name: string | null;
  preferred_language: string | null;
  onboarding_completed: boolean | null;
};

export type Child = {
  id: string;
  user_id: string;
  name: string;
  grade: string | null;
  board: string | null;
  is_default: boolean;
};

export type Conversation = {
  id: string;
  title: string | null;
  subject: string | null;
  child_id: string | null;
  last_message_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image_path: string | null;
  created_at: string;
};

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "abhi";
  if (s < 3600) return `${Math.floor(s / 60)}m pehle`;
  if (s < 86400) return `${Math.floor(s / 3600)}h pehle`;
  return `${Math.floor(s / 86400)}d pehle`;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await sb.storage
    .from("homework-images")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
