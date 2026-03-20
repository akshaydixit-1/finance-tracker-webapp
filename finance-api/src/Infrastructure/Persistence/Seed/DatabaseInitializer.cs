using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Hosting;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;

namespace Infrastructure.Persistence.Seed;

public static class DatabaseInitializer
{
    private static readonly (string Name, CategoryType Type, string Color, string Icon)[] DefaultCategories =
    {
        ("Food", CategoryType.Expense, "#F59E0B", "UtensilsCrossed"),
        ("Rent", CategoryType.Expense, "#DC2626", "House"),
        ("Utilities", CategoryType.Expense, "#0EA5E9", "Lightbulb"),
        ("Transport", CategoryType.Expense, "#2563EB", "CarFront"),
        ("Entertainment", CategoryType.Expense, "#8B5CF6", "Clapperboard"),
        ("Shopping", CategoryType.Expense, "#EC4899", "ShoppingBag"),
        ("Health", CategoryType.Expense, "#059669", "HeartPulse"),
        ("Education", CategoryType.Expense, "#7C3AED", "GraduationCap"),
        ("Travel", CategoryType.Expense, "#14B8A6", "Plane"),
        ("Subscriptions", CategoryType.Expense, "#F97316", "Repeat"),
        ("Miscellaneous", CategoryType.Expense, "#6B7280", "CircleHelp"),
        ("Salary", CategoryType.Income, "#059669", "BadgeIndianRupee"),
        ("Freelance", CategoryType.Income, "#2563EB", "BriefcaseBusiness"),
        ("Bonus", CategoryType.Income, "#F59E0B", "Sparkles"),
        ("Investment", CategoryType.Income, "#8B5CF6", "LineChart"),
        ("Gift", CategoryType.Income, "#EC4899", "Gift"),
        ("Refund", CategoryType.Income, "#0EA5E9", "Undo2"),
        ("Other", CategoryType.Income, "#6B7280", "CircleDollarSign")
    };

    public static async Task InitialiseAsync(AppDbContext dbContext, IHostEnvironment environment, CancellationToken cancellationToken = default)
    {
        var migrationsAssembly = dbContext.GetService<IMigrationsAssembly>();
        var hasDefinedMigrations = migrationsAssembly.Migrations.Any();

        if (hasDefinedMigrations)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        else if (environment.IsDevelopment())
        {
            // Developer convenience: create the schema automatically when no EF migrations exist yet.
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            throw new InvalidOperationException("No EF Core migrations were found. Add migrations before running outside Development.");
        }

        var users = await dbContext.UsersSet.ToListAsync(cancellationToken);
        if (users.Count == 0)
        {
            return;
        }

        foreach (var user in users)
        {
            var existing = await dbContext.CategoriesSet.CountAsync(x => x.UserId == user.Id, cancellationToken);
            if (existing > 0)
            {
                continue;
            }

            foreach (var item in DefaultCategories)
            {
                await dbContext.CategoriesSet.AddAsync(new Category
                {
                    UserId = user.Id,
                    Name = item.Name,
                    Type = item.Type,
                    Color = item.Color,
                    Icon = item.Icon
                }, cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
