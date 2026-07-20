import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, ScanLine, CalendarCheck2, Dumbbell,
  Receipt, Wallet, TrendingUp, UserPlus, Building2, Bell, Settings, LogOut,
  Search, ChevronDown, Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "OVERVIEW", items: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/checkin", icon: ScanLine, label: "Check-In" },
    { to: "/attendance", icon: CalendarCheck2, label: "Attendance" },
  ]},
  { label: "OPERATIONS", items: [
    { to: "/members", icon: Users, label: "Members" },
    { to: "/memberships", icon: CreditCard, label: "Membership Plans" },
    { to: "/trainers", icon: Dumbbell, label: "Trainers" },
    { to: "/leads", icon: UserPlus, label: "CRM & Leads" },
  ]},
  { label: "FINANCE", items: [
    { to: "/payments", icon: Receipt, label: "Payments & Invoices" },
    { to: "/expenses", icon: Wallet, label: "Expenses" },
    { to: "/reports", icon: TrendingUp, label: "Revenue & Reports" },
  ]},
  { label: "SYSTEM", items: [
    { to: "/branches", icon: Building2, label: "Branches" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ]},
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [search, setSearch] = useState("");

  const doLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  const onSearch = (e) => {
    if (e.key === "Enter" && search.trim()) {
      nav(`/members?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 border-r border-white/10 bg-[#0A0A0A] sticky top-0 h-screen overflow-y-auto flex flex-col">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF3B30] flex items-center justify-center">
            <span className="font-display text-black font-bold">F</span>
          </div>
          <div className="font-display text-xl tracking-widest">FITMORE</div>
          <div className="ml-auto text-[10px] tracking-widest text-white/40 border border-white/10 px-2 py-0.5">v1</div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-6">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2 text-[10px] tracking-[0.25em] text-white/40">{group.label}</div>
              <ul className="space-y-0.5">
                {group.items.map((it) => (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      data-testid={`nav-${it.to.replace("/", "")}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-[#FF3B30]/10 text-white border-l-2 border-[#FF3B30]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
                        }`
                      }
                    >
                      <it.icon className="w-4 h-4" />
                      <span>{it.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 rounded-none border border-white/10">
              <AvatarFallback className="rounded-none bg-[#FF3B30] text-white text-xs font-semibold">
                {initials(user?.name || "OP")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[10px] tracking-widest text-white/40 uppercase">{user?.role}</div>
            </div>
            <button
              onClick={doLogout}
              data-testid="logout-button"
              className="text-white/40 hover:text-[#FF3B30]"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-6 gap-4">
          <div className="flex items-center gap-2 text-xs text-white/50 tracking-widest">
            <span className="w-2 h-2 bg-[#34C759] pulse-dot" />
            LIVE · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}
          </div>

          <div className="ml-auto flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                data-testid="global-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearch}
                placeholder="Search members, invoices, leads…"
                className="w-full h-10 bg-[#0A0A0A] border border-white/10 pl-10 pr-14 text-sm placeholder:text-white/30 focus:border-[#FF3B30] focus:outline-none rounded-none"
              />
              <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5">
                <Command className="w-3 h-3" /> K
              </kbd>
            </div>
          </div>

          <NavLink to="/notifications" className="relative p-2 text-white/60 hover:text-white" data-testid="topbar-notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF3B30]" />
          </NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu-trigger" className="flex items-center gap-2 pl-3 border-l border-white/10 hover:text-[#FF3B30]">
                <Avatar className="w-7 h-7 rounded-none border border-white/10">
                  <AvatarFallback className="rounded-none bg-white/10 text-white text-[10px]">
                    {initials(user?.name || "OP")}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10 rounded-none min-w-[200px]">
              <DropdownMenuLabel className="text-white/40 text-[10px] tracking-widest uppercase">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => nav("/settings")} className="rounded-none cursor-pointer">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout} data-testid="menu-logout" className="rounded-none cursor-pointer text-[#FF3B30]">
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
