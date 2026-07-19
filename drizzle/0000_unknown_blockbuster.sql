CREATE TYPE "public"."book_status" AS ENUM('to_read', 'reading', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."dependency_type" AS ENUM('blocks', 'blocked_by', 'relates_to');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."health_status" AS ENUM('on_track', 'at_risk', 'needs_attention');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'in_progress', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "activityLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"oldValue" text,
	"newValue" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255),
	"totalPages" integer,
	"currentPage" integer DEFAULT 0,
	"status" "book_status" DEFAULT 'to_read' NOT NULL,
	"rating" integer,
	"notes" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"areaId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entityTags" (
	"id" serial PRIMARY KEY NOT NULL,
	"tagId" integer NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0,
	"targetDate" timestamp,
	"areaId" integer,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habitCompletions" (
	"id" serial PRIMARY KEY NOT NULL,
	"habitId" integer NOT NULL,
	"userId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"frequency" "habit_frequency" DEFAULT 'daily' NOT NULL,
	"category" varchar(100),
	"currentStreak" integer DEFAULT 0,
	"longestStreak" integer DEFAULT 0,
	"totalCompletions" integer DEFAULT 0,
	"lastCompletedAt" timestamp,
	"areaId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "healthStatus" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"status" "health_status" DEFAULT 'on_track' NOT NULL,
	"taskCompletionRate" numeric(5, 2) DEFAULT '0',
	"goalProgress" numeric(5, 2) DEFAULT '0',
	"habitStreak" integer DEFAULT 0,
	"overallScore" integer DEFAULT 0,
	"lastUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeAreas" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(50),
	"color" varchar(7),
	"description" text,
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"planType" "plan_type" NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"areaId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"progress" integer DEFAULT 0,
	"startDate" timestamp,
	"endDate" timestamp,
	"completedAt" timestamp,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"areaId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"resourceType" varchar(100),
	"url" varchar(500),
	"planId" integer,
	"goalId" integer,
	"taskId" integer,
	"projectId" integer,
	"habitId" integer,
	"bookId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"tasksCompleted" integer DEFAULT 0,
	"tasksPending" integer DEFAULT 0,
	"goalsCompleted" integer DEFAULT 0,
	"goalsActive" integer DEFAULT 0,
	"projectsCompleted" integer DEFAULT 0,
	"projectsActive" integer DEFAULT 0,
	"habitsCompleted" integer DEFAULT 0,
	"habitsTracked" integer DEFAULT 0,
	"booksCompleted" integer DEFAULT 0,
	"booksReading" integer DEFAULT 0,
	"hoursWorked" numeric(5, 2) DEFAULT '0',
	"productivityScore" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taskDependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskId" integer NOT NULL,
	"dependsOnId" integer NOT NULL,
	"type" "dependency_type" DEFAULT 'blocks' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"dueDate" timestamp,
	"completedAt" timestamp,
	"goalId" integer,
	"projectId" integer,
	"habitId" integer,
	"areaId" integer,
	"planId" integer,
	"bookId" integer,
	"parentTaskId" integer,
	"estimatedHours" numeric(5, 2),
	"actualHours" numeric(5, 2),
	"progress" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entityTags" ADD CONSTRAINT "entityTags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskDependencies" ADD CONSTRAINT "taskDependencies_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskDependencies" ADD CONSTRAINT "taskDependencies_dependsOnId_tasks_id_fk" FOREIGN KEY ("dependsOnId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_areaId_lifeAreas_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."lifeAreas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activityLog_userId_idx" ON "activityLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activityLog_entityType_idx" ON "activityLog" USING btree ("entityType");--> statement-breakpoint
CREATE INDEX "activityLog_createdAt_idx" ON "activityLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "books_userId_idx" ON "books" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "books_areaId_idx" ON "books" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "entityTags_tagId_idx" ON "entityTags" USING btree ("tagId");--> statement-breakpoint
CREATE INDEX "entityTags_entity_idx" ON "entityTags" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "goals_userId_idx" ON "goals" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "goals_areaId_idx" ON "goals" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "habitCompletions_habitId_idx" ON "habitCompletions" USING btree ("habitId");--> statement-breakpoint
CREATE INDEX "habitCompletions_userId_idx" ON "habitCompletions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "habits_userId_idx" ON "habits" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "habits_areaId_idx" ON "habits" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "healthStatus_userId_idx" ON "healthStatus" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "lifeAreas_userId_idx" ON "lifeAreas" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "plans_userId_idx" ON "plans" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "plans_areaId_idx" ON "plans" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "projects_userId_idx" ON "projects" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "projects_areaId_idx" ON "projects" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "resources_userId_idx" ON "resources" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "resources_planId_idx" ON "resources" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "resources_goalId_idx" ON "resources" USING btree ("goalId");--> statement-breakpoint
CREATE INDEX "resources_taskId_idx" ON "resources" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "resources_projectId_idx" ON "resources" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "resources_habitId_idx" ON "resources" USING btree ("habitId");--> statement-breakpoint
CREATE INDEX "resources_bookId_idx" ON "resources" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX "statistics_userId_idx" ON "statistics" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "statistics_date_idx" ON "statistics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "subtasks_taskId_idx" ON "subtasks" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "tags_userId_idx" ON "tags" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "taskDependencies_taskId_idx" ON "taskDependencies" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "taskDependencies_dependsOnId_idx" ON "taskDependencies" USING btree ("dependsOnId");--> statement-breakpoint
CREATE INDEX "tasks_userId_idx" ON "tasks" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tasks_projectId_idx" ON "tasks" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "tasks_goalId_idx" ON "tasks" USING btree ("goalId");--> statement-breakpoint
CREATE INDEX "tasks_areaId_idx" ON "tasks" USING btree ("areaId");--> statement-breakpoint
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks" USING btree ("parentTaskId");--> statement-breakpoint
CREATE INDEX "tasks_planId_idx" ON "tasks" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "tasks_bookId_idx" ON "tasks" USING btree ("bookId");