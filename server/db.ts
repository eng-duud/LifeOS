import { eq, and, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
import {
  tasks,
  goals,
  projects,
  habits,
  habitCompletions,
  books,
  plans,
  statistics,
  healthStatus,
  activityLog,
  lifeAreas,
  tags,
  entityTags,
  subtasks,
  taskDependencies,
  type Task,
  type Goal,
  type Project,
  type Habit,
  type Book,
  type Plan,
  type LifeArea,
  type Subtask,
  type TaskDependency,
} from "../drizzle/schema";

let _db: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Database query helper ──────────────────────────────────────────────────
async function withDb<T>(fn: (db: any) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return fn(db);
}

// ============ Activity Log ============

export async function logActivity(
  userId: number,
  entityType: string,
  entityId: number,
  action: string,
  oldValue?: string,
  newValue?: string
) {
  return await withDb(db =>
    db.insert(activityLog).values({
      userId,
      entityType,
      entityId,
      action,
      oldValue,
      newValue,
    })
  );
}

export async function getActivityLog(userId: number, limit = 50) {
  return await withDb(db =>
    db.select().from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
  );
}

// ============ Auto-Progress Cascade ============

async function recalculateProjectProgress(projectId: number, userId: number) {
  const projectTasks = await withDb(db =>
    db.select().from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)))
  ) as Task[];

  const completedCount = projectTasks.filter(t => t.status === 'completed').length;
  const progress = projectTasks.length > 0
    ? Math.round((completedCount / projectTasks.length) * 100)
    : 0;

  await withDb(db =>
    db.update(projects).set({ progress }).where(eq(projects.id, projectId))
  );
}

async function recalculateGoalProgress(goalId: number, userId: number) {
  const goalTasks = await withDb(db =>
    db.select().from(tasks)
      .where(and(eq(tasks.goalId, goalId), eq(tasks.userId, userId)))
  ) as Task[];

  const completedCount = goalTasks.filter(t => t.status === 'completed').length;
  const progress = goalTasks.length > 0
    ? Math.round((completedCount / goalTasks.length) * 100)
    : 0;

  await withDb(db =>
    db.update(goals).set({ progress }).where(eq(goals.id, goalId))
  );

  const goal = await getGoalById(goalId, userId);
  if (goal?.areaId) {
    await recalculateAreaHealth(goal.areaId, userId);
  }
}

async function recalculateAreaHealth(areaId: number, userId: number) {
  const [areaGoals, areaHabits] = await Promise.all([
    withDb(db =>
      db.select().from(goals)
        .where(and(eq(goals.areaId, areaId), eq(goals.userId, userId)))
    ) as Promise<Goal[]>,
    withDb(db =>
      db.select().from(habits)
        .where(and(eq(habits.areaId, areaId), eq(habits.userId, userId)))
    ) as Promise<Habit[]>,
  ]);

  const avgGoalProgress = areaGoals.length > 0
    ? Math.round(areaGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / areaGoals.length)
    : 0;

  const habitCompletionsToday = areaHabits.filter(h =>
    h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === new Date().toDateString()
  ).length;

  const totalHabits = areaHabits.length;
  const habitRate = totalHabits > 0 ? Math.round((habitCompletionsToday / totalHabits) * 100) : 0;

  return { avgGoalProgress, habitRate };
}

// ============ Task Operations ============

export async function createTask(task: typeof tasks.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(tasks).values(task).returning();

      await tx.insert(activityLog).values({
        userId: task.userId,
        entityType: 'task',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: task.title,
      });

      if (task.projectId) {
        await recalculateProjectProgress(task.projectId, task.userId);
      }

      return result[0];
    });
  });
}

export async function getTasks(userId: number) {
  return await withDb(db =>
    db.select().from(tasks).where(eq(tasks.userId, userId))
  ) as Task[];
}

export async function getTaskById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  ) as Task[];
  return result[0];
}

