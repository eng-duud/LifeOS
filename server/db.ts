import { eq, and, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
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
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = neon(process.env.DATABASE_URL);
      _db = drizzle({ client });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(activityLog).values({
    userId,
    entityType,
    entityId,
    action,
    oldValue,
    newValue,
  });
}

export async function getActivityLog(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ============ Auto-Progress Cascade ============

async function recalculateProjectProgress(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  const projectTasks = await db.select().from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));

  const completedCount = projectTasks.filter(t => t.status === 'completed').length;
  const progress = projectTasks.length > 0
    ? Math.round((completedCount / projectTasks.length) * 100)
    : 0;

  await db.update(projects).set({ progress }).where(eq(projects.id, projectId));
}

async function recalculateGoalProgress(goalId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  const goalTasks = await db.select().from(tasks)
    .where(and(eq(tasks.goalId, goalId), eq(tasks.userId, userId)));

  const completedCount = goalTasks.filter(t => t.status === 'completed').length;
  const progress = goalTasks.length > 0
    ? Math.round((completedCount / goalTasks.length) * 100)
    : 0;

  await db.update(goals).set({ progress }).where(eq(goals.id, goalId));

  const goal = await getGoalById(goalId, userId);
  if (goal?.areaId) {
    await recalculateAreaHealth(goal.areaId, userId);
  }
}

async function recalculateAreaHealth(areaId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  const areaGoals = await db.select().from(goals)
    .where(and(eq(goals.areaId, areaId), eq(goals.userId, userId)));

  const areaHabits = await db.select().from(habits)
    .where(and(eq(habits.areaId, areaId), eq(habits.userId, userId)));

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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(task);

  if (task.projectId) {
    await recalculateProjectProgress(task.projectId, task.userId);
  }

  await logActivity(task.userId, 'task', 0, 'created', undefined, task.title);

  return result;
}

export async function getTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(tasks).where(eq(tasks.userId, userId));
}

export async function getTaskById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return result[0];
}

export async function updateTask(id: number, userId: number, data: Partial<typeof tasks.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldTask = await getTaskById(id, userId);

  const result = await db.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  if (data.projectId || oldTask?.projectId) {
    const projectId = data.projectId || oldTask?.projectId;
    if (projectId) await recalculateProjectProgress(projectId, userId);
  }

  if (oldTask) {
    if (data.status && data.status !== oldTask.status) {
      if (data.status === 'completed') {
        await logActivity(userId, 'task', id, 'completed', oldTask.status, 'completed');
      } else {
        await logActivity(userId, 'task', id, `status:${oldTask.status}->${data.status}`, oldTask.status, data.status);
      }
    }
    if (data.title && data.title !== oldTask.title) {
      await logActivity(userId, 'task', id, 'updated', oldTask.title, data.title);
    }
  }

  return result;
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldTask = await getTaskById(id, userId);

  const result = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  if (oldTask?.projectId) {
    await recalculateProjectProgress(oldTask.projectId, userId);
  }

  if (oldTask) {
    await logActivity(userId, 'task', id, 'deleted', oldTask.title, undefined);
  }

  return result;
}

// ============ Goal Operations ============

export async function createGoal(goal: typeof goals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(goals).values(goal);

  await logActivity(goal.userId, 'goal', 0, 'created', undefined, goal.title);

  return result;
}

export async function getGoals(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(goals).where(eq(goals.userId, userId));
}

export async function getGoalById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return result[0];
}

export async function updateGoal(id: number, userId: number, data: Partial<typeof goals.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldGoal = await getGoalById(id, userId);

  const result = await db.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId)));

  if (data.status === 'completed' && oldGoal && oldGoal.status !== 'completed') {
    await logActivity(userId, 'goal', id, 'completed', oldGoal.status, 'completed');
  }

  return result;
}

export async function deleteGoal(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldGoal = await getGoalById(id, userId);

  const result = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));

  if (oldGoal) {
    await logActivity(userId, 'goal', id, 'deleted', oldGoal.title, undefined);
  }

  return result;
}

// ============ Project Operations ============

