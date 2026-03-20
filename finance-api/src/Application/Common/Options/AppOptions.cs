namespace Application.Common.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "PersonalFinanceTracker";
    public string Audience { get; set; } = "Client";
    public string SecretKey { get; set; } = "ChangeThisDevelopmentOnlySecretKey123!";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}

public sealed class FrontendOptions
{
    public const string SectionName = "Frontend";
    public string BaseUrl { get; set; } = "http://localhost:5173";
}