export async function updateTask(id: number, userId: number, data: Partial<typeof tasks.$inferInsert>) {
  const oldTask = await getTaskById(id, userId);

  const result = await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const r = await tx.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();

      if (oldTask) {
        if (data.status && data.status !== oldTask.status) {
          const action = data.status === 'completed' ? 'completed' : `status:${oldTask.status}->${data.status}`;
          await tx.insert(activityLog).values({
            userId, entityType: 'task', entityId: id, action,
            oldValue: oldTask.status, newValue: data.status,
          });
        }
        if (data.title && data.title !== oldTask.title) {
          await tx.insert(activityLog).values({
            userId, entityType: 'task', entityId: id, action: 'updated',
            oldValue: oldTask.title, newValue: data.title,
          });
        }
      }

      return r[0];
    });
  });

  if (data.projectId || oldTask?.projectId) {
    const projectId = data.projectId || oldTask?.projectId;
    if (projectId) await recalculateProjectProgress(projectId, userId);
  }

  return result;
}

export async function deleteTask(id: number, userId: number) {
  const oldTask = await getTaskById(id, userId);

  const result = await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const r = await tx.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();

      if (oldTask) {
        await tx.insert(activityLog).values({
          userId, entityType: 'task', entityId: id, action: 'deleted',
          oldValue: oldTask.title, newValue: undefined,
        });
      }

      return r[0];
    });
  });

  if (oldTask?.projectId) {
    await recalculateProjectProgress(oldTask.projectId, userId);
  }

  return result;
}

// ============ Goal Operations ============

export async function createGoal(goal: typeof goals.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(goals).values(goal).returning();

      await tx.insert(activityLog).values({
        userId: goal.userId,
        entityType: 'goal',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: goal.title,
      });

      return result[0];
    });
  });
}

export async function getGoals(userId: number) {
  return await withDb(db =>
    db.select().from(goals).where(eq(goals.userId, userId))
  ) as Goal[];
}

export async function getGoalById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)))
  ) as Goal[];
  return result[0];
}

export async function updateGoal(id: number, userId: number, data: Partial<typeof goals.$inferInsert>) {
  const oldGoal = await getGoalById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();

      if (data.status === 'completed' && oldGoal && oldGoal.status !== 'completed') {
        await tx.insert(activityLog).values({
          userId, entityType: 'goal', entityId: id, action: 'completed',
          oldValue: oldGoal.status, newValue: 'completed',
        });
      }

      return result[0];
    });
  });
}

export async function deleteGoal(id: number, userId: number) {
  const oldGoal = await getGoalById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();

      if (oldGoal) {
        await tx.insert(activityLog).values({
          userId, entityType: 'goal', entityId: id, action: 'deleted',
          oldValue: oldGoal.title, newValue: undefined,
        });
      }

      return result[0];
    });
  });
}

// ============ Project Operations ============

export async function createProject(project: typeof projects.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(projects).values(project).returning();

      await tx.insert(activityLog).values({
        userId: project.userId,
        entityType: 'project',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: project.title,
      });

      return result[0];
    });
  });
}

export async function getProjects(userId: number) {
  return await withDb(db =>
    db.select().from(projects).where(eq(projects.userId, userId))
  ) as Project[];
}

export async function getProjectById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)))
  ) as Project[];
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<typeof projects.$inferInsert>) {
  const oldProject = await getProjectById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.update(projects).set(data).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();

      if (data.status === 'completed' && oldProject && oldProject.status !== 'completed') {
        await tx.insert(activityLog).values({
          userId, entityType: 'project', entityId: id, action: 'completed',
          oldValue: oldProject.status, newValue: 'completed',
        });
      }

      return result[0];
    });
  });
}

export async function deleteProject(id: number, userId: number) {
  const oldProject = await getProjectById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();

      if (oldProject) {
        await tx.insert(activityLog).values({
          userId, entityType: 'project', entityId: id, action: 'deleted',
          oldValue: oldProject.title, newValue: undefined,
        });
      }

      return result[0];
    });
  });
}

// ============ Habit Operations ============

