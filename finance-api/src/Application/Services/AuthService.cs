using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Auth;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class AuthService(IAppDbContext dbContext, IPasswordHasher passwordHasher, ITokenService tokenService, ICurrentUserService currentUserService) : IAuthService
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

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        ValidatePassword(request.Password);
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailExists = await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken);
        if (emailExists)
        {
            throw new AppException("Email already exists.");
        }

        var user = new ApplicationUser
        {
            Email = normalizedEmail,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        await dbContext.AddAsync(user, cancellationToken);
        foreach (var item in DefaultCategories)
        {
            await dbContext.AddAsync(new Category
            {
                UserId = user.Id,
                Name = item.Name,
                Type = item.Type,
                Color = item.Color,
                Icon = item.Icon
            }, cancellationToken);
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        var tokens = tokenService.CreateTokens(user);
        await dbContext.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(new UserProfileResponse(user.Id, user.Email, user.DisplayName), tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAtUtc);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken)
            ?? throw new AppException("Invalid email or password.", StatusCodes.Status401Unauthorized);

        if (!passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException("Invalid email or password.", StatusCodes.Status401Unauthorized);
        }

        var tokens = tokenService.CreateTokens(user);
        await dbContext.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(new UserProfileResponse(user.Id, user.Email, user.DisplayName), tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAtUtc);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var refreshToken = await dbContext.RefreshTokens.Include(x => x.User).FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken)
            ?? throw new AppException("Refresh token is invalid.", StatusCodes.Status401Unauthorized);

        if (!refreshToken.IsActive)
        {
            throw new AppException("Refresh token is expired.", StatusCodes.Status401Unauthorized);
        }

        refreshToken.RevokedAtUtc = DateTime.UtcNow;
        dbContext.Update(refreshToken);

        var tokens = tokenService.CreateTokens(refreshToken.User);
        await dbContext.AddAsync(new RefreshToken
        {
            UserId = refreshToken.UserId,
            Token = tokens.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(new UserProfileResponse(refreshToken.User.Id, refreshToken.User.Email, refreshToken.User.DisplayName), tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAtUtc);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);
        if (user is null)
        {
            return;
        }

        await dbContext.AddAsync(new PasswordResetToken
        {
            UserId = user.Id,
            Token = tokenService.GeneratePasswordResetToken(),
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        ValidatePassword(request.NewPassword);
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken)
            ?? throw new AppException("Invalid reset request.");

        var token = await dbContext.PasswordResetTokens.FirstOrDefaultAsync(x => x.UserId == user.Id && x.Token == request.Token && x.UsedAtUtc == null, cancellationToken)
            ?? throw new AppException("Reset token is invalid.");

        if (token.ExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new AppException("Reset token is expired.");
        }

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        token.UsedAtUtc = DateTime.UtcNow;
        dbContext.Update(user);
        dbContext.Update(token);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserProfileResponse> GetProfileAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Users.Where(x => x.Id == userId).Select(x => new UserProfileResponse(x.Id, x.Email, x.DisplayName)).FirstAsync(cancellationToken);
    }

    private static void ValidatePassword(string password)
    {
        if (password.Length < 8 || !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
        {
            throw new AppException("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
        }
    }
}
