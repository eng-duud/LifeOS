import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2, Circle, Clock, Flame, ListPlus, Target, Zap,
  Sparkles, Sunrise, Moon, ArrowRightFromLine, Plus, Brain,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PriorityBadge from '@/components/PriorityBadge';
import WorkflowBreadcrumb from '@/components/WorkflowBreadcrumb';

const taskSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
});

export default function Today() {
  const [_, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [quickTask, setQuickTask] = useState('');

  const utils = trpc.useUtils();
  const { data: todayData, isLoading } = trpc.dashboard.today.useQuery();
  const { data: overdue } = trpc.tasks.overdue.useQuery();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: healthStatus } = trpc.dashboard.healthStatus.useQuery();

  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.dashboard.today.invalidate();
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم إضافة المهمة');
      setIsOpen(false);
      setQuickTask('');
      reset();
    },
  });

  const completeHabit = trpc.habits.complete.useMutation({
    onSuccess: () => {
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم تسجيل الإنجاز!');
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const todayTasks = todayData?.tasks || [];
  const todayHabits = todayData?.habits || [];
  const overdueTasks = overdue || [];

  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const greeting = isMorning ? 'صباح الخير' : 'مساء الخير';

  const sortByPriority = (a: any, b: any) => {
    const pw: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (pw[b.priority || 'medium'] || 0) - (pw[a.priority || 'medium'] || 0);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <WorkflowBreadcrumb segments={[{ label: 'التنفيذ', path: '/dashboard' }, { label: 'اليوم' }]} />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">{greeting}</h1>
          <p className="text-muted-foreground">
            {isMorning ? 'ابدأ يومك بتركيز. إليك أولوياتك اليوم.' : 'راجع ما أنجزته اليوم واستعد للغد.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-green-600">{todayTasks.filter((t: any) => t.status === 'completed').length}</span>
            /{todayTasks.length} مهام مكتملة
          </div>
        </div>
      </div>

      {/* Quick Add + Overdue Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">إضافة سريعة</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (quickTask.trim()) createTask.mutate({ title: quickTask.trim() }); }} className="flex gap-2">
              <Input
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                placeholder="مهمة جديدة لليوم..."
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!quickTask.trim() || createTask.isPending}>
                إضافة
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={overdueTasks.length > 0 ? 'border-red-200/50' : ''} onClick={() => setLocation('/plan')}>
          <CardContent className="p-4 flex items-center gap-3 cursor-pointer">
            <div className="flex-1">
              <p className="text-sm font-medium">المهام المتأخرة</p>
              <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {overdueTasks.length > 0 ? `${overdueTasks.length} مهام` : '✨ لا توجد'}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRightFromLine className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Tasks + Habits side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  مهام اليوم
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{todayTasks.length}</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  إضافة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {todayTasks.length > 0 ? (
                todayTasks.sort(sortByPriority).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors group">
                    <button onClick={() => toggleTask.mutate({ id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' })}>
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    {task.goalId && (
                      <Target className="w-3 h-3 text-green-500" />
                    )}
                    {task.projectId && (
                      <Zap className="w-3 h-3 text-purple-500" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">لا توجد مهام لليوم</p>
                  <p className="text-xs text-muted-foreground mb-4">أضف مهاماً أو اسحبها من التخطيط</p>
                  <Button size="sm" onClick={() => setIsOpen(true)}>
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    إضافة مهمة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus Section */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">التركيز الآن</span>
              </div>
              <p className="text-xs text-muted-foreground">ركز على المهام ذات الأولوية العالية والعاجلة أولاً</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setLocation('/plan')}>
                  فتح التخطيط
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLocation('/review')}>
                  المراجعة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habits + Stats Column */}
        <div className="space-y-4">
          {/* Habits Today */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  العادات اليوم
                </CardTitle>
                <span className="text-xs text-muted-foreground">{todayHabits.filter((h: any) => new Date(h.lastCompletedAt || '').toDateString() === new Date().toDateString()).length}/{todayHabits.length}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {todayHabits.length > 0 ? (
                todayHabits.map((habit: any) => {
                  const completedToday = habit.lastCompletedAt && new Date(habit.lastCompletedAt).toDateString() === new Date().toDateString();
                  return (
                    <div key={habit.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-accent/50">
                      <button
                        onClick={() => completeHabit.mutate({ id: habit.id })}
                        disabled={completedToday || completeHabit.isPending}
                        className="shrink-0"
                      >
                        {completedToday ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <span className={`flex-1 ${completedToday ? 'line-through text-muted-foreground' : ''}`}>
                        {habit.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{habit.currentStreak}🔥</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد عادات بعد</p>
              )}
              <Button variant="link" size="sm" className="w-full text-xs" onClick={() => setLocation('/habits')}>
                إدارة العادات
                <ArrowRightFromLine className="w-3 h-3 mr-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Today's Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{todayTasks.filter((t: any) => t.status === 'completed').length}</p>
                  <p className="text-[10px] text-muted-foreground">مكتمل اليوم</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{todayTasks.filter((t: any) => t.status === 'in_progress').length}</p>
                  <p className="text-[10px] text-muted-foreground">قيد العمل</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats?.habits.completedToday || 0}</p>
                  <p className="text-[10px] text-muted-foreground">عادات اليوم</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats?.goals.active || 0}</p>
                  <p className="text-[10px] text-muted-foreground">أهداف نشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Progress */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">تدفق العمل</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="flex-1">التنفيذ</span>
                  <span className="text-xs text-muted-foreground">اليوم</span>
                </div>
                <div className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary" onClick={() => setLocation('/review')}>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="flex-1">المراجعة</span>
                  <span className="text-xs text-muted-foreground">{todayTasks.filter((t: any) => t.status === 'completed').length > 0 ? 'جاهزة' : 'انتظار'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary" onClick={() => setLocation('/statistics')}>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="flex-1">الإحصائيات</span>
                  <span className="text-xs text-muted-foreground">التحليلات</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة مهمة لليوم</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => {
            createTask.mutate({
              title: data.title,
              description: data.description || undefined,
              priority: data.priority || 'medium',
              dueDate: new Date(),
            });
          })} className="space-y-4">
            <div>
              <label className="text-sm font-medium">العنوان</label>
              <Input {...register('title')} placeholder="أدخل عنوان المهمة" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium">الوصف</label>
              <Textarea {...register('description')} placeholder="وصف المهمة" />
            </div>
            <div>
              <label className="text-sm font-medium">الأولوية</label>
              <select {...register('priority')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={createTask.isPending}>
              إضافة إلى اليوم
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
