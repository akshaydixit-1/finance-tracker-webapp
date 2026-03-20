using Application.Common.Models;
using Domain.Entities;

namespace Application.Abstractions.Auth;

public interface ICurrentUserService
{
    Guid GetUserId();
    string? GetEmail();
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface ITokenService
{
    AuthTokensResponse CreateTokens(ApplicationUser user);
    string GeneratePasswordResetToken();
}
