import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { inr } from "@/lib/format";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/plans");
    setPlans(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Membership Plans"
        subtitle="Design, price, and package what you sell."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-plan-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> New Plan
              </Button>
            </DialogTrigger>
            <PlanDialog onSaved={(p) => { setPlans([...plans, p]); setOpen(false); toast.success("Plan created"); }} />
          </Dialog>
        }
      />

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            data-testid={`plan-card-${p.id}`}
            className="border border-white/10 bg-[#0A0A0A] p-6 hover-lift hover:border-white/30"
            style={{ borderTopColor: p.color, borderTopWidth: 3 }}
          >
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">{p.duration_days} days</div>
            <div className="font-display text-3xl mt-1">{p.name}</div>
            <div className="mt-4 kpi-value text-5xl" style={{ color: p.color }}>{inr(p.price)}</div>
            <div className="text-xs text-white/40 mt-2">{p.description}</div>
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              {(p.features || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5" style={{ color: p.color }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanDialog({ onSaved }) {
  const [f, setF] = useState({ name: "", duration_days: 30, price: 0, description: "", color: "#FF3B30", features: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.name) return toast.error("Name is required");
    setSaving(true);
    try {
      const { data } = await api.post("/plans", {
        name: f.name,
        duration_days: Number(f.duration_days),
        price: Number(f.price),
        color: f.color,
        description: f.description,
        features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      onSaved(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">New Plan</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Create a membership package.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" data-testid="plan-name" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Days"><Input type="number" value={f.duration_days} onChange={(e) => set("duration_days", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
          <Field label="Price ₹"><Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
          <Field label="Color"><Input type="color" value={f.color} onChange={(e) => set("color", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10 p-1" /></Field>
        </div>
        <Field label="Description"><Input value={f.description} onChange={(e) => set("description", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
        <Field label="Features (one per line)">
          <Textarea rows={4} value={f.features} onChange={(e) => set("features", e.target.value)} className="bg-[#050505] border-white/10 rounded-none" />
        </Field>
      </div>
      <DialogFooter>
        <Button data-testid="save-plan" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Plan"}
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
