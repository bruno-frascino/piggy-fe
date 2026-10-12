export default function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`demo-badge ${className}`.trim()}
      title='Demo account — practice only, excluded from tax reports and All accounts totals'
    >
      Demo
    </span>
  );
}
