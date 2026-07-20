import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { PageHeader, Section, StatCell } from "@/components/Primitives";
import { inr, compact } from "@/lib/format";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    (async () => {
      const [o, r, p] = await Promise.all([
        api.get("/analytics/overview"),
        api.get("/analytics/revenue-series?months=12"),
        api.get("/analytics/plan-distribution"),
      ]);
      setOverview(o.data); setRevenue(r.data); setPlans(p.data);
    })();
  }, []);

  const totals = useMemo(() => {
    const rev = revenue.reduce((s, r) => s + r.revenue, 0);
    const exp = revenue.reduce((s, r) => s + r.expense, 0);
    return { rev, exp, profit: rev - exp, margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0 };
  }, [revenue]);

  return (
    <div>
      <PageHeader
        eyebrow="ANALYTICS"
        title="Revenue &amp; Reports"
        subtitle="Business intelligence for gym operators."
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCell testid="rep-rev" label="Revenue (12M)" value={inr(totals.rev)} tone="positive" />
          <StatCell testid="rep-exp" label="Expenses (12M)" value={inr(totals.exp)} tone="negative" />
          <StatCell testid="rep-profit" label="Net profit" value={inr(totals.profit)} />
          <StatCell testid="rep-margin" label="Margin" value={`${totals.margin.toFixed(1)}%`} />
        </div>

        <Section title="Revenue trend · 12 months">
          <div className="p-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} tickFormatter={(v) => compact(v)} />
                <Tooltip
                  contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }}
                  formatter={(v) => inr(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#FF3B30" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="#007AFF" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Revenue vs Expense — bars">
            <div className="p-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} tickFormatter={(v) => compact(v)} />
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }} formatter={(v) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#FF3B30" />
                  <Bar dataKey="expense" fill="#007AFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Active members per plan">
            <div className="p-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={plans} dataKey="count" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                    {plans.map((p, i) => (
                      <Cell key={i} fill={p.color} stroke="#050505" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
