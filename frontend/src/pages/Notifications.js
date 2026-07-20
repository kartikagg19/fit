import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Section } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const ICONS = {
  member: "🟢", payment: "💰", alert: "⚠️", lead: "🎯", trainer: "🏋️",
};

const TYPE_COLOR = {
  member: "#34C759", payment: "#D4FF00", alert: "#FF9500", lead: "#007AFF", trainer: "#FF3B30",
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const load = async () => setItems((await api.get("/notifications")).data);
  useEffect(() => { load(); }, []);

  const readAll = async () => {
    await api.post("/notifications/read-all");
    setItems(items.map((n) => ({ ...n, read: true })));
    toast.success("Marked all as read");
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        eyebrow="INBOX"
        title="Notifications"
        subtitle={`${unread} unread out of ${items.length}`}
        right={
          <Button data-testid="mark-all-read" onClick={readAll} className="rounded-none bg-white/10 hover:bg-white/20 h-10 gap-2">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        }
      />

      <div className="p-8">
        <Section title="Recent activity">
          <div className="divide-y divide-white/5">
            {items.length === 0 && <div className="p-6 text-white/40 text-sm">No notifications.</div>}
            {items.map((n) => (
              <div key={n.id} className={`flex items-start gap-4 p-5 ${!n.read ? "bg-white/[0.02]" : ""}`}>
                <div className="w-1 h-full self-stretch" style={{ background: TYPE_COLOR[n.type] || "#FF3B30" }} />
                <div className="w-8 h-8 border border-white/10 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" style={{ color: TYPE_COLOR[n.type] || "#FF3B30" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{n.title}</div>
                    {!n.read && <span className="w-1.5 h-1.5 bg-[#FF3B30]" />}
                  </div>
                  <div className="text-xs text-white/60 mt-1">{n.body}</div>
                  <div className="text-[10px] tracking-widest text-white/30 uppercase mt-2">{fmtDateTime(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
