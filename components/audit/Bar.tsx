export function Bar({ have, need }: { have: number; need: number }) {
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100;
  return (
    <div className="h-3 w-full overflow-hidden rounded border-2 border-black bg-background">
      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
