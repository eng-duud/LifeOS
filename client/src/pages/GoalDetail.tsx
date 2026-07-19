import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Zap, Plus, ArrowLeft, Calendar, Target, CheckCircle2, Circle, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const projectFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
});

export default function GoalDetail() {
  const [_, params] = useRoute('/goals/:id');
  const [__, setLocation] = useLocation();
  const goalId = params?.id ? Number(params.id) : null;

  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const { data: goal, isLoading } = trpc.goals.get.useQuery({ id: goalId! }, { enabled: !!goalId });
  const { data: allGoals } = trpc.goals.list.useQuery();
  const { data: allTasks } = trpc.tasks.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const utils = trpc.useUtils();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم إنشاء المشروع');
      setIsProjectOpen(false);
      reset();
    },
  });

  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success('تم حذف الهدف');
      setLocation('/goals');
    },
  });

  const area = goal?.areaId ? lifeAreas?.find((a: any) => a.id === goal.areaId) : null;

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    resolver: zodResolver(projectFormSchema),
  });

  if (isLoading || !goal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const tasks = allTasks?.filter(t => t.goalId === goal.id) || [];
  const projects = (utils.projects.list as any)?.getData() || [];
  const goalProjects = allTasks ? allTasks
    .filter(t => t.projectId)
    .map(t => t.projectId)
    .filter((id, i, arr) => id && arr.indexOf(id) === i)
    .map(id => {
      const project = allTasks ? null : null;
      return { id, name: `Project ${id}` };
    }) : [];

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const statusLabel: Record<string, string> = {
    active: 'نشط', completed: 'مكتمل', on_hold: 'معلق', cancelled: 'ملغى',
  };
  const statusColor: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40',
    on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setLocation('/goals')}>
        <ArrowLeft className="w-4 h-4 ml-1" />
        العودة للأهداف
      </Button>

      {/* Goal Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-500">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{goal.title}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[goal.status]}`}>
                  {statusLabel[goal.status]}
                </span>
              </div>
              {goal.description && <p className="text-sm text-muted-foreground mb-1">{goal.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {area && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color || '#3B82F6' }} />
                    {area.name}
                  </span>
                )}
                {goal.targetDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(goal.targetDate).toLocaleDateString('ar-SA')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => deleteGoal.mutate({ id: goal.id })}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-4 max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span>تقدم الهدف</span>
            <span className="font-mono">{goal.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${(goal.progress || 0) >= 100 ? 'bg-green-500' : (goal.progress || 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.length > 0 ? `${completedTasks}/${tasks.length} مهام مكتملة` : 'لا توجد مهام مرتبطة بعد'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks List */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">المهام المرتبطة ({tasks.length})</h3>
            {tasks.length > 0 ? (
              <div className="space-y-1">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <button onClick={() => toggleTask.mutate({ id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' })}>
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    {task.priority && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-3">لا توجد مهام مرتبطة بهذا الهدف</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setLocation(`/tasks?goalId=${goal.id}`)}>
              <Plus className="w-3 h-3 ml-1" />
              إضافة مهمة
            </Button>
          </CardContent>
        </Card>

        {/* Create Project */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">المشاريع</h3>
            {tasks.filter(t => t.projectId).length > 0 ? (
              <div className="space-y-2 mb-4">
                {goalProjects.map((gp: any) => (
                  <div key={gp.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => setLocation(`/projects/${gp.id}`)}>
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span>{gp.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 mb-2">حقق هدفك من خلال المشاريع</p>
            )}

            <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  <Plus className="w-3 h-3 ml-1" />
                  مشروع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>مشروع جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((data) => {
                  createProject.mutate({
                    title: data.title,
                    description: data.description || undefined,
                    goalId: goal.id,
                    areaId: goal.areaId || undefined,
                  });
                })} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">عنوان المشروع</label>
                    <Input {...register('title')} placeholder="أدخل عنوان المشروع" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الوصف</label>
                    <Textarea {...register('description')} placeholder="وصف المشروع" />
                  </div>
                  <Button type="submit" className="w-full" disabled={createProject.isPending}>
                    إنشاء
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
