namespace Application.Common.Models;

public sealed record PagedResult<T>(IReadOnlyCollection<T> Items, int Page, int PageSize, int TotalCount);

public sealed record AuthTokensResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);
