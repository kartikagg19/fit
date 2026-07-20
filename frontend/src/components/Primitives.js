import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, subtitle, right, className }) {
  return (
    <div className={cn("border-b border-white/10 px-8 py-6 flex items-end gap-6", className)}>
      <div className="flex-1">
        {eyebrow && (
          <div className="text-[10px] tracking-[0.35em] text-[#FF3B30] mb-2 font-medium">{eyebrow}</div>
        )}
        <h1 className="font-display text-4xl leading-none">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm mt-2">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function StatCell({ label, value, delta, tone = "default", testid }) {
  const toneColor = {
    positive: "text-[#34C759]",
    negative: "text-[#FF3B30]",
    default: "text-white/60",
  }[tone];

  return (
    <div
      data-testid={testid}
      className="border border-white/10 bg-[#0A0A0A] p-6 hover-lift hover:border-white/25"
    >
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">{label}</div>
      <div className="kpi-value text-4xl">{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={cn("text-xs mt-2 flex items-center gap-1", toneColor)}>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon, action }) {
  return (
    <div className="border border-dashed border-white/10 bg-[#0A0A0A]/50 p-14 text-center">
      {Icon && (
        <div className="w-12 h-12 mx-auto mb-4 border border-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white/40" />
        </div>
      )}
      <div className="font-display text-xl">{title}</div>
      {description && <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Section({ title, children, right, className }) {
  return (
    <section className={cn("border border-white/10 bg-[#0A0A0A]", className)}>
      <div className="flex items-center px-5 py-3 border-b border-white/10">
        <div className="text-[10px] tracking-[0.3em] text-white/50 uppercase">{title}</div>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
