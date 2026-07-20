import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { PageHeader, Section } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { fmtTime, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScanLine, User, Fingerprint, Smartphone, Search, Check, Zap } from "lucide-react";
import { toast } from "sonner";

export default function CheckIn() {
  const [method, setMethod] = useState("id");
  const [query, setQuery] = useState("");
  const [feed, setFeed] = useState([]);
  const [count, setCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  const loadFeed = async () => {
    const [f, c] = await Promise.all([
      api.get("/checkins?limit=15"),
      api.get("/checkins/today-count"),
    ]);
    setFeed(f.data);
    setCount(c.data.count);
  };

  useEffect(() => {
    loadFeed();
    const t = setInterval(loadFeed, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [method]);

  const checkin = async (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;
    setProcessing(true);
    try {
      const { data } = await api.post("/checkins", { lookup: query.trim(), method });
      toast.success(`Checked in: ${data.member_name}`, {
        description: `${data.member_code} · ${fmtTime(data.at)}`,
      });
      setQuery("");
      loadFeed();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Member not found");
    } finally {
      setProcessing(false);
      inputRef.current?.focus();
    }
  };

  const METHODS = [
    { id: "id", label: "Member ID", icon: User, hint: "Enter code (e.g. FM-1001)" },
    { id: "mobile", label: "Mobile", icon: Smartphone, hint: "Enter phone number" },
    { id: "qr", label: "QR Scan", icon: ScanLine, hint: "Focus scanner and scan" },
    { id: "rfid", label: "RFID Card", icon: Fingerprint, hint: "Tap RFID reader" },
    { id: "reception", label: "Manual", icon: Zap, hint: "Reception-assisted" },
  ];

  const active = METHODS.find((m) => m.id === method);

  return (
    <div>
      <PageHeader
        eyebrow="LIVE"
        title="Check-in Kiosk"
        subtitle="One deck for QR, mobile, RFID and reception check-ins."
        right={
          <div className="border border-white/10 bg-[#0A0A0A] px-5 py-2 text-right">
            <div className="text-[10px] tracking-widest text-white/40 uppercase">Today</div>
            <div className="kpi-value text-3xl text-[#34C759]">{count}</div>
          </div>
        }
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Method selector */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                data-testid={`checkin-method-${m.id}`}
                onClick={() => setMethod(m.id)}
                className={`p-4 border text-left transition-colors ${
                  method === m.id
                    ? "border-[#FF3B30] bg-[#FF3B30]/10 text-white"
                    : "border-white/10 bg-[#0A0A0A] text-white/60 hover:text-white hover:border-white/25"
                }`}
              >
                <m.icon className="w-5 h-5 mb-2" />
                <div className="text-xs uppercase tracking-widest font-semibold">{m.label}</div>
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={checkin} className="border border-white/10 bg-[#0A0A0A] p-8">
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{active.hint}</div>
            <div className="flex items-center gap-4">
              <active.icon className="w-8 h-8 text-[#FF3B30]" />
              <input
                ref={inputRef}
                data-testid="checkin-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={active.hint}
                className="flex-1 bg-transparent border-b border-white/20 focus:border-[#FF3B30] focus:outline-none text-3xl font-display tracking-wider py-3"
              />
              <Button type="submit" data-testid="checkin-submit" disabled={processing || !query} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-12 px-6 gap-2">
                <Check className="w-4 h-4" /> CHECK IN
              </Button>
            </div>
            <div className="mt-4 text-xs text-white/40">
              Scanner mode: this input auto-focuses and submits on Enter — works with any USB QR / barcode / RFID reader.
            </div>
          </form>

          <Section title="Live activity feed">
            <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto">
              {feed.length === 0 && <div className="p-6 text-sm text-white/40">Waiting for check-ins…</div>}
              {feed.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <Avatar className="w-8 h-8 rounded-none border border-white/10">
                    <AvatarFallback className="rounded-none bg-white/5 text-[10px]">{initials(c.member_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{c.member_name}</div>
                    <div className="text-[11px] text-white/40 mono">{c.member_code}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-2 py-0.5">{c.method}</div>
                  <div className="text-xs text-white/50 w-14 text-right">{fmtTime(c.at)}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <div className="border border-white/10 bg-[#0A0A0A] p-6">
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">How to check-in</div>
            <ol className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-3"><span className="text-[#FF3B30] mono">01</span> Choose the check-in method above.</li>
              <li className="flex gap-3"><span className="text-[#FF3B30] mono">02</span> Enter or scan the member identifier.</li>
              <li className="flex gap-3"><span className="text-[#FF3B30] mono">03</span> Press <kbd className="border border-white/10 px-1 mono">Enter</kbd> or click <b>CHECK IN</b>.</li>
              <li className="flex gap-3"><span className="text-[#FF3B30] mono">04</span> The activity feed updates instantly.</li>
            </ol>
          </div>

          <div className="border border-white/10 bg-[#0A0A0A] p-6">
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Future-ready</div>
            <div className="font-display text-lg mt-2">Biometric &amp; face-ID</div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              This kiosk is device-agnostic. Any future biometric or facial-recognition device
              can call our secure <span className="mono">/api/checkins</span> endpoint to log an entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
