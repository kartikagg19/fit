import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { PageHeader, Section, StatCell } from "@/components/Primitives";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export default function Attendance() {
  const [checkins, setCheckins] = useState([]);
  const [week, setWeek] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, w] = await Promise.all([
        api.get("/checkins?limit=500"),
        api.get("/analytics/attendance-week"),
      ]);
      setCheckins(c.data);
      setWeek(w.data);
    })();
  }, []);

  const heatmap = useMemo(() => {
    // build 7×24 grid
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const grid = days.map(() => Array(24).fill(0));
    checkins.forEach((c) => {
      const d = new Date(c.at);
      grid[d.getDay()][d.getHours()]++;
    });
    const max = Math.max(1, ...grid.flat());
    return { days, grid, max };
  }, [checkins]);

  const total = checkins.length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = checkins.filter((c) => c.at.startsWith(today)).length;
  const uniqueToday = new Set(checkins.filter((c) => c.at.startsWith(today)).map((c) => c.member_id)).size;

  return (
    <div>
      <PageHeader
        eyebrow="ANALYTICS"
        title="Attendance"
        subtitle="Every check-in, mapped by hour and day."
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCell testid="att-total" label="Total (2 weeks)" value={total} />
          <StatCell testid="att-today" label="Today" value={todayCount} tone="positive" />
          <StatCell testid="att-unique" label="Unique today" value={uniqueToday} />
        </div>

        <Section title="Last 7 days · daily check-ins">
          <div className="p-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #262626", borderRadius: 0 }} />
                <Bar dataKey="checkins" radius={0}>
                  {week.map((_, i) => <Cell key={i} fill={i === week.length - 1 ? "#FF3B30" : "#3a3a3a"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Heatmap · day × hour">
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex text-[10px] text-white/40 mb-1 pl-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-6 text-center">{h}</div>
                ))}
              </div>
              {heatmap.grid.map((row, dIdx) => (
                <div key={dIdx} className="flex items-center">
                  <div className="w-10 text-[10px] text-white/40 tracking-widest">{heatmap.days[dIdx]}</div>
                  {row.map((v, hIdx) => {
                    const intensity = v / heatmap.max;
                    const bg = v === 0 ? "#0A0A0A" : `rgba(255,59,48,${Math.max(0.12, intensity)})`;
                    return (
                      <div
                        key={hIdx}
                        title={`${heatmap.days[dIdx]} ${hIdx}:00 · ${v} check-ins`}
                        className="w-6 h-6 border border-white/5"
                        style={{ background: bg }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 text-[10px] text-white/40 tracking-widest">
              <span>LESS</span>
              {[0.15, 0.3, 0.55, 0.8, 1].map((a) => (
                <div key={a} className="w-4 h-4" style={{ background: `rgba(255,59,48,${a})` }} />
              ))}
              <span>MORE</span>
            </div>
          </div>
        </Section>

        <Section title="Recent check-ins">
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {checkins.slice(0, 40).map((c) => (
              <div key={c.id} className="grid grid-cols-4 gap-4 px-5 py-3 text-sm">
                <div>{c.member_name}</div>
                <div className="mono text-[11px] text-white/50">{c.member_code}</div>
                <div className="text-white/60">{fmtDate(c.at)} · {fmtTime(c.at)}</div>
                <div className="text-right text-[10px] uppercase tracking-widest text-white/40">{c.method}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