export async function createHabit(habit: typeof habits.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(habits).values(habit).returning();

      await tx.insert(activityLog).values({
        userId: habit.userId,
        entityType: 'habit',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: habit.title,
      });

      return result[0];
    });
  });
}

export async function getHabits(userId: number) {
  return await withDb(db =>
    db.select().from(habits).where(eq(habits.userId, userId))
  ) as Habit[];
}

export async function getHabitById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)))
  ) as Habit[];
  return result[0];
}

export async function updateHabit(id: number, userId: number, data: Partial<typeof habits.$inferInsert>) {
  return await withDb(db =>
    db.update(habits).set(data).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

export async function deleteHabit(id: number, userId: number) {
  const oldHabit = await getHabitById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();

      if (oldHabit) {
        await tx.insert(activityLog).values({
          userId, entityType: 'habit', entityId: id, action: 'deleted',
          oldValue: oldHabit.title, newValue: undefined,
        });
      }

      return result[0];
    });
  });
}

// ============ Habit Completion Operations ============

export async function completeHabit(habitId: number, userId: number) {
  await withDb(db =>
    db.insert(habitCompletions).values({
      habitId,
      userId,
      completedAt: new Date(),
    })
  );

  const habit = await getHabitById(habitId, userId);
  if (habit) {
    const newStreak = (habit.currentStreak || 0) + 1;
    const longestStreak = Math.max(newStreak, habit.longestStreak || 0);

    await updateHabit(habitId, userId, {
      currentStreak: newStreak,
      longestStreak,
      totalCompletions: (habit.totalCompletions || 0) + 1,
      lastCompletedAt: new Date(),
    });
  }

  await logActivity(userId, 'habit', habitId, 'completed', undefined, habit?.title);
}

export async function getHabitCompletions(habitId: number, userId: number) {
  return await withDb(db =>
    db.select().from(habitCompletions).where(
      and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.userId, userId))
    )
  );
}

// ============ Book Operations ============

export async function createBook(book: typeof books.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(books).values(book).returning();

      await tx.insert(activityLog).values({
        userId: book.userId,
        entityType: 'book',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: book.title,
      });

      return result[0];
    });
  });
}

export async function getBooks(userId: number) {
  return await withDb(db =>
    db.select().from(books).where(eq(books.userId, userId))
  ) as Book[];
}

export async function getBookById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)))
  ) as Book[];
  return result[0];
}

export async function updateBook(id: number, userId: number, data: Partial<typeof books.$inferInsert>) {
  const oldBook = await getBookById(id, userId);
  const oldStatus = oldBook?.status;

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.update(books).set(data).where(and(eq(books.id, id), eq(books.userId, userId))).returning();

      if (data.status && oldStatus && data.status !== oldStatus && data.status === 'completed') {
        await tx.insert(activityLog).values({
          userId, entityType: 'book', entityId: id, action: 'completed',
          oldValue: oldStatus, newValue: data.status,
        });
      }

      return result[0];
    });
  });
}

export async function deleteBook(id: number, userId: number) {
  const oldBook = await getBookById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.delete(books).where(and(eq(books.id, id), eq(books.userId, userId))).returning();

      if (oldBook) {
        await tx.insert(activityLog).values({
          userId, entityType: 'book', entityId: id, action: 'deleted',
          oldValue: oldBook.title, newValue: undefined,
        });
      }

      return result[0];
    });
  });
}

// ============ Plan Operations ============

export async function createPlan(plan: typeof plans.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(plans).values(plan).returning();

      await tx.insert(activityLog).values({
        userId: plan.userId,
        entityType: 'plan',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: plan.title,
      });

      return result[0];
    });
  });
}

export async function getPlans(userId: number) {
  return await withDb(db =>
    db.select().from(plans).where(eq(plans.userId, userId))
  ) as Plan[];
}

export async function getPlanById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)))
  ) as Plan[];
  return result[0];
}

