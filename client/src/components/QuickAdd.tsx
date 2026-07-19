import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAddProps {
  placeholder?: string;
  onSubmit: (title: string) => void;
  className?: string;
  buttonLabel?: string;
  autoFocus?: boolean;
}

export default function QuickAdd({ placeholder = 'أضف مهمة سريعة...', onSubmit, className, buttonLabel, autoFocus }: QuickAddProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-10"
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
      />
      <Button size="sm" onClick={handleSubmit} disabled={!value.trim()} className="shrink-0">
        {buttonLabel ? (
          <Plus className="w-4 h-4 ml-1" />
        ) : (
          <ListPlus className="w-4 h-4" />
        )}
        {buttonLabel}
      </Button>
    </div>
  );
}
