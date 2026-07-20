import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { PageHeader, Section, StatCell } from "@/components/Primitives";
import { inr, fmtDate, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const load = async () => {
    const { data } = await api.get("/payments");
    setPayments(data);
  };

  useEffect(() => {
    (async () => {
      const [p, m, pl] = await Promise.all([
        api.get("/payments"), api.get("/members"), api.get("/plans"),
      ]);
      setPayments(p.data); setMembers(m.data); setPlans(pl.data);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthPrefix = now.toISOString().slice(0, 7);
    const thisMonth = payments.filter((p) => p.created_at?.startsWith(monthPrefix));
    return {
      total: payments.reduce((s, p) => s + p.amount, 0),
      month: thisMonth.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
    };
  }, [payments]);

  return (
    <div>
      <PageHeader
        eyebrow="FINANCE"
        title="Payments & Invoices"
        subtitle="Every rupee, every invoice — audit-ready."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-payment-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> Record Payment
              </Button>
            </DialogTrigger>
            <PaymentDialog members={members} plans={plans} onSaved={(p) => { setPayments([p, ...payments]); setOpen(false); toast.success("Payment recorded"); }} />
          </Dialog>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCell testid="pay-total" label="Total collected" value={inr(stats.total)} />
          <StatCell testid="pay-month" label="This month" value={inr(stats.month)} tone="positive" />
          <StatCell testid="pay-count" label="Invoices issued" value={stats.count} />
        </div>

        <Section title="Invoices">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-[10px] tracking-widest text-white/40 uppercase">
            <div className="col-span-3">Invoice</div>
            <div className="col-span-3">Member</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Method</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {payments.map((p) => (
              <button
                key={p.id}
                data-testid={`invoice-row-${p.id}`}
                onClick={() => setSelectedInvoice(p)}
                className="w-full text-left grid grid-cols-12 gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] items-center"
              >
                <div className="col-span-3 mono text-xs text-[#D4FF00]">{p.invoice_no}</div>
                <div className="col-span-3 text-sm truncate">
                  <div>{p.member_name}</div>
                  <div className="text-[11px] text-white/40 mono">{p.member_code}</div>
                </div>
                <div className="col-span-2 text-sm text-white/60">{fmtDate(p.created_at)}</div>
                <div className="col-span-2 text-[10px] uppercase tracking-widest text-white/40">{p.method}</div>
                <div className="col-span-2 text-right kpi-value text-lg text-[#34C759]">{inr(p.amount)}</div>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        {selectedInvoice && <InvoiceDialog p={selectedInvoice} />}
      </Dialog>
    </div>
  );
}

function PaymentDialog({ members, plans, onSaved }) {
  const [f, setF] = useState({ member_id: "", amount: 0, plan_id: "", method: "cash", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const onPlanChange = (planId) => {
    const p = plans.find((x) => x.id === planId);
    setF((s) => ({ ...s, plan_id: planId, amount: p ? p.price : s.amount }));
  };

  const save = async () => {
    if (!f.member_id || !f.amount) return toast.error("Member and amount required");
    setSaving(true);
    try {
      const payload = { ...f, amount: Number(f.amount) };
      if (!payload.plan_id) delete payload.plan_id;
      const { data } = await api.post("/payments", payload);
      onSaved(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">Record Payment</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Log a payment and generate an invoice.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Field label="Member*">
          <Select value={f.member_id} onValueChange={(v) => set("member_id", v)}>
            <SelectTrigger data-testid="pay-member" className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none max-h-72">
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} — {m.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Plan (optional)">
          <Select value={f.plan_id} onValueChange={onPlanChange}>
            <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue placeholder="Renew plan" /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {inr(p.price)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount ₹*"><Input data-testid="pay-amount" type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
          <Field label="Method">
            <Select value={f.method} onValueChange={(v) => set("method", v)}>
              <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
                {["cash","upi","card","bank","other"].map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Note"><Input value={f.note} onChange={(e) => set("note", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
      </div>
      <DialogFooter>
        <Button data-testid="save-payment" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record & Issue Invoice"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function InvoiceDialog({ p }) {
  return (
    <DialogContent className="bg-white text-black rounded-none max-w-lg p-0 border-0">
      <DialogHeader className="sr-only">
        <DialogTitle>Invoice {p.invoice_no}</DialogTitle>
        <DialogDescription>Printable invoice for {p.member_name}</DialogDescription>
      </DialogHeader>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="w-9 h-9 bg-[#FF3B30] flex items-center justify-center mb-3">
              <span className="font-display text-white font-bold">F</span>
            </div>
            <div className="font-display text-2xl tracking-widest">FITMORE</div>
            <div className="text-xs text-black/60">Gym Operating System</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-widest text-black/50 uppercase">Invoice</div>
            <div className="mono text-lg">{p.invoice_no}</div>
            <div className="text-xs text-black/60 mt-1">{fmtDate(p.created_at)}</div>
          </div>
        </div>

        <div className="border-t border-b border-black py-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] tracking-widest text-black/50 uppercase">Billed to</div>
            <div className="font-semibold">{p.member_name}</div>
            <div className="text-xs text-black/60">{p.member_code}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-black/50 uppercase">Method</div>
            <div className="font-semibold uppercase">{p.method}</div>
            <div className="text-xs text-black/60">Status: PAID</div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-6 text-[10px] tracking-widest text-black/50 uppercase pb-2 border-b border-black/20">
            <div className="col-span-4">Description</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <div className="grid grid-cols-6 py-3 text-sm">
            <div className="col-span-4">Membership fee {p.plan_id ? `(plan renewal)` : ""}{p.note ? ` — ${p.note}` : ""}</div>
            <div className="col-span-2 text-right kpi-value text-lg">{inr(p.amount)}</div>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-black pt-4">
          <div className="text-xs text-black/50">Thank you for training with FitMore.</div>
          <div className="text-right">
            <div className="text-[10px] tracking-widest text-black/50 uppercase">Total</div>
            <div className="kpi-value text-3xl">{inr(p.amount)}</div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => window.print()} className="rounded-none bg-black text-white hover:bg-black/80 gap-2">
            <Download className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>
      </div>
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
