import { 
  serial, 
  integer,
  pgEnum, 
  pgTable, 
  text, 
  timestamp, 
  varchar,
  numeric,
  boolean,
  index
} from "drizzle-orm/pg-core";

// Define Enums
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "cancelled"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "on_hold", "cancelled"]);
export const projectStatusEnum = pgEnum("project_status", ["planning", "in_progress", "completed", "on_hold", "cancelled"]);
export const habitFrequencyEnum = pgEnum("habit_frequency", ["daily", "weekly", "monthly"]);
export const bookStatusEnum = pgEnum("book_status", ["to_read", "reading", "completed", "abandoned"]);
export const planTypeEnum = pgEnum("plan_type", ["daily", "weekly", "monthly"]);
export const planStatusEnum = pgEnum("plan_status", ["draft", "active", "completed", "cancelled"]);
export const healthStatusEnum = pgEnum("health_status", ["on_track", "at_risk", "needs_attention"]);
export const dependencyTypeEnum = pgEnum("dependency_type", ["blocks", "blocked_by", "relates_to"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/**
 * Users table - legacy table
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Tasks table - for managing individual tasks
 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  goalId: integer("goalId"),
  projectId: integer("projectId"),
  habitId: integer("habitId"),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  planId: integer("planId"),
  bookId: integer("bookId"),
  parentTaskId: integer("parentTaskId"),
  estimatedHours: numeric("estimatedHours", { precision: 5, scale: 2 }),
  actualHours: numeric("actualHours", { precision: 5, scale: 2 }),
  progress: integer("progress").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("tasks_userId_idx").on(table.userId),
  projectIdIdx: index("tasks_projectId_idx").on(table.projectId),
  goalIdIdx: index("tasks_goalId_idx").on(table.goalId),
  areaIdIdx: index("tasks_areaId_idx").on(table.areaId),
  parentTaskIdIdx: index("tasks_parentTaskId_idx").on(table.parentTaskId),
  planIdIdx: index("tasks_planId_idx").on(table.planId),
  bookIdIdx: index("tasks_bookId_idx").on(table.bookId),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Goals table - for managing long-term goals
 */
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  status: goalStatusEnum("status").default("active").notNull(),
  progress: integer("progress").default(0),
  targetDate: timestamp("targetDate"),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("goals_userId_idx").on(table.userId),
  areaIdIdx: index("goals_areaId_idx").on(table.areaId),
}));

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Projects table - for managing projects
 */
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("planning").notNull(),
  progress: integer("progress").default(0),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  completedAt: timestamp("completedAt"),
  priority: priorityEnum("priority").default("medium").notNull(),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  goalId: integer("goalId").references(() => goals.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("projects_userId_idx").on(table.userId),
  areaIdIdx: index("projects_areaId_idx").on(table.areaId),
  goalIdIdx: index("projects_goalId_idx").on(table.goalId),
}));

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Habits table - for tracking daily habits
 */
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  frequency: habitFrequencyEnum("frequency").default("daily").notNull(),
  category: varchar("category", { length: 100 }),
  currentStreak: integer("currentStreak").default(0),
  longestStreak: integer("longestStreak").default(0),
  totalCompletions: integer("totalCompletions").default(0),
  lastCompletedAt: timestamp("lastCompletedAt"),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("habits_userId_idx").on(table.userId),
  areaIdIdx: index("habits_areaId_idx").on(table.areaId),
}));

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

/**
 * Habit completions - track daily habit completions
 */
export const habitCompletions = pgTable("habitCompletions", {
  id: serial("id").primaryKey(),
  habitId: integer("habitId").notNull(),
  userId: integer("userId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  habitIdIdx: index("habitCompletions_habitId_idx").on(table.habitId),
  userIdIdx: index("habitCompletions_userId_idx").on(table.userId),
}));

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = typeof habitCompletions.$inferInsert;

