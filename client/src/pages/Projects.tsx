import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Calendar, Zap, Filter } from 'lucide-react';
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

const projectFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.any().optional(),
  areaId: z.any().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const taskFormSchema = z.object({
  title: z.string().min(1, 'عنوان المهمة مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const priorityLabels: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  urgent: 'عاجل',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const accentByPriority: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#0ea5e9',
  low: '#9ca3af',
};

const filterOptions = [
  { key: 'all' as const, label: 'الكل' },
  { key: 'in_progress' as const, label: 'قيد التنفيذ' },
  { key: 'completed' as const, label: 'مكتملة' },
  { key: 'planning' as const, label: 'تخطيط' },
];

export default function Projects() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [taskDialogProjectId, setTaskDialogProjectId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'planning' | 'in_progress' | 'completed' | 'on_hold'>('all');

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم إنشاء المشروع بنجاح');
      setIsOpen(false);
      resetProject();
    },
    onError: () => toast.error('فشل في إنشاء المشروع'),
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تحديث المشروع بنجاح');
      setEditingId(null);
      setIsOpen(false);
      resetProject();
    },
    onError: () => toast.error('فشل في تحديث المشروع'),
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم حذف المشروع بنجاح');
    },
    onError: () => toast.error('فشل في حذف المشروع'),
  });

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم إضافة المهمة إلى المشروع');
      setTaskDialogProjectId(null);
      resetTask();
    },
    onError: () => toast.error('فشل في إضافة المهمة'),
  });

  const {
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProject,
    setValue: setProjectValue,
    watch: watchProject,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
  });

  const {
    register: registerTask,
    handleSubmit: handleSubmitTask,
    reset: resetTask,
    watch: watchTask,
    setValue: setTaskValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
  });

  const onSubmitProject = (data: ProjectFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority || undefined,
      status: data.status || 'planning',
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      progress: data.progress ? Number(data.progress) : 0,
      areaId: data.areaId ? Number(data.areaId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onSubmitTask = (data: TaskFormData) => {
    if (!taskDialogProjectId) return;
    createTaskMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      priority: data.priority || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: taskDialogProjectId,
    });
  };

  const handleEdit = (project: any) => {
    setEditingId(project.id);
    setProjectValue('title', project.title);
    setProjectValue('description', project.description || '');
    setProjectValue('priority', project.priority || 'low');
    setProjectValue('status', project.status || 'planning');
    setProjectValue('startDate', project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
    setProjectValue('endDate', project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '');
    setProjectValue('progress', project.progress || 0);
    setProjectValue('areaId', project.areaId || '');
    setIsOpen(true);
  };

  const filteredProjects = projects?.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getAutoProgress = (projectId: number) => {
    const projectTasks = tasks?.filter((t) => t.projectId === projectId) || [];
    if (projectTasks.length === 0) return null;
    const completed = projectTasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const getTaskCounts = (projectId: number) => {
    const projectTasks = tasks?.filter((t) => t.projectId === projectId) || [];
    const completed = projectTasks.filter((t) => t.status === 'completed').length;
    return { total: projectTasks.length, completed };
  };

  const inProgressCount = projects?.filter((p) => p.status === 'in_progress').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <WorkflowBreadcrumb segments={[{ label: 'المشاريع' }]} />

      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">المشاريع</h1>
          <p className="text-muted-foreground">
            {projects?.length || 0} مشروع • {inProgressCount} قيد التنفيذ
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); resetProject(); }}>
              <Plus className="w-4 h-4 ml-2" />
              مشروع جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل المشروع' : 'إنشاء مشروع جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitProject(onSubmitProject)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">العنوان</label>
                <Input {...registerProject('title')} placeholder="أدخل عنوان المشروع" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea {...registerProject('description')} placeholder="وصف المشروع وأهدافه" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الأولوية</label>
                  <select
                    {...registerProject('priority')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">منخفض</option>
                    <option value="medium">متوسط</option>
                    <option value="high">مرتفع</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">الحالة</label>
                  <select
                    {...registerProject('status')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="planning">تخطيط</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتمل</option>
                    <option value="on_hold">معلق</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">تاريخ البدء</label>
                  <DatePicker
                    value={watchProject('startDate')}
                    onChange={(d) => setProjectValue('startDate', d ? d.toISOString().split('T')[0] : '')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">تاريخ الانتهاء</label>
                  <DatePicker
                    value={watchProject('endDate')}
                    onChange={(d) => setProjectValue('endDate', d ? d.toISOString().split('T')[0] : '')}
                  />
                </div>
              </div>
              {editingId && (
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <label>التقدم اليدوي</label>
                    <span>{watchProject('progress') || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-full accent-purple-500"
                    {...registerProject('progress')}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">منطقة الحياة</label>
                <select {...registerProject('areaId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون منطقة</option>
                  {lifeAreas?.map((area: any) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'تحديث' : 'إنشاء'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground mt-1" />
        {filterOptions.map((opt) => {
          const count = opt.key === 'all'
            ? projects?.length || 0
            : projects?.filter((p) => p.status === opt.key).length || 0;
          return (
            <Button
              key={opt.key}
              variant={filter === opt.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(opt.key)}
            >
              {opt.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredProjects && filteredProjects.length > 0 ? (
          filteredProjects.map((project) => {
            const autoProgress = getAutoProgress(project.id);
            const displayProgress = autoProgress !== null ? autoProgress : (project.progress || 0);
            const { total, completed } = getTaskCounts(project.id);

            return (
              <EntityCard
                key={project.id}
                icon={<Zap className="w-5 h-5 text-purple-500" />}
                title={project.title}
                subtitle={project.description || undefined}
                status={{
                  label: (() => {
                    const labels: Record<string, string> = {
                      planning: 'تخطيط',
                      in_progress: 'قيد التنفيذ',
                      completed: 'مكتمل',
                      on_hold: 'معلق',
                      cancelled: 'ملغى',
                    };
                    return labels[project.status || 'planning'];
                  })(),
                  className: (() => {
                    const colors: Record<string, string> = {
                      planning: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                      completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                      on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
                      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                    };
                    return colors[project.status || 'planning'];
                  })(),
                }}
                href={`/projects/${project.id}`}
                accentColor={accentByPriority[project.priority || 'low']}
              >
                {/* Progress */}
                <div className="mt-3">
                  <ProgressDisplay
                    value={displayProgress}
                    size="sm"
                    label={autoProgress !== null ? 'تقدم تلقائي من المهام' : 'تقدم يدوي'}
                  />
                </div>

                {/* Dates */}
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {project.startDate && (
                      <span>بدء: {new Date(project.startDate).toLocaleDateString('ar-SA')}</span>
                    )}
                    {project.endDate && (
                      <span>انتهاء: {new Date(project.endDate).toLocaleDateString('ar-SA')}</span>
                    )}
                  </div>
                )}

                {/* Task counts */}
                {total > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    المهام: {completed}/{total} مكتملة
                  </p>
                )}

                {/* Action row */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(project);
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskDialogProjectId(project.id);
                      resetTask();
                    }}
                  >
                    <Plus className="w-3 h-3 ml-0.5" />
                    إضافة مهمة
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-red-500 hover:text-red-700 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: project.id });
                    }}
                  >
                    حذف
                  </Button>
                </div>
              </EntityCard>
            );
          })
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={<Zap className="w-12 h-12" />}
              title="لا توجد مشاريع حالياً"
              description="ابدأ بإنشاء مشروعك الأول لتتابع مسارك"
              action={{
                label: 'مشروع جديد',
                onClick: () => { setEditingId(null); resetProject(); setIsOpen(true); },
              }}
            />
          </div>
        )}
      </div>

      {/* Add Task to Project Dialog */}
      <Dialog open={taskDialogProjectId !== null} onOpenChange={(open) => { if (!open) setTaskDialogProjectId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة مهمة للمشروع</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTask(onSubmitTask)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">عنوان المهمة</label>
              <Input {...registerTask('title')} placeholder="أدخل عنوان المهمة" />
            </div>
            <div>
              <label className="text-sm font-medium">الوصف</label>
              <Textarea {...registerTask('description')} placeholder="وصف المهمة (اختياري)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">الأولوية</label>
                <select
                  {...registerTask('priority')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">منخفض</option>
                  <option value="medium">متوسط</option>
                  <option value="high">مرتفع</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ الاستحقاق</label>
                <DatePicker
                  value={watchTask('dueDate')}
                  onChange={(d) => setTaskValue('dueDate', d ? d.toISOString().split('T')[0] : '')}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createTaskMutation.isPending}>
                إضافة
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setTaskDialogProjectId(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
