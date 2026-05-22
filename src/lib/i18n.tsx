import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "id" | "en";

const DICT = {
  id: {
    "nav.home": "Beranda",
    "nav.tx": "Transaksi",
    "nav.savings": "Tabungan",
    "nav.notif": "Notif",
    "nav.profile": "Profil",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.add": "Tambah",
    "common.back": "Kembali",
    "common.loading": "Memuat…",
    "common.empty": "Belum ada data",
    "settings.title": "Pengaturan",
    "settings.theme": "Tampilan",
    "settings.theme.desc": "Pilih mode tema yang paling nyaman buat mata kamu.",
    "settings.theme.light": "Terang",
    "settings.theme.dark": "Gelap",
    "settings.notif": "Notifikasi",
    "settings.notif.desc": "Tampilkan pengingat budget, tagihan & target tabungan di layar HP seperti aplikasi sungguhan.",
    "settings.notif.enable": "Aktifkan notifikasi",
    "settings.notif.test": "Kirim notifikasi percobaan",
    "settings.notif.on": "Aktif",
    "settings.notif.off": "Belum aktif",
    "settings.notif.blocked": "Diblokir",
    "settings.lang": "Bahasa",
    "settings.lang.desc": "Pilih bahasa antarmuka aplikasi.",
    "settings.budget": "Limit budget",
    "settings.budget.desc": "Atur batas pengeluaran kamu agar tetap on track ✨",
    "settings.budget.daily": "Limit harian",
    "settings.budget.weekly": "Limit mingguan",
    "settings.budget.monthly": "Limit bulanan",
    "settings.budget.save": "Simpan limit",
    "savings.title": "Tabungan",
    "savings.subtitle": "Buat target & capai impianmu ✨",
    "savings.tab.personal": "Pribadi",
    "savings.tab.group": "Bersama",
    "savings.empty.personal": "Belum ada target",
    "savings.empty.group": "Belum ada tabungan bersama",
    "savings.empty.desc": "Mulai dengan membuat target pertama kamu",
    "savings.create": "Buat target",
    "savings.create.group": "Buat tabungan bersama",
    "savings.contribute": "Setor",
    "savings.members": "Anggota",
    "savings.history": "Riwayat setoran",
    "friends.title": "Teman",
    "friends.add": "Tambah teman",
    "friends.add.placeholder": "Email teman kamu",
    "friends.requests": "Permintaan masuk",
    "friends.outgoing": "Permintaan dikirim",
    "friends.list": "Teman kamu",
    "friends.accept": "Terima",
    "friends.decline": "Tolak",
    "friends.empty": "Belum punya teman. Ajak temanmu yuk!",
    "friends.privacy": "🔒 Teman tidak bisa melihat catatan keuangan pribadimu — hanya tabungan bersama yang dibagikan.",
    "profile.friends": "Teman",
  },
  en: {
    "nav.home": "Home",
    "nav.tx": "Transactions",
    "nav.savings": "Savings",
    "nav.notif": "Alerts",
    "nav.profile": "Profile",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.add": "Add",
    "common.back": "Back",
    "common.loading": "Loading…",
    "common.empty": "Nothing here yet",
    "settings.title": "Settings",
    "settings.theme": "Appearance",
    "settings.theme.desc": "Pick the theme that feels best for your eyes.",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.notif": "Notifications",
    "settings.notif.desc": "Show budget, bill and savings reminders on your screen like a real app.",
    "settings.notif.enable": "Enable notifications",
    "settings.notif.test": "Send a test notification",
    "settings.notif.on": "Active",
    "settings.notif.off": "Disabled",
    "settings.notif.blocked": "Blocked",
    "settings.lang": "Language",
    "settings.lang.desc": "Pick the interface language.",
    "settings.budget": "Budget limits",
    "settings.budget.desc": "Set spending caps so you stay on track ✨",
    "settings.budget.daily": "Daily limit",
    "settings.budget.weekly": "Weekly limit",
    "settings.budget.monthly": "Monthly limit",
    "settings.budget.save": "Save limits",
    "savings.title": "Savings",
    "savings.subtitle": "Set goals & chase your dreams ✨",
    "savings.tab.personal": "Personal",
    "savings.tab.group": "Group",
    "savings.empty.personal": "No goals yet",
    "savings.empty.group": "No group savings yet",
    "savings.empty.desc": "Start by creating your first goal",
    "savings.create": "Create goal",
    "savings.create.group": "Create group goal",
    "savings.contribute": "Deposit",
    "savings.members": "Members",
    "savings.history": "Contribution history",
    "friends.title": "Friends",
    "friends.add": "Add friend",
    "friends.add.placeholder": "Your friend's email",
    "friends.requests": "Incoming requests",
    "friends.outgoing": "Sent requests",
    "friends.list": "Your friends",
    "friends.accept": "Accept",
    "friends.decline": "Decline",
    "friends.empty": "No friends yet. Invite someone!",
    "friends.privacy": "🔒 Friends can't see your personal finances — only shared group savings.",
    "profile.friends": "Friends",
  },
} as const;

type Key = keyof typeof DICT["id"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "id",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("savora-lang") as Lang | null;
      if (stored === "id" || stored === "en") setLangState(stored);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("savora-lang", l);
    } catch {}
  };
  const t = (k: Key) => DICT[lang][k] ?? DICT.id[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);