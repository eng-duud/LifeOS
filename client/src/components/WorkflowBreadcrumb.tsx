import { useLocation } from 'wouter';
import { ChevronLeft, Home } from 'lucide-react';

interface BreadcrumbSegment {
  label: string;
  path?: string;
}

export default function WorkflowBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  const [_, setLocation] = useLocation();

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 overflow-x-auto">
      <button onClick={() => setLocation('/dashboard')} className="hover:text-foreground transition-colors shrink-0">
        <Home className="w-3.5 h-3.5" />
      </button>
      {segments.map((seg, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronLeft className="w-3 h-3 shrink-0" />
          {seg.path ? (
            <button onClick={() => setLocation(seg.path!)} className="hover:text-foreground transition-colors whitespace-nowrap">
              {seg.label}
            </button>
          ) : (
            <span className="text-foreground font-medium whitespace-nowrap">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
