import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { PageHeader, Section, StatCell } from "@/components/Primitives";
import { inr, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATS = ["Rent", "Utilities", "Staff Salary", "Equipment", "Marketing", "Maintenance", "Supplements", "Other"];

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/expenses");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7);
    const thisMonth = items.filter((e) => e.date.startsWith(now));
    const byCat = {};
    thisMonth.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    return {
      total: items.reduce((s, e) => s + e.amount, 0),
      month: thisMonth.reduce((s, e) => s + e.amount, 0),
      byCat,
    };
  }, [items]);

  const del = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`);
    setItems(items.filter((i) => i.id !== id));
    toast.success("Expense deleted");
  };

  return (
    <div>
      <PageHeader
        eyebrow="FINANCE"
        title="Expenses"
        subtitle="Every cost tracked, categorised and profit-aware."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-expense-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <ExpenseDialog onSaved={(e) => { setItems([e, ...items]); setOpen(false); toast.success("Expense added"); }} />
          </Dialog>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCell testid="exp-total" label="Total expenses" value={inr(stats.total)} />
          <StatCell testid="exp-month" label="This month" value={inr(stats.month)} tone="negative" />
          <StatCell testid="exp-count" label="Line items" value={items.length} />
        </div>

        <Section title="Category breakdown (this month)">
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(stats.byCat).length === 0 && <div className="col-span-4 text-white/40 text-sm">No expenses this month.</div>}
            {Object.entries(stats.byCat).sort((a,b) => b[1]-a[1]).map(([c, v]) => (
              <div key={c} className="border border-white/10 p-3">
                <div className="text-[10px] tracking-widest text-white/40 uppercase">{c}</div>
                <div className="kpi-value text-xl mt-1">{inr(v)}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ledger">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-[10px] tracking-widest text-white/40 uppercase">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-3 text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {items.map((e) => (
              <div key={e.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 items-center">
                <div className="col-span-4 text-sm truncate">{e.title}</div>
                <div className="col-span-2 text-[10px] uppercase tracking-widest text-white/40">{e.category}</div>
                <div className="col-span-2 text-sm text-white/60">{fmtDate(e.date)}</div>
                <div className="col-span-3 text-right kpi-value text-lg text-[#FF3B30]">{inr(e.amount)}</div>
                <div className="col-span-1 text-right">
                  <button data-testid={`del-expense-${e.id}`} onClick={() => del(e.id)} className="text-white/40 hover:text-[#FF3B30]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function ExpenseDialog({ onSaved }) {
  const [f, setF] = useState({ title: "", amount: 0, category: "Rent", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.title || !f.amount) return toast.error("Title and amount required");
    setSaving(true);
    try {
      const { data } = await api.post("/expenses", { ...f, amount: Number(f.amount) });
      onSaved(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">Add Expense</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Log a business expense.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Field label="Title*"><Input data-testid="exp-title" value={f.title} onChange={(e) => set("title", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount ₹*"><Input data-testid="exp-amount" type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
          <Field label="Category">
            <Select value={f.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
                {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Note"><Input value={f.note} onChange={(e) => set("note", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
      </div>
      <DialogFooter>
        <Button data-testid="save-expense" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Expense"}
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
