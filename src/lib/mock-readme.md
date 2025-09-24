# Mock API Testing Guide

This project includes a comprehensive mock API system that allows you to test all authentication
functionality without needing a real backend server.

## Quick Start

1. **Enable Mock Mode**: The mock API is enabled by default in `.env.local`:

   ```bash
   NEXT_PUBLIC_USE_MOCK_API=true
   ```

2. **Start Development Server**:

   ```bash
   yarn dev
   ```

3. **Visit Authentication Pages**:
   - Login: http://localhost:3000/auth/login
   - Signup: http://localhost:3000/auth/signup
   - Forgot Password: http://localhost:3000/auth/forgot-password

## Test Scenarios

### 🔐 Login Page (`/auth/login`)

**Successful Login:**

- Use any email/password combination (e.g., `test@example.com` / `password123`)
- Automatically redirects to dashboard with mock JWT token

**Error Testing:**

- `error@test.com` + any password → "Invalid email or password"
- `blocked@test.com` + any password → "Account has been temporarily blocked"

### 📝 Signup Page (`/auth/signup`)

**Successful Signup:**

- Use any valid name, email, and password
- Shows success message and redirects to login after 3 seconds
- Automatically generates mock user account

**Error Testing:**

- `existing@test.com` → "An account with this email already exists"
- `invalid@test.com` → "Invalid email format"
- Mismatched passwords → Client-side validation error
- Password < 6 characters → Client-side validation error

### 🔄 Forgot Password (`/auth/forgot-password`)

**Successful Reset Request:**

- Use any valid email address
- Shows success message confirming email sent

**Error Testing:**

- `notfound@test.com` → "No account found with this email address"
- `error@test.com` → "Failed to send reset email. Please try again later."

## Mock Data Features

### 🎭 Realistic Behavior

- **Network Delays**: 300-1000ms simulated API response times
- **Loading States**: All buttons show loading spinners during requests
- **Error Handling**: Proper error messages and validation
- **Success Flows**: Realistic success messages and redirects

### 🗄️ Mock Database

- Pre-populated with sample users (John Doe, Jane Smith)
- New signups automatically added to mock database
- JWT tokens generated with timestamps

### 💰 Financial Data

- Mock balance: $5,420.75 total
- Sample transactions (salary, groceries, bills)
- Ready for dashboard testing

## Switching to Real API

When you're ready to connect to a real backend:

1. **Update Environment Variable**:

   ```bash
   # In .env.local
   NEXT_PUBLIC_USE_MOCK_API=false
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

2. **Start Your Backend Server** on the configured port

3. **API Endpoints Expected**:
   ```
   POST /auth/login
   POST /auth/signup
   POST /auth/forgot-password
   POST /auth/reset-password
   GET  /balance
   GET  /transactions
   ```

## Development Benefits

✅ **No Backend Dependency**: Test frontend features immediately ✅ **Realistic User Experience**:
Proper loading states and error handling ✅ **Comprehensive Testing**: Multiple success/error
scenarios ✅ **Easy Switching**: Toggle between mock and real API with one variable ✅ **Type
Safety**: Full TypeScript support for all mock responses

## File Structure

```
src/lib/
├── api-client.ts     # Main API client with mock/real API switching
├── mock-api.ts       # Mock service implementations
└── mock-readme.md    # This documentation
```

Start testing your authentication flow immediately - no backend setup required! 🚀
