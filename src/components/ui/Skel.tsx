export function Skel({ h = '16px', w = '100%', className = '' }: { h?: string; w?: string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height: h, width: w }} />;
}
