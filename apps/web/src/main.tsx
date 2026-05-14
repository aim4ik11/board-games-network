import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from './components/ui/toast-provider';
import { AuthProvider } from './lib/auth-provider';
import { ApiError } from './lib/api';
import { toast } from './lib/toast';
import { syncThemeFromStorage } from './lib/theme';
import { router } from './router';
import './styles/global.scss';
import './index.css';

syncThemeFromStorage();

function toastClientError(error: unknown) {
  if (error instanceof ApiError) {
    return;
  }
  const message =
    error instanceof Error ? error.message : 'Something went wrong';
  toast.error(message);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({
    onError: toastClientError,
  }),
  mutationCache: new MutationCache({
    onError: toastClientError,
  }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastProvider />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
