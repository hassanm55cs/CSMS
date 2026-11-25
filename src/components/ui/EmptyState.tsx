export function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>{title}</div>
      <div className="text-sm mt-1 mb-4" style={{ color: 'var(--text-3)' }}>{desc}</div>
      {action}
    </div>
  );
}
