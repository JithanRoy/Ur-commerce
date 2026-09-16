import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { isApiError } from "@urcommerce/api-client";
import { LoginRoute } from "@/routes/login";
import { ProductsRoute } from "@/routes/products";
import { ProductNewRoute } from "@/routes/product-new";
import { RequireStaff } from "@/routes/require-staff";
import { AdminShell } from "@/components/layout/admin-shell";
import { CategoriesRoute } from "@/routes/categories";
import { BrandsRoute } from "@/routes/brands";
import { CollectionsRoute } from "@/routes/collections";

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
            <Route element={<AdminShell />}>
              <Route path="/products" element={<ProductsRoute />} />
              <Route path="/products/new" element={<ProductNewRoute />} />
              <Route path="/categories" element={<CategoriesRoute />} />
              <Route path="/brands" element={<BrandsRoute />} />
              <Route path="/collections" element={<CollectionsRoute />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
