import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { initials, fmtDate } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STAGES = [
  { id: "new", label: "New", color: "#007AFF" },
  { id: "contacted", label: "Contacted", color: "#D4FF00" },
  { id: "trial", label: "Trial", color: "#FF9500" },
  { id: "converted", label: "Converted", color: "#34C759" },
  { id: "lost", label: "Lost", color: "#737373" },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
  };
  useEffect(() => { load(); }, []);

  const move = async (lead, newStage) => {
    const payload = { name: lead.name, phone: lead.phone, email: lead.email, source: lead.source, notes: lead.notes, interest: lead.interest, stage: newStage };
    if (!payload.email) delete payload.email;
    await api.put(`/leads/${lead.id}`, payload);
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, stage: newStage } : l)));
    toast.success(`Moved to ${newStage}`);
  };

  const grouped = STAGES.map((s) => ({ ...s, leads: leads.filter((l) => l.stage === s.id) }));

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Leads Pipeline"
        subtitle="Move prospects through the funnel — never lose a lead."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-lead-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> Add Lead
              </Button>
            </DialogTrigger>
            <LeadDialog onSaved={(l) => { setLeads([l, ...leads]); setOpen(false); toast.success("Lead added"); }} />
          </Dialog>
        }
      />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {grouped.map((col) => (
            <div key={col.id} className="border border-white/10 bg-[#0A0A0A]" data-testid={`col-${col.id}`}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2" style={{ background: col.color }} />
                  <div className="text-[10px] tracking-widest uppercase text-white/70">{col.label}</div>
                </div>
                <div className="text-[10px] text-white/40 mono">{col.leads.length}</div>
              </div>
              <div className="p-2 space-y-2 min-h-[300px] max-h-[600px] overflow-y-auto">
                {col.leads.map((l) => (
                  <div key={l.id} data-testid={`lead-${l.id}`} className="border border-white/10 bg-[#050505] p-3 hover:border-white/25">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 rounded-none border border-white/10">
                        <AvatarFallback className="rounded-none bg-white/5 text-[10px]">{initials(l.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{l.name}</div>
                        <div className="text-[10px] text-white/40 truncate">{l.source} · {l.interest}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/50">
                      <Phone className="w-3 h-3" /> <span className="truncate">{l.phone}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                      <div className="text-[10px] text-white/30">{fmtDate(l.created_at)}</div>
                      <Select value={l.stage} onValueChange={(v) => move(l, v)}>
                        <SelectTrigger className="h-6 text-[10px] rounded-none border-white/10 bg-transparent px-2 w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
                          {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadDialog({ onSaved }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", source: "walk-in", interest: "", stage: "new", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.name || !f.phone) return toast.error("Name and phone required");
    setSaving(true);
    try {
      const payload = { ...f };
      if (!payload.email) delete payload.email;
      const { data } = await api.post("/leads", payload);
      onSaved(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">Add Lead</DialogTitle>
        <DialogDescription className="text-white/50 text-xs">Capture a prospect into the pipeline.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {[["Name*", "name"], ["Phone*", "phone"], ["Email", "email"], ["Interest", "interest"]].map(([l, k]) => (
          <Field key={k} label={l}>
            <Input value={f[k]} onChange={(e) => set(k, e.target.value)} className="bg-[#050505] border-white/10 rounded-none h-10" data-testid={`lead-${k}`} />
          </Field>
        ))}
        <Field label="Source">
          <Select value={f.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger className="bg-[#050505] border-white/10 rounded-none h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              {["walk-in","Instagram","Facebook","Google Ads","Referral","Website"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} className="bg-[#050505] border-white/10 rounded-none" rows={3} /></Field>
      </div>
      <DialogFooter>
        <Button data-testid="save-lead" disabled={saving} onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Lead"}
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
