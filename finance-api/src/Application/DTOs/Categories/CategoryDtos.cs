using Domain.Enums;

namespace Application.DTOs.Categories;

public sealed record CreateCategoryRequest(string Name, CategoryType Type, string Color, string Icon);
public sealed record UpdateCategoryRequest(string Name, string Color, string Icon, bool IsArchived);
public sealed record CategoryResponse(Guid Id, string Name, CategoryType Type, string Color, string Icon, bool IsArchived);