export async function updatePlan(id: number, userId: number, data: Partial<typeof plans.$inferInsert>) {
  return await withDb(db =>
    db.update(plans).set(data).where(and(eq(plans.id, id), eq(plans.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

export async function deletePlan(id: number, userId: number) {
  return await withDb(db =>
    db.delete(plans).where(and(eq(plans.id, id), eq(plans.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

// ============ Statistics Operations ============

export async function getStatistics(userId: number, date?: Date) {
  return await withDb(async (db) => {
    if (date) {
      const result = await db.select().from(statistics).where(
        and(eq(statistics.userId, userId), eq(statistics.date, date))
      );
      return result[0];
    }
    return await db.select().from(statistics).where(eq(statistics.userId, userId));
  });
}

export async function updateStatistics(userId: number) {
  const [userTasks, userGoals, userProjects, userHabits, userBooks] = await Promise.all([
    getTasks(userId), getGoals(userId), getProjects(userId), getHabits(userId), getBooks(userId),
  ]);

  const stats = {
    userId,
    date: new Date(),
    tasksCompleted: userTasks.filter(t => t.status === 'completed').length,
    tasksPending: userTasks.filter(t => t.status === 'pending').length,
    goalsCompleted: userGoals.filter(g => g.status === 'completed').length,
    goalsActive: userGoals.filter(g => g.status === 'active').length,
    projectsCompleted: userProjects.filter(p => p.status === 'completed').length,
    projectsActive: userProjects.filter(p => p.status === 'in_progress').length,
    habitsCompleted: userHabits.filter(h => h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === new Date().toDateString()).length,
    habitsTracked: userHabits.length,
    booksCompleted: userBooks.filter(b => b.status === 'completed').length,
    booksReading: userBooks.filter(b => b.status === 'reading').length,
  };

  await withDb(db => db.insert(statistics).values(stats));
  return stats;
}

// ============ Health Status Operations ============

export async function getHealthStatus(userId: number) {
  const result = await withDb(db =>
    db.select().from(healthStatus).where(eq(healthStatus.userId, userId))
  ) as any[];
  return result[0];
}

export async function updateHealthStatus(userId: number) {
  const [userTasks, userGoals, userHabits] = await Promise.all([
    getTasks(userId), getGoals(userId), getHabits(userId),
  ]);

  const taskCompletionRate = userTasks.length > 0
    ? (userTasks.filter(t => t.status === 'completed').length / userTasks.length) * 100
    : 0;

  const goalProgress = userGoals.length > 0
    ? userGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / userGoals.length
    : 0;

  const habitStreak = userHabits.length > 0
    ? userHabits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0)
    : 0;

  const overallScore = Math.round((taskCompletionRate * 0.4 + goalProgress * 0.2 + Math.min(habitStreak * 5, 100) * 0.15) / 0.75);

  let status: 'on_track' | 'at_risk' | 'needs_attention' = 'on_track';
  if (overallScore < 40) {
    status = 'needs_attention';
  } else if (overallScore < 70) {
    status = 'at_risk';
  }

  const existing = await getHealthStatus(userId);

  await withDb(async (db) => {
    if (existing) {
      await db.update(healthStatus).set({
        status,
        taskCompletionRate: taskCompletionRate.toString(),
        goalProgress: goalProgress.toString(),
        habitStreak,
        overallScore,
        lastUpdatedAt: new Date(),
      }).where(eq(healthStatus.userId, userId));
    } else {
      await db.insert(healthStatus).values({
        userId,
        status,
        taskCompletionRate: taskCompletionRate.toString(),
        goalProgress: goalProgress.toString(),
        habitStreak,
        overallScore,
      });
    }
  });

  return { status, taskCompletionRate, goalProgress, habitStreak, overallScore };
}

// ============ Dashboard Statistics ============

export async function getDashboardStats(userId: number) {
  const userTasks = await getTasks(userId);
  const userGoals = await getGoals(userId);
  const userProjects = await getProjects(userId);
  const userHabits = await getHabits(userId);
  const userBooks = await getBooks(userId);

  return {
    tasks: {
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
    },
    goals: {
      total: userGoals.length,
      completed: userGoals.filter(g => g.status === 'completed').length,
      active: userGoals.filter(g => g.status === 'active').length,
    },
    projects: {
      total: userProjects.length,
      completed: userProjects.filter(p => p.status === 'completed').length,
      inProgress: userProjects.filter(p => p.status === 'in_progress').length,
    },
    habits: {
      total: userHabits.length,
      completedToday: userHabits.filter(h => h.lastCompletedAt && new Date(h.lastCompletedAt).toDateString() === new Date().toDateString()).length,
    },
    books: {
      total: userBooks.length,
      completed: userBooks.filter(b => b.status === 'completed').length,
      reading: userBooks.filter(b => b.status === 'reading').length,
    },
  };
}

// ============ Today & Focus Queries ============

export async function getTodayTasks(userId: number) {
  const allTasks = await getTasks(userId);
  const todayStr = new Date().toDateString();

  return allTasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (t.dueDate && new Date(t.dueDate).toDateString() === todayStr) return true;
    return false;
  });
}

export async function getOverdueTasks(userId: number) {
  const allTasks = await getTasks(userId);
  const now = new Date();

  return allTasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });
}

export async function getInboxTasks(userId: number) {
  const allTasks = await getTasks(userId);
  return allTasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    return !t.projectId && !t.goalId && !t.planId;
  });
}

export async function getBlockedTasks(userId: number) {
  const allTasks = await getTasks(userId);
  const activeTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const activeTaskIds = activeTasks.map(t => t.id);

  if (activeTaskIds.length === 0) return [];

  const deps = await withDb(db =>
    db.select().from(taskDependencies)
      .where(inArray(taskDependencies.taskId, activeTaskIds))
  ) as TaskDependency[];

  const blocked: { task: Task; blockedBy: Task }[] = [];

  for (const dep of deps) {
    if (dep.type === 'blocked_by') {
      const blocker = allTasks.find(t => t.id === dep.dependsOnId);
      if (blocker && blocker.status !== 'completed') {
        const task = allTasks.find(t => t.id === dep.taskId);
        if (task) blocked.push({ task, blockedBy: blocker });
      }
    }
  }

  return blocked;
}

export async function getTasksByProject(projectId: number, userId: number) {
  return await withDb(db =>
    db.select().from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)))
  ) as Task[];
}