/**
 * Books table - for tracking reading
 */
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  totalPages: integer("totalPages"),
  currentPage: integer("currentPage").default(0),
  status: bookStatusEnum("status").default("to_read").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("books_userId_idx").on(table.userId),
  areaIdIdx: index("books_areaId_idx").on(table.areaId),
}));

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/**
 * Plans table - for planning days/weeks/months
 */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  planType: planTypeEnum("planType").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  status: planStatusEnum("status").default("draft").notNull(),
  areaId: integer("areaId").references(() => lifeAreas.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("plans_userId_idx").on(table.userId),
  areaIdIdx: index("plans_areaId_idx").on(table.areaId),
}));

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Resources table - for linking resources to plans/goals
 */
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  resourceType: varchar("resourceType", { length: 100 }),
  url: varchar("url", { length: 500 }),
  planId: integer("planId"),
  goalId: integer("goalId"),
  taskId: integer("taskId"),
  projectId: integer("projectId"),
  habitId: integer("habitId"),
  bookId: integer("bookId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("resources_userId_idx").on(table.userId),
  planIdIdx: index("resources_planId_idx").on(table.planId),
  goalIdIdx: index("resources_goalId_idx").on(table.goalId),
  taskIdIdx: index("resources_taskId_idx").on(table.taskId),
  projectIdIdx: index("resources_projectId_idx").on(table.projectId),
  habitIdIdx: index("resources_habitId_idx").on(table.habitId),
  bookIdIdx: index("resources_bookId_idx").on(table.bookId),
}));

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/**
 * Statistics table - for tracking overall statistics
 */
export const statistics = pgTable("statistics", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  date: timestamp("date").notNull(),
  tasksCompleted: integer("tasksCompleted").default(0),
  tasksPending: integer("tasksPending").default(0),
  goalsCompleted: integer("goalsCompleted").default(0),
  goalsActive: integer("goalsActive").default(0),
  projectsCompleted: integer("projectsCompleted").default(0),
  projectsActive: integer("projectsActive").default(0),
  habitsCompleted: integer("habitsCompleted").default(0),
  habitsTracked: integer("habitsTracked").default(0),
  booksCompleted: integer("booksCompleted").default(0),
  booksReading: integer("booksReading").default(0),
  hoursWorked: numeric("hoursWorked", { precision: 5, scale: 2 }).default("0"),
  productivityScore: integer("productivityScore").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("statistics_userId_idx").on(table.userId),
  dateIdx: index("statistics_date_idx").on(table.date),
}));

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;

/**
 * Health Status table - for tracking overall health
 */
export const healthStatus = pgTable("healthStatus", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  status: healthStatusEnum("status").default("on_track").notNull(),
  taskCompletionRate: numeric("taskCompletionRate", { precision: 5, scale: 2 }).default("0"),
  goalProgress: numeric("goalProgress", { precision: 5, scale: 2 }).default("0"),
  habitStreak: integer("habitStreak").default(0),
  overallScore: integer("overallScore").default(0),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("healthStatus_userId_idx").on(table.userId),
}));

export type HealthStatus = typeof healthStatus.$inferSelect;
export type InsertHealthStatus = typeof healthStatus.$inferInsert;

/**
 * Activity Log table - for tracking all changes
 */
export const activityLog = pgTable("activityLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("activityLog_userId_idx").on(table.userId),
  entityTypeIdx: index("activityLog_entityType_idx").on(table.entityType),
  createdAtIdx: index("activityLog_createdAt_idx").on(table.createdAt),
}));

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Life Areas table - top-level organization
 */
export const lifeAreas = pgTable("lifeAreas", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index("lifeAreas_userId_idx").on(table.userId),
}));

export type LifeArea = typeof lifeAreas.$inferSelect;
export type InsertLifeArea = typeof lifeAreas.$inferInsert;

/**
 * Tags table - custom labels for any entity
 */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("tags_userId_idx").on(table.userId),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Entity Tags junction table
 */
export const entityTags = pgTable("entityTags", {
  id: serial("id").primaryKey(),
  tagId: integer("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: integer("entityId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tagIdIdx: index("entityTags_tagId_idx").on(table.tagId),
  entityIdx: index("entityTags_entity_idx").on(table.entityType, table.entityId),
}));

export type EntityTag = typeof entityTags.$inferSelect;
export type InsertEntityTag = typeof entityTags.$inferInsert;

/**
 * Subtasks table - checklist items within a task
 */
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index("subtasks_taskId_idx").on(table.taskId),
}));

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof subtasks.$inferInsert;

/**
 * Task Dependencies table
 */
export const taskDependencies = pgTable("taskDependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnId: integer("dependsOnId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  type: dependencyTypeEnum("type").default("blocks").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index("taskDependencies_taskId_idx").on(table.taskId),
  dependsOnIdx: index("taskDependencies_dependsOnId_idx").on(table.dependsOnId),
}));

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;
