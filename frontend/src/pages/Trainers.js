import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { inr, initials } from "@/lib/format";
import { Plus, Phone, Mail, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/trainers");
    setTrainers(data);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Trainers"
        subtitle="Your team of coaches — specialisations, rosters, rates."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-trainer-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> New Trainer
              </Button>
            </DialogTrigger>
            <TrainerDialog onSaved={(t) => { setTrainers([...trainers, t]); setOpen(false); toast.success("Trainer added"); }} />
          </Dialog>
        }
      />

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.map((t) => (
          <div key={t.id} data-testid={`trainer-${t.id}`} className="border border-white/10 bg-[#0A0A0A] p-6 hover-lift hover:border-white/25">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 rounded-none border border-white/10">
                {t.avatar && <AvatarImage src={t.avatar} className="object-cover" />}
                <AvatarFallback className="rounded-none bg-[#FF3B30] text-white">{initials(t.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl truncate">{t.name}</div>
                <div className="text-xs text-white/50 mt-1">{t.specialization}</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-[#D4FF00]">
                  <Star className="w-3 h-3 fill-current" /> {t.experience_years} yrs experience
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs text-white/60">
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {t.phone}</div>
              {t.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5" /> {t.email}</div>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-[10px] tracking-widest text-white/40 uppercase">Session rate</div>
              <div className="kpi-value text-xl text-[#FF3B30]">{inr(t.hourly_rate)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainerDialog({ onSaved }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", specialization: "", experience_years: 0, hourly_rate: 0, bio: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.name || !f.phone) return toast.error("Name and phone required");
    setSaving(true);
    try {
      const payload = { ...f, experience_years: Number(f.experience_years), hourly_rate: Number(f.hourly_rate) };
      if (!payload.email) delete payload.email;
      const { data } = await api.post("/trainers", payload);
      onSaved(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };
  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">New Trainer</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Add a coach to your roster.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {[["Name*", "name"], ["Phone*", "phone"], ["Email", "email"], ["Specialization", "specialization"]].map(([l, k]) => (
          <Field key={k} label={l}>
            <Input value={f[k]} onChange={(e) => set(k, e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" data-testid={`trainer-${k}`} />
          </Field>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience (yrs)"><Input type="number" value={f.experience_years} onChange={(e) => set("experience_years", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
          <Field label="Session rate ₹"><Input type="number" value={f.hourly_rate} onChange={(e) => set("hourly_rate", e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" /></Field>
        </div>
        <Field label="Bio"><Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} className="bg-[#050505] border-white/10 rounded-none" rows={3} /></Field>
      </div>
      <DialogFooter>
        <Button data-testid="save-trainer" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Trainer"}
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
