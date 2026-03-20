# Finance UI

## Description
Finance UI is the frontend client for the Personal Finance Tracker platform.  
It provides a modern, responsive interface for personal finance workflows including authentication, dashboard insights, and CRUD operations for accounts, categories, transactions, budgets, goals, recurring entries, and reports.

## Technologies Used
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query (React Query)
- React Hook Form
- Axios

## Features
- Authentication (register, login, forgot password)
- Protected routing for authenticated sections
- Dashboard with summary analytics
- Account management
- Category management
- Transaction create/list/edit/delete
- Budget create/list/edit/delete
- Goal create/list/edit/delete + contribution flow
- Recurring transaction create/list/edit/delete
- Reports and chart-backed data views
- Toast-based API success/error handling
- Responsive design for desktop and mobile

## Project Structure
```text
src/
  app/
    providers/
    router/
  components/
    layout/
    ui/
  lib/
  pages/
  services/
  store/
  types/
  utils/
  ```

### Prerequisites
 - Node.js 20+ (recommended)
 - npm 10+ (or pnpm/yarn)
 - Running backend API (finance-api)

### Environment Variables
**Create a .env file in the project root:**

```bash
VITE_API_BASE_URL=http://localhost:5170/api
```

**For production deployments, set:**

```bash
VITE_API_BASE_URL=http://localhost:5170/api
```

### Local Setup

```bash
git clone https://github.com/<your-user>/finance-ui.git
cd finance-ui
npm install
npm run dev
```
**Local development URL:**

http://localhost:5173

### Build and Preview
 - npm run build
 - npm run preview

