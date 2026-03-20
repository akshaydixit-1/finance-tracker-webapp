using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Application.Abstractions.Services;
using Application.DTOs.Auth;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public Task<AuthResponse> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken) => authService.RegisterAsync(request, cancellationToken);

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public Task<AuthResponse> Login([FromBody] LoginRequest request, CancellationToken cancellationToken) => authService.LoginAsync(request, cancellationToken);

    [HttpPost("refresh")]
    public Task<AuthResponse> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken) => authService.RefreshAsync(request, cancellationToken);

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.ForgotPasswordAsync(request, cancellationToken);
        return Ok(new { message = "If the email exists, a reset token has been generated." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.ResetPasswordAsync(request, cancellationToken);
        return Ok(new { message = "Password has been reset successfully." });
    }

    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public Task<UserProfileResponse> Me(CancellationToken cancellationToken) => authService.GetProfileAsync(cancellationToken);
}
