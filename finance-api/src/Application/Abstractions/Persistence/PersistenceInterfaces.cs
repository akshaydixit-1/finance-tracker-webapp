using Domain.Entities;

namespace Application.Abstractions.Persistence;

public interface IAppDbContext
{
    IQueryable<ApplicationUser> Users { get; }
    IQueryable<RefreshToken> RefreshTokens { get; }
    IQueryable<PasswordResetToken> PasswordResetTokens { get; }
    IQueryable<Account> Accounts { get; }
    IQueryable<Category> Categories { get; }
    IQueryable<Transaction> Transactions { get; }
    IQueryable<Budget> Budgets { get; }
    IQueryable<Goal> Goals { get; }
    IQueryable<RecurringTransaction> RecurringTransactions { get; }

    Task AddAsync<T>(T entity, CancellationToken cancellationToken = default) where T : class;
    void Update<T>(T entity) where T : class;
    void Remove<T>(T entity) where T : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