export async function getTasksByGoal(goalId: number, userId: number) {
  const goalTasks = await withDb(db =>
    db.select().from(tasks)
      .where(and(eq(tasks.goalId, goalId), eq(tasks.userId, userId)))
  ) as Task[];

  return { tasks: goalTasks };
}

export async function getHierarchy(userId: number) {
  const allAreas = await getLifeAreas(userId);
  const allGoals = await getGoals(userId);
  const allTasks = await getTasks(userId);

  return allAreas.map(area => ({
    ...area,
    goals: allGoals
      .filter(g => g.areaId === area.id)
      .map(goal => ({
        ...goal,
        tasks: allTasks.filter(t => t.goalId === goal.id),
      })),
  }));
}

// ============ Life Area Operations ============

export async function createLifeArea(area: typeof lifeAreas.$inferInsert) {
  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.insert(lifeAreas).values(area).returning();

      await tx.insert(activityLog).values({
        userId: area.userId,
        entityType: 'lifeArea',
        entityId: result[0].id,
        action: 'created',
        oldValue: undefined,
        newValue: area.name,
      });

      return result[0];
    });
  });
}

export async function getLifeAreas(userId: number) {
  return await withDb(db =>
    db.select().from(lifeAreas).where(eq(lifeAreas.userId, userId))
  ) as LifeArea[];
}

export async function getLifeAreaById(id: number, userId: number) {
  const result = await withDb(db =>
    db.select().from(lifeAreas).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId)))
  ) as LifeArea[];
  return result[0];
}

