using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260327000100_V2SharedFinanceAndInsights")]
public partial class V2SharedFinanceAndInsights : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS account_members (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "AccountId" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "Role" text NOT NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_account_members_AccountId_UserId"
            ON account_members ("AccountId", "UserId");
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS account_activities (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "AccountId" uuid NOT NULL,
                "ActorUserId" uuid NOT NULL,
                "Action" character varying(120) NOT NULL,
                "EntityType" character varying(60) NOT NULL,
                "EntityId" uuid NOT NULL,
                "Metadata" character varying(500) NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE INDEX IF NOT EXISTS "IX_account_activities_AccountId_CreatedAtUtc"
            ON account_activities ("AccountId", "CreatedAtUtc");
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS rules (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "ConditionJson" text NOT NULL DEFAULT '{}',
                "ActionJson" text NOT NULL DEFAULT '{}',
                "ConditionField" text NOT NULL,
                "ConditionOperator" text NOT NULL,
                "ConditionValue" character varying(240) NOT NULL,
                "ActionType" text NOT NULL,
                "ActionValue" character varying(240) NOT NULL,
                "Priority" integer NOT NULL DEFAULT 0,
                "IsActive" boolean NOT NULL DEFAULT true
            );
            """);

        migrationBuilder.Sql("""
            CREATE INDEX IF NOT EXISTS "IX_rules_UserId_Priority"
            ON rules ("UserId", "Priority");
            """);

        migrationBuilder.Sql("""
            ALTER TABLE transactions
            ADD COLUMN IF NOT EXISTS "RuleAlerts" text[] NOT NULL DEFAULT ARRAY[]::text[];
            """);

        migrationBuilder.Sql("""
            ALTER TABLE budgets
            ADD COLUMN IF NOT EXISTS "AccountId" uuid NULL;
            """);

        migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_budgets_UserId_CategoryId_Month_Year";""");
        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_budgets_UserId_AccountId_CategoryId_Month_Year"
            ON budgets ("UserId", "AccountId", "CategoryId", "Month", "Year");
            """);

        migrationBuilder.Sql("""
            ALTER TABLE rules
            ADD COLUMN IF NOT EXISTS "ConditionJson" text NOT NULL DEFAULT '{}';
            ALTER TABLE rules
            ADD COLUMN IF NOT EXISTS "ActionJson" text NOT NULL DEFAULT '{}';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""ALTER TABLE transactions DROP COLUMN IF EXISTS "RuleAlerts";""");
        migrationBuilder.Sql("""ALTER TABLE budgets DROP COLUMN IF EXISTS "AccountId";""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS account_activities;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS account_members;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS rules;""");
    }
}
