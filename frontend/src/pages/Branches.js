import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/Primitives";
import { Building2, MapPin, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", address: "", phone: "", manager_name: "" });

  const load = async () => setBranches((await api.get("/branches")).data);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!f.name) return toast.error("Name required");
    try {
      const { data } = await api.post("/branches", f);
      setBranches([...branches, data]); setOpen(false); setF({ name: "", address: "", phone: "", manager_name: "" });
      toast.success("Branch added");
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  return (
    <div>
      <PageHeader
        eyebrow="MULTI-LOCATION"
        title="Branches"
        subtitle="Every location under one roof."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-branch-button" className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10 gap-2">
                <Plus className="w-4 h-4" /> New Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl tracking-wider">New Branch</DialogTitle>
                <DialogDescription className="text-white/50 text-xs">Open a new location.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {[["Name*", "name"], ["Address", "address"], ["Phone", "phone"], ["Manager", "manager_name"]].map(([l, k]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-[10px] tracking-widest text-white/50 uppercase">{l}</Label>
                    <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="bg-[#050505] border-white/10 rounded-none h-10" data-testid={`branch-${k}`} />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button data-testid="save-branch" onClick={save} className="rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] h-10">Add Branch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="border border-white/10 bg-[#0A0A0A] p-6 hover-lift hover:border-white/25" data-testid={`branch-${b.id}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#FF3B30]" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-xl">{b.name}</div>
                <div className="text-[10px] tracking-widest text-white/40 uppercase mt-1">Manager: {b.manager_name || "—"}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-white/40" /> {b.address}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-white/40" /> {b.phone}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
