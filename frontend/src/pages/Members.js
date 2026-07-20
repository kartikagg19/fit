import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr, fmtDate, initials, statusColor } from "@/lib/format";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Members() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState("all");
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status !== "all") query.set("status", status);
    const { data } = await api.get(`/members?${query}`);
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const [p, t, b] = await Promise.all([
        api.get("/plans"),
        api.get("/trainers"),
        api.get("/branches"),
      ]);
      setPlans(p.data);
      setTrainers(t.data);
      setBranches(b.data);
    })();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const submitSearch = (e) => {
    e.preventDefault();
    load();
  };

  const counts = useMemo(() => {
    const c = { all: members.length, active: 0, expired: 0, frozen: 0 };
    members.forEach((m) => { if (c[m.status] !== undefined) c[m.status]++; });
    return c;
  }, [members]);

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Members"
        subtitle="Every member. One directory. Full control."
        right={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button data-testid="new-member-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> New Member
              </Button>
            </DialogTrigger>
            <NewMemberDialog
              plans={plans} trainers={trainers} branches={branches}
              onCreated={(m) => { setMembers([m, ...members]); setOpenNew(false); toast.success("Member enrolled"); }}
            />
          </Dialog>
        }
      />

      <div className="p-8 space-y-6">
        <form onSubmit={submitSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              data-testid="members-search"
              placeholder="Search by name, phone, code, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-11 bg-[#0A0A0A] border border-white/10 pl-10 pr-4 text-sm focus:border-[#FF3B30] focus:outline-none rounded-none"
            />
          </div>
          <div className="flex gap-2">
            {["all", "active", "expired", "frozen"].map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`filter-${s}`}
                onClick={() => setStatus(s)}
                className={`h-11 px-4 border text-xs uppercase tracking-widest ${
                  status === s
                    ? "bg-[#FF3B30] text-white border-[#FF3B30]"
                    : "bg-[#0A0A0A] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {s} {counts[s] !== undefined && <span className="ml-1 opacity-60">{counts[s]}</span>}
              </button>
            ))}
          </div>
        </form>

        {/* Table */}
        <div className="border border-white/10 bg-[#0A0A0A]">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-[10px] tracking-widest text-white/40 uppercase">
            <div className="col-span-4">Member</div>
            <div className="col-span-2">Plan</div>
            <div className="col-span-2">Branch</div>
            <div className="col-span-2">Expiry</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Code</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-white/40 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="p-10 text-center text-white/40">No members match your filters.</div>
          ) : (
            members.map((m) => (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                data-testid={`member-row-${m.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] items-center"
              >
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 rounded-none border border-white/10">
                    <AvatarFallback className="rounded-none bg-white/5 text-white text-xs">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{m.name}</div>
                    <div className="text-[11px] text-white/40 truncate">{m.phone}</div>
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  {m.plan ? (
                    <span className="border px-2 py-0.5 text-[11px]" style={{ borderColor: m.plan.color + "80", color: m.plan.color }}>
                      {m.plan.name}
                    </span>
                  ) : <span className="text-white/30">—</span>}
                </div>
                <div className="col-span-2 text-sm text-white/60 truncate">{m.branch?.name || "—"}</div>
                <div className="col-span-2 text-sm text-white/60">{fmtDate(m.expiry_date)}</div>
                <div className="col-span-1">
                  <span className={`inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border ${statusColor(m.status)}`}>
                    {m.status}
                  </span>
                </div>
                <div className="col-span-1 text-right text-[11px] mono text-white/40">{m.code}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewMemberDialog({ plans, trainers, branches, onCreated }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", gender: "male",
    plan_id: "", trainer_id: "", branch_id: "",
    address: "", emergency_contact: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.phone) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "" || payload[k] === "none") delete payload[k]; });
      const { data } = await api.post("/members", payload);
      onCreated(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">Enroll New Member</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Add a member to your gym directory.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 py-2">
        <Field label="Full name*">
          <Input data-testid="new-member-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" />
        </Field>
        <Field label="Phone*">
          <Input data-testid="new-member-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => set("email", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Membership plan">
          <Select value={form.plan_id} onValueChange={(v) => set("plan_id", v)}>
            <SelectTrigger data-testid="new-member-plan" className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {inr(p.price)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Assigned trainer">
          <Select value={form.trainer_id} onValueChange={(v) => set("trainer_id", v)}>
            <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue placeholder="Select trainer" /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Branch">
          <Select value={form.branch_id} onValueChange={(v) => set("branch_id", v)}>
            <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Emergency contact">
          <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" />
        </Field>
        <div className="col-span-2">
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" />
          </Field>
        </div>
      </div>

      <DialogFooter>
        <Button data-testid="save-member-button" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enroll Member"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] tracking-widest text-white/50 uppercase">{label}</Label>
      {children}
    </div>
  );
}
