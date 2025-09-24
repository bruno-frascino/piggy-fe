import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Balance hooks
export const useBalance = () => {
  return useQuery({
    queryKey: ['balance'],
    queryFn: apiClient.getBalance,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Transaction hooks
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: apiClient.getTransactions,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createTransaction,
    onSuccess: () => {
      // Invalidate and refetch balance and transactions
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      transaction,
    }: {
      id: string;
      transaction: Partial<{
        amount: number;
        description: string;
        categoryId: string;
        accountId: string;
        date: string;
      }>;
    }) => apiClient.updateTransaction(id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// Category hooks
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: apiClient.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

// Account hooks
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: apiClient.getAccounts,
    staleTime: 10 * 60 * 1000, // 10 minutes - accounts don't change often
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] }); // Balance might change
    },
  });
};

// Auth hooks
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: data => {
      // Store auth token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      // Invalidate all queries to refetch with new auth
      queryClient.invalidateQueries();
    },
  });
};

// Signup mutation
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => apiClient.signup(name, email, password),
    onSuccess: data => {
      // Optionally auto-login after signup if token is returned
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        queryClient.invalidateQueries();
      }
    },
  });
};

// Forgot password mutation
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      apiClient.forgotPassword(email),
  });
};

// Reset password mutation
export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiClient.resetPassword(token, password),
    onSuccess: data => {
      // Auto-login after password reset if token is returned
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        queryClient.invalidateQueries();
      }
    },
  });
};
