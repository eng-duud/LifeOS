import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Target, Plus, Calendar, Filter, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import WorkflowBreadcrumb from '@/components/WorkflowBreadcrumb';
import StatusBadge from '@/components/StatusBadge';
import ProgressDisplay from '@/components/ProgressDisplay';
import EntityCard from '@/components/EntityCard';
import EmptyState from '@/components/EmptyState';
import { ShelfHelp } from '@/components/ShelfHelp';

const goalFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  category: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.any().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
  areaId: z.any().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

export default function Goals() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');

  const utils = trpc.useUtils();
  const { data: goals, isLoading: goalsLoading } = trpc.goals.list.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم إضافة الهدف بنجاح');
      setIsOpen(false);
      reset();
    },
    onError: () => {
      toast.error('فشل في إضافة الهدف');
    },
  });

  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تحديث الهدف بنجاح');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
    onError: () => {
      toast.error('فشل في تحديث الهدف');
    },
  });

  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم حذف الهدف بنجاح');
    },
    onError: () => {
      toast.error('فشل في حذف الهدف');
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
  });

  const onSubmit = (data: GoalFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      category: data.category || undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      progress: data.progress ? Number(data.progress) : 0,
      status: data.status || 'active',
      areaId: data.areaId ? Number(data.areaId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (goal: any) => {
    setEditingId(goal.id);
    setValue('title', goal.title);
    setValue('description', goal.description || '');
    setValue('category', goal.category || '');
    setValue('targetDate', goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setValue('progress', goal.progress || 0);
    setValue('status', goal.status);
    setValue('areaId', goal.areaId || '');
    setIsOpen(true);
  };

  const filteredGoals = goals?.filter(goal => {
    if (filter === 'all') return true;
    return goal.status === filter;
  });

  const totalGoals = goals?.length || 0;
  const activeGoals = goals?.filter(g => g.status === 'active').length || 0;

  if (goalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <WorkflowBreadcrumb segments={[{ label: 'الأهداف' }]} />

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأهداف</h1>
          <p className="text-sm text-muted-foreground">
            {totalGoals} هدف &bull; {activeGoals} نشط
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="w-4 h-4 ml-2" />
              هدف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل الهدف' : 'إضافة هدف جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">العنوان</label>
                <Input {...register('title')} placeholder="أدخل عنوان الهدف" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea {...register('description')} placeholder="أدخل وصف الهدف" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الفئة</label>
                  <Input {...register('category')} placeholder="مثال: مهني، صحي" />
                </div>
                <div>
                  <label className="text-sm font-medium">الحالة</label>
                  <select {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                    <option value="on_hold">معلق</option>
                    <option value="cancelled">ملغى</option>
                  </select>
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
              <div>
                <label className="text-sm font-medium">تاريخ الاستحقاق المستهدف</label>
                <DatePicker
                  value={watch('targetDate')}
                  onChange={(d) => setValue('targetDate', d ? d.toISOString().split('T')[0] : '')}
                />
              </div>
              {editingId && (
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <label>التقدم</label>
                    <span>{watch('progress') || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-full"
                    {...register('progress')}
                  />
                </div>
              )}
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

      <div className="mb-6 flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          الكل
        </Button>
        <Button variant={filter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('active')}>
          نشطة
        </Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>
          مكتملة
        </Button>
        <Button variant={filter === 'on_hold' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('on_hold')}>
          معلقة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals && filteredGoals.length > 0 ? (
          filteredGoals.map((goal) => {
            const area = lifeAreas?.find((a: any) => a.id === goal.areaId);
            const goalTasks = tasks?.filter(t => t.goalId === goal.id) || [];
            const completedGoalTasks = goalTasks.filter(t => t.status === 'completed');

            return (
              <EntityCard
                key={goal.id}
                icon={<Target className="w-5 h-5 text-blue-500" />}
                title={goal.title}
                href={`/goals/${goal.id}`}
                accentColor={area?.color || '#3B82F6'}
              >
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <StatusBadge status={goal.status} />
                  {goal.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {goal.category}
                    </span>
                  )}
                  {area && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: area.color || '#3B82F6' }}
                    >
                      {area.name}
                    </span>
                  )}
                </div>

                {goal.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{goal.description}</p>
                )}

                <ProgressDisplay value={goal.progress || 0} size="sm" label="نسبة الإنجاز للهدف" className="mt-3" />

                {goal.targetDate && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    تاريخ الاستحقاق: {new Date(goal.targetDate).toLocaleDateString('ar-SA')}
                  </p>
                )}

                {goalTasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      المهام المرتبطة ({completedGoalTasks.length}/{goalTasks.length})
                    </p>
                  </div>
                )}

                <div className="flex gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => { e.stopPropagation(); handleEdit(goal); }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: goal.id }); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </EntityCard>
            );
          })
        ) : (
          <EmptyState
            icon={<Target className="w-12 h-12" />}
            title="لا توجد أهداف حالياً"
            description="ابدأ بتحديد أهدافك الإستراتيجية وتتبع تقدمك"
            action={{
              label: 'هدف جديد',
              onClick: () => { setEditingId(null); reset(); setIsOpen(true); },
            }}
          />
        )}
      </div>

      {filteredGoals && filteredGoals.length > 0 && (
        <div className="mt-6">
          <ShelfHelp context="goals" />
        </div>
      )}
    </div>
  );
}
