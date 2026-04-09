-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('planned', 'active', 'complete');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('not_started', 'active', 'blocked', 'complete');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('area', 'project', 'task', 'resource');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('note', 'url', 'clipping');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Boise',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "area_id" UUID,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'not_started',
    "target_date" DATE,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "area_id" UUID,
    "parent_id" UUID,
    "sprint_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'backlog',
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "estimate_minutes" INTEGER,
    "due_date" DATE,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 1000,
    "archived_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "area_id" UUID,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "body_md" TEXT,
    "source_kind" "ResourceKind" NOT NULL DEFAULT 'note',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'planned',
    "goal" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityTag" (
    "id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_type" "EntityType" NOT NULL,
    "source_id" UUID NOT NULL,
    "target_type" "EntityType" NOT NULL,
    "target_id" UUID NOT NULL,
    "relation_type" TEXT NOT NULL DEFAULT 'references',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Area_user_id_idx" ON "Area"("user_id");

-- CreateIndex
CREATE INDEX "Project_user_id_idx" ON "Project"("user_id");

-- CreateIndex
CREATE INDEX "Project_area_id_idx" ON "Project"("area_id");

-- CreateIndex
CREATE INDEX "Project_parent_id_idx" ON "Project"("parent_id");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Task_user_id_idx" ON "Task"("user_id");

-- CreateIndex
CREATE INDEX "Task_project_id_idx" ON "Task"("project_id");

-- CreateIndex
CREATE INDEX "Task_area_id_idx" ON "Task"("area_id");

-- CreateIndex
CREATE INDEX "Task_parent_id_idx" ON "Task"("parent_id");

-- CreateIndex
CREATE INDEX "Task_sprint_id_idx" ON "Task"("sprint_id");

-- CreateIndex
CREATE INDEX "Task_sprint_id_status_sort_order_idx" ON "Task"("sprint_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "Task_due_date_idx" ON "Task"("due_date");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Resource_user_id_idx" ON "Resource"("user_id");

-- CreateIndex
CREATE INDEX "Resource_area_id_idx" ON "Resource"("area_id");

-- CreateIndex
CREATE INDEX "Sprint_user_id_status_idx" ON "Sprint"("user_id", "status");

-- CreateIndex
CREATE INDEX "Sprint_start_date_idx" ON "Sprint"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_user_id_start_date_key" ON "Sprint"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "Tag_user_id_idx" ON "Tag"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_user_id_name_key" ON "Tag"("user_id", "name");

-- CreateIndex
CREATE INDEX "EntityTag_entity_type_entity_id_idx" ON "EntityTag"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "EntityTag_tag_id_idx" ON "EntityTag"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntityTag_tag_id_entity_type_entity_id_key" ON "EntityTag"("tag_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "EntityLink_source_type_source_id_idx" ON "EntityLink"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "EntityLink_target_type_target_id_idx" ON "EntityLink"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "EntityLink_user_id_idx" ON "EntityLink"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLink_source_type_source_id_target_type_target_id_rela_key" ON "EntityLink"("source_type", "source_id", "target_type", "target_id", "relation_type");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- lifeos v1 raw SQL block (ADR-1 / ADR-3 / ADR-8)
--
-- These constraints and partial indexes cannot be expressed in schema.prisma.
-- They MUST be re-appended to every new migration that touches the affected
-- tables — see ARCHITECTURE.md "Schema evolution" section (added in P8).
-- The schema-constraints.test.ts test queries pg_constraint and pg_indexes
-- and will fail loudly if any of these are missing after a future migration.
-- ────────────────────────────────────────────────────────────────────────────

-- Task must belong to EXACTLY ONE of Project or Area (true XOR).
-- A task nested under a project inherits its area transitively via project.area_id.
-- A task "standalone under an area" has no project but has an area.
ALTER TABLE "Task" ADD CONSTRAINT task_parent_xor
  CHECK (("project_id" IS NULL) <> ("area_id" IS NULL));

-- Sprint week constraint — end_date must be exactly 6 days after start_date.
ALTER TABLE "Sprint" ADD CONSTRAINT sprint_week_check
  CHECK ("end_date" = "start_date" + INTERVAL '6 days');

-- EntityLink self-reference prevention.
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_no_self
  CHECK (NOT ("source_type" = "target_type" AND "source_id" = "target_id"));

-- EntityLink relation_type whitelist (parent_of removed — Project/Task
-- hierarchy uses native parent_id so a separate relation would duplicate it).
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_relation_check
  CHECK ("relation_type" IN ('references', 'blocks', 'depends_on'));

-- Archive-filter partial indexes (ADR-3). Default list views filter
-- WHERE archived_at IS NULL; these indexes make that path fast.
CREATE INDEX "idx_Area_active"     ON "Area"     ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Project_active"  ON "Project"  ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Task_active"     ON "Task"     ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Resource_active" ON "Resource" ("user_id") WHERE "archived_at" IS NULL;
