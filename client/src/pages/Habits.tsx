import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Edit2, Calendar, CheckCircle, Flame, Repeat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShelfHelp } from '@/components/ShelfHelp';

const habitFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  category: z.string().optional(),
  areaId: z.any().optional(),
});

type HabitFormData = z.infer<typeof habitFormSchema>;

const frequencyLabels: Record<string, string> = {
  daily: 'يومية',
  weekly: 'أسبوعية',
  monthly: 'شهرية',
};

const frequencyColors: Record<string, string> = {
  daily: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

// Simple completion heatmap for last 30 days
function CompletionGrid({ completions }: { completions: { completedAt: string | Date }[] }) {
  const today = new Date();
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (34 - i));
    return d;
  });

  const completionDates = new Set(
    completions.map(c => {
      const d = new Date(c.completedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  return (
    <div className="mt-3">
      <p className="text-[10px] text-muted-foreground mb-1.5">آخر 35 يوم</p>
      <div className="flex gap-[3px] flex-wrap">
        {days.map((day, idx) => {
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isCompleted = completionDates.has(key);
          const isToday = day.toDateString() === today.toDateString();

          return (
            <div
              key={idx}
              className={`w-3 h-3 rounded-[2px] transition-colors ${
                isCompleted
                  ? 'bg-green-500 dark:bg-green-400'
                  : 'bg-muted dark:bg-muted/50'
              } ${isToday ? 'ring-1 ring-foreground/30' : ''}`}
              title={`${day.toLocaleDateString('ar-SA')} ${isCompleted ? '✓ مكتمل' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Habits() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const utils = trpc.useUtils();
  const { data: habits, isLoading } = trpc.habits.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const createMutation = trpc.habits.create.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم إضافة العادة بنجاح');
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في إضافة العادة'),
  });

  const updateMutation = trpc.habits.update.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تحديث العادة بنجاح');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في تحديث العادة'),
  });

  const deleteMutation = trpc.habits.delete.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم حذف العادة بنجاح');
    },
    onError: () => toast.error('فشل في حذف العادة'),
  });

  const completeMutation = trpc.habits.complete.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تسجيل الإنجاز! 🎉');
    },
    onError: () => toast.error('فشل في تسجيل الإنجاز'),
  });

  const { register, handleSubmit, reset, setValue } = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
  });

  const onSubmit = (data: HabitFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      frequency: data.frequency || 'daily',
      category: data.category || undefined,
      areaId: data.areaId ? Number(data.areaId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (habit: any) => {
    setEditingId(habit.id);
    setValue('title', habit.title);
    setValue('description', habit.description || '');
    setValue('frequency', habit.frequency || 'daily');
    setValue('category', habit.category || '');
    setValue('areaId', habit.areaId || '');
    setIsOpen(true);
  };

  const isCompletedToday = (habit: any) => {
    if (!habit.lastCompletedAt) return false;
    const last = new Date(habit.lastCompletedAt);
    const today = new Date();
    return last.toDateString() === today.toDateString();
  };

  const filteredHabits = habits?.filter(h => {
    if (filter !== 'all' && h.frequency !== filter) return false;
    if (areaFilter !== 'all' && h.areaId !== Number(areaFilter)) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">العادات</h1>
          <p className="text-muted-foreground">تابع عاداتك اليومية والأسبوعية وحافظ على سلاسلك</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="w-4 h-4 ml-2" />
              عادة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل العادة' : 'إضافة عادة جديدة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">العنوان</label>
                <Input {...register('title')} placeholder="مثال: التمارين الرياضية" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea {...register('description')} placeholder="وصف العادة (اختياري)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">التكرار</label>
                  <select
                    {...register('frequency')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="daily">يومية</option>
                    <option value="weekly">أسبوعية</option>
                    <option value="monthly">شهرية</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">الفئة</label>
                  <Input {...register('category')} placeholder="مثال: صحة، تعلم" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">منطقة الحياة</label>
                <select {...register('areaId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون منطقة</option>
                  {lifeAreas?.map((area: any) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            الكل ({habits?.length || 0})
          </Button>
          <Button variant={filter === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('daily')}>
            يومية
          </Button>
          <Button variant={filter === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('weekly')}>
            أسبوعية
          </Button>
          <Button variant={filter === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('monthly')}>
            شهرية
          </Button>
        </div>
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-xs text-muted-foreground">منطقة الحياة:</span>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="all">الكل</option>
            {lifeAreas?.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHabits && filteredHabits.length > 0 ? (
          filteredHabits.map((habit) => {
            const completedToday = isCompletedToday(habit);
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedToday={completedToday}
                onComplete={() => completeMutation.mutate({ id: habit.id })}
                onEdit={() => handleEdit(habit)}
                onDelete={() => deleteMutation.mutate({ id: habit.id })}
                isCompleting={completeMutation.isPending}
              />
            );
          })
        ).concat(
          <div key="shelf-help" className="col-span-full mt-2">
            <ShelfHelp context="habits" />
          </div>
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Repeat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد عادات حالياً</p>
              <p className="text-muted-foreground text-sm mt-1">ابدأ بإضافة عادتك الأولى</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Separate component so each card can fetch its own completions
function HabitCard({
  habit,
  completedToday,
  onComplete,
  onEdit,
  onDelete,
  isCompleting,
}: {
  habit: any;
  completedToday: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCompleting: boolean;
}) {
  const { data: completionsData } = trpc.habits.completions.useQuery({ habitId: habit.id });
  const completions = Array.isArray(completionsData) ? completionsData : [];

  return (
    <Card className={`relative overflow-hidden transition-all ${completedToday ? 'ring-2 ring-green-500/30' : ''}`}>
      {/* Streak accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        habit.currentStreak >= 30 ? 'bg-gradient-to-l from-yellow-400 to-orange-500' :
        habit.currentStreak >= 7 ? 'bg-green-500' :
        habit.currentStreak >= 1 ? 'bg-green-300' :
        'bg-muted'
      }`} />

      <CardContent className="p-5 pt-6">
        <div className="flex items-start gap-4">
          {/* Check-in button */}
          <button
            onClick={onComplete}
            disabled={completedToday || isCompleting}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              completedToday
                ? 'bg-green-100 dark:bg-green-900/30 text-green-500 cursor-default'
                : 'bg-muted hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-500 cursor-pointer'
            }`}
            title={completedToday ? 'مكتمل اليوم ✓' : 'سجّل إنجاز اليوم'}
          >
            <CheckCircle className="w-6 h-6" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg text-foreground">{habit.title}</h3>
              {habit.frequency && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${frequencyColors[habit.frequency] || frequencyColors.daily}`}>
                  {frequencyLabels[habit.frequency] || 'يومية'}
                </span>
              )}
              {habit.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {habit.category}
                </span>
              )}
            </div>

            {habit.description && (
              <p className="text-sm text-muted-foreground mt-1">{habit.description}</p>
            )}

            {/* Streak & stats */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Flame className={`w-4 h-4 ${habit.currentStreak >= 7 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold">{habit.currentStreak}</span>
                <span className="text-muted-foreground">يوم متتالي</span>
              </div>
              {habit.longestStreak > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>أفضل سلسلة: <span className="font-semibold text-foreground">{habit.longestStreak}</span></span>
                </div>
              )}
              {habit.lastCompletedAt && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>آخر إنجاز: {new Date(habit.lastCompletedAt).toLocaleDateString('ar-SA')}</span>
                </div>
              )}
            </div>

            {/* Completion heatmap */}
            {completions && completions.length > 0 && (
              <CompletionGrid completions={completions} />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
