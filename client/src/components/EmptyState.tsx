import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Action {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
}

export default function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="flex justify-center mb-4 text-muted-foreground/40">{icon}</div>
        <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mb-4">{description}</p>}
        <div className="flex items-center justify-center gap-2">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              <Plus className="w-3.5 h-3.5 ml-1" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
