import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { CircularProgress } from '@/components/ProgressDisplay';

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
              <CircularProgress value={progress} size={40} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
