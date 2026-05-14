export function fmtIDR(n: number) {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "Jt";
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
export function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday start
  const x = new Date(d);
  x.setDate(d.getDate() - diff);
  return x.toISOString().slice(0, 10);
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const EXPENSE_CATEGORIES = [
  { key: "food", label: "Makanan", emoji: "🍜" },
  { key: "transport", label: "Transport", emoji: "🚗" },
  { key: "shopping", label: "Belanja", emoji: "🛍️" },
  { key: "bills", label: "Tagihan", emoji: "💡" },
  { key: "entertainment", label: "Hiburan", emoji: "🎬" },
  { key: "health", label: "Kesehatan", emoji: "💊" },
  { key: "education", label: "Edukasi", emoji: "📚" },
  { key: "other", label: "Lainnya", emoji: "✨" },
];

export const INCOME_CATEGORIES = [
  { key: "salary", label: "Gaji", emoji: "💼" },
  { key: "freelance", label: "Freelance", emoji: "💻" },
  { key: "gift", label: "Hadiah", emoji: "🎁" },
  { key: "investment", label: "Investasi", emoji: "📈" },
  { key: "other", label: "Lainnya", emoji: "✨" },
];

export function categoryMeta(type: "income" | "expense", key: string) {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.key === key) ?? { key, label: key, emoji: "•" };
}
