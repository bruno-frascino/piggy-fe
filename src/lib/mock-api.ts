// Mock API implementation for testing auth pages without a real backend

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApiError {
  response: {
    data: {
      message: string;
    };
  };
}

// Mock delay to simulate network requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user database
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password456',
  },
];

export class MockAuthService {
  // Mock login - accepts any email/password combination
  static async login(email: string, password: string): Promise<AuthResponse> {
    await delay(800); // Simulate network delay

    // Check for specific test cases
    if (email === 'error@test.com') {
      throw {
        response: {
          data: {
            message: 'Invalid email or password',
          },
        },
      } as ApiError;
    }

    if (email === 'blocked@test.com') {
      throw {
        response: {
          data: {
            message: 'Account has been temporarily blocked',
          },
        },
      } as ApiError;
    }

    // Find existing user or create a mock one
    let user = mockUsers.find(u => u.email === email);
    if (!user) {
      user = {
        id: Date.now().toString(),
        name: email.split('@')[0],
        email,
        password,
      };
    }

    return {
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  // Mock signup - accepts any valid data
  static async signup(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    await delay(1000); // Simulate network delay

    // Check for specific test cases
    if (email === 'existing@test.com') {
      throw {
        response: {
          data: {
            message: 'An account with this email already exists',
          },
        },
      } as ApiError;
    }

    if (email === 'invalid@test.com') {
      throw {
        response: {
          data: {
            message: 'Invalid email format',
          },
        },
      } as ApiError;
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
    };

    // Add to mock database
    mockUsers.push(newUser);

    return {
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    };
  }

  // Mock forgot password - accepts any email
  static async forgotPassword(email: string): Promise<{ message: string }> {
    await delay(600); // Simulate network delay

    // Check for specific test cases
    if (email === 'notfound@test.com') {
      throw {
        response: {
          data: {
            message: 'No account found with this email address',
          },
        },
      } as ApiError;
    }

    if (email === 'error@test.com') {
      throw {
        response: {
          data: {
            message: 'Failed to send reset email. Please try again later.',
          },
        },
      } as ApiError;
    }

    return {
      message: 'Password reset instructions have been sent to your email',
    };
  }

  // Mock reset password - accepts any token/password
  static async resetPassword(
    token: string,
    password: string
  ): Promise<AuthResponse> {
    await delay(700); // Simulate network delay

    // Check for specific test cases
    if (token === 'expired') {
      throw {
        response: {
          data: {
            message: 'Reset token has expired. Please request a new one.',
          },
        },
      } as ApiError;
    }

    if (token === 'invalid') {
      throw {
        response: {
          data: {
            message: 'Invalid reset token',
          },
        },
      } as ApiError;
    }

    // Validate password length (simulate backend validation)
    if (password.length < 6) {
      throw {
        response: {
          data: {
            message: 'Password must be at least 6 characters long',
          },
        },
      } as ApiError;
    }

    // Return success with mock user
    return {
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    };
  }
}

// Mock balance data
export const mockBalance = {
  total: 5420.75,
  thisMonth: 2456.78,
  expenses: 3079.25,
  savings: 2341.5,
};

// Mock transactions data
export const mockTransactions = [
  {
    id: '1',
    description: 'Salary',
    amount: 5000,
    type: 'income' as const,
    category: 'Salary',
    date: '2025-09-20',
    accountId: 'account1',
  },
  {
    id: '2',
    description: 'Groceries',
    amount: -120.5,
    type: 'expense' as const,
    category: 'Food',
    date: '2025-09-18',
    accountId: 'account1',
  },
  {
    id: '3',
    description: 'Electric Bill',
    amount: -85.3,
    type: 'expense' as const,
    category: 'Utilities',
    date: '2025-09-15',
    accountId: 'account1',
  },
];
