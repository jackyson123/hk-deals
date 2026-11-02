export type Deal = {
  id: string;
  title: string;
  merchant: string;
  category: string;
  description: string | null;
  discount_percent: number | null;
  area: string;
  starts_at: string | null;
  expires_at: string | null;
  source_name: string;
  source_url: string;
  deal_url: string | null;
  status: "active" | "expired" | "pending";
  created_at: string;
  updated_at: string;
};

export const CATEGORIES = ["全部", "飲食", "購物", "超市", "娛樂", "交通", "旅遊", "電子產品", "生活"];
