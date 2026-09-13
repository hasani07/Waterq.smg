export default function GlassCard({
  children,
  className = "",
  padding = "px-6 py-6",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return <div className={`glass-card ${padding} ${className}`}>{children}</div>;
}
