# Finance API

## Description
Finance API is the backend service for the Personal Finance Tracker application.  
It provides secure JWT-based authentication and modular APIs to manage accounts, categories, transactions, budgets, goals, recurring entries, dashboard data, and reports.

The project follows a clean layered architecture and uses PostgreSQL as the primary database.

## Technologies Used
- .NET 10 (ASP.NET Core Web API)
- Entity Framework Core 10
- PostgreSQL + Npgsql provider
- JWT Bearer Authentication
- BCrypt password hashing
- Background hosted services
- CORS policy for frontend integration
- Rate limiting for auth endpoints
- Docker (containerized deployment support)

## Architecture
- `src/Api`  
  Web API host, controllers, middleware, startup/configuration.
- `src/Application`  
  Business logic, DTOs, service interfaces, application services, options, exceptions.
- `src/Domain`  
  Core entities, enums, domain primitives.
- `src/Infrastructure`  
  EF Core DbContext, authentication helpers, dependency injection wiring, background services, DB initialization.

## Core Features
- User registration, login, token refresh, profile API.
- Password validation and secure password hashing.
- Account CRUD + account transfer.
- Category CRUD (delete = archive behavior).
- Transaction CRUD with support for income/expense/transfer.
- Budget CRUD by month/year/category.
- Goal CRUD + contribution/withdraw workflows.
- Recurring transaction CRUD + background processing.
- Dashboard aggregates.
- Reports for category spend, income vs expense, account balance trend, CSV export.

## API Modules (High-Level)
- `api/auth`
- `api/accounts`
- `api/categories`
- `api/transactions`
- `api/budgets`
- `api/goals`
- `api/recurring`
- `api/dashboard`
- `api/reports`

## Local Setup

### Prerequisites
- .NET SDK 10+
- PostgreSQL 14+ (or compatible)
- Git

### 1) Clone repository
```bash
git clone https://github.com/<your-user>/finance-api.git
cd finance-api
```

### 2) Configure database and app settings
```bash
Update src/Api/appsettings.Development.json:

{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=pftracker_dev;Username=postgres;Password=12345678"
  },
  "Jwt": {
    "Issuer": "PersonalFinanceTracker.Api",
    "Audience": "PersonalFinanceTracker.Frontend",
    "SecretKey": "DevelopmentSecretKeyForPersonalFinanceTracker1234567890!",
    "AccessTokenMinutes": 60,
    "RefreshTokenDays": 7
  },
  "Cors": {
    "AllowedOrigins": [ "http://localhost:5173" ]
  }
}
```

### **3) Restore dependencies**
```bash
dotnet restore src/Api/PersonalFinanceTracker.Api.csproj
```

### 4) Run API
```bash
dotnet run --project src/Api/PersonalFinanceTracker.Api.csproj
```
