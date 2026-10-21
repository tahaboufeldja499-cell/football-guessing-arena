import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(url && anon && !url.includes("YOUR-PROJECT-REF"));

export const supabase = createClient(url || "http://localhost", anon || "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** هوية ضيف آمنة: جلسة مجهولة مرتبطة بالمتصفح (Anonymous Sign-ins). */
export async function ensureUser(): Promise<User> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user;
  const res = await supabase.auth.signInAnonymously();
  if (res.error || !res.data.user) throw res.error ?? new Error("AUTH_FAILED");
  return res.data.user;
}
