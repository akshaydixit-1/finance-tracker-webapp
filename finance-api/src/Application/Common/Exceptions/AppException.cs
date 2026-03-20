using Microsoft.AspNetCore.Http;

namespace Application.Common.Exceptions;

public sealed class AppException(string message, int statusCode = StatusCodes.Status400BadRequest) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
