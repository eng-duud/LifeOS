import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { type Task, type Goal, type Habit, type Project, type LifeArea } from "../drizzle/schema";

const OWNER_USER_ID = 1;

export const appRouter = router({
  system: systemRouter,

  // ============ Tasks Router ============
  tasks: router({
    list: publicProcedure.query(async () => {
      return await db.getTasks(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getTaskById(input.id, OWNER_USER_ID);
      }),

    today: publicProcedure.query(async () => {
      return await db.getTodayTasks(OWNER_USER_ID);
    }),

    overdue: publicProcedure.query(async () => {
      return await db.getOverdueTasks(OWNER_USER_ID);
    }),

    inbox: publicProcedure.query(async () => {
      return await db.getInboxTasks(OWNER_USER_ID);
    }),

    blocked: publicProcedure.query(async () => {
      return await db.getBlockedTasks(OWNER_USER_ID);
    }),

    byProject: publicProcedure
      .input(z.object({ projectId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getTasksByProject(input.projectId, OWNER_USER_ID);
      }),

    byGoal: publicProcedure
      .input(z.object({ goalId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getTasksByGoal(input.goalId, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
        progress: z.number().min(0).max(100).optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).max(10000).optional(),
        actualHours: z.number().min(0).max(10000).optional(),
        goalId: z.number().positive().int().optional(),
        projectId: z.number().positive().int().optional(),
        habitId: z.number().positive().int().optional(),
        areaId: z.number().positive().int().optional(),
        planId: z.number().positive().int().optional(),
        bookId: z.number().positive().int().optional(),
        parentTaskId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { estimatedHours, actualHours, ...rest } = input;
        return await db.createTask({
          userId: OWNER_USER_ID,
          ...rest,
          estimatedHours: estimatedHours != null ? String(estimatedHours) : undefined,
          actualHours: actualHours != null ? String(actualHours) : undefined,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        progress: z.number().min(0).max(100).optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).max(10000).optional(),
        actualHours: z.number().min(0).max(10000).optional(),
        goalId: z.number().positive().int().optional(),
        projectId: z.number().positive().int().optional(),
        habitId: z.number().positive().int().optional(),
        areaId: z.number().positive().int().optional(),
        planId: z.number().positive().int().optional(),
        bookId: z.number().positive().int().optional(),
        parentTaskId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, estimatedHours, actualHours, ...data } = input;
        return await db.updateTask(id, OWNER_USER_ID, {
          ...data,
          estimatedHours: estimatedHours != null ? String(estimatedHours) : undefined,
          actualHours: actualHours != null ? String(actualHours) : undefined,
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteTask(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Goals Router ============
  goals: router({
    list: publicProcedure.query(async () => {
      return await db.getGoals(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getGoalById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        category: z.string().max(100).optional(),
        targetDate: z.date().optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createGoal({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        progress: z.number().min(0).max(100).optional(),
        status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
        category: z.string().max(100).optional(),
        targetDate: z.date().optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateGoal(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteGoal(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Projects Router ============
  projects: router({
    list: publicProcedure.query(async () => {
      return await db.getProjects(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
        progress: z.number().min(0).max(100).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        areaId: z.number().positive().int().optional(),
        goalId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createProject({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        progress: z.number().min(0).max(100).optional(),
        status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        areaId: z.number().positive().int().optional(),
        goalId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProject(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteProject(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Habits Router ============
  habits: router({
    list: publicProcedure.query(async () => {
      return await db.getHabits(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getHabitById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        category: z.string().max(100).optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createHabit({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        category: z.string().max(100).optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateHabit(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteHabit(input.id, OWNER_USER_ID);
      }),

    complete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        await db.completeHabit(input.id, OWNER_USER_ID);
        return { success: true };
      }),

    completions: publicProcedure
      .input(z.object({ habitId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getHabitCompletions(input.habitId, OWNER_USER_ID);
      }),
  }),

  // ============ Books Router ============
  books: router({
    list: publicProcedure.query(async () => {
      return await db.getBooks(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getBookById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        author: z.string().max(255).optional(),
        totalPages: z.number().int().positive().optional(),
        currentPage: z.number().int().min(0).optional(),
        status: z.enum(['to_read', 'reading', 'completed', 'abandoned']).optional(),
        rating: z.number().min(0).max(5).optional(),
        notes: z.string().max(5000).optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createBook({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        author: z.string().max(255).optional(),
        totalPages: z.number().int().positive().optional(),
        currentPage: z.number().int().min(0).optional(),
        status: z.enum(['to_read', 'reading', 'completed', 'abandoned']).optional(),
        rating: z.number().min(0).max(5).optional(),
        notes: z.string().max(5000).optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateBook(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteBook(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Plans Router ============
  plans: router({
    list: publicProcedure.query(async () => {
      return await db.getPlans(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getPlanById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        planType: z.enum(['daily', 'weekly', 'monthly']),
        startDate: z.date(),
        endDate: z.date().optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPlan({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        planType: z.enum(['daily', 'weekly', 'monthly']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
        areaId: z.number().positive().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePlan(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deletePlan(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Dashboard Router ============
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return await db.getDashboardStats(OWNER_USER_ID);
    }),

    healthStatus: publicProcedure.query(async () => {
      return await db.getHealthStatus(OWNER_USER_ID);
    }),

    updateHealthStatus: publicProcedure.mutation(async () => {
      return await db.updateHealthStatus(OWNER_USER_ID);
    }),

    today: publicProcedure.query(async () => {
      const [todayTasks, habits, health] = await Promise.all([
        db.getTodayTasks(OWNER_USER_ID),
        db.getHabits(OWNER_USER_ID),
        db.getHealthStatus(OWNER_USER_ID),
      ]);

      const todayStr = new Date().toDateString();
      const todayHabits = habits.filter((h: Habit) => {
        const completedToday = h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === todayStr;
        return h.frequency === 'daily' || completedToday;
      });

      return {
        tasks: todayTasks,
        habits: todayHabits,
        health,
      };
    }),

    review: publicProcedure.query(async () => {
      const [allTasks, allHabits, stats] = await Promise.all([
        db.getTasks(OWNER_USER_ID),
        db.getHabits(OWNER_USER_ID),
        db.getDashboardStats(OWNER_USER_ID),
      ]);

      const todayStr = new Date().toDateString();
      const completedToday = allTasks.filter((t: Task) => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === todayStr);
      const uncompletedToday = allTasks.filter((t: Task) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        return t.dueDate && new Date(t.dueDate).toDateString() === todayStr;
      });

      const habitsDoneToday = allHabits.filter((h: Habit) => h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === todayStr).length;

      return {
        completedTasks: completedToday,
        pendingTasks: uncompletedToday,
        habitsDone: habitsDoneToday,
        totalHabits: allHabits.length,
        stats,
      };
    }),
  }),

  // ============ Life Areas Router ============
  lifeAreas: router({
    list: publicProcedure.query(async () => {
      return await db.getLifeAreas(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getLifeAreaById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        icon: z.string().max(50).optional(),
        color: z.string().max(7).optional(),
        description: z.string().max(2000).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createLifeArea({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().max(7).optional(),
        description: z.string().max(2000).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateLifeArea(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteLifeArea(input.id, OWNER_USER_ID);
      }),
  }),

  // ============ Tags Router ============
  tags: router({
    list: publicProcedure.query(async () => {
      return await db.getTags(OWNER_USER_ID);
    }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(7).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTag({ userId: OWNER_USER_ID, ...input });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(7).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTag(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteTag(input.id, OWNER_USER_ID);
      }),

    addToEntity: publicProcedure
      .input(z.object({
        tagId: z.number().positive().int(),
        entityType: z.string().min(1).max(50),
        entityId: z.number().positive().int(),
      }))
      .mutation(async ({ input }) => {
        return await db.addEntityTag(input);
      }),

    removeFromEntity: publicProcedure
      .input(z.object({
        tagId: z.number().positive().int(),
        entityType: z.string().min(1).max(50),
        entityId: z.number().positive().int(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeEntityTag(input.tagId, input.entityType, input.entityId);
      }),

    getEntityTags: publicProcedure
      .input(z.object({
        entityType: z.string().min(1).max(50),
        entityId: z.number().positive().int(),
      }))
      .query(async ({ input }) => {
        return await db.getEntityTags(input.entityType, input.entityId);
      }),
  }),

  // ============ Subtasks Router ============
  subtasks: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getSubtasks(input.taskId);
      }),

    create: publicProcedure
      .input(z.object({
        taskId: z.number().positive().int(),
        title: z.string().min(1).max(255),
        sortOrder: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createSubtask(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().positive().int(),
        title: z.string().min(1).max(255).optional(),
        isCompleted: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateSubtask(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteSubtask(input.id);
      }),
  }),

  // ============ Task Dependencies Router ============
  taskDependencies: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getTaskDependencies(input.taskId);
      }),

    listDependsOn: publicProcedure
      .input(z.object({ taskId: z.number().positive().int() }))
      .query(async ({ input }) => {
        return await db.getTaskDependsOn(input.taskId);
      }),

    create: publicProcedure
      .input(z.object({
        taskId: z.number().positive().int(),
        dependsOnId: z.number().positive().int(),
        type: z.enum(['blocks', 'blocked_by', 'relates_to']).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTaskDependency(input);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().positive().int() }))
      .mutation(async ({ input }) => {
        return await db.deleteTaskDependency(input.id);
      }),
  }),

  // ============ AI Assistant Router ============
  assistant: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1).max(10000),
        })).min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const [tasks, goals, habits, projects, lifeAreas] = await Promise.all([
          db.getTasks(OWNER_USER_ID),
          db.getGoals(OWNER_USER_ID),
          db.getHabits(OWNER_USER_ID),
          db.getProjects(OWNER_USER_ID),
          db.getLifeAreas(OWNER_USER_ID),
        ]);

        const pendingTasks = tasks.filter((t: Task) => t.status === 'pending' || t.status === 'in_progress');
        const overdueTasks = pendingTasks.filter((t: Task) => t.dueDate && new Date(t.dueDate) < new Date());
        const activeGoals = goals.filter((g: Goal) => g.status === 'active');
        const activeProjects = projects.filter((p: Project) => p.status === 'in_progress' || p.status === 'planning');

        const systemPrompt = `أنت مساعد ذكي لتطبيق "Life OS" لإدارة الحياة والإنتاجية. تتحدث باللغة العربية.

ملخص بيانات المستخدم الحالية:
- مناطق الحياة: ${lifeAreas.length} مناطق${lifeAreas.length > 0 ? ` (${lifeAreas.map((a: LifeArea) => a.name).join('، ')})` : ''}
- المهام المعلقة: ${pendingTasks.length} مهمة${overdueTasks.length > 0 ? ` (${overdueTasks.length} متأخرة)` : ''}
- الأهداف النشطة: ${activeGoals.length} هدف
- المشاريع النشطة: ${activeProjects.length} مشروع
- العادات: ${habits.length} عادة

${pendingTasks.length > 0 ? `أهم المهام المعلقة: ${pendingTasks.slice(0, 5).map((t: Task) => t.title).join('، ')}` : ''}
${activeGoals.length > 0 ? `الأهداف النشطة: ${activeGoals.slice(0, 5).map((g: Goal) => `${g.title} (${g.progress || 0}%)`).join('، ')}` : ''}

قواعد الرد:
- أجب بشكل مختصر ومفيد باللغة العربية
- قدم نصائح عملية مبنية على بيانات المستخدم الفعلية
- ساعد في التخطيط وتنظيم المهام والأهداف
- شجع المستخدم وقدم ملاحظات إيجابية
- إذا سأل عن مهامه أو أهدافه، أعطه معلومات دقيقة من البيانات أعلاه`;

        const llmMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...input.messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];

        try {
          const result = await invokeLLM({
            messages: llmMessages,
            model: "google/gemma-4-31b-it:free",
            maxTokens: 1024,
          });

          const responseContent = result.choices?.[0]?.message?.content;
          const text = typeof responseContent === 'string'
            ? responseContent
            : Array.isArray(responseContent)
              ? responseContent
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map(p => p.text)
                  .join('')
              : 'عذراً، لم أتمكن من معالجة طلبك.';

          return { response: text };
        } catch (error: any) {
          console.error('AI Assistant error:', error);
          return {
            response: 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
