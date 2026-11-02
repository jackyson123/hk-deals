"use client";

import { useMemo, useState } from "react";
import { Search, Tag, Heart, MapPin, Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { CATEGORIES, type Deal } from "@/lib/types";

const categoryEmoji: Record<string, string> = {
  飲食: "🍜", 購物: "🛍️", 超市: "🛒", 娛樂: "🎬", 交通: "🚇",
  旅遊: "✈️", 電子產品: "📱", 生活: "✨"
};

function expiryLabel(value: string | null) {
  if (!value) return "有效日期以商戶公告為準";
  const days = Math.ceil((new Date(`${value}T23:59:59`).getTime() - Date.now()) / 86400000);
  if (days < 0) return "已過期";
  if (days === 0) return "今日到期";
  return `尚餘 ${days} 日`;
}

export default function DealsBrowser({ initialDeals }: { initialDeals: Deal[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [area, setArea] = useState("全部地區");
  const [sort, setSort] = useState("最新");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const visible = useMemo(() => {
    const result = initialDeals.filter((deal) => {
      const text = `${deal.title} ${deal.merchant} ${deal.description ?? ""} ${deal.category}`.toLowerCase();
      return (!query || text.includes(query.toLowerCase()))
        && (category === "全部" || deal.category === category)
        && (area === "全部地區" || deal.area === area || deal.area === "全香港")
        && (!showFavorites || favorites.includes(deal.id));
    });
    if (sort === "折扣最大") result.sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0));
    if (sort === "最新") result.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === "即將到期") result.sort((a, b) => (a.expires_at ?? "9999").localeCompare(b.expires_at ?? "9999"));
    return result;
  }, [initialDeals, query, category, area, sort, favorites, showFavorites]);

  return (
    <main className="shell space-y-6 py-5 sm:py-8">
      <header className="hero space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xl font-black"><Tag /> HK Deals</div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">香港每日著數</span>
        </div>
        <div>
          <h1 className="text-3xl font-black sm:text-4xl">今日有咩著數？</h1>
          <p className="mt-2 text-sm text-white/80">全港優惠集中搜尋，精明消費更簡單。</p>
        </div>
        <div className="flex gap-2 rounded-xl bg-white p-1.5">
          <Search className="ml-2 mt-2.5 text-slate-500" size={20} />
          <input className="min-w-0 flex-1 border-0 bg-white px-1 py-2 text-slate-900 outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋商戶、優惠、關鍵字..." />
          <button className="rounded-lg bg-amber-300 px-4 font-bold text-slate-900" onClick={() => setQuery(query.trim())}>搜尋</button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-white/80"><span>🍜 飲食</span><span>🛍️ 購物</span><span>🎬 娛樂</span><span>💳 付款優惠</span></div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="panel p-3"><Tag className="mb-2 text-teal-700" /><div className="text-2xl font-black">{initialDeals.length}</div><div className="text-xs muted">有效優惠</div></div>
        <div className="panel p-3"><Heart className="mb-2 text-rose-500" /><div className="text-2xl font-black">{favorites.length}</div><div className="text-xs muted">我的收藏</div></div>
        <div className="panel p-3"><RefreshCw className="mb-2 text-teal-700" /><div className="text-sm font-bold">每日 3 次</div><div className="text-xs muted">自動更新排程</div></div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">優惠分類</h2><button className="text-sm text-teal-700" onClick={() => setCategory("全部")}>清除分類</button></div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => <button key={item} className="pill" aria-pressed={category === item} onClick={() => setCategory(item)}>{item === "全部" ? "全部" : `${categoryEmoji[item] ?? "🏷️"} ${item}`}</button>)}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{showFavorites ? "❤️ 我的收藏" : "🔥 最新優惠"}</h2>
          <button className="pill" aria-pressed={showFavorites} onClick={() => setShowFavorites(!showFavorites)}>{showFavorites ? "顯示全部" : "只看收藏"}</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select className="control" value={area} onChange={(e) => setArea(e.target.value)}><option>全部地區</option><option>港島</option><option>九龍</option><option>新界</option><option>網上優惠</option><option>全香港</option></select>
          <select className="control col-span-1" value={sort} onChange={(e) => setSort(e.target.value)}><option>最新</option><option>折扣最大</option><option>即將到期</option></select>
        </div>
        {visible.length === 0 ? (
          <div className="panel p-9 text-center"><div className="text-4xl">🔎</div><h3 className="mt-3 font-bold">暫時沒有符合條件的優惠</h3><p className="mt-1 text-sm muted">{initialDeals.length === 0 ? "優惠資料庫尚未有資料。完成部署並設定資料來源後，優惠會在排程執行時匯入。" : "請試試其他關鍵字或篩選條件。"}</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((deal) => (
              <article className="deal-card" key={deal.id}>
                <div className="deal-art relative"><span>{categoryEmoji[deal.category] ?? "🏷️"}</span>{deal.discount_percent !== null && <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white">{deal.discount_percent}% OFF</span>}<button aria-label="收藏優惠" className="absolute right-2 top-2 rounded-full bg-white p-2 text-rose-500" onClick={() => setFavorites((old) => old.includes(deal.id) ? old.filter((id) => id !== deal.id) : [...old, deal.id])}><Heart size={17} fill={favorites.includes(deal.id) ? "currentColor" : "none"} /></button></div>
                <div className="space-y-2 p-3">
                  <span className="badge">{deal.category}</span>
                  <h3 className="line-clamp-2 text-sm font-bold">{deal.title}</h3>
                  <p className="text-xs muted">{deal.merchant}</p>
                  <div className="flex items-center gap-1 text-xs muted"><MapPin size={13}/>{deal.area}</div>
                  <div className="flex items-center gap-1 text-xs muted"><Clock3 size={13}/>{expiryLabel(deal.expires_at)}</div>
                  <a className="primary w-full text-sm" href={deal.deal_url || deal.source_url} target="_blank" rel="noreferrer">查看優惠 <ExternalLink size={14}/></a>
                  <p className="text-[10px] muted">來源：{deal.source_name}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="panel p-4 text-xs leading-6 muted">
        <b className="text-slate-700">HK Deals 資料聲明</b><br />
        優惠內容及有效日期以商戶或資料來源的最新公告為準。網站會顯示來源連結及資料更新時間；優惠是否適用、名額及條款，請向商戶確認。
      </footer>
    </main>
  );
}
