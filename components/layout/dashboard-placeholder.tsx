interface DashboardPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
}: DashboardPlaceholderProps) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
      <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
    </section>
  );
}
