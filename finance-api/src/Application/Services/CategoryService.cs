using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Categories;
using Domain.Entities;

namespace Application.Services;

public sealed class CategoryService(IAppDbContext dbContext, ICurrentUserService currentUserService) : ICategoryService
{
    public async Task<IReadOnlyCollection<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Categories.Where(x => x.UserId == userId)
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryResponse(x.Id, x.Name, x.Type, x.Color, x.Icon, x.IsArchived))
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryResponse> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var entity = new Category
        {
            UserId = currentUserService.GetUserId(),
            Name = request.Name.Trim(),
            Type = request.Type,
            Color = request.Color,
            Icon = request.Icon
        };

        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new CategoryResponse(entity.Id, entity.Name, entity.Type, entity.Color, entity.Icon, entity.IsArchived);
    }

    public async Task<CategoryResponse> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var entity = await dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Category not found.", StatusCodes.Status404NotFound);

        entity.Name = request.Name.Trim();
        entity.Color = request.Color;
        entity.Icon = request.Icon;
        entity.IsArchived = request.IsArchived;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new CategoryResponse(entity.Id, entity.Name, entity.Type, entity.Color, entity.Icon, entity.IsArchived);
    }

    public async Task ArchiveAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var entity = await dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Category not found.", StatusCodes.Status404NotFound);
        entity.IsArchived = true;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
