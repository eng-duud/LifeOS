import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2, AlertCircle, TrendingUp, Clock, Flame, AlertTriangle,
  ArrowRight, Circle, ListPlus, Target, Zap, Brain, Activity, BarChart3,
  ArrowLeftFromLine, Sparkles, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { GuidedPrompts } from '@/components/ShelfHelp';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import EntityCard from '@/components/EntityCard';
import QuickAdd from '@/components/QuickAdd';

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const [quickTask, setQuickTask] = useState('');

  const { data: todayData, isLoading } = trpc.dashboard.today.useQuery();
  const { data: overdue } = trpc.tasks.overdue.useQuery();
  const { data: inbox } = trpc.tasks.inbox.useQuery();
  const { data: blocked } = trpc.tasks.blocked.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: healthStatus } = trpc.dashboard.healthStatus.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const utils = trpc.useUtils();

  const completeHabit = trpc.habits.complete.useMutation({
    onSuccess: () => {
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم تسجيل الإنجاز!');
    },
  });

  const createQuickTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.inbox.invalidate();
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
      toast.success('تم إضافة المهمة');
      setQuickTask('');
    },
  });

  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.dashboard.today.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
    },
  });

  const todayTasks = todayData?.tasks || [];
  const todayHabits = todayData?.habits || [];
  const overdueTasks = overdue || [];
  const inboxTasks = inbox || [];

  const atRiskGoals = goals?.filter(g => {
    if (g.status !== 'active') return false;
    if (!g.targetDate) return false;
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && (g.progress || 0) < 50;
  }) || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';

  const sortByPriority = (a: any, b: any) => {
    const pw: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (pw[b.priority || 'medium'] || 0) - (pw[a.priority || 'medium'] || 0);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">مركز القيادة</h1>
        <p className="text-muted-foreground">
          {todayTasks.length > 0
            ? `${greeting} 👋 لديك ${todayTasks.length} مهمة لليوم`
            : `${greeting} 👋 يوم جديد - ابدأ بتخطيط يومك`}
        </p>
      </div>

      <GuidedPrompts />

      {/* Health Bar + Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="lg:col-span-2 border-l-4"
          style={{ borderLeftColor: (healthStatus?.overallScore || 0) >= 70 ? '#22c55e' : (healthStatus?.overallScore || 0) >= 40 ? '#eab308' : '#ef4444' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">نقاط الصحة</span>
              </div>
              <span className="text-2xl font-bold font-mono">{healthStatus?.overallScore || 0}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${(healthStatus?.overallScore || 0) >= 70 ? 'bg-green-500' : (healthStatus?.overallScore || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${healthStatus?.overallScore || 0}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>المهام: {stats?.tasks.completed || 0}/{stats?.tasks.total || 0}</span>
              <span>العادات: {stats?.habits.completedToday || 0}/{stats?.habits.total || 0}</span>
              <span>الأهداف النشطة: {stats?.goals.active || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation('/tasks')} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ListPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المهام</p>
              <p className="text-xl font-bold">{stats?.tasks.total || 0}</p>
              <p className="text-[10px] text-green-600">{stats?.tasks.completed || 0} مكتملة</p>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setLocation('/habits')} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">العادات</p>
              <p className="text-xl font-bold">{stats?.habits.completedToday || 0}/{stats?.habits.total || 0}</p>
              <p className="text-[10px] text-orange-600">{stats?.habits.completedToday || 0}🔥 اليوم</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Capture */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                إضافة سريعة
              </CardTitle>
              <CardDescription>أضف فكرة إلى صندوق الوارد لتنظيمها لاحقاً</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); if (quickTask.trim()) createQuickTask.mutate({ title: quickTask.trim() }); }} className="flex gap-2">
                <input
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  placeholder="اكتب مهمة سريعة..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
                />
                <Button type="submit" size="sm" disabled={!quickTask.trim() || createQuickTask.isPending}>
                  إضافة
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Workflow Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <EntityCard
              icon={<Target className="w-5 h-5 text-green-600" />}
              title="الأهداف"
              subtitle={stats?.goals.active ? `${stats.goals.active} أهداف نشطة` : 'ابدأ بهدف جديد'}
              onClick={() => setLocation('/goals')}
            />
            <EntityCard
              icon={<Zap className="w-5 h-5 text-purple-600" />}
              title="المشاريع"
              subtitle={stats?.projects.inProgress ? `${stats.projects.inProgress} مشاريع جارية` : 'أنشئ مشروعاً'}
              onClick={() => setLocation('/projects')}
            />
            <EntityCard
              icon={<Layers className="w-5 h-5 text-indigo-600" />}
              title="مناطق الحياة"
              subtitle={`${lifeAreas?.length || 0} مناطق`}
              onClick={() => setLocation('/life-areas')}
            />
          </div>

          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                مهام اليوم
                {todayTasks.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40">{todayTasks.length}</span>
                )}
              </CardTitle>
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
                    {task.estimatedHours && (
                      <span className="text-[10px] text-muted-foreground font-mono">{task.estimatedHours}h</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">يوم هادئ! لا توجد مهام لليوم</p>
                  <p className="text-xs text-muted-foreground mb-3">خطط ليومك من صفحة التخطيط</p>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/plan')}>
                    <ArrowRight className="w-3 h-3 ml-1" />
                    فتح التخطيط
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Status Panels */}
        <div className="space-y-4">
          {/* Overdue */}
          <Card className={overdueTasks.length > 0 ? 'border-red-200/50 dark:border-red-800/30' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                متأخرة
                {overdueTasks.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40">{overdueTasks.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueTasks.length > 0 ? (
                <div className="space-y-1">
                  {overdueTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-red-50/50 dark:bg-red-950/10">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate flex-1">{task.title}</span>
                      <span className="text-[10px] text-red-500 shrink-0">
                        {task.dueDate ? Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}ي
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">✨ لا توجد مهام متأخرة</p>
              )}
            </CardContent>
          </Card>

          {/* Inbox */}
          {inboxTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-yellow-500" />
                  صندوق الوارد
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{inboxTasks.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {inboxTasks.slice(0, 4).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-accent/50">
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{task.title}</span>
                    </div>
                  ))}
                  {inboxTasks.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{inboxTasks.length - 4} أخرى</p>
                  )}
                </div>
                <Button variant="link" size="sm" className="w-full mt-1 text-xs" onClick={() => setLocation('/tasks')}>
                  إدارة صندوق الوارد
                  <ArrowLeftFromLine className="w-3 h-3 mr-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Habits Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                العادات اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayHabits.length > 0 ? (
                <div className="space-y-1">
                  {todayHabits.slice(0, 4).map((habit: any) => (
                    <div key={habit.id} className="flex items-center gap-2 text-sm">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                        disabled={completeHabit.isPending}
                        onClick={() => completeHabit.mutate({ id: habit.id })}>
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                        إنجاز
                      </Button>
                      <span className="truncate flex-1">{habit.title}</span>
                      <span className="text-[10px] text-muted-foreground">{habit.currentStreak}🔥</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">🎉 تم إنجاز جميع العادات</p>
              )}
            </CardContent>
          </Card>

          {/* At-Risk Goals */}
          {atRiskGoals.length > 0 && (
            <Card className="border-yellow-200/50 dark:border-yellow-800/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-yellow-500" />
                  أهداف في خطر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {atRiskGoals.slice(0, 3).map(goal => (
                    <div key={goal.id} className="text-sm p-2 rounded-md bg-yellow-50/50 dark:bg-yellow-950/10">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium truncate">{goal.title}</span>
                        <span className="text-[10px] text-yellow-600">
                          {Math.ceil((new Date(goal.targetDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} يوم
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${goal.progress || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" size="sm" className="w-full mt-1 text-xs" onClick={() => setLocation('/goals')}>
                  عرض الأهداف
                  <ArrowLeftFromLine className="w-3 h-3 mr-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div onClick={() => setLocation('/tasks')} className="cursor-pointer">
                  <p className="text-2xl font-bold text-green-600">{stats?.tasks.completed || 0}</p>
                  <p className="text-[10px] text-muted-foreground">مهام مكتملة</p>
                </div>
                <div onClick={() => setLocation('/goals')} className="cursor-pointer">
                  <p className="text-2xl font-bold text-blue-600">{stats?.goals.active || 0}</p>
                  <p className="text-[10px] text-muted-foreground">أهداف نشطة</p>
                </div>
                <div onClick={() => setLocation('/habits')} className="cursor-pointer">
                  <p className="text-2xl font-bold text-orange-600">{stats?.habits.completedToday || 0}</p>
                  <p className="text-[10px] text-muted-foreground">عادات اليوم</p>
                </div>
                <div onClick={() => setLocation('/review')} className="cursor-pointer">
                  <p className="text-2xl font-bold text-purple-600">{stats?.projects.inProgress || 0}</p>
                  <p className="text-[10px] text-muted-foreground">مشاريع جارية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
