import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, StatCell, Section } from "@/components/Primitives";
import { inr, compact, fmtDate, fmtTime, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, Wallet, TrendingUp, TrendingDown, ScanLine,
  ArrowUpRight, Activity, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const HERO_IMG = "https://images.pexels.com/photos/35540076/pexels-photo-35540076.jpeg";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [plans, setPlans] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    (async () => {
      const [o, r, a, p, c, pay, m] = await Promise.all([
        api.get("/analytics/overview"),
        api.get("/analytics/revenue-series?months=6"),
        api.get("/analytics/attendance-week"),
        api.get("/analytics/plan-distribution"),
        api.get("/checkins?limit=8"),
        api.get("/payments"),
        api.get("/members"),
      ]);
      setOverview(o.data);
      setRevenue(r.data);
      setAttendance(a.data);
      setPlans(p.data);
      setCheckins(c.data);
      setPayments(pay.data.slice(0, 5));
      const expiring = m.data
        .filter((x) => x.expiry_date)
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
        .filter((x) => x.status === "active")
        .slice(0, 6);
      setMembers(expiring);
    })();
  }, []);

  const growthTone = overview?.revenue_growth_pct >= 0 ? "positive" : "negative";
  const growthLabel = overview
    ? `${overview.revenue_growth_pct >= 0 ? "+" : ""}${overview.revenue_growth_pct}% vs last month`
    : "";

  return (
    <div>
      <PageHeader
        eyebrow="COMMAND DECK"
        title="Good day, Operator."
        subtitle="Here's the pulse of your gym — right now."
        right={
          <div className="flex gap-2">
            <Link to="/checkin">
              <Button data-testid="dash-checkin-btn" className="rounded-none bg-white/10 hover:bg-white/20 text-white h-10 gap-2">
                <ScanLine className="w-4 h-4" /> Check-in
              </Button>
            </Link>
            <Link to="/members">
              <Button data-testid="dash-add-member-btn" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Users className="w-4 h-4" /> New Member
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCell
            testid="kpi-active-members"
            label="Active Members"
            value={overview ? overview.active_members : "—"}
            delta={overview && `of ${overview.total_members} total`}
          />
          <StatCell
            testid="kpi-checkins-today"
            label="Check-ins today"
            value={overview ? overview.checkins_today : "—"}
            delta="Live counter"
            tone="positive"
          />
          <StatCell
            testid="kpi-revenue-month"
            label="Revenue this month"
            value={overview ? inr(overview.revenue_this_month) : "—"}
            delta={growthLabel}
            tone={growthTone}
          />
          <StatCell
            testid="kpi-profit-month"
            label="Net profit"
            value={overview ? inr(overview.profit_this_month) : "—"}
            delta={overview && `Expenses ${inr(overview.expense_this_month)}`}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section
            title="Revenue vs Expense · 6 months"
            className="lg:col-span-2"
            right={<div className="text-xs text-white/40 tracking-widest">₹ INR</div>}
          >
            <div className="p-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007AFF" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="0" />
                  <XAxis dataKey="month" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} tickFormatter={(v) => compact(v)} />
                  <Tooltip
                    contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v) => inr(v)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#FF3B30" strokeWidth={2} fill="url(#rev)" />
                  <Area type="monotone" dataKey="expense" stroke="#007AFF" strokeWidth={2} fill="url(#exp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Plan mix">
            <div className="p-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plans}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {plans.map((p, i) => (
                      <Cell key={i} fill={p.color} stroke="#050505" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#aaa" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section
            title="Attendance · last 7 days"
            className="lg:col-span-2"
          >
            <div className="p-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }}
                  />
                  <Bar dataKey="checkins" fill="#FF3B30" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Alert · Expiring soon" right={
            <Link to="/members" className="text-xs text-[#FF3B30] hover:underline">View all</Link>
          }>
            <div className="divide-y divide-white/5">
              {members.length === 0 ? (
                <div className="p-6 text-sm text-white/40">No memberships expiring soon.</div>
              ) : members.map((m) => (
                <Link
                  to={`/members/${m.id}`}
                  key={m.id}
                  data-testid={`expiring-${m.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-white/[0.03]"
                >
                  <Avatar className="w-8 h-8 rounded-none border border-white/10">
                    <AvatarFallback className="rounded-none bg-white/10 text-[10px]">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{m.name}</div>
                    <div className="text-[11px] text-white/40 mono">{m.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/40 uppercase tracking-widest">Expires</div>
                    <div className="text-xs text-[#FF9500]">{fmtDate(m.expiry_date)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </div>

        {/* Activity row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section
            title="Recent check-ins"
            right={<Link to="/attendance" className="text-xs text-[#FF3B30] hover:underline">Full log</Link>}
          >
            <div className="divide-y divide-white/5">
              {checkins.length === 0 ? (
                <div className="p-6 text-sm text-white/40">No recent check-ins.</div>
              ) : checkins.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 border border-white/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#34C759]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{c.member_name}</div>
                    <div className="text-[11px] text-white/40 mono">{c.member_code} · {c.method.toUpperCase()}</div>
                  </div>
                  <div className="text-xs text-white/50">{fmtTime(c.at)}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Recent payments"
            right={<Link to="/payments" className="text-xs text-[#FF3B30] hover:underline">All invoices</Link>}
          >
            <div className="divide-y divide-white/5">
              {payments.length === 0 ? (
                <div className="p-6 text-sm text-white/40">No payments yet.</div>
              ) : payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 border border-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#FF3B30]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{p.member_name}</div>
                    <div className="text-[11px] text-white/40 mono">{p.invoice_no} · {p.method?.toUpperCase()}</div>
                  </div>
                  <div className="text-sm font-semibold text-[#34C759]">{inr(p.amount)}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
