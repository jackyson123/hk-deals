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

async function main() {
  if (!feedUrls.length) {
    console.log("No DEAL_FEED_URLS configured. No external feed was fetched.");
    return;
  }

  let insertedOrUpdated = 0;
  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = clean(feed.title || new URL(feedUrl).hostname, 120);
      for (const item of (feed.items as FeedItem[]).slice(0, 100)) {
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

        const { error } = await supabase.from("deals").upsert(record, { onConflict: "id" });
        if (error) {
          console.error(`Upsert failed for ${link}: ${error.message}`);
          continue;
        }
        insertedOrUpdated++;
      }
      console.log(`Processed feed: ${sourceName}`);
    } catch (error) {
      console.error(`Feed failed: ${feedUrl}`, error);
    }
  }

  const { error: expireError } = await supabase
    .from("deals")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .lt("expires_at", new Date().toISOString().slice(0, 10))
    .eq("status", "active");
  if (expireError) console.error("Expiry update failed:", expireError.message);

  console.log(`Ingestion complete. Upserted ${insertedOrUpdated} feed items.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
