import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import WorkflowBreadcrumb from "@/components/WorkflowBreadcrumb";
import { Calendar, CalendarDays, List, Clock, Plus, ArrowLeftFromLine } from "lucide-react";

type ViewMode = 'daily' | 'weekly' | 'monthly';

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-600 bg-red-50 dark:bg-red-950/20',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
  medium: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  low: 'text-gray-500 bg-gray-50 dark:bg-gray-900/20',
};
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'عاجل',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const WEEKDAY_NAMES_SAT_START = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function startOfWeekSat(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimeSlot(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'ص' : 'م';
  return `${h}:00 ${suffix}`;
}

export default function Plan() {
  const [_, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const utils = trpc.useUtils();

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم تحديث المهمة');
    },
  });

  const today = useMemo(() => startOfDay(new Date()), []);

  const activeTasks = useMemo(
    () =>
      (tasks || []).filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled'
      ),
    [tasks]
  );

  const unscheduledTasks = useMemo(
    () => activeTasks.filter((t) => !t.dueDate && !t.planId),
    [activeTasks]
  );

  const overdueTasks = useMemo(
    () =>
      activeTasks.filter((t) => {
        if (!t.dueDate) return false;
        return startOfDay(new Date(t.dueDate)) < today;
      }),
    [activeTasks, today]
  );

  const getTasksForDay = (date: Date) => {
    return activeTasks
      .filter((t) => t.dueDate && sameDay(new Date(t.dueDate), date))
      .sort((a, b) => (PRIORITY_WEIGHT[b.priority || 'medium'] || 0) - (PRIORITY_WEIGHT[a.priority || 'medium'] || 0));
  };

  const scheduleForToday = (taskId: number) => {
    updateTask.mutate({ id: taskId, dueDate: today });
  };

  const moveToToday = (taskId: number) => {
    updateTask.mutate({ id: taskId, dueDate: today });
  };

  const viewTabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'daily', label: 'يومي', icon: <List className="w-3.5 h-3.5" /> },
    { key: 'weekly', label: 'أسبوعي', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: 'monthly', label: 'شهري', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <WorkflowBreadcrumb segments={[{ label: 'التخطيط' }]} />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-foreground mb-1">التخطيط</h1>
        <p className="text-muted-foreground">وزع مهامك على أيامك</p>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {viewTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {viewMode === 'weekly' && (
            <WeeklyView
              tasks={activeTasks}
              getTasksForDay={getTasksForDay}
              today={today}
              unscheduledTasks={unscheduledTasks}
              onSchedule={(taskId: string, date) => updateTask.mutate({ id: Number(taskId), dueDate: date })}
            />
          )}

          {viewMode === 'daily' && (
            <DailyView
              date={selectedDay}
              tasks={activeTasks}
              getTasksForDay={getTasksForDay}
              onPrevDay={() => {
                const d = new Date(selectedDay);
                d.setDate(d.getDate() - 1);
                setSelectedDay(startOfDay(d));
              }}
              onNextDay={() => {
                const d = new Date(selectedDay);
                d.setDate(d.getDate() + 1);
                setSelectedDay(startOfDay(d));
              }}
              onToday={() => setSelectedDay(today)}
            />
          )}

          {viewMode === 'monthly' && (
            <MonthlyView
              month={selectedDay}
              tasks={activeTasks}
              today={today}
              onSelectDay={(date) => {
                setSelectedDay(date);
                setViewMode('daily');
              }}
              onPrevMonth={() => {
                const d = new Date(selectedDay);
                d.setMonth(d.getMonth() - 1);
                setSelectedDay(startOfDay(d));
              }}
              onNextMonth={() => {
                const d = new Date(selectedDay);
                d.setMonth(d.getMonth() + 1);
                setSelectedDay(startOfDay(d));
              }}
            />
          )}

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="mt-4 border-red-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  مهام متأخرة ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {overdueTasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg bg-red-50/50 dark:bg-red-950/10"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority || 'medium']}`} />
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-[10px] text-red-400 whitespace-nowrap">
                        {new Date(task.dueDate!).toLocaleDateString('ar-SA')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => moveToToday(task.id)}
                      >
                        <ArrowLeftFromLine className="w-3 h-3" />
                        نقل إلى اليوم
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Unscheduled Tasks */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                مهام غير مجدولة
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{unscheduledTasks.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unscheduledTasks.length > 0 ? (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {unscheduledTasks.map((task) => {
                    const linkedProject = projects?.find((p) => p.id === task.projectId);
                    const linkedGoal = goals?.find((g) => g.id === task.goalId);
                    return (
                      <div key={task.id} className="p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority || 'medium']}`} />
                          <span className="text-xs font-medium flex-1 truncate">{task.title}</span>
                          {task.priority && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority]}`}>
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {linkedProject && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-950/30">
                              {linkedProject.title}
                            </span>
                          )}
                          {linkedGoal && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                              {linkedGoal.title}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1.5 h-6 text-[10px] gap-1 text-primary hover:text-primary"
                          onClick={() => scheduleForToday(task.id)}
                        >
                          <Plus className="w-3 h-3" />
                          جدولة لليوم
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">جميع المهام مجدولة</p>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setLocation('/tasks')}>
                إدارة المهام
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WeeklyView({
  tasks,
  getTasksForDay,
  today,
  unscheduledTasks,
  onSchedule,
}: {
  tasks: any[];
  getTasksForDay: (date: Date) => any[];
  today: Date;
  unscheduledTasks: any[];
  onSchedule: (taskId: string, date: Date) => void;
}) {
  const weekStart = startOfWeekSat(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {weekDays.map((date, i) => {
        const dayTasks = getTasksForDay(date);
        const isToday = sameDay(date, today);
        const isPast = startOfDay(date) < today;

        return (
          <Card
            key={i}
            className={`${isToday ? 'ring-2 ring-primary' : ''} ${isPast && !isToday ? 'opacity-50' : ''}`}
          >
            <CardHeader className={`p-3 pb-2 ${isToday ? 'bg-primary/5' : ''}`}>
              <CardTitle className="text-xs text-center">
                <span className="block text-muted-foreground">
                  {WEEKDAY_NAMES_SAT_START[date.getDay() === 6 ? 0 : (date.getDay() + 1) % 7]}
                </span>
                <span className="block text-lg font-bold mt-1">{date.getDate()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 min-h-[100px]">
              {dayTasks.length > 0 ? (
                dayTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-1 p-1 rounded text-[10px] hover:bg-accent/50 cursor-pointer"
                    onClick={() => onSchedule(task.id, date)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority || 'medium']}`} />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))
              ) : (
                <div
                  className="h-full min-h-[60px] border-2 border-dashed border-muted rounded-md flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    if (unscheduledTasks.length > 0) {
                      onSchedule(unscheduledTasks[0].id, date);
                    }
                  }}
                >
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
              {dayTasks.length > 5 && (
                <p className="text-[9px] text-muted-foreground text-center">+{dayTasks.length - 5}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DailyView({
  date,
  tasks,
  getTasksForDay,
  onPrevDay,
  onNextDay,
  onToday,
}: {
  date: Date;
  tasks: any[];
  getTasksForDay: (date: Date) => any[];
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}) {
  const dayTasks = getTasksForDay(date);
  const isToday = sameDay(date, new Date());

  const tasksWithTime = dayTasks.filter((t: any) => t.dueDate && new Date(t.dueDate).getHours() > 0);
  const tasksWithoutTime = dayTasks.filter((t: any) => !t.dueDate || new Date(t.dueDate).getHours() === 0);

  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6);

  return (
    <div>
      {/* Day Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onPrevDay}>
          <ArrowLeftFromLine className="w-4 h-4 rotate-180" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold">
            {date.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {!isToday && (
            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={onToday}>
              العودة لليوم
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onNextDay}>
          <ArrowLeftFromLine className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks by Priority */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <List className="w-4 h-4" />
            المهام ({dayTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayTasks.length > 0 ? (
            <div className="space-y-2">
              {['urgent', 'high', 'medium', 'low'].map((priority) => {
                const group = dayTasks.filter((t: any) => (t.priority || 'medium') === priority);
                if (group.length === 0) return null;
                return (
                  <div key={priority}>
                    <p className={`text-[10px] font-medium mb-1 ${PRIORITY_COLOR[priority].split(' ')[0]}`}>
                      {PRIORITY_LABEL[priority]} ({group.length})
                    </p>
                    <div className="space-y-1">
                      {group.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50"
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority]}`} />
                          <span className="text-sm flex-1">{task.title}</span>
                          {task.dueDate && new Date(task.dueDate).getHours() > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatTimeSlot(new Date(task.dueDate).getHours())}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد مهام في هذا اليوم</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            خارطة اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {timeSlots.map((hour) => {
              const slotTask = tasksWithTime.find(
                (t: any) => t.dueDate && new Date(t.dueDate).getHours() === hour
              );
              return (
                <div key={hour} className="flex items-start gap-2 py-1.5 border-b border-muted/50 last:border-0">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0 text-left">
                    {formatTimeSlot(hour)}
                  </span>
                  <div className="flex-1 min-h-[24px]">
                    {slotTask && (
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${PRIORITY_COLOR[slotTask.priority || 'medium']}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[slotTask.priority || 'medium']}`} />
                        {slotTask.title}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyView({
  month,
  tasks,
  today,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  month: Date;
  tasks: any[];
  today: Date;
  onSelectDay: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const daysInMonth = lastDay.getDate();

  const firstDayOfWeek = firstDay.getDay();
  const startOffset = (firstDayOfWeek + 1) % 7;

  const taskCountByDay = useMemo(() => {
    const map: Record<number, number> = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === monthIdx) {
        map[d.getDate()] = (map[d.getDate()] || 0) + 1;
      }
    });
    return map;
  }, [tasks, year, monthIdx]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onPrevMonth}>
          <ArrowLeftFromLine className="w-4 h-4 rotate-180" />
        </Button>
        <h2 className="text-lg font-bold">{MONTH_NAMES_AR[monthIdx]} {year}</h2>
        <Button variant="ghost" size="sm" onClick={onNextMonth}>
          <ArrowLeftFromLine className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_NAMES_SAT_START.map((name) => (
              <div key={name} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;

              const cellDate = new Date(year, monthIdx, day);
              const isToday = sameDay(cellDate, today);
              const count = taskCountByDay[day] || 0;

              return (
                <button
                  key={day}
                  onClick={() => onSelectDay(cellDate)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors hover:bg-accent/50 ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                  }`}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 4) }, (_, j) => (
                        <span
                          key={j}
                          className={`w-1 h-1 rounded-full ${isToday ? 'bg-primary-foreground/60' : 'bg-primary'}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