export async function updateLifeArea(id: number, userId: number, data: Partial<typeof lifeAreas.$inferInsert>) {
  return await withDb(db =>
    db.update(lifeAreas).set(data).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

export async function deleteLifeArea(id: number, userId: number) {
  const oldArea = await getLifeAreaById(id, userId);

  return await withDb(async (db) => {
    return await db.transaction(async (tx: any) => {
      const result = await tx.delete(lifeAreas).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))).returning();

      if (oldArea) {
        await tx.insert(activityLog).values({
          userId, entityType: 'lifeArea', entityId: id, action: 'deleted',
          oldValue: oldArea.name, newValue: undefined,
        });
      }

      return result[0];
    });
  });
}

// ============ Tag Operations ============

export async function createTag(tag: typeof tags.$inferInsert) {
  return await withDb(db =>
    db.insert(tags).values(tag).returning()
  ).then(r => (r as any[])[0]);
}

export async function getTags(userId: number) {
  return await withDb(db =>
    db.select().from(tags).where(eq(tags.userId, userId))
  );
}

export async function updateTag(id: number, userId: number, data: Partial<typeof tags.$inferInsert>) {
  return await withDb(db =>
    db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

export async function deleteTag(id: number, userId: number) {
  return await withDb(db =>
    db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning()
  ).then(r => (r as any[])[0]);
}

// ============ Entity Tag Operations ============

export async function addEntityTag(data: typeof entityTags.$inferInsert) {
  return await withDb(db =>
    db.insert(entityTags).values(data).returning()
  ).then(r => (r as any[])[0]);
}

export async function removeEntityTag(tagId: number, entityType: string, entityId: number) {
  return await withDb(db =>
    db.delete(entityTags).where(
      and(eq(entityTags.tagId, tagId), eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId))
    ).returning()
  ).then(r => (r as any[])[0]);
}

export async function getEntityTags(entityType: string, entityId: number) {
  return await withDb(db =>
    db.select().from(entityTags).where(
      and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId))
    )
  );
}

// ============ Subtask Operations ============

export async function createSubtask(subtask: typeof subtasks.$inferInsert) {
  return await withDb(db =>
    db.insert(subtasks).values(subtask).returning()
  ).then(r => (r as any[])[0]);
}

export async function getSubtasks(taskId: number) {
  return await withDb(db =>
    db.select().from(subtasks).where(eq(subtasks.taskId, taskId))
  ) as Subtask[];
}

export async function updateSubtask(id: number, data: Partial<typeof subtasks.$inferInsert>) {
  return await withDb(async (db) => {
    const oldSubtask = await db.select().from(subtasks).where(eq(subtasks.id, id)) as Subtask[];
    const result = await db.update(subtasks).set(data).where(eq(subtasks.id, id)).returning() as any[];
    
    if (data.isCompleted && oldSubtask[0] && !oldSubtask[0].isCompleted) {
      const taskId = oldSubtask[0].taskId;
      const allSubtasks = await getSubtasks(taskId);
      if (allSubtasks.length > 0 && allSubtasks.every(s => s.isCompleted)) {
        // Optional: auto-complete parent task? 
        // For now just keep it as is.
      }
    }
    return result[0];
  });
}

export async function deleteSubtask(id: number) {
  return await withDb(db =>
    db.delete(subtasks).where(eq(subtasks.id, id)).returning()
  ).then(r => (r as any[])[0]);
}

// ============ Task Dependency Operations ============

export async function createTaskDependency(data: typeof taskDependencies.$inferInsert) {
  return await withDb(db =>
    db.insert(taskDependencies).values(data).returning()
  ).then(r => (r as any[])[0]);
}

export async function deleteTaskDependency(id: number) {
  return await withDb(db =>
    db.delete(taskDependencies).where(eq(taskDependencies.id, id)).returning()
  ).then(r => (r as any[])[0]);
}

export async function getTaskDependencies(taskId: number) {
  return await withDb(db =>
    db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId))
  );
}

export async function getTaskDependsOn(taskId: number) {
  return await withDb(db =>
    db.select().from(taskDependencies).where(eq(taskDependencies.dependsOnId, taskId))
  );
}
