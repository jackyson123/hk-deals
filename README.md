# HK Deals 4.0

香港每日著數公開優惠搜尋網站。技術：Next.js、Vercel、Supabase、GitHub Actions。

## 重要：資料來源與真實性

本專案不會憑空產生優惠。自動匯入功能只讀取你有權使用、而且提供 RSS/Atom feed 的來源。請先確認來源網站的使用條款、robots 規則、授權及資料再發布條件。不要未經許可抓取網站或繞過登入、付費牆、反爬蟲措施。

RSS 匯入器目前採取保守策略：
- 每筆資料保留來源名稱、來源 Feed URL 及原文連結。
- 不會猜測折扣百分比或優惠到期日。
- 無法確認期限的資料會保留為「有效期以來源公告為準」，而不是自行編造期限。
- 同一原文連結會以 SHA-256 指紋去重。
- 分類是關鍵字初步分類，建議正式公開前增加人工審核流程。

## 1. 建立 Supabase

1. 到 https://supabase.com 建立專案。
2. 開啟 SQL Editor。
3. 執行 `supabase/schema.sql`。
4. 到 Project Settings → API，複製 Project URL、anon/public key、service_role key。
5. 絕對不要把 `service_role` key 放入 `NEXT_PUBLIC_` 變數或前端程式碼。

## 2. 本機執行

需要 Node.js 22。

```bash
cp .env.example .env.local
npm install
npm run dev
```

在 `.env.local` 填入 Supabase URL 和 anon key。開啟 http://localhost:3000。

## 3. 設定優惠 Feed

在 `.env.local` 設定：

```env
DEAL_FEED_URLS=https://example.com/deals/rss.xml,https://another.example/feed.xml
```

請將網址換成你已確認可合法使用的 RSS/Atom Feed。不要直接照抄示例網址。沒有合適 Feed 時先留空；網站仍可部署，但不會自動有優惠資料。

測試匯入：

```bash
npm run ingest
```

執行匯入前，需在 `.env.local` 設定 `SUPABASE_SERVICE_ROLE_KEY`。

## 4. 推送到 GitHub

1. 在 GitHub 建立一個空白 repository，例如 `hk-deals`。
2. 在專案資料夾執行：

```bash
git init
git add .
git commit -m "Initial HK Deals 4.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hk-deals.git
git push -u origin main
```

3. 到 GitHub repository → Settings → Secrets and variables → Actions。
4. 新增 Repository secrets：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. 新增 Repository variable：
   - `DEAL_FEED_URLS`，值為逗號分隔的合法 Feed URL。
6. GitHub → Actions → HK Deals scheduled update → Run workflow，可手動測試。

排程為 UTC 00:00、06:00、12:00，即香港時間 08:00、14:00、20:00。GitHub Actions 排程可能因平台負載而延遲；它不是精確到分鐘的保證服務。

## 5. 部署到 Vercel

1. 到 https://vercel.com 登入並選擇 Add New → Project。
2. Import 你的 GitHub `hk-deals` repository。
3. Framework 選 Next.js（通常會自動識別）。
4. 在 Vercel Project → Settings → Environment Variables 設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 不需要在 Vercel 前端環境設定 service role key；只有 GitHub ingestion workflow 需要它。
6. 按 Deploy。
7. 部署完成後開啟 Vercel 網址測試。

每次推送至 GitHub main 分支，Vercel 會自動重新部署。

## 6. 驗證流程

- Supabase Table Editor 的 `deals` 表有匯入記錄。
- GitHub Actions workflow 最近一次執行成功。
- Vercel 網站可以讀取資料並顯示優惠。
- 點擊優惠會開啟來源或優惠原文連結。

## 7. 安全及正式上線前工作

- service role key 只放 GitHub Actions Secrets。
- 定期輪換密鑰；若曾公開，立即撤銷並重新產生。
- 建立來源白名單及來源授權紀錄。
- 為優惠增加 `pending` 審核流程，人工確認後才公開。
- 進一步實作商戶名稱抽取、到期日解析、重複語意比對、來源健康檢查及失敗通知。
- 加入管理員登入及審核介面前，不要讓不受信任的人取得資料庫寫入權限。

## 目前版本範圍

已提供公開瀏覽、搜尋、分類、地區篩選、排序、前端收藏（目前只存在當前頁面狀態）、Supabase 公開讀取、RSS/Atom 匯入及 GitHub Actions 每日三次排程。

尚未提供：跨裝置登入收藏、管理員後台、AI 抽取/審核、來源自動發現、即時通知。這些需要下一階段開發及額外服務設定。
