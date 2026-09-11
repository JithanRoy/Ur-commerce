import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { isApiError } from "@urcommerce/api-client";
import { LoginRoute } from "@/routes/login";
import { ProductsRoute } from "@/routes/products";
import { RequireStaff } from "@/routes/require-staff";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireStaff />}>
            <Route path="/products" element={<ProductsRoute />} />
          </Route>
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
