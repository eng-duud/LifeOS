import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Zap, Plus, ArrowRight, Calendar, CheckCircle2, Circle, Edit2, Trash2, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
});

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'مهام متراكمة', color: 'border-gray-300' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: 'border-blue-400' },
  { key: 'completed', label: 'مكتملة', color: 'border-green-400' },
];

const priorityLabel: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'عالي', urgent: 'عاجل' };
const priorityColor: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function ProjectDetail() {
  const [_, params] = useRoute('/projects/:id');
  const [__, setLocation] = useLocation();
  const projectId = params?.id ? Number(params.id) : null;

  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId! }, { enabled: !!projectId });
  const { data: allTasks } = trpc.tasks.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const utils = trpc.useUtils();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم إضافة المهمة');
      setIsTaskOpen(false);
      reset();
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم تحديث المهمة');
      setEditingTask(null);
      setIsTaskOpen(false);
      reset();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم حذف المهمة');
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const area = project?.areaId ? lifeAreas?.find((a: any) => a.id === project.areaId) : null;
  const projectTasks = allTasks?.filter(t => t.projectId === projectId) || [];

  const columns = KANBAN_COLUMNS.map(col => ({
    ...col,
    tasks: projectTasks.filter(t => t.status === col.key),
  }));

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const autoProgress = projectTasks.length > 0
    ? Math.round((completedTasks / projectTasks.length) * 100)
    : 0;

  const statusLabel: Record<string, string> = {
    planning: 'تخطيط', in_progress: 'قيد التنفيذ', completed: 'مكتمل', on_hold: 'معلق', cancelled: 'ملغى',
  };
  const statusColor: Record<string, string> = {
    planning: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setValue('title', task.title);
    setValue('description', task.description || '');
    setValue('priority', task.priority || 'medium');
    setValue('dueDate', task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setValue('estimatedHours', task.estimatedHours || undefined);
    setIsTaskOpen(true);
  };

  const advanceTask = (task: any) => {
    const nextStatus: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
    updateTask.mutate({ id: task.id, status: nextStatus[task.status] as any });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setLocation('/projects')}>
        <ArrowRight className="w-4 h-4 ml-1" />
        العودة للمشاريع
      </Button>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-purple-500">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[project.status]}`}>
                  {statusLabel[project.status]}
                </span>
              </div>
              {project.description && <p className="text-sm text-muted-foreground mb-1">{project.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {area && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color || '#3B82F6' }} />
                    {area.name}
                  </span>
                )}
                {project.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.startDate).toLocaleDateString('ar-SA')}
                  </span>
                )}
                {project.endDate && (
                  <span>→ {new Date(project.endDate).toLocaleDateString('ar-SA')}</span>
                )}
              </div>
            </div>
          </div>

          <Dialog open={isTaskOpen} onOpenChange={(open) => { if (!open) { setEditingTask(null); reset(); } setIsTaskOpen(open); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTask(null); reset(); }}>
                <Plus className="w-4 h-4 ml-2" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((data) => {
                const payload = {
                  title: data.title,
                  description: data.description || undefined,
                  priority: data.priority || 'medium',
                  dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                  estimatedHours: data.estimatedHours || undefined,
                  projectId: project.id,
                };
                if (editingTask) {
                  updateTask.mutate({ id: editingTask.id, ...payload });
                } else {
                  createTask.mutate(payload);
                }
              })} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">العنوان</label>
                  <Input {...register('title')} placeholder="أدخل عنوان المهمة" />
                </div>
                <div>
                  <label className="text-sm font-medium">الوصف</label>
                  <Textarea {...register('description')} placeholder="وصف المهمة" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">الأولوية</label>
                    <select {...register('priority')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">الوقت المقدر</label>
                    <Input type="number" step="0.5" {...register('estimatedHours', { valueAsNumber: true })} placeholder="ساعات" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">تاريخ الاستحقاق</label>
                  <DatePicker value={watch('dueDate')} onChange={(d) => setValue('dueDate', d ? d.toISOString().split('T')[0] : '')} />
                </div>
                <Button type="submit" className="w-full" disabled={createTask.isPending || updateTask.isPending}>
                  {editingTask ? 'تحديث' : 'إضافة'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Auto Progress */}
        <div className="mt-4 max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span>تقدم المشروع (تلقائي من المهام)</span>
            <span className="font-mono">{autoProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${autoProgress >= 100 ? 'bg-green-500' : autoProgress >= 50 ? 'bg-purple-500' : 'bg-purple-400'}`}
              style={{ width: `${Math.min(autoProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completedTasks}/{projectTasks.length} مهام مكتملة
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className={`border-t-4 ${col.color} rounded-lg bg-card p-4 min-h-[200px]`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {col.tasks.map(task => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleEdit(task)}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <button onClick={(e) => { e.stopPropagation(); advanceTask(task); }}>
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {task.priority && task.priority !== 'medium' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${priorityColor[task.priority]}`}>
                              {priorityLabel[task.priority]}
                            </span>
                          )}
                          {task.estimatedHours && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {task.estimatedHours}h
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={`text-[9px] ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {col.tasks.length === 0 && (
                <div
                  className="border-2 border-dashed border-muted rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => { setEditingTask(null); reset(); setIsTaskOpen(true); }}
                >
                  <Plus className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1">أضف مهمة</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
