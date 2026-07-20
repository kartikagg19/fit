// Currency formatter (INR)
export const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const compact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

export const fmtTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const statusColor = (s) => {
  switch (s) {
    case "active":
      return "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30";
    case "expired":
      return "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30";
    case "frozen":
      return "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30";
    case "cancelled":
      return "bg-white/10 text-white/60 border-white/20";
    default:
      return "bg-white/10 text-white border-white/20";
  }
};
