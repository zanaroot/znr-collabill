ALTER TYPE "public"."task_status" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "public"."task_status" ADD VALUE IF NOT EXISTS 'TRASH';
