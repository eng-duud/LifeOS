import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle2, Target, Calendar as CalendarIcon, ClipboardList } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: plans } = trpc.plans.list.useQuery();

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const events = {
      tasks: tasks?.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        const tStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return tStr === dateStr;
      }) || [],
      habits: habits?.filter(h => {
        if (!h.lastCompletedAt) return false;
        const d = new Date(h.lastCompletedAt);
        const hStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return hStr === dateStr;
      }) || [],
      plans: plans?.filter(p => {
        const sd = new Date(p.startDate);
        const startStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
        let endStr = startStr;
        if (p.endDate) {
          const ed = new Date(p.endDate);
          endStr = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`;
        }
        return dateStr >= startStr && dateStr <= endStr;
      }) || [],
    };
    return events;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  // Events for the selected date
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : null;
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const priorityLabels: Record<string, string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    urgent: 'عاجل',
  };

  const statusLabels: Record<string, string> = {
    pending: 'معلقة',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">التقويم</h1>
        <p className="text-muted-foreground">عرض المهام والعادات والخطط — انقر على أي يوم لعرض التفاصيل</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>{monthName}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs"
            >
              اليوم
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const events = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const hasEvents = events.tasks.length > 0 || events.habits.length > 0 || events.plans.length > 0;

              return (
                <div
                  key={date.toISOString()}
                  className={`aspect-square p-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  } ${hasEvents ? 'hover:scale-[1.02]' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="text-sm font-semibold mb-1">{date.getDate()}</div>
                  <div className="space-y-1 text-xs">
                    {events.tasks.length > 0 && (
                      <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded truncate">
                        {events.tasks.length} مهمة
                      </div>
                    )}
                    {events.habits.length > 0 && (
                      <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1 py-0.5 rounded truncate">
                        {events.habits.length} عادة
                      </div>
                    )}
                    {events.plans.length > 0 && (
                      <div className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded truncate">
                        {events.plans.length} خطة
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {selectedDateLabel}
            </DialogTitle>
          </DialogHeader>

          {selectedEvents && (
            <div className="space-y-5">
              {/* Tasks Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  المهام ({selectedEvents.tasks.length})
                </h3>
                {selectedEvents.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.tasks.map(task => (
                      <div key={task.id} className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {statusLabels[task.status || 'pending']}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                          {task.priority && <span>الأولوية: {priorityLabels[task.priority]}</span>}
                          {task.progress !== undefined && task.progress !== null && <span>التقدم: {task.progress}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pr-6">لا توجد مهام في هذا اليوم</p>
                )}
              </div>

              {/* Habits Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-500" />
                  العادات المُنجزة ({selectedEvents.habits.length})
                </h3>
                {selectedEvents.habits.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.habits.map(habit => (
                      <div key={habit.id} className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200/30">
                        <p className="font-medium text-sm">{habit.title}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          {habit.frequency && <span>التكرار: {habit.frequency === 'daily' ? 'يومي' : habit.frequency === 'weekly' ? 'أسبوعي' : 'شهري'}</span>}
                          <span>السلسلة: {habit.currentStreak} يوم 🔥</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pr-6">لم يتم إنجاز أي عادة في هذا اليوم</p>
                )}
              </div>

              {/* Plans Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-purple-500" />
                  الخطط ({selectedEvents.plans.length})
                </h3>
                {selectedEvents.plans.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.plans.map(plan => (
                      <div key={plan.id} className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/10 border border-purple-200/30">
                        <p className="font-medium text-sm">{plan.title}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>النوع: {plan.planType === 'daily' ? 'يومية' : plan.planType === 'weekly' ? 'أسبوعية' : 'شهرية'}</span>
                          <span>الحالة: {plan.status === 'active' ? 'نشطة' : plan.status === 'completed' ? 'مكتملة' : plan.status === 'draft' ? 'مسودة' : 'ملغاة'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pr-6">لا توجد خطط في هذا اليوم</p>
                )}
              </div>

              {/* Empty day */}
              {selectedEvents.tasks.length === 0 && selectedEvents.habits.length === 0 && selectedEvents.plans.length === 0 && (
                <div className="text-center py-6">
                  <CalendarIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">يوم فارغ - لا أحداث مسجلة</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
              <span className="text-sm">المهام</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span className="text-sm">العادات</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded" />
              <span className="text-sm">الخطط</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
