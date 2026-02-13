-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'COMPLETED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
CREATE TYPE "ConversationChannel" AS ENUM ('EMAIL', 'SMS', 'SYSTEM');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "SenderType" AS ENUM ('CONTACT', 'STAFF', 'SYSTEM');
CREATE TYPE "FormType" AS ENUM ('CONTACT', 'INTAKE', 'AGREEMENT');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE "AutomationStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
CREATE TYPE "IntegrationType" AS ENUM ('EMAIL', 'SMS', 'CALENDAR');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "contact_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_workspace_id_idx" ON "users"("workspace_id");

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contacts_workspace_id_idx" ON "contacts"("workspace_id");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_types_workspace_id_idx" ON "service_types"("workspace_id");

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "availability_rules_workspace_id_idx" ON "availability_rules"("workspace_id");

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "service_type_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "location" TEXT,
    "notes" TEXT,
    "calendar_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bookings_workspace_id_idx" ON "bookings"("workspace_id");
CREATE INDEX "bookings_scheduled_at_idx" ON "bookings"("scheduled_at");

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "automation_paused" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conversations_workspace_id_idx" ON "conversations"("workspace_id");
CREATE INDEX "conversations_contact_id_idx" ON "conversations"("contact_id");

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "Direction" NOT NULL DEFAULT 'OUTBOUND',
    "sender_type" "SenderType" NOT NULL DEFAULT 'SYSTEM',
    "sender_id" TEXT,
    "content" TEXT NOT NULL,
    "is_automated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FormType" NOT NULL DEFAULT 'INTAKE',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "form_templates_workspace_id_idx" ON "form_templates"("workspace_id");

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "form_template_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "service_type_id" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "form_submissions_workspace_id_idx" ON "form_submissions"("workspace_id");

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 10,
    "unit" TEXT,
    "vendor_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_items_workspace_id_idx" ON "inventory_items"("workspace_id");

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_rules_workspace_id_idx" ON "automation_rules"("workspace_id");

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "automation_rule_id" TEXT NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "entity_id" TEXT,
    "status" "AutomationStatus" NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_logs_workspace_id_idx" ON "automation_logs"("workspace_id");

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integrations_workspace_id_type_key" ON "integrations"("workspace_id", "type");

-- AddForeignKey (all)
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "form_templates"("id") ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "automation_rules"("id") ON UPDATE CASCADE;
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
