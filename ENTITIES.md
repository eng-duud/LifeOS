# Life OS — Entity Relationships & Linking Guide

> A complete reference for how every entity connects, how to query linked data, and how to upgrade to best-in-class linking patterns used by Notion, Todoist, Capacities, and other top productivity apps.

---

## Table of Contents

1. [Current Schema](#current-schema)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [All Relationships (Current)](#all-relationships-current)
4. [Querying Linked Data](#querying-linked-data)
5. [Best-in-Class Patterns](#best-in-class-patterns)
6. [Upgrade Plan](#upgrade-plan)
7. [New Tables (Migration)](#new-tables-migration)
8. [New Relationship Examples](#new-relationship-examples)

---

## Current Schema

| # | Entity | Table | Purpose |
|---|--------|-------|---------|
| 1 | **Tasks** | `tasks` | Individual tasks to complete |
| 2 | **Goals** | `goals` | Long-term objectives |
| 3 | **Projects** | `projects` | Grouped work toward goals |
| 4 | **Habits** | `habits` | Recurring daily/weekly/monthly habits |
| 5 | **Habit Completions** | `habitCompletions` | Each time a habit is completed |
| 6 | **Books** | `books` | Reading tracker |
| 7 | **Plans** | `plans` | Daily/weekly/monthly planning |
| 8 | **Resources** | `resources` | Links/files attached to plans or goals |
| 9 | **Statistics** | `statistics` | Daily aggregated metrics |
| 10 | **Health Status** | `healthStatus` | Overall productivity health score |
| 11 | **Activity Log** | `activityLog` | Audit trail of all changes |

---

## Entity Relationship Diagram

### Current State

```
                              ┌─────────────────┐
                              │     goals       │
                              │─────────────────│
                              │ id (PK)         │
                              │ userId          │
                              │ title           │
                              │ status          │
                              │ progress        │
                              └────────┬────────┘
                                       │
                       ┌───────────────┼───────────────┐
                       │ 1:N           │ 1:N           │ 1:N
                       ▼               ▼               ▼
              ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
              │    tasks    │  │  resources  │  │  statistics │
              │─────────────│  │─────────────│  │─────────────│
              │ goalId (FK) │  │ goalId (FK) │  │ (aggregated │
              │ projectId   │  │ planId (FK) │  │  per day)   │
              │ habitId     │  └─────────────┘  └─────────────┘
              └──────┬──────┘
                     │
       ┌─────────────┼──────────────┐
       │ 1:N         │ 1:N          │ 1:N
       ▼             ▼              ▼
┌─────────────┐ ┌──────────┐ ┌──────────┐
│  projects   │ │  plans   │ │  books   │
│─────────────│ │──────────│ │──────────│
│ id (PK)     │ │ id (PK)  │ │ id (PK)  │
│ userId      │ │ userId   │ │ userId   │
│ title       │ │ title    │ │ title    │
│ status      │ │ planType │ │ status   │
│ progress    │ │ status   │ │ rating   │
└─────────────┘ └──────────┘ └──────────┘

┌─────────────┐    ┌───────────────────┐    ┌──────────────┐
│   habits    │───▶│habitCompletions   │    │ activityLog  │
│─────────────│    │───────────────────│    │──────────────│
│ id (PK)     │    │ habitId (FK)      │    │ entityType   │
│ userId      │    │ userId            │    │ entityId     │
│ title       │    │ completedAt       │    │ action       │
│ frequency   │    └───────────────────┘    │ oldValue     │
│ streak      │                             │ newValue     │
└─────────────┘                             └──────────────┘

┌──────────────┐
│ healthStatus │
│──────────────│
│ id (PK)      │
│ userId       │
│ status       │
│ overallScore │
└──────────────┘
```

### Upgrade Target (Best-in-Class)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LIFE AREAS                                    │
│  (Health, Career, Finance, Learning, Relationships, Personal)       │
│  id │ userId │ name │ icon │ color │ description                    │
└────────────┬─────────────────────────────────────────────────────────┘
             │ 1:N
    ┌────────┴──────────────────────────────────────────────┐
    │                                                        │
    ▼                                                        ▼
┌──────────┐                                          ┌──────────┐
│  goals   │◄────── goals.parentGoalId (self-ref)     │ projects │
│──────────│                                          │──────────│
│ areaId   │──┐                                       │ areaId   │
│ parentGoalId│  (self-ref for sub-goals)             │ goalId   │
└──────────┘  │                                       └────┬─────┘
              │                                            │ 1:N
              │    ┌───────────────────────────────────────┘
              │    │
              ▼    ▼
         ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
         │    tasks    │────▶│  subtasks    │     │ dependencies │
         │─────────────│     │──────────────│     │──────────────│
         │ goalId (FK) │     │ taskId (FK)  │     │ taskId       │
         │ projectId   │     │ title        │     │ dependsOnId  │
         │ habitId     │     │ isCompleted  │     │ type         │
         │ planId      │     └──────────────┘     └──────────────┘
         │ bookId      │
         └──────┬──────┘
                │
    ┌───────────┼────────────┬──────────────┐
    │           │            │              │
    ▼           ▼            ▼              ▼
┌────────┐ ┌────────┐ ┌──────────┐  ┌───────────┐
│ habits │ │ books  │ │  plans   │  │ resources │
│────────│ │────────│ │──────────│  │───────────│
│ areaId │ │ areaId │ │ areaId   │  │ taskId    │
└───┬────┘ └────────┘ └──────────┘  │ projectId │
    │                                │ goalId    │
    ▼                                │ planId    │
┌───────────────────┐                │ habitId   │
│habitCompletions   │                │ bookId    │
└───────────────────┘                └───────────┘

┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  tags    │───▶│ entityTags   │    │ activityLog  │
│──────────│    │──────────────│    │──────────────│
│ name     │    │ tagId (FK)   │    │ entityType   │
│ color    │    │ entityType   │    │ entityId     │
│ userId   │    │ entityId     │    │ action       │
└──────────┘    └──────────────┘    └──────────────┘
```

---

## All Relationships (Current)

### 1. Tasks → Goals (`tasks.goalId` → `goals.id`)

A task can belong to a goal. Links daily work to long-term objectives.

**Schema** (`drizzle/schema.ts:37`):
```ts
goalId: integer("goalId"),  // nullable FK
```

**Create a task linked to a goal:**
```ts
await trpc.tasks.create.mutate({
  title: "Read 30 pages",
  goalId: 1,
  projectId: 2,
});
```

**Query tasks for a specific goal:**
```ts
const allTasks = await trpc.tasks.list.query();
const goalTasks = allTasks.filter(t => t.goalId === goalId);
```

---

### 2. Tasks → Projects (`tasks.projectId` → `projects.id`)

A task can belong to a project. Projects group related tasks together.

**Schema** (`drizzle/schema.ts:38`):
```ts
projectId: integer("projectId"),  // nullable FK
```

**Create a task linked to a project:**
```ts
await trpc.tasks.create.mutate({
  title: "Design wireframes",
  projectId: 1,
});
```

---

### 3. Tasks → Habits (`tasks.habitId` → `habits.id`)

A task can be linked to a habit, useful for tracking habit-related work.

**Schema** (`drizzle/schema.ts:39`):
```ts
habitId: integer("habitId"),  // nullable FK
```

---

### 4. Habit Completions → Habits (`habitCompletions.habitId` → `habits.id`)

Each time you complete a habit, a completion record is created. One-to-many.

**Schema** (`drizzle/schema.ts:127`):
```ts
habitId: integer("habitId").notNull(),
```

**Complete a habit** (`server/db.ts:187-211`):
```ts
// Inserts into habitCompletions AND updates the habit's streak
await db.completeHabit(habitId, userId);
```

**Get all completions for a habit:**
```ts
const completions = await trpc.habits.completions.query({ habitId: 1 });
```

---

### 5. Resources → Plans (`resources.planId` → `plans.id`)

A resource (link, file, note) can be attached to a plan.

**Schema** (`drizzle/schema.ts:195`):
```ts
planId: integer("planId"),  // nullable FK
```

---

### 6. Resources → Goals (`resources.goalId` → `goals.id`)

A resource can also be attached to a goal.

**Schema** (`drizzle/schema.ts:196`):
```ts
goalId: integer("goalId"),  // nullable FK
```

---

### 7. Activity Log → Any Entity (polymorphic)

The activity log references any entity type by name + ID. Not a real FK — polymorphic association.

**Schema** (`drizzle/schema.ts:264-265`):
```ts
entityType: varchar("entityType", { length: 100 }).notNull(),
entityId: integer("entityId").notNull(),
action: varchar("action", { length: 50 }).notNull(),
```

**Log an activity:**
```ts
await db.logActivity(userId, "task", 42, "update",
  '{"status":"pending"}',
  '{"status":"completed"}'
);
```

---

### 8. Statistics & Health Status (derived)

Aggregated tables computed from other entities:

- **Statistics**: one row per day, counts from tasks/goals/projects/habits/books
- **Health Status**: single row per user, computed score from tasks/goals/habits

---

## All Foreign Key Links (Summary)

| Source Table | FK Column | Target Table | Relationship |
|---|---|---|---|
| `tasks` | `goalId` | `goals` | Many Tasks → One Goal |
| `tasks` | `projectId` | `projects` | Many Tasks → One Project |
| `tasks` | `habitId` | `habits` | Many Tasks → One Habit |
| `habitCompletions` | `habitId` | `habits` | Many Completions → One Habit |
| `resources` | `planId` | `plans` | Many Resources → One Plan |
| `resources` | `goalId` | `goals` | Many Resources → One Goal |
| `activityLog` | `entityType` + `entityId` | *(any)* | Polymorphic (not a real FK) |

---

## Querying Linked Data

### Join Tasks with Goals
```ts
import { tasks, goals } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const tasksWithGoals = await db
  .select({ task: tasks, goal: goals })
  .from(tasks)
  .leftJoin(goals, eq(tasks.goalId, goals.id));
```

### Get a Goal with All Its Tasks
```ts
const goalWithTasks = await db
  .select()
  .from(goals)
  .where(eq(goals.id, goalId))
  .leftJoin(tasks, eq(goals.id, tasks.goalId));
```

### Get a Habit with All Its Completions
```ts
const habitWithCompletions = await db
  .select()
  .from(habits)
  .where(eq(habits.id, habitId))
  .leftJoin(habitCompletions, eq(habits.id, habitCompletions.habitId));
```

### Get a Plan with Its Resources
```ts
const planWithResources = await db
  .select()
  .from(plans)
  .where(eq(plans.id, planId))
  .leftJoin(resources, eq(plans.id, resources.planId));
```

### Get Everything Connected to a Goal
```ts
const goalFull = await db.query.goals.findFirst({
  where: eq(goals.id, goalId),
  with: {
    tasks: true,
    resources: true,
  },
});
```

---

## Best-in-Class Patterns

These patterns are used by the top productivity apps (Notion, Todoist, Capacities, Benji, Keez, 8Space, and others).

### Pattern 1: Hierarchical Life Areas

Top apps organize everything under **Life Areas** (Health, Career, Finance, Learning, Relationships, Personal). Every entity belongs to an area.

```
Life Areas → Goals → Projects → Tasks
                    → Habits
                    → Books
```

**Why**: Without areas, everything is flat. With areas, you can see "How am I doing in Health?" at a glance.

---

### Pattern 2: Subtasks (Self-Referencing)

Tasks can have child tasks. A task like "Launch website" breaks into "Buy domain", "Deploy", "Configure DNS", etc.

```
tasks.parentTaskId → tasks.id  (self-referencing FK)
```

**Used by**: Todoist, Notion, TickTick, Benji, 8Space

---

### Pattern 3: Task Dependencies

Task B can depend on Task A. Task B cannot start until Task A is done.

```
task_dependencies.taskId → tasks.id
task_dependencies.dependsOnId → tasks.id
task_dependencies.type → "blocks" | "blocked_by" | "relates_to"
```

**Used by**: Notion, Jira, Linear, 8Space

---

### Pattern 4: Tags (Many-to-Many)

A tag system lets you categorize ANY entity with custom labels. One task can have multiple tags; one tag can apply to many entities.

```
tags (id, name, color, userId)
entityTags (tagId, entityType, entityId)
```

**Used by**: Notion, Todoist, TickTick, Capacities

---

### Pattern 5: Bidirectional Relations

When Task A links to Goal B, Goal B should automatically show Task A in its list. Currently your schema is one-way only.

**Used by**: Notion (Relation properties are two-way by default)

---

### Pattern 6: Resources Link to Everything

Currently `resources` only links to `plans` and `goals`. Best apps let you attach resources (links, files, notes) to tasks, projects, habits, and books too.

**Used by**: Capacities, Notion, Awenora

---

### Pattern 7: Rollup / Computed Fields

When a goal has 10 tasks and 7 are completed, the goal's progress should auto-calculate to 70%. Currently progress is manually set.

**Used by**: Notion (Rollup properties), Todoist (project completion %)

---

## Upgrade Plan

Here is the recommended upgrade path, ordered by impact and complexity.

### Phase 1: Life Areas + Tags (High Impact, Low Complexity)

#### New Table: `lifeAreas`
```sql
CREATE TABLE "lifeAreas" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "name" varchar(100) NOT NULL,
  "icon" varchar(50),
  "color" varchar(7),        -- hex color like "#FF5733"
  "description" text,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "lifeAreas_userId_idx" ON "lifeAreas" ("userId");
```

#### New Table: `tags`
```sql
CREATE TABLE "tags" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "name" varchar(100) NOT NULL,
  "color" varchar(7),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "tags_userId_idx" ON "tags" ("userId");
```

#### New Table: `entityTags` (junction table)
```sql
CREATE TABLE "entityTags" (
  "id" serial PRIMARY KEY,
  "tagId" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "entityType" varchar(50) NOT NULL,  -- "task", "goal", "project", "habit", "book", "plan"
  "entityId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("tagId", "entityType", "entityId")
);

CREATE INDEX "entityTags_entity_idx" ON "entityTags" ("entityType", "entityId");
CREATE INDEX "entityTags_tagId_idx" ON "entityTags" ("tagId");
```

#### Add `areaId` to existing tables
```sql
ALTER TABLE "goals" ADD COLUMN "areaId" integer REFERENCES "lifeAreas"("id") ON DELETE SET NULL;
ALTER TABLE "projects" ADD COLUMN "areaId" integer REFERENCES "lifeAreas"("id") ON DELETE SET NULL;
ALTER TABLE "habits" ADD COLUMN "areaId" integer REFERENCES "lifeAreas"("id") ON DELETE SET NULL;
ALTER TABLE "books" ADD COLUMN "areaId" integer REFERENCES "lifeAreas"("id") ON DELETE SET NULL;
ALTER TABLE "plans" ADD COLUMN "areaId" integer REFERENCES "lifeAreas"("id") ON DELETE SET NULL;
```

---

### Phase 2: Subtasks + Dependencies (High Impact, Medium Complexity)

#### New Table: `subtasks`
```sql
CREATE TABLE "subtasks" (
  "id" serial PRIMARY KEY,
  "taskId" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "isCompleted" boolean DEFAULT false NOT NULL,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "subtasks_taskId_idx" ON "subtasks" ("taskId");
```

#### New Table: `taskDependencies`
```sql
CREATE TYPE "dependency_type" AS ENUM ('blocks', 'blocked_by', 'relates_to');

CREATE TABLE "taskDependencies" (
  "id" serial PRIMARY KEY,
  "taskId" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "dependsOnId" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "type" "dependency_type" DEFAULT 'blocks' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("taskId", "dependsOnId", "type"),
  CHECK ("taskId" <> "dependsOnId")
);

CREATE INDEX "taskDependencies_task_idx" ON "taskDependencies" ("taskId");
CREATE INDEX "taskDependencies_dependsOn_idx" ON "taskDependencies" ("dependsOnId");
```

#### Add `parentTaskId` to tasks (self-referencing)
```sql
ALTER TABLE "tasks" ADD COLUMN "parentTaskId" integer REFERENCES "tasks"("id") ON DELETE SET NULL;
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks" ("parentTaskId");
```

---

### Phase 3: Expand Resources + Bidirectional Links (Medium Impact, Low Complexity)

#### Add more FK columns to `resources`
```sql
ALTER TABLE "resources" ADD COLUMN "taskId" integer REFERENCES "tasks"("id") ON DELETE SET NULL;
ALTER TABLE "resources" ADD COLUMN "projectId" integer REFERENCES "projects"("id") ON DELETE SET NULL;
ALTER TABLE "resources" ADD COLUMN "habitId" integer REFERENCES "habits"("id") ON DELETE SET NULL;
ALTER TABLE "resources" ADD COLUMN "bookId" integer REFERENCES "books"("id") ON DELETE SET NULL;
```

#### Add `planId` and `bookId` to tasks
```sql
ALTER TABLE "tasks" ADD COLUMN "planId" integer REFERENCES "plans"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD COLUMN "bookId" integer REFERENCES "books"("id") ON DELETE SET NULL;
```

---

## New Tables (Migration)

### Summary of All New Tables

| Table | Purpose | Key Relationships |
|---|---|---|
| `lifeAreas` | Top-level organization (Health, Career, etc.) | Has many goals, projects, habits, books, plans |
| `tags` | Custom labels for any entity | Many-to-many via `entityTags` |
| `entityTags` | Junction: which tags apply to which entities | Links tags to any entity type |
| `subtasks` | Checklist items within a task | Belongs to one task |
| `taskDependencies` | Task B blocks/is-blocked-by Task A | Links two tasks |
| `taskAssignees` | (Future) Multiple people per task | Many-to-many |

---

## New Relationship Examples

### Create a Life Area
```ts
await db.insert(lifeAreas).values({
  userId: 1,
  name: "Health",
  icon: "heart",
  color: "#FF5733",
  description: "Physical and mental well-being",
});
```

### Create a Goal Inside a Life Area
```ts
await db.insert(goals).values({
  userId: 1,
  title: "Run a marathon",
  areaId: 1,  // linked to "Health" area
  status: "active",
});
```

### Create a Project Linked to a Goal
```ts
await db.insert(projects).values({
  userId: 1,
  title: "Marathon Training Plan",
  areaId: 1,
  goalId: 1,  // linked to "Run a marathon"
  status: "in_progress",
});
```

### Create Tasks Inside a Project with Subtasks
```ts
const task = await db.insert(tasks).values({
  userId: 1,
  title: "Week 1: Run 5K",
  projectId: 1,
  goalId: 1,
  areaId: 1,
}).returning();

await db.insert(subtasks).values([
  { taskId: task[0].id, title: "Warm up 5 min" },
  { taskId: task[0].id, title: "Run 5K continuous" },
  { taskId: task[0].id, title: "Cool down stretch" },
]);
```

### Tag a Task
```ts
const tag = await db.insert(tags).values({
  userId: 1,
  name: "urgent",
  color: "#FF0000",
}).returning();

await db.insert(entityTags).values({
  tagId: tag[0].id,
  entityType: "task",
  entityId: 42,
});
```

### Set a Task Dependency
```ts
await db.insert(taskDependencies).values({
  taskId: 2,       // "Deploy website"
  dependsOnId: 1,  // "Buy domain" must come first
  type: "blocks",
});
```

### Attach a Resource to a Task
```ts
await db.insert(resources).values({
  userId: 1,
  title: "Deployment Guide",
  resourceType: "link",
  url: "https://docs.example.com/deploy",
  taskId: 42,  // now resources can link to tasks too
});
```

### Query: Get Everything in a Life Area
```ts
const areaWithAll = await db.query.lifeAreas.findFirst({
  where: eq(lifeAreas.id, 1),
  with: {
    goals: {
      with: {
        projects: { with: { tasks: true } },
        resources: true,
      },
    },
    habits: true,
    books: true,
    plans: true,
  },
});
```

### Query: Get All Tags for a Task
```ts
const taskWithTags = await db
  .select({
    task: tasks,
    tag: tags,
  })
  .from(tasks)
  .innerJoin(entityTags, and(
    eq(entityTags.entityType, "task"),
    eq(entityTags.entityId, taskId)
  ))
  .innerJoin(tags, eq(entityTags.tagId, tags.id))
  .where(eq(tasks.id, taskId));
```

### Query: Get All Blocked Tasks
```ts
const blockedTasks = await db
  .select({
    task: tasks,
    blockedBy: taskDependencies,
  })
  .from(tasks)
  .innerJoin(taskDependencies, eq(tasks.id, taskDependencies.taskId))
  .where(eq(taskDependencies.type, "blocked_by"));
```

### Query: Count Tasks Per Tag
```ts
const tagCounts = await db
  .select({
    tag: tags,
    count: count(entityTags.id),
  })
  .from(tags)
  .leftJoin(entityTags, eq(tags.id, entityTags.tagId))
  .where(eq(tags.userId, 1))
  .groupBy(tags.id);
```

### Auto-Calculate Goal Progress from Tasks
```ts
async function calculateGoalProgress(goalId: number) {
  const goalTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
  if (goalTasks.length === 0) return 0;
  const completed = goalTasks.filter(t => t.status === "completed").length;
  return Math.round((completed / goalTasks.length) * 100);
}

// Update goal progress automatically
const progress = await calculateGoalProgress(goalId);
await db.update(goals).set({ progress }).where(eq(goals.id, goalId));
```

---

## Full Entity Hierarchy (Best Practice)

```
Life Area (Health)
  ├── Goal: Run a marathon
  │     ├── Project: Marathon Training Plan
  │     │     ├── Task: Week 1 - Run 5K
  │     │     │     ├── Subtask: Warm up
  │     │     │     ├── Subtask: Run 5K
  │     │     │     └── Subtask: Cool down
  │     │     │     └── Tags: [#urgent, #fitness]
  │     │     │     └── Resources: [Training Guide PDF]
  │     │     ├── Task: Week 2 - Run 8K
  │     │     └── Task: Week 3 - Run 10K (blocked_by: Week 2)
  │     ├── Goal: Lose 5kg (sub-goal)
  │     └── Resources: [Marathon checklist]
  ├── Habit: Morning run
  │     └── Completions: [Mon, Wed, Fri, ...]
  ├── Book: Born to Run
  └── Plan: Weekly workout schedule

Life Area (Career)
  ├── Goal: Get promoted
  │     ├── Project: Q3 Feature Launch
  │     │     ├── Task: Design mockups
  │     │     ├── Task: Implement backend (blocked_by: Design mockups)
  │     │     └── Task: Write tests
  │     └── Resources: [Performance review notes]
  ├── Habit: Daily standup
  └── Book: The Manager's Path
```

---

## Migration Checklist

- [ ] Create `lifeAreas` table
- [ ] Create `tags` table
- [ ] Create `entityTags` junction table
- [ ] Create `subtasks` table
- [ ] Create `taskDependencies` table
- [ ] Add `areaId` FK to goals, projects, habits, books, plans
- [ ] Add `parentTaskId` FK to tasks (self-ref for subtasks)
- [ ] Add `planId` and `bookId` FK to tasks
- [ ] Add `taskId`, `projectId`, `habitId`, `bookId` FK to resources
- [ ] Create Drizzle schema definitions for new tables
- [ ] Create tRPC routers for lifeAreas, tags, subtasks, dependencies
- [ ] Update existing routers to support new FK columns
- [ ] Create migration SQL via `drizzle-kit push`
