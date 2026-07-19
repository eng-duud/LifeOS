import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Target, Zap, Flame, BookOpen, Plus, Circle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AreaDetail() {
  const [_, params] = useRoute('/life-areas/:id');
  const [__, setLocation] = useLocation();
  const areaId = params?.id ? Number(params.id) : null;

  const { data: area, isLoading: areaLoading } = trpc.lifeAreas.get.useQuery({ id: areaId! }, { enabled: !!areaId });
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();

  if (areaLoading || !area) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const areaGoals = goals?.filter(g => g.areaId === area.id) || [];
  const areaHabits = habits?.filter(h => h.areaId === area.id) || [];
  const areaBooks = books?.filter(b => b.areaId === area.id) || [];
  const areaProjects = projects?.filter(p => p.areaId === area.id) || [];
  const areaTasks = tasks?.filter(t => {
    if (t.areaId === area.id) return true;
    if (areaProjects.some(p => p.id === t.projectId)) return true;
    return false;
  }) || [];

  const completedTasks = areaTasks.filter(t => t.status === 'completed').length;
  const completedGoals = areaGoals.filter(g => g.status === 'completed').length;
  const avgGoalProgress = areaGoals.length > 0
    ? Math.round(areaGoals.reduce((s, g) => s + (g.progress || 0), 0) / areaGoals.length)
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setLocation('/life-areas')}>
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة لمناطق الحياة
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: area.color || '#3B82F6' }}>
            {area.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{area.name}</h1>
            {area.description && <p className="text-muted-foreground mt-1">{area.description}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{areaGoals.length}</p>
            <p className="text-[10px] text-muted-foreground">أهداف</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{areaProjects.length}</p>
            <p className="text-[10px] text-muted-foreground">مشاريع</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Circle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{areaTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">مهام</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{areaHabits.length}</p>
            <p className="text-[10px] text-muted-foreground">عادات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{areaBooks.length}</p>
            <p className="text-[10px] text-muted-foreground">كتب</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">تقدم الأهداف</h3>
            <div className="space-y-3">
              {areaGoals
                .filter(g => g.status === 'active')
                .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                .map(goal => (
                  <div key={goal.id} className="cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                    onClick={() => setLocation(`/goals/${goal.id}`)}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{goal.title}</span>
                      <span className="font-mono text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))}
              {areaGoals.filter(g => g.status === 'active').length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد أهداف نشطة في هذه المنطقة</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">المشاريع النشطة</h3>
            <div className="space-y-3">
              {areaProjects
                .filter(p => p.status === 'in_progress' || p.status === 'planning')
                .map(project => (
                  <div key={project.id} className="cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                    onClick={() => setLocation(`/projects/${project.id}`)}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{project.title}</span>
                      <span className="font-mono text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                ))}
              {areaProjects.filter(p => p.status === 'in_progress' || p.status === 'planning').length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد مشاريع نشطة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habits + Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">العادات</h3>
            {areaHabits.length > 0 ? (
              <div className="space-y-2">
                {areaHabits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/10">
                    <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="flex-1">{habit.title}</span>
                    <span className="text-[10px] text-muted-foreground">{habit.currentStreak}🔥 {habit.frequency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد عادات في هذه المنطقة</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">الكتب</h3>
            {areaBooks.length > 0 ? (
              <div className="space-y-2">
                {areaBooks.map(book => (
                  <div key={book.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10">
                    <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="flex-1">{book.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {book.totalPages ? `${Math.round(((book.currentPage || 0) / book.totalPages) * 100)}%` : book.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد كتب في هذه المنطقة</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
