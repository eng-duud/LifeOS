import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Edit2, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const areaFormSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type AreaFormData = z.infer<typeof areaFormSchema>;

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

const PRESET_ICONS = ['heart', 'briefcase', 'dollar-sign', 'book-open', 'users', 'star', 'home', 'music', 'palette', 'globe'];

export default function LifeAreas() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const utils = trpc.useUtils();
  const { data: areas, isLoading } = trpc.lifeAreas.list.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();

  const createMutation = trpc.lifeAreas.create.useMutation({
    onSuccess: () => {
      utils.lifeAreas.list.invalidate();
      toast.success('تم إضافة المنطقة بنجاح');
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في إضافة المنطقة'),
  });

  const updateMutation = trpc.lifeAreas.update.useMutation({
    onSuccess: () => {
      utils.lifeAreas.list.invalidate();
      toast.success('تم تحديث المنطقة بنجاح');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في تحديث المنطقة'),
  });

  const deleteMutation = trpc.lifeAreas.delete.useMutation({
    onSuccess: () => {
      utils.lifeAreas.list.invalidate();
      toast.success('تم حذف المنطقة بنجاح');
    },
    onError: () => toast.error('فشل في حذف المنطقة'),
  });

  const { register, handleSubmit, reset, setValue } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
  });

  const onSubmit = (data: AreaFormData) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      icon: data.icon || undefined,
      color: selectedColor,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (area: any) => {
    setEditingId(area.id);
    setValue('name', area.name);
    setValue('description', area.description || '');
    setValue('icon', area.icon || '');
    setSelectedColor(area.color || '#3B82F6');
    setIsOpen(true);
  };

  const getAreaStats = (areaId: number) => {
    const areaGoals = goals?.filter(g => g.areaId === areaId) || [];
    const areaProjects = projects?.filter(p => p.areaId === areaId) || [];
    const areaTasks = tasks?.filter(t => {
      const goal = goals?.find(g => g.id === t.goalId);
      return goal?.areaId === areaId || areaProjects.some(p => p.id === t.projectId);
    }) || [];
    const areaHabits = habits?.filter(h => h.areaId === areaId) || [];
    const areaBooks = books?.filter(b => b.areaId === areaId) || [];
    return { goals: areaGoals.length, projects: areaProjects.length, tasks: areaTasks.length, habits: areaHabits.length, books: areaBooks.length };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">مناطق الحياة</h1>
          <p className="text-muted-foreground">نظّم حياتك في مناطق واضحة: الصحة، العمل، التعلم، العلاقات، والمزيد</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); setSelectedColor('#3B82F6'); }}>
              <Plus className="w-4 h-4 ml-2" />
              منطقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">الاسم</label>
                <Input {...register('name')} placeholder="مثال: الصحة، العمل، التعلم" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea {...register('description')} placeholder="وصف مختصر للمنطقة" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">اللون</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas && areas.length > 0 ? (
          areas.map((area) => {
            const stats = getAreaStats(area.id);
            const totalItems = stats.goals + stats.projects + stats.habits + stats.books;
            return (
              <Card key={area.id} className="relative overflow-hidden">
                <div className="h-2" style={{ backgroundColor: area.color || '#3B82F6' }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: area.color || '#3B82F6' }}
                      >
                        {area.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{area.name}</h3>
                        {area.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{area.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(area)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: area.id })}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {stats.goals > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="w-3 h-3" style={{ fill: area.color || '#3B82F6', color: area.color || '#3B82F6' }} />
                        <span>{stats.goals} أهداف</span>
                      </div>
                    )}
                    {stats.projects > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="w-3 h-3" style={{ fill: area.color || '#3B82F6', color: area.color || '#3B82F6' }} />
                        <span>{stats.projects} مشاريع</span>
                      </div>
                    )}
                    {stats.habits > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="w-3 h-3" style={{ fill: area.color || '#3B82F6', color: area.color || '#3B82F6' }} />
                        <span>{stats.habits} عادات</span>
                      </div>
                    )}
                    {stats.books > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="w-3 h-3" style={{ fill: area.color || '#3B82F6', color: area.color || '#3B82F6' }} />
                        <span>{stats.books} كتب</span>
                      </div>
                    )}
                  </div>

                  {totalItems === 0 && (
                    <p className="text-xs text-muted-foreground mt-3">لا توجد عناصر مرتبطة بعد</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">لا توجد مناطق חיים بعد</p>
              <p className="text-xs text-muted-foreground">أنشئ مناطق لتنظيم حياتك: الصحة، العمل، التعلم، العلاقات...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
