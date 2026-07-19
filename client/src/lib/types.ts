// ── Entity types from the database schema ─────────────────────────────────────
// These reflect the Drizzle schema (16 tables)

export interface LifeArea {
  id: number;
  userId: number;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  sortOrder: number | null;
  healthScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Goal {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  progress: number | null;
  status: string | null;
  category: string | null;
  targetDate: string | null;
  areaId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Project {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
  areaId: number | null;
  goalId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  progress: number | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  goalId: number | null;
  projectId: number | null;
  habitId: number | null;
  areaId: number | null;
  planId: number | null;
  bookId: number | null;
  parentTaskId: number | null;
  sortOrder: number | null;
  isInbox: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean | null;
  sortOrder: number | null;
  createdAt: string | null;
}

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnId: number;
  type: string | null;
}

export interface Habit {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  frequency: string | null;
  category: string | null;
  areaId: number | null;
  createdAt: string | null;
}

export interface HabitCompletion {
  id: number;
  habitId: number;
  completedDate: string;
  userId: number;
}

export interface Book {
  id: number;
  userId: number;
  title: string;
  author: string | null;
  totalPages: number | null;
  currentPage: number | null;
  status: string | null;
  rating: number | null;
  notes: string | null;
  areaId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Plan {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  planType: string;
  startDate: string;
  endDate: string | null;
  status: string | null;
  areaId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  userId: number;
}

export interface EntityTag {
  id: number;
  tagId: number;
  entityType: string;
  entityId: number;
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  totalGoals: number;
  completedGoals: number;
  totalHabits: number;
  activeHabits: number;
  totalBooks: number;
  readingBooks: number;
}

export interface HealthStatus {
  healthScore: number;
  areas: Array<{
    id: number;
    name: string;
    healthScore: number | null;
  }>;
}

export interface ReviewData {
  tasksSummary: {
    completed: number;
    pending: number;
    overdue: number;
  };
  goalsAtRisk: Array<Goal & { progress: number | null }>;
}

export interface StatisticsData {
  completionRate: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  tasksByPriority: Array<{ priority: string; count: number }>;
  tasksByArea: Array<{ areaName: string; count: number }>;
  weeklyCompletion: Array<{ date: string; count: number }>;
}
