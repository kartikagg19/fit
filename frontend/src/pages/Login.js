import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Loader2, ShieldCheck, Zap, LineChart } from "lucide-react";

const HERO = "https://images.pexels.com/photos/29392546/pexels-photo-29392546.jpeg";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("aggarwalkartik688@gmail.com");
  const [password, setPassword] = useState("Fitmore@123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      toast.success("Welcome back", { description: "Redirecting to your dashboard" });
      const to = loc.state?.from?.pathname || "/dashboard";
      nav(to, { replace: true });
    } else {
      setErr(res.error);
      toast.error("Sign in failed", { description: res.error });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white grid lg:grid-cols-[1fr_520px]">
      {/* Left hero */}
      <div className="relative hidden lg:block overflow-hidden border-r border-white/10">
        <img
          src={HERO}
          alt="FitMore gym"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-black/30" />
        <div className="relative h-full flex flex-col justify-between p-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FF3B30] flex items-center justify-center">
              <span className="font-display text-black font-bold">F</span>
            </div>
            <span className="font-display text-2xl tracking-widest">FITMORE</span>
          </div>

          <div className="max-w-lg space-y-8">
            <div>
              <div className="text-xs tracking-[0.4em] text-[#FF3B30] mb-4">GYM OPERATING SYSTEM</div>
              <h1 className="font-display text-6xl xl:text-7xl leading-[0.9]">
                RUN YOUR GYM.<br/>
                <span className="text-[#FF3B30]">NOT PAPERWORK.</span>
              </h1>
              <p className="mt-6 text-white/60 text-base max-w-md leading-relaxed">
                Members, memberships, check-ins, invoices, revenue —
                one command deck. Built for owners who move fast.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <Feature icon={ShieldCheck} label="Role-based access" />
              <Feature icon={Zap} label="QR / RFID check-in" />
              <Feature icon={LineChart} label="Live analytics" />
            </div>
          </div>

          <div className="text-xs text-white/40 tracking-widest">
            v1.0 · TACTICAL EDITION
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center px-8 md:px-14 py-16 relative">
        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FF3B30] flex items-center justify-center">
            <span className="font-display text-black font-bold">F</span>
          </div>
          <span className="font-display text-2xl tracking-widest">FITMORE</span>
        </div>

        <div className="max-w-sm w-full">
          <div className="text-xs tracking-[0.4em] text-[#FF3B30] mb-3">SIGN IN</div>
          <h2 className="font-display text-4xl leading-tight mb-2">Welcome back, Operator.</h2>
          <p className="text-white/50 text-sm mb-10">Sign in to take command of your business.</p>

          <form onSubmit={submit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-widest text-white/60 uppercase">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-[#0A0A0A] border-white/10 rounded-none h-12 focus:border-[#FF3B30] focus:ring-0"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs tracking-widest text-white/60 uppercase">Password</Label>
                <button type="button" className="text-xs text-white/40 hover:text-[#FF3B30]" data-testid="forgot-password-link">Forgot?</button>
              </div>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-[#0A0A0A] border-white/10 rounded-none h-12 focus:border-[#FF3B30] focus:ring-0"
              />
            </div>

            {err && (
              <div data-testid="login-error" className="text-xs text-[#FF3B30] border border-[#FF3B30]/30 bg-[#FF3B30]/5 px-3 py-2">
                {err}
              </div>
            )}

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 rounded-none bg-[#FF3B30] hover:bg-[#FF5C53] text-white font-semibold tracking-wider group"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2">
                  ENTER COMMAND DECK
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/10 text-xs text-white/40 space-y-1">
            <div className="tracking-widest text-white/60 uppercase mb-2">Demo Access</div>
            <div><span className="text-white/60">Owner:</span> aggarwalkartik688@gmail.com</div>
            <div><span className="text-white/60">Password:</span> Fitmore@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-[#FF3B30] mt-0.5" />
      <div className="text-xs text-white/70 leading-snug">{label}</div>
    </div>
  );
}
