import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, CheckCircle2, Circle, Edit2, ListChecks, Inbox, Archive, Calendar, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShelfHelp } from '@/components/ShelfHelp';

const taskFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  progress: z.any().optional(),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
  habitId: z.string().optional(),
  areaId: z.string().optional(),
  planId: z.string().optional(),
  bookId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

type WorkflowTab = 'inbox' | 'backlog' | 'planned' | 'today' | 'completed';

const TAB_LABELS: Record<WorkflowTab, string> = {
  inbox: 'صندوق الوارد',
  backlog: 'مهام متراكمة',
  planned: 'مخطط لها',
  today: 'اليوم',
  completed: 'مكتملة',
};

const TAB_ICONS: Record<WorkflowTab, React.ReactNode> = {
  inbox: <Inbox className="w-4 h-4" />,
  backlog: <Archive className="w-4 h-4" />,
  planned: <Calendar className="w-4 h-4" />,
  today: <Clock className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
};

const priorityLabel: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const priorityColor: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40',
};

export default function Tasks() {
  const [tab, setTab] = useState<WorkflowTab>('inbox');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();
  const { data: plans } = trpc.plans.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();
  const { data: subtasks, refetch: refetchSubtasks } = trpc.subtasks.list.useQuery({ taskId: editingId || 0 });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم إضافة المهمة');
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في إضافة المهمة'),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تحديث المهمة');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
    onError: () => toast.error('فشل في تحديث المهمة'),
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم حذف المهمة');
    },
    onError: () => toast.error('فشل في حذف المهمة'),
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
  });

  const createSubtaskMutation = trpc.subtasks.create.useMutation({
    onSuccess: () => {
      refetchSubtasks();
      toast.success('تم إضافة المهمة الفرعية');
      setNewSubtaskTitle('');
    },
    onError: () => toast.error('فشل في إضافة المهمة الفرعية'),
  });

  const toggleSubtaskMutation = trpc.subtasks.update.useMutation({
    onSuccess: () => refetchSubtasks(),
  });

  const deleteSubtaskMutation = trpc.subtasks.delete.useMutation({
    onSuccess: () => { refetchSubtasks(); toast.success('تم حذف المهمة الفرعية'); },
  });

  const onSubmit = (data: TaskFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      progress: data.progress ? Number(data.progress) : 0,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: data.projectId && data.projectId !== 'none' ? Number(data.projectId) : undefined,
      goalId: data.goalId && data.goalId !== 'none' ? Number(data.goalId) : undefined,
      habitId: data.habitId && data.habitId !== 'none' ? Number(data.habitId) : undefined,
      areaId: data.areaId && data.areaId !== 'none' ? Number(data.areaId) : undefined,
      planId: data.planId && data.planId !== 'none' ? Number(data.planId) : undefined,
      bookId: data.bookId && data.bookId !== 'none' ? Number(data.bookId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setValue('title', task.title);
    setValue('description', task.description || '');
    setValue('priority', task.priority);
    setValue('status', task.status);
    setValue('progress', task.progress || 0);
    setValue('dueDate', task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setValue('projectId', task.projectId ? String(task.projectId) : 'none');
    setValue('goalId', task.goalId ? String(task.goalId) : 'none');
    setValue('habitId', task.habitId ? String(task.habitId) : 'none');
    setValue('areaId', task.areaId ? String(task.areaId) : 'none');
    setValue('planId', task.planId ? String(task.planId) : 'none');
    setValue('bookId', task.bookId ? String(task.bookId) : 'none');
    setIsOpen(true);
  };

  const handleToggleStatus = (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const newProgress = newStatus === 'completed' ? 100 : 0;
    updateMutation.mutate({ id: task.id, status: newStatus, progress: newProgress });
  };

  const todayStr = new Date().toDateString();

  const workflowTasks = useMemo(() => {
    if (!tasks) return { inbox: [], backlog: [], planned: [], today: [], completed: [] };

    const inbox: any[] = [];
    const backlog: any[] = [];
    const planned: any[] = [];
    const todayTasks: any[] = [];
    const completed: any[] = [];

    tasks.forEach(task => {
      if (task.status === 'completed') {
        completed.push(task);
        return;
      }

      if (task.dueDate) {
        const taskDate = new Date(task.dueDate).toDateString();
        if (taskDate === todayStr) {
          todayTasks.push(task);
          return;
        }
        if (new Date(task.dueDate) > new Date()) {
          planned.push(task);
          return;
        }
      }

      if (task.goalId || task.projectId || task.planId) {
        backlog.push(task);
        return;
      }

      inbox.push(task);
    });

    return { inbox, backlog, planned, today: todayTasks, completed };
  }, [tasks, todayStr]);

  const currentTasks = workflowTasks[tab];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">المهام</h1>
        <p className="text-sm text-muted-foreground">تدفق عمل متكامل من الفكرة إلى الإنجاز</p>
      </div>

      {/* Workflow Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-2 border-b">
        {(Object.keys(TAB_LABELS) as WorkflowTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap ${
              tab === t
                ? 'bg-card border-b-2 border-primary text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {TAB_ICONS[t]}
            {TAB_LABELS[t]}
            {workflowTasks[t].length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{workflowTasks[t].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mb-4">
        {tab === 'inbox' && (
          <p className="text-xs text-muted-foreground">مهام جديدة بدون تاريخ أو ربط — قم بمعالجتها لتنظيم أولوياتك</p>
        )}
        {tab === 'backlog' && (
          <p className="text-xs text-muted-foreground">مهام مرتبطة بالأهداف والمشاريع لكن بدون تاريخ محدد</p>
        )}
        {tab === 'planned' && (
          <p className="text-xs text-muted-foreground">مهام موعدها في المستقبل</p>
        )}
        {tab === 'today' && (
          <p className="text-xs text-muted-foreground">مهام اليوم — ركز على إنجازها</p>
        )}
        {tab === 'completed' && (
          <p className="text-xs text-muted-foreground">المهام المكتملة — إنجازاتك</p>
        )}
      </div>

      {/* Empty state */}
      {currentTasks.length === 0 && (
        <Card className="mb-6">
          <CardContent className="p-12 text-center">
            {tab === 'inbox' && (
              <>
                <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">صندوق الوارد فارغ</p>
                <p className="text-xs text-muted-foreground/60">كل المهام تم تنظيمها</p>
              </>
            )}
            {tab === 'today' && (
              <>
                <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">اليوم هادئ!</p>
                <p className="text-xs text-muted-foreground/60">خطط ليوم منتج</p>
              </>
            )}
            {tab === 'completed' && (
              <>
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">لا توجد مهام مكتملة بعد</p>
                <p className="text-xs text-muted-foreground/60">ابدأ بإنجاز المهام لتظهر هنا</p>
              </>
            )}
            {tab === 'backlog' && (
              <>
                <Archive className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">كل المهام مرتبة</p>
                <p className="text-xs text-muted-foreground/60">لا توجد مهام في المتراكمة</p>
              </>
            )}
            {tab === 'planned' && (
              <>
                <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">لا توجد مهام مخطط لها</p>
                <p className="text-xs text-muted-foreground/60">حدد تواريخ للمهام لتظهر هنا</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <div className="space-y-2 mb-4">
        {currentTasks.length > 0 && tab !== 'completed' && tab !== 'inbox' && (
          <div className="mb-4">
            <ShelfHelp context="tasks" />
          </div>
        )}
        {currentTasks.map((task: any) => {
          const linkedGoal = goals?.find(g => g.id === task.goalId);
          const linkedProject = projects?.find(p => p.id === task.projectId);
          const linkedHabit = habits?.find(h => h.id === task.habitId);
          const linkedArea = lifeAreas?.find((a: any) => a.id === task.areaId);
          const linkedPlan = plans?.find((p: any) => p.id === task.planId);
          const linkedBook = books?.find((b: any) => b.id === task.bookId);

          return (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => handleToggleStatus(task)} className="mt-0.5 shrink-0">
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{task.title}</span>
                      {task.priority && task.priority !== 'medium' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${priorityColor[task.priority]}`}>
                          {priorityLabel[task.priority]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.dueDate && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${
                          new Date(task.dueDate).toDateString() === todayStr
                            ? 'text-blue-500 font-medium'
                            : new Date(task.dueDate) < new Date()
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                      {linkedGoal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                          {linkedGoal.title}
                        </span>
                      )}
                      {linkedProject && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                          {linkedProject.title}
                        </span>
                      )}
                      {linkedArea && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: linkedArea.color || '#3B82F6' }}>
                          {linkedArea.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(task)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate({ id: task.id })}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAB */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setEditingId(null); reset(); } setIsOpen(open); }}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 left-6 rounded-full shadow-lg z-40" size="lg"
            onClick={() => { setEditingId(null); reset(); setValue('status', tab === 'today' ? 'in_progress' : 'pending'); }}>
            <Plus className="w-5 h-5 ml-2" />
            مهمة جديدة
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">العنوان</label>
              <Input {...register('title')} placeholder="أدخل عنوان المهمة" />
            </div>
            <div>
              <label className="text-sm font-medium">الوصف</label>
              <Textarea {...register('description')} placeholder="أدخل وصف المهمة" />
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
                <label className="text-sm font-medium">الحالة</label>
                <select {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="pending">قيد الانتظار</option>
                  <option value="in_progress">قيد الإنجاز</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">تاريخ الاستحقاق</label>
              <DatePicker
                value={watch('dueDate')}
                onChange={(d) => setValue('dueDate', d ? d.toISOString().split('T')[0] : '')}
              />
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <label>نسبة الإنجاز</label>
                <span>{watch('progress') || 0}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" className="w-full" {...register('progress')} />
            </div>
            {editingId && subtasks && subtasks.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <ListChecks className="w-4 h-4" /> المهام الفرعية
                </h4>
                <div className="space-y-1.5">
                  {subtasks.map((st: any) => (
                    <div key={st.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => toggleSubtaskMutation.mutate({ id: st.id, isCompleted: !st.isCompleted })}>
                        {st.isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <span className={st.isCompleted ? 'line-through text-muted-foreground' : ''}>{st.title}</span>
                      <button className="mr-auto" onClick={() => deleteSubtaskMutation.mutate({ id: st.id })}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editingId && (
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="مهمة فرعية جديدة"
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                      e.preventDefault();
                      createSubtaskMutation.mutate({ taskId: editingId, title: newSubtaskTitle.trim() });
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline"
                  disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                  onClick={() => { if (newSubtaskTitle.trim()) createSubtaskMutation.mutate({ taskId: editingId, title: newSubtaskTitle.trim() }); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">ربط المهمة بـ</h4>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">الهدف</label>
                  <select {...register('goalId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا هدف</option>
                    {goals?.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">المشروع</label>
                  <select {...register('projectId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا مشروع</option>
                    {projects?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">العادة</label>
                  <select {...register('habitId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا عادة</option>
                    {habits?.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">منطقة الحياة</label>
                  <select {...register('areaId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا منطقة</option>
                    {lifeAreas?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">الخطة</label>
                  <select {...register('planId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا خطة</option>
                    {plans?.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">الكتاب</label>
                  <select {...register('bookId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="none">بلا كتاب</option>
                    {books?.map((b: any) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
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
  );
}
