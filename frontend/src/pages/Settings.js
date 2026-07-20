import { useAuth } from "@/context/AuthContext";
import { PageHeader, Section } from "@/components/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { Building, User as UserIcon, Shield, Palette } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM"
        title="Settings"
        subtitle="Business configuration & preferences."
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Your account">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 rounded-none border border-white/10">
                <AvatarFallback className="rounded-none bg-[#FF3B30] text-white text-lg">{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-display text-xl">{user?.name}</div>
                <div className="text-xs text-white/50">{user?.email}</div>
                <div className="text-[10px] tracking-widest text-[#FF3B30] uppercase mt-1">{user?.role}</div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Business">
          <div className="p-6 space-y-3 text-sm">
            <Row label="Business name" value="FitMore" />
            <Row label="Timezone" value="Asia/Kolkata" />
            <Row label="Currency" value="INR (₹)" />
            <Row label="Locale" value="en-IN" />
          </div>
        </Section>

        <Section title="Security">
          <div className="p-6 space-y-3 text-sm text-white/70">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#34C759]" /> JWT (httpOnly cookie) enabled</div>
            <div className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-[#34C759]" /> Role-based access control</div>
            <div className="text-xs text-white/40 mt-2">Password changes will be available soon.</div>
          </div>
        </Section>

        <Section title="Appearance" className="lg:col-span-3">
          <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { c: "#FF3B30", label: "Ember" },
              { c: "#007AFF", label: "Ocean" },
              { c: "#34C759", label: "Neo" },
              { c: "#D4FF00", label: "Volt" },
              { c: "#FF9500", label: "Solar" },
            ].map((t) => (
              <div key={t.c} className="border border-white/10 p-3 flex items-center gap-3 hover-lift hover:border-white/25">
                <div className="w-8 h-8" style={{ background: t.c }} />
                <div>
                  <div className="text-sm">{t.label}</div>
                  <div className="text-[10px] tracking-widest text-white/40 uppercase mono">{t.c}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <div className="text-[10px] tracking-widest text-white/40 uppercase">{label}</div>
      <div className="text-white/90">{value}</div>
    </div>
  );
}
