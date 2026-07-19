import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import WorkflowBreadcrumb from "@/components/WorkflowBreadcrumb";
import ProgressDisplay from "@/components/ProgressDisplay";
import StatusBadge from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Target, TrendingUp, BarChart3, Brain, Activity, ArrowLeftFromLine } from "lucide-react";
import { useLocation } from "wouter";

export default function Review() {
  const [_, setLocation] = useLocation();

  const { data: review, isLoading } = trpc.dashboard.review.useQuery();
  const { data: healthStatus } = trpc.dashboard.healthStatus.useQuery();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: allTasks } = trpc.tasks.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const todayCompleted = review?.completedTasks || [];
  const todayPending = review?.pendingTasks || [];
  const activeGoals = goals?.filter(g => g.status === 'active') || [];

  const todayTotal = (todayCompleted.length || 0) + (todayPending.length || 0);
  const todayProgress = todayTotal > 0 ? Math.round(((todayCompleted.length || 0) / todayTotal) * 100) : 0;

  const overallScore = healthStatus?.overallScore || 0;
  const scoreColor = overallScore >= 70 ? 'text-green-500' : overallScore >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-6">
        <WorkflowBreadcrumb segments={[{ label: 'المراجعة' }]} />
        <h1 className="text-3xl font-bold text-foreground mt-3 mb-1">المراجعة</h1>
        <p className="text-muted-foreground">راجع يومك، تابع تقدمك، خطط للقادم</p>
      </div>

      {/* Today's Execution Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            ملخص التنفيذ اليومي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
              <p className="text-3xl font-bold text-green-600">{todayCompleted.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">مهام مكتملة</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-center">
              <p className="text-3xl font-bold text-orange-600">{todayPending.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">مهام متبقية</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
              <p className="text-3xl font-bold text-blue-600">{review?.habitsDone || 0}/{review?.totalHabits || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">عادات اليوم</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-center">
              <p className="text-3xl font-bold text-purple-600">{todayProgress}%</p>
              <p className="text-xs text-muted-foreground mt-1">نسبة الإنجاز</p>
            </div>
          </div>

          <ProgressDisplay value={todayProgress} label="تقدم اليوم" className="mb-4" />

          {todayCompleted.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">تم إنجازه</h4>
              <div className="space-y-1">
                {todayCompleted.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50/50 dark:bg-green-950/10">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="line-through text-muted-foreground">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayPending.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">لم يتم إنجازه</h4>
              <div className="space-y-1">
                {todayPending.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/10">
                    <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation('/plan')}>
                <ArrowLeftFromLine className="w-3 h-3 ml-1" />
                إعادة جدولة المهام المتبقية
              </Button>
            </div>
          )}

          {todayCompleted.length === 0 && todayPending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد مهام لليوم</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Goals Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                صحة الأهداف
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeGoals.length > 0 ? (
                <div className="space-y-4">
                  {activeGoals.slice(0, 5).map(goal => {
                    const goalTasks = allTasks?.filter(t => t.goalId === goal.id) || [];
                    const goalProgress = goalTasks.length > 0
                      ? Math.round((goalTasks.filter(t => t.status === 'completed').length / goalTasks.length) * 100)
                      : goal.progress || 0;
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{goal.title}</span>
                          <StatusBadge status={goalProgress >= 100 ? 'completed' : goalProgress >= 50 ? 'active' : 'pending'} />
                          <span className="text-muted-foreground font-mono">{goalProgress}%</span>
                        </div>
                        <ProgressDisplay value={goalProgress} label={goal.title} />
                        {goal.targetDate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} يوم متبقي
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أهداف نشطة</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Health Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4" />
                حالة النظام الصحية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-1 ${scoreColor}`}>
                  {overallScore}
                </div>
                <p className="text-xs text-muted-foreground">من 100</p>
                <ProgressDisplay value={overallScore} label="النتيجة العامة" />
                {healthStatus && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">المهام</span>
                      <span className="font-mono">{healthStatus.taskCompletionRate || '0%'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">الأهداف</span>
                      <span className="font-mono">{healthStatus.goalProgress || '0%'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">سلسلة العادات</span>
                      <span className="font-mono">{healthStatus.habitStreak || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                ملخص الإحصائيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي المهام</span>
                  <span className="font-medium">{stats?.tasks.total || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المهام المكتملة</span>
                  <span className="font-medium text-green-600">{stats?.tasks.completed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الأهداف النشطة</span>
                  <span className="font-medium">{stats?.goals.active || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المشاريع الجارية</span>
                  <span className="font-medium">{stats?.projects.inProgress || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">العادات اليوم</span>
                  <span className="font-medium text-orange-500">{review?.habitsDone || 0}/{review?.totalHabits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الكتب المقروءة</span>
                  <span className="font-medium">{stats?.books.completed || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setLocation('/')}>
                <TrendingUp className="w-4 h-4 ml-2" />
                لوحة التحكم
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setLocation('/plan')}>
                <Clock className="w-4 h-4 ml-2" />
                التخطيط لليوم القادم
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setLocation('/statistics')}>
                <BarChart3 className="w-4 h-4 ml-2" />
                إحصائيات مفصلة
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
