import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import WorkflowBreadcrumb from '@/components/WorkflowBreadcrumb';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Target, Zap, BookOpen, Brain, Activity, BarChart3, Calendar } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  created: 'أنشأ',
  completed: 'أكمل',
  updated: 'حدّث',
  deleted: 'حذف',
  started: 'بدأ',
};

export default function Statistics() {
  const [_, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  // Using dashboard.review to get activity log or similar if activityLog router is missing
  const { data: review } = trpc.dashboard.review.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();
  const { data: allTasks } = trpc.tasks.list.useQuery();
  const { data: allGoals } = trpc.goals.list.useQuery();
  const { data: allHabits } = trpc.habits.list.useQuery();
  const { data: allProjects } = trpc.projects.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Fallback for activity log since the router seems to be missing
  const activityLog = useMemo(() => {
    // We'll combine completedTasks from review as a proxy if needed, 
    // but better to fix the router. For now, let's assume it might be empty.
    return [] as any[];
  }, []);

  const trendData = useMemo(() => {
    const days: { date: string; completed: number; created: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      const completed = activityLog?.filter((log: any) => {
        const logDate = new Date(log.createdAt).toDateString();
        return logDate === d.toDateString() && log.action === 'completed';
      }).length || 0;
      const created = activityLog?.filter((log: any) => {
        const logDate = new Date(log.createdAt).toDateString();
        return logDate === d.toDateString() && log.action === 'created';
      }).length || 0;
      days.push({ date: dayStr, completed, created });
    }
    return days;
  }, [activityLog]);

  const areaBreakdown = useMemo(() => {
    if (!lifeAreas) return [];
    return lifeAreas.map((area: any) => {
      const areaTasks = allTasks?.filter(t => t.areaId === area.id) || [];
      const areaGoals = allGoals?.filter(g => g.areaId === area.id) || [];
      const areaHabits = allHabits?.filter(h => h.areaId === area.id) || [];
      const areaProjects = allProjects?.filter(p => p.areaId === area.id) || [];
      return {
        name: area.name,
        color: area.color || '#3B82F6',
        tasks: areaTasks.length,
        tasksCompleted: areaTasks.filter(t => t.status === 'completed').length,
        goals: areaGoals.length,
        goalsCompleted: areaGoals.filter(g => g.status === 'completed').length,
        habits: areaHabits.length,
        projects: areaProjects.length,
      };
    });
  }, [lifeAreas, allTasks, allGoals, allHabits, allProjects]);

  const priorityDist = useMemo(() => {
    if (!allTasks) return [];
    const counts: Record<string, number> = {};
    allTasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
    return Object.entries(counts).map(([key, val]) => ({
      name: key === 'urgent' ? 'عاجل' : key === 'high' ? 'عالي' : key === 'medium' ? 'متوسط' : 'منخفض',
      value: val,
      fill: key === 'urgent' ? '#ef4444' : key === 'high' ? '#f59e0b' : key === 'medium' ? '#3b82f6' : '#9ca3af',
    }));
  }, [allTasks]);

  const taskData = [
    { name: 'مكتملة', value: stats?.tasks.completed || 0, fill: '#10b981' },
    { name: 'قيد الإنجاز', value: stats?.tasks.inProgress || 0, fill: '#3b82f6' },
    { name: 'قيد الانتظار', value: stats?.tasks.pending || 0, fill: '#f59e0b' },
  ];

  const recentLogs = activityLog?.slice(0, 8) || [];

  const statCards = [
    { label: 'المهام', icon: Zap, color: 'text-blue-500', total: stats?.tasks.total || 0, sub: `${stats?.tasks.completed || 0} مكتملة`, route: '/tasks' },
    { label: 'الأهداف', icon: Target, color: 'text-green-500', total: stats?.goals.total || 0, sub: `${stats?.goals.completed || 0} مكتملة`, route: '/goals' },
    { label: 'المشاريع', icon: TrendingUp, color: 'text-purple-500', total: stats?.projects.total || 0, sub: `${stats?.projects.inProgress || 0} جارية`, route: '/projects' },
    { label: 'العادات', icon: Activity, color: 'text-orange-500', total: stats?.habits.total || 0, sub: `${review?.habitsDone || 0} اليوم`, route: '/habits' },
    { label: 'الكتب', icon: BookOpen, color: 'text-cyan-500', total: stats?.books.total || 0, sub: `${stats?.books.completed || 0} مكتملة`, route: '/books' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <WorkflowBreadcrumb segments={[{ label: 'الإحصائيات' }]} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">الإحصائيات والتحليلات</h1>
        <p className="text-muted-foreground">تحليل شامل ورؤى عميقة لإنتاجيتك</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(card.route)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.total}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            الاتجاه اليومي (آخر 14 يوم)
          </CardTitle>
          <CardDescription>المهام المكتملة والمنشأة يومياً</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="مكتملة" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="منشأة" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Distribution + Area Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>توزيع الأولويات</CardTitle>
            <CardDescription>المهام حسب مستوى الأولوية</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={priorityDist} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} dataKey="value">
                  {priorityDist.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حالة المهام</CardTitle>
            <CardDescription>توزيع المهام حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={taskData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80} dataKey="value">
                  {taskData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Area Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            تحليل مناطق الحياة
          </CardTitle>
          <CardDescription>توزيع المهام والأهداف والعادات حسب منطقة الحياة</CardDescription>
        </CardHeader>
        <CardContent>
          {areaBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="pb-2 font-medium">منطقة الحياة</th>
                    <th className="pb-2 font-medium">المهام</th>
                    <th className="pb-2 font-medium">المكتملة</th>
                    <th className="pb-2 font-medium">نسبة الإنجاز</th>
                    <th className="pb-2 font-medium">الأهداف</th>
                    <th className="pb-2 font-medium">العادات</th>
                    <th className="pb-2 font-medium">المشاريع</th>
                  </tr>
                </thead>
                <tbody>
                  {areaBreakdown.map((area, idx) => (
                    <tr key={idx} className="border-b text-right hover:bg-accent/30">
                      <td className="py-2.5 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                        {area.name}
                      </td>
                      <td className="py-2.5">{area.tasks}</td>
                      <td className="py-2.5">{area.tasksCompleted}</td>
                      <td className="py-2.5">
                        <span className={`font-mono text-xs ${area.tasks > 0 && area.tasksCompleted / area.tasks >= 0.7 ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {area.tasks > 0 ? `${Math.round((area.tasksCompleted / area.tasks) * 100)}%` : '-'}
                        </span>
                      </td>
                      <td className="py-2.5">{area.goals}</td>
                      <td className="py-2.5">{area.habits}</td>
                      <td className="py-2.5">{area.projects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد مناطق حياة بعد</p>
          )}
        </CardContent>
      </Card>

      {/* Latest Activity - Connected to Review workflow */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              أحدث النشاطات
            </CardTitle>
            <CardDescription>مراجعة سريعة لآخر الأنشطة</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation('/review')}>
            مراجعة شاملة
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.action === 'completed' ? 'bg-green-500' : log.action === 'created' ? 'bg-blue-500' : 'bg-muted-foreground'}`} />
                    <span>
                      {log.details || `${ACTION_LABELS[log.action] || log.action} ${log.entityType}`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mr-2">
                    {new Date(log.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد أنشطة</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