export async function createProject(project: typeof projects.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project);

  await logActivity(project.userId, 'project', 0, 'created', undefined, project.title);

  return result;
}

export async function getProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProjectById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<typeof projects.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldProject = await getProjectById(id, userId);

  const result = await db.update(projects).set(data).where(and(eq(projects.id, id), eq(projects.userId, userId)));

  if (data.status === 'completed' && oldProject && oldProject.status !== 'completed') {
    await logActivity(userId, 'project', id, 'completed', oldProject.status, 'completed');
  }

  return result;
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldProject = await getProjectById(id, userId);

  const result = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));

  if (oldProject) {
    await logActivity(userId, 'project', id, 'deleted', oldProject.title, undefined);
  }

  return result;
}

// ============ Habit Operations ============

export async function createHabit(habit: typeof habits.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(habits).values(habit);

  await logActivity(habit.userId, 'habit', 0, 'created', undefined, habit.title);

  return result;
}

export async function getHabits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(habits).where(eq(habits.userId, userId));
}

export async function getHabitById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
  return result[0];
}

export async function updateHabit(id: number, userId: number, data: Partial<typeof habits.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(habits).set(data).where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function deleteHabit(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldHabit = await getHabitById(id, userId);

  const result = await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));

  if (oldHabit) {
    await logActivity(userId, 'habit', id, 'deleted', oldHabit.title, undefined);
  }

  return result;
}

// ============ Habit Completion Operations ============

export async function completeHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(habitCompletions).values({
    habitId,
    userId,
    completedAt: new Date(),
  });

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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(habitCompletions).where(
    and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.userId, userId))
  );
}

// ============ Book Operations ============

export async function createBook(book: typeof books.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(books).values(book);

  await logActivity(book.userId, 'book', 0, 'created', undefined, book.title);

  return result;
}

export async function getBooks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(books).where(eq(books.userId, userId));
}

export async function getBookById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)));
  return result[0];
}

export async function updateBook(id: number, userId: number, data: Partial<typeof books.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldBook = await getBookById(id, userId);
  const oldStatus = oldBook?.status;

  const result = await db.update(books).set(data).where(and(eq(books.id, id), eq(books.userId, userId)));

  if (data.status && oldStatus && data.status !== oldStatus && data.status === 'completed') {
    await logActivity(userId, 'book', id, 'completed', oldStatus, data.status);
  }

  return result;
}

export async function deleteBook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldBook = await getBookById(id, userId);

  const result = await db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));

  if (oldBook) {
    await logActivity(userId, 'book', id, 'deleted', oldBook.title, undefined);
  }

  return result;
}

// ============ Plan Operations ============

export async function createPlan(plan: typeof plans.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(plans).values(plan);
}

export async function getPlans(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(plans).where(eq(plans.userId, userId));
}

export async function getPlanById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)));
  return result[0];
}

export async function updatePlan(id: number, userId: number, data: Partial<typeof plans.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(plans).set(data).where(and(eq(plans.id, id), eq(plans.userId, userId)));
}

export async function deletePlan(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(plans).where(and(eq(plans.id, id), eq(plans.userId, userId)));
}

// ============ Statistics Operations ============

export async function getStatistics(userId: number, date?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (date) {
    const result = await db.select().from(statistics).where(
      and(eq(statistics.userId, userId), eq(statistics.date, date))
    );
    return result[0];
  }

  return await db.select().from(statistics).where(eq(statistics.userId, userId));
}

export async function updateStatistics(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userTasks = await getTasks(userId);
  const userGoals = await getGoals(userId);
  const userProjects = await getProjects(userId);
  const userHabits = await getHabits(userId);
  const userBooks = await getBooks(userId);

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

  await db.insert(statistics).values(stats);
  return stats;
}

// ============ Health Status Operations ============

export async function getHealthStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(healthStatus).where(eq(healthStatus.userId, userId));
  return result[0];
}

