import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, Section } from "@/components/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { inr, fmtDate, fmtTime, initials, statusColor } from "@/lib/format";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User, Dumbbell, Building2 } from "lucide-react";

export default function MemberDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      const [mem, ci, py] = await Promise.all([
        api.get(`/members/${id}`),
        api.get(`/checkins?member_id=${id}&limit=20`),
        api.get(`/payments`),
      ]);
      setM(mem.data);
      setCheckins(ci.data);
      setPayments(py.data.filter((p) => p.member_id === id));
    })();
  }, [id]);

  if (!m) return <div className="p-8 text-white/40">Loading…</div>;

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER"
        title={m.name}
        subtitle={`Code ${m.code} · ${m.branch?.name || "No branch"}`}
        right={
          <Link to="/members">
            <Button data-testid="back-members" className="rounded-none bg-white/10 hover:bg-white/20 h-10 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <div className="border border-white/10 bg-[#0A0A0A] p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 rounded-none border border-white/10">
                <AvatarFallback className="rounded-none bg-[#FF3B30] text-white text-xl">{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-display text-2xl truncate">{m.name}</div>
                <span className={`inline-block mt-1 text-[10px] uppercase tracking-widest px-2 py-0.5 border ${statusColor(m.status)}`}>
                  {m.status}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <Row icon={Phone} label={m.phone} />
              <Row icon={Mail} label={m.email || "—"} />
              <Row icon={MapPin} label={m.address || "—"} />
              <Row icon={Calendar} label={`Joined ${fmtDate(m.join_date)}`} />
              <Row icon={User} label={`Emergency: ${m.emergency_contact || "—"}`} />
              <Row icon={Dumbbell} label={m.trainer?.name || "No trainer assigned"} />
              <Row icon={Building2} label={m.branch?.name || "—"} />
            </div>
          </div>

          {m.plan && (
            <div className="border border-white/10 bg-[#0A0A0A] p-6" style={{ borderTopColor: m.plan.color, borderTopWidth: 3 }}>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Active Plan</div>
              <div className="font-display text-3xl mt-1">{m.plan.name}</div>
              <div className="text-2xl mt-2 kpi-value" style={{ color: m.plan.color }}>{inr(m.plan.price)}</div>
              <div className="text-xs text-white/50 mt-1">{m.plan.duration_days} days · Expires {fmtDate(m.expiry_date)}</div>
              <ul className="mt-4 space-y-1 text-xs text-white/60">
                {(m.plan.features || []).map((f, i) => (
                  <li key={i}>· {f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Section title={`Check-in history · ${checkins.length}`}>
            <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto">
              {checkins.length === 0 && <div className="p-5 text-sm text-white/40">No check-ins yet.</div>}
              {checkins.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="w-2 h-2 bg-[#34C759]" />
                  <div className="text-sm">{fmtDate(c.at)}</div>
                  <div className="text-xs text-white/40">{fmtTime(c.at)}</div>
                  <div className="ml-auto text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-2 py-0.5">
                    {c.method}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Payment history · ${payments.length}`}>
            <div className="divide-y divide-white/5">
              {payments.length === 0 && <div className="p-5 text-sm text-white/40">No payments recorded.</div>}
              {payments.map((p) => (
                <div key={p.id} className="grid grid-cols-4 gap-3 p-4 text-sm">
                  <div className="mono text-[11px] text-white/50">{p.invoice_no}</div>
                  <div className="text-white/60">{fmtDate(p.created_at)}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40">{p.method}</div>
                  <div className="text-right kpi-value text-[#34C759]">{inr(p.amount)}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 text-white/70">
      <Icon className="w-4 h-4 text-white/40 shrink-0" />
      <span className="text-sm truncate">{label}</span>
    </div>
  );
}
