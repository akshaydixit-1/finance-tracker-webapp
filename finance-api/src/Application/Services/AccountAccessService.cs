using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Domain.Enums;

namespace Application.Services;

public sealed class AccountAccessService(IAppDbContext dbContext) : IAccountAccessService
{
    public async Task<IReadOnlyCollection<Guid>> GetReadableAccountIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var ownedIds = dbContext.Accounts.Where(x => x.UserId == userId).Select(x => x.Id);
        var memberIds = dbContext.AccountMembers.Where(x => x.UserId == userId).Select(x => x.AccountId);
        return await ownedIds.Union(memberIds).Distinct().ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> GetEditableAccountIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var ownedIds = dbContext.Accounts.Where(x => x.UserId == userId).Select(x => x.Id);
        var memberIds = dbContext.AccountMembers
            .Where(x => x.UserId == userId && x.Role != AccountMemberRole.Viewer)
            .Select(x => x.AccountId);
        return await ownedIds.Union(memberIds).Distinct().ToListAsync(cancellationToken);
    }

    public async Task EnsureCanReadAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken)
    {
        var canRead = await dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken)
            || await dbContext.AccountMembers.AnyAsync(x => x.AccountId == accountId && x.UserId == userId, cancellationToken);
        if (!canRead)
        {
            throw new AppException("You do not have access to this account.", StatusCodes.Status403Forbidden);
        }
    }

    public async Task EnsureCanEditAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken)
    {
        var owner = await dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken);
        if (owner) return;

        var canEdit = await dbContext.AccountMembers.AnyAsync(
            x => x.AccountId == accountId && x.UserId == userId && x.Role != AccountMemberRole.Viewer,
            cancellationToken);
        if (!canEdit)
        {
            throw new AppException("You do not have edit access for this account.", StatusCodes.Status403Forbidden);
        }
    }

    public async Task EnsureCanManageMembersAsync(Guid userId, Guid accountId, CancellationToken cancellationToken)
    {
        var isOwner = await dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken);
        if (!isOwner)
        {
            throw new AppException("Only account owners can manage members.", StatusCodes.Status403Forbidden);
        }
    }
}
