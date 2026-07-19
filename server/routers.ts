import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const OWNER_USER_ID = 1;

export const appRouter = router({
  system: systemRouter,

  // ============ Tasks Router ============
  tasks: router({
    list: publicProcedure.query(async () => {
      return await db.getTasks(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
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
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByProject(input.projectId, OWNER_USER_ID);
      }),

    byGoal: publicProcedure
      .input(z.object({ goalId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByGoal(input.goalId, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
        progress: z.number().optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        goalId: z.number().optional(),
        projectId: z.number().optional(),
        habitId: z.number().optional(),
        areaId: z.number().optional(),
        planId: z.number().optional(),
        bookId: z.number().optional(),
        parentTaskId: z.number().optional(),
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
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        progress: z.number().optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        goalId: z.number().optional(),
        projectId: z.number().optional(),
        habitId: z.number().optional(),
        areaId: z.number().optional(),
        planId: z.number().optional(),
        bookId: z.number().optional(),
        parentTaskId: z.number().optional(),
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
      .input(z.object({ id: z.number() }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGoalById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        targetDate: z.date().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createGoal({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        progress: z.number().optional(),
        status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
        category: z.string().optional(),
        targetDate: z.date().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateGoal(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
        progress: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        areaId: z.number().optional(),
        goalId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createProject({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        progress: z.number().optional(),
        status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        areaId: z.number().optional(),
        goalId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProject(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getHabitById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        category: z.string().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createHabit({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        category: z.string().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateHabit(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteHabit(input.id, OWNER_USER_ID);
      }),

    complete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.completeHabit(input.id, OWNER_USER_ID);
        return { success: true };
      }),

    completions: publicProcedure
      .input(z.object({ habitId: z.number() }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBookById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        author: z.string().optional(),
        totalPages: z.number().optional(),
        currentPage: z.number().optional(),
        status: z.enum(['to_read', 'reading', 'completed', 'abandoned']).optional(),
        rating: z.number().optional(),
        notes: z.string().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createBook({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        author: z.string().optional(),
        totalPages: z.number().optional(),
        currentPage: z.number().optional(),
        status: z.enum(['to_read', 'reading', 'completed', 'abandoned']).optional(),
        rating: z.number().optional(),
        notes: z.string().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateBook(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPlanById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        planType: z.enum(['daily', 'weekly', 'monthly']),
        startDate: z.date(),
        endDate: z.date().optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPlan({
          userId: OWNER_USER_ID,
          ...input,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        planType: z.enum(['daily', 'weekly', 'monthly']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePlan(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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

      const todayHabits = habits.filter(h => {
        const completedToday = h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === new Date().toDateString();
        return !completedToday;
      });

      return {
        tasks: todayTasks,
        habits: todayHabits,
        health,
      };
    }),

    review: publicProcedure.query(async () => {
      const [allTasks, allHabits] = await Promise.all([
        db.getTasks(OWNER_USER_ID),
        db.getHabits(OWNER_USER_ID),
      ]);

      const todayStr = new Date().toDateString();

      const completedToday = allTasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === todayStr);
      const uncompletedToday = allTasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toDateString() === todayStr;
      });

      const habitsDoneToday = allHabits.filter(h => h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === todayStr).length;
      const habitsTotal = allHabits.length;

      return {
        completedToday,
        uncompletedToday,
        habitsDoneToday,
        habitsTotal,
        totalCompleted: completedToday.length,
        totalPending: uncompletedToday.length,
      };
    }),
  }),

  // ============ Hierarchy Router ============
  hierarchy: router({
    full: publicProcedure.query(async () => {
      return await db.getHierarchy(OWNER_USER_ID);
    }),

    area: publicProcedure
      .input(z.object({ areaId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLifeAreaById(input.areaId, OWNER_USER_ID);
      }),
  }),

  // ============ Statistics Router ============
  statistics: router({
    get: publicProcedure.query(async () => {
      return await db.getStatistics(OWNER_USER_ID);
    }),

    update: publicProcedure.mutation(async () => {
      return await db.updateStatistics(OWNER_USER_ID);
    }),
  }),

  // ============ Activity Log Router ============
  activityLog: router({
    list: publicProcedure.query(async () => {
      return await db.getActivityLog(OWNER_USER_ID);
    }),
  }),

  // ============ Life Areas Router ============
  lifeAreas: router({
    list: publicProcedure.query(async () => {
      return await db.getLifeAreas(OWNER_USER_ID);
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLifeAreaById(input.id, OWNER_USER_ID);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        icon: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createLifeArea({ userId: OWNER_USER_ID, ...input });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateLifeArea(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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
        name: z.string(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTag({ userId: OWNER_USER_ID, ...input });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTag(id, OWNER_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteTag(input.id, OWNER_USER_ID);
      }),

    addToEntity: publicProcedure
      .input(z.object({
        tagId: z.number(),
        entityType: z.string(),
        entityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.addEntityTag(input);
      }),

    removeFromEntity: publicProcedure
      .input(z.object({
        tagId: z.number(),
        entityType: z.string(),
        entityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeEntityTag(input.tagId, input.entityType, input.entityId);
      }),

    getEntityTags: publicProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getEntityTags(input.entityType, input.entityId);
      }),
  }),

  // ============ Subtasks Router ============
  subtasks: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubtasks(input.taskId);
      }),

    create: publicProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createSubtask(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        isCompleted: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateSubtask(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteSubtask(input.id);
      }),
  }),

  // ============ Task Dependencies Router ============
  taskDependencies: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTaskDependencies(input.taskId);
      }),

    listDependsOn: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTaskDependsOn(input.taskId);
      }),

    create: publicProcedure
      .input(z.object({
        taskId: z.number(),
        dependsOnId: z.number(),
        type: z.enum(['blocks', 'blocked_by', 'relates_to']).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTaskDependency(input);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
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
          content: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const [tasks, goals, habits, projects, lifeAreas] = await Promise.all([
          db.getTasks(OWNER_USER_ID),
          db.getGoals(OWNER_USER_ID),
          db.getHabits(OWNER_USER_ID),
          db.getProjects(OWNER_USER_ID),
          db.getLifeAreas(OWNER_USER_ID),
        ]);

        const pendingTasks = tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
        const overdueTasks = pendingTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date());
        const activeGoals = goals.filter((g: any) => g.status === 'active');
        const activeProjects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'planning');

        const systemPrompt = `أنت مساعد ذكي لتطبيق "Life OS" لإدارة الحياة والإنتاجية. تتحدث باللغة العربية.

ملخص بيانات المستخدم الحالية:
- مناطق الحياة: ${lifeAreas.length} مناطق${lifeAreas.length > 0 ? ` (${lifeAreas.map((a: any) => a.name).join('، ')})` : ''}
- المهام المعلقة: ${pendingTasks.length} مهمة${overdueTasks.length > 0 ? ` (${overdueTasks.length} متأخرة)` : ''}
- الأهداف النشطة: ${activeGoals.length} هدف
- المشاريع النشطة: ${activeProjects.length} مشروع
- العادات: ${habits.length} عادة

${pendingTasks.length > 0 ? `أهم المهام المعلقة: ${pendingTasks.slice(0, 5).map((t: any) => t.title).join('، ')}` : ''}
${activeGoals.length > 0 ? `الأهداف النشطة: ${activeGoals.slice(0, 5).map((g: any) => `${g.title} (${g.progress || 0}%)`).join('، ')}` : ''}

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
