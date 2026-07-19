import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface EntityCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  status?: { label: string; className: string };
  progress?: number;
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  accentColor?: string;
}

export default function EntityCard({ icon, title, subtitle, status, progress, children, onClick, href, className, accentColor }: EntityCardProps) {
  const [_, setLocation] = useLocation();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (href) { setLocation(href); }
  };

  return (
    <Card className={cn('relative overflow-hidden cursor-pointer hover:shadow-md transition-all', className)} onClick={handleClick}>
      {accentColor && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', status ? 'bg-muted' : 'bg-muted')}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {status && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', status.className)}>
                  {status.label}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>}
            {children}
          </div>
          {progress !== undefined && (
            <div className="shrink-0">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={100.5}
                    strokeDashoffset={100.5 - (Math.min(Math.max(progress, 0), 100) / 100) * 100.5}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold font-mono">{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
