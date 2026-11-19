import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

type FeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
try {
  new URL(supabaseUrl);
} catch {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Check the repository secret.");
}
if (/YOUR_PROJECT|<your|example\.supabase\.co/i.test(supabaseUrl)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL still holds a placeholder value. Set the real project URL in the repository secrets."
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const parser = new Parser();
const feedUrls = (process.env.DEAL_FEED_URLS ?? "").split(",").map((x) => x.trim()).filter(Boolean);

function categoryFor(text: string) {
  const value = text.toLowerCase();
  if (/餐廳|美食|咖啡|飲品|食|餐飲|food|restaurant|dining/.test(value)) return "飲食";
  if (/超市|百貨|零售|購物|商店|shop|shopping|retail/.test(value)) return "購物";
  if (/電影|戲院|演唱會|展覽|娛樂|movie|cinema|event/.test(value)) return "娛樂";
  if (/酒店|機票|旅遊|旅行|hotel|flight|travel/.test(value)) return "旅遊";
  if (/交通|港鐵|巴士|渡輪|transport|mtr/.test(value)) return "交通";
  if (/手機|電腦|電子|耳機|phone|computer|electronics/.test(value)) return "電子產品";
  return "生活";
}

function fingerprint(url: string, title: string) {
  return crypto.createHash("sha256").update(url || title).digest("hex");
}

function clean(value: string, max = 1000) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function hongKongDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

function describeFetchError(error: unknown) {
  const cause = (error as { cause?: { code?: string; message?: string; errno?: string } })?.cause;
  if (!cause) return "";
  return ` (cause: ${cause.code ?? cause.errno ?? cause.message ?? "unknown"})`;
}

function supabaseHost() {
  try {
    return new URL(supabaseUrl as string).host;
  } catch {
    return "(unparseable)";
  }
}

async function expirePastDeals(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("deals")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .lt("expires_at", hongKongDate())
      .eq("status", "active");
    if (error) {
      console.error("Expiry update failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "Expiry update failed:",
      (error as Error)?.message ?? error,
      describeFetchError(error)
    );
    return false;
  }
}

async function main() {
  // Mark past deals as expired on every run, including runs without feeds.
  // A project that cannot be reached is a real failure: surface it instead of
  // letting the scheduled job report success while the site stays empty.
  const reachable = await expirePastDeals();
  if (!reachable) {
    console.error(
      `Supabase is not reachable at ${supabaseHost()} with the configured NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.`
    );
    process.exitCode = 1;
  }

  if (!feedUrls.length) {
    console.log(
      "No DEAL_FEED_URLS configured. No external feed was fetched. " +
        "Set the DEAL_FEED_URLS repository variable (Settings > Secrets and variables > Actions > Variables) " +
        "to a comma-separated list of RSS/Atom feeds you are permitted to use."
    );
    return;
  }

  let insertedOrUpdated = 0;
  let fetchedItems = 0;
  let attemptedUpserts = 0;
  let failedUpserts = 0;
  const failedFeeds: string[] = [];

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = clean(feed.title || new URL(feedUrl).hostname, 120);
      const items = (feed.items as FeedItem[]).slice(0, 100);
      fetchedItems += items.length;
      for (const item of items) {
        const title = clean(item.title || "");
        const link = item.link || "";
        if (!title || !link || !/^https?:\/\//i.test(link)) continue;

        const description = clean(item.contentSnippet || item.content || "", 1800);
        const published = item.isoDate || item.pubDate || null;
        const publishedDate = published && !Number.isNaN(Date.parse(published))
          ? new Date(published).toISOString()
          : null;
        const id = fingerprint(link, title);
        const record = {
          id,
          title,
          merchant: sourceName,
          category: categoryFor(`${title} ${description}`),
          description: description || null,
          discount_percent: null,
          area: "全香港",
          starts_at: publishedDate,
          expires_at: null,
          source_name: sourceName,
          source_url: feedUrl,
          deal_url: link,
          status: "active",
          updated_at: new Date().toISOString()
        };

        attemptedUpserts++;
        const { error } = await supabase.from("deals").upsert(record, { onConflict: "id" });
        if (error) {
          failedUpserts++;
          console.error(`Upsert failed for ${link}: ${error.message}`);
          continue;
        }
        insertedOrUpdated++;
      }
      console.log(`Processed feed: ${sourceName} (${items.length} items)`);
    } catch (error) {
      failedFeeds.push(feedUrl);
      console.error(`Feed failed: ${feedUrl}`, error);
    }
  }

  console.log(
    `Ingestion complete. Fetched ${fetchedItems} feed items, attempted ${attemptedUpserts} upserts, ` +
      `upserted ${insertedOrUpdated}, failed ${failedUpserts}.`
  );

  // A run that fetched feeds but stored nothing must not look like a success:
  // the scheduled job would keep showing green while the site silently goes stale.
  if (fetchedItems === 0) {
    console.error(
      failedFeeds.length === feedUrls.length
        ? `All ${feedUrls.length} configured feed(s) failed to fetch (${failedFeeds.join(", ")}). Nothing was ingested.`
        : `Configured feeds returned no items (fetched 0). Check DEAL_FEED_URLS and whether the feeds still publish entries.`
    );
    process.exitCode = 1;
    return;
  }

  if (insertedOrUpdated === 0) {
    console.error(
      `Fetched ${fetchedItems} feed item(s) but upserted 0 (attempted ${attemptedUpserts}, failed ${failedUpserts}). ` +
        (attemptedUpserts === 0
          ? "Every fetched item was skipped because it had no usable title or link."
          : "Every upsert failed — see the error above.")
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
