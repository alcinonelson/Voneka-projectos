CREATE TYPE "public"."estado_conta" AS ENUM('activo', 'convite_pendente');--> statement-breakpoint
CREATE TYPE "public"."estado_fase" AS ENUM('planeada', 'em_curso', 'concluida', 'atrasada');--> statement-breakpoint
CREATE TYPE "public"."estado_prorrogacao" AS ENUM('pendente', 'aceite', 'recusada');--> statement-breakpoint
CREATE TYPE "public"."estado_tarefa" AS ENUM('pendente', 'em_curso', 'atrasada', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."nivel_acesso" AS ENUM('administrador', 'gestor', 'colaborador');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('baixa', 'normal', 'critica');--> statement-breakpoint
CREATE TYPE "public"."saude" AS ENUM('no_prazo', 'em_risco', 'atrasado');--> statement-breakpoint
CREATE TYPE "public"."situacao" AS ENUM('sem_obstaculos', 'com_obstaculo', 'bloqueado');--> statement-breakpoint
CREATE TYPE "public"."tipo_taxonomia" AS ENUM('natureza', 'estagio', 'departamento');--> statement-breakpoint
CREATE TYPE "public"."validacao" AS ENUM('a_espera', 'validado', 'escalado');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid,
	"accao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid,
	"project_id" uuid,
	"detalhe" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"detalhe" text,
	"task_id" uuid,
	"project_id" uuid,
	"chave_unica" text NOT NULL,
	"referente_a" date NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"lida_em" timestamp with time zone,
	"email_enviado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tipo" "tipo_taxonomia" NOT NULL,
	"codigo" text NOT NULL,
	"rotulo" text NOT NULL,
	"cor" text DEFAULT 'neutro' NOT NULL,
	"prefixo" text,
	"fases_modelo" jsonb,
	"ordem" integer DEFAULT 0 NOT NULL,
	"arquivado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"moeda" text DEFAULT 'MZN' NOT NULL,
	"fuso_horario" text DEFAULT 'Africa/Maputo' NOT NULL,
	"inicial_logotipo" text,
	"cor_marca" text DEFAULT 'azul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"estado" "estado_fase" DEFAULT 'planeada' NOT NULL,
	"nota" text,
	"ordem" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"planeado_starts_on" date NOT NULL,
	"planeado_ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"cliente" text NOT NULL,
	"natureza_id" uuid NOT NULL,
	"estagio_id" uuid NOT NULL,
	"saude" "saude" DEFAULT 'no_prazo' NOT NULL,
	"responsavel_id" uuid NOT NULL,
	"inicio" date NOT NULL,
	"deadline" date NOT NULL,
	"avanco_pct" integer DEFAULT 0 NOT NULL,
	"orcamento_centavos" bigint,
	"consumido_centavos" bigint,
	"antecedencia_alerta" integer DEFAULT 3 NOT NULL,
	"arquivado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"situacao" "situacao" NOT NULL,
	"texto" text NOT NULL,
	"esforco_real_horas" integer DEFAULT 0 NOT NULL,
	"prova_execucao" text,
	"validacao" "validacao" DEFAULT 'a_espera' NOT NULL,
	"validado_por_id" uuid,
	"validado_em" timestamp with time zone,
	"observacao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"deadline_anterior" date NOT NULL,
	"nova_deadline" date NOT NULL,
	"motivo" text NOT NULL,
	"estado" "estado_prorrogacao" DEFAULT 'pendente' NOT NULL,
	"decidido_por_id" uuid,
	"decidido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_id" uuid,
	"titulo" text NOT NULL,
	"descricao" text,
	"responsavel_id" uuid NOT NULL,
	"atribuido_por_id" uuid NOT NULL,
	"deadline" date NOT NULL,
	"esforco_estimado_horas" integer DEFAULT 8 NOT NULL,
	"esforco_real_horas" integer DEFAULT 0 NOT NULL,
	"prioridade" "prioridade" DEFAULT 'normal' NOT NULL,
	"antecedencia_alerta" integer DEFAULT 3 NOT NULL,
	"exige_relatorio" boolean DEFAULT true NOT NULL,
	"estado" "estado_tarefa" DEFAULT 'pendente' NOT NULL,
	"concluida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"revogado_em" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"telefone" text,
	"funcao" text NOT NULL,
	"departamento_id" uuid,
	"data_entrada" date NOT NULL,
	"alocacao" integer DEFAULT 100 NOT NULL,
	"nivel_acesso" "nivel_acesso" DEFAULT 'colaborador' NOT NULL,
	"estado" "estado_conta" DEFAULT 'convite_pendente' NOT NULL,
	"convite_token_hash" text,
	"convite_expira_em" timestamp with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_login_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_taxonomies" ADD CONSTRAINT "org_taxonomies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_natureza_id_org_taxonomies_id_fk" FOREIGN KEY ("natureza_id") REFERENCES "public"."org_taxonomies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_estagio_id_org_taxonomies_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."org_taxonomies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_validado_por_id_users_id_fk" FOREIGN KEY ("validado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_extensions" ADD CONSTRAINT "task_extensions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_extensions" ADD CONSTRAINT "task_extensions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_extensions" ADD CONSTRAINT "task_extensions_solicitante_id_users_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_extensions" ADD CONSTRAINT "task_extensions_decidido_por_id_users_id_fk" FOREIGN KEY ("decidido_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_atribuido_por_id_users_id_fk" FOREIGN KEY ("atribuido_por_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_departamento_id_org_taxonomies_id_fk" FOREIGN KEY ("departamento_id") REFERENCES "public"."org_taxonomies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_project_idx" ON "audit_log" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entidade_idx" ON "audit_log" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_chave_unica" ON "notifications" USING btree ("chave_unica");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","lida");--> statement-breakpoint
CREATE UNIQUE INDEX "org_taxonomies_codigo_unico" ON "org_taxonomies" USING btree ("organization_id","tipo","codigo");--> statement-breakpoint
CREATE INDEX "org_taxonomies_tipo_idx" ON "org_taxonomies" USING btree ("organization_id","tipo","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unico" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "phases_project_idx" ON "phases" USING btree ("project_id","ordem");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_codigo_unico" ON "projects" USING btree ("organization_id","codigo");--> statement-breakpoint
CREATE INDEX "projects_responsavel_idx" ON "projects" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "projects_organization_idx" ON "projects" USING btree ("organization_id","natureza_id");--> statement-breakpoint
CREATE INDEX "reports_task_idx" ON "reports" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "reports_autor_idx" ON "reports" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX "reports_validacao_idx" ON "reports" USING btree ("organization_id","validacao");--> statement-breakpoint
CREATE INDEX "task_extensions_task_idx" ON "task_extensions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_responsavel_idx" ON "tasks" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "tasks_deadline_idx" ON "tasks" USING btree ("organization_id","deadline");--> statement-breakpoint
CREATE INDEX "tasks_estado_idx" ON "tasks" USING btree ("organization_id","estado");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unico" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unico" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_organization_idx" ON "users" USING btree ("organization_id","nivel_acesso");