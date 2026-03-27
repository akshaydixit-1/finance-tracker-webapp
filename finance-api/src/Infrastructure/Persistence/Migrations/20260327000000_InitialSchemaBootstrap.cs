using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260327000000_InitialSchemaBootstrap")]
public partial class InitialSchemaBootstrap : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS users (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "Email" character varying(255) NOT NULL,
                "PasswordHash" text NOT NULL,
                "DisplayName" character varying(120) NOT NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_Email"
            ON users ("Email");
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Token" character varying(300) NOT NULL,
                "ExpiresAtUtc" timestamp with time zone NOT NULL,
                "RevokedAtUtc" timestamp with time zone NULL,
                CONSTRAINT "FK_refresh_tokens_users_UserId" FOREIGN KEY ("UserId") REFERENCES users("Id") ON DELETE CASCADE
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Token" character varying(300) NOT NULL,
                "ExpiresAtUtc" timestamp with time zone NOT NULL,
                "UsedAtUtc" timestamp with time zone NULL,
                CONSTRAINT "FK_password_reset_tokens_users_UserId" FOREIGN KEY ("UserId") REFERENCES users("Id") ON DELETE CASCADE
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS accounts (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Name" character varying(100) NOT NULL,
                "Type" text NOT NULL,
                "OpeningBalance" numeric(12,2) NOT NULL,
                "CurrentBalance" numeric(12,2) NOT NULL,
                "InstitutionName" character varying(120) NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS categories (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Name" character varying(100) NOT NULL,
                "Type" text NOT NULL,
                "Color" character varying(20) NOT NULL,
                "Icon" character varying(50) NOT NULL,
                "IsArchived" boolean NOT NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS transactions (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "AccountId" uuid NOT NULL,
                "DestinationAccountId" uuid NULL,
                "CategoryId" uuid NULL,
                "RecurringTransactionId" uuid NULL,
                "TransferGroupId" uuid NULL,
                "Type" text NOT NULL,
                "Amount" numeric(12,2) NOT NULL,
                "TransactionDate" date NOT NULL,
                "Merchant" character varying(200) NULL,
                "Note" text NULL,
                "PaymentMethod" character varying(50) NULL,
                "Tags" text[] NOT NULL DEFAULT ARRAY[]::text[]
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS budgets (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "CategoryId" uuid NOT NULL,
                "Month" integer NOT NULL,
                "Year" integer NOT NULL,
                "Amount" numeric(12,2) NOT NULL,
                "AlertThresholdPercent" integer NOT NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_budgets_UserId_CategoryId_Month_Year"
            ON budgets ("UserId", "CategoryId", "Month", "Year");
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS goals (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Name" character varying(120) NOT NULL,
                "TargetAmount" numeric(12,2) NOT NULL,
                "CurrentAmount" numeric(12,2) NOT NULL,
                "TargetDate" date NULL,
                "LinkedAccountId" uuid NULL,
                "Icon" character varying(50) NOT NULL,
                "Color" character varying(20) NOT NULL,
                "Status" text NOT NULL
            );
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS recurring_transactions (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NULL,
                "UserId" uuid NOT NULL,
                "Title" character varying(120) NOT NULL,
                "Type" text NOT NULL,
                "Amount" numeric(12,2) NOT NULL,
                "CategoryId" uuid NULL,
                "AccountId" uuid NULL,
                "Frequency" text NOT NULL,
                "StartDate" date NOT NULL,
                "EndDate" date NULL,
                "NextRunDate" date NOT NULL,
                "AutoCreateTransaction" boolean NOT NULL,
                "IsPaused" boolean NOT NULL
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""DROP TABLE IF EXISTS recurring_transactions;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS goals;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS budgets;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS transactions;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS categories;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS accounts;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS password_reset_tokens;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS refresh_tokens;""");
        migrationBuilder.Sql("""DROP TABLE IF EXISTS users;""");
    }
}