export async function updateHealthStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userTasks = await getTasks(userId);
  const userGoals = await getGoals(userId);
  const userHabits = await getHabits(userId);

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

  if (existing) {
    await db.update(healthStatus).set({
      status,
      taskCompletionRate: taskCompletionRate.toString() as any,
      goalProgress: goalProgress.toString() as any,
      habitStreak,
      overallScore,
      lastUpdatedAt: new Date(),
    }).where(eq(healthStatus.userId, userId));
  } else {
    await db.insert(healthStatus).values({
      userId,
      status,
      taskCompletionRate: taskCompletionRate.toString() as any,
      goalProgress: goalProgress.toString() as any,
      habitStreak,
      overallScore,
    } as any);
  }

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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));

  const todayStr = new Date().toDateString();

  return allTasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (t.dueDate && new Date(t.dueDate).toDateString() === todayStr) return true;
    return false;
  });
}

export async function getOverdueTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allTasks = await getTasks(userId);
  const activeTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const activeTaskIds = activeTasks.map(t => t.id);

  if (activeTaskIds.length === 0) return [];

  const deps = await db.select().from(taskDependencies)
    .where(inArray(taskDependencies.taskId, activeTaskIds));

  const blocked: any[] = [];

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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));
}

export async function getTasksByGoal(goalId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const goalTasks = await db.select().from(tasks)
    .where(and(eq(tasks.goalId, goalId), eq(tasks.userId, userId)));

  return { tasks: goalTasks };
}

export async function getHierarchy(userId: number) {
  const allAreas = await getLifeAreas(userId);
  const allGoals = await getGoals(userId);
  const allProjects = await getProjects(userId);
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(lifeAreas).values(area);
  await logActivity(area.userId, 'lifeArea', 0, 'created', undefined, area.name);
  return result;
}

export async function getLifeAreas(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(lifeAreas).where(eq(lifeAreas.userId, userId));
}

export async function getLifeAreaById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(lifeAreas).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId)));
  return result[0];
}

export async function updateLifeArea(id: number, userId: number, data: Partial<typeof lifeAreas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(lifeAreas).set(data).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId)));
}

export async function deleteLifeArea(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const oldArea = await getLifeAreaById(id, userId);
  const result = await db.delete(lifeAreas).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId)));
  if (oldArea) {
    await logActivity(userId, 'lifeArea', id, 'deleted', oldArea.name, undefined);
  }
  return result;
}

// ============ Tag Operations ============

export async function createTag(tag: typeof tags.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(tags).values(tag);
}

export async function getTags(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(tags).where(eq(tags.userId, userId));
}

export async function updateTag(id: number, userId: number, data: Partial<typeof tags.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

export async function deleteTag(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

// ============ Entity Tag Operations ============

export async function addEntityTag(data: typeof entityTags.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(entityTags).values(data);
}

export async function removeEntityTag(tagId: number, entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(entityTags).where(
    and(eq(entityTags.tagId, tagId), eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId))
  );
}

export async function getEntityTags(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(entityTags).where(
    and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId))
  );
}

// ============ Subtask Operations ============

export async function createSubtask(subtask: typeof subtasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(subtasks).values(subtask);
}

export async function getSubtasks(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
}

export async function updateSubtask(id: number, data: Partial<typeof subtasks.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const oldSubtask = await db.select().from(subtasks).where(eq(subtasks.id, id));
  const result = await db.update(subtasks).set(data).where(eq(subtasks.id, id));

  if (data.isCompleted && oldSubtask.length > 0) {
    const parentTaskId = oldSubtask[0].taskId;
    const allSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, parentTaskId));
    if (allSubtasks.length > 0 && allSubtasks.every(s => s.isCompleted)) {
      await db.update(tasks).set({ status: 'completed', progress: 100 }).where(eq(tasks.id, parentTaskId));
    }
  }

  return result;
}

export async function deleteSubtask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(subtasks).where(eq(subtasks.id, id));
}

// ============ Task Dependency Operations ============

export async function createTaskDependency(data: typeof taskDependencies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(taskDependencies).values(data);
}

export async function getTaskDependencies(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
}

export async function getTaskDependsOn(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(taskDependencies).where(eq(taskDependencies.dependsOnId, taskId));
}

export async function deleteTaskDependency(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(taskDependencies).where(eq(taskDependencies.id, id));
}
