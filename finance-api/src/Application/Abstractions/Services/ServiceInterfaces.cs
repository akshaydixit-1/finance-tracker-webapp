using Application.Common.Models;
using Application.DTOs.Accounts;
using Application.DTOs.Auth;
using Application.DTOs.Budgets;
using Application.DTOs.Categories;
using Application.DTOs.Dashboard;
using Application.DTOs.Forecast;
using Application.DTOs.Goals;
using Application.DTOs.Insights;
using Application.DTOs.RecurringTransactions;
using Application.DTOs.Reports;
using Application.DTOs.Rules;
using Application.DTOs.Transactions;

namespace Application.Abstractions.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
    Task<UserProfileResponse> GetProfileAsync(CancellationToken cancellationToken);
}

public interface IAccountService
{
    Task<IReadOnlyCollection<AccountResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<AccountResponse> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken);
    Task<AccountResponse> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task TransferAsync(TransferFundsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AccountMemberResponse>> GetMembersAsync(Guid accountId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AccountActivityResponse>> GetActivityAsync(Guid accountId, CancellationToken cancellationToken);
    Task InviteMemberAsync(Guid accountId, InviteAccountMemberRequest request, CancellationToken cancellationToken);
    Task UpdateMemberRoleAsync(Guid accountId, Guid memberUserId, UpdateAccountMemberRoleRequest request, CancellationToken cancellationToken);
}

public interface ICategoryService
{
    Task<IReadOnlyCollection<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<CategoryResponse> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryResponse> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task ArchiveAsync(Guid id, CancellationToken cancellationToken);
}

public interface ITransactionService
{
    Task<PagedResult<TransactionResponse>> GetAsync(TransactionQueryRequest request, CancellationToken cancellationToken);
    Task<TransactionResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<TransactionResponse> CreateAsync(CreateTransactionRequest request, CancellationToken cancellationToken);
    Task<TransactionResponse> UpdateAsync(Guid id, UpdateTransactionRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public interface IBudgetService
{
    Task<IReadOnlyCollection<BudgetResponse>> GetAsync(int month, int year, CancellationToken cancellationToken);
    Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken);
    Task<BudgetResponse> UpdateAsync(Guid id, UpdateBudgetRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public interface IGoalService
{
    Task<IReadOnlyCollection<GoalResponse>> GetAsync(CancellationToken cancellationToken);
    Task<GoalResponse> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken);
    Task<GoalResponse> UpdateAsync(Guid id, UpdateGoalRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<GoalResponse> ContributeAsync(Guid id, GoalContributionRequest request, CancellationToken cancellationToken);
    Task<GoalResponse> WithdrawAsync(Guid id, GoalContributionRequest request, CancellationToken cancellationToken);
}

public interface IRecurringTransactionService
{
    Task<IReadOnlyCollection<RecurringTransactionResponse>> GetAsync(CancellationToken cancellationToken);
    Task<RecurringTransactionResponse> CreateAsync(CreateRecurringTransactionRequest request, CancellationToken cancellationToken);
    Task<RecurringTransactionResponse> UpdateAsync(Guid id, UpdateRecurringTransactionRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task ProcessDueItemsAsync(CancellationToken cancellationToken);
}

public interface IReportService
{
    Task<IReadOnlyCollection<CategorySpendReportItem>> GetCategorySpendAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<IncomeExpenseTrendItem>> GetIncomeVsExpenseAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AccountBalanceTrendItem>> GetAccountBalanceTrendAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CategoryTrendItem>> GetCategoryTrendsAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SavingsRateTrendReportItem>> GetSavingsRateTrendAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<NetWorthPoint>> GetNetWorthTrendAsync(ReportFilterRequest request, CancellationToken cancellationToken);
    Task<string> ExportTransactionsCsvAsync(ReportFilterRequest request, CancellationToken cancellationToken);
}

public interface IDashboardService
{
    Task<DashboardResponse> GetAsync(CancellationToken cancellationToken);
}

public interface IForecastService
{
    Task<ForecastMonthResponse> GetMonthForecastAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ForecastDailyPoint>> GetDailyForecastAsync(CancellationToken cancellationToken);
}

public interface IInsightsService
{
    Task<HealthScoreResponse> GetHealthScoreAsync(CancellationToken cancellationToken);
    Task<InsightsResponse> GetInsightsAsync(CancellationToken cancellationToken);
}

public interface IRuleService
{
    Task<IReadOnlyCollection<RuleResponse>> GetAsync(CancellationToken cancellationToken);
    Task<RuleResponse> CreateAsync(CreateRuleRequest request, CancellationToken cancellationToken);
    Task<RuleResponse> UpdateAsync(Guid id, UpdateRuleRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public interface IAccountAccessService
{
    Task<IReadOnlyCollection<Guid>> GetReadableAccountIdsAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Guid>> GetEditableAccountIdsAsync(Guid userId, CancellationToken cancellationToken);
    Task EnsureCanReadAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken);
    Task EnsureCanEditAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken);
    Task EnsureCanManageMembersAsync(Guid userId, Guid accountId, CancellationToken cancellationToken);
}
