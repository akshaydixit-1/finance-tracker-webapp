using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Application.Abstractions.Services;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Seed;

namespace Infrastructure.Services;

public sealed class StartupInitializationService(IServiceProvider serviceProvider, ILogger<StartupInitializationService> logger, IHostEnvironment environment, IConfiguration configuration) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await DatabaseInitializer.InitialiseAsync(dbContext, environment, configuration, cancellationToken);
        logger.LogInformation("Database initialization completed.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

public sealed class RecurringTransactionWorker(IServiceProvider serviceProvider, ILogger<RecurringTransactionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var recurringService = scope.ServiceProvider.GetRequiredService<IRecurringTransactionService>();
                await recurringService.ProcessDueItemsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Recurring transaction processing failed.");
            }

            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }
}
