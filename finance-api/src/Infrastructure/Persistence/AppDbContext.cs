using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Persistence;
using Domain.Entities;

namespace Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<ApplicationUser> UsersSet => Set<ApplicationUser>();
    public DbSet<RefreshToken> RefreshTokensSet => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokensSet => Set<PasswordResetToken>();
    public DbSet<Account> AccountsSet => Set<Account>();
    public DbSet<Category> CategoriesSet => Set<Category>();
    public DbSet<Transaction> TransactionsSet => Set<Transaction>();
    public DbSet<Budget> BudgetsSet => Set<Budget>();
    public DbSet<Goal> GoalsSet => Set<Goal>();
    public DbSet<RecurringTransaction> RecurringTransactionsSet => Set<RecurringTransaction>();

    public IQueryable<ApplicationUser> Users => UsersSet;
    public IQueryable<RefreshToken> RefreshTokens => RefreshTokensSet;
    public IQueryable<PasswordResetToken> PasswordResetTokens => PasswordResetTokensSet;
    public IQueryable<Account> Accounts => AccountsSet;
    public IQueryable<Category> Categories => CategoriesSet;
    public IQueryable<Transaction> Transactions => TransactionsSet;
    public IQueryable<Budget> Budgets => BudgetsSet;
    public IQueryable<Goal> Goals => GoalsSet;
    public IQueryable<RecurringTransaction> RecurringTransactions => RecurringTransactionsSet;

    public Task AddAsync<T>(T entity, CancellationToken cancellationToken = default) where T : class => Set<T>().AddAsync(entity, cancellationToken).AsTask();
    public void Update<T>(T entity) where T : class => Set<T>().Update(entity);
    public void Remove<T>(T entity) where T : class => Set<T>().Remove(entity);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).HasMaxLength(255);
            entity.Property(x => x.DisplayName).HasMaxLength(120);
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Token).HasMaxLength(300);
            entity.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Token).HasMaxLength(300);
            entity.HasOne(x => x.User).WithMany(x => x.PasswordResetTokens).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("accounts");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.InstitutionName).HasMaxLength(120);
            entity.Property(x => x.Type).HasConversion<string>();
            entity.Property(x => x.OpeningBalance).HasColumnType("numeric(12,2)");
            entity.Property(x => x.CurrentBalance).HasColumnType("numeric(12,2)");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100);
            entity.Property(x => x.Type).HasConversion<string>();
            entity.Property(x => x.Color).HasMaxLength(20);
            entity.Property(x => x.Icon).HasMaxLength(50);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.ToTable("transactions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasConversion<string>();
            entity.Property(x => x.Amount).HasColumnType("numeric(12,2)");
            entity.Property(x => x.Merchant).HasMaxLength(200);
            entity.Property(x => x.PaymentMethod).HasMaxLength(50);
            entity.Property(x => x.Tags).HasColumnType("text[]");
        });

        modelBuilder.Entity<Budget>(entity =>
        {
            entity.ToTable("budgets");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasColumnType("numeric(12,2)");
            entity.HasIndex(x => new { x.UserId, x.CategoryId, x.Month, x.Year }).IsUnique();
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.ToTable("goals");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.TargetAmount).HasColumnType("numeric(12,2)");
            entity.Property(x => x.CurrentAmount).HasColumnType("numeric(12,2)");
            entity.Property(x => x.Status).HasConversion<string>();
            entity.Property(x => x.Icon).HasMaxLength(50);
            entity.Property(x => x.Color).HasMaxLength(20);
        });

        modelBuilder.Entity<RecurringTransaction>(entity =>
        {
            entity.ToTable("recurring_transactions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(120);
            entity.Property(x => x.Type).HasConversion<string>();
            entity.Property(x => x.Amount).HasColumnType("numeric(12,2)");
            entity.Property(x => x.Frequency).HasConversion<string>();
        });

        base.OnModelCreating(modelBuilder);
    }
}
