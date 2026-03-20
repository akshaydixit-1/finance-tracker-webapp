namespace Application.DTOs.Auth;

public sealed record RegisterRequest(string Email, string Password, string DisplayName);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);
public sealed record UserProfileResponse(Guid Id, string Email, string DisplayName);
public sealed record AuthResponse(UserProfileResponse User, string AccessToken, string RefreshToken, DateTime ExpiresAtUtc);
