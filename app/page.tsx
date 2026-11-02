import { getPublicSupabase } from "@/lib/supabase";
import DealsBrowser from "@/components/DealsBrowser";
import type { Deal } from "@/lib/types";

export const revalidate = 300;

async function getDeals(): Promise<Deal[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("Unable to load deals:", error.message);
    return [];
  }
  return (data ?? []) as Deal[];
}

export default async function Home() {
  const deals = await getDeals();
  return <DealsBrowser initialDeals={deals} />;
}
